// Règle de rôle (US-02b) : moindre privilège, sans hiérarchie. Chaque action déclare la liste des
// rôles autorisés ; un rôle est autorisé seulement s'il y figure (égalité exacte, casse comprise).
// Aucun rôle n'en hérite un autre : admin n'a aucun droit implicite. Liste vide : aucun rôle
// n'est autorisé.
import type { Role } from "./role.js";

export function isRoleAllowed(role: Role, allowedRoles: readonly Role[]): boolean {
  return allowedRoles.includes(role);
}
