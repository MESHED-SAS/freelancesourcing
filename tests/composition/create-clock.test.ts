// Tests de la racine de composition, P1 Clock (US-01, incrément 3) : choix de l'horloge selon la configuration.
// Les messages d'erreur attendus sont écrits en dur.
import { describe, expect, it } from "vitest";
import { SimulatedClock } from "../../src/adapters/clock/simulated-clock.js";
import { SystemClock } from "../../src/adapters/clock/system-clock.js";
import { type AppEnvironment, createClock } from "../../src/composition/index.js";
import { Instant } from "../../src/domain/time/instant.js";

// 1er octobre 2025, 8 h UTC (10 h à Paris).
const START = Instant.fromEpochMilliseconds(Date.UTC(2025, 9, 1, 8, 0));

const REFUSED_MESSAGE =
  "Configuration refusée : l'horloge « simulated » est simulée, et l'environnement ne l'autorise pas (environnements autorisés : development, staging).";

describe("createClock", () => {
  it("adapterClock absent : horloge système par défaut", () => {
    expect(createClock({ environment: "development" })).toBeInstanceOf(SystemClock);
  });

  it("adapterClock undefined : horloge système par défaut", () => {
    expect(createClock({ environment: "development", adapterClock: undefined })).toBeInstanceOf(SystemClock);
  });

  it("adapterClock « system » : horloge système", () => {
    expect(createClock({ environment: "development", adapterClock: "system" })).toBeInstanceOf(SystemClock);
  });

  it("adapterClock « simulated » avec simulatedStart : horloge simulée réglée sur cet instant", () => {
    const clock = createClock({ environment: "development", adapterClock: "simulated", simulatedStart: START });
    expect(clock).toBeInstanceOf(SimulatedClock);
    expect(clock.now()).toBe(START);
  });

  it.each([
    [
      "« fake »",
      "fake",
      "Valeur inconnue pour adapterClock : « fake » (valeurs acceptées : « system », « simulated »).",
    ],
    [
      "chaîne vide",
      "",
      "Valeur inconnue pour adapterClock : «  » (valeurs acceptées : « system », « simulated »).",
    ],
    [
      "« System » (casse différente)",
      "System",
      "Valeur inconnue pour adapterClock : « System » (valeurs acceptées : « system », « simulated »).",
    ],
  ])("refuse la valeur inconnue %s, sans repli silencieux", (_label, adapterClock, message) => {
    expect(() => createClock({ environment: "development", adapterClock })).toThrow(new Error(message));
  });

  it("refuse simulatedStart avec adapterClock « system » (configuration incohérente)", () => {
    expect(() => createClock({ environment: "development", adapterClock: "system", simulatedStart: START })).toThrow(
      new Error(
        "Configuration incohérente : simulatedStart n'est accepté qu'avec adapterClock « simulated » (horloge retenue : « system »).",
      ),
    );
  });

  it("refuse simulatedStart quand adapterClock est absent (horloge système par défaut)", () => {
    expect(() => createClock({ environment: "development", simulatedStart: START })).toThrow(
      new Error(
        "Configuration incohérente : simulatedStart n'est accepté qu'avec adapterClock « simulated » (horloge retenue : « system »).",
      ),
    );
  });

  it("refuse adapterClock « simulated » sans simulatedStart (configuration incomplète)", () => {
    expect(() => createClock({ environment: "development", adapterClock: "simulated" })).toThrow(
      new Error("Configuration incomplète : adapterClock « simulated » exige simulatedStart."),
    );
  });

  it("refuse adapterClock « simulated » en environnement « production » (composant simulé refusé)", () => {
    expect(() => createClock({ environment: "production", adapterClock: "simulated", simulatedStart: START })).toThrow(
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
  ])("refuse adapterClock « simulated » pour l'environnement incorrect %s", (_label, environment) => {
    expect(() =>
      createClock({
        environment: environment as unknown as AppEnvironment,
        adapterClock: "simulated",
        simulatedStart: START,
      }),
    ).toThrow(new Error(REFUSED_MESSAGE));
  });

  it.each([
    ["« development »", "development"],
    ["« staging »", "staging"],
  ] as const)("adapterClock « simulated » en environnement %s : horloge simulée réglée sur cet instant", (_label, environment) => {
    const clock = createClock({ environment, adapterClock: "simulated", simulatedStart: START });
    expect(clock).toBeInstanceOf(SimulatedClock);
    expect(clock.now()).toBe(START);
  });

  it("refuse adapterClock « simulated » sans simulatedStart en « production » : la garde passe avant le contrôle de simulatedStart", () => {
    expect(() => createClock({ environment: "production", adapterClock: "simulated" })).toThrow(
      new Error(REFUSED_MESSAGE),
    );
  });

  it("adapterClock « system » en environnement « production » : horloge système", () => {
    expect(createClock({ environment: "production", adapterClock: "system" })).toBeInstanceOf(SystemClock);
  });

  it("adapterClock absent en environnement « production » : horloge système par défaut", () => {
    expect(createClock({ environment: "production" })).toBeInstanceOf(SystemClock);
  });

  it("refuse la valeur inconnue « real » en environnement « production », sans repli silencieux", () => {
    expect(() => createClock({ environment: "production", adapterClock: "real" })).toThrow(
      new Error("Valeur inconnue pour adapterClock : « real » (valeurs acceptées : « system », « simulated »)."),
    );
  });
});
