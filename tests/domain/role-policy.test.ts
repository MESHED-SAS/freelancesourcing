// Tests de la règle de rôle (US-02b, critère 3 en partie) : égalité exacte, aucun héritage entre
// rôles, liste vide toujours refusée. Identifiants stables R1 à R5, cités par les preuves par
// mutation.
import { describe, expect, it } from "vitest";
import type { Role } from "../../src/domain/identity/role.js";
import { isRoleAllowed } from "../../src/domain/identity/role-policy.js";

const ROLES: readonly Role[] = ["freelancer", "recruiter", "admin"];

describe("isRoleAllowed : rôle présent ou absent", () => {
  it("R1 : un rôle présent dans la liste est autorisé", () => {
    expect(isRoleAllowed("recruiter", ["recruiter"])).toBe(true);
    expect(isRoleAllowed("freelancer", ["recruiter", "freelancer"])).toBe(true);
  });

  it("R2 : un rôle absent de la liste est refusé", () => {
    expect(isRoleAllowed("freelancer", ["recruiter"])).toBe(false);
  });
});

describe("isRoleAllowed : listes limites et absence d'héritage", () => {
  it("R3 : une liste vide refuse les trois rôles", () => {
    for (const role of ROLES) {
      expect(isRoleAllowed(role, [])).toBe(false);
    }
  });

  it("R4 : admin absent de la liste est refusé (aucun héritage)", () => {
    expect(isRoleAllowed("admin", ["recruiter"])).toBe(false);
    expect(isRoleAllowed("admin", ["freelancer", "recruiter"])).toBe(false);
  });

  it("R5 : une casse différente ne correspond pas (« Recruiter »)", () => {
    // Valeur hors du type Role, telle qu'elle pourrait arriver d'une source non typée.
    expect(isRoleAllowed("recruiter", ["Recruiter" as Role])).toBe(false);
    expect(isRoleAllowed("Recruiter" as Role, ["recruiter"])).toBe(false);
  });
});
