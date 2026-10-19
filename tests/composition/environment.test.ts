// Tests de la racine de composition, garde des composants simulés : seuls « development » et
// « staging » permettent un composant simulé (liste blanche, comparaison exacte).
// Identifiants stables E1 à E3b, cités par les preuves par mutation. Les résultats attendus sont
// écrits en dur.
import { describe, expect, it } from "vitest";
import { type AppEnvironment, isMockAllowed } from "../../src/composition/index.js";

describe("isMockAllowed", () => {
  it.each([
    ["« development » (permis)", "development", true],
    ["« staging » (permis)", "staging", true],
    ["« production » (refusé)", "production", false],
  ] as const)("E1 : environnement %s : garde des composants simulés", (_label, environment, expected) => {
    expect(isMockAllowed(environment)).toBe(expected);
  });

  it.each([
    ["chaîne vide", ""],
    ["« prod » (abréviation)", "prod"],
    ["« dev » (abréviation)", "dev"],
    ["« develop » (abréviation)", "develop"],
    ["« Production » (casse différente)", "Production"],
    ["« PRODUCTION » (casse différente)", "PRODUCTION"],
    ["« Development » (casse différente)", "Development"],
    ["« STAGING » (casse différente)", "STAGING"],
    ["« staging » précédé d'une espace", " staging"],
    ["« staging » suivi d'une espace", "staging "],
    ["« staging2 » (suffixe)", "staging2"],
    ["« development » suivi d'un retour à la ligne", "development\n"],
  ])("E2 : refuse le composant simulé pour la valeur incorrecte %s, sans normalisation", (_label, environment) => {
    expect(isMockAllowed(environment as unknown as AppEnvironment)).toBe(false);
  });

  it("E3a : refuse le composant simulé pour undefined", () => {
    expect(isMockAllowed(undefined as unknown as AppEnvironment)).toBe(false);
  });

  it("E3b : refuse le composant simulé pour null", () => {
    expect(isMockAllowed(null as unknown as AppEnvironment)).toBe(false);
  });
});
