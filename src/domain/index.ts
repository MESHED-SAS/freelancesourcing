// Domaine : règles métier et contrats P1 à P11.
// Ne dépend d'aucun framework ni service externe, et d'aucun autre dossier de src/.
// Voir CLAUDE.md §2 et docs/technique/architecture-cible-et-mocks.md §2.1.

// P1 : temps (jour, instant, fuseau Europe/Paris, jours fériés, jours ouvrés, contrat Clock).
export { addBusinessDays, isBusinessDay } from "./time/business-days.js";
export { currentDay, type Clock } from "./time/clock.js";
export { Day, type DayOfWeek } from "./time/day.js";
export {
  frenchPublicHolidays,
  type FrenchPublicHoliday,
  type FrenchPublicHolidayName,
} from "./time/french-public-holidays.js";
export { Instant } from "./time/instant.js";
export { dayInParis, instantFromParisLocal, localTimeInParis, type LocalTime } from "./time/paris-time-zone.js";

// P2 : identité (rôle, règle de rôle, identifiant, adresse email validée, adresses jetables,
// utilisateur connecté, jeton de session, contrat AuthProvider).
export type { AuthProvider } from "./identity/auth-provider.js";
export type { AuthenticatedUser } from "./identity/authenticated-user.js";
export { isDisposableEmail } from "./identity/disposable-email.js";
export {
  EmailAddress,
  type EmailAddressRejectionReason,
  type EmailAddressResult,
} from "./identity/email-address.js";
export { isRoleAllowed } from "./identity/role-policy.js";
export type { Role } from "./identity/role.js";
export {
  SessionToken,
  type SessionTokenRejectionReason,
  type SessionTokenResult,
} from "./identity/session-token.js";
export { UserId } from "./identity/user-id.js";

// P10 : journal d'audit (version minimale : entrée, action, contrat AuditLog en ajout seul).
export type { AuditAction, AuditEntry, AuditLog } from "./audit/audit-log.js";
