// Tests de la logique de connexion et de déconnexion (US-02c, CA6, CA7 et CA10) : decideLogin
// traduit la valeur reçue du formulaire en cookie de session ou en refus ; sessionCookieDeletion
// donne le cookie de suppression ; isLoginFailure décide de l'affichage du message neutre.
// Le fichier d'action (src/app/session/actions.ts) applique ces décisions et n'est pas testé ici.
// Identifiants stables LO1 à LO13, cités par les preuves par mutation. Les valeurs attendues sont
// écrites en dur. Le cas production n'est pas repris : getServices lève l'erreur avant toute
// décision (SV3, SV9 de tests/app/services.test.ts). L'absence de jeton dans la liste affichée par
// la page de connexion est prouvée par SV6.
import { afterEach, describe, expect, it } from "vitest";
import { getServices, resetServicesForTests } from "../../src/app/services.js";
import {
  decideLogin,
  isLoginFailure,
  LOGIN_FAILURE_MESSAGE,
  LOGIN_FAILURE_PATH,
  LOGIN_FORM_FIELD,
  LOGIN_PAGE_PATH,
  LOGIN_SUCCESS_PATH,
  type LoginDependencies,
  sessionCookieDeletion,
} from "../../src/app/session/login.js";
import type { AppEnvironment } from "../../src/composition/index.js";

const DEV_ENV = { APP_ENV: "development", ADAPTER_AUTH: "personas", ADAPTER_AUDIT_LOG: "in-memory" } as const;

afterEach(() => {
  resetServicesForTests();
});

// Fausse dépendance : un seul persona fictif (persona-a → jeton-a) ; enregistre chaque appel.
function fakeDependencies(environment: AppEnvironment): { dependencies: LoginDependencies; calls: string[] } {
  const calls: string[] = [];
  const dependencies: LoginDependencies = {
    environment,
    resolveDemoPersonaToken: (key: string) => {
      calls.push(key);
      return key === "persona-a" ? "jeton-a" : null;
    },
  };
  return { dependencies, calls };
}

const REFUSED = { kind: "login-refused" };

describe("decideLogin", () => {
  it("LO1 : key connue : cookie meshed_session, valeur = jeton résolu, options du cookie de session", () => {
    const { dependencies, calls } = fakeDependencies("development");
    expect(decideLogin(dependencies, "persona-a")).toStrictEqual({
      kind: "login-ok",
      cookie: {
        name: "meshed_session",
        value: "jeton-a",
        options: { httpOnly: true, sameSite: "lax", path: "/", secure: false },
      },
    });
    expect(calls).toEqual(["persona-a"]);
  });

  it.each([
    ["persona-sophie", "demo-sophie"],
    ["persona-karim", "demo-karim"],
    ["persona-julie", "demo-julie"],
    ["persona-marc", "demo-marc"],
    ["persona-alpha-conseil", "demo-alpha-conseil"],
    ["persona-admin", "demo-admin"],
  ])("LO2 : avec les vrais services, %s donne le jeton %s", (key, token) => {
    const decision = decideLogin(getServices(DEV_ENV), key);
    expect(decision.kind === "login-ok" && decision.cookie.value).toBe(token);
  });

  it("LO3 : key inconnue : refus", () => {
    const { dependencies } = fakeDependencies("development");
    expect(decideLogin(dependencies, "persona-inconnu")).toStrictEqual(REFUSED);
  });

  it("LO4 : key vide : refus", () => {
    const { dependencies } = fakeDependencies("development");
    expect(decideLogin(dependencies, "")).toStrictEqual(REFUSED);
  });

  it("LO5 : key absente du formulaire (null) : refus, résolveur non appelé", () => {
    const { dependencies, calls } = fakeDependencies("development");
    expect(decideLogin(dependencies, null)).toStrictEqual(REFUSED);
    expect(calls).toEqual([]);
  });

  it.each([
    ["un fichier", new File(["persona-a"], "persona-a")],
    ["undefined", undefined],
    ["un nombre", 42],
    ["un tableau", ["persona-a"]],
  ])("LO6 : valeur qui n'est pas une chaîne (%s) : refus, résolveur non appelé", (_label, rawKey) => {
    const { dependencies, calls } = fakeDependencies("development");
    expect(decideLogin(dependencies, rawKey)).toStrictEqual(REFUSED);
    expect(calls).toEqual([]);
  });

  it.each(["demo-sophie", "sophie@exemple.test"])(
    "LO7 : avec les vrais services, la key « %s » (jeton ou adresse) est refusée",
    (rawKey) => {
      expect(decideLogin(getServices(DEV_ENV), rawKey)).toStrictEqual(REFUSED);
    },
  );

  it.each([" persona-sophie", "persona-sophie ", "Persona-Sophie", "PERSONA-SOPHIE"])(
    "LO8 : avec les vrais services, « %s » (espaces ou casse) est refusé, sans normalisation",
    (rawKey) => {
      expect(decideLogin(getServices(DEV_ENV), rawKey)).toStrictEqual(REFUSED);
    },
  );

  it("LO9 : décisions gelées (décision, cookie, options) ; le refus ne contient aucun jeton", () => {
    const { dependencies } = fakeDependencies("development");
    const accepted = decideLogin(dependencies, "persona-a");
    expect(Object.isFrozen(accepted)).toBe(true);
    expect(accepted.kind === "login-ok" && Object.isFrozen(accepted.cookie)).toBe(true);
    expect(accepted.kind === "login-ok" && Object.isFrozen(accepted.cookie.options)).toBe(true);
    const refused = decideLogin(getServices(DEV_ENV), "persona-inconnu");
    expect(Object.isFrozen(refused)).toBe(true);
    const serialized = JSON.stringify(refused);
    for (const secret of ["demo-", "@", "jeton"]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it.each([
    ["development", false],
    ["staging", false],
    ["production", true],
  ] as const)("LO10 : environnement %s : cookie Secure = %s", (environment, secure) => {
    const { dependencies } = fakeDependencies(environment);
    const decision = decideLogin(dependencies, "persona-a");
    expect(decision.kind === "login-ok" && decision.cookie.options).toStrictEqual({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure,
    });
  });

  it.each(["constructor", "__proto__", "toString", "hasOwnProperty", "prototype"])(
    "LO15 : avec les vrais services, la clé héritée « %s » est refusée",
    (rawKey) => {
      expect(decideLogin(getServices(DEV_ENV), rawKey)).toStrictEqual(REFUSED);
    },
  );

  it.each([
    ["undefined", undefined],
    ["chaîne vide", ""],
    ["nombre 42", 42],
  ])("LO17 : résolveur défaillant qui renvoie %s : refus (le jeton doit être une chaîne non vide)", (_label, returned) => {
    const dependencies: LoginDependencies = {
      environment: "development",
      resolveDemoPersonaToken: () => returned as unknown as string | null,
    };
    expect(decideLogin(dependencies, "persona-a")).toStrictEqual(REFUSED);
  });
});

describe("sessionCookieDeletion", () => {
  it.each([
    ["development", false],
    ["production", true],
  ] as const)("LO11 : environnement %s : même nom, valeur vide, mêmes attributs et maxAge 0, gelé", (environment, secure) => {
    const deletion = sessionCookieDeletion(environment);
    expect(deletion).toStrictEqual({
      name: "meshed_session",
      value: "",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure, maxAge: 0 },
    });
    expect(Object.isFrozen(deletion)).toBe(true);
    expect(Object.isFrozen(deletion.options)).toBe(true);
  });
});

describe("Chemins et formulaire", () => {
  it("LO12 : chemins fixes (aucune entrée ne les modifie : pas de redirection ouverte) et nom du champ", () => {
    expect([LOGIN_SUCCESS_PATH, LOGIN_FAILURE_PATH, LOGIN_PAGE_PATH, LOGIN_FORM_FIELD]).toEqual([
      "/",
      "/connexion?echec=1",
      "/connexion",
      "key",
    ]);
  });

  it.each([
    ["echec=1 → vrai", { echec: "1" }, true],
    ["sans paramètre → faux", {}, false],
    ["echec=0 → faux", { echec: "0" }, false],
    ["echec répété (tableau) → faux", { echec: ["1", "1"] }, false],
    ["echec=« 1 » avec espace → faux", { echec: "1 " }, false],
    ["autre paramètre → faux", { autre: "1" }, false],
  ] as const)("LO13 : isLoginFailure, %s", (_label, searchParams, expected) => {
    expect(isLoginFailure(searchParams)).toBe(expected);
  });

  it("LO14 : LOGIN_FAILURE_PATH mène à la page de connexion avec un paramètre que isLoginFailure reconnaît", () => {
    const url = new URL(LOGIN_FAILURE_PATH, "http://localhost");
    expect(url.pathname).toBe(LOGIN_PAGE_PATH);
    expect(isLoginFailure(Object.fromEntries(url.searchParams))).toBe(true);
  });

  it("LO16 : message d'échec neutre et exact (CA10 : ni valeur reçue, ni raison, ni trace)", () => {
    expect(LOGIN_FAILURE_MESSAGE).toBe("Connexion impossible. Choisissez un profil dans la liste.");
  });
});
