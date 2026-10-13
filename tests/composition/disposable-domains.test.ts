// Tests de la liste des domaines jetables fournie par la racine de composition (US-02, critère 4).
// Identifiants stables DD1 à DD5, cités par les preuves par mutation.
import { describe, expect, it } from "vitest";
import { DISPOSABLE_DOMAINS } from "../../src/composition/index.js";

describe("DISPOSABLE_DOMAINS", () => {
  it("DD1 : contient yopmail.com et mailinator.com", () => {
    expect(DISPOSABLE_DOMAINS).toContain("yopmail.com");
    expect(DISPOSABLE_DOMAINS).toContain("mailinator.com");
  });

  it("DD2 : chaque entrée est en minuscules", () => {
    expect(DISPOSABLE_DOMAINS.filter((entry) => entry !== entry.toLowerCase())).toEqual([]);
  });

  it("DD3 : aucun doublon", () => {
    expect(new Set(DISPOSABLE_DOMAINS).size).toBe(DISPOSABLE_DOMAINS.length);
  });

  // La casse est vérifiée par DD2 ; une entrée vide est refusée par la condition « contient un point ».
  it("DD4 : chaque entrée contient un point, sans blanc, sans « @ » ni « . » en tête", () => {
    const malformed = DISPOSABLE_DOMAINS.filter(
      (entry) => !entry.includes(".") || /\s/.test(entry) || entry.startsWith("@") || entry.startsWith("."),
    );
    expect(malformed).toEqual([]);
  });

  it("DD5 : la liste est gelée", () => {
    expect(Object.isFrozen(DISPOSABLE_DOMAINS)).toBe(true);
  });
});
