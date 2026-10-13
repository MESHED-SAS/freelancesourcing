// Test d'architecture : règles de dépendance entre couches (CLAUDE.md §2,
// docs/technique/architecture-cible-et-mocks.md §2.1).
// domain      → domain ; aucun paquet externe.
// use-cases   → domain, use-cases ; aucun paquet externe.
// adapters    → domain, adapters ; paquets externes autorisés.
// app         → use-cases, app, composition ; paquets externes autorisés.
// composition → domain, use-cases, adapters, composition ; aucun paquet externe.
// Tout fichier de src/ appartient à l'une de ces cinq couches. Un import() dont l'argument n'est
// pas une chaîne littérale est refusé ; require( est refusé partout.
// Limite assumée : lecture par motifs sur le texte (commentaires masqués), pas par arbre
// syntaxique. Le test protège contre l'oubli, pas contre un contournement volontaire.
// Limites connues :
// - seuls les fichiers src/**/*.ts sont lus : un .tsx, .mts, .cts ou .js y échappe (élargir le
//   motif de source-files.ts avant de créer src/app/) ;
// - un spécificateur commençant par « # » ou « / » est traité comme un paquet externe ;
// - un chemin contenant un guillemet échappé n'est pas lu ;
// - import() sur un gabarit, même sans ${…}, est refusé comme non littéral ;
// - une chaîne contenant « from" » suivie d'un vrai import sur la même ligne peut fausser la
//   lecture du chemin ;
// - import type compte comme une dépendance (choix strict) ; les cycles ne sont pas vérifiés ;
// - la couche visée se déduit du chemin, que le fichier existe ou non (tsc signale l'absence).
import { describe, expect, it } from "vitest";
import { maskComments, maskNonCode, type SourceFile, sourceFiles } from "./source-files.js";

const LAYERS = ["domain", "use-cases", "adapters", "app", "composition"] as const;
type Layer = (typeof LAYERS)[number];

const ALLOWED: Record<Layer, { readonly layers: readonly Layer[]; readonly packages: boolean }> = {
  domain: { layers: ["domain"], packages: false },
  "use-cases": { layers: ["domain", "use-cases"], packages: false },
  adapters: { layers: ["domain", "adapters"], packages: true },
  app: { layers: ["use-cases", "app", "composition"], packages: true },
  composition: { layers: ["domain", "use-cases", "adapters", "composition"], packages: false },
};

interface ImportRef {
  // Ligne du mot-clé import, export ou require.
  readonly line: number;
  // module : chemin lisible ; non-literal : import() sans chaîne littérale ; require : appel à require(.
  readonly kind: "module" | "non-literal" | "require";
  readonly specifier: string;
}

// import … from "x" et export … from "x", y compris sur plusieurs lignes, avec ou sans « type ».
const STATIC_IMPORT = /\b(?:import|export)\b[^;"'`]*?\bfrom\s*(["'])([^"'\n]*)\1/g;
// import "x"; (sans liaison)
const SIDE_EFFECT_IMPORT = /\bimport\s*(["'])([^"'\n]*)\1/g;
// import("x") ; le groupe 2 est absent si l'argument n'est pas une chaîne littérale seule.
const DYNAMIC_IMPORT = /\bimport\s*\(\s*(?:(["'])([^"'\n]*)\1\s*[,)])?/g;
const REQUIRE_CALL = /\brequire\s*\(/g;

// Les motifs cherchent dans le texte où seuls les commentaires sont masqués (les chemins restent
// lisibles). Une correspondance n'est gardée que si son mot-clé est du code : dans le texte où
// les chaînes sont aussi masquées, il n'est pas remplacé par une espace.
function readImports(code: string): ImportRef[] {
  const withStrings = maskComments(code);
  const codeOnly = maskNonCode(code);
  const isCode = (index: number): boolean => codeOnly.charAt(index) !== " ";
  const found: { index: number; kind: ImportRef["kind"]; specifier: string }[] = [];
  for (const pattern of [STATIC_IMPORT, SIDE_EFFECT_IMPORT]) {
    for (const m of withStrings.matchAll(pattern)) {
      if (isCode(m.index)) found.push({ index: m.index, kind: "module", specifier: m[2] ?? "" });
    }
  }
  for (const m of withStrings.matchAll(DYNAMIC_IMPORT)) {
    if (!isCode(m.index)) continue;
    found.push(
      m[2] === undefined
        ? { index: m.index, kind: "non-literal", specifier: "" }
        : { index: m.index, kind: "module", specifier: m[2] },
    );
  }
  for (const m of codeOnly.matchAll(REQUIRE_CALL)) {
    found.push({ index: m.index, kind: "require", specifier: "" });
  }
  return found
    .sort((a, b) => a.index - b.index)
    .map((f) => ({ line: withStrings.slice(0, f.index).split("\n").length, kind: f.kind, specifier: f.specifier }));
}

function isRelative(specifier: string): boolean {
  return specifier.startsWith("./") || specifier.startsWith("../") || specifier === "." || specifier === "..";
}

// Chemin du fichier visé depuis la racine du dépôt, ou null si le chemin sort du dépôt.
// Segments « . » et « .. » traités à la main. Extensions : x.js → x.ts ; x.ts gardé ;
// sans extension, x.ts, ou x/index.ts si seul ce dernier existe parmi les fichiers connus.
function resolveRelative(from: string, specifier: string, known: ReadonlySet<string>): string | null {
  const segments = from.split("/").slice(0, -1);
  for (const part of specifier.split("/")) {
    if (part === "." || part === "") continue;
    if (part === "..") {
      if (segments.length === 0) return null;
      segments.pop();
    } else {
      segments.push(part);
    }
  }
  const base = segments.join("/");
  if (base.endsWith(".js")) return `${base.slice(0, -3)}.ts`;
  if (base.endsWith(".ts")) return base;
  const asFile = `${base}.ts`;
  const asIndex = `${base}/index.ts`;
  return !known.has(asFile) && known.has(asIndex) ? asIndex : asFile;
}

// Couche d'un chemin src/<couche>/… ; null pour un fichier directement dans src/ ou ailleurs.
function layerOf(path: string): Layer | null {
  const parts = path.split("/");
  if (parts.length < 3 || parts[0] !== "src") return null;
  return LAYERS.find((layer) => layer === parts[1]) ?? null;
}

function checkImport(from: string, layer: Layer, ref: ImportRef, known: ReadonlySet<string>): string | null {
  if (ref.kind === "require") return "require( interdit";
  if (ref.kind === "non-literal") return "import() dynamique non littéral";
  const rule = ALLOWED[layer];
  if (!isRelative(ref.specifier)) return rule.packages ? null : `${layer} → paquet externe (${ref.specifier})`;
  const target = resolveRelative(from, ref.specifier, known);
  if (target === null) return `${layer} → hors du dépôt (${ref.specifier})`;
  const targetLayer = layerOf(target);
  if (targetLayer === null) return `${layer} → hors des cinq couches (${target})`;
  return rule.layers.includes(targetLayer) ? null : `${layer} → ${targetLayer} (${target})`;
}

function findDependencyViolations(files: readonly SourceFile[]): string[] {
  const known = new Set(files.map((f) => f.path));
  return files.flatMap((file) => {
    const layer = layerOf(file.path);
    if (layer === null) return [`${file.path} : fichier hors des cinq couches`];
    return readImports(file.content).flatMap((ref) => {
      const problem = checkImport(file.path, layer, ref, known);
      return problem === null ? [] : [`${file.path}:${ref.line} : ${problem}`];
    });
  });
}

function file(path: string, ...lines: string[]): SourceFile {
  return { path, content: lines.join("\n") };
}

describe("Lecture des imports et calcul de chemin", () => {
  it("maskComments masque les commentaires et garde les chaînes, aux mêmes positions que maskNonCode", () => {
    expect(maskComments('f("x") // y')).toBe('f("x")     ');
    const code = 'a(`t ${"u"}`) /* v */';
    expect(maskComments(code).length).toBe(code.length);
    expect(maskNonCode(code).length).toBe(code.length);
  });

  it("résout .js vers .ts et les segments . et ..", () => {
    const known = new Set(["src/domain/time/day.ts"]);
    expect(resolveRelative("src/adapters/clock/simulated-clock.ts", "../../domain/time/clock.js", known)).toBe(
      "src/domain/time/clock.ts",
    );
    expect(resolveRelative("src/domain/index.ts", "./time/./day.js", known)).toBe("src/domain/time/day.ts");
    expect(resolveRelative("src/domain/a/b.ts", "../a/../time/day.js", known)).toBe("src/domain/time/day.ts");
  });

  it("résout un chemin sans extension vers x.ts, ou vers x/index.ts si seul ce fichier existe", () => {
    const known = new Set(["src/domain/time/index.ts", "src/domain/time/day.ts"]);
    expect(resolveRelative("src/domain/index.ts", "./time", known)).toBe("src/domain/time/index.ts");
    expect(resolveRelative("src/domain/index.ts", "./time/day", known)).toBe("src/domain/time/day.ts");
    expect(resolveRelative("src/domain/index.ts", "./other", known)).toBe("src/domain/other.ts");
    expect(resolveRelative("src/domain/index.ts", "./time/day.ts", known)).toBe("src/domain/time/day.ts");
  });

  it("signale un chemin qui sort du dépôt", () => {
    const known = new Set<string>();
    expect(resolveRelative("src/domain/a.ts", "../../../x.js", known)).toBeNull();
    expect(resolveRelative("src/domain/a.ts", "../../tests/x.js", known)).toBe("tests/x.ts");
  });

  it("lit import, import type, export … from multiligne, export type, export *, import sans liaison, import() et require(", () => {
    const code = [
      'import { a } from "./a.js";',
      'import type { B } from "./b.js";',
      "export {",
      "  c,",
      "  type D,",
      '} from "./c.js";',
      'export type { E } from "./e.js";',
      'export * from "./f.js";',
      'import "./setup.js";',
      'const g = await import("./g.js");',
      "const h = await import(name);",
      'const i = require("i");',
    ].join("\n");
    expect(readImports(code)).toEqual([
      { line: 1, kind: "module", specifier: "./a.js" },
      { line: 2, kind: "module", specifier: "./b.js" },
      { line: 3, kind: "module", specifier: "./c.js" },
      { line: 7, kind: "module", specifier: "./e.js" },
      { line: 8, kind: "module", specifier: "./f.js" },
      { line: 9, kind: "module", specifier: "./setup.js" },
      { line: 10, kind: "module", specifier: "./g.js" },
      { line: 11, kind: "non-literal", specifier: "" },
      { line: 12, kind: "require", specifier: "" },
    ]);
  });
});

describe("findDependencyViolations (fichiers synthétiques)", () => {
  it("accepte un jeu conforme couvrant les cinq couches", () => {
    const files = [
      file("src/domain/b.ts", "export const b = 1;"),
      file("src/domain/a.ts", 'import { b } from "./b.js";'),
      file("src/use-cases/v.ts", 'import type { b } from "../domain/b.js";', "export const v = 1;"),
      file("src/use-cases/u.ts", 'import { v } from "./v.js";'),
      file(
        "src/adapters/db/store.ts",
        'import { b } from "../../domain/b.js";',
        'import { Pool } from "pg";',
        'import { other } from "./other.js";',
      ),
      file(
        "src/app/page.ts",
        'import { v } from "../use-cases/v.js";',
        'import { render } from "react";',
        'import { layout } from "./layout.js";',
      ),
      file(
        "src/composition/root.ts",
        'import { b } from "../domain/b.js";',
        'import { v } from "../use-cases/v.js";',
        'import { store } from "../adapters/db/store.js";',
        'import { env } from "./env.js";',
      ),
    ];
    expect(findDependencyViolations(files)).toEqual([]);
  });

  it("domain : refuse adapters, use-cases et tout paquet externe", () => {
    const files = [
      file(
        "src/domain/a.ts",
        'import { SimulatedClock } from "../adapters/clock/simulated-clock.js";',
        'import { z } from "zod";',
        'import { run } from "../use-cases/run.js";',
      ),
    ];
    expect(findDependencyViolations(files)).toEqual([
      "src/domain/a.ts:1 : domain → adapters (src/adapters/clock/simulated-clock.ts)",
      "src/domain/a.ts:2 : domain → paquet externe (zod)",
      "src/domain/a.ts:3 : domain → use-cases (src/use-cases/run.ts)",
    ]);
  });

  it("use-cases : refuse node:fs, adapters et app", () => {
    const files = [
      file(
        "src/use-cases/apply.ts",
        'import { readFileSync } from "node:fs";',
        'import { SystemClock } from "../adapters/clock/system-clock.js";',
        'import { page } from "../app/page.js";',
      ),
    ];
    expect(findDependencyViolations(files)).toEqual([
      "src/use-cases/apply.ts:1 : use-cases → paquet externe (node:fs)",
      "src/use-cases/apply.ts:2 : use-cases → adapters (src/adapters/clock/system-clock.ts)",
      "src/use-cases/apply.ts:3 : use-cases → app (src/app/page.ts)",
    ]);
  });

  it("adapters : accepte un paquet externe, refuse use-cases, app et composition", () => {
    const files = [
      file(
        "src/adapters/mail/sender.ts",
        'import { Client } from "mail-client";',
        'import { apply } from "../../use-cases/apply.js";',
        'import { page } from "../../app/page.js";',
        'import { root } from "../../composition/root.js";',
      ),
    ];
    expect(findDependencyViolations(files)).toEqual([
      "src/adapters/mail/sender.ts:2 : adapters → use-cases (src/use-cases/apply.ts)",
      "src/adapters/mail/sender.ts:3 : adapters → app (src/app/page.ts)",
      "src/adapters/mail/sender.ts:4 : adapters → composition (src/composition/root.ts)",
    ]);
  });

  it("app : accepte un paquet externe et composition, refuse domain et adapters", () => {
    const files = [
      file(
        "src/app/page.ts",
        'import { render } from "react";',
        'import { Day } from "../domain/time/day.js";',
        'import { SystemClock } from "../adapters/clock/system-clock.js";',
        'import { root } from "../composition/root.js";',
      ),
    ];
    expect(findDependencyViolations(files)).toEqual([
      "src/app/page.ts:2 : app → domain (src/domain/time/day.ts)",
      "src/app/page.ts:3 : app → adapters (src/adapters/clock/system-clock.ts)",
    ]);
  });

  it("composition : refuse un paquet externe et app", () => {
    const files = [
      file("src/composition/root.ts", 'import { config } from "dotenv";', 'import { page } from "../app/page.js";'),
    ];
    expect(findDependencyViolations(files)).toEqual([
      "src/composition/root.ts:1 : composition → paquet externe (dotenv)",
      "src/composition/root.ts:2 : composition → app (src/app/page.ts)",
    ]);
  });

  it("domain, use-cases et adapters ne peuvent pas importer composition", () => {
    const files = [
      file("src/domain/a.ts", 'import { root } from "../composition/root.js";'),
      file("src/use-cases/b.ts", 'import { root } from "../composition/root.js";'),
      file("src/adapters/x/c.ts", 'import { root } from "../../composition/root.js";'),
    ];
    expect(findDependencyViolations(files)).toEqual([
      "src/domain/a.ts:1 : domain → composition (src/composition/root.ts)",
      "src/use-cases/b.ts:1 : use-cases → composition (src/composition/root.ts)",
      "src/adapters/x/c.ts:1 : adapters → composition (src/composition/root.ts)",
    ]);
  });

  it("détecte un export … from multiligne vers un adaptateur dans le domaine, à la ligne du mot-clé", () => {
    const files = [
      file(
        "src/domain/index.ts",
        "// Point d'entrée du domaine.",
        "export {",
        "  SimulatedClock,",
        "  type Clock,",
        '} from "../adapters/clock/simulated-clock.js";',
      ),
    ];
    expect(findDependencyViolations(files)).toEqual([
      "src/domain/index.ts:2 : domain → adapters (src/adapters/clock/simulated-clock.ts)",
    ]);
  });

  it("détecte import type, export type et import sans liaison", () => {
    const files = [
      file(
        "src/domain/a.ts",
        'import type { Clock } from "../adapters/clock.js";',
        'export type { Store } from "../adapters/store.js";',
        'import "../adapters/setup.js";',
      ),
    ];
    expect(findDependencyViolations(files)).toEqual([
      "src/domain/a.ts:1 : domain → adapters (src/adapters/clock.ts)",
      "src/domain/a.ts:2 : domain → adapters (src/adapters/store.ts)",
      "src/domain/a.ts:3 : domain → adapters (src/adapters/setup.ts)",
    ]);
  });

  it("vérifie un import() littéral, refuse un import() non littéral et require( partout", () => {
    const files = [
      file(
        "src/domain/a.ts",
        'const m = await import("../adapters/x.js");',
        "const n = await import(name);",
        'const o = require("fs");',
      ),
      file("src/adapters/x.ts", 'const p = require("pg");'),
    ];
    expect(findDependencyViolations(files)).toEqual([
      "src/domain/a.ts:1 : domain → adapters (src/adapters/x.ts)",
      "src/domain/a.ts:2 : import() dynamique non littéral",
      "src/domain/a.ts:3 : require( interdit",
      "src/adapters/x.ts:1 : require( interdit",
    ]);
  });

  it("ignore les imports écrits dans un commentaire, une chaîne ou un gabarit, et import.meta", () => {
    const files = [
      file(
        "src/domain/a.ts",
        '// import { x } from "../adapters/x.js";',
        '/* export * from "../adapters/y.js"; */',
        "const s = \"import z from '../adapters/z.js'\";",
        'const t = "require(";',
        "const u = `import(${w})`;",
        "const v = import.meta.url;",
      ),
    ];
    expect(findDependencyViolations(files)).toEqual([]);
  });

  it("refuse un fichier directement dans src/ ou dans un autre dossier", () => {
    const files = [
      file("src/main.ts", 'import { b } from "./domain/b.js";'),
      file("src/domain.ts", "export const d = 1;"),
      file("src/infra/db.ts", 'import { Pool } from "pg";'),
      file("src/domain/b.ts", "export const b = 1;"),
    ];
    expect(findDependencyViolations(files)).toEqual([
      "src/main.ts : fichier hors des cinq couches",
      "src/domain.ts : fichier hors des cinq couches",
      "src/infra/db.ts : fichier hors des cinq couches",
    ]);
  });

  it("refuse un import qui sort de src/ ou du dépôt", () => {
    const files = [
      file(
        "src/domain/a.ts",
        'import { x } from "../../tests/x.js";',
        'import { y } from "../../../outside.js";',
        'import { z } from "../infra/z.js";',
      ),
    ];
    expect(findDependencyViolations(files)).toEqual([
      "src/domain/a.ts:1 : domain → hors des cinq couches (tests/x.ts)",
      "src/domain/a.ts:2 : domain → hors du dépôt (../../../outside.js)",
      "src/domain/a.ts:3 : domain → hors des cinq couches (src/infra/z.ts)",
    ]);
  });
});

describe("Règles de dépendance sur les fichiers de src/", () => {
  const known = new Set(sourceFiles.map((f) => f.path));
  const resolvedImports = (path: string): { line: number; target: string | null }[] => {
    const source = sourceFiles.find((f) => f.path === path);
    return readImports(source?.content ?? "").map((ref) => ({
      line: ref.line,
      target: resolveRelative(path, ref.specifier, known),
    }));
  };

  it("lit les imports de simulated-clock.ts vers le domaine (le test ne passe jamais à vide)", () => {
    expect([...known]).toContain("src/adapters/clock/simulated-clock.ts");
    expect(resolvedImports("src/adapters/clock/simulated-clock.ts").map((r) => r.target)).toEqual(
      expect.arrayContaining(["src/domain/time/clock.ts", "src/domain/time/paris-time-zone.ts"]),
    );
  });

  it("lit les treize exports de domain/index.ts, dont l'export multiligne (témoin positif)", () => {
    // Couplé volontairement au contenu de src/domain/index.ts : après un ajout légitime dans ce fichier, adapter ce test.
    expect(resolvedImports("src/domain/index.ts")).toEqual([
      { line: 6, target: "src/domain/time/business-days.ts" },
      { line: 7, target: "src/domain/time/clock.ts" },
      { line: 8, target: "src/domain/time/day.ts" },
      { line: 9, target: "src/domain/time/french-public-holidays.ts" },
      { line: 14, target: "src/domain/time/instant.ts" },
      { line: 15, target: "src/domain/time/paris-time-zone.ts" },
      { line: 19, target: "src/domain/identity/auth-provider.ts" },
      { line: 20, target: "src/domain/identity/authenticated-user.ts" },
      { line: 21, target: "src/domain/identity/disposable-email.ts" },
      { line: 22, target: "src/domain/identity/email-address.ts" },
      { line: 27, target: "src/domain/identity/role.ts" },
      { line: 28, target: "src/domain/identity/session-token.ts" },
      { line: 33, target: "src/domain/identity/user-id.ts" },
    ]);
  });

  it("règle : chaque fichier de src/ est dans une couche et n'importe que ce que sa couche autorise", () => {
    expect(findDependencyViolations(sourceFiles)).toEqual([]);
  });
});
