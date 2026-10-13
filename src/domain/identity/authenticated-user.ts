// Utilisateur connecté, tel que fourni par le contrat AuthProvider (P2) : identifiant, rôle et
// adresse email (US-02, critère 3). Lecture seule. Simple type, sans code exécuté : ses
// garanties sont contrôlées par le compilateur.
import type { EmailAddress } from "./email-address.js";
import type { Role } from "./role.js";
import type { UserId } from "./user-id.js";

export interface AuthenticatedUser {
  readonly id: UserId;
  readonly role: Role;
  readonly email: EmailAddress;
}
