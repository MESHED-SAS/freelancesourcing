// Jour du calendrier grégorien (année, mois, jour), sans heure ni fuseau horaire.
// Immuable. Les échéances et les jours ouvrés ne manipulent que ce type.
// Les calculs passent par un numéro de jour (nombre de jours depuis le 1970-01-01),
// selon l'algorithme « days from civil » de Howard Hinnant : aucun appel à Date.

const MIN_YEAR = 1;
const MAX_YEAR = 9999;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

// Numéro de jour (jours depuis le 1970-01-01) d'une date valide.
function epochDayFromCivil(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yearOfEra = y - era * 400;
  const dayOfYear = Math.floor((153 * (month > 2 ? month - 3 : month + 9) + 2) / 5) + day - 1;
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

// Opération inverse : date (année, mois, jour) d'un numéro de jour.
function civilFromEpochDay(epochDay: number): [year: number, month: number, day: number] {
  const z = epochDay + 719468;
  const era = Math.floor(z / 146097);
  const dayOfEra = z - era * 146097;
  const yearOfEra = Math.floor(
    (dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36524) - Math.floor(dayOfEra / 146096)) / 365,
  );
  const dayOfYear = dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const shiftedMonth = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * shiftedMonth + 2) / 5) + 1;
  const month = shiftedMonth < 10 ? shiftedMonth + 3 : shiftedMonth - 9;
  return [yearOfEra + era * 400 + (month <= 2 ? 1 : 0), month, day];
}

export class Day {
  private readonly epochDay: number;

  private constructor(
    readonly year: number,
    readonly month: number,
    readonly day: number,
  ) {
    this.epochDay = epochDayFromCivil(year, month, day);
    Object.freeze(this);
  }

  // Crée un jour ; refuse toute date impossible (31 avril, 29 février d'une année non bissextile…).
  static of(year: number, month: number, day: number): Day {
    if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
      throw new RangeError(`Année invalide : ${year} (attendu : entier de ${MIN_YEAR} à ${MAX_YEAR}).`);
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new RangeError(`Mois invalide : ${month} (attendu : entier de 1 à 12).`);
    }
    if (!Number.isInteger(day) || day < 1 || day > daysInMonth(year, month)) {
      throw new RangeError(`Jour invalide : ${year}-${month}-${day} n'existe pas.`);
    }
    return new Day(year, month, day);
  }

  // Ajoute un nombre entier de jours calendaires (négatif pour reculer).
  addDays(days: number): Day {
    if (!Number.isInteger(days)) {
      throw new RangeError(`Nombre de jours invalide : ${days} (attendu : entier).`);
    }
    const [year, month, day] = civilFromEpochDay(this.epochDay + days);
    if (year < MIN_YEAR || year > MAX_YEAR) {
      throw new RangeError(`Résultat hors de la plage des années ${MIN_YEAR} à ${MAX_YEAR}.`);
    }
    return new Day(year, month, day);
  }

  // Numéro du jour : nombre de jours depuis le 1970-01-01 (négatif avant).
  toEpochDay(): number {
    return this.epochDay;
  }

  compare(other: Day): -1 | 0 | 1 {
    return Math.sign(this.epochDay - other.epochDay) as -1 | 0 | 1;
  }

  equals(other: Day): boolean {
    return this.epochDay === other.epochDay;
  }

  isBefore(other: Day): boolean {
    return this.epochDay < other.epochDay;
  }

  isAfter(other: Day): boolean {
    return this.epochDay > other.epochDay;
  }

  // Affichage AAAA-MM-JJ.
  toString(): string {
    const pad = (value: number, length: number): string => String(value).padStart(length, "0");
    return `${pad(this.year, 4)}-${pad(this.month, 2)}-${pad(this.day, 2)}`;
  }
}
