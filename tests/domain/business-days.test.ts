// Tests des jours ouvrés (US-01, critères 2 et 3) et des exemples Alpha Conseil
// (../meshed-docs/cadrage/regles-missions-candidatures.md, section 4).
// Les échéances attendues sont écrites en dur, comptées à la main sur le calendrier : jamais calculées par le code testé.
import { describe, expect, it } from "vitest";
import { addBusinessDays, isBusinessDay } from "../../src/domain/time/business-days.js";
import { Day } from "../../src/domain/time/day.js";

// Horloge monotone du moteur, utilisée seulement pour mesurer une durée (pas de Date).
// Le projet ne charge pas les types de Node (lib es2024 seule) : on déclare ce qu'on utilise.
declare const performance: { now(): number };

describe("isBusinessDay", () => {
  it.each([
    ["mardi ordinaire", Day.of(2025, 10, 14), true],
    ["vendredi ordinaire", Day.of(2025, 10, 31), true],
    ["samedi", Day.of(2025, 10, 4), false],
    ["dimanche", Day.of(2025, 10, 5), false],
    ["mardi 11 novembre (férié fixe)", Day.of(2025, 11, 11), false],
    ["jeudi de l'Ascension 2026 (férié mobile)", Day.of(2026, 5, 14), false],
    ["samedi 1er novembre (samedi et férié)", Day.of(2025, 11, 1), false],
  ])("%s : %s", (_label, day, expected) => {
    expect(isBusinessDay(day)).toBe(expected);
  });
});

describe("addBusinessDays : critères d'acceptation de l'US-01", () => {
  it("vendredi 2025-10-31 + 10 jours ouvrés = lundi 2025-11-17, le 11 novembre sauté (critère 2)", () => {
    expect(addBusinessDays(Day.of(2025, 10, 31), 10).toString()).toBe("2025-11-17");
  });

  it("samedi 2025-11-01 (samedi et férié) + 1 jour ouvré = lundi 2025-11-03 (critère 3)", () => {
    expect(addBusinessDays(Day.of(2025, 11, 1), 1).toString()).toBe("2025-11-03");
  });
});

describe("addBusinessDays : convention de décompte", () => {
  it.each([
    ["départ un jour ouvré (vendredi) : le jour de départ n'est pas compté", Day.of(2025, 10, 3), 1, "2025-10-06"],
    ["départ un dimanche", Day.of(2025, 11, 2), 1, "2025-11-03"],
    ["départ un jour férié en semaine (mardi 11 novembre)", Day.of(2025, 11, 11), 1, "2025-11-12"],
    ["passage d'année : le 1er janvier 2026 (jeudi, férié) est sauté", Day.of(2025, 12, 31), 1, "2026-01-02"],
    ["passage d'année puis lundi de Pâques 2026 (férié mobile) : 1er janvier et 6 avril sautés", Day.of(2025, 12, 31), 67, "2026-04-07"],
  ])("%s", (_label, start, count, expected) => {
    expect(addBusinessDays(start, count).toString()).toBe(expected);
  });

  it("ne modifie pas le jour de départ", () => {
    const start = Day.of(2025, 10, 31);
    addBusinessDays(start, 10);
    expect(start.toString()).toBe("2025-10-31");
  });
});

describe("addBusinessDays : exemples Alpha Conseil (2025)", () => {
  it.each([
    ["exemple 4 : candidature du mercredi 1er octobre, réponse sous 10 jours ouvrés", Day.of(2025, 10, 1), 10, "2025-10-15"],
    ["exemple 4 : candidature du lundi 6 octobre, réponse sous 10 jours ouvrés", Day.of(2025, 10, 6), 10, "2025-10-20"],
    ["exemple 6 : publication le 1er octobre, confirmation à 10 jours ouvrés", Day.of(2025, 10, 1), 10, "2025-10-15"],
    ["exemple 6 : nouvelle demande 10 jours ouvrés après la confirmation du 15 octobre", Day.of(2025, 10, 15), 10, "2025-10-29"],
    ["exemple 6 : pause à 15 jours ouvrés", Day.of(2025, 10, 15), 15, "2025-11-05"],
    ["exemple 6 : clôture à 20 jours ouvrés, le 11 novembre ne compte pas", Day.of(2025, 10, 15), 20, "2025-11-13"],
    ["exemple 6 : durée de vie maximale de 40 jours ouvrés", Day.of(2025, 10, 1), 40, "2025-11-27"],
    ["exemple 7 : proposition d'entretien du vendredi 10 octobre, réponse sous 3 jours ouvrés", Day.of(2025, 10, 10), 3, "2025-10-15"],
  ])("%s", (_label, start, count, expected) => {
    expect(addBusinessDays(start, count).toString()).toBe(expected);
  });
});

describe("addBusinessDays : refus", () => {
  it.each([
    ["zéro", 0],
    ["négatif", -1],
    ["non entier", 1.5],
    ["NaN", Number.NaN],
  ])("refuse un nombre de jours ouvrés %s", (_label, count) => {
    expect(() => addBusinessDays(Day.of(2025, 10, 1), count)).toThrow(RangeError);
  });

  it("refuse un départ en 1582 (jours fériés non calculables avant 1583)", () => {
    expect(() => addBusinessDays(Day.of(1582, 12, 31), 1)).toThrow(RangeError);
  });

  it.each([
    ["9999-12-31 + 1", Day.of(9999, 12, 31), 1],
    ["9999-12-30 + 3", Day.of(9999, 12, 30), 3],
  ])("refuse de dépasser le 9999-12-31, et vite (moins d'une seconde) : %s", (_label, start, count) => {
    const startedAt = performance.now();
    expect(() => addBusinessDays(start, count)).toThrow(RangeError);
    expect(performance.now() - startedAt).toBeLessThan(1000);
  });
});
