/**
 * Offset module - computes offset curves from walls
 */

import type { Wall, OffsetCurve, Point2D } from '../types';

/**
 * Computes offset curves from wall data
 * 
 * Offsets walls according to the offset rule:
 * - Load-bearing walls: offset by (thickness - 2") / 2 in XY axis
 * - Non-load-bearing walls: no offset (or can be configured)
 * 
 * Algorithm:
 * 1. Calculate direction vector: dx = x2 - x1, dy = y2 - y1
 * 2. Normalize it: len = sqrt(dx² + dy²), ux = dx/len, uy = dy/len
 * 3. Get perpendicular vector: nx = -uy, ny = ux (Option A - consistent)
 * 4. Compute offset distance: (thickness - 2") / 2
 * 5. Offset start/end points by ±offsetDistance along the normal
 * 
 * @param walls - Array of wall objects to offset
 * @returns Array of offset curves
 * 
 * @example
 * ```typescript
 * const walls = [{ start: [0, 0], end: [10, 0], thickness: 12, height: 120, isLoadBearing: true }];
 * const offsetCurves = computeOffsets(walls);
 * ```
 */
export function computeOffsets(walls: Wall[]): OffsetCurve[] {
  const offsetCurves: OffsetCurve[] = [];
  
  for (const wall of walls) {
    // Only offset load-bearing walls
    if (wall.isLoadBearing) {
      // Step 4: Compute offset distance = (thickness - 2") / 2
      const offsetCore = (wall.thickness - 2) / 2;
      
      // Step 1: Calculate direction vector
      const dx = wall.end[0] - wall.start[0];
      const dy = wall.end[1] - wall.start[1];
      
      // Step 2: Normalize it
      const len = Math.sqrt(dx * dx + dy * dy);
      
      // Handle zero-length walls (shouldn't happen, but safety check)
      if (len < 0.0001) {
        continue;
      }
      
      const ux = dx / len;
      const uy = dy / len;
      
      // Step 3: Get perpendicular vector (Option A: nx = -uy, ny = ux)
      // This rotates 90° counterclockwise from the direction vector
      const nx = -uy;
      const ny = ux;
      
      // Step 5: Offset start and end points by ±offsetCore along the normal
      // We offset outward (positive direction along normal)
      const offsetStart: Point2D = [
        wall.start[0] + nx * offsetCore,
        wall.start[1] + ny * offsetCore
      ];
      
      const offsetEnd: Point2D = [
        wall.end[0] + nx * offsetCore,
        wall.end[1] + ny * offsetCore
      ];
      
      // Create offset curve with the two offset points
      offsetCurves.push({
        points: [offsetStart, offsetEnd],
        distance: offsetCore,
        sourceWalls: [wall]
      });
    }
  }
  
  return offsetCurves;
}

