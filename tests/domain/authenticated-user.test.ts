// Tests du type AuthenticatedUser (utilisateur connecté) et du type Role.
// AuthenticatedUser est un simple type : les cas « refusé » sont des contrôles du compilateur
// (@ts-expect-error), vérifiés par tsc dans npm test. Si l'erreur attendue disparaît, tsc
// signale la directive inutile et le test échoue.
import { describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "../../src/domain/identity/authenticated-user.js";
import { EmailAddress } from "../../src/domain/identity/email-address.js";
import type { Role } from "../../src/domain/identity/role.js";
import { UserId } from "../../src/domain/identity/user-id.js";

// Adresse fictive attendue valide : échoue avec la raison du refus sinon.
function email(raw: string): EmailAddress {
  const result = EmailAddress.parse(raw);
  if (!result.ok) throw new Error(`Adresse refusée à tort : ${raw} (${result.reason})`);
  return result.email;
}

function sophie(): AuthenticatedUser {
  return { id: UserId.of("persona-sophie"), role: "freelancer", email: email("sophie@exemple.test") };
}

describe("AuthenticatedUser : identifiant, rôle et email (US-02, critère 3)", () => {
  it("expose l'identifiant, le rôle et l'email de Sophie", () => {
    const user = sophie();
    expect(user.id.value).toBe("persona-sophie");
    expect(user.role).toBe("freelancer");
    expect(user.email.value).toBe("sophie@exemple.test");
  });

  const roles: readonly Role[] = ["freelancer", "recruiter", "admin"];

  it.each(roles)("accepte le rôle %s", (role) => {
    const user: AuthenticatedUser = { ...sophie(), role };
    expect(user.role).toBe(role);
  });
});

describe("AuthenticatedUser : contrôles de type (vérifiés par tsc)", () => {
  it("refuse « moe » comme rôle : MOA et MOE sont des attributs de profil", () => {
    const user: AuthenticatedUser = {
      id: UserId.of("persona-marc"),
      // @ts-expect-error « moe » n'est pas un Role.
      role: "moe",
      email: email("marc@exemple.test"),
    };
    expect(user.id.value).toBe("persona-marc");
  });

  it("refuse de modifier le rôle (lecture seule)", () => {
    const user = sophie();
    // Jamais appelée : seul le compilateur examine cette affectation.
    const promote = (): void => {
      // @ts-expect-error role est en lecture seule.
      user.role = "admin";
    };
    expect(typeof promote).toBe("function");
    expect(user.role).toBe("freelancer");
  });

  it("refuse une chaîne brute à la place d'une EmailAddress validée", () => {
    const user: AuthenticatedUser = {
      id: UserId.of("persona-julie"),
      role: "freelancer",
      // @ts-expect-error une adresse doit passer par EmailAddress.parse.
      email: "julie@exemple.test",
    };
    expect(user.id.value).toBe("persona-julie");
  });
});
