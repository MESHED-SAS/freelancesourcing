// Tests du calcul de Pâques et des jours fériés nationaux français.
// Les valeurs attendues sont des dates publiées, écrites en dur : jamais calculées par le code testé.
import { describe, expect, it } from "vitest";
import { easterSunday, frenchPublicHolidays } from "../../src/domain/time/french-public-holidays.js";

// Liste affichable « nom AAAA-MM-JJ », dans l'ordre renvoyé.
function describeHolidays(year: number): string[] {
  return frenchPublicHolidays(year).map((holiday) => `${holiday.name} ${holiday.day.toString()}`);
}

describe("Pâques (calendrier grégorien)", () => {
  it.each([
    [2024, "2024-03-31"],
    [2025, "2025-04-20"],
    [2026, "2026-04-05"],
    [2027, "2027-03-28"],
    [2028, "2028-04-16"],
    [2029, "2029-04-01"],
    [2030, "2030-04-21"],
    [1818, "1818-03-22"],
    [2038, "2038-04-25"],
  ])("Pâques %i : %s", (year, expected) => {
    expect(easterSunday(year).toString()).toBe(expected);
  });
});

describe("Jours fériés : listes complètes", () => {
  it("2025 : les 11 jours fériés, nommés et triés par date", () => {
    expect(describeHolidays(2025)).toEqual([
      "newYearsDay 2025-01-01",
      "easterMonday 2025-04-21",
      "labourDay 2025-05-01",
      "victoryInEurope1945 2025-05-08",
      "ascensionDay 2025-05-29",
      "whitMonday 2025-06-09",
      "bastilleDay 2025-07-14",
      "assumptionDay 2025-08-15",
      "allSaintsDay 2025-11-01",
      "armisticeDay 2025-11-11",
      "christmasDay 2025-12-25",
    ]);
  });

  it("2026 : 11 dates, lundi de Pâques, Ascension et lundi de Pentecôte (US-01, critère 4)", () => {
    const holidays = frenchPublicHolidays(2026);
    expect(holidays).toHaveLength(11);
    const dayOf = (name: string): string | undefined =>
      holidays.find((holiday) => holiday.name === name)?.day.toString();
    expect(dayOf("easterMonday")).toBe("2026-04-06");
    expect(dayOf("ascensionDay")).toBe("2026-05-14");
    expect(dayOf("whitMonday")).toBe("2026-05-25");
  });

  it("2008 : Ascension le même jour que la fête du Travail, les deux sont gardées", () => {
    expect(easterSunday(2008).toString()).toBe("2008-03-23");
    expect(describeHolidays(2008)).toEqual([
      "newYearsDay 2008-01-01",
      "easterMonday 2008-03-24",
      "labourDay 2008-05-01",
      "ascensionDay 2008-05-01",
      "victoryInEurope1945 2008-05-08",
      "whitMonday 2008-05-12",
      "bastilleDay 2008-07-14",
      "assumptionDay 2008-08-15",
      "allSaintsDay 2008-11-01",
      "armisticeDay 2008-11-11",
      "christmasDay 2008-12-25",
    ]);
  });
});

describe("Jours fériés : forme du résultat", () => {
  it.each([1818, 2008, 2025, 2026, 2038])("%i : 11 entrées triées par date", (year) => {
    const holidays = frenchPublicHolidays(year);
    expect(holidays).toHaveLength(11);
    for (let index = 1; index < holidays.length; index++) {
      expect(holidays[index - 1]!.day.isAfter(holidays[index]!.day)).toBe(false);
    }
  });

  it("le tableau et ses entrées sont gelés", () => {
    const holidays = frenchPublicHolidays(2025);
    expect(Object.isFrozen(holidays)).toBe(true);
    expect(holidays.every((holiday) => Object.isFrozen(holiday))).toBe(true);
    expect(() => {
      (holidays as unknown as unknown[]).push("intrus");
    }).toThrow(TypeError);
  });
});

describe("Jours fériés : années refusées", () => {
  it.each([
    ["1582 (avant le calendrier grégorien complet)", 1582],
    ["année non entière", 2025.5],
    ["NaN", Number.NaN],
  ])("refuse %s", (_label, year) => {
    expect(() => easterSunday(year)).toThrow(RangeError);
    expect(() => frenchPublicHolidays(year)).toThrow(RangeError);
  });
});
