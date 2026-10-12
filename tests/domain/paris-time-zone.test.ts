// Tests des conversions entre instant et jour / heure locale de Paris (fuseau Europe/Paris).
import { describe, expect, it } from "vitest";
import { Day } from "../../src/domain/time/day.js";
import { Instant } from "../../src/domain/time/instant.js";
import {
  dayInParis,
  instantFromParisLocal,
  localTimeInParis,
  type LocalTime,
} from "../../src/domain/time/paris-time-zone.js";

// Instant UTC construit à partir de ses composantes (mois de 1 à 12).
function utc(year: number, month: number, day: number, hour = 0, minute = 0, second = 0, ms = 0): Instant {
  return Instant.fromEpochMilliseconds(Date.UTC(year, month - 1, day, hour, minute, second, ms));
}

function time(hour: number, minute: number, second = 0, millisecond = 0): LocalTime {
  return { hour, minute, second, millisecond };
}

describe("dayInParis et localTimeInParis", () => {
  it("2025-10-26T23:30:00Z est le lundi 27 octobre 2025 à 0 h 30 à Paris (heure d'hiver)", () => {
    const instant = utc(2025, 10, 26, 23, 30);
    expect(dayInParis(instant).toString()).toBe("2025-10-27");
    expect(localTimeInParis(instant)).toEqual(time(0, 30));
  });

  it("2025-10-26T22:59:59.999Z est encore le 26 octobre à Paris", () => {
    const instant = utc(2025, 10, 26, 22, 59, 59, 999);
    expect(dayInParis(instant).toString()).toBe("2025-10-26");
    expect(localTimeInParis(instant)).toEqual(time(23, 59, 59, 999));
  });

  it("minuit à Paris s'affiche 0 h et non 24 h (hourCycle h23)", () => {
    const instant = utc(2025, 10, 14, 22, 0);
    expect(dayInParis(instant).toString()).toBe("2025-10-15");
    expect(localTimeInParis(instant)).toEqual(time(0, 0));
  });

  it("heure d'été : UTC + 2 h", () => {
    expect(localTimeInParis(utc(2025, 7, 14, 10, 0))).toEqual(time(12, 0));
  });

  it("heure d'hiver : UTC + 1 h", () => {
    expect(localTimeInParis(utc(2025, 1, 15, 10, 0))).toEqual(time(11, 0));
  });

  it("instant avant l'époque Unix : millisecondes correctes", () => {
    const instant = utc(1969, 12, 31, 12, 0, 0, 250);
    expect(dayInParis(instant).toString()).toBe("1969-12-31");
    expect(localTimeInParis(instant)).toEqual(time(13, 0, 0, 250));
  });

  it("l'heure locale renvoyée est immuable", () => {
    expect(Object.isFrozen(localTimeInParis(utc(2025, 10, 1)))).toBe(true);
  });
});

describe("instantFromParisLocal", () => {
  it("cas normal : 15 octobre 2025 à 0 h 30 à Paris = 2025-10-14T22:30:00Z", () => {
    expect(instantFromParisLocal(Day.of(2025, 10, 15), time(0, 30))).toEqual(utc(2025, 10, 14, 22, 30));
  });

  it("heure ambiguë : 26 octobre 2025 à 2 h 30 = première occurrence, 2025-10-26T00:30:00Z (+02:00)", () => {
    expect(instantFromParisLocal(Day.of(2025, 10, 26), time(2, 30))).toEqual(utc(2025, 10, 26, 0, 30));
  });

  it("heure inexistante : 30 mars 2025 à 2 h 30 = 2025-03-30T01:30:00Z, soit 3 h 30 à Paris", () => {
    const instant = instantFromParisLocal(Day.of(2025, 3, 30), time(2, 30));
    expect(instant).toEqual(utc(2025, 3, 30, 1, 30));
    expect(localTimeInParis(instant)).toEqual(time(3, 30));
  });

  it.each([
    ["juste avant le saut de mars", Day.of(2025, 3, 30), time(1, 59, 59, 999), utc(2025, 3, 30, 0, 59, 59, 999)],
    ["juste après le saut de mars", Day.of(2025, 3, 30), time(3, 0), utc(2025, 3, 30, 1, 0)],
    ["fin de l'heure ambiguë d'octobre", Day.of(2025, 10, 26), time(2, 59, 59, 999), utc(2025, 10, 26, 0, 59, 59, 999)],
    ["juste après l'heure ambiguë d'octobre", Day.of(2025, 10, 26), time(3, 0), utc(2025, 10, 26, 2, 0)],
  ])("bornes des changements d'heure : %s", (_label, day, localTime, expected) => {
    expect(instantFromParisLocal(day, localTime)).toEqual(expected);
  });

  it.each([
    ["heure 24", time(24, 0)],
    ["heure négative", time(-1, 0)],
    ["minute 60", time(10, 60)],
    ["seconde 60", time(10, 0, 60)],
    ["milliseconde 1000", time(10, 0, 0, 1000)],
    ["minute non entière", time(10, 1.5)],
  ])("refuse une heure locale invalide : %s", (_label, localTime) => {
    expect(() => instantFromParisLocal(Day.of(2025, 10, 15), localTime)).toThrow(RangeError);
  });

  it("aller-retour instant → (jour, heure de Paris) → instant, tous les quarts d'heure autour des changements d'heure", () => {
    const quarterHour = 15 * 60_000;
    // Seconde occurrence de l'heure ambiguë (heure d'hiver) : ramenée à la première, une heure plus tôt.
    const secondOccurrenceStart = Date.UTC(2025, 9, 26, 1, 0);
    const secondOccurrenceEnd = Date.UTC(2025, 9, 26, 2, 0);
    const ranges: [number, number][] = [
      [Date.UTC(2025, 2, 28), Date.UTC(2025, 3, 1)],
      [Date.UTC(2025, 9, 24), Date.UTC(2025, 9, 29)],
    ];
    for (const [start, end] of ranges) {
      for (let ms = start; ms < end; ms += quarterHour) {
        const instant = Instant.fromEpochMilliseconds(ms);
        const roundTrip = instantFromParisLocal(dayInParis(instant), localTimeInParis(instant));
        const expected = ms >= secondOccurrenceStart && ms < secondOccurrenceEnd ? ms - 3_600_000 : ms;
        expect(roundTrip.epochMilliseconds).toBe(expected);
      }
    }
  });
});
