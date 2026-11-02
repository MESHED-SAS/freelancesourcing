// Test d'architecture : l'heure ne s'obtient que par le contrat P1 Clock (CLAUDE.md §2).
// Règle 1 : dans src/domain/ et src/use-cases/, aucun des mots entiers Date, performance,
//           process, Temporal dans le code (commentaires, chaînes et texte des gabarits exclus).
// Règle 2 : dans tout src/ sauf l'adaptateur système de P1, aucun « Date.now( » ni « new Date »
//           (avec ou sans parenthèses) dans le code.
// Règle 3 (AR5) : dans tout src/ sauf src/app/runtime-services.ts (seul fichier qui lit
//           l'environnement du processus), ni le mot entier process dans le code, ni une chaîne
//           ou un gabarit sans expression valant exactement « process » ou « node:process ».
//           La seconde partie couvre les imports (import { env } from "node:process", import(),
//           export … from), globalThis["process"] et Reflect.get(globalThis, "process").
// Fichiers lus : src/**/*.ts et src/**/*.tsx.
// Limite assumée : ce test protège contre l'oubli, pas contre un contournement volontaire
// (globalThis["Date"], alias, accès par chaîne ; pour process : chaîne construite comme
// "pro" + "cess", nom calculé globalThis[name]).
// Limite connue : le JSX est lu comme du texte. Une apostrophe dans un texte JSX
// (<p>l'accès</p>) est prise pour le début d'une chaîne et masque la fin de sa ligne : un
// Date.now() ou un process écrit après elle sur la même ligne n'est pas détecté. À l'inverse, le
// mot anglais « process » dans un texte JSX est refusé.
// Limite connue (refus de trop) : « "process" » écrit à l'intérieur d'une autre chaîne, d'un
// gabarit ou d'une expression régulière est refusé aussi.
import { describe, expect, it } from "vitest";
import { maskComments, maskNonCode, type SourceFile, sourceFiles } from "./source-files.js";

interface Finding {
  readonly line: number;
  readonly match: string;
}

const FORBIDDEN_TIME_GLOBAL = /\b(?:Date|performance|process|Temporal)\b/g;
const DIRECT_CLOCK_CALL = /\bDate\s*\.\s*now\s*\(|\bnew\s+Date\b/g;

// AR5 : le mot process dans le code ; une chaîne (ou un gabarit sans expression) valant exactement
// « process » ou « node:process », cherchée dans le texte où seuls les commentaires sont masqués.
const PROCESS_IDENTIFIER = /\bprocess\b/g;
const PROCESS_STRING = /(["'`])(?:node:)?process\1/g;

const CORE_FOLDERS = ["src/domain/", "src/use-cases/"];
const SYSTEM_CLOCK = "src/adapters/clock/system-clock.ts";
const RUNTIME_SERVICES = "src/app/runtime-services.ts";

function find(code: string, pattern: RegExp): Finding[] {
  const masked = maskNonCode(code);
  return [...masked.matchAll(pattern)].map((m) => ({
    line: masked.slice(0, m.index).split("\n").length,
    match: m[0],
  }));
}

function findForbiddenTimeGlobals(code: string): Finding[] {
  return find(code, FORBIDDEN_TIME_GLOBAL);
}

function findDirectClockCalls(code: string): Finding[] {
  return find(code, DIRECT_CLOCK_CALL);
}

// AR5 : résultats dans l'ordre du texte ; un import par défaut de « process » donne deux résultats
// (le nom local et le chemin).
function findProcessUsages(code: string): Finding[] {
  const withStrings = maskComments(code);
  const lineOf = (index: number): number => withStrings.slice(0, index).split("\n").length;
  const found = [
    ...[...maskNonCode(code).matchAll(PROCESS_IDENTIFIER)].map((m) => ({ index: m.index, match: m[0] })),
    ...[...withStrings.matchAll(PROCESS_STRING)].map((m) => ({ index: m.index, match: m[0] })),
  ];
  return found.sort((a, b) => a.index - b.index).map((f) => ({ line: lineOf(f.index), match: f.match }));
}

function report(files: readonly SourceFile[], detect: (code: string) => Finding[]): string[] {
  return files.flatMap((file) => detect(file.content).map((f) => `${file.path}:${f.line} : ${f.match}`));
}

describe("Détection des usages de l'heure (chaînes écrites en dur)", () => {
  it("refuse Date.now()", () => {
    expect(findDirectClockCalls("const t = Date.now();")).toEqual([{ line: 1, match: "Date.now(" }]);
    expect(findForbiddenTimeGlobals("const t = Date.now();")).toEqual([{ line: 1, match: "Date" }]);
  });

  it("refuse new Date(0)", () => {
    expect(findDirectClockCalls("const d = new Date(0);")).toEqual([{ line: 1, match: "new Date" }]);
    expect(findForbiddenTimeGlobals("const d = new Date(0);")).toEqual([{ line: 1, match: "Date" }]);
  });

  it("refuse new Date sans parenthèses", () => {
    expect(findDirectClockCalls("const d = new Date;")).toEqual([{ line: 1, match: "new Date" }]);
  });

  it("accepte Intl.DateTimeFormat", () => {
    const code = 'const f = new Intl.DateTimeFormat("fr-FR");';
    expect(findDirectClockCalls(code)).toEqual([]);
    expect(findForbiddenTimeGlobals(code)).toEqual([]);
  });

  it("accepte DateTimeFormat seul", () => {
    expect(findDirectClockCalls("new DateTimeFormat()")).toEqual([]);
    expect(findForbiddenTimeGlobals("DateTimeFormat")).toEqual([]);
  });

  it("refuse performance.now() dans le domaine", () => {
    expect(findForbiddenTimeGlobals("const t = performance.now();")).toEqual([{ line: 1, match: "performance" }]);
  });

  it("accepte une mention dans un commentaire //", () => {
    const code = "// Date.now(), new Date(0), performance, process, Temporal\nconst a = 1;";
    expect(findDirectClockCalls(code)).toEqual([]);
    expect(findForbiddenTimeGlobals(code)).toEqual([]);
  });

  it("accepte une mention dans un commentaire /* */", () => {
    const code = "/* Date.now()\n   new Date(0), performance, process, Temporal */ const a = 1;";
    expect(findDirectClockCalls(code)).toEqual([]);
    expect(findForbiddenTimeGlobals(code)).toEqual([]);
  });

  it("ne laisse pas une chaîne contenant « // » masquer le code qui suit sur la même ligne", () => {
    const code = 'const url = "https://exemple.fr"; const t = Date.now();';
    expect(findDirectClockCalls(code)).toEqual([{ line: 1, match: "Date.now(" }]);
    expect(findForbiddenTimeGlobals(code)).toEqual([{ line: 1, match: "Date" }]);
  });

  it("accepte une chaîne française qui contient les mots interdits", () => {
    const code = 'throw new RangeError("Date invalide : process interrompu, new Date refusé");';
    expect(findDirectClockCalls(code)).toEqual([]);
    expect(findForbiddenTimeGlobals(code)).toEqual([]);
  });

  it("ignore le texte d'un gabarit mais analyse ses expressions ${…}", () => {
    const code = "const m = `Date de publication : ${f({ a: 1 })}, échéance ${Date.now()}`;";
    expect(findDirectClockCalls(code)).toEqual([{ line: 1, match: "Date.now(" }]);
    expect(findForbiddenTimeGlobals(code)).toEqual([{ line: 1, match: "Date" }]);
  });

  it("analyse les gabarits imbriqués", () => {
    expect(findDirectClockCalls("const m = `a ${`b ${new Date(0)}`} c`;")).toEqual([{ line: 1, match: "new Date" }]);
  });

  it("ne laisse pas une expression régulière contenant « // » masquer le code qui suit", () => {
    const code = "const ok = /https?:\\/\\//.test(url) && Date.now() > 0;";
    expect(findDirectClockCalls(code)).toEqual([{ line: 1, match: "Date.now(" }]);
  });

  it("ne prend pas un « /* » dans une chaîne pour un début de commentaire", () => {
    const code = "const glob = 'src/*'; const d = new Date(1); const end = '*/';";
    expect(findDirectClockCalls(code)).toEqual([{ line: 1, match: "new Date" }]);
  });

  it("donne le numéro de ligne exact après un commentaire et un gabarit sur plusieurs lignes", () => {
    expect(findDirectClockCalls("/* a\n b */\nconst m = `x\ny`;\nconst t = Date.now();")).toEqual([
      { line: 5, match: "Date.now(" },
    ]);
  });

  it("ne refuse que les mots entiers", () => {
    expect(findForbiddenTimeGlobals("const processing = 1; const updatedAt = 2;")).toEqual([]);
  });

  it("remplace commentaires et chaînes par des espaces en gardant les retours à la ligne", () => {
    expect(maskNonCode("a /* x\ny */ b")).toBe("a     \n     b");
    expect(maskNonCode('x("Date")')).toBe("x(      )");
  });
});

describe("Fichiers .tsx (synthétiques)", () => {
  it("détecte Date.now() dans une expression JSX d'un .tsx (AR2)", () => {
    const files = [
      { path: "src/app/page.tsx", content: 'export default function Page() {\n  return <p className="date">{Date.now()}</p>;\n}' },
    ];
    expect(report(files, findDirectClockCalls)).toEqual(["src/app/page.tsx:2 : Date.now("]);
  });

  it("limite connue : une apostrophe dans un texte JSX masque la fin de sa ligne", () => {
    // Fige la limite documentée en tête de fichier ; ce n'est pas un comportement souhaité.
    // La ligne 1 contient un Date.now() non détecté ; la ligne 2, sans apostrophe, est détectée.
    const files = [{ path: "src/app/page.tsx", content: "const p = <p>l'accès {Date.now()}</p>;\nconst q = <p>{Date.now()}</p>;" }];
    expect(report(files, findDirectClockCalls)).toEqual(["src/app/page.tsx:2 : Date.now("]);
  });
});

describe("AR5 : détection de process (chaînes écrites en dur)", () => {
  it.each([
    ["process.env", "const e = process.env.APP_ENV;", [{ line: 1, match: "process" }]],
    ["process[\"env\"]", 'const e = process["env"];', [{ line: 1, match: "process" }]],
    ["déstructuration", "const { env } = process;", [{ line: 1, match: "process" }]],
    ["globalThis.process", "const e = globalThis.process.env;", [{ line: 1, match: "process" }]],
    ["alias par propriété", "const g = globalThis;\nconst e = g.process;", [{ line: 2, match: "process" }]],
    ["globalThis[\"process\"]", 'const e = globalThis["process"];', [{ line: 1, match: '"process"' }]],
    ["Reflect.get", "const p = Reflect.get(globalThis, 'process');", [{ line: 1, match: "'process'" }]],
    ["import nommé de node:process", 'import { env } from "node:process";', [{ line: 1, match: '"node:process"' }]],
    [
      "import par défaut de process",
      'import process from "process";',
      [
        { line: 1, match: "process" },
        { line: 1, match: '"process"' },
      ],
    ],
    ["import() de node:process", 'const m = await import("node:process");', [{ line: 1, match: '"node:process"' }]],
    ["chaîne node:process hors import", "const name = 'node:process';", [{ line: 1, match: "'node:process'" }]],
    ["gabarit sans expression", "const name = `process`;", [{ line: 1, match: "`process`" }]],
  ])("refuse %s", (_label, code, expected) => {
    expect(findProcessUsages(code)).toEqual(expected);
  });

  it("détecte process dans une expression JSX d'un .tsx", () => {
    const files = [{ path: "src/app/page.tsx", content: "export default function Page() {\n  return <p>{process.env.APP_ENV}</p>;\n}" }];
    expect(report(files, findProcessUsages)).toEqual(["src/app/page.tsx:2 : process"]);
  });

  it("accepte les commentaires, les mots voisins et les chaînes qui ne valent pas exactement process ou node:process", () => {
    const code = [
      "// process.env, globalThis[\"process\"]",
      "/* import { env } from \"node:process\"; */",
      "const processing = 1;",
      "const processus = 2;",
      'const m = "process interrompu";',
      "const n = 'node:processes';",
      'const o = "Process";',
    ].join("\n");
    expect(findProcessUsages(code)).toEqual([]);
  });

  it("limites connues : chaîne construite, nom calculé et alias par chaîne ne sont pas détectés", () => {
    // Fige les limites documentées en tête de fichier ; ce n'est pas un comportement souhaité.
    const code = [
      'const a = globalThis["pro" + "cess"];',
      "const b = globalThis[name];",
      "const c = `${'pro'}cess`;",
    ].join("\n");
    expect(findProcessUsages(code)).toEqual([]);
  });

  it("limite connue : « \"process\" » écrit à l'intérieur d'une autre chaîne est refusé (refus de trop)", () => {
    // Fige la limite documentée en tête de fichier : la règle refuse plus que nécessaire.
    expect(findProcessUsages("const m = 'le mot \"process\"';")).toEqual([{ line: 1, match: '"process"' }]);
  });
});

describe("Règles d'horloge sur les fichiers de src/", () => {
  const paths = sourceFiles.map((f) => f.path);
  const coreFiles = sourceFiles.filter((f) => CORE_FOLDERS.some((folder) => f.path.startsWith(folder)));
  const filesExceptSystemClock = sourceFiles.filter((f) => f.path !== SYSTEM_CLOCK);

  it("trouve bien les fichiers de src/ (le test ne passe jamais à vide)", () => {
    expect(paths).toContain("src/domain/time/day.ts");
    expect(paths).toContain("src/use-cases/index.ts");
    expect(paths).toContain("src/app/page.tsx");
    expect(paths).toContain(SYSTEM_CLOCK);
  });

  it("détecte l'appel à Date.now() de l'adaptateur système (témoin positif)", () => {
    // Couplé volontairement au contenu de system-clock.ts : après un ajout légitime dans ce fichier, adapter ce test.
    const systemClock = sourceFiles.find((f) => f.path === SYSTEM_CLOCK);
    expect(findDirectClockCalls(systemClock?.content ?? "").map((f) => f.match)).toEqual(["Date.now("]);
  });

  it("règle 1 : ni Date, ni performance, ni process, ni Temporal dans src/domain/ et src/use-cases/", () => {
    expect(report(coreFiles, findForbiddenTimeGlobals)).toEqual([]);
  });

  it("règle 2 : ni Date.now( ni new Date dans src/ hors de l'adaptateur système de P1", () => {
    expect(report(filesExceptSystemClock, findDirectClockCalls)).toEqual([]);
  });

  it("détecte le process de runtime-services.ts (témoin positif de la règle 3)", () => {
    // Couplé volontairement au contenu de runtime-services.ts : après un changement de ce fichier, adapter ce test.
    const runtimeServices = sourceFiles.find((f) => f.path === RUNTIME_SERVICES);
    expect(findProcessUsages(runtimeServices?.content ?? "").map((f) => f.match)).toEqual(["process"]);
  });

  it("règle 3 (AR5) : ni process, ni chaîne « process » ou « node:process » dans src/ hors de runtime-services.ts", () => {
    const filesExceptRuntimeServices = sourceFiles.filter((f) => f.path !== RUNTIME_SERVICES);
    expect(report(filesExceptRuntimeServices, findProcessUsages)).toEqual([]);
  });
});
