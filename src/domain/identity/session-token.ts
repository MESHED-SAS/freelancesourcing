// Jeton de session, transmis au contrat AuthProvider (P2). Il vient d'un cookie, donc d'une
// entrée non fiable : la création ne lève jamais d'exception, elle renvoie un résultat typé
// (jeton valide, ou refus avec une raison), comme EmailAddress.parse. Immuable.
//
// Règles : non vide ; uniquement des caractères ASCII visibles (de « ! » à « ~ », codes 0x21 à
// 0x7E : ni blanc, ni caractère de contrôle, ni caractère non ASCII) ; au plus MAX_LENGTH
// caractères. La valeur est conservée telle quelle (pas de mise en minuscules).
//
// MAX_LENGTH (4096, la limite courante d'un cookie) est PROVISOIRE : à revalider avec le
// fournisseur réel.
//
// Le jeton est un secret : les messages de refus ne le reprennent pas, et toString et toJSON le
// masquent. Limite connue : la propriété value reste publique (l'adaptateur en a besoin), donc un
// affichage direct de l'objet peut encore la montrer.

const MAX_LENGTH = 4096;
const MASK = "[jeton de session]";

export type SessionTokenRejectionReason = "empty" | "invalid-character" | "too-long";

export type SessionTokenResult =
  | { readonly ok: true; readonly token: SessionToken }
  | { readonly ok: false; readonly reason: SessionTokenRejectionReason; readonly message: string };

const REJECTION_MESSAGES: Readonly<Record<SessionTokenRejectionReason, string>> = {
  empty: "il est vide.",
  "invalid-character": "il contient un caractère non autorisé (blanc, caractère de contrôle ou non ASCII).",
  "too-long": `il dépasse ${MAX_LENGTH} caractères.`,
};

function rejected(reason: SessionTokenRejectionReason): SessionTokenResult {
  return Object.freeze({ ok: false, reason, message: `Jeton de session refusé : ${REJECTION_MESSAGES[reason]}` });
}

export class SessionToken {
  static readonly MAX_LENGTH = MAX_LENGTH;

  private constructor(readonly value: string) {
    Object.freeze(this);
  }

  // Valide le jeton ; ne lève jamais d'exception. La longueur est contrôlée avant les caractères.
  static parse(raw: string): SessionTokenResult {
    if (raw.length === 0) return rejected("empty");
    if (raw.length > MAX_LENGTH) return rejected("too-long");
    if (!/^[\x21-\x7E]+$/.test(raw)) return rejected("invalid-character");
    return Object.freeze({ ok: true, token: new SessionToken(raw) });
  }

  equals(other: SessionToken): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return MASK;
  }

  toJSON(): string {
    return MASK;
  }
}
