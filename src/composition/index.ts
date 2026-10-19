// Racine de composition : assemble les adaptateurs selon la configuration et les fournit aux cas d'usage.
// Dépend de src/domain/, src/use-cases/ et src/adapters/ ; aucun paquet externe ; ne lit pas l'environnement.
// Voir CLAUDE.md §2 et docs/technique/architecture-cible-et-mocks.md §2.1.

// P1 Clock : horloge système ou simulée.
export { createClock, type ClockConfig } from "./create-clock.js";

// P2 AuthProvider : personas fictifs (choix explicite obligatoire) ; domaines jetables (US-02, critère 4).
export { createAuthProvider, type AuthProviderConfig } from "./create-auth-provider.js";
export { DISPOSABLE_DOMAINS } from "./disposable-domains.js";

// Environnement d'exécution et garde des composants simulés (P1 horloge, P2 authentification).
export { isMockAllowed, type AppEnvironment } from "./environment.js";
