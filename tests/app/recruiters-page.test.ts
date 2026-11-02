// Tests de la décision d'accès à la page réservée aux recruteurs (US-02c, CA9) : anonyme → renvoi
// vers la connexion ; recruteur → accès ; freelance et admin → refus (403), journalisé par
// authorizeRole avec la cible « page:recruteurs ». Une panne du journal sur un refus est propagée :
// jamais d'accès (échec fermé). Identifiants stables PG1 à PG7, cités par les preuves par mutation.
// Le journal est une fausse implémentation de AuditLog définie ici ; l'horloge est fixe. Les
// identifiants et adresses sont neutres (test-user-a, …). Les valeurs attendues sont écrites en dur.
import { describe, expect, it } from "vitest";
import { decideRecruitersPage, RECRUITERS_PAGE_TARGET } from "../../src/app/session/session.js";
import type { AuditEntry, AuditLog } from "../../src/domain/audit/audit-log.js";
import type { AuthenticatedUser } from "../../src/domain/identity/authenticated-user.js";
import { EmailAddress } from "../../src/domain/identity/email-address.js";
import type { Role } from "../../src/domain/identity/role.js";
import { UserId } from "../../src/domain/identity/user-id.js";
import type { Clock } from "../../src/domain/time/clock.js";
import { Instant } from "../../src/domain/time/instant.js";

function user(id: string, role: Role, rawEmail: string): AuthenticatedUser {
  const result = EmailAddress.parse(rawEmail);
  if (!result.ok) throw new Error(`Adresse refusée à tort : ${rawEmail} (${result.reason})`);
  return Object.freeze({ id: UserId.of(id), role, email: result.email });
}

const FREELANCER = user("test-user-a", "freelancer", "user-a@exemple.test");
const RECRUITER = user("test-user-b", "recruiter", "user-b@cabinet.example");
const ADMIN = user("test-user-c", "admin", "user-c@exemple.test");

// Lundi 2 novembre 2026, 10 h 00 (UTC).
const NOW = Instant.fromEpochMilliseconds(1_793_613_600_000);
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

function failingAuditLog(failure: Error): AuditLog {
  return { append: () => Promise.reject(failure), list: () => Promise.resolve([]) };
}

describe("decideRecruitersPage", () => {
  it("PG1 : anonyme : renvoi vers la connexion, journal vide", async () => {
    const auditLog = new FakeAuditLog();
    expect(await decideRecruitersPage({ auditLog, clock: FIXED_CLOCK }, { kind: "anonymous" })).toStrictEqual({
      kind: "login",
    });
    expect(auditLog.entries).toHaveLength(0);
  });

  it("PG2 : recruteur : accès, utilisateur renvoyé tel quel, résultat gelé, journal vide", async () => {
    const auditLog = new FakeAuditLog();
    const decision = await decideRecruitersPage({ auditLog, clock: FIXED_CLOCK }, { kind: "user", user: RECRUITER });
    expect(decision).toStrictEqual({ kind: "allow", user: RECRUITER });
    expect(decision.kind === "allow" && decision.user).toBe(RECRUITER);
    expect(Object.isFrozen(decision)).toBe(true);
    expect(auditLog.entries).toHaveLength(0);
  });

  it("PG3 : freelance : refus, une entrée (acteur, rôle, action, cible « page:recruteurs », date de l'horloge)", async () => {
    const auditLog = new FakeAuditLog();
    expect(
      await decideRecruitersPage({ auditLog, clock: FIXED_CLOCK }, { kind: "user", user: FREELANCER }),
    ).toStrictEqual({ kind: "forbidden" });
    expect(auditLog.entries).toEqual([
      {
        occurredAt: NOW,
        actor: FREELANCER.id,
        actorRole: "freelancer",
        action: "role-refused",
        target: "page:recruteurs",
      },
    ]);
    expect(auditLog.entries[0]?.occurredAt).toBe(NOW);
    expect(RECRUITERS_PAGE_TARGET).toBe("page:recruteurs");
  });

  it("PG4 : admin : refus (aucune hiérarchie), entrée avec actorRole « admin »", async () => {
    const auditLog = new FakeAuditLog();
    expect(await decideRecruitersPage({ auditLog, clock: FIXED_CLOCK }, { kind: "user", user: ADMIN })).toStrictEqual(
      { kind: "forbidden" },
    );
    expect(auditLog.entries).toEqual([
      { occurredAt: NOW, actor: ADMIN.id, actorRole: "admin", action: "role-refused", target: "page:recruteurs" },
    ]);
  });

  it("PG5 : deux refus : deux entrées, dans l'ordre", async () => {
    const auditLog = new FakeAuditLog();
    await decideRecruitersPage({ auditLog, clock: FIXED_CLOCK }, { kind: "user", user: FREELANCER });
    await decideRecruitersPage({ auditLog, clock: FIXED_CLOCK }, { kind: "user", user: ADMIN });
    expect(auditLog.entries.map((entry) => [entry.actor.value, entry.actorRole, entry.target])).toEqual([
      ["test-user-a", "freelancer", "page:recruteurs"],
      ["test-user-c", "admin", "page:recruteurs"],
    ]);
  });

  it.each([
    ["freelance", FREELANCER],
    ["admin", ADMIN],
  ])("PG6 : %s avec un journal en panne : promesse rejetée avec la même erreur, jamais d'accès", async (_label, currentUser) => {
    const failure = new Error("Journal indisponible");
    await expect(
      decideRecruitersPage({ auditLog: failingAuditLog(failure), clock: FIXED_CLOCK }, { kind: "user", user: currentUser }),
    ).rejects.toBe(failure);
  });

  it("PG7 : recruteur avec un journal en panne : accès (le journal n'est pas appelé à l'accord)", async () => {
    const decision = await decideRecruitersPage(
      { auditLog: failingAuditLog(new Error("Journal indisponible")), clock: FIXED_CLOCK },
      { kind: "user", user: RECRUITER },
    );
    expect(decision).toStrictEqual({ kind: "allow", user: RECRUITER });
  });
});
