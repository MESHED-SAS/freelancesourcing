// Logique de session de l'interface (US-02c, CA7 à CA10) : options du cookie de session, résolution
// d'une session à partir de la valeur du cookie, et décision d'accès à la page réservée aux
// recruteurs. Fonctions pures ou à dépendances injectées, testées par Vitest : les pages se
// contentent d'appeler ces fonctions et d'afficher le résultat.
// Ce fichier n'importe de la composition que des types (décision 28) et ne lit ni l'environnement
// du processus, ni l'heure, ni next/* : les dépendances et l'environnement sont reçus en paramètre.

import type { AppEnvironment } from "../../composition/index.js";
import {
  authenticateSession,
  type AuthenticateSessionDependencies,
  type AuthenticatedUser,
  type AuthenticationResult,
  authorizeRole,
  type AuthorizeRoleDependencies,
  type Role,
  type RoleRequirement,
} from "../../use-cases/index.js";

export const SESSION_COOKIE_NAME = "meshed_session";
export const RECRUITERS_PAGE_TARGET = "page:recruteurs";

// Cookie de session : HttpOnly, SameSite=Lax, Path=/, sans durée (ni maxAge ni expires : il
// disparaît à la fermeture du navigateur). Secure suit une liste blanche, comme isMockAllowed :
// faux seulement en development et staging, vrai pour toute autre valeur (production comprise,
// valeur incorrecte comprise). Comparaison exacte du texte, sans importer de valeur de la composition.
export interface SessionCookieOptions {
  readonly httpOnly: true;
  readonly sameSite: "lax";
  readonly path: "/";
  readonly secure: boolean;
}

// Suppression : mêmes attributs, et maxAge: 0.
export interface ClearedSessionCookieOptions extends SessionCookieOptions {
  readonly maxAge: 0;
}

export function sessionCookieOptions(environment: AppEnvironment): SessionCookieOptions {
  const secure = environment !== "development" && environment !== "staging";
  return { httpOnly: true, sameSite: "lax", path: "/", secure };
}

export function clearedSessionCookieOptions(environment: AppEnvironment): ClearedSessionCookieOptions {
  return { ...sessionCookieOptions(environment), maxAge: 0 };
}

export type Session = { readonly kind: "anonymous" } | { readonly kind: "user"; readonly user: AuthenticatedUser };

const ANONYMOUS: Session = Object.freeze({ kind: "anonymous" });

// cookieValue vaut undefined quand le cookie est absent. Échec fermé : jeton absent, vide, mal
// formé ou inconnu, adresse jetable, ou panne du fournisseur → session anonyme. Un cookie invalide
// est ignoré, pas supprimé (décision 18).
export async function resolveSession(
  dependencies: AuthenticateSessionDependencies,
  cookieValue: string | undefined,
): Promise<Session> {
  let result: AuthenticationResult;
  try {
    result = await authenticateSession(dependencies, cookieValue);
  } catch {
    // Toute erreur est interceptée et donne une session anonyme : cela masque aussi les erreurs de
    // programmation, et aucune journalisation n'est faite (ni l'erreur, ni son message).
    return ANONYMOUS;
  }
  if (!result.ok) return ANONYMOUS;
  return Object.freeze({ kind: "user", user: result.user });
}

export type RecruitersPageDecision =
  | { readonly kind: "login" }
  | { readonly kind: "allow"; readonly user: AuthenticatedUser }
  | { readonly kind: "forbidden" };

const LOGIN: RecruitersPageDecision = Object.freeze({ kind: "login" });
const FORBIDDEN: RecruitersPageDecision = Object.freeze({ kind: "forbidden" });

const RECRUITER_ROLES: readonly Role[] = Object.freeze(["recruiter"] as const);

const RECRUITERS_ONLY: RoleRequirement = Object.freeze({ target: RECRUITERS_PAGE_TARGET, allowedRoles: RECRUITER_ROLES });

// Anonyme → connexion ; recruteur → accès ; tout autre rôle (admin compris : aucune hiérarchie)
// → refus, journalisé par authorizeRole. Une panne du journal n'est pas interceptée : la promesse
// est rejetée avec la même erreur, et l'accès n'est jamais accordé (échec fermé). À l'accord, le
// journal n'est pas appelé.
export async function decideRecruitersPage(
  dependencies: AuthorizeRoleDependencies,
  session: Session,
): Promise<RecruitersPageDecision> {
  if (session.kind === "anonymous") return LOGIN;
  const result = await authorizeRole(dependencies, session.user, RECRUITERS_ONLY);
  if (!result.ok) return FORBIDDEN;
  return Object.freeze({ kind: "allow", user: result.user });
}
