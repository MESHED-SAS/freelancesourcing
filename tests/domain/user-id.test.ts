// Tests du type UserId (identifiant stable d'un utilisateur).
import { describe, expect, it } from "vitest";
import { UserId } from "../../src/domain/identity/user-id.js";

describe("UserId : création et validation", () => {
  it("accepte un identifiant lisible comme « persona-sophie »", () => {
    const id = UserId.of("persona-sophie");
    expect(id.value).toBe("persona-sophie");
    expect(id.toString()).toBe("persona-sophie");
  });

  it("refuse une chaîne vide", () => {
    expect(() => UserId.of("")).toThrow(RangeError);
  });

  it.each([
    ["espace au milieu", "persona sophie"],
    ["espace en tête", " persona-sophie"],
    ["tabulation seule", "\t"],
  ])("refuse un identifiant contenant un blanc : %s", (_label, value) => {
    expect(() => UserId.of(value)).toThrow(RangeError);
  });
});

describe("UserId : comparaison et immuabilité", () => {
  it("deux identifiants de même valeur sont égaux, deux valeurs différentes ne le sont pas", () => {
    expect(UserId.of("persona-sophie").equals(UserId.of("persona-sophie"))).toBe(true);
    expect(UserId.of("persona-sophie").equals(UserId.of("persona-karim"))).toBe(false);
  });

  it("est immuable", () => {
    expect(Object.isFrozen(UserId.of("persona-sophie"))).toBe(true);
  });
});
