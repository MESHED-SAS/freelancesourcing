// Racine de composition, P1 Clock : choisit l'horloge (système ou simulée) selon la configuration.
// La configuration est reçue en paramètre : cette fonction ne lit ni process ni l'environnement.
// Aucun repli silencieux : une valeur inconnue ou une configuration incohérente lève une erreur.

import { SimulatedClock, SystemClock } from "../adapters/index.js";
import type { Clock, Instant } from "../domain/index.js";

export interface ClockConfig {
  // « system » (par défaut si absent) ou « simulated ». Chaîne libre : la valeur pourra venir
  // d'une variable d'environnement ; elle est vérifiée ici.
  readonly adapterClock?: string | undefined;
  // Instant de départ de l'horloge simulée : obligatoire avec « simulated », refusé sinon.
  readonly simulatedStart?: Instant | undefined;
}

export function createClock(config: ClockConfig): Clock {
  const adapter = config.adapterClock ?? "system";
  if (adapter === "system") {
    if (config.simulatedStart !== undefined) {
      throw new Error(
        "Configuration incohérente : simulatedStart n'est accepté qu'avec adapterClock « simulated » (horloge retenue : « system »).",
      );
    }
    return new SystemClock();
  }
  if (adapter === "simulated") {
    if (config.simulatedStart === undefined) {
      throw new Error("Configuration incomplète : adapterClock « simulated » exige simulatedStart.");
    }
    return new SimulatedClock(config.simulatedStart);
  }
  throw new Error(`Valeur inconnue pour adapterClock : « ${adapter} » (valeurs acceptées : « system », « simulated »).`);
}
