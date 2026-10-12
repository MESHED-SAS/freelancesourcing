// Déclaration locale minimale de import.meta.glob, fonction fournie par Vite (moteur de Vitest).
// Une seule signature : celle qu'utilise tests/architecture/source-files.ts (texte brut, chargé
// immédiatement). Évite d'ajouter @types/node ou de référencer vite/client.
export {};

declare global {
  interface ImportMeta {
    glob(
      pattern: string,
      options: { readonly eager: true; readonly query: "?raw"; readonly import: "default" },
    ): Record<string, string>;
  }
}
