// Tests des services de l'interface (US-02c, CA4 et CA5) : getServices(env) crée les services au
// premier appel, les mémorise sur globalThis (clé Symbol.for("meshed.app.services"), partagée par
// toutes les copies du module) et les renvoie gelés. Création tout-ou-rien : si une étape lève une
// erreur, rien n'est mémorisé et l'erreur se propage telle quelle (décision 17 : en production,
// ou APP_ENV absent, aucun service n'est créé). Les personas de démonstration sont liés à la
// configuration : les pages ne voient ni environment ni adapterAuth pour les choisir.
// Identifiants stables SV1 à SV11, cités par les preuves par mutation. Les valeurs attendues sont
// écrites en dur. La réinitialisation a lieu après chaque test (et non avant) : SV1 voit ainsi
// l'état laissé par l'import du module.
import { afterEach, describe, expect, it } from "vitest";
import { PersonaAuthProvider } from "../../src/adapters/auth/persona-auth-provider.js";
import { InMemoryAuditLog } from "../../src/adapters/audit/in-memory-audit-log.js";
import { SystemClock } from "../../src/adapters/clock/system-clock.js";
import { getServices, resetServicesForTests } from "../../src/app/services.js";
import { decideRecruitersPage, resolveSession } from "../../src/app/session/session.js";
import { DISPOSABLE_DOMAINS } from "../../src/composition/index.js";

const SERVICES_KEY = Symbol.for("meshed.app.services");

function stored(): unknown {
  return (globalThis as Record<symbol, unknown>)[SERVICES_KEY];
}

const DEV_ENV = { APP_ENV: "development", ADAPTER_AUTH: "personas", ADAPTER_AUDIT_LOG: "in-memory" } as const;
const PROD_ENV = { APP_ENV: "production", ADAPTER_AUTH: "personas", ADAPTER_AUDIT_LOG: "in-memory" } as const;

const MISSING_AUTH_MESSAGE =
  "Configuration incomplète : adapterAuth est obligatoire (valeur acceptée : « personas »). Aucun fournisseur d'authentification n'est choisi par défaut : les jetons des personas sont devinables.";
const MISSING_AUDIT_LOG_MESSAGE =
  "Configuration incomplète : adapterAuditLog est obligatoire (valeur acceptée : « in-memory »).";
const REFUSED_AUTH_MESSAGE =
  "Configuration refusée : l'adaptateur d'authentification « personas » est simulé, et l'environnement ne l'autorise pas (environnements autorisés : development, staging).";

const TOKENS = ["demo-sophie", "demo-karim", "demo-julie", "demo-marc", "demo-alpha-conseil", "demo-admin"];
const ADDRESSES = [
  "sophie@exemple.test",
  "karim@exemple.test",
  "julie@exemple.test",
  "marc@exemple.test",
  "recrutement@alpha-conseil.example",
  "admin@meshed.example",
];

afterEach(() => {
  resetServicesForTests();
});

describe("getServices", () => {
  // Doit rester le premier test du fichier : il observe l'état laissé par l'import.
  it("SV1 : aucun service n'est créé à l'import du module", () => {
    expect(stored()).toBeUndefined();
  });

  it("SV2 : deux appels renvoient les mêmes services, le même journal, mémorisés sur globalThis", () => {
    const first = getServices(DEV_ENV);
    const second = getServices(DEV_ENV);
    expect(second).toBe(first);
    expect(second.auditLog).toBe(first.auditLog);
    expect(stored()).toBe(first);
  });

  it("SV3 : APP_ENV « production » et ADAPTER_AUTH « personas » : erreur « Configuration refusée »", () => {
    expect(() => getServices(PROD_ENV)).toThrow(new Error(REFUSED_AUTH_MESSAGE));
  });

  it.each([
    ["« development »", "development"],
    ["« staging »", "staging"],
  ] as const)("SV4 : environnement %s complet : services utilisables de bout en bout", async (_label, environment) => {
    const services = getServices({ ...DEV_ENV, APP_ENV: environment });
    expect(services.environment).toBe(environment);
    expect(services.clock).toBeInstanceOf(SystemClock);
    expect(services.authProvider).toBeInstanceOf(PersonaAuthProvider);
    expect(services.auditLog).toBeInstanceOf(InMemoryAuditLog);
    expect(services.disposableDomains).toBe(DISPOSABLE_DOMAINS);
    const session = await resolveSession(services, "demo-sophie");
    expect(session.kind === "user" && session.user.id.value).toBe("persona-sophie");
    expect(await decideRecruitersPage(services, session)).toStrictEqual({ kind: "forbidden" });
    expect((await services.auditLog.list()).map((entry) => [entry.actor.value, entry.target])).toEqual([
      ["persona-sophie", "page:recruteurs"],
    ]);
  });

  it("SV5 : APP_ENV inconnu : erreur de loadConfig", () => {
    expect(() => getServices({ ...DEV_ENV, APP_ENV: "prod" })).toThrow(
      new Error(
        "Valeur inconnue pour APP_ENV : « prod » (valeurs acceptées : « development », « staging », « production »).",
      ),
    );
  });

  it("SV6 : demoPersonas : six choix dans l'ordre, sans jeton ni adresse", () => {
    const { demoPersonas } = getServices(DEV_ENV);
    expect(demoPersonas.map((choice) => [choice.key, choice.label, choice.role])).toEqual([
      ["persona-sophie", "Sophie — freelance", "freelancer"],
      ["persona-karim", "Karim — freelance", "freelancer"],
      ["persona-julie", "Julie — freelance", "freelancer"],
      ["persona-marc", "Marc — freelance", "freelancer"],
      ["persona-alpha-conseil", "Alpha Conseil — recruteur", "recruiter"],
      ["persona-admin", "Administrateur", "admin"],
    ]);
    const serialized = JSON.stringify(demoPersonas);
    for (const secret of [...TOKENS, ...ADDRESSES, "@", "demo-"]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("SV7 : resolveDemoPersonaToken lié à la configuration : key connue → jeton, key inconnue ou jeton → null", () => {
    const { resolveDemoPersonaToken } = getServices(DEV_ENV);
    expect(resolveDemoPersonaToken("persona-sophie")).toBe("demo-sophie");
    expect(resolveDemoPersonaToken("persona-alpha-conseil")).toBe("demo-alpha-conseil");
    expect(resolveDemoPersonaToken("persona-inconnu")).toBeNull();
    expect(resolveDemoPersonaToken("demo-sophie")).toBeNull();
  });

  it("SV8 : une création en échec n'est pas mémorisée, même après une étape réussie", () => {
    expect(() => getServices(PROD_ENV)).toThrow(new Error(REFUSED_AUTH_MESSAGE));
    expect(() => getServices(PROD_ENV)).toThrow(new Error(REFUSED_AUTH_MESSAGE));
    expect(stored()).toBeUndefined();
    // Horloge et authentification acceptées, journal manquant : rien n'est gardé.
    expect(() => getServices({ APP_ENV: "development", ADAPTER_AUTH: "personas" })).toThrow(
      new Error(MISSING_AUDIT_LOG_MESSAGE),
    );
    expect(stored()).toBeUndefined();
    expect(getServices(DEV_ENV).environment).toBe("development");
  });

  it("SV9 : APP_ENV absent = production : « personas » refusé ; objet vide : configuration incomplète", () => {
    expect(() => getServices({ ADAPTER_AUTH: "personas", ADAPTER_AUDIT_LOG: "in-memory" })).toThrow(
      new Error(REFUSED_AUTH_MESSAGE),
    );
    expect(() => getServices({})).toThrow(new Error(MISSING_AUTH_MESSAGE));
    expect(stored()).toBeUndefined();
  });

  it("SV10 : un second appel avec un autre env renvoie les services du premier (env lu une seule fois)", () => {
    const first = getServices(DEV_ENV);
    expect(getServices(PROD_ENV)).toBe(first);
  });

  it("SV11 : services, liste des personas et chacun de ses éléments gelés ; ni adapterAuth ni configuration exposés", () => {
    const services = getServices(DEV_ENV);
    expect(Object.isFrozen(services)).toBe(true);
    expect(Object.isFrozen(services.demoPersonas)).toBe(true);
    expect(services.demoPersonas).toHaveLength(6);
    expect(services.demoPersonas.filter((choice) => !Object.isFrozen(choice)).map((choice) => choice.key)).toEqual([]);
    expect(Object.keys(services).sort()).toEqual([
      "auditLog",
      "authProvider",
      "clock",
      "demoPersonas",
      "disposableDomains",
      "environment",
      "resolveDemoPersonaToken",
    ]);
  });
});
