/* ──────────────────────────────────────────────
   Shot Zones — map (x, y) court coordinates
   to named zones for shot chart analysis.

   Court is represented as a half court:
   x: 0-100 (left to right)
   y: 0-100 (baseline to half court)

   The 3-point arc is approximated at ~23.75 ft
   from the basket (NBA) mapped to our coordinate
   system.
   ────────────────────────────────────────────── */

const BASKET_X = 50;
const BASKET_Y = 8; // near baseline
const THREE_PT_RADIUS = 38; // in coordinate units (~23.75ft)
const CORNER_THREE_Y = 14; // corners are below the arc break
const PAINT_LEFT = 33;
const PAINT_RIGHT = 67;
const PAINT_TOP = 30;

export function getZone(x: number, y: number): string {
  // Distance from basket
  const dx = x - BASKET_X;
  const dy = y - BASKET_Y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Paint
  if (x >= PAINT_LEFT && x <= PAINT_RIGHT && y <= PAINT_TOP) {
    return "paint";
  }

  // Corner threes (below arc break, outside paint)
  if (y <= CORNER_THREE_Y) {
    if (x < PAINT_LEFT) return "three_corner_left";
    if (x > PAINT_RIGHT) return "three_corner_right";
  }

  // Beyond the 3-point arc
  if (dist >= THREE_PT_RADIUS) {
    if (x < 30) return "three_wing_left";
    if (x > 70) return "three_wing_right";
    return "three_top";
  }

  // Mid-range (inside arc, outside paint)
  if (x < 40) return "mid_left";
  if (x > 60) return "mid_right";
  return "mid_top";
}

/** Court zone display positions for zone view overlay */
export const ZONE_POSITIONS: Record<string, { x: number; y: number }> = {
  paint: { x: 50, y: 18 },
  mid_left: { x: 22, y: 30 },
  mid_right: { x: 78, y: 30 },
  mid_top: { x: 50, y: 45 },
  three_corner_left: { x: 8, y: 10 },
  three_corner_right: { x: 92, y: 10 },
  three_wing_left: { x: 12, y: 55 },
  three_wing_right: { x: 88, y: 55 },
  three_top: { x: 50, y: 70 },
};
