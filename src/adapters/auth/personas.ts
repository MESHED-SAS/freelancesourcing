// Personas fictifs du mock du contrat P2 AuthProvider (US-02, critère 1) : Sophie, Karim, Julie et
// Marc (freelances), un recruteur d'Alpha Conseil et un administrateur. Données fictives
// uniquement : adresses en domaines réservés (.example, .test). Les jetons sont devinables : ce
// mock n'est jamais activé par défaut (voir src/composition/create-auth-provider.ts).
// Tableau, personas et utilisateurs gelés.
import type { AuthenticatedUser } from "../../domain/identity/authenticated-user.js";
import { EmailAddress } from "../../domain/identity/email-address.js";
import type { Role } from "../../domain/identity/role.js";
import { UserId } from "../../domain/identity/user-id.js";

export interface Persona {
  // Valeur brute du jeton de session (celle du cookie), acceptée par SessionToken.parse.
  readonly token: string;
  readonly user: AuthenticatedUser;
}

// Une adresse refusée est une erreur de programmation : exception au chargement du module.
// Le message reprend celui d'EmailAddress, qui ne cite pas l'adresse.
function persona(token: string, id: string, role: Role, rawEmail: string): Persona {
  const parsed = EmailAddress.parse(rawEmail);
  if (!parsed.ok) {
    throw new RangeError(`Persona ${id} : ${parsed.message}`);
  }
  const user: AuthenticatedUser = Object.freeze({ id: UserId.of(id), role, email: parsed.email });
  return Object.freeze({ token, user });
}

export const PERSONAS: readonly Persona[] = Object.freeze([
  persona("demo-sophie", "persona-sophie", "freelancer", "sophie@exemple.test"),
  persona("demo-karim", "persona-karim", "freelancer", "karim@exemple.test"),
  persona("demo-julie", "persona-julie", "freelancer", "julie@exemple.test"),
  persona("demo-marc", "persona-marc", "freelancer", "marc@exemple.test"),
  persona("demo-alpha-conseil", "persona-alpha-conseil", "recruiter", "recrutement@alpha-conseil.example"),
  persona("demo-admin", "persona-admin", "admin", "admin@meshed.example"),
]);
