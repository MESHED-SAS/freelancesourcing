// Identifiant stable d'un utilisateur (par exemple « persona-sophie »), fourni par le contrat
// AuthProvider (P2). Immuable. Refuse la chaîne vide et tout blanc (espace, tabulation, retour
// à la ligne…), pour que deux identifiants ne puissent pas différer d'un seul espace.

export class UserId {
  private constructor(readonly value: string) {
    Object.freeze(this);
  }

  // Crée un identifiant ; refuse une chaîne vide ou contenant un blanc.
  static of(value: string): UserId {
    if (value.length === 0 || /\s/.test(value)) {
      throw new RangeError(
        `Identifiant invalide : ${JSON.stringify(value)} (attendu : chaîne non vide, sans espace ni autre blanc).`,
      );
    }
    return new UserId(value);
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
