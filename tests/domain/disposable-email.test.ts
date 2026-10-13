// Tests de la détection des adresses jetables (US-02, critère 4).
// La liste est fournie par le test : le domaine n'en contient aucune.
// Toutes les adresses utilisent des domaines réservés (alpha-conseil.example, exemple.test), sauf
// yopmail.com et mailinator.com, qui sont les services jetables visés.
import { describe, expect, it } from "vitest";
import { isDisposableEmail } from "../../src/domain/identity/disposable-email.js";
import { EmailAddress } from "../../src/domain/identity/email-address.js";

const DISPOSABLE_DOMAINS: readonly string[] = ["yopmail.com", "mailinator.com"];

// Adresse fictive attendue valide : échoue avec la raison du refus sinon.
function email(raw: string): EmailAddress {
  const result = EmailAddress.parse(raw);
  if (!result.ok) throw new Error(`Adresse refusée à tort : ${raw} (${result.reason})`);
  return result.email;
}

describe("isDisposableEmail : domaines de la liste et sous-domaines", () => {
  it("un domaine de la liste est jetable (premier élément)", () => {
    expect(isDisposableEmail(email("sophie@yopmail.com"), DISPOSABLE_DOMAINS)).toBe(true);
  });

  it("chaque élément de la liste est pris en compte, pas seulement le premier", () => {
    expect(isDisposableEmail(email("karim@mailinator.com"), DISPOSABLE_DOMAINS)).toBe(true);
  });

  it("un domaine absent de la liste n'est pas jetable", () => {
    expect(isDisposableEmail(email("sophie@alpha-conseil.example"), DISPOSABLE_DOMAINS)).toBe(false);
  });

  it("un sous-domaine d'un domaine de la liste est jetable, même sur plusieurs niveaux", () => {
    expect(isDisposableEmail(email("julie@a.b.yopmail.com"), DISPOSABLE_DOMAINS)).toBe(true);
  });
});

describe("isDisposableEmail : pas de simple comparaison de texte", () => {
  it("un domaine qui se termine seulement par le même texte n'est pas jetable (notexemple.test)", () => {
    expect(isDisposableEmail(email("marc@notexemple.test"), ["exemple.test"])).toBe(false);
  });

  it("un domaine qui commence par un domaine de la liste n'est pas jetable", () => {
    expect(isDisposableEmail(email("marc@yopmail.com.exemple.test"), DISPOSABLE_DOMAINS)).toBe(false);
  });
});

describe("isDisposableEmail : casse", () => {
  it("la casse de l'adresse ne permet pas de contourner la liste", () => {
    expect(isDisposableEmail(email("Sophie@YopMail.COM"), DISPOSABLE_DOMAINS)).toBe(true);
  });

  it("la casse des entrées de la liste n'empêche pas la détection", () => {
    expect(isDisposableEmail(email("sophie@yopmail.com"), ["YOPMAIL.com"])).toBe(true);
  });
});

describe("isDisposableEmail : listes limites", () => {
  it("avec une liste vide, aucune adresse n'est jetable", () => {
    expect(isDisposableEmail(email("sophie@yopmail.com"), [])).toBe(false);
  });

  it("une entrée vide dans la liste ne rend pas toutes les adresses jetables", () => {
    expect(isDisposableEmail(email("sophie@alpha-conseil.example"), [""])).toBe(false);
  });
});
