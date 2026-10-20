// Racine de composition, P10 AuditLog : choisit le journal d'audit selon la configuration.
// La configuration est reçue en paramètre : cette fonction ne lit ni process ni l'environnement.
// Aucune valeur par défaut : le seul journal disponible est en mémoire, perdu à l'arrêt du processus ;
// il doit être choisi explicitement. Une valeur absente ou inconnue lève une erreur.
// « in-memory » est un composant simulé : il est refusé hors des environnements development et staging.

import { InMemoryAuditLog } from "../adapters/index.js";
import type { AuditLog } from "../domain/index.js";
import { isMockAllowed, type AppEnvironment } from "./environment.js";

export interface AuditLogConfig {
  // Environnement d'exécution, obligatoire et sans valeur par défaut ici : le défaut « production »
  // quand la variable est absente relève de loadConfig.
  readonly environment: AppEnvironment;
  // « in-memory » (seule valeur acceptée, casse exacte ; development et staging uniquement). Chaîne
  // libre : la valeur pourra venir d'une variable d'environnement ; elle est vérifiée ici.
  readonly adapterAuditLog?: string | undefined;
}

export function createAuditLog(config: AuditLogConfig): AuditLog {
  const adapter = config.adapterAuditLog;
  if (adapter === undefined) {
    throw new Error("Configuration incomplète : adapterAuditLog est obligatoire (valeur acceptée : « in-memory »).");
  }
  if (adapter === "in-memory") {
    if (!isMockAllowed(config.environment)) {
      throw new Error(
        "Configuration refusée : l'adaptateur de journal d'audit « in-memory » est simulé, et l'environnement ne l'autorise pas (environnements autorisés : development, staging).",
      );
    }
    return new InMemoryAuditLog();
  }
  throw new Error(`Valeur inconnue pour adapterAuditLog : « ${adapter} » (valeur acceptée : « in-memory »).`);
}
