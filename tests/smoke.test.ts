// Test de fumée : vérifie que la chaîne TypeScript et Vitest fonctionne
// et que les trois couches de src/ se chargent.
import { describe, expect, it } from "vitest";

describe("socle", () => {
  it.each(["domain", "use-cases", "adapters"])("charge la couche %s", async (layer) => {
    const module: unknown = await import(`../src/${layer}/index.ts`);
    expect(module).toBeTypeOf("object");
  });
});
