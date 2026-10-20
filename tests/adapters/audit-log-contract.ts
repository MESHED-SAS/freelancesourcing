// Tests de contrat du contrat P10 AuditLog (version minimale, US-02b), partagés par tous les
// adaptateurs (architecture §4 : les mêmes tests sont exécutés sur le simulé et, plus tard, sur le
// réel). Identifiants stables L1 à L8, cités par les preuves par mutation. La fabrique fournit un
// journal neuf à chaque appel ; chaque cas appelle append et list directement : aucune enveloppe
// (try/catch, Promise.resolve) ne masque une exception synchrone.
// Identifiants neutres et instants fixes : aucune donnée de persona, aucune horloge.
import { describe, expect, it } from "vitest";
import type { AuditEntry, AuditLog } from "../../src/domain/audit/audit-log.js";
import { UserId } from "../../src/domain/identity/user-id.js";
import { Instant } from "../../src/domain/time/instant.js";

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

function entry(epochMilliseconds: number, actor: string, target: string): Mutable<AuditEntry> {
  return {
    occurredAt: Instant.fromEpochMilliseconds(epochMilliseconds),
    actor: UserId.of(actor),
    actorRole: "freelancer",
    action: "role-refused",
    target,
  };
}

const ENTRY_A = entry(1_760_000_000_000, "test-user-a", "cible-a");
const ENTRY_B = entry(1_760_000_001_000, "test-user-b", "cible-b");
const ENTRY_C = entry(1_760_000_002_000, "test-user-c", "cible-c");

export function describeAuditLogContract(name: string, setup: () => AuditLog): void {
  describe(`contrat AuditLog : ${name}`, () => {
    it("L1 : un journal neuf est vide", async () => {
      expect(await setup().list()).toEqual([]);
    });

    it("L2 : après un ajout, la lecture renvoie une entrée équivalente", async () => {
      const log = setup();
      await log.append(ENTRY_A);
      const entries = await log.list();
      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual(ENTRY_A);
      expect(entries[0]?.occurredAt.equals(ENTRY_A.occurredAt)).toBe(true);
      expect(entries[0]?.actor.equals(ENTRY_A.actor)).toBe(true);
    });

    it("L3 : l'ordre d'insertion est conservé sur trois entrées", async () => {
      const log = setup();
      await log.append(ENTRY_B);
      await log.append(ENTRY_A);
      await log.append(ENTRY_C);
      expect((await log.list()).map((e) => e.target)).toEqual(["cible-b", "cible-a", "cible-c"]);
    });

    it("L4 : la liste renvoyée est gelée et ne suit pas les ajouts suivants", async () => {
      const log = setup();
      await log.append(ENTRY_A);
      const first = await log.list();
      expect(Object.isFrozen(first)).toBe(true);
      await log.append(ENTRY_B);
      expect(first).toHaveLength(1);
      expect(await log.list()).toHaveLength(2);
    });

    it("L5 : les entrées renvoyées sont gelées", async () => {
      const log = setup();
      await log.append(ENTRY_A);
      await log.append(ENTRY_B);
      for (const stored of await log.list()) {
        expect(Object.isFrozen(stored)).toBe(true);
      }
    });

    it("L6 : modifier l'objet passé à append après coup n'altère pas le journal", async () => {
      const log = setup();
      const passed = entry(1_760_000_000_000, "test-user-a", "cible-a");
      await log.append(passed);
      passed.target = "cible-modifiee";
      passed.actor = UserId.of("test-user-z");
      passed.actorRole = "admin";
      const entries = await log.list();
      expect(entries).toEqual([ENTRY_A]);
      expect(entries[0]).not.toBe(passed);
    });

    // Une exception synchrone lève dès l'appel et fait échouer le test ; une promesse rejetée
    // le fait échouer à l'attente.
    it("L7 : append et list renvoient une promesse résolue, sans exception synchrone", async () => {
      const log = setup();
      const appended = log.append(ENTRY_A);
      expect(appended).toBeInstanceOf(Promise);
      await expect(appended).resolves.toBeUndefined();
      const listed = log.list();
      expect(listed).toBeInstanceOf(Promise);
      await listed;
    });

    it("L8 : deux journaux créés par la fabrique sont indépendants", async () => {
      const first = setup();
      const second = setup();
      await first.append(ENTRY_A);
      expect(await second.list()).toEqual([]);
      await second.append(ENTRY_B);
      expect((await first.list()).map((e) => e.target)).toEqual(["cible-a"]);
      expect((await second.list()).map((e) => e.target)).toEqual(["cible-b"]);
    });
  });
}
