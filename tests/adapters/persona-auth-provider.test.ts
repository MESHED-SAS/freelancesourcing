// Tests de l'adaptateur simulé du contrat P2 AuthProvider : personas fictifs (US-02, critères 1 et 3).
// Identifiants stables, cités par les preuves par mutation : C1 à C7 (contrat commun, voir
// auth-provider-contract.ts) et P1 (six cas). Les valeurs attendues sont écrites en dur,
// indépendamment de PERSONAS.
import { describe, expect, it } from "vitest";
import { PersonaAuthProvider } from "../../src/adapters/auth/persona-auth-provider.js";
import { SessionToken } from "../../src/domain/identity/session-token.js";
import { describeAuthProviderContract } from "./auth-provider-contract.js";

describeAuthProviderContract("personas fictifs", () => ({
  provider: new PersonaAuthProvider(),
  knownToken: "demo-sophie",
  expectedUser: { id: "persona-sophie", role: "freelancer", email: "sophie@exemple.test" },
}));

function sessionToken(raw: string): SessionToken {
  const parsed = SessionToken.parse(raw);
  if (!parsed.ok) throw new Error(`Jeton refusé à tort par SessionToken.parse (${parsed.reason}).`);
  return parsed.token;
}

describe("PersonaAuthProvider", () => {
  it.each([
    ["demo-sophie", "persona-sophie", "freelancer", "sophie@exemple.test"],
    ["demo-karim", "persona-karim", "freelancer", "karim@exemple.test"],
    ["demo-julie", "persona-julie", "freelancer", "julie@exemple.test"],
    ["demo-marc", "persona-marc", "freelancer", "marc@exemple.test"],
    ["demo-alpha-conseil", "persona-alpha-conseil", "recruiter", "recrutement@alpha-conseil.example"],
    ["demo-admin", "persona-admin", "admin", "admin@meshed.example"],
  ])("P1 : le jeton %s identifie %s (%s, %s)", async (token, id, role, email) => {
    const user = await new PersonaAuthProvider().identify(sessionToken(token));
    expect(user).not.toBeNull();
    expect({ id: user?.id.value, role: user?.role, email: user?.email.value }).toEqual({ id, role, email });
  });
});
