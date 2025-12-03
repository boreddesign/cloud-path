/**
 * Wall offset utility for Print Path app
 * Converts path (centerline) to walls and computes offsets using Planformer logic
 */

/**
 * Converts a path (array of points) into wall segments
 * Each consecutive pair of points becomes a wall segment
 * 
 * @param {Array<Array<number>>} path - Array of 2D or 3D points representing centerline
 * @param {Object} config - Wall configuration
 * @param {number} config.thickness - Wall thickness in inches (default: 12")
 * @param {boolean} config.isLoadBearing - Whether walls are load-bearing (default: true)
 * @param {number} config.height - Wall height in inches (default: 120")
 * @returns {Array} Array of wall objects
 */
export function pathToWalls(path, config = {}) {
  const {
    thickness = 12, // Default: 12" (1ft)
    isLoadBearing = true,
    height = 120 // Default: 10ft
  } = config;

  if (!path || path.length < 2) {
    return [];
  }

  const walls = [];

  for (let i = 0; i < path.length - 1; i++) {
    const start = [path[i][0], path[i][1]]; // Use only X, Y (ignore Z for 2D offset)
    const end = [path[i + 1][0], path[i + 1][1]];

    walls.push({
      start,
      end,
      thickness,
      height,
      isLoadBearing
    });
  }

  return walls;
}

/**
 * Computes offset curves from walls using the Planformer algorithm
 * 
 * Algorithm:
 * 1. Calculate direction vector: dx = x2 - x1, dy = y2 - y1
 * 2. Normalize it: len = sqrt(dx² + dy²), ux = dx/len, uy = dy/len
 * 3. Get perpendicular vector: nx = -uy, ny = ux (Option A - consistent)
 * 4. Compute offset distance: (thickness - 2") / 2
 * 5. Offset start/end points by ±offsetDistance along the normal
 * 
 * @param {Array} walls - Array of wall objects
 * @returns {Array} Array of offset curves with points
 */
export function computeOffsets(walls) {
  const offsetCurves = [];

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
      const offsetStart = [
        wall.start[0] + nx * offsetCore,
        wall.start[1] + ny * offsetCore
      ];

      const offsetEnd = [
        wall.end[0] + nx * offsetCore,
        wall.end[1] + ny * offsetCore
      ];

      // Create offset curve with the two offset points
      offsetCurves.push({
        points: [offsetStart, offsetEnd],
        distance: offsetCore,
        sourceWall: wall
      });
    }
  }

  return offsetCurves;
}

/**
 * Converts offset curves to a continuous path (for visualization)
 * Connects all offset curve segments into a single path
 * 
 * @param {Array} offsetCurves - Array of offset curves
 * @returns {Array} Array of 3D points [x, y, z] for the offset path
 */
export function offsetCurvesToPath(offsetCurves, z = 0) {
  if (offsetCurves.length === 0) {
    return [];
  }

  const path = [];

  for (const curve of offsetCurves) {
    if (curve.points.length >= 2) {
      // Add start point (if first curve or not connected)
      if (path.length === 0) {
        path.push([curve.points[0][0], curve.points[0][1], z]);
      }
      // Add end point
      path.push([curve.points[1][0], curve.points[1][1], z]);
    }
  }

  return path;
}

