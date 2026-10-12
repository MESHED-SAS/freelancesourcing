// Sources de src/ pour les tests d'architecture (règles de CLAUDE.md §2).
// import.meta.glob est remplacé par Vite au chargement du test : aucune API Node, aucune
// dépendance ajoutée. Le motif doit rester une chaîne littérale, relative à ce fichier.

const SOURCE_PREFIX = "../../";

const rawSources = import.meta.glob("../../src/**/*.ts", {
  eager: true,
  query: "?raw",
  import: "default",
});

export interface SourceFile {
  // Chemin depuis la racine du dépôt, séparé par « / » (par exemple src/domain/time/day.ts).
  readonly path: string;
  readonly content: string;
}

export const sourceFiles: readonly SourceFile[] = Object.entries(rawSources)
  .map(([key, content]) => {
    if (!key.startsWith(SOURCE_PREFIX)) {
      throw new Error(`Chemin inattendu renvoyé par import.meta.glob : ${key}`);
    }
    return { path: key.slice(SOURCE_PREFIX.length), content };
  })
  .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

// Remplace par des espaces, en gardant les retours à la ligne, tout ce qui n'est pas du code :
// commentaires // et /* */, chaînes "…" et '…', texte littéral des gabarits `…`.
// Les expressions ${…} des gabarits sont analysées comme du code, y compris imbriquées.
// Les numéros de ligne restent exacts et deux mots ne sont jamais collés.
// Les chemins d'import sont des chaînes : ils sont donc masqués. La modification 2 (règles de
// dépendance entre couches) aura besoin d'une fonction à part pour les lire.
// Les expressions régulières /…/ sont recopiées telles quelles : un « // » qu'elles contiennent
// n'ouvre pas de commentaire. En cas de doute entre division et expression régulière, on choisit
// l'expression régulière : l'erreur possible est alors de garder du texte (refus de trop),
// jamais de masquer du code.
export function maskNonCode(code: string): string {
  return scanCode(code, 0, false).masked;
}

interface Scan {
  readonly masked: string;
  // Position où l'analyse s'est arrêtée : fin du texte, ou « } » fermant une expression ${…}.
  readonly end: number;
}

function scanCode(code: string, start: number, insideTemplate: boolean): Scan {
  let masked = "";
  let depth = 0;
  let i = start;
  while (i < code.length) {
    const char = code.charAt(i);
    const next = code.charAt(i + 1);
    let end = i + 1;
    if (char === "/" && next === "/") {
      const newline = code.indexOf("\n", i);
      end = newline === -1 ? code.length : newline;
      masked += blank(code.slice(i, end));
    } else if (char === "/" && next === "*") {
      const close = code.indexOf("*/", i + 2);
      end = close === -1 ? code.length : close + 2;
      masked += blank(code.slice(i, end));
    } else if (char === '"' || char === "'") {
      end = endOfString(code, i);
      masked += blank(code.slice(i, end));
    } else if (char === "`") {
      const template = scanTemplate(code, i);
      end = template.end;
      masked += template.masked;
    } else if (char === "/" && regexMayStartAfter(masked)) {
      end = endOfRegex(code, i);
      masked += code.slice(i, end);
    } else {
      if (char === "{") depth += 1;
      if (char === "}") {
        if (insideTemplate && depth === 0) return { masked, end: i };
        depth -= 1;
      }
      masked += char;
    }
    i = end;
  }
  return { masked, end: code.length };
}

// Gabarit ouvert en `start` : le texte littéral est masqué, chaque ${…} est analysé comme du code.
function scanTemplate(code: string, start: number): Scan {
  let masked = " ";
  let i = start + 1;
  while (i < code.length) {
    const char = code.charAt(i);
    if (char === "`") return { masked: masked + " ", end: i + 1 };
    if (char === "\\") {
      masked += blank(code.slice(i, i + 2));
      i += 2;
    } else if (char === "$" && code.charAt(i + 1) === "{") {
      const expression = scanCode(code, i + 2, true);
      masked += "  " + expression.masked;
      i = expression.end;
      if (i < code.length) {
        masked += " ";
        i += 1;
      }
    } else {
      masked += blank(char);
      i += 1;
    }
  }
  return { masked, end: code.length };
}

function blank(text: string): string {
  return text.replace(/[^\n]/g, " ");
}

// Position juste après le guillemet fermant de la chaîne ouverte en `start`.
function endOfString(code: string, start: number): number {
  const quote = code.charAt(start);
  let i = start + 1;
  while (i < code.length) {
    const char = code.charAt(i);
    if (char === "\\") i += 2;
    else if (char === quote) return i + 1;
    else if (char === "\n") return i;
    else i += 1;
  }
  return code.length;
}

// Position juste après le « / » fermant de l'expression régulière ouverte en `start`.
// Un « / » dans une classe […] ne ferme pas l'expression.
function endOfRegex(code: string, start: number): number {
  let i = start + 1;
  let inClass = false;
  while (i < code.length) {
    const char = code.charAt(i);
    if (char === "\\") {
      i += 2;
      continue;
    }
    if (char === "\n") return i;
    if (char === "[") inClass = true;
    else if (char === "]") inClass = false;
    else if (char === "/" && !inClass) return i + 1;
    i += 1;
  }
  return code.length;
}

const KEYWORDS_BEFORE_EXPRESSION = new Set([
  "return", "typeof", "instanceof", "in", "of", "new", "delete",
  "void", "throw", "case", "do", "else", "yield", "await",
]);

// Un « / » est une division seulement s'il suit une valeur : identifiant (hors mot-clé),
// nombre, « ) » ou « ] ». Dans tous les autres cas, il ouvre une expression régulière.
function regexMayStartAfter(previous: string): boolean {
  const before = previous.trimEnd();
  const last = before.charAt(before.length - 1);
  if (last === ")" || last === "]") return false;
  if (!/[\w$]/.test(last)) return true;
  const word = /[\w$]+$/.exec(before)?.[0] ?? "";
  return KEYWORDS_BEFORE_EXPRESSION.has(word);
}
