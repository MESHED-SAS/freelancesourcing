// Cas d'usage : orchestration des règles et des contrats pour une action de l'utilisateur.
// Dépend uniquement de src/domain/ ; jamais d'un adaptateur précis ni d'un SDK externe.
// Voir CLAUDE.md §2 et docs/technique/architecture-cible-et-mocks.md §2.1.

// US-02 : authentifier une session (contrat AuthProvider, refus des adresses jetables).
export {
  authenticateSession,
  type AuthenticateSessionDependencies,
  type AuthenticationRefusalReason,
  type AuthenticationResult,
} from "./authenticate-session.js";
