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
