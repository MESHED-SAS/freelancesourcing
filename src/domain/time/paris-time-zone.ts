// Fuseau Europe/Paris : seul module du projet qui connaît le fuseau horaire.
// Il convertit un instant en jour et heure locale de Paris, et inversement.
// Les règles du fuseau (heure d'été, heure d'hiver) viennent des données ICU du
// moteur JavaScript (Intl, norme ECMA-402) : les résultats dépendent donc de la
// version de Node utilisée. Aucun appel à Date : Intl accepte directement des millisecondes.

import { Day } from "./day.js";
import { Instant } from "./instant.js";

const PARIS_TIME_ZONE = "Europe/Paris";
const MILLISECONDS_PER_DAY = 86_400_000;

// Heure locale (sans jour ni fuseau).
export interface LocalTime {
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly millisecond: number;
}

// hourCycle "h23" : minuit s'affiche 0 (et non 24, comme avec hour12: false sur certains moteurs).
const parisFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PARIS_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

interface ParisFields {
  readonly day: Day;
  readonly time: LocalTime;
}

function parisFields(epochMilliseconds: number): ParisFields {
  const values: Partial<Record<Intl.DateTimeFormatPartTypes, number>> = {};
  for (const part of parisFormatter.formatToParts(epochMilliseconds)) {
    if (part.type !== "literal") {
      values[part.type] = Number(part.value);
    }
  }
  const field = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = values[type];
    if (value === undefined || !Number.isInteger(value)) {
      throw new Error(`Champ « ${type} » absent ou invalide dans la conversion vers ${PARIS_TIME_ZONE}.`);
    }
    return value;
  };
  return {
    day: Day.of(field("year"), field("month"), field("day")),
    time: {
      hour: field("hour"),
      minute: field("minute"),
      second: field("second"),
      // Intl ne donne pas les millisecondes ; les décalages du fuseau étant des secondes entières,
      // elles sont identiques en UTC et à Paris.
      millisecond: ((epochMilliseconds % 1000) + 1000) % 1000,
    },
  };
}

// Jour et heure locale exprimés en millisecondes « comme si c'était l'UTC ».
function wallClockMilliseconds(day: Day, time: LocalTime): number {
  return (
    day.toEpochDay() * MILLISECONDS_PER_DAY +
    time.hour * 3_600_000 +
    time.minute * 60_000 +
    time.second * 1_000 +
    time.millisecond
  );
}

// Décalage de Paris par rapport à l'UTC à un instant donné, en millisecondes (+1 h ou +2 h aujourd'hui).
function parisOffset(epochMilliseconds: number): number {
  const { day, time } = parisFields(epochMilliseconds);
  return wallClockMilliseconds(day, time) - epochMilliseconds;
}

function assertValidLocalTime(time: LocalTime): void {
  const checks: [name: string, value: number, max: number][] = [
    ["heure", time.hour, 23],
    ["minute", time.minute, 59],
    ["seconde", time.second, 59],
    ["milliseconde", time.millisecond, 999],
  ];
  for (const [name, value, max] of checks) {
    if (!Number.isInteger(value) || value < 0 || value > max) {
      throw new RangeError(`Heure locale invalide : ${name} = ${value} (attendu : entier de 0 à ${max}).`);
    }
  }
}

// Jour de Paris correspondant à un instant. Seul point de conversion d'un instant en jour.
export function dayInParis(instant: Instant): Day {
  return parisFields(instant.epochMilliseconds).day;
}

// Heure locale de Paris correspondant à un instant.
export function localTimeInParis(instant: Instant): LocalTime {
  return Object.freeze({ ...parisFields(instant.epochMilliseconds).time });
}

// Instant correspondant à un jour et une heure locale de Paris.
// Lors des changements d'heure, on applique la règle « compatible » (Temporal, RFC 5545) :
// - heure ambiguë (dernier dimanche d'octobre, 02:00 à 02:59 existent deux fois) :
//   on retient la première occurrence, encore à l'heure d'été (+02:00) ;
// - heure inexistante (dernier dimanche de mars, 02:00 à 02:59 n'existent pas) :
//   on décale vers l'avant de la durée du saut (02:30 devient 03:30, +02:00).
// Hypothèse : au plus un changement d'heure dans les 24 heures autour de l'heure demandée,
// ce qui est vrai pour Europe/Paris.
export function instantFromParisLocal(day: Day, time: LocalTime): Instant {
  assertValidLocalTime(time);
  const wallClock = wallClockMilliseconds(day, time);
  const offsetBefore = parisOffset(wallClock - MILLISECONDS_PER_DAY);
  const offsetAfter = parisOffset(wallClock + MILLISECONDS_PER_DAY);

  // Candidats : les instants qui, reconvertis, redonnent exactement l'heure locale demandée.
  const candidates = [wallClock - offsetBefore, wallClock - offsetAfter]
    .filter((candidate) => candidate + parisOffset(candidate) === wallClock)
    .sort((a, b) => a - b);

  const [earliest] = candidates;
  if (earliest !== undefined) {
    // Un candidat : cas normal. Deux candidats : heure ambiguë, on retient le premier.
    return Instant.fromEpochMilliseconds(earliest);
  }
  // Aucun candidat : heure inexistante. Le décalage d'avant le saut place l'instant
  // après le saut, à l'heure demandée augmentée de la durée du saut.
  return Instant.fromEpochMilliseconds(wallClock - offsetBefore);
}
