// Logique de connexion et de déconnexion (US-02c, CA6, CA7 et CA10) : fonctions pures, testées
// par Vitest (tests/app/login.test.ts). Le fichier d'action (actions.ts) se contente d'appliquer
// ces décisions : poser ou supprimer le cookie, puis rediriger.
// Ce fichier n'importe de la composition que des types (décision 28), ni services.ts (AR4), ni
// next/* : les dépendances sont reçues en paramètre, sous une forme minimale.

import type { AppEnvironment } from "../../composition/index.js";
import {
  type ClearedSessionCookieOptions,
  clearedSessionCookieOptions,
  SESSION_COOKIE_NAME,
  type SessionCookieOptions,
  sessionCookieOptions,
} from "./session.js";

// Nom du champ envoyé par le bouton du persona choisi.
export const LOGIN_FORM_FIELD = "key";

// Chemins fixes : aucune entrée (formulaire, paramètre d'URL) ne choisit la destination d'une
// redirection, donc pas de redirection ouverte.
export const LOGIN_PAGE_PATH = "/connexion";
export const LOGIN_SUCCESS_PATH = "/";
export const LOGIN_FAILURE_PATH = "/connexion?echec=1";
const LOGIN_FAILURE_PARAMETER = "echec";

// Message neutre (CA10) : ni la valeur reçue, ni la raison du refus, ni trace technique.
export const LOGIN_FAILURE_MESSAGE = "Connexion impossible. Choisissez un profil dans la liste.";

// Forme minimale des services utilisés (Services, de services.ts, la respecte).
export interface LoginDependencies {
  readonly environment: AppEnvironment;
  readonly resolveDemoPersonaToken: (key: string) => string | null;
}

export interface SessionCookie {
  readonly name: string;
  readonly value: string;
  readonly options: SessionCookieOptions;
}

export interface SessionCookieDeletion {
  readonly name: string;
  readonly value: "";
  readonly options: ClearedSessionCookieOptions;
}

export type LoginDecision =
  | { readonly kind: "login-ok"; readonly cookie: SessionCookie }
  | { readonly kind: "login-refused" };

const REFUSED: LoginDecision = Object.freeze({ kind: "login-refused" });

// rawKey est la valeur brute du formulaire (FormData.get : chaîne, fichier ou null). Échec fermé :
// tout ce qui n'est pas une chaîne est refusé sans appeler le résolveur ; la chaîne est transmise
// telle quelle (ni trim, ni changement de casse) ; une key inconnue, vide, un jeton ou une adresse
// donnent null au résolveur, donc un refus. Le résultat du résolveur n'est pas cru sur parole :
// tout ce qui n'est pas une chaîne non vide (null, undefined, nombre, chaîne vide) est un refus.
export function decideLogin(dependencies: LoginDependencies, rawKey: unknown): LoginDecision {
  if (typeof rawKey !== "string") return REFUSED;
  const token = dependencies.resolveDemoPersonaToken(rawKey);
  if (typeof token !== "string" || token === "") return REFUSED;
  const options = Object.freeze(sessionCookieOptions(dependencies.environment));
  const cookie: SessionCookie = Object.freeze({ name: SESSION_COOKIE_NAME, value: token, options });
  return Object.freeze({ kind: "login-ok", cookie });
}

// Suppression du cookie de session : même nom, valeur vide, mêmes attributs et maxAge 0 (CA7).
export function sessionCookieDeletion(environment: AppEnvironment): SessionCookieDeletion {
  const options = Object.freeze(clearedSessionCookieOptions(environment));
  return Object.freeze({ name: SESSION_COOKIE_NAME, value: "", options });
}

// Affichage du message d'échec : seulement si le paramètre vaut exactement « 1 ». La valeur ne sert
// qu'à ce choix, jamais à construire une URL ni un texte.
export function isLoginFailure(searchParams: Readonly<Record<string, string | readonly string[] | undefined>>): boolean {
  return searchParams[LOGIN_FAILURE_PARAMETER] === "1";
}
