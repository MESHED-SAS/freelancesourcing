// Tests de la logique de session de l'interface (US-02c, CA7, CA8 et CA10) : options du cookie de
// session, et résolution d'une session à partir de la valeur du cookie (échec fermé : toute issue
// autre qu'un utilisateur authentifié, panne du fournisseur comprise, donne une session anonyme).
// Identifiants stables SE1 à SE11, cités par les preuves par mutation. Le fournisseur est une
// fausse implémentation de AuthProvider définie ici, et non le mock des personas ; ses
// identifiants, adresses et jetons sont neutres (test-user-a, …). Les valeurs attendues sont
// écrites en dur.
import { describe, expect, it } from "vitest";
import {
  clearedSessionCookieOptions,
  resolveSession,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "../../src/app/session/session.js";
import type { AuthProvider } from "../../src/domain/identity/auth-provider.js";
import type { AuthenticatedUser } from "../../src/domain/identity/authenticated-user.js";
import { EmailAddress } from "../../src/domain/identity/email-address.js";
import type { Role } from "../../src/domain/identity/role.js";
import type { SessionToken } from "../../src/domain/identity/session-token.js";
import { UserId } from "../../src/domain/identity/user-id.js";

const DISPOSABLE_DOMAINS: readonly string[] = ["yopmail.com", "mailinator.com"];

function user(id: string, role: Role, rawEmail: string): AuthenticatedUser {
  const result = EmailAddress.parse(rawEmail);
  if (!result.ok) throw new Error(`Adresse refusée à tort : ${rawEmail} (${result.reason})`);
  return Object.freeze({ id: UserId.of(id), role, email: result.email });
}

const FREELANCER = user("test-user-a", "freelancer", "user-a@exemple.test");
const DISPOSABLE_FREELANCER = user("test-user-c", "freelancer", "user-c@yopmail.com");

// Fausse implémentation : connaît deux jetons et enregistre chaque appel.
class FakeAuthProvider implements AuthProvider {
  readonly calls: SessionToken[] = [];
  private readonly users = new Map<string, AuthenticatedUser>([
    ["jeton-a", FREELANCER],
    ["jeton-c", DISPOSABLE_FREELANCER],
  ]);

  async identify(session: SessionToken): Promise<AuthenticatedUser | null> {
    this.calls.push(session);
    return this.users.get(session.value) ?? null;
  }
}

function deps(authProvider: AuthProvider = new FakeAuthProvider()) {
  return { authProvider, disposableDomains: DISPOSABLE_DOMAINS };
}

const ENVIRONMENTS = [
  ["« development »", "development", false],
  ["« staging »", "staging", false],
  ["« production »", "production", true],
] as const;

describe("options du cookie de session", () => {
  it("SE1 : en développement : HttpOnly, SameSite=Lax, Path=/, sans Secure", () => {
    expect(sessionCookieOptions("development")).toStrictEqual({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false,
    });
  });

  it.each(ENVIRONMENTS)("SE2 : environnement %s : secure faux en development et staging, vrai en production (%s : secure attendu %s)", (_label, environment, secure) => {
    expect(sessionCookieOptions(environment).secure).toBe(secure);
    expect(clearedSessionCookieOptions(environment).secure).toBe(secure);
  });

  it("SE2 : valeur incorrecte « prod » forcée par un cast : secure vrai (liste blanche)", () => {
    // Cast volontaire : simule une valeur qui contournerait le typage d'AppEnvironment.
    const incorrect = "prod" as never;
    expect(sessionCookieOptions(incorrect).secure).toBe(true);
    expect(clearedSessionCookieOptions(incorrect).secure).toBe(true);
  });

  it.each(ENVIRONMENTS)("SE3 : environnement %s : ni maxAge ni expires à la création (cookie de session)", (_label, environment) => {
    const options = sessionCookieOptions(environment);
    expect(Object.keys(options)).not.toContain("maxAge");
    expect(Object.keys(options)).not.toContain("expires");
  });

  it.each(ENVIRONMENTS)("SE4 : environnement %s : suppression avec les mêmes attributs et maxAge: 0", (_label, environment, secure) => {
    expect(clearedSessionCookieOptions(environment)).toStrictEqual({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure,
      maxAge: 0,
    });
  });

  it("SE10 : le cookie s'appelle « meshed_session »", () => {
    expect(SESSION_COOKIE_NAME).toBe("meshed_session");
  });
});

describe("resolveSession", () => {
  it("SE5 : cookie absent : anonyme, sans appeler le fournisseur", async () => {
    const provider = new FakeAuthProvider();
    expect(await resolveSession(deps(provider), undefined)).toStrictEqual({ kind: "anonymous" });
    expect(provider.calls).toHaveLength(0);
  });

  it("SE6 : jeton bien formé mais inconnu : anonyme", async () => {
    expect(await resolveSession(deps(), "jeton-inconnu")).toStrictEqual({ kind: "anonymous" });
  });

  it("SE7 : jeton valide : utilisateur renvoyé tel que fourni, résultat gelé", async () => {
    const session = await resolveSession(deps(), "jeton-a");
    expect(session).toStrictEqual({ kind: "user", user: FREELANCER });
    expect(session.kind === "user" && session.user).toBe(FREELANCER);
    expect(Object.isFrozen(session)).toBe(true);
  });

  it("SE8 : fournisseur qui rejette : anonyme, sans propager l'erreur ni son message", async () => {
    const failing: AuthProvider = { identify: () => Promise.reject(new Error("Panne du fournisseur : détail interne")) };
    const session = await resolveSession(deps(failing), "jeton-a");
    expect(session).toStrictEqual({ kind: "anonymous" });
    expect(JSON.stringify(session)).not.toContain("Panne");
  });

  it("SE9 : chaîne vide : anonyme, sans appeler le fournisseur", async () => {
    const provider = new FakeAuthProvider();
    expect(await resolveSession(deps(provider), "")).toStrictEqual({ kind: "anonymous" });
    expect(provider.calls).toHaveLength(0);
  });

  it("SE11 : utilisateur à adresse jetable : anonyme", async () => {
    expect(await resolveSession(deps(), "jeton-c")).toStrictEqual({ kind: "anonymous" });
  });
});
