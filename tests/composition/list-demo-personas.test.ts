// Tests de la racine de composition, personas de démonstration (US-02c, CA5 et CA6) :
// listDemoPersonas (liste { key, label, role } pour l'écran de connexion, sans jeton ni adresse)
// et resolveDemoPersonaToken (key → jeton, côté serveur ; key inconnue : null). Les deux sont
// refusées par la même garde que createAuthProvider, contrôlée avant la recherche de la key.
// Identifiants stables PE1 à PE8, cités par les preuves par mutation. Les personas, libellés,
// jetons et messages d'erreur attendus sont écrits en dur, indépendamment de PERSONAS.
import { describe, expect, it } from "vitest";
import { type AppEnvironment, listDemoPersonas, resolveDemoPersonaToken } from "../../src/composition/index.js";

const MISSING_MESSAGE =
  "Configuration incomplète : adapterAuth est obligatoire (valeur acceptée : « personas »). Aucun fournisseur d'authentification n'est choisi par défaut : les jetons des personas sont devinables.";

const REFUSED_MESSAGE =
  "Configuration refusée : l'adaptateur d'authentification « personas » est simulé, et l'environnement ne l'autorise pas (environnements autorisés : development, staging).";

function unknownAdapterMessage(value: string): string {
  return `Valeur inconnue pour adapterAuth : « ${value} » (valeur acceptée : « personas »).`;
}

const DEMO = { environment: "development", adapterAuth: "personas" } as const;

const EXPECTED_LIST = [
  { key: "persona-sophie", label: "Sophie — freelance", role: "freelancer" },
  { key: "persona-karim", label: "Karim — freelance", role: "freelancer" },
  { key: "persona-julie", label: "Julie — freelance", role: "freelancer" },
  { key: "persona-marc", label: "Marc — freelance", role: "freelancer" },
  { key: "persona-alpha-conseil", label: "Alpha Conseil — recruteur", role: "recruiter" },
  { key: "persona-admin", label: "Administrateur", role: "admin" },
];

const TOKENS = ["demo-sophie", "demo-karim", "demo-julie", "demo-marc", "demo-alpha-conseil", "demo-admin"];

const ADDRESSES = [
  "sophie@exemple.test",
  "karim@exemple.test",
  "julie@exemple.test",
  "marc@exemple.test",
  "recrutement@alpha-conseil.example",
  "admin@meshed.example",
];

// Configurations refusées par la garde, avec le message attendu (même ordre de contrôle que
// createAuthProvider : valeur absente, puis environnement, puis valeur inconnue).
const REFUSED_CONFIGS: ReadonlyArray<readonly [string, { environment: AppEnvironment; adapterAuth?: string }, string]> = [
  ["production et « personas »", { environment: "production", adapterAuth: "personas" }, REFUSED_MESSAGE],
  [
    "environnement incorrect « Development » et « personas »",
    { environment: "Development" as unknown as AppEnvironment, adapterAuth: "personas" },
    REFUSED_MESSAGE,
  ],
  [
    "environnement incorrect chaîne vide et « personas »",
    { environment: "" as unknown as AppEnvironment, adapterAuth: "personas" },
    REFUSED_MESSAGE,
  ],
  ["development et adapterAuth absent", { environment: "development" }, MISSING_MESSAGE],
  ["production et adapterAuth absent", { environment: "production" }, MISSING_MESSAGE],
  ["development et « mock »", { environment: "development", adapterAuth: "mock" }, unknownAdapterMessage("mock")],
  ["development et chaîne vide", { environment: "development", adapterAuth: "" }, unknownAdapterMessage("")],
  [
    "development et « Personas » (casse différente)",
    { environment: "development", adapterAuth: "Personas" },
    unknownAdapterMessage("Personas"),
  ],
  ["production et « real »", { environment: "production", adapterAuth: "real" }, unknownAdapterMessage("real")],
];

describe("listDemoPersonas", () => {
  it.each([
    ["« development »", "development"],
    ["« staging »", "staging"],
  ] as const)("PE1 : environnement %s : quatre freelances, un recruteur, un admin, avec libellé", (_label, environment) => {
    expect(listDemoPersonas({ environment, adapterAuth: "personas" })).toStrictEqual(EXPECTED_LIST);
  });

  it("PE2 : aucun résultat ne contient de jeton ni d'adresse (recherche dans la sérialisation)", () => {
    const serialized = JSON.stringify(listDemoPersonas(DEMO));
    for (const secret of [...TOKENS, ...ADDRESSES, "@", "demo-"]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("PE3 : environnement « production » : refus", () => {
    expect(() => listDemoPersonas({ environment: "production", adapterAuth: "personas" })).toThrow(
      new Error(REFUSED_MESSAGE),
    );
  });

  it.each(REFUSED_CONFIGS)("PE4 : %s : même erreur que createAuthProvider", (_label, config, message) => {
    expect(() => listDemoPersonas(config)).toThrow(new Error(message));
  });

  it("PE5 : libellés non vides et sans doublon", () => {
    const labels = listDemoPersonas(DEMO).map((choice) => choice.label);
    expect(labels.filter((label) => label.trim() === "")).toEqual([]);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("resolveDemoPersonaToken", () => {
  it.each([
    ["persona-sophie", "demo-sophie"],
    ["persona-karim", "demo-karim"],
    ["persona-julie", "demo-julie"],
    ["persona-marc", "demo-marc"],
    ["persona-alpha-conseil", "demo-alpha-conseil"],
    ["persona-admin", "demo-admin"],
  ])("PE6 : key « %s » : jeton « %s »", (key, token) => {
    expect(resolveDemoPersonaToken(DEMO, key)).toBe(token);
    expect(resolveDemoPersonaToken({ environment: "staging", adapterAuth: "personas" }, key)).toBe(token);
  });

  it.each([
    ["chaîne vide", ""],
    ["key inconnue", "persona-inconnu"],
    ["jeton de Sophie", "demo-sophie"],
    ["jeton de l'administrateur", "demo-admin"],
    ["adresse de Sophie", "sophie@exemple.test"],
    ["prénom seul", "sophie"],
    ["préfixe seul", "persona-"],
    ["casse différente", "Persona-Sophie"],
    ["majuscules", "PERSONA-SOPHIE"],
    ["espace avant", " persona-sophie"],
    ["espace après", "persona-sophie "],
  ])("PE7 : %s : null, aucun jeton", (_label, key) => {
    expect(resolveDemoPersonaToken(DEMO, key)).toBeNull();
  });

  it.each(REFUSED_CONFIGS)(
    "PE8 : %s : même erreur que createAuthProvider, avant la recherche de la key",
    (_label, config, message) => {
      expect(() => resolveDemoPersonaToken(config, "persona-sophie")).toThrow(new Error(message));
      expect(() => resolveDemoPersonaToken(config, "persona-inconnu")).toThrow(new Error(message));
    },
  );
});
