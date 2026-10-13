// Tests du cas d'usage authenticateSession (US-02, critères 3 et 4). Identifiants stables U1 à U15,
// cités par les preuves par mutation. Le fournisseur est une fausse implémentation de
// AuthProvider définie ici (le mock des personas viendra dans un prochain incrément).
// Toutes les adresses utilisent des domaines réservés (exemple.test, alpha-conseil.example), sauf
// yopmail.com et mailinator.com, qui sont les services jetables visés.
import { describe, expect, it } from "vitest";
import type { AuthProvider } from "../../src/domain/identity/auth-provider.js";
import type { AuthenticatedUser } from "../../src/domain/identity/authenticated-user.js";
import { EmailAddress } from "../../src/domain/identity/email-address.js";
import type { Role } from "../../src/domain/identity/role.js";
import type { SessionToken } from "../../src/domain/identity/session-token.js";
import { UserId } from "../../src/domain/identity/user-id.js";
import { type AuthenticationResult, authenticateSession } from "../../src/use-cases/authenticate-session.js";

const DISPOSABLE_DOMAINS: readonly string[] = ["yopmail.com", "mailinator.com"];

function user(id: string, role: Role, rawEmail: string): AuthenticatedUser {
  const result = EmailAddress.parse(rawEmail);
  if (!result.ok) throw new Error(`Adresse refusée à tort : ${rawEmail} (${result.reason})`);
  return Object.freeze({ id: UserId.of(id), role, email: result.email });
}

const SOPHIE = user("persona-sophie", "freelancer", "sophie@exemple.test");
const ALPHA_CONSEIL = user("persona-alpha-conseil", "recruiter", "recrutement@alpha-conseil.example");
const KARIM = user("persona-karim", "freelancer", "karim@yopmail.com");
const JULIE = user("persona-julie", "freelancer", "julie@a.mailinator.com");
const DISPOSABLE_RECRUITER = user("persona-recruteur-jetable", "recruiter", "recrutement@yopmail.com");
const DISPOSABLE_ADMIN = user("persona-admin-jetable", "admin", "admin@yopmail.com");

// Fausse implémentation : connaît quelques jetons et enregistre chaque appel.
class FakeAuthProvider implements AuthProvider {
  readonly calls: SessionToken[] = [];
  private readonly users = new Map<string, AuthenticatedUser>([
    ["jeton-sophie", SOPHIE],
    ["jeton-alpha", ALPHA_CONSEIL],
    ["jeton-karim", KARIM],
    ["jeton-julie", JULIE],
    ["jeton-recruteur-jetable", DISPOSABLE_RECRUITER],
    ["jeton-admin-jetable", DISPOSABLE_ADMIN],
  ]);

  async identify(session: SessionToken): Promise<AuthenticatedUser | null> {
    this.calls.push(session);
    return this.users.get(session.value) ?? null;
  }
}

function authenticate(
  rawToken: string | undefined,
  provider: AuthProvider = new FakeAuthProvider(),
  disposableDomains: readonly string[] = DISPOSABLE_DOMAINS,
): Promise<AuthenticationResult> {
  return authenticateSession({ authProvider: provider, disposableDomains }, rawToken);
}

describe("authenticateSession : identification", () => {
  it("U1 : un jeton connu, avec une adresse non jetable, renvoie l'utilisateur tel que fourni", async () => {
    const result = await authenticate("jeton-sophie");
    expect(result).toEqual({ ok: true, user: SOPHIE });
    expect(result.ok && result.user).toBe(SOPHIE);
  });

  it("U2 : un jeton bien formé mais inconnu est refusé (unknown-session)", async () => {
    expect(await authenticate("jeton-inconnu")).toEqual({
      ok: false,
      reason: "unknown-session",
      message: "Connexion refusée : session inconnue ou expirée.",
    });
  });
});

describe("authenticateSession : jeton absent ou mal formé (contrôlé en premier)", () => {
  it("U3 : un jeton absent est refusé, sans appeler le fournisseur", async () => {
    const provider = new FakeAuthProvider();
    expect(await authenticate(undefined, provider)).toEqual({
      ok: false,
      reason: "invalid-session-token",
      message: "Connexion refusée : le jeton de session est absent ou mal formé.",
    });
    expect(provider.calls).toHaveLength(0);
  });

  it.each([
    ["U4", "chaîne vide", ""],
    ["U5", "espace seul", " "],
    ["U6", "espace au milieu", "a b"],
  ])("%s : un jeton mal formé (%s) est refusé, sans appeler le fournisseur", async (_id, _label, raw) => {
    const provider = new FakeAuthProvider();
    expect(await authenticate(raw, provider)).toMatchObject({ ok: false, reason: "invalid-session-token" });
    expect(provider.calls).toHaveLength(0);
  });
});

describe("authenticateSession : adresses jetables (critère 4)", () => {
  it("U7 : une adresse d'un domaine jetable est refusée (disposable-email)", async () => {
    expect(await authenticate("jeton-karim")).toEqual({
      ok: false,
      reason: "disposable-email",
      message: "Connexion refusée : les adresses email jetables ne sont pas acceptées.",
    });
  });

  it("U8 : une adresse d'un sous-domaine jetable est refusée", async () => {
    expect(await authenticate("jeton-julie")).toMatchObject({ ok: false, reason: "disposable-email" });
  });

  it("U9 : avec une liste vide, la même adresse yopmail est acceptée (liste non écrite en dur)", async () => {
    expect(await authenticate("jeton-karim", new FakeAuthProvider(), [])).toEqual({ ok: true, user: KARIM });
  });

  it("U10 : la liste reçue est celle utilisée (exemple.test rend Sophie jetable)", async () => {
    expect(await authenticate("jeton-sophie", new FakeAuthProvider(), ["exemple.test"])).toMatchObject({
      ok: false,
      reason: "disposable-email",
    });
  });

  it("U15 : une adresse jetable est refusée quel que soit le rôle", async () => {
    for (const [raw, disposableUser, role] of [
      ["jeton-karim", KARIM, "freelancer"],
      ["jeton-recruteur-jetable", DISPOSABLE_RECRUITER, "recruiter"],
      ["jeton-admin-jetable", DISPOSABLE_ADMIN, "admin"],
    ] as const) {
      expect(disposableUser.role).toBe(role);
      expect(disposableUser.email.domain).toBe("yopmail.com");
      expect(await authenticate(raw)).toMatchObject({ ok: false, reason: "disposable-email" });
    }
  });
});

describe("authenticateSession : appels, gel, messages et pannes", () => {
  it("U11 : le fournisseur est appelé une seule fois, avec un jeton de même valeur", async () => {
    const provider = new FakeAuthProvider();
    await authenticate("jeton-alpha", provider);
    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0]?.value).toBe("jeton-alpha");
  });

  it("U12 : les quatre issues renvoient un résultat gelé", async () => {
    const accepted = await authenticate("jeton-sophie");
    expect(accepted.ok).toBe(true);
    expect(Object.isFrozen(accepted)).toBe(true);
    for (const [raw, reason] of [
      ["a b", "invalid-session-token"],
      ["jeton-inconnu", "unknown-session"],
      ["jeton-karim", "disposable-email"],
    ] as const) {
      const refusal = await authenticate(raw);
      expect(refusal).toMatchObject({ ok: false, reason });
      expect(Object.isFrozen(refusal)).toBe(true);
    }
  });

  it("U13 : aucun message de refus ne reprend l'adresse email ni le jeton", async () => {
    for (const [raw, reason] of [
      ["jeton secret", "invalid-session-token"],
      ["jeton-inconnu", "unknown-session"],
      ["jeton-karim", "disposable-email"],
    ] as const) {
      const refusal = await authenticate(raw);
      expect(refusal).toMatchObject({ ok: false, reason });
      const message = refusal.ok ? "" : refusal.message;
      expect(message).not.toContain(raw);
      for (const fragment of [KARIM.email.value, KARIM.email.localPart, KARIM.email.domain]) {
        expect(message).not.toContain(fragment);
      }
    }
  });

  it("U14 : une panne du fournisseur (promesse rejetée) est propagée telle quelle", async () => {
    const failure = new Error("Fournisseur indisponible");
    const provider: AuthProvider = { identify: () => Promise.reject(failure) };
    await expect(authenticate("jeton-sophie", provider)).rejects.toBe(failure);
  });
});
