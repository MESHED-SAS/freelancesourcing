// Tests du jeton de session (contrat AuthProvider, P2). Identifiants stables S1 à S14, cités par
// les preuves par mutation.
import { describe, expect, it } from "vitest";
import { SessionToken, type SessionTokenResult } from "../../src/domain/identity/session-token.js";

// Jeton attendu valide : échoue avec la raison du refus sinon.
function token(raw: string): SessionToken {
  const result = SessionToken.parse(raw);
  if (!result.ok) throw new Error(`Jeton refusé à tort (${result.reason})`);
  return result.token;
}

// Refus attendu : échoue si le jeton est accepté.
function rejection(result: SessionTokenResult): Extract<SessionTokenResult, { ok: false }> {
  if (result.ok) throw new Error("Jeton accepté à tort");
  return result;
}

describe("SessionToken : création et validation", () => {
  it("S1 : accepte un jeton opaque et conserve sa valeur exacte, casse comprise", () => {
    expect(token("Jeton-Sophie-0001").value).toBe("Jeton-Sophie-0001");
  });

  it("S2 : refuse une chaîne vide (raison empty)", () => {
    const refusal = rejection(SessionToken.parse(""));
    expect(refusal.reason).toBe("empty");
    expect(refusal.message).toBe("Jeton de session refusé : il est vide.");
  });

  it.each([
    ["S3", "espace", "jeton secret"],
    ["S4", "tabulation", "jeton\tsecret"],
    ["S5", "retour à la ligne", "jeton\nsecret"],
    ["S6", "caractère de contrôle \\u0000", "jeton\u0000secret"],
    ["S7", "caractère non ASCII é", "jeton-secrét"],
  ])("%s : refuse un caractère non autorisé : %s (raison invalid-character)", (_id, _label, raw) => {
    expect(rejection(SessionToken.parse(raw)).reason).toBe("invalid-character");
  });

  it("S8 : refuse un jeton de MAX_LENGTH + 1 caractères (raison too-long)", () => {
    expect(SessionToken.MAX_LENGTH).toBe(4096);
    expect(rejection(SessionToken.parse("s".repeat(SessionToken.MAX_LENGTH + 1))).reason).toBe("too-long");
  });

  it("S9 : accepte un jeton d'exactement MAX_LENGTH caractères", () => {
    expect(token("s".repeat(SessionToken.MAX_LENGTH)).value).toHaveLength(SessionToken.MAX_LENGTH);
  });
});

describe("SessionToken : immuabilité et secret", () => {
  it("S10 : le résultat accepté, le refus et le jeton sont gelés", () => {
    const accepted = SessionToken.parse("jeton-sophie");
    expect(Object.isFrozen(accepted)).toBe(true);
    expect(Object.isFrozen(token("jeton-sophie"))).toBe(true);
    expect(Object.isFrozen(rejection(SessionToken.parse("a b")))).toBe(true);
  });

  it("S11 : les messages de refus ne reprennent pas le jeton", () => {
    const invalid = rejection(SessionToken.parse("jeton secret"));
    expect(invalid.reason).toBe("invalid-character");
    expect(invalid.message).not.toContain("jeton secret");
    const tooLongRaw = `secret-${"s".repeat(SessionToken.MAX_LENGTH)}`;
    const tooLong = rejection(SessionToken.parse(tooLongRaw));
    expect(tooLong.reason).toBe("too-long");
    expect(tooLong.message).not.toContain("secret-");
  });

  it("S12 : toString masque la valeur", () => {
    const sophie = token("jeton-sophie");
    expect(sophie.toString()).toBe("[jeton de session]");
    expect(`${sophie}`).not.toContain("jeton-sophie");
  });

  it("S13 : JSON.stringify masque la valeur", () => {
    const serialized = JSON.stringify({ session: token("jeton-sophie") });
    expect(serialized).toBe('{"session":"[jeton de session]"}');
    expect(serialized).not.toContain("jeton-sophie");
  });

  it("S14 : deux jetons de même valeur sont égaux, deux valeurs différentes ne le sont pas", () => {
    expect(token("jeton-sophie").equals(token("jeton-sophie"))).toBe(true);
    expect(token("jeton-sophie").equals(token("jeton-karim"))).toBe(false);
  });
});
