// Contrat P1 Clock : donne l'instant courant. Le domaine n'appelle jamais l'horloge système ;
// il reçoit une horloge (simulée ou système, voir src/adapters/clock/).

import type { Day } from "./day.js";
import type { Instant } from "./instant.js";
import { dayInParis } from "./paris-time-zone.js";

export interface Clock {
  now(): Instant;
}

// Jour courant, au sens du fuseau Europe/Paris.
export function currentDay(clock: Clock): Day {
  return dayInParis(clock.now());
}
