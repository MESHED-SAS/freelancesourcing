// Contrat P10 AuditLog, version minimale (US-02b) : journal des actions sensibles, en ajout seul.
// Le contrat n'offre ni modification ni suppression d'une entrée. Asynchrone, comme le sera la
// future base. Une promesse rejetée par append signale une panne du journal : l'appelant ne doit
// jamais accorder l'accès dans ce cas (échec fermé). Adaptateur simulé : journal en mémoire (voir
// src/adapters/audit/).
// Un seul type d'événement pour l'instant ; l'US-07 ajoutera les autres actions de P10
// (consultation de profil, révélation de coordonnées, modération) et la durée de conservation.
import type { Role } from "../identity/role.js";
import type { UserId } from "../identity/user-id.js";
import type { Instant } from "../time/instant.js";

export type AuditAction = "role-refused";

export interface AuditEntry {
  // Date de l'action, donnée par l'horloge injectée (contrat P1 Clock).
  readonly occurredAt: Instant;
  readonly actor: UserId;
  readonly actorRole: Role;
  readonly action: AuditAction;
  // Ressource ou action visée (par exemple le nom d'une page).
  readonly target: string;
}

export interface AuditLog {
  append(entry: AuditEntry): Promise<void>;
  // Entrées dans l'ordre d'insertion.
  list(): Promise<readonly AuditEntry[]>;
}
