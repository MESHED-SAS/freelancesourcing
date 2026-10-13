// Cas d'usage « authentifier une session » (US-02, critères 3 et 4) : à partir du jeton de session
// reçu (cookie, donc entrée non fiable), identifie l'utilisateur par le contrat AuthProvider (P2)
// et refuse les adresses email jetables, quel que soit le rôle.
//
// Ordre des contrôles : 1. jeton absent ou mal formé (le fournisseur n'est pas appelé) ;
// 2. session inconnue (le fournisseur renvoie null) ; 3. adresse jetable (liste reçue en
// paramètre : ce dossier ne peut importer que le domaine). Ces issues ne lèvent jamais
// d'exception : le résultat est typé et gelé. Une promesse rejetée par le fournisseur (panne) est
// propagée telle quelle : ni refus, ni acceptation.
//
// Les messages ne reprennent ni l'adresse email (donnée personnelle) ni le jeton (secret).
// L'utilisateur est renvoyé tel que fourni par le fournisseur.
import { type AuthenticatedUser, type AuthProvider, isDisposableEmail, SessionToken } from "../domain/index.js";

export type AuthenticationRefusalReason = "invalid-session-token" | "unknown-session" | "disposable-email";

export type AuthenticationResult =
  | { readonly ok: true; readonly user: AuthenticatedUser }
  | { readonly ok: false; readonly reason: AuthenticationRefusalReason; readonly message: string };

export interface AuthenticateSessionDependencies {
  readonly authProvider: AuthProvider;
  readonly disposableDomains: readonly string[];
}

const REFUSAL_MESSAGES: Readonly<Record<AuthenticationRefusalReason, string>> = {
  "invalid-session-token": "le jeton de session est absent ou mal formé.",
  "unknown-session": "session inconnue ou expirée.",
  "disposable-email": "les adresses email jetables ne sont pas acceptées.",
};

function refused(reason: AuthenticationRefusalReason): AuthenticationResult {
  return Object.freeze({ ok: false, reason, message: `Connexion refusée : ${REFUSAL_MESSAGES[reason]}` });
}

// rawToken vaut undefined quand le cookie est absent.
export async function authenticateSession(
  dependencies: AuthenticateSessionDependencies,
  rawToken: string | undefined,
): Promise<AuthenticationResult> {
  if (rawToken === undefined) return refused("invalid-session-token");
  const parsed = SessionToken.parse(rawToken);
  if (!parsed.ok) return refused("invalid-session-token");
  const user = await dependencies.authProvider.identify(parsed.token);
  if (user === null) return refused("unknown-session");
  if (isDisposableEmail(user.email, dependencies.disposableDomains)) return refused("disposable-email");
  return Object.freeze({ ok: true, user });
}
