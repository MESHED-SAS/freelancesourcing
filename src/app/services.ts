// Services de l'interface (US-02c, CA4 et CA5) : horloge, authentification, journal d'audit,
// domaines jetables et personas de démonstration, créés au premier appel de getServices et
// partagés par toutes les routes. Seul fichier de src/app/ qui importe des valeurs de la
// composition, et importé seulement par runtime-services.ts (décision 28, contrôlée par AR4).
// Fonction pure à environnement injecté : ce fichier ne lit pas l'environnement du processus.
//
// Mémorisation sur globalThis, sous une clé Symbol.for : une page et un gestionnaire de route
// n'ont pas la même copie de ce module (constat de la PR 1), mais partagent globalThis ; un seul
// journal en mémoire sert donc toute l'application.
// Création tout-ou-rien : tout est construit avant d'être mémorisé. Si une étape lève une erreur
// (configuration refusée, incomplète ou inconnue), rien n'est gardé et l'erreur se propage telle
// quelle : l'application ne démarre pas « à moitié » (décision 17 : en production, ou APP_ENV
// absent, aucun service n'est créé).
// L'objet env n'est lu qu'au premier appel réussi : les appels suivants renvoient les mêmes
// services, quel que soit l'env reçu.
// Jamais d'appel à getServices au niveau du module (import) : le build figerait la configuration
// ou échouerait (CLAUDE.md §2).

import {
  type AppEnvironment,
  createAuditLog,
  createAuthProvider,
  createClock,
  type DemoPersonaChoice,
  DISPOSABLE_DOMAINS,
  listDemoPersonas,
  loadConfig,
  resolveDemoPersonaToken,
} from "../composition/index.js";
import type { AuthenticateSessionDependencies, AuthorizeRoleDependencies } from "../use-cases/index.js";

// Se passent tels quels à resolveSession et decideRecruitersPage. Les personas sont liés à la
// configuration : les pages reçoivent une liste prête et une fonction key → jeton, sans jamais
// manipuler environment ni adapterAuth pour les obtenir.
export interface Services extends AuthenticateSessionDependencies, AuthorizeRoleDependencies {
  readonly environment: AppEnvironment;
  readonly demoPersonas: readonly DemoPersonaChoice[];
  readonly resolveDemoPersonaToken: (key: string) => string | null;
}

const SERVICES_KEY: unique symbol = Symbol.for("meshed.app.services");

type ServicesHolder = { [SERVICES_KEY]?: Services };

function holder(): ServicesHolder {
  return globalThis as ServicesHolder;
}

export function getServices(env: Readonly<Record<string, string | undefined>>): Services {
  const existing = holder()[SERVICES_KEY];
  if (existing !== undefined) return existing;
  const config = loadConfig(env);
  const services: Services = Object.freeze({
    environment: config.environment,
    clock: createClock(config),
    authProvider: createAuthProvider(config),
    auditLog: createAuditLog(config),
    disposableDomains: DISPOSABLE_DOMAINS,
    demoPersonas: Object.freeze(listDemoPersonas(config).map((choice) => Object.freeze(choice))),
    resolveDemoPersonaToken: (key: string) => resolveDemoPersonaToken(config, key),
  });
  holder()[SERVICES_KEY] = services;
  return services;
}

// Réservée aux tests : oublie les services mémorisés.
export function resetServicesForTests(): void {
  delete holder()[SERVICES_KEY];
}
