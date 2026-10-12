// Adaptateur réel du contrat P1 Clock : lit l'heure du système.
// Seul endroit de src/ autorisé à appeler Date.now() (voir CLAUDE.md §2).

import type { Clock } from "../../domain/time/clock.js";
import { Instant } from "../../domain/time/instant.js";

export class SystemClock implements Clock {
  now(): Instant {
    return Instant.fromEpochMilliseconds(Date.now());
  }
}
