// Tests du type EmailAddress (adresse email validée, en minuscules).
// La validation est MINIMALE et assumée comme telle : elle n'est PAS conforme à la RFC 5322.
// Les tests fixent ce qu'elle refuse et documentent ce qu'elle laisse passer.
import { describe, expect, it } from "vitest";
import {
  EmailAddress,
  type EmailAddressRejectionReason,
  type EmailAddressResult,
} from "../../src/domain/identity/email-address.js";

// Adresse attendue valide : échoue avec la raison du refus sinon.
function valid(raw: string): EmailAddress {
  const result = EmailAddress.parse(raw);
  if (!result.ok) throw new Error(`Adresse refusée à tort : ${raw} (${result.reason})`);
  return result.email;
}

// Message d'une adresse attendue refusée : échoue si elle est acceptée.
function rejectionMessage(raw: string): string {
  const result = EmailAddress.parse(raw);
  if (result.ok) throw new Error(`Adresse acceptée à tort : ${raw}`);
  return result.message;
}

describe("EmailAddress : adresses acceptées", () => {
  it("accepte une adresse simple et donne la partie locale et le domaine", () => {
    const email = valid("sophie@alpha-conseil.example");
    expect(email.value).toBe("sophie@alpha-conseil.example");
    expect(email.toString()).toBe("sophie@alpha-conseil.example");
    expect(email.localPart).toBe("sophie");
    expect(email.domain).toBe("alpha-conseil.example");
  });

  it("met toute l'adresse en minuscules", () => {
    const email = valid("Sophie.Martin@Alpha-Conseil.EXAMPLE");
    expect(email.value).toBe("sophie.martin@alpha-conseil.example");
    expect(email.domain).toBe("alpha-conseil.example");
  });

  it("accepte un sous-domaine", () => {
    expect(valid("karim@mail.alpha-conseil.example").domain).toBe("mail.alpha-conseil.example");
  });

  it("validation minimale, pas RFC 5322 : accepte deux points consécutifs dans la partie locale", () => {
    expect(valid("a..b@exemple.test").localPart).toBe("a..b");
  });

  it("est immuable", () => {
    expect(Object.isFrozen(valid("sophie@alpha-conseil.example"))).toBe(true);
  });

  it("deux casses différentes de la même adresse sont égales", () => {
    expect(valid("Sophie@Alpha-Conseil.example").equals(valid("sophie@alpha-conseil.example"))).toBe(true);
  });

  it("le résultat valide est gelé", () => {
    expect(Object.isFrozen(EmailAddress.parse("sophie@alpha-conseil.example"))).toBe(true);
  });
});

describe("EmailAddress : adresses refusées (résultat typé, jamais d'exception)", () => {
  it.each<[string, string, EmailAddressRejectionReason]>([
    ["chaîne vide", "", "missing-at-sign"],
    ["sans arobase", "sophie.alpha-conseil.example", "missing-at-sign"],
    ["deux arobases accolées", "sophie@@alpha-conseil.example", "multiple-at-signs"],
    ["deux arobases séparées", "sophie@alpha@conseil.example", "multiple-at-signs"],
    ["partie locale vide", "@alpha-conseil.example", "empty-local-part"],
    ["domaine vide", "sophie@", "empty-domain"],
    ["espace au milieu", "sophie martin@alpha-conseil.example", "contains-whitespace"],
    ["espace en tête (l'entrée n'est pas nettoyée)", " sophie@alpha-conseil.example", "contains-whitespace"],
    ["tabulation en fin", "sophie@alpha-conseil.example\t", "contains-whitespace"],
    ["domaine sans point", "sophie@localhost", "domain-without-dot"],
    ["point en début de domaine", "sophie@.alpha-conseil.example", "domain-leading-dot"],
    ["point en fin de domaine", "sophie@alpha-conseil.example.", "domain-trailing-dot"],
    ["points consécutifs dans le domaine", "sophie@alpha..conseil.example", "domain-consecutive-dots"],
  ])("refuse : %s", (_label, raw, reason) => {
    const parse = (): EmailAddressResult => EmailAddress.parse(raw);
    expect(parse).not.toThrow();
    expect(parse()).toEqual({
      ok: false,
      reason,
      message: expect.stringMatching(/^Adresse email refusée : .+/),
    });
    expect(rejectionMessage(raw)).not.toMatch(/sophie|martin|alpha/i);
  });

  it("le résultat de refus est gelé", () => {
    const result = EmailAddress.parse("sophie@localhost");
    expect(result.ok).toBe(false);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("le message de refus ne reprend jamais l'adresse (donnée personnelle)", () => {
    const message = rejectionMessage("sophie.martin@@alpha-conseil.example");
    expect(message).not.toContain("sophie");
    expect(message).not.toContain("martin");
    expect(message).not.toContain("alpha-conseil");
  });
});
