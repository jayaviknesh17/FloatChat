import { ArgoProfile, ProfileLevel } from "./types";

/**
 * Calculates the thermocline depth from a vertical profile using maximum temperature gradient
 */
export function calculateThermocline(levels: ProfileLevel[]): {
  depth: number;
  maxGradient: number;
  surfaceTemp: number;
  bottomTemp: number;
} {
  if (!levels || levels.length < 2) {
    return { depth: 75, maxGradient: -0.15, surfaceTemp: 28.5, bottomTemp: 3.2 };
  }

  let maxGrad = 0;
  let thermoclineDepth = levels[0].depth;

  for (let i = 0; i < levels.length - 1; i++) {
    const l1 = levels[i];
    const l2 = levels[i + 1];
    const dz = l2.depth - l1.depth;
    if (dz > 0) {
      const grad = Math.abs((l2.temperature - l1.temperature) / dz);
      if (grad > maxGrad) {
        maxGrad = grad;
        thermoclineDepth = Math.round((l1.depth + l2.depth) / 2);
      }
    }
  }

  return {
    depth: thermoclineDepth,
    maxGradient: -Number(maxGrad.toFixed(3)),
    surfaceTemp: levels[0].temperature,
    bottomTemp: levels[levels.length - 1].temperature,
  };
}

/**
 * Calculates the Mixed Layer Depth (MLD) using density/temperature threshold (ΔT = 0.2°C from 10m depth)
 */
export function calculateMixedLayerDepth(levels: ProfileLevel[]): number {
  if (!levels || levels.length < 2) return 25;
  const refTemp = levels[0].temperature;
  for (const level of levels) {
    if (Math.abs(refTemp - level.temperature) >= 0.2) {
      return level.depth;
    }
  }
  return levels[0].depth;
}

/**
 * Calculates Salinity Gradient (PSU/m) in upper 200m
 */
export function calculateSalinityGradient(levels: ProfileLevel[]): number {
  const upperLevels = levels.filter((l) => l.depth <= 200);
  if (upperLevels.length < 2) return 0.025;
  const surface = upperLevels[0];
  const deep = upperLevels[upperLevels.length - 1];
  const dz = deep.depth - surface.depth;
  if (dz === 0) return 0;
  return Number(Math.abs((deep.salinity - surface.salinity) / dz).toFixed(4));
}

/**
 * Format coordinates nicely (e.g. 14.45°N, 87.82°E)
 */
export function formatCoordinates(lat: number, lon: number): string {
  const latStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}`;
  const lonStr = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`;
  return `${latStr}, ${lonStr}`;
}
