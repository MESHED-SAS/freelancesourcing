// Jours ouvrés : du lundi au vendredi, hors jours fériés nationaux français.
// Convention de décompte (décidée le 24/09/2026) : le jour de l'événement n'est jamais compté ;
// le décompte commence le jour ouvré suivant, que l'événement tombe un jour ouvré,
// un samedi, un dimanche ou un jour férié. Aucun appel à Date, aucun état au niveau du module.

import type { Day } from "./day.js";
import { frenchPublicHolidays } from "./french-public-holidays.js";

// Numéros de jour des fériés d'une année (les fêtes qui coïncident ne comptent qu'une fois).
function holidayEpochDays(year: number): ReadonlySet<number> {
  return new Set(frenchPublicHolidays(year).map((holiday) => holiday.day.toEpochDay()));
}

function isOpenDay(day: Day, holidays: ReadonlySet<number>): boolean {
  return day.dayOfWeek() <= 5 && !holidays.has(day.toEpochDay());
}

// Jour ouvré : ni samedi, ni dimanche, ni férié.
export function isBusinessDay(day: Day): boolean {
  return isOpenDay(day, holidayEpochDays(day.year));
}

// Échéance à `count` jours ouvrés d'un événement survenu le jour `start` (count entier ≥ 1).
export function addBusinessDays(start: Day, count: number): Day {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError(`Nombre de jours ouvrés invalide : ${count} (attendu : entier supérieur ou égal à 1).`);
  }
  // Fériés de l'année parcourue, recalculés à chaque changement d'année : mémoire limitée à cet appel.
  let holidaysYear = start.year;
  let holidays = holidayEpochDays(start.year);
  let day = start;
  let remaining = count;
  while (remaining > 0) {
    day = day.addDays(1);
    if (day.year !== holidaysYear) {
      holidaysYear = day.year;
      holidays = holidayEpochDays(holidaysYear);
    }
    if (isOpenDay(day, holidays)) {
      remaining--;
    }
  }
  return day;
}
