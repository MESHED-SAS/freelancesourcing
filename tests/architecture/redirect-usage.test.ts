// Test d'architecture AR6 (US-02c, commit 8) : redirect(), permanentRedirect(), forbidden(),
// unauthorized() et notFound() de Next interrompent le rendu ou l'action en levant une exception ;
// un try/catch qui les entoure l'avale silencieusement. Règle : tout fichier de src/ qui appelle
// l'une de ces fonctions ne contient ni le mot entier « try » ni le mot entier « catch ».
// La règle porte sur le fichier entier, pas sur le bloc : plus simple et plus stricte.
// Fichiers lus : src/**/*.ts et src/**/*.tsx (tests/architecture/source-files.ts).
// Lecture sur le texte où seuls les commentaires sont masqués (maskComments).
// Limites connues (refus de trop) : un « try » ou un « catch » écrit dans une chaîne, la méthode
// .catch( d'une promesse, ou un appel d'une autre fonction nommée redirect( (par exemple
// NextResponse.redirect() font refuser le fichier. Limite (non détecté) : un appel par alias
// (const go = redirect; go("/")) ou par un nom calculé. Le JSX est lu comme du texte : une
// apostrophe droite dans un texte JSX masque la fin de sa ligne (voir clock-usage.test.ts).
// Le test protège contre l'oubli, pas contre un contournement volontaire.
import { describe, expect, it } from "vitest";
import { maskComments, type SourceFile, sourceFiles } from "./source-files.js";

const INTERRUPTING_CALL = /\b(?:redirect|permanentRedirect|forbidden|unauthorized|notFound)\s*\(/g;
const TRY_OR_CATCH = /\b(?:try|catch)\b/g;

interface Finding {
  readonly line: number;
  readonly match: string;
}

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

// Résultats : chaque « try » et chaque « catch » d'un fichier qui appelle une fonction d'interruption.
function findTryAroundInterrupts(code: string): Finding[] {
  const text = maskComments(code);
  if ([...text.matchAll(INTERRUPTING_CALL)].length === 0) return [];
  return [...text.matchAll(TRY_OR_CATCH)].map((m) => ({ line: lineOf(text, m.index), match: m[0] }));
}

function report(files: readonly SourceFile[]): string[] {
  return files.flatMap((file) => findTryAroundInterrupts(file.content).map((f) => `${file.path}:${f.line} : ${f.match}`));
}

const ACTIONS = "src/app/session/actions.ts";

describe("AR6 : détection d'un try/catch dans un fichier qui interrompt (chaînes écrites en dur)", () => {
  it("refuse un try/catch autour de redirect(", () => {
    const code = ["try {", '  redirect("/");', "} catch {", "  return;", "}"].join("\n");
    expect(findTryAroundInterrupts(code)).toEqual([
      { line: 1, match: "try" },
      { line: 3, match: "catch" },
    ]);
  });

  it.each(["redirect", "permanentRedirect", "forbidden", "unauthorized", "notFound"])(
    "refuse un try/catch dans un fichier qui appelle %s(",
    (name) => {
      const code = ["try {", `  ${name}();`, "} catch (error) {", "  throw error;", "}"].join("\n");
      expect(findTryAroundInterrupts(code)).toEqual([
        { line: 1, match: "try" },
        { line: 3, match: "catch" },
      ]);
    },
  );

  it("accepte redirect( sans try ni catch", () => {
    expect(findTryAroundInterrupts('if (refused) redirect("/connexion");\nredirect("/");')).toEqual([]);
  });

  it("accepte try/catch dans un fichier qui n'appelle aucune fonction d'interruption", () => {
    expect(findTryAroundInterrupts("try {\n  f();\n} catch {\n  g();\n}")).toEqual([]);
  });

  it("accepte les mots voisins (retry, catchy, trying) et les mentions en commentaire", () => {
    const code = [
      "const retry = 1;",
      "const catchy = 2;",
      "const trying = 3;",
      "// try { redirect() } catch {}",
      "/* catch */",
      'redirect("/");',
    ].join("\n");
    expect(findTryAroundInterrupts(code)).toEqual([]);
  });

  it("limite connue : « try » écrit dans une chaîne est refusé (refus de trop)", () => {
    // Fige la limite documentée en tête de fichier ; ce n'est pas un comportement souhaité.
    expect(findTryAroundInterrupts('const s = "try";\nredirect("/");')).toEqual([{ line: 1, match: "try" }]);
  });
});

describe("AR6 sur les fichiers de src/", () => {
  it("lit actions.ts et y voit un appel à redirect( (témoin positif)", () => {
    // Couplé volontairement au contenu de actions.ts : après un changement de ce fichier, adapter ce test.
    const actions = sourceFiles.find((f) => f.path === ACTIONS);
    expect(actions).toBeDefined();
    const calls = [...maskComments(actions?.content ?? "").matchAll(INTERRUPTING_CALL)].map((m) => m[0]);
    expect(calls).toContain("redirect(");
  });

  it("règle AR6 : aucun fichier de src/ qui interrompt ne contient try ou catch", () => {
    expect(report(sourceFiles)).toEqual([]);
  });
});
