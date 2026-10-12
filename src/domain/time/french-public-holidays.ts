// Jours fériés nationaux français (11 jours, hors jours propres à l'Alsace-Moselle).
// La liste est calculée pour chaque année par règle : dates fixes, et fêtes mobiles
// déduites de Pâques. Aucune date n'est écrite en dur pour une année donnée.
// La règle actuelle est appliquée à toute année à partir de 1583, même aux années où
// certains de ces jours n'étaient pas encore fériés (8 mai, 11 novembre, 14 juillet…).

import { Day } from "./day.js";

// Première année du calendrier grégorien complète (adopté en octobre 1582) :
// le calcul de Pâques ci-dessous n'est pas valable avant.
const FIRST_GREGORIAN_YEAR = 1583;

export type FrenchPublicHolidayName =
  | "newYearsDay"
  | "easterMonday"
  | "labourDay"
  | "victoryInEurope1945"
  | "ascensionDay"
  | "whitMonday"
  | "bastilleDay"
  | "assumptionDay"
  | "allSaintsDay"
  | "armisticeDay"
  | "christmasDay";

export interface FrenchPublicHoliday {
  readonly name: FrenchPublicHolidayName;
  readonly day: Day;
}

function assertSupportedYear(year: number): void {
  if (!Number.isInteger(year) || year < FIRST_GREGORIAN_YEAR) {
    throw new RangeError(
      `Année invalide pour les jours fériés : ${year} (attendu : entier à partir de ${FIRST_GREGORIAN_YEAR}).`,
    );
  }
}

// Dimanche de Pâques (calendrier grégorien), par l'algorithme dit « anonyme »
// (Meeus, Jones, Butcher). Source : Jean Meeus, Astronomical Algorithms, 2e édition,
// Willmann-Bell, 1998, chapitre 8 « Date of Easter ». Valable sans exception à partir de 1583.
export function easterSunday(year: number): Day {
  assertSupportedYear(year);
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return Day.of(year, month, day);
}

// Les 11 jours fériés de l'année, triés par date. Toujours 11 entrées : si deux fêtes
// tombent le même jour (l'Ascension un 1er mai, par exemple), les deux sont gardées.
export function frenchPublicHolidays(year: number): readonly FrenchPublicHoliday[] {
  const easter = easterSunday(year);
  const holidays: FrenchPublicHoliday[] = [
    { name: "newYearsDay", day: Day.of(year, 1, 1) },
    { name: "easterMonday", day: easter.addDays(1) },
    { name: "labourDay", day: Day.of(year, 5, 1) },
    { name: "victoryInEurope1945", day: Day.of(year, 5, 8) },
    { name: "ascensionDay", day: easter.addDays(39) },
    { name: "whitMonday", day: easter.addDays(50) },
    { name: "bastilleDay", day: Day.of(year, 7, 14) },
    { name: "assumptionDay", day: Day.of(year, 8, 15) },
    { name: "allSaintsDay", day: Day.of(year, 11, 1) },
    { name: "armisticeDay", day: Day.of(year, 11, 11) },
    { name: "christmasDay", day: Day.of(year, 12, 25) },
  ];
  // Tri stable : en cas d'égalité, l'ordre ci-dessus est conservé (fête du Travail avant Ascension).
  holidays.sort((first, second) => first.day.compare(second.day));
  return Object.freeze(holidays.map((holiday) => Object.freeze(holiday)));
}
