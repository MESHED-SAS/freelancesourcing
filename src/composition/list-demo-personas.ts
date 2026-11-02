// Racine de composition, personas de démonstration (US-02c) : ce que l'écran de connexion peut
// afficher, et la résolution côté serveur du choix de l'utilisateur.
// listDemoPersonas renvoie, pour chaque persona, sa key (identifiant de l'utilisateur), son libellé
// et son rôle : jamais le jeton ni l'adresse. resolveDemoPersonaToken traduit une key en jeton,
// par égalité exacte (casse et espaces compris) ; key inconnue ou vide : null.
// Les deux fonctions passent par la même garde que createAuthProvider, avant toute recherche :
// refusées en production, et sans « personas » choisi explicitement.
// La configuration est reçue en paramètre : ce module ne lit pas l'environnement.

import { PERSONAS } from "../adapters/index.js";
import type { Role } from "../domain/index.js";
import { assertPersonasAdapterAllowed, type AuthProviderConfig } from "./create-auth-provider.js";

export interface DemoPersonaChoice {
  readonly key: string;
  readonly label: string;
  readonly role: Role;
}

export function listDemoPersonas(config: AuthProviderConfig): DemoPersonaChoice[] {
  assertPersonasAdapterAllowed(config);
  return PERSONAS.map((persona) => ({ key: persona.user.id.value, label: persona.label, role: persona.user.role }));
}

export function resolveDemoPersonaToken(config: AuthProviderConfig, key: string): string | null {
  assertPersonasAdapterAllowed(config);
  return PERSONAS.find((persona) => persona.user.id.value === key)?.token ?? null;
}
