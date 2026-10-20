// Tests du cas d'usage authorizeRole (US-02b, critères 1 à 4 et 6). Identifiants stables Z1 à Z10,
// cités par les preuves par mutation. Le journal est une fausse implémentation de AuditLog définie
// ici, et non l'adaptateur en mémoire : elle enregistre chaque entrée reçue. L'horloge est fixe.
// Les identifiants et adresses sont neutres (test-user-a, …) : ils n'imitent pas les personas.
import { describe, expect, it } from "vitest";
import type { AuditEntry, AuditLog } from "../../src/domain/audit/audit-log.js";
import type { AuthenticatedUser } from "../../src/domain/identity/authenticated-user.js";
import { EmailAddress } from "../../src/domain/identity/email-address.js";
import type { Role } from "../../src/domain/identity/role.js";
import { UserId } from "../../src/domain/identity/user-id.js";
import type { Clock } from "../../src/domain/time/clock.js";
import { Instant } from "../../src/domain/time/instant.js";
import { type AuthorizationResult, authorizeRole } from "../../src/use-cases/authorize-role.js";

const REFUSAL_MESSAGE = "Accès refusé : votre rôle ne permet pas cette action.";
const RECRUITER_ONLY = Object.freeze({ target: "page-recruteurs", allowedRoles: ["recruiter"] as const });

function user(id: string, role: Role, rawEmail: string): AuthenticatedUser {
  const result = EmailAddress.parse(rawEmail);
  if (!result.ok) throw new Error(`Adresse refusée à tort : ${rawEmail} (${result.reason})`);
  return Object.freeze({ id: UserId.of(id), role, email: result.email });
}

const FREELANCER = user("test-user-a", "freelancer", "user-a@exemple.test");
const RECRUITER = user("test-user-b", "recruiter", "user-b@cabinet.example");
const ADMIN = user("test-user-c", "admin", "user-c@exemple.test");

// Mardi 20 octobre 2026, 10 h 00 (UTC).
const NOW = Instant.fromEpochMilliseconds(1_792_490_400_000);
const FIXED_CLOCK: Clock = { now: () => NOW };

// Fausse implémentation : enregistre chaque entrée reçue, dans l'ordre.
class FakeAuditLog implements AuditLog {
  readonly entries: AuditEntry[] = [];

  async append(entry: AuditEntry): Promise<void> {
    this.entries.push(entry);
  }

  async list(): Promise<readonly AuditEntry[]> {
    return [...this.entries];
  }
}

function authorize(
  currentUser: AuthenticatedUser,
  requirement: { readonly target: string; readonly allowedRoles: readonly Role[] } = RECRUITER_ONLY,
  auditLog: AuditLog = new FakeAuditLog(),
  clock: Clock = FIXED_CLOCK,
): Promise<AuthorizationResult> {
  return authorizeRole({ auditLog, clock }, currentUser, requirement);
}

describe("authorizeRole : accord et refus (critères 1 et 2)", () => {
  it("Z1 : un rôle autorisé est accepté, l'utilisateur est renvoyé tel quel et le journal reste vide", async () => {
    const auditLog = new FakeAuditLog();
    const result = await authorize(RECRUITER, RECRUITER_ONLY, auditLog);
    expect(result).toEqual({ ok: true, user: RECRUITER });
    expect(result.ok && result.user).toBe(RECRUITER);
    expect(auditLog.entries).toHaveLength(0);
  });

  it("Z2 : un rôle absent de la liste est refusé (role-not-allowed), avec une seule entrée au journal", async () => {
    const auditLog = new FakeAuditLog();
    expect(await authorize(FREELANCER, RECRUITER_ONLY, auditLog)).toEqual({
      ok: false,
      reason: "role-not-allowed",
      message: REFUSAL_MESSAGE,
    });
    expect(auditLog.entries).toHaveLength(1);
  });
});

describe("authorizeRole : entrées du journal (critère 4)", () => {
  it("Z3 : l'entrée contient la date de l'horloge, l'acteur, son rôle, l'action et la cible", async () => {
    const auditLog = new FakeAuditLog();
    await authorize(FREELANCER, RECRUITER_ONLY, auditLog);
    expect(auditLog.entries).toEqual([
      {
        occurredAt: NOW,
        actor: FREELANCER.id,
        actorRole: "freelancer",
        action: "role-refused",
        target: "page-recruteurs",
      },
    ]);
    expect(auditLog.entries[0]?.occurredAt).toBe(NOW);
    expect(auditLog.entries[0]?.actor).toBe(FREELANCER.id);
  });

  it("Z4 : deux refus ajoutent deux entrées, dans l'ordre", async () => {
    const auditLog = new FakeAuditLog();
    await authorize(FREELANCER, { target: "cible-1", allowedRoles: ["recruiter"] }, auditLog);
    await authorize(RECRUITER, { target: "cible-2", allowedRoles: ["admin"] }, auditLog);
    expect(auditLog.entries.map((entry) => [entry.actor.value, entry.actorRole, entry.target])).toEqual([
      ["test-user-a", "freelancer", "cible-1"],
      ["test-user-b", "recruiter", "cible-2"],
    ]);
  });
});

describe("authorizeRole : aucune hiérarchie (critère 3)", () => {
  it("Z5 : admin est refusé sur une cible réservée aux recruteurs, et journalisé comme admin", async () => {
    const auditLog = new FakeAuditLog();
    expect(await authorize(ADMIN, RECRUITER_ONLY, auditLog)).toMatchObject({ ok: false, reason: "role-not-allowed" });
    expect(auditLog.entries).toHaveLength(1);
    expect(auditLog.entries[0]).toMatchObject({ actor: ADMIN.id, actorRole: "admin" });
  });

  it("Z6 : avec une liste vide, tous les rôles sont refusés", async () => {
    const auditLog = new FakeAuditLog();
    for (const currentUser of [FREELANCER, RECRUITER, ADMIN]) {
      expect(await authorize(currentUser, { target: "cible-fermee", allowedRoles: [] }, auditLog)).toMatchObject({
        ok: false,
        reason: "role-not-allowed",
      });
    }
    expect(auditLog.entries.map((entry) => entry.actorRole)).toEqual(["freelancer", "recruiter", "admin"]);
  });
});

describe("authorizeRole : gel, messages, pannes et cible", () => {
  it("Z7 : les deux issues renvoient un résultat gelé", async () => {
    const accepted = await authorize(RECRUITER);
    expect(accepted.ok).toBe(true);
    expect(Object.isFrozen(accepted)).toBe(true);
    const refusal = await authorize(FREELANCER);
    expect(refusal.ok).toBe(false);
    expect(Object.isFrozen(refusal)).toBe(true);
  });

  it("Z8 : le message de refus ne reprend ni l'adresse email, ni l'identifiant, ni la cible", async () => {
    const target = "cible-tres-particuliere";
    const refusal = await authorize(FREELANCER, { target, allowedRoles: ["recruiter"] });
    expect(refusal).toMatchObject({ ok: false, reason: "role-not-allowed" });
    const message = refusal.ok ? "" : refusal.message;
    const { email, id } = FREELANCER;
    for (const fragment of [email.value, email.localPart, email.domain, id.value, target]) {
      expect(message).not.toContain(fragment);
    }
  });

  it("Z9 : une panne du journal (promesse rejetée) est propagée telle quelle : l'accès n'est pas accordé", async () => {
    const failure = new Error("Journal indisponible");
    const auditLog: AuditLog = { append: () => Promise.reject(failure), list: () => Promise.resolve([]) };
    await expect(authorize(FREELANCER, RECRUITER_ONLY, auditLog)).rejects.toBe(failure);
  });

  it("Z10 : une cible vide lève une RangeError, sans ajout au journal, quel que soit le rôle", async () => {
    const auditLog = new FakeAuditLog();
    for (const currentUser of [FREELANCER, RECRUITER]) {
      await expect(authorize(currentUser, { target: "", allowedRoles: ["recruiter"] }, auditLog)).rejects.toThrow(
        RangeError,
      );
    }
    expect(auditLog.entries).toHaveLength(0);
  });
});
