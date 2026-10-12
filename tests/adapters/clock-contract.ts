// Tests de contrat du contrat P1 Clock, partagés par tous les adaptateurs
// (architecture §4 : les mêmes tests sont exécutés sur le simulé et sur le réel).
import { describe, expect, it } from "vitest";
import type { Clock } from "../../src/domain/time/clock.js";
import { Instant } from "../../src/domain/time/instant.js";

export function describeClockContract(name: string, createClock: () => Clock): void {
  describe(`contrat Clock : ${name}`, () => {
    it("now() renvoie un Instant", () => {
      expect(createClock().now()).toBeInstanceOf(Instant);
    });

    it("deux appels successifs à now() ne reculent jamais", () => {
      const clock = createClock();
      const first = clock.now();
      const second = clock.now();
      expect(second.compare(first)).toBeGreaterThanOrEqual(0);
    });
  });
}
