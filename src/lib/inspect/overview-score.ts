export interface OverviewMetrics {
  typesCount: number;
  fieldsCount: number;
  refsCount: number;
  pagesCount: number;
  optionSetsCount: number;
  colorsCount: number;
}

export type ComplexityTier = "Extensive" | "Complex" | "Medium" | "Light";

interface OverviewBadge {
  score: number;
  tier: ComplexityTier;
  description: string;
}

function toBucket(value: number, thresholds: { high: number; medium: number; low: number }): number {
  if (value >= thresholds.high) return 100;
  if (value >= thresholds.medium) return 75;
  if (value >= thresholds.low) return 45;
  return 20;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getOverviewScore(metrics: OverviewMetrics): number {
  const normalizedTypes = toBucket(metrics.typesCount, { high: 50, medium: 25, low: 10 });
  const normalizedFields = toBucket(metrics.fieldsCount, { high: 800, medium: 400, low: 150 });
  const normalizedRefs = toBucket(metrics.refsCount, { high: 150, medium: 75, low: 25 });
  const normalizedPages = toBucket(metrics.pagesCount, { high: 20, medium: 10, low: 5 });
  const normalizedOptionSets = toBucket(metrics.optionSetsCount, { high: 50, medium: 20, low: 8 });
  const normalizedColors = toBucket(metrics.colorsCount, { high: 30, medium: 15, low: 6 });

  const weighted =
    normalizedTypes * 0.3
    + normalizedFields * 0.25
    + normalizedRefs * 0.2
    + normalizedPages * 0.1
    + normalizedOptionSets * 0.1
    + normalizedColors * 0.05;

  return clampScore(weighted);
}

export function getComplexityTier(score: number): ComplexityTier {
  if (score >= 85) return "Extensive";
  if (score >= 65) return "Complex";
  if (score >= 40) return "Medium";
  return "Light";
}

function getSchemaTone(metrics: OverviewMetrics): string {
  if (metrics.fieldsCount >= 800 || metrics.refsCount >= 150) {
    return "a large relational schema";
  }
  if (metrics.fieldsCount >= 400 || metrics.refsCount >= 75) {
    return "a moderately dense schema";
  }
  return "a relatively focused schema";
}

function getSurfaceTone(metrics: OverviewMetrics): string {
  if (metrics.pagesCount >= 15 || metrics.optionSetsCount >= 50) {
    return "substantial product surface area and configuration depth";
  }
  if (metrics.pagesCount >= 10 || metrics.optionSetsCount >= 20) {
    return "a moderate amount of UI and configuration complexity";
  }
  return "a lighter application surface";
}

export function getComplexityDescription(metrics: OverviewMetrics): string {
  const schemaTone = getSchemaTone(metrics);
  const surfaceTone = getSurfaceTone(metrics);

  return `${metrics.typesCount} data types, ${metrics.fieldsCount} fields, and ${metrics.refsCount} relationships indicate ${schemaTone}, while ${metrics.pagesCount} pages and ${metrics.optionSetsCount} option sets suggest ${surfaceTone}.`;
}

export function getOverviewBadge(metrics: OverviewMetrics): OverviewBadge {
  const score = getOverviewScore(metrics);
  return {
    score,
    tier: getComplexityTier(score),
    description: getComplexityDescription(metrics),
  };
}
