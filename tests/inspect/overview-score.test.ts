import { describe, expect, it } from "vitest";
import {
  getComplexityDescription,
  getComplexityTier,
  getOverviewBadge,
  getOverviewScore,
  type OverviewMetrics,
} from "@/lib/inspect/overview-score";

function makeMetrics(overrides: Partial<OverviewMetrics> = {}): OverviewMetrics {
  return {
    typesCount: 0,
    fieldsCount: 0,
    refsCount: 0,
    pagesCount: 0,
    optionSetsCount: 0,
    colorsCount: 0,
    ...overrides,
  };
}

describe("overview-score", () => {
  it("applies threshold buckets across all metrics", () => {
    // Data types buckets
    expect(getOverviewScore(makeMetrics({ typesCount: 9 }))).toBe(20);
    expect(getOverviewScore(makeMetrics({ typesCount: 10 }))).toBe(28);
    expect(getOverviewScore(makeMetrics({ typesCount: 25 }))).toBe(37);
    expect(getOverviewScore(makeMetrics({ typesCount: 50 }))).toBe(44);

    // Fields buckets
    expect(getOverviewScore(makeMetrics({ fieldsCount: 149 }))).toBe(20);
    expect(getOverviewScore(makeMetrics({ fieldsCount: 150 }))).toBe(26);
    expect(getOverviewScore(makeMetrics({ fieldsCount: 400 }))).toBe(34);
    expect(getOverviewScore(makeMetrics({ fieldsCount: 800 }))).toBe(40);

    // Relationships buckets
    expect(getOverviewScore(makeMetrics({ refsCount: 24 }))).toBe(20);
    expect(getOverviewScore(makeMetrics({ refsCount: 25 }))).toBe(25);
    expect(getOverviewScore(makeMetrics({ refsCount: 75 }))).toBe(31);
    expect(getOverviewScore(makeMetrics({ refsCount: 150 }))).toBe(36);

    // Pages buckets
    expect(getOverviewScore(makeMetrics({ pagesCount: 4 }))).toBe(20);
    expect(getOverviewScore(makeMetrics({ pagesCount: 5 }))).toBe(23);
    expect(getOverviewScore(makeMetrics({ pagesCount: 10 }))).toBe(26);
    expect(getOverviewScore(makeMetrics({ pagesCount: 20 }))).toBe(28);

    // Option sets buckets
    expect(getOverviewScore(makeMetrics({ optionSetsCount: 7 }))).toBe(20);
    expect(getOverviewScore(makeMetrics({ optionSetsCount: 8 }))).toBe(23);
    expect(getOverviewScore(makeMetrics({ optionSetsCount: 20 }))).toBe(26);
    expect(getOverviewScore(makeMetrics({ optionSetsCount: 50 }))).toBe(28);

    // Colors buckets
    expect(getOverviewScore(makeMetrics({ colorsCount: 5 }))).toBe(20);
    expect(getOverviewScore(makeMetrics({ colorsCount: 6 }))).toBe(21);
    expect(getOverviewScore(makeMetrics({ colorsCount: 15 }))).toBe(23);
    expect(getOverviewScore(makeMetrics({ colorsCount: 30 }))).toBe(24);
  });

  it("computes weighted score as rounded integer and clamps to [0,100]", () => {
    const metrics = makeMetrics({
      typesCount: 50,
      fieldsCount: 800,
      refsCount: 150,
      pagesCount: 20,
      optionSetsCount: 50,
      colorsCount: 30,
    });

    expect(getOverviewScore(metrics)).toBe(100);
  });

  it("maps tier boundaries correctly", () => {
    expect(getComplexityTier(39)).toBe("Light");
    expect(getComplexityTier(40)).toBe("Medium");
    expect(getComplexityTier(64)).toBe("Medium");
    expect(getComplexityTier(65)).toBe("Complex");
    expect(getComplexityTier(84)).toBe("Complex");
    expect(getComplexityTier(85)).toBe("Extensive");
  });

  it("builds dynamic description tones for schema and surface", () => {
    const high = getComplexityDescription(
      makeMetrics({ typesCount: 49, fieldsCount: 814, refsCount: 185, pagesCount: 17, optionSetsCount: 65 }),
    );
    expect(high).toContain("a large relational schema");
    expect(high).toContain("substantial product surface area and configuration depth");

    const medium = getComplexityDescription(
      makeMetrics({ typesCount: 20, fieldsCount: 420, refsCount: 80, pagesCount: 10, optionSetsCount: 20 }),
    );
    expect(medium).toContain("a moderately dense schema");
    expect(medium).toContain("a moderate amount of UI and configuration complexity");

    const low = getComplexityDescription(
      makeMetrics({ typesCount: 4, fieldsCount: 120, refsCount: 10, pagesCount: 3, optionSetsCount: 4 }),
    );
    expect(low).toContain("a relatively focused schema");
    expect(low).toContain("a lighter application surface");
    expect(low).not.toContain("colors");
  });

  it("matches expected output for provided example", () => {
    const metrics = makeMetrics({
      typesCount: 49,
      fieldsCount: 814,
      refsCount: 185,
      pagesCount: 17,
      optionSetsCount: 65,
      colorsCount: 12,
    });

    const badge = getOverviewBadge(metrics);

    expect(badge.tier).toBe("Extensive");
    expect(badge.description).toBe(
      "49 data types, 814 fields, and 185 relationships indicate a large relational schema, while 17 pages and 65 option sets suggest substantial product surface area and configuration depth.",
    );
  });

  it("is deterministic for repeated calls", () => {
    const metrics = makeMetrics({
      typesCount: 32,
      fieldsCount: 510,
      refsCount: 88,
      pagesCount: 12,
      optionSetsCount: 27,
      colorsCount: 18,
    });

    const a = getOverviewBadge(metrics);
    const b = getOverviewBadge(metrics);

    expect(a).toEqual(b);
  });
});
