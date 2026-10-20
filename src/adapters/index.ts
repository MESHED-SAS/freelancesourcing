// Adaptateurs : implémentations simulées, puis réelles, des contrats du domaine.
// Dépend de src/domain/ et de la bibliothèque du service concerné ; choix par variables d'environnement.
// Voir CLAUDE.md §2 et docs/technique/architecture-cible-et-mocks.md §2.1.

// P1 Clock : horloge simulée et horloge système.
export { SimulatedClock } from "./clock/simulated-clock.js";
export { SystemClock } from "./clock/system-clock.js";

// P2 AuthProvider : personas fictifs (mock ; jetons devinables, jamais activé par défaut).
export { PersonaAuthProvider } from "./auth/persona-auth-provider.js";
export { PERSONAS, type Persona } from "./auth/personas.js";

// P10 AuditLog : journal en mémoire (mock ; perdu à l'arrêt du processus).
export { InMemoryAuditLog } from "./audit/in-memory-audit-log.js";
