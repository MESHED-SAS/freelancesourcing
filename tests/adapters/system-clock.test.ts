// Tests de l'horloge système (adaptateur réel du contrat P1 Clock).
import { describe, expect, it } from "vitest";
import { SystemClock } from "../../src/adapters/clock/system-clock.js";
import { describeClockContract } from "./clock-contract.js";

describeClockContract("horloge système", () => new SystemClock());

describe("SystemClock", () => {
  it("now() renvoie l'heure réelle du système", () => {
    const before = Date.now();
    const now = new SystemClock().now().epochMilliseconds;
    const after = Date.now();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(after);
  });
});
