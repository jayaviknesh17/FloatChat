/**
 * Shared Float Depth Normalization & Depth-to-Color Utility for FloatChat.
 */

/**
 * Safely extracts and normalizes a float's depth value.
 * Converts strings/numbers, handles null, undefined, NaN, negative, and missing depth values safely.
 * Checks max_depth, max_depth_m, depth_m, depth, pressure_dbar, pressure.
 */
/**
 * Safely extracts and normalizes a float's depth value.
 * Converts strings/numbers, handles null, undefined, NaN, negative, and missing depth values safely.
 * Checks max_depth, max_depth_m, maxDepth, depth_m, depthM, depth, pressure_dbar, pressure, max_depth_level.
 */
export function normalizeFloatDepth(val: any): number | null {
  if (val === null || val === undefined) return null;

  // Handle number primitives
  if (typeof val === "number") {
    return isNaN(val) ? null : Math.abs(val);
  }

  // Handle string primitives
  if (typeof val === "string") {
    const num = parseFloat(val);
    return isNaN(num) ? null : Math.abs(num);
  }

  // Handle float/observation objects passed directly
  if (typeof val === "object") {
    const candidates = [
      val.max_depth,
      val.max_depth_m,
      val.maxDepth,
      val.depth_m,
      val.depthM,
      val.depth,
      val.pressure_dbar,
      val.pressure,
      val.max_depth_level,
    ];
    let found: any = null;
    for (const c of candidates) {
      if (c !== null && c !== undefined && c !== "") {
        const num = typeof c === "number" ? c : parseFloat(String(c));
        if (!isNaN(num)) {
          found = num;
          break;
        }
      }
    }
    if (found !== null) {
      return Math.abs(found);
    }
    if (val.latest_observation) {
      return normalizeFloatDepth(val.latest_observation);
    }
    if (val.profile) {
      return normalizeFloatDepth(val.profile);
    }
    if (val.latest_profile) {
      return normalizeFloatDepth(val.latest_profile);
    }
  }

  return null;
}

/**
 * Returns the depth color according to the canonical FloatChat depth legend:
 * - 0 – 200 m: Bright Cyan (#22D3EE)
 * - 200 – 500 m: Ocean Blue (#38BDF8)
 * - 500 – 1000 m: Deep Teal/Green (#14B8A6)
 * - 1000 m and deeper: Warm Amber/Gold Yellow (#FBBF24)
 *
 * Boundary rules:
 * - depth < 200 → cyan (#22D3EE)
 * - 200 <= depth < 500 → blue (#38BDF8)
 * - 500 <= depth < 1000 → green (#14B8A6)
 * - depth >= 1000 → yellow (#FBBF24) (Depth of exactly 1000 m IS yellow)
 */
export function getDepthColor(rawDepth: any): string {
  const depth = normalizeFloatDepth(rawDepth);
  if (depth === null) {
    return "#22D3EE"; // Safe cyan default for missing/null depth
  }
  if (depth < 200) return "#22D3EE";      // 0 – 199.99 m: Cyan
  if (depth < 500) return "#38BDF8";      // 200 – 499.99 m: Blue
  if (depth < 1000) return "#14B8A6";     // 500 – 999.99 m: Green
  return "#FBBF24";                       // >= 1000 m (including 1000, 1000.1, 2000, >2000): Yellow
}

/**
 * Gets marker color for a float item (handling anomaly overrides if present).
 */
export function getFloatMarkerColor(floatItem: any): string {
  if (floatItem && typeof floatItem === "object" && floatItem.currentAnomaly?.isAnomalous) {
    return "#FBBF24"; // Amber anomaly
  }
  return getDepthColor(floatItem);
}
