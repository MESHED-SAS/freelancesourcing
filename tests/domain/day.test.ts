// Tests du type Day (jour du calendrier, sans heure ni fuseau).
import { describe, expect, it } from "vitest";
import { Day } from "../../src/domain/time/day.js";

describe("Day : ajout de jours calendaires", () => {
  it("1er octobre 2025 + 14 jours = 15 octobre 2025 (US-01, critère 1)", () => {
    expect(Day.of(2025, 10, 1).addDays(14).toString()).toBe("2025-10-15");
  });

  it.each([
    ["changement de mois", Day.of(2025, 10, 25), 7, "2025-11-01"],
    ["changement d'année", Day.of(2025, 12, 25), 7, "2026-01-01"],
    ["29 février d'une année bissextile", Day.of(2024, 2, 28), 1, "2024-02-29"],
    ["pas de 29 février en 2025", Day.of(2025, 2, 28), 1, "2025-03-01"],
    ["29 février 2000 (bissextile séculaire)", Day.of(2000, 2, 28), 1, "2000-02-29"],
    ["recul d'un jour", Day.of(2026, 1, 1), -1, "2025-12-31"],
    ["zéro jour", Day.of(2025, 10, 1), 0, "2025-10-01"],
    ["un an complet", Day.of(2025, 10, 1), 365, "2026-10-01"],
  ])("%s", (_label, start, days, expected) => {
    expect(start.addDays(days).toString()).toBe(expected);
  });

  it("refuse un nombre de jours non entier", () => {
    expect(() => Day.of(2025, 10, 1).addDays(1.5)).toThrow(RangeError);
    expect(() => Day.of(2025, 10, 1).addDays(Number.NaN)).toThrow(RangeError);
  });

  it("refuse de sortir de la plage des années 1 à 9999", () => {
    expect(() => Day.of(9999, 12, 31).addDays(1)).toThrow(RangeError);
    expect(() => Day.of(1, 1, 1).addDays(-1)).toThrow(RangeError);
  });
});

describe("Day : création et validation", () => {
  it.each([
    ["29 février d'une année non bissextile", 2025, 2, 29],
    ["29 février 1900 (séculaire non bissextile)", 1900, 2, 29],
    ["31 avril", 2025, 4, 31],
    ["mois 13", 2025, 13, 1],
    ["mois 0", 2025, 0, 10],
    ["jour 0", 2025, 10, 0],
    ["jour 32", 2025, 1, 32],
    ["année 0", 0, 1, 1],
    ["année 10000", 10000, 1, 1],
    ["année non entière", 2025.5, 1, 1],
    ["mois non entier", 2025, 1.5, 1],
    ["jour NaN", 2025, 1, Number.NaN],
  ])("refuse une date impossible : %s", (_label, year, month, day) => {
    expect(() => Day.of(year, month, day)).toThrow(RangeError);
  });

  it("accepte le 29 février d'une année bissextile", () => {
    expect(Day.of(2024, 2, 29).toString()).toBe("2024-02-29");
    expect(Day.of(2000, 2, 29).toString()).toBe("2000-02-29");
  });

  it("accepte les bornes de la plage", () => {
    expect(Day.of(1, 1, 1).toString()).toBe("0001-01-01");
    expect(Day.of(9999, 12, 31).toString()).toBe("9999-12-31");
  });

  it("expose l'année, le mois et le jour", () => {
    const day = Day.of(2025, 10, 15);
    expect([day.year, day.month, day.day]).toEqual([2025, 10, 15]);
  });

  it("est immuable", () => {
    const day = Day.of(2025, 10, 15);
    expect(Object.isFrozen(day)).toBe(true);
    expect(() => {
      (day as { year: number }).year = 2030;
    }).toThrow(TypeError);
    expect(day.toString()).toBe("2025-10-15");
  });

  it("addDays renvoie un nouveau jour sans modifier l'original", () => {
    const start = Day.of(2025, 10, 1);
    start.addDays(14);
    expect(start.toString()).toBe("2025-10-01");
  });
});

describe("Day : comparaison", () => {
  const first = Day.of(2025, 10, 1);
  const second = Day.of(2025, 10, 15);

  it("compare", () => {
    expect(first.compare(second)).toBe(-1);
    expect(second.compare(first)).toBe(1);
    expect(first.compare(Day.of(2025, 10, 1))).toBe(0);
  });

  it("equals", () => {
    expect(first.equals(Day.of(2025, 10, 1))).toBe(true);
    expect(first.equals(second)).toBe(false);
  });

  it("isBefore et isAfter", () => {
    expect(first.isBefore(second)).toBe(true);
    expect(first.isAfter(second)).toBe(false);
    expect(second.isAfter(first)).toBe(true);
    expect(first.isBefore(first)).toBe(false);
    expect(first.isAfter(first)).toBe(false);
  });
});

describe("Day : affichage et numéro de jour", () => {
  it("complète avec des zéros (AAAA-MM-JJ)", () => {
    expect(Day.of(987, 3, 4).toString()).toBe("0987-03-04");
  });

  it.each([
    [Day.of(1970, 1, 1), 0],
    [Day.of(1970, 1, 2), 1],
    [Day.of(1969, 12, 31), -1],
    [Day.of(2000, 3, 1), 11017],
    [Day.of(2025, 10, 1), 20362],
  ])("%s a pour numéro de jour %i", (day, epochDay) => {
    expect(day.toEpochDay()).toBe(epochDay);
  });

  it("est cohérent avec Date.UTC sur chaque jour de 1999 à 2101", () => {
    const millisecondsPerDay = 86_400_000;
    let day = Day.of(1999, 1, 1);
    while (day.year <= 2101) {
      expect(day.toEpochDay() * millisecondsPerDay).toBe(Date.UTC(day.year, day.month - 1, day.day));
      day = day.addDays(1);
    }
  });
});
