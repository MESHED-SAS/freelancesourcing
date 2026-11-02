// Tests de la racine de composition, loadConfig (US-02c, CA3) : traduction des variables
// d'environnement en configuration. APP_ENV absent = production ; toute autre valeur que
// « development », « staging » ou « production » lève une erreur, sans repli ni normalisation.
// Les variables ADAPTER_* sont transmises telles quelles : leur validation reste dans les fabriques.
// Identifiants stables LC1 à LC8 (LC4 en deux cas : LC4a et LC4b), cités par les preuves par mutation. Les résultats et les
// messages d'erreur attendus sont écrits en dur.
import { describe, expect, it } from "vitest";
import { InMemoryAuditLog } from "../../src/adapters/audit/in-memory-audit-log.js";
import { PersonaAuthProvider } from "../../src/adapters/auth/persona-auth-provider.js";
import { SystemClock } from "../../src/adapters/clock/system-clock.js";
import {
  type AppConfig,
  createAuditLog,
  createAuthProvider,
  createClock,
  loadConfig,
} from "../../src/composition/index.js";

function unknownAppEnvMessage(value: string): string {
  return `Valeur inconnue pour APP_ENV : « ${value} » (valeurs acceptées : « development », « staging », « production »).`;
}

describe("loadConfig", () => {
  it("LC1 : APP_ENV absent (clé absente ou valeur undefined) : production", () => {
    expect(loadConfig({ ADAPTER_AUTH: "personas" }).environment).toBe("production");
    expect(loadConfig({ APP_ENV: undefined, ADAPTER_AUTH: "personas" }).environment).toBe("production");
  });

  it.each([
    ["« development »", "development"],
    ["« staging »", "staging"],
    ["« production »", "production"],
  ] as const)("LC2 : APP_ENV %s : accepté tel quel", (_label, value) => {
    expect(loadConfig({ APP_ENV: value }).environment).toBe(value);
  });

  it.each([
    ["chaîne vide", ""],
    ["« prod » (abréviation)", "prod"],
    ["« Production » (casse différente)", "Production"],
    ["« Development » (casse différente)", "Development"],
    ["« PRODUCTION » (casse différente)", "PRODUCTION"],
    ["« development » précédé d'une espace", " development"],
    ["« development » suivi d'une espace", "development "],
  ])("LC3 : APP_ENV incorrect %s : erreur, sans repli", (_label, value) => {
    expect(() => loadConfig({ APP_ENV: value, ADAPTER_AUTH: "personas", ADAPTER_AUDIT_LOG: "in-memory" })).toThrow(
      new Error(unknownAppEnvMessage(value)),
    );
  });

  it("LC4a : ADAPTER_CLOCK, ADAPTER_AUTH et ADAPTER_AUDIT_LOG transmis tels quels, même inconnus", () => {
    expect(
      loadConfig({
        APP_ENV: "staging",
        ADAPTER_CLOCK: "Simulated",
        ADAPTER_AUTH: " personas",
        ADAPTER_AUDIT_LOG: "real",
      }),
    ).toStrictEqual({
      environment: "staging",
      adapterClock: "Simulated",
      adapterAuth: " personas",
      adapterAuditLog: "real",
    });
  });

  it("LC4b : la configuration se passe telle quelle aux trois fabriques", () => {
    const config: AppConfig = loadConfig({
      APP_ENV: "development",
      ADAPTER_CLOCK: "system",
      ADAPTER_AUTH: "personas",
      ADAPTER_AUDIT_LOG: "in-memory",
    });
    expect(createClock(config)).toBeInstanceOf(SystemClock);
    expect(createAuthProvider(config)).toBeInstanceOf(PersonaAuthProvider);
    expect(createAuditLog(config)).toBeInstanceOf(InMemoryAuditLog);
  });

  it("LC5 : objet vide : production et adaptateurs absents", () => {
    expect(loadConfig({})).toStrictEqual({
      environment: "production",
      adapterClock: undefined,
      adapterAuth: undefined,
      adapterAuditLog: undefined,
    });
  });

  it("LC6 : l'objet reçu n'est pas modifié", () => {
    const env = Object.freeze({
      APP_ENV: "development",
      ADAPTER_CLOCK: "system",
      ADAPTER_AUTH: "personas",
      ADAPTER_AUDIT_LOG: "in-memory",
      OTHER: "valeur",
    });
    const before = { ...env };
    const config = loadConfig(env);
    expect(env).toStrictEqual(before);
    expect(config).not.toBe(env);
  });

  it("LC7 : ADAPTER_AUTH chaîne vide : transmis tel quel, refusé ensuite par la fabrique", () => {
    const config = loadConfig({ APP_ENV: "development", ADAPTER_AUTH: "" });
    expect(config.adapterAuth).toBe("");
    expect(() => createAuthProvider(config)).toThrow(
      new Error("Valeur inconnue pour adapterAuth : «  » (valeur acceptée : « personas »)."),
    );
  });

  it("LC8 : le message d'erreur de APP_ENV cite la valeur reçue et les valeurs acceptées", () => {
    expect(() => loadConfig({ APP_ENV: "recette" })).toThrow(
      new Error(
        "Valeur inconnue pour APP_ENV : « recette » (valeurs acceptées : « development », « staging », « production »).",
      ),
    );
  });
});
