// Tests de la racine de composition, P2 AuthProvider (US-02, critères 1, 3 et 4) : choix du
// fournisseur d'authentification selon la configuration, sans valeur par défaut.
// Identifiants stables A1 à A10, cités par les preuves par mutation. Les messages d'erreur attendus
// et les personas attendus (jeton, identifiant, rôle) sont écrits en dur.
import { describe, expect, it } from "vitest";
import { PersonaAuthProvider } from "../../src/adapters/auth/persona-auth-provider.js";
import { type AppEnvironment, createAuthProvider, DISPOSABLE_DOMAINS } from "../../src/composition/index.js";
import { authenticateSession } from "../../src/use-cases/authenticate-session.js";

const MISSING_MESSAGE =
  "Configuration incomplète : adapterAuth est obligatoire (valeur acceptée : « personas »). Aucun fournisseur d'authentification n'est choisi par défaut : les jetons des personas sont devinables.";

const REFUSED_MESSAGE =
  "Configuration refusée : l'adaptateur d'authentification « personas » est simulé, et l'environnement ne l'autorise pas (environnements autorisés : development, staging).";

describe("createAuthProvider", () => {
  it("A1 : adapterAuth « personas » : fournisseur des personas fictifs", () => {
    expect(createAuthProvider({ environment: "development", adapterAuth: "personas" })).toBeInstanceOf(
      PersonaAuthProvider,
    );
  });

  it("A2 : adapterAuth absent : erreur, aucun fournisseur par défaut", () => {
    expect(() => createAuthProvider({ environment: "development" })).toThrow(new Error(MISSING_MESSAGE));
  });

  it("A3 : adapterAuth undefined : même erreur", () => {
    expect(() => createAuthProvider({ environment: "development", adapterAuth: undefined })).toThrow(
      new Error(MISSING_MESSAGE),
    );
  });

  it.each([
    ["« mock »", "mock", "Valeur inconnue pour adapterAuth : « mock » (valeur acceptée : « personas »)."],
    ["chaîne vide", "", "Valeur inconnue pour adapterAuth : «  » (valeur acceptée : « personas »)."],
    [
      "« Personas » (casse différente)",
      "Personas",
      "Valeur inconnue pour adapterAuth : « Personas » (valeur acceptée : « personas »).",
    ],
    ["« real »", "real", "Valeur inconnue pour adapterAuth : « real » (valeur acceptée : « personas »)."],
  ])("A4 : refuse la valeur inconnue %s, sans repli silencieux", (_label, adapterAuth, message) => {
    expect(() => createAuthProvider({ environment: "development", adapterAuth })).toThrow(new Error(message));
  });

  it("A5 : de bout en bout, les six personas sont acceptés par authenticateSession avec la liste des domaines jetables", async () => {
    const dependencies = {
      authProvider: createAuthProvider({ environment: "development", adapterAuth: "personas" }),
      disposableDomains: DISPOSABLE_DOMAINS,
    };
    for (const [token, id, role] of [
      ["demo-sophie", "persona-sophie", "freelancer"],
      ["demo-karim", "persona-karim", "freelancer"],
      ["demo-julie", "persona-julie", "freelancer"],
      ["demo-marc", "persona-marc", "freelancer"],
      ["demo-alpha-conseil", "persona-alpha-conseil", "recruiter"],
      ["demo-admin", "persona-admin", "admin"],
    ] as const) {
      const result = await authenticateSession(dependencies, token);
      expect({
        token,
        ok: result.ok,
        id: result.ok ? result.user.id.value : null,
        role: result.ok ? result.user.role : null,
      }).toEqual({ token, ok: true, id, role });
    }
  });

  it("A6 : environnement « production » et adapterAuth « personas » : erreur, composant simulé refusé", () => {
    expect(() => createAuthProvider({ environment: "production", adapterAuth: "personas" })).toThrow(
      new Error(REFUSED_MESSAGE),
    );
  });

  it.each([
    ["chaîne vide", ""],
    ["« prod » (abréviation)", "prod"],
    ["« Production » (casse différente)", "Production"],
    ["« Development » (casse différente)", "Development"],
    ["undefined", undefined],
    ["null", null],
  ])("A7 : environnement incorrect %s et adapterAuth « personas » : même erreur", (_label, environment) => {
    expect(() =>
      createAuthProvider({ environment: environment as unknown as AppEnvironment, adapterAuth: "personas" }),
    ).toThrow(new Error(REFUSED_MESSAGE));
  });

  it.each([
    ["« development »", "development"],
    ["« staging »", "staging"],
  ] as const)("A8 : environnement %s et adapterAuth « personas » : fournisseur des personas fictifs", (_label, environment) => {
    expect(createAuthProvider({ environment, adapterAuth: "personas" })).toBeInstanceOf(PersonaAuthProvider);
  });

  it("A9 : environnement « production » et adapterAuth absent : erreur de valeur absente, contrôlée en premier", () => {
    expect(() => createAuthProvider({ environment: "production" })).toThrow(new Error(MISSING_MESSAGE));
  });

  it("A10 : environnement « production » et adapterAuth « real » : erreur de valeur inconnue", () => {
    expect(() => createAuthProvider({ environment: "production", adapterAuth: "real" })).toThrow(
      new Error("Valeur inconnue pour adapterAuth : « real » (valeur acceptée : « personas »)."),
    );
  });
});
