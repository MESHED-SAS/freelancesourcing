// Instant absolu, indépendant de tout fuseau : nombre de millisecondes depuis le
// 1970-01-01T00:00:00Z (époque Unix). Immuable. Fourni par le contrat Clock (P1).

// Plage des instants représentables en JavaScript (± 100 000 000 jours autour de l'époque).
const MAX_EPOCH_MILLISECONDS = 8.64e15;

export class Instant {
  private constructor(readonly epochMilliseconds: number) {
    Object.freeze(this);
  }

  // Crée un instant ; refuse une valeur non entière ou hors de la plage représentable.
  static fromEpochMilliseconds(epochMilliseconds: number): Instant {
    if (!Number.isInteger(epochMilliseconds) || Math.abs(epochMilliseconds) > MAX_EPOCH_MILLISECONDS) {
      throw new RangeError(
        `Instant invalide : ${epochMilliseconds} (attendu : entier de millisecondes, au plus ${MAX_EPOCH_MILLISECONDS} en valeur absolue).`,
      );
    }
    return new Instant(epochMilliseconds);
  }

  compare(other: Instant): -1 | 0 | 1 {
    return Math.sign(this.epochMilliseconds - other.epochMilliseconds) as -1 | 0 | 1;
  }

  equals(other: Instant): boolean {
    return this.epochMilliseconds === other.epochMilliseconds;
  }
}
