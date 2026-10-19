// Racine de composition, P2 AuthProvider : choisit le fournisseur d'authentification selon la configuration.
// La configuration est reçue en paramètre : cette fonction ne lit ni process ni l'environnement.
// Aucune valeur par défaut : le seul fournisseur disponible est le mock des personas, dont les jetons
// sont devinables ; il doit être choisi explicitement. Une valeur absente ou inconnue lève une erreur.
// « personas » est un composant simulé : il est refusé hors des environnements development et staging.

import { PersonaAuthProvider } from "../adapters/index.js";
import type { AuthProvider } from "../domain/index.js";
import { isMockAllowed, type AppEnvironment } from "./environment.js";

export interface AuthProviderConfig {
  // Environnement d'exécution, obligatoire et sans valeur par défaut ici : le défaut « production »
  // quand la variable est absente relève de loadConfig.
  readonly environment: AppEnvironment;
  // « personas » (seule valeur acceptée, casse exacte ; development et staging uniquement). Chaîne
  // libre : la valeur pourra venir d'une variable d'environnement ; elle est vérifiée ici.
  readonly adapterAuth?: string | undefined;
}

export function createAuthProvider(config: AuthProviderConfig): AuthProvider {
  const adapter = config.adapterAuth;
  if (adapter === undefined) {
    throw new Error(
      "Configuration incomplète : adapterAuth est obligatoire (valeur acceptée : « personas »). Aucun fournisseur d'authentification n'est choisi par défaut : les jetons des personas sont devinables.",
    );
  }
  if (adapter === "personas") {
    if (!isMockAllowed(config.environment)) {
      throw new Error(
        "Configuration refusée : l'adaptateur d'authentification « personas » est simulé, et l'environnement ne l'autorise pas (environnements autorisés : development, staging).",
      );
    }
    return new PersonaAuthProvider();
  }
  throw new Error(`Valeur inconnue pour adapterAuth : « ${adapter} » (valeur acceptée : « personas »).`);
}
