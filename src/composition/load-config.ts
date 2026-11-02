// Racine de composition : traduit les variables d'environnement en configuration (US-02c, CA3).
// Fonction pure : l'objet des variables est reçu en paramètre (le point d'entrée de l'application
// le fournira) ; elle ne le modifie pas et ne lit pas l'environnement du processus elle-même.
// APP_ENV absent = « production » (échec fermé). Toute autre valeur que les trois environnements,
// chaîne vide, casse différente ou espaces compris, lève une erreur : ni repli, ni normalisation.
// ADAPTER_CLOCK, ADAPTER_AUTH et ADAPTER_AUDIT_LOG sont transmis tels quels : leur validation
// reste dans createClock, createAuthProvider et createAuditLog.
// simulatedStart n'est pas lu (hors périmètre de l'US-02c) : « simulated » sera donc refusé par
// createClock (« Configuration incomplète »).

import { APP_ENVIRONMENTS, type AppEnvironment } from "./environment.js";

// Se passe telle quelle à createClock, createAuthProvider et createAuditLog.
export interface AppConfig {
  readonly environment: AppEnvironment;
  readonly adapterClock: string | undefined;
  readonly adapterAuth: string | undefined;
  readonly adapterAuditLog: string | undefined;
}

export function loadConfig(env: Readonly<Record<string, string | undefined>>): AppConfig {
  return {
    environment: parseAppEnvironment(env["APP_ENV"]),
    adapterClock: env["ADAPTER_CLOCK"],
    adapterAuth: env["ADAPTER_AUTH"],
    adapterAuditLog: env["ADAPTER_AUDIT_LOG"],
  };
}

function parseAppEnvironment(value: string | undefined): AppEnvironment {
  if (value === undefined) {
    return "production";
  }
  // Comparaison exacte, casse comprise, sans normalisation.
  const environment = APP_ENVIRONMENTS.find((candidate) => candidate === value);
  if (environment === undefined) {
    const accepted = APP_ENVIRONMENTS.map((candidate) => `« ${candidate} »`).join(", ");
    throw new Error(`Valeur inconnue pour APP_ENV : « ${value} » (valeurs acceptées : ${accepted}).`);
  }
  return environment;
}
