// Contrat P2 AuthProvider : identifie l'utilisateur connecté (identifiant, rôle, email) à partir
// de son jeton de session (US-02, critère 3). Renvoie null si la session est inconnue ou expirée :
// c'est une issue attendue, pas une erreur. Une promesse rejetée signale une panne du
// fournisseur, pas un refus. Adaptateur simulé : personas fictifs (voir src/adapters/auth/).
import type { AuthenticatedUser } from "./authenticated-user.js";
import type { SessionToken } from "./session-token.js";

export interface AuthProvider {
  identify(session: SessionToken): Promise<AuthenticatedUser | null>;
}
