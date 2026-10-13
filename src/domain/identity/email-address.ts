// Adresse email validée, en minuscules, avec accès à la partie locale et au domaine. Immuable.
// La création ne lève jamais d'exception : elle renvoie un résultat typé (adresse valide, ou
// refus avec une raison), car l'adresse peut venir d'un service externe (contrat AuthProvider, P2).
//
// Validation MINIMALE et assumée comme telle : elle n'est PAS conforme à la RFC 5322.
// Elle vérifie seulement : aucun blanc ; une seule arobase ; partie locale et domaine non vides ;
// domaine avec au moins un point, sans point en début, en fin ni deux points consécutifs.
// La partie locale n'est pas contrôlée au-delà (par exemple « a..b@exemple.fr » est acceptée).
// Toute l'adresse est mise en minuscules, partie locale comprise : c'est un choix du projet,
// même si la RFC considère la partie locale comme sensible à la casse.

export type EmailAddressRejectionReason =
  | "contains-whitespace"
  | "missing-at-sign"
  | "multiple-at-signs"
  | "empty-local-part"
  | "empty-domain"
  | "domain-without-dot"
  | "domain-leading-dot"
  | "domain-trailing-dot"
  | "domain-consecutive-dots";

export type EmailAddressResult =
  | { readonly ok: true; readonly email: EmailAddress }
  | { readonly ok: false; readonly reason: EmailAddressRejectionReason; readonly message: string };

// Les messages ne reprennent pas l'adresse refusée : c'est une donnée personnelle, qui ne doit
// pas se retrouver dans un journal.
const REJECTION_MESSAGES: Readonly<Record<EmailAddressRejectionReason, string>> = {
  "contains-whitespace": "elle contient un espace ou un autre blanc.",
  "missing-at-sign": "elle ne contient pas d'arobase (@).",
  "multiple-at-signs": "elle contient plus d'une arobase (@).",
  "empty-local-part": "la partie avant l'arobase est vide.",
  "empty-domain": "le domaine (après l'arobase) est vide.",
  "domain-without-dot": "le domaine ne contient aucun point.",
  "domain-leading-dot": "le domaine commence par un point.",
  "domain-trailing-dot": "le domaine se termine par un point.",
  "domain-consecutive-dots": "le domaine contient deux points consécutifs.",
};

function rejected(reason: EmailAddressRejectionReason): EmailAddressResult {
  return Object.freeze({ ok: false, reason, message: `Adresse email refusée : ${REJECTION_MESSAGES[reason]}` });
}

export class EmailAddress {
  readonly value: string;

  private constructor(
    readonly localPart: string,
    readonly domain: string,
  ) {
    this.value = `${localPart}@${domain}`;
    Object.freeze(this);
  }

  // Valide l'adresse et la met en minuscules ; ne lève jamais d'exception.
  static parse(raw: string): EmailAddressResult {
    if (/\s/.test(raw)) return rejected("contains-whitespace");
    const at = raw.indexOf("@");
    if (at === -1) return rejected("missing-at-sign");
    if (raw.indexOf("@", at + 1) !== -1) return rejected("multiple-at-signs");
    const localPart = raw.slice(0, at).toLowerCase();
    const domain = raw.slice(at + 1).toLowerCase();
    if (localPart.length === 0) return rejected("empty-local-part");
    if (domain.length === 0) return rejected("empty-domain");
    if (!domain.includes(".")) return rejected("domain-without-dot");
    if (domain.startsWith(".")) return rejected("domain-leading-dot");
    if (domain.endsWith(".")) return rejected("domain-trailing-dot");
    if (domain.includes("..")) return rejected("domain-consecutive-dots");
    return Object.freeze({ ok: true, email: new EmailAddress(localPart, domain) });
  }

  equals(other: EmailAddress): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
