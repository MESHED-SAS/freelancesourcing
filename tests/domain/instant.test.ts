// Tests du type Instant (instant absolu, en millisecondes depuis l'époque Unix).
import { describe, expect, it } from "vitest";
import { Instant } from "../../src/domain/time/instant.js";

describe("Instant", () => {
  it("conserve le nombre de millisecondes", () => {
    const ms = Date.UTC(2025, 9, 26, 23, 30);
    expect(Instant.fromEpochMilliseconds(ms).epochMilliseconds).toBe(ms);
  });

  it("accepte les bornes de la plage représentable", () => {
    expect(Instant.fromEpochMilliseconds(8.64e15).epochMilliseconds).toBe(8.64e15);
    expect(Instant.fromEpochMilliseconds(-8.64e15).epochMilliseconds).toBe(-8.64e15);
  });

  it.each([
    ["non entier", 1.5],
    ["NaN", Number.NaN],
    ["infini", Number.POSITIVE_INFINITY],
    ["au-delà de la plage", 8.64e15 + 1],
    ["en deçà de la plage", -8.64e15 - 1],
  ])("refuse une valeur invalide : %s", (_label, ms) => {
    expect(() => Instant.fromEpochMilliseconds(ms)).toThrow(RangeError);
  });

  it("compare et equals", () => {
    const first = Instant.fromEpochMilliseconds(1_000);
    const second = Instant.fromEpochMilliseconds(2_000);
    expect(first.compare(second)).toBe(-1);
    expect(second.compare(first)).toBe(1);
    expect(first.compare(Instant.fromEpochMilliseconds(1_000))).toBe(0);
    expect(first.equals(Instant.fromEpochMilliseconds(1_000))).toBe(true);
    expect(first.equals(second)).toBe(false);
  });

  it("est immuable", () => {
    const instant = Instant.fromEpochMilliseconds(1_000);
    expect(Object.isFrozen(instant)).toBe(true);
    expect(() => {
      (instant as { epochMilliseconds: number }).epochMilliseconds = 0;
    }).toThrow(TypeError);
  });
});
