// Tests de la charte graphique (US-02c, CA13 et CA14) : jetons de src/app/theme/tokens.css,
// contraste WCAG 2.x des paires de jetons, absence de couleur écrite en dur dans src/app,
// ordre des feuilles dans layout.tsx et contour de focus visible.
// Identifiants stables CT1 à CT8, AN1 à AN5 (analyse de tokens.css), cités par les preuves par
// mutation (niveau B, MB…). Les valeurs attendues sont écrites en dur.
// Lecture des fichiers : import.meta.glob avec ?raw (décision D3), comme
// tests/architecture/source-files.ts ; le motif doit rester une chaîne littérale. Un témoin
// positif prouve que le glob voit les fichiers et que le CSS n'arrive pas vide.
//
// Analyse de tokens.css (D9) : commentaires /* */ retirés ; seules les propriétés personnalisées
// (--nom: valeur;) d'un bloc :root de premier niveau sont des jetons ; une propriété déclarée deux
// fois, dans un autre bloc (y compris @media), ou hors de tout bloc est refusée. Valeur sur
// plusieurs lignes : espaces normalisés. Limites : un « ; », « { » ou « } » dans une chaîne CSS
// n'est pas géré ; une propriété non personnalisée de :root est ignorée.
//
// CT6 (D4) : fichiers src/app/**/*.{ts,tsx,css} sauf tokens.css. Sont refusés :
// - partout (hors commentaires) : #hex de 3, 4, 6 ou 8 chiffres, et les fonctions rgb(, rgba(,
//   hsl(, hsla(, hwb(, lab(, lch(, oklab(, oklch(, color-mix( ;
// - un nom de couleur usuel (liste COLOR_NAMES), seulement dans une valeur de style : valeur d'une
//   déclaration CSS, ou chaîne affectée en TS/TSX à une propriété de couleur (color, background,
//   border…, outline, fill, stroke, boxShadow, textShadow, …Color), objet ou attribut. Les
//   références var(--…) sont ignorées. Valeurs admises (ALLOWED_COLOR_KEYWORDS) : currentColor,
//   inherit et transparent (transparent n'est pas une couleur au sens du contraste).
// Limites connues (non détectés) : couleur passée par une variable (const c = "red"; style={{ color: c }}),
// nom construit, couleur système (Canvas…), nom absent de la liste,
// propriété absente de la liste, CSS dans un gabarit ou dans une balise <style>, texte JSX après
// un « // » (pris pour un commentaire). Refus de trop : un texte ou un sélecteur d'identifiant
// fait de chiffres hexadécimaux (#123, #cafe, champ privé #add), un nom de couleur dans un
// sélecteur imbriqué (@media … { a:not(.red) {) ou dans une chaîne CSS (content: "red").
// Un #hex de 5 ou 7 chiffres (invalide en CSS) n'est pas détecté.
//
// CT7 ne contrôle que layout.tsx : une feuille importée par une autre page ou un autre composant
// n'est pas vue. CT8 ne détecte pas outline: 0px, outline-style: none ni outline: transparent.
import { describe, expect, it } from "vitest";
import { maskComments, type SourceFile } from "../architecture/source-files.js";
import { contrastRatio, isHexColor } from "./contrast.js";

const APP_PREFIX = "../../";

const rawAppFiles = import.meta.glob("../../src/app/**/*.{ts,tsx,css}", {
  eager: true,
  query: "?raw",
  import: "default",
});

const appFiles: readonly SourceFile[] = Object.entries(rawAppFiles)
  .map(([key, content]) => {
    if (!key.startsWith(APP_PREFIX)) {
      throw new Error(`Chemin inattendu renvoyé par import.meta.glob : ${key}`);
    }
    return { path: key.slice(APP_PREFIX.length), content };
  })
  .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

const TOKENS_PATH = "src/app/theme/tokens.css";
const GLOBALS_PATH = "src/app/globals.css";
const LAYOUT_PATH = "src/app/layout.tsx";

function appFile(path: string): string {
  const found = appFiles.find((f) => f.path === path);
  if (found === undefined) throw new Error(`Fichier introuvable par le glob : ${path}`);
  return found.content;
}

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

// Seuils WCAG 2.x, niveau AA.
const TEXT_MINIMUM = 4.5;
const NON_TEXT_MINIMUM = 3;

// ---------------------------------------------------------------------------------------------
// Analyse de tokens.css

interface TokenSheet {
  readonly tokens: ReadonlyMap<string, string>;
  readonly errors: readonly string[];
}

const CUSTOM_PROPERTY = /(--[A-Za-z0-9-]+)\s*:\s*([^;{}]*);/g;

// Remplace chaque commentaire /* */ par des espaces, en gardant les retours à la ligne.
function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "));
}

function parseTokenSheet(css: string): TokenSheet {
  const code = stripCssComments(css);
  const tokens = new Map<string, string>();
  const errors: string[] = [];
  const refuseOutside = (text: string, where: string): void => {
    for (const m of text.matchAll(CUSTOM_PROPERTY)) errors.push(`${m[1]} : déclaré hors de :root (${where})`);
  };
  let depth = 0;
  let segmentStart = 0;
  let prelude = "";
  for (let i = 0; i < code.length; i += 1) {
    const char = code.charAt(i);
    if (char === "{") {
      if (depth === 0) {
        prelude = code.slice(segmentStart, i);
        segmentStart = i + 1;
      }
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth < 0) {
        errors.push("accolade fermante sans ouverture");
        depth = 0;
        segmentStart = i + 1;
      } else if (depth === 0) {
        const lastSemicolon = prelude.lastIndexOf(";");
        refuseOutside(prelude.slice(0, lastSemicolon + 1), "hors de tout bloc");
        const selector = prelude.slice(lastSemicolon + 1).trim().replace(/\s+/g, " ");
        const body = code.slice(segmentStart, i);
        if (selector === ":root" && !body.includes("{")) {
          for (const m of body.matchAll(CUSTOM_PROPERTY)) {
            const name = m[1] ?? "";
            const value = (m[2] ?? "").trim().replace(/\s+/g, " ");
            if (tokens.has(name)) errors.push(`${name} : déclaré deux fois`);
            else tokens.set(name, value);
          }
        } else {
          refuseOutside(body, selector);
        }
        segmentStart = i + 1;
      }
    }
  }
  if (depth > 0) errors.push("accolade ouvrante non fermée");
  else refuseOutside(code.slice(segmentStart), "hors de tout bloc");
  return { tokens, errors };
}

function invalidColorTokens(tokens: ReadonlyMap<string, string>): string[] {
  return [...tokens]
    .filter(([name, value]) => name.startsWith("--color-") && !isHexColor(value))
    .map(([name, value]) => `${name} : « ${value} » n'est pas une couleur #RRGGBB`);
}

type Pair = readonly [foreground: string, background: string];

function formatDecimal(value: number): string {
  return String(value).replace(".", ",");
}

function contrastFailures(tokens: ReadonlyMap<string, string>, pairs: readonly Pair[], minimum: number): string[] {
  return pairs.flatMap(([foreground, background]) => {
    const fg = tokens.get(foreground);
    const bg = tokens.get(background);
    if (fg === undefined || bg === undefined) return [`${foreground} / ${background} : jeton absent`];
    if (!isHexColor(fg) || !isHexColor(bg)) return [`${foreground} / ${background} : couleur invalide`];
    const ratio = contrastRatio(fg, bg);
    return ratio >= minimum
      ? []
      : [`${foreground} / ${background} : ${ratio.toFixed(3).replace(".", ",")}:1 < ${formatDecimal(minimum)}:1`];
  });
}

// Jeu de jetons attendu (spec US-02c §5.5, décision D5 pour --color-focus-on-dark).
const EXPECTED_TOKENS = [
  "--color-bg",
  "--color-bg-page",
  "--color-text",
  "--color-text-muted",
  "--color-accent",
  "--color-on-accent",
  "--color-border",
  "--color-border-control",
  "--color-danger",
  "--color-danger-bg",
  "--color-demo-text",
  "--color-demo-bg",
  "--color-focus",
  "--color-focus-on-dark",
  "--color-header-bg",
  "--color-header-text",
  "--font-family",
  "--radius",
  "--space-1",
  "--space-2",
  "--space-3",
  "--space-4",
  "--space-5",
  "--space-6",
  "--font-size-base",
];

// Paires texte / fond (≥ 4,5:1). --color-border est décoratif (non porteur de sens) : hors paires.
const TEXT_PAIRS: readonly Pair[] = [
  ["--color-text", "--color-bg-page"],
  ["--color-text", "--color-bg"],
  ["--color-text-muted", "--color-bg"],
  ["--color-text-muted", "--color-bg-page"],
  ["--color-on-accent", "--color-accent"],
  ["--color-accent", "--color-bg"],
  ["--color-accent", "--color-bg-page"],
  ["--color-danger", "--color-danger-bg"],
  ["--color-danger", "--color-bg"],
  ["--color-demo-text", "--color-demo-bg"],
  ["--color-header-text", "--color-header-bg"],
];

// Contours de contrôles et focus (≥ 3:1).
const NON_TEXT_PAIRS: readonly Pair[] = [
  ["--color-border-control", "--color-bg"],
  ["--color-border-control", "--color-bg-page"],
  ["--color-focus", "--color-bg"],
  ["--color-focus", "--color-bg-page"],
  ["--color-focus-on-dark", "--color-header-bg"],
];

function realTokens(): ReadonlyMap<string, string> {
  return parseTokenSheet(appFile(TOKENS_PATH)).tokens;
}

// ---------------------------------------------------------------------------------------------
// CT6 : couleurs écrites en dur

const HEX_LITERAL = /(?<![\w&.])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi;
const COLOR_FUNCTION = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix)\s*\(/gi;
const COLOR_NAMES = [
  "black", "white", "red", "green", "blue", "yellow", "orange", "purple", "pink", "brown",
  "gray", "grey", "silver", "maroon", "navy", "teal", "olive", "lime", "aqua", "cyan",
  "magenta", "fuchsia", "gold", "indigo", "violet",
];
const COLOR_NAME = new RegExp(`\\b(?:${COLOR_NAMES.join("|")})\\b`, "gi");
// Valeurs admises dans une valeur de style : jamais dans COLOR_NAMES (vérifié par le cas accepté).
// transparent n'est pas une couleur au sens du contraste.
const ALLOWED_COLOR_KEYWORDS = ["currentColor", "inherit", "transparent"];
// Déclaration CSS : propriété précédée de « { » ou « ; » (un sélecteur suit « } » : il est exclu).
const CSS_DECLARATION = /[{;]\s*(-?[A-Za-z][\w-]*)\s*:\s*([^;{}]*)/g;
// TS/TSX : chaîne affectée à une propriété de couleur, dans un objet (clé: "…") ou un attribut (clé="…").
const STYLE_VALUE =
  /\b(?:color|background|border(?:Top|Right|Bottom|Left)?|outline|fill|stroke|boxShadow|textShadow|[A-Za-z]*Color)\s*[:=]\s*\{?\s*(["'`])([^"'`\n]*)\1/g;
const TOKEN_REFERENCE = /var\(\s*--[\w-]+\s*\)/g;

function findHardcodedColors(file: SourceFile): string[] {
  const isCss = file.path.endsWith(".css");
  const text = isCss ? stripCssComments(file.content) : maskComments(file.content);
  const found: { index: number; match: string }[] = [];
  for (const m of text.matchAll(HEX_LITERAL)) found.push({ index: m.index, match: m[0] });
  for (const m of text.matchAll(COLOR_FUNCTION)) found.push({ index: m.index, match: m[0].replace(/\s+/g, "") });
  for (const m of text.matchAll(isCss ? CSS_DECLARATION : STYLE_VALUE)) {
    const value = m[2] ?? "";
    const valueEnd = m.index + m[0].length - (isCss ? 0 : 1);
    const valueStart = valueEnd - value.length;
    const visible = value.replace(TOKEN_REFERENCE, (ref) => " ".repeat(ref.length));
    for (const n of visible.matchAll(COLOR_NAME)) found.push({ index: valueStart + n.index, match: n[0] });
  }
  return found
    .sort((a, b) => a.index - b.index)
    .map((f) => `${file.path}:${lineOf(text, f.index)} : ${f.match}`);
}

function scannedFiles(files: readonly SourceFile[]): readonly SourceFile[] {
  return files.filter((f) => f.path !== TOKENS_PATH);
}

function file(path: string, ...lines: string[]): SourceFile {
  return { path, content: lines.join("\n") };
}

// ---------------------------------------------------------------------------------------------
// CT7 et CT8

const CSS_IMPORT = /\bimport\s*(["'])([^"'\n]+\.css)\1/g;

function cssImports(code: string): string[] {
  return [...maskComments(code).matchAll(CSS_IMPORT)].map((m) => m[2] ?? "");
}

const FOCUS_VISIBLE_RULE = /:focus-visible\b[^{}]*\{([^{}]*)\}/g;
const OUTLINE_WITH_FOCUS_TOKEN = /\boutline(?:-color)?\s*:[^;}]*var\(\s*--color-focus\s*\)/;
const OUTLINE_REMOVED = /\boutline\s*:\s*(?:none|0)\s*(?=[;}!]|$)/gm;

function findFocusProblems(css: string): string[] {
  const code = stripCssComments(css);
  const problems: string[] = [];
  const usesFocusToken = [...code.matchAll(FOCUS_VISIBLE_RULE)].some((m) => OUTLINE_WITH_FOCUS_TOKEN.test(m[1] ?? ""));
  if (!usesFocusToken) problems.push("aucune règle :focus-visible n'utilise var(--color-focus) dans outline");
  for (const m of code.matchAll(OUTLINE_REMOVED)) problems.push(`outline supprimé : ${m[0].trim()}`);
  return problems;
}

// ---------------------------------------------------------------------------------------------

describe("CT5 : rapport de contraste sur des cas publiés", () => {
  it.each([
    ["noir / blanc = 21:1", "#000000", "#FFFFFF", 21, 6],
    ["blanc / blanc = 1:1", "#FFFFFF", "#FFFFFF", 1, 6],
    ["#767676 / blanc ≈ 4,542:1", "#767676", "#FFFFFF", 4.542, 2],
    ["#777777 / blanc ≈ 4,48:1", "#777777", "#FFFFFF", 4.48, 2],
    ["#FF0000 / blanc ≈ 3,998:1", "#FF0000", "#FFFFFF", 3.998, 2],
    ["#0000FF / blanc ≈ 8,592:1", "#0000FF", "#FFFFFF", 8.592, 2],
  ] as const)("CT5 : %s", (_label, first, second, expected, digits) => {
    expect(contrastRatio(first, second)).toBeCloseTo(expected, digits);
  });

  it("CT5 : l'ordre des deux couleurs est indifférent", () => {
    expect(contrastRatio("#0F6B5E", "#FFFFFF")).toBe(contrastRatio("#FFFFFF", "#0F6B5E"));
  });

  it("CT5 : refuse une couleur qui n'est pas #RRGGBB", () => {
    expect(() => contrastRatio("#FFF", "#FFFFFF")).toThrow(
      new Error("Couleur hexadécimale invalide : « #FFF » (format attendu : #RRGGBB)."),
    );
  });
});

describe("CT2 et CT3 : seuils (jetons synthétiques)", () => {
  it("CT2 (seuil) : #767676 sur blanc (≈ 4,54:1) est accepté pour du texte", () => {
    const tokens = new Map([
      ["--color-a", "#767676"],
      ["--color-b", "#FFFFFF"],
    ]);
    expect(contrastFailures(tokens, [["--color-a", "--color-b"]], TEXT_MINIMUM)).toEqual([]);
  });

  it("CT2 (seuil) : #777777 sur blanc (≈ 4,48:1) est refusé pour du texte", () => {
    const tokens = new Map([
      ["--color-a", "#777777"],
      ["--color-b", "#FFFFFF"],
    ]);
    expect(contrastFailures(tokens, [["--color-a", "--color-b"]], TEXT_MINIMUM)).toEqual([
      "--color-a / --color-b : 4,478:1 < 4,5:1",
    ]);
  });

  it("CT3 (seuil) : #949494 sur blanc (≈ 3,0335:1) est accepté pour un contour ou un focus", () => {
    const tokens = new Map([
      ["--color-a", "#949494"],
      ["--color-b", "#FFFFFF"],
    ]);
    expect(contrastFailures(tokens, [["--color-a", "--color-b"]], NON_TEXT_MINIMUM)).toEqual([]);
  });

  it("CT3 (seuil) : #959595 sur blanc (≈ 2,9953:1) est refusé pour un contour ou un focus", () => {
    const tokens = new Map([
      ["--color-a", "#959595"],
      ["--color-b", "#FFFFFF"],
    ]);
    expect(contrastFailures(tokens, [["--color-a", "--color-b"]], NON_TEXT_MINIMUM)).toEqual([
      "--color-a / --color-b : 2,995:1 < 3:1",
    ]);
  });

  it("CT2 (seuil) : un jeton absent est signalé, jamais ignoré", () => {
    const tokens = new Map([["--color-a", "#000000"]]);
    expect(contrastFailures(tokens, [["--color-a", "--color-b"]], TEXT_MINIMUM)).toEqual([
      "--color-a / --color-b : jeton absent",
    ]);
  });
});

describe("Analyse de tokens.css (fichiers synthétiques)", () => {
  it("AN1 : lit les propriétés personnalisées de :root, valeur sur plusieurs lignes normalisée", () => {
    const sheet = parseTokenSheet(
      [":root {", "  --color-a: #0F6B5E;", "  --font-family:", '    system-ui,', '    "Segoe UI";', "  color-scheme: light;", "}"].join("\n"),
    );
    expect(sheet.errors).toEqual([]);
    expect([...sheet.tokens]).toEqual([
      ["--color-a", "#0F6B5E"],
      ["--font-family", 'system-ui, "Segoe UI"'],
    ]);
  });

  it("AN2 : ignore les commentaires, y compris une déclaration commentée et des accolades en commentaire", () => {
    const sheet = parseTokenSheet(
      ["/* Ancien jeu : --color-old: #000000; } */", ":root {", "  /* --color-a: #111111; */", "  --color-a: #FFFFFF;", "}"].join("\n"),
    );
    expect(sheet.errors).toEqual([]);
    expect([...sheet.tokens]).toEqual([["--color-a", "#FFFFFF"]]);
  });

  it("AN3 : refuse un jeton déclaré deux fois, dans le même bloc ou dans un second :root", () => {
    const sheet = parseTokenSheet(
      [":root {", "  --color-a: #FFFFFF;", "  --color-a: #000000;", "}", ":root {", "  --color-a: #111111;", "}"].join("\n"),
    );
    expect(sheet.errors).toEqual(["--color-a : déclaré deux fois", "--color-a : déclaré deux fois"]);
    expect(sheet.tokens.get("--color-a")).toBe("#FFFFFF");
  });

  it("AN4 : refuse une déclaration hors de :root (@media, autre sélecteur, hors de tout bloc)", () => {
    const sheet = parseTokenSheet(
      [
        "--color-z: #000000;",
        ":root {",
        "  --color-a: #FFFFFF;",
        "}",
        "@media (prefers-color-scheme: dark) {",
        "  :root {",
        "    --color-a: #000000;",
        "  }",
        "}",
        ".card {",
        "  --color-b: #111111;",
        "}",
      ].join("\n"),
    );
    expect(sheet.errors).toEqual([
      "--color-z : déclaré hors de :root (hors de tout bloc)",
      "--color-a : déclaré hors de :root (@media (prefers-color-scheme: dark))",
      "--color-b : déclaré hors de :root (.card)",
    ]);
    expect([...sheet.tokens]).toEqual([["--color-a", "#FFFFFF"]]);
  });

  it("AN5 (CT4) : signale les --color-* qui ne sont pas #RRGGBB, accepte les deux casses, ignore les autres jetons", () => {
    const tokens = new Map([
      ["--color-a", "#0F6B5E"],
      ["--color-b", "#0f6b5e"],
      ["--color-c", "#FFF"],
      ["--color-d", "red"],
      ["--color-e", "#GGGGGG"],
      ["--radius", "8px"],
    ]);
    expect(invalidColorTokens(tokens)).toEqual([
      "--color-c : « #FFF » n'est pas une couleur #RRGGBB",
      "--color-d : « red » n'est pas une couleur #RRGGBB",
      "--color-e : « #GGGGGG » n'est pas une couleur #RRGGBB",
    ]);
  });
});

describe("Jetons de src/app/theme/tokens.css", () => {
  it("tokens.css s'analyse sans erreur (un seul :root, aucun doublon)", () => {
    expect(parseTokenSheet(appFile(TOKENS_PATH)).errors).toEqual([]);
  });

  it("CT1 : le jeu de jetons est exactement celui de la spec (couleurs, police, rayon, espacements, taille)", () => {
    expect([...realTokens().keys()].sort()).toEqual([...EXPECTED_TOKENS].sort());
  });

  it("CT4 : chaque --color-* est une couleur #RRGGBB", () => {
    const tokens = realTokens();
    expect([...tokens.keys()].filter((name) => name.startsWith("--color-")).length).toBeGreaterThan(0);
    expect(invalidColorTokens(tokens)).toEqual([]);
  });

  it.each(TEXT_PAIRS)("CT2 : %s sur %s ≥ 4,5:1", (foreground, background) => {
    expect(contrastFailures(realTokens(), [[foreground, background]], TEXT_MINIMUM)).toEqual([]);
  });

  it.each(NON_TEXT_PAIRS)("CT3 : %s sur %s ≥ 3:1", (foreground, background) => {
    expect(contrastFailures(realTokens(), [[foreground, background]], NON_TEXT_MINIMUM)).toEqual([]);
  });
});

describe("CT6 : couleurs écrites en dur (fichiers synthétiques)", () => {
  it.each([
    ["#hex dans un style TSX", "src/app/page.tsx", ['export const P = () => <p style={{ color: "#B42318" }}>x</p>;'], ["src/app/page.tsx:1 : #B42318"]],
    ["#hex court en CSS", "src/app/globals.css", ["a {", "  color: #fff;", "}"], ["src/app/globals.css:2 : #fff"]],
    ["rgb( en CSS", "src/app/globals.css", ["a { background: rgb(0, 0, 0); }"], ["src/app/globals.css:1 : rgb("]],
    ["hsl( dans un objet de style TS", "src/app/ui/styles.ts", ['export const s = { color: "hsl(0 0% 0%)" };'], ["src/app/ui/styles.ts:1 : hsl("]],
    ["nom de couleur en CSS", "src/app/globals.css", ["a { border: 1px solid red; }"], ["src/app/globals.css:1 : red"]],
    ["nom de couleur dans un style TSX", "src/app/page.tsx", ['export const P = () => <p style={{ backgroundColor: "white" }}>x</p>;'], ["src/app/page.tsx:1 : white"]],
    ["nom de couleur dans un attribut SVG", "src/app/page.tsx", ['export const I = () => <path fill="black" />;'], ["src/app/page.tsx:1 : black"]],
  ] as const)("CT6 : refuse %s", (_label, path, lines, expected) => {
    expect(findHardcodedColors(file(path, ...lines))).toEqual(expected);
  });

  // Les listes ci-dessous sont écrites en dur, indépendamment des motifs : retirer un élément d'un
  // motif fait échouer le test correspondant.
  it("CT6 : refuse chaque fonction de couleur annoncée", () => {
    const functions = ["rgb", "rgba", "hsl", "hsla", "hwb", "lab", "lch", "oklab", "oklch", "color-mix"];
    const css = file(GLOBALS_PATH, ...functions.map((name) => `a { color: ${name}(0 0 0); }`));
    expect(findHardcodedColors(css)).toEqual(functions.map((name, i) => `src/app/globals.css:${i + 1} : ${name}(`));
  });

  it("CT6 : refuse les #hex de 3, 4, 6 et 8 chiffres ; limite : 5 et 7 chiffres ne sont pas détectés", () => {
    const css = file(
      GLOBALS_PATH,
      "a { color: #fff; }",
      "a { color: #ffff; }",
      "a { color: #B42318; }",
      "a { color: #B4231880; }",
      "a { color: #12345; }",
      "a { color: #1234567; }",
    );
    expect(findHardcodedColors(css)).toEqual([
      "src/app/globals.css:1 : #fff",
      "src/app/globals.css:2 : #ffff",
      "src/app/globals.css:3 : #B42318",
      "src/app/globals.css:4 : #B4231880",
    ]);
  });

  it("CT6 : refuse chaque nom de couleur usuel dans une déclaration CSS", () => {
    const names = [
      "black", "white", "red", "green", "blue", "yellow", "orange", "purple", "pink", "brown",
      "gray", "grey", "silver", "maroon", "navy", "teal", "olive", "lime", "aqua", "cyan",
      "magenta", "fuchsia", "gold", "indigo", "violet",
    ];
    const css = file(GLOBALS_PATH, ...names.map((name) => `a { color: ${name}; }`));
    expect(findHardcodedColors(css)).toEqual(names.map((name, i) => `src/app/globals.css:${i + 1} : ${name}`));
  });

  it("CT6 : refuse « red » affecté à chaque propriété de couleur en TSX", () => {
    const properties = [
      "color", "background", "border", "borderTop", "borderRight", "borderBottom", "borderLeft", "outline",
      "fill", "stroke", "boxShadow", "textShadow", "backgroundColor", "borderTopColor", "textDecorationColor",
      "stopColor",
    ];
    const tsx = file("src/app/page.tsx", ...properties.map((property) => `export const s = { ${property}: "red" };`));
    expect(findHardcodedColors(tsx)).toEqual(properties.map((_property, i) => `src/app/page.tsx:${i + 1} : red`));
  });

  it("CT6 : accepte commentaires, identifiants, textes, ancres, var(--…), currentColor, inherit et transparent", () => {
    const tsx = file(
      "src/app/page.tsx",
      "// Couleur de secours : #B42318, rgb(0, 0, 0), red",
      "const red = 1;",
      'const whiteList = ["white", "black"];',
      'export const P = () => <p className="text-red">Texte red, white et black</p>;',
      'export const A = () => <a href="#contenu">Aller au contenu</a>;',
      'export const S = () => <p style={{ color: "var(--color-text)", borderColor: "currentColor", outlineColor: "inherit", backgroundColor: "transparent" }}>x</p>;',
    );
    const css = file(
      "src/app/globals.css",
      "/* Ancienne valeur : color: red; #fff */",
      "a { color: var(--color-accent); border-color: currentColor; outline-color: inherit; background: transparent; }",
      ".red-title { color: var(--color-danger); }",
      "#contenu { margin: 0; }",
    );
    expect([...findHardcodedColors(tsx), ...findHardcodedColors(css)]).toEqual([]);
    const allowed = ALLOWED_COLOR_KEYWORDS.map((keyword) => file("src/app/a.css", `a { color: ${keyword}; }`));
    expect(allowed.flatMap(findHardcodedColors)).toEqual([]);
  });

  it("CT6 : seul src/app/theme/tokens.css est exclu de la recherche", () => {
    const files = [
      file(TOKENS_PATH, ":root { --color-a: #000000; }"),
      file(GLOBALS_PATH, "a { color: #000000; }"),
      file("src/app/theme/other.css", "a { color: #000000; }"),
    ];
    expect(scannedFiles(files).flatMap(findHardcodedColors)).toEqual([
      "src/app/globals.css:1 : #000000",
      "src/app/theme/other.css:1 : #000000",
    ]);
  });
});

describe("CT6 : couleurs écrites en dur dans src/app", () => {
  it("le glob voit les fichiers .ts, .tsx et .css de src/app, avec leur contenu (témoin positif)", () => {
    const paths = appFiles.map((f) => f.path);
    expect(paths).toEqual(
      expect.arrayContaining([LAYOUT_PATH, "src/app/page.tsx", "src/app/services.ts", GLOBALS_PATH, TOKENS_PATH]),
    );
    expect(appFile(TOKENS_PATH)).toContain("--color-bg:");
    expect(appFile(GLOBALS_PATH)).toContain("var(--color-text)");
  });

  it("le détecteur voit chaque couleur de tokens.css, fichier exclu de la règle (témoin positif)", () => {
    const colorTokens = [...realTokens().keys()].filter((name) => name.startsWith("--color-"));
    expect(colorTokens.length).toBeGreaterThan(0);
    expect(findHardcodedColors({ path: TOKENS_PATH, content: appFile(TOKENS_PATH) })).toHaveLength(colorTokens.length);
  });

  it("CT6 : aucun fichier .ts, .tsx ou .css de src/app (hors tokens.css) n'écrit de couleur en dur", () => {
    expect(scannedFiles(appFiles).flatMap(findHardcodedColors)).toEqual([]);
  });
});

describe("CT7 et CT8 : chargement des feuilles et focus visible", () => {
  it("CT7 : layout.tsx importe theme/tokens.css puis globals.css, et aucune autre feuille", () => {
    expect(cssImports(appFile(LAYOUT_PATH))).toEqual(["./theme/tokens.css", "./globals.css"]);
  });

  it.each([
    ["règle conforme", ":focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }", []],
    ["aucune règle :focus-visible", "a { color: var(--color-accent); }", ["aucune règle :focus-visible n'utilise var(--color-focus) dans outline"]],
    [
      "outline: none ailleurs",
      ":focus-visible { outline: 2px solid var(--color-focus); }\nbutton:focus { outline: none; }",
      ["outline supprimé : outline: none"],
    ],
    [
      "outline: 0 ailleurs",
      ":focus-visible { outline: 2px solid var(--color-focus); }\na:focus { outline: 0 }",
      ["outline supprimé : outline: 0"],
    ],
  ] as const)("CT8 (synthétique) : %s", (_label, css, expected) => {
    expect(findFocusProblems(css)).toEqual(expected);
  });

  it("CT8 : globals.css définit :focus-visible avec var(--color-focus) et ne supprime jamais le contour", () => {
    expect(findFocusProblems(appFile(GLOBALS_PATH))).toEqual([]);
  });
});
