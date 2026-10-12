// Tests de la racine de composition, P1 Clock (US-01, incrément 3) : choix de l'horloge selon la configuration.
// Les messages d'erreur attendus sont écrits en dur.
import { describe, expect, it } from "vitest";
import { SimulatedClock } from "../../src/adapters/clock/simulated-clock.js";
import { SystemClock } from "../../src/adapters/clock/system-clock.js";
import { createClock } from "../../src/composition/index.js";
import { Instant } from "../../src/domain/time/instant.js";

// 1er octobre 2025, 8 h UTC (10 h à Paris).
const START = Instant.fromEpochMilliseconds(Date.UTC(2025, 9, 1, 8, 0));

describe("createClock", () => {
  it("adapterClock absent : horloge système par défaut", () => {
    expect(createClock({})).toBeInstanceOf(SystemClock);
  });

  it("adapterClock undefined : horloge système par défaut", () => {
    expect(createClock({ adapterClock: undefined })).toBeInstanceOf(SystemClock);
  });

  it("adapterClock « system » : horloge système", () => {
    expect(createClock({ adapterClock: "system" })).toBeInstanceOf(SystemClock);
  });

  it("adapterClock « simulated » avec simulatedStart : horloge simulée réglée sur cet instant", () => {
    const clock = createClock({ adapterClock: "simulated", simulatedStart: START });
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
    expect(() => createClock({ adapterClock })).toThrow(new Error(message));
  });

  it("refuse simulatedStart avec adapterClock « system » (configuration incohérente)", () => {
    expect(() => createClock({ adapterClock: "system", simulatedStart: START })).toThrow(
      new Error(
        "Configuration incohérente : simulatedStart n'est accepté qu'avec adapterClock « simulated » (horloge retenue : « system »).",
      ),
    );
  });

  it("refuse simulatedStart quand adapterClock est absent (horloge système par défaut)", () => {
    expect(() => createClock({ simulatedStart: START })).toThrow(
      new Error(
        "Configuration incohérente : simulatedStart n'est accepté qu'avec adapterClock « simulated » (horloge retenue : « system »).",
      ),
    );
  });

  it("refuse adapterClock « simulated » sans simulatedStart (configuration incomplète)", () => {
    expect(() => createClock({ adapterClock: "simulated" })).toThrow(
      new Error("Configuration incomplète : adapterClock « simulated » exige simulatedStart."),
    );
  });
});
