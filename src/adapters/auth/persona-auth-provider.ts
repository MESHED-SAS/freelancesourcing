// Adaptateur simulé du contrat P2 AuthProvider : identifie l'un des six personas fictifs à partir
// de son jeton de session (voir personas.ts). Recherche par égalité exacte de la valeur du jeton
// (casse comprise, sans correspondance partielle) ; jeton inconnu : null.
// Jetons devinables : jamais activé par défaut (voir src/composition/create-auth-provider.ts).
import type { AuthProvider } from "../../domain/identity/auth-provider.js";
import type { AuthenticatedUser } from "../../domain/identity/authenticated-user.js";
import type { SessionToken } from "../../domain/identity/session-token.js";
import { PERSONAS } from "./personas.js";

// Table construite une fois, à partir de PERSONAS. L'unicité des jetons est vérifiée par les tests
// des données (en cas de doublon, Map garderait le dernier).
const USERS_BY_TOKEN: ReadonlyMap<string, AuthenticatedUser> = new Map(
  PERSONAS.map((persona) => [persona.token, persona.user]),
);

export class PersonaAuthProvider implements AuthProvider {
  async identify(session: SessionToken): Promise<AuthenticatedUser | null> {
    return USERS_BY_TOKEN.get(session.value) ?? null;
  }
}
