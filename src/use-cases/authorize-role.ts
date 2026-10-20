// Cas d'usage « autoriser selon le rôle » (US-02b, critères 1 à 4 et 6) : décide si l'utilisateur
// connecté peut réaliser une action, d'après la liste des rôles autorisés (moindre privilège, sans
// hiérarchie : voir isRoleAllowed), et journalise chaque refus par le contrat AuditLog (P10).
//
// Ordre : 1. cible vide : RangeError (erreur de programmation), rien n'est journalisé ;
// 2. décision par isRoleAllowed ; 3. refus : une entrée au journal, datée par l'horloge injectée
// (P1), puis résultat de refus ; 4. accord : rien n'est journalisé. Le résultat est typé et gelé.
// Une promesse rejetée par le journal (panne) est propagée telle quelle : l'accès n'est jamais
// accordé (échec fermé).
//
// Le message de refus est fixe : il ne reprend ni l'adresse email, ni l'identifiant, ni la cible.
// L'utilisateur est renvoyé tel que reçu.
import { type AuditLog, type AuthenticatedUser, type Clock, isRoleAllowed, type Role } from "../domain/index.js";

export type AuthorizationRefusalReason = "role-not-allowed";

export type AuthorizationResult =
  | { readonly ok: true; readonly user: AuthenticatedUser }
  | { readonly ok: false; readonly reason: AuthorizationRefusalReason; readonly message: string };

export interface AuthorizeRoleDependencies {
  readonly auditLog: AuditLog;
  readonly clock: Clock;
}

export interface RoleRequirement {
  // Ressource ou action visée (par exemple le nom d'une page) ; chaîne non vide.
  readonly target: string;
  readonly allowedRoles: readonly Role[];
}

const REFUSAL_MESSAGE = "Accès refusé : votre rôle ne permet pas cette action.";

export async function authorizeRole(
  dependencies: AuthorizeRoleDependencies,
  user: AuthenticatedUser,
  requirement: RoleRequirement,
): Promise<AuthorizationResult> {
  const { target, allowedRoles } = requirement;
  if (target.length === 0) {
    throw new RangeError("Cible invalide : chaîne vide (attendu : chaîne non vide).");
  }
  if (isRoleAllowed(user.role, allowedRoles)) return Object.freeze({ ok: true, user });
  await dependencies.auditLog.append({
    occurredAt: dependencies.clock.now(),
    actor: user.id,
    actorRole: user.role,
    action: "role-refused",
    target,
  });
  return Object.freeze({ ok: false, reason: "role-not-allowed", message: REFUSAL_MESSAGE });
}
