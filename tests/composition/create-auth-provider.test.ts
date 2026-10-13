// Tests de la racine de composition, P2 AuthProvider (US-02, critères 1, 3 et 4) : choix du
// fournisseur d'authentification selon la configuration, sans valeur par défaut.
// Identifiants stables A1 à A5, cités par les preuves par mutation. Les messages d'erreur attendus
// et les personas attendus (jeton, identifiant, rôle) sont écrits en dur.
import { describe, expect, it } from "vitest";
import { PersonaAuthProvider } from "../../src/adapters/auth/persona-auth-provider.js";
import { createAuthProvider, DISPOSABLE_DOMAINS } from "../../src/composition/index.js";
import { authenticateSession } from "../../src/use-cases/authenticate-session.js";

const MISSING_MESSAGE =
  "Configuration incomplète : adapterAuth est obligatoire (valeur acceptée : « personas »). Aucun fournisseur d'authentification n'est choisi par défaut : les jetons des personas sont devinables.";

describe("createAuthProvider", () => {
  it("A1 : adapterAuth « personas » : fournisseur des personas fictifs", () => {
    expect(createAuthProvider({ adapterAuth: "personas" })).toBeInstanceOf(PersonaAuthProvider);
  });

  it("A2 : adapterAuth absent : erreur, aucun fournisseur par défaut", () => {
    expect(() => createAuthProvider({})).toThrow(new Error(MISSING_MESSAGE));
  });

  it("A3 : adapterAuth undefined : même erreur", () => {
    expect(() => createAuthProvider({ adapterAuth: undefined })).toThrow(new Error(MISSING_MESSAGE));
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
    expect(() => createAuthProvider({ adapterAuth })).toThrow(new Error(message));
  });

  it("A5 : de bout en bout, les six personas sont acceptés par authenticateSession avec la liste des domaines jetables", async () => {
    const dependencies = {
      authProvider: createAuthProvider({ adapterAuth: "personas" }),
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
});
