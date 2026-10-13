// Tests des données des personas fictifs (US-02, critère 1 ; mock du contrat P2 AuthProvider).
// Identifiants stables DP1 à DP6, cités par les preuves par mutation. Les valeurs attendues sont
// écrites en dur, indépendamment de PERSONAS.
import { describe, expect, it } from "vitest";
import { PERSONAS } from "../../src/adapters/auth/personas.js";
import { SessionToken } from "../../src/domain/identity/session-token.js";

describe("PERSONAS", () => {
  it("DP1 : six personas, dans l'ordre Sophie, Karim, Julie, Marc, Alpha Conseil, administrateur", () => {
    expect(PERSONAS.map((persona) => persona.user.id.value)).toEqual([
      "persona-sophie",
      "persona-karim",
      "persona-julie",
      "persona-marc",
      "persona-alpha-conseil",
      "persona-admin",
    ]);
  });

  // Comparaison d'objets : indépendante de l'ordre (l'ordre est vérifié par DP1).
  it("DP2 : quatre freelances, un recruteur, un administrateur, chacun avec son rôle", () => {
    expect(Object.fromEntries(PERSONAS.map((persona) => [persona.user.id.value, persona.user.role]))).toEqual({
      "persona-sophie": "freelancer",
      "persona-karim": "freelancer",
      "persona-julie": "freelancer",
      "persona-marc": "freelancer",
      "persona-alpha-conseil": "recruiter",
      "persona-admin": "admin",
    });
  });

  it("DP3 : chaque adresse utilise un domaine réservé (.example ou .test)", () => {
    const outsideReserved = PERSONAS.filter((persona) => !/\.(?:example|test)$/.test(persona.user.email.domain));
    expect(outsideReserved.map((persona) => persona.user.id.value)).toEqual([]);
  });

  it("DP4 : jetons, identifiants et adresses sans doublon", () => {
    expect(new Set(PERSONAS.map((persona) => persona.token)).size).toBe(PERSONAS.length);
    expect(new Set(PERSONAS.map((persona) => persona.user.id.value)).size).toBe(PERSONAS.length);
    expect(new Set(PERSONAS.map((persona) => persona.user.email.value)).size).toBe(PERSONAS.length);
  });

  it("DP5 : chaque jeton est accepté par SessionToken.parse", () => {
    const refused = PERSONAS.filter((persona) => !SessionToken.parse(persona.token).ok);
    expect(refused.map((persona) => persona.user.id.value)).toEqual([]);
  });

  // Object.isFrozen(null) vaut true : la présence de chaque objet est vérifiée avant son gel.
  it("DP6 : le tableau, chaque persona et chaque utilisateur sont gelés", () => {
    expect(Object.isFrozen(PERSONAS)).toBe(true);
    for (const persona of PERSONAS) {
      expect(persona).not.toBeNull();
      expect(persona.user).not.toBeNull();
      expect(Object.isFrozen(persona)).toBe(true);
      expect(Object.isFrozen(persona.user)).toBe(true);
    }
  });
});
