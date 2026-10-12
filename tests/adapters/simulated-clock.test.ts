// Tests de l'horloge simulée (adaptateur simulé du contrat P1 Clock).
import { describe, expect, it } from "vitest";
import { SimulatedClock } from "../../src/adapters/clock/simulated-clock.js";
import { currentDay } from "../../src/domain/time/clock.js";
import { Day } from "../../src/domain/time/day.js";
import { Instant } from "../../src/domain/time/instant.js";
import { instantFromParisLocal, localTimeInParis } from "../../src/domain/time/paris-time-zone.js";
import { describeClockContract } from "./clock-contract.js";

function utc(year: number, month: number, day: number, hour = 0, minute = 0): Instant {
  return Instant.fromEpochMilliseconds(Date.UTC(year, month - 1, day, hour, minute));
}

function paris(year: number, month: number, day: number, hour: number, minute: number): Instant {
  return instantFromParisLocal(Day.of(year, month, day), { hour, minute, second: 0, millisecond: 0 });
}

describeClockContract("horloge simulée", () => new SimulatedClock(utc(2025, 10, 1, 8, 0)));

describe("SimulatedClock", () => {
  it("US-01, critère 1 : mercredi 1er octobre 2025 + 14 jours calendaires = mercredi 15 octobre 2025", () => {
    const clock = new SimulatedClock(paris(2025, 10, 1, 9, 0));
    clock.advanceDays(14);
    expect(currentDay(clock).toString()).toBe("2025-10-15");
  });

  it("15 octobre 2025 à 0 h 30 + 14 jours = 29 octobre 2025 à 0 h 30 (passage à l'heure d'hiver du 26 octobre)", () => {
    const clock = new SimulatedClock(utc(2025, 10, 14, 22, 30));
    clock.advanceDays(14);
    expect(clock.now()).toEqual(utc(2025, 10, 28, 23, 30));
    expect(currentDay(clock).toString()).toBe("2025-10-29");
    expect(localTimeInParis(clock.now())).toEqual({ hour: 0, minute: 30, second: 0, millisecond: 0 });
    // 14 jours et 1 heure se sont écoulés.
    expect(clock.now().epochMilliseconds - utc(2025, 10, 14, 22, 30).epochMilliseconds).toBe(
      14 * 86_400_000 + 3_600_000,
    );
  });

  it("conserve l'heure locale à travers le passage à l'heure d'été (mars 2026)", () => {
    const clock = new SimulatedClock(paris(2026, 3, 25, 9, 15));
    clock.advanceDays(7);
    expect(clock.now()).toEqual(paris(2026, 4, 1, 9, 15));
    expect(clock.now()).toEqual(utc(2026, 4, 1, 7, 15));
  });

  it("arrivée sur une heure inexistante : 2 h 30 devient 3 h 30, puis la dérive est conservée", () => {
    const clock = new SimulatedClock(paris(2025, 3, 29, 2, 30));
    clock.advanceDays(1);
    expect(currentDay(clock).toString()).toBe("2025-03-30");
    expect(localTimeInParis(clock.now())).toMatchObject({ hour: 3, minute: 30 });
    clock.advanceDays(1);
    expect(currentDay(clock).toString()).toBe("2025-03-31");
    expect(localTimeInParis(clock.now())).toMatchObject({ hour: 3, minute: 30 });
  });

  it("arrivée sur une heure ambiguë : première occurrence (heure d'été)", () => {
    const clock = new SimulatedClock(paris(2025, 10, 25, 2, 30));
    clock.advanceDays(1);
    expect(clock.now()).toEqual(utc(2025, 10, 26, 0, 30));
  });

  it("depuis la seconde occurrence d'une heure ambiguë, l'heure locale est conservée", () => {
    const clock = new SimulatedClock(utc(2025, 10, 26, 1, 30));
    clock.advanceDays(1);
    expect(clock.now()).toEqual(paris(2025, 10, 27, 2, 30));
  });

  it("now() est stable tant qu'on n'avance pas", () => {
    const start = utc(2025, 10, 1, 8, 0);
    const clock = new SimulatedClock(start);
    expect(clock.now()).toBe(start);
    expect(clock.now()).toBe(start);
  });

  it("advanceDays(0) ne change rien", () => {
    const start = utc(2025, 10, 1, 8, 0);
    const clock = new SimulatedClock(start);
    clock.advanceDays(0);
    expect(clock.now()).toEqual(start);
  });

  it("advanceDays(0) ne fait pas reculer l'horloge depuis la seconde occurrence d'une heure ambiguë", () => {
    // 2025-10-26T01:30:00Z = 2 h 30 à Paris, heure d'hiver (seconde occurrence de 2 h 30).
    const start = utc(2025, 10, 26, 1, 30);
    const clock = new SimulatedClock(start);
    clock.advanceDays(0);
    expect(clock.now()).toEqual(utc(2025, 10, 26, 1, 30));
  });

  it.each([
    ["négatif", -1],
    ["non entier", 1.5],
    ["NaN", Number.NaN],
  ])("refuse un nombre de jours %s, sans modifier l'horloge", (_label, days) => {
    const start = utc(2025, 10, 1, 8, 0);
    const clock = new SimulatedClock(start);
    expect(() => clock.advanceDays(days)).toThrow(RangeError);
    expect(clock.now()).toBe(start);
  });
});
