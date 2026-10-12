// Adaptateur simulé du contrat P1 Clock : horloge réglable que l'on avance à volonté,
// pour vérifier en quelques secondes des règles qui durent des semaines.

import type { Clock } from "../../domain/time/clock.js";
import type { Instant } from "../../domain/time/instant.js";
import { dayInParis, instantFromParisLocal, localTimeInParis } from "../../domain/time/paris-time-zone.js";

export class SimulatedClock implements Clock {
  private current: Instant;

  constructor(start: Instant) {
    this.current = start;
  }

  now(): Instant {
    return this.current;
  }

  // Avance de N jours calendaires en conservant l'heure locale de Paris, y compris à travers
  // un changement d'heure (la durée écoulée n'est alors pas exactement N × 24 heures).
  // Le temps ne recule pas : N doit être un entier positif ou nul.
  //
  // Dérive possible : l'état conservé est l'instant, pas l'heure locale de référence. Si l'heure
  // d'arrivée n'existe pas (entre 2 h et 3 h le dernier dimanche de mars), elle est décalée d'une
  // heure vers l'avant (2 h 30 devient 3 h 30) et les avances suivantes conservent 3 h 30.
  // De même, partir de la seconde occurrence d'une heure ambiguë (fin octobre) et y revenir
  // donne la première occurrence. Le jour, lui, est toujours exact.
  //
  // Avancer de 0 jour ne fait rien. Recalculer l'instant ferait reculer l'horloge d'une heure
  // si elle est sur la seconde occurrence d'une heure ambiguë (2025-10-26T01:30:00Z, soit 2 h 30
  // à l'heure d'hiver, retomberait sur 2025-10-26T00:30:00Z). Pour N ≥ 1, aucun recul n'est
  // possible : le jour d'arrivée est au moins le lendemain.
  advanceDays(days: number): void {
    if (!Number.isInteger(days) || days < 0) {
      throw new RangeError(`Nombre de jours invalide : ${days} (attendu : entier positif ou nul).`);
    }
    if (days === 0) {
      return;
    }
    const targetDay = dayInParis(this.current).addDays(days);
    this.current = instantFromParisLocal(targetDay, localTimeInParis(this.current));
  }
}
