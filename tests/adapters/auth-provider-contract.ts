// Tests de contrat du contrat P2 AuthProvider, partagés par tous les adaptateurs
// (architecture §4 : les mêmes tests sont exécutés sur le simulé et, plus tard, sur le réel).
// Identifiants stables C1 à C7, cités par les preuves par mutation. Chaque cas appelle identify
// directement : aucune enveloppe (try/catch, Promise.resolve) ne masque une exception synchrone.
// L'utilisateur attendu est écrit en dur par l'appelant, indépendamment des données de l'adaptateur.
import { describe, expect, it } from "vitest";
import type { AuthProvider } from "../../src/domain/identity/auth-provider.js";
import type { AuthenticatedUser } from "../../src/domain/identity/authenticated-user.js";
import { EmailAddress } from "../../src/domain/identity/email-address.js";
import type { Role } from "../../src/domain/identity/role.js";
import { SessionToken } from "../../src/domain/identity/session-token.js";
import { UserId } from "../../src/domain/identity/user-id.js";

export interface AuthProviderContractSetup {
  readonly provider: AuthProvider;
  // Jeton brut d'une session valide chez ce fournisseur (au moins deux caractères, dont une lettre).
  readonly knownToken: string;
  readonly expectedUser: { readonly id: string; readonly role: Role; readonly email: string };
}

// Jeton bien formé, inconnu de tout fournisseur.
const UNKNOWN_TOKEN = "jeton-inconnu-du-contrat";

function sessionToken(raw: string): SessionToken {
  const parsed = SessionToken.parse(raw);
  if (!parsed.ok) throw new Error(`Jeton refusé à tort par SessionToken.parse (${parsed.reason}).`);
  return parsed.token;
}

// Appelle identify sur un jeton connu ; échoue si le résultat est null.
async function identifyKnown(provider: AuthProvider, raw: string): Promise<AuthenticatedUser> {
  const user = await provider.identify(sessionToken(raw));
  if (user === null) throw new Error("identify a renvoyé null pour le jeton connu.");
  return user;
}

export function describeAuthProviderContract(name: string, setup: () => AuthProviderContractSetup): void {
  describe(`contrat AuthProvider : ${name}`, () => {
    it("C1 : un jeton connu renvoie l'utilisateur attendu (identifiant, rôle, email)", async () => {
      const { provider, knownToken, expectedUser } = setup();
      const user = await identifyKnown(provider, knownToken);
      expect(user.id).toBeInstanceOf(UserId);
      expect(user.email).toBeInstanceOf(EmailAddress);
      expect({ id: user.id.value, role: user.role, email: user.email.value }).toEqual(expectedUser);
    });

    it("C2 : un jeton bien formé mais inconnu donne une promesse résolue à null", async () => {
      const { provider } = setup();
      await expect(provider.identify(sessionToken(UNKNOWN_TOKEN))).resolves.toBeNull();
    });

    // Une exception synchrone lève dès l'appel et fait échouer le test ; une promesse rejetée
    // le fait échouer à l'attente.
    it("C3 : identify renvoie une promesse résolue, sans exception synchrone, pour un jeton connu comme inconnu", async () => {
      const { provider, knownToken } = setup();
      for (const raw of [knownToken, UNKNOWN_TOKEN]) {
        const result = provider.identify(sessionToken(raw));
        expect(result).toBeInstanceOf(Promise);
        await result;
      }
    });

    it("C4 : deux appels avec le même jeton renvoient la même identité", async () => {
      const { provider, knownToken } = setup();
      const first = await identifyKnown(provider, knownToken);
      const second = await identifyKnown(provider, knownToken);
      expect(second.id.equals(first.id)).toBe(true);
      expect(second.role).toBe(first.role);
      expect(second.email.equals(first.email)).toBe(true);
    });

    it("C5 : l'utilisateur renvoyé est gelé", async () => {
      const { provider, knownToken } = setup();
      const user = await identifyKnown(provider, knownToken);
      expect(Object.isFrozen(user)).toBe(true);
    });

    it("C6 : la casse du jeton compte (jeton connu en majuscules : null)", async () => {
      const { provider, knownToken } = setup();
      const upper = knownToken.toUpperCase();
      expect(upper).not.toBe(knownToken);
      expect(await provider.identify(sessionToken(upper))).toBeNull();
    });

    it("C7 : pas de correspondance partielle (jeton prolongé, tronqué ou préfixé : null)", async () => {
      const { provider, knownToken } = setup();
      expect(knownToken.length).toBeGreaterThanOrEqual(2);
      for (const raw of [`${knownToken}x`, knownToken.slice(0, -1), `x${knownToken}`]) {
        expect(await provider.identify(sessionToken(raw))).toBeNull();
      }
    });
  });
}
