/**
 * Offset module - computes offset curves from walls
 */

import type { Wall, OffsetCurve, Point2D } from '../types';
import { pointsEqual, normalize, subtract, multiply } from '../geometry/utils';

/**
 * Checks if two walls share a common endpoint (form a corner)
 * 
 * @param wall1 - First wall
 * @param wall2 - Second wall
 * @param tolerance - Tolerance for point comparison (default: 0.001)
 * @returns Object with connection info: { connected: boolean, connectionType: 'start-end' | 'end-start' | 'end-end' | 'start-start' | null }
 */
function checkWallConnection(
  wall1: Wall,
  wall2: Wall,
  tolerance: number = 0.001
): { connected: boolean; connectionType: 'start-end' | 'end-start' | 'end-end' | 'start-start' | null } {
  // Check all possible connections
  if (pointsEqual(wall1.end, wall2.start, tolerance)) {
    return { connected: true, connectionType: 'end-start' };
  }
  if (pointsEqual(wall1.start, wall2.end, tolerance)) {
    return { connected: true, connectionType: 'start-end' };
  }
  if (pointsEqual(wall1.end, wall2.end, tolerance)) {
    return { connected: true, connectionType: 'end-end' };
  }
  if (pointsEqual(wall1.start, wall2.start, tolerance)) {
    return { connected: true, connectionType: 'start-start' };
  }
  return { connected: false, connectionType: null };
}

/**
 * Groups connected walls into continuous paths
 * 
 * @param walls - Array of walls to group
 * @param tolerance - Tolerance for point comparison (default: 0.001)
 * @returns Array of wall groups, where each group is a continuous path
 */
function groupConnectedWalls(walls: Wall[], tolerance: number = 0.001): Wall[][] {
  const groups: Wall[][] = [];
  const used = new Set<number>();
  
  for (let i = 0; i < walls.length; i++) {
    if (used.has(i)) continue;
    
    // Start a new group with this wall
    const group: Wall[] = [walls[i]];
    used.add(i);
    
    // Try to extend the group by finding connected walls
    let changed = true;
    while (changed) {
      changed = false;
      
      // Try to find walls that connect to either end of the current path
      for (let j = 0; j < walls.length; j++) {
        if (used.has(j)) continue;
        
        const firstWall = group[0];
        const lastWall = group[group.length - 1];
        
        const connectionToFirst = checkWallConnection(walls[j], firstWall, tolerance);
        const connectionToLast = checkWallConnection(lastWall, walls[j], tolerance);
        
        if (connectionToFirst.connected) {
          // Connect to the beginning of the path
          if (connectionToFirst.connectionType === 'end-start') {
            // wall[j].end == firstWall.start, so prepend wall[j]
            group.unshift(walls[j]);
            used.add(j);
            changed = true;
          } else if (connectionToFirst.connectionType === 'start-start') {
            // wall[j].start == firstWall.start, so reverse wall[j] and prepend
            group.unshift({ ...walls[j], start: walls[j].end, end: walls[j].start });
            used.add(j);
            changed = true;
          } else if (connectionToFirst.connectionType === 'end-end') {
            // wall[j].end == firstWall.end, so reverse firstWall and prepend wall[j]
            group[0] = { ...firstWall, start: firstWall.end, end: firstWall.start };
            group.unshift(walls[j]);
            used.add(j);
            changed = true;
          }
        } else if (connectionToLast.connected) {
          // Connect to the end of the path
          if (connectionToLast.connectionType === 'end-start') {
            // lastWall.end == wall[j].start, so append wall[j]
            group.push(walls[j]);
            used.add(j);
            changed = true;
          } else if (connectionToLast.connectionType === 'start-end') {
            // lastWall.start == wall[j].end, so reverse wall[j] and append
            group.push({ ...walls[j], start: walls[j].end, end: walls[j].start });
            used.add(j);
            changed = true;
          } else if (connectionToLast.connectionType === 'end-end') {
            // lastWall.end == wall[j].end, so reverse wall[j] and append
            group.push({ ...walls[j], start: walls[j].end, end: walls[j].start });
            used.add(j);
            changed = true;
          }
        }
      }
    }
    
    groups.push(group);
  }
  
  return groups;
}

/**
 * Offsets a continuous path of connected walls
 * 
 * @param wallGroup - Array of connected walls forming a continuous path (all walls for corner detection)
 * @param loadBearingWalls - Array of load-bearing walls to include in offset
 * @param offsetDistance - Distance to offset
 * @returns Offset curve points (only for load-bearing segments)
 */
/**
 * Checks if a wall is load-bearing
 */
function isLoadBearingWall(wall: Wall): boolean {
  return wall.isLoadBearing === true;
}

/**
 * Creates a fillet (rounded corner) between two line segments
 * 
 * @param p1 - Point before corner [x, y]
 * @param corner - Corner point [x, y]
 * @param p2 - Point after corner [x, y]
 * @param radius - Fillet radius (default: 1")
 * @returns Array of points along the fillet arc, or [corner] if fillet can't be created
 */
function createFillet(p1: Point2D, corner: Point2D, p2: Point2D, radius: number = 1.0): Point2D[] {
  // Calculate direction vectors
  const dir1 = normalize(subtract(corner, p1)); // Direction from p1 to corner
  const dir2 = normalize(subtract(p2, corner)); // Direction from corner to p2
  
  // Calculate the angle between the two segments
  const dot = dir1[0] * dir2[0] + dir1[1] * dir2[1];
  const angle = Math.acos(Math.max(-1, Math.min(1, dot))); // Clamp to avoid NaN
  
  // If angle is too small or too large, skip fillet
  if (angle < 0.01 || angle > Math.PI - 0.01) {
    return [corner];
  }
  
  // Calculate distances from corner to fillet start/end points
  const tanHalfAngle = Math.tan(angle / 2);
  const dist = radius / tanHalfAngle;
  
  // Check if segments are long enough for the fillet
  const len1 = distance(p1, corner);
  const len2 = distance(corner, p2);
  
  if (dist >= len1 || dist >= len2) {
    // Segments too short, use smaller radius or skip
    const maxDist = Math.min(len1, len2) * 0.9; // Use 90% of shorter segment
    if (maxDist < 0.01) {
      return [corner];
    }
    const adjustedRadius = maxDist * tanHalfAngle;
    return createFillet(p1, corner, p2, adjustedRadius);
  }
  
  // Calculate fillet start and end points
  const filletStart: Point2D = [
    corner[0] - dir1[0] * dist,
    corner[1] - dir1[1] * dist
  ];
  const filletEnd: Point2D = [
    corner[0] + dir2[0] * dist,
    corner[1] + dir2[1] * dist
  ];
  
  // Calculate fillet center (intersection of offset lines)
  // Offset line 1: perpendicular to dir1, offset by radius
  const perp1: Point2D = [-dir1[1], dir1[0]]; // Perpendicular to dir1
  const offset1: Point2D = [
    filletStart[0] + perp1[0] * radius,
    filletStart[1] + perp1[1] * radius
  ];
  
  // Offset line 2: perpendicular to dir2, offset by radius
  const perp2: Point2D = [-dir2[1], dir2[0]]; // Perpendicular to dir2
  const offset2: Point2D = [
    filletEnd[0] + perp2[0] * radius,
    filletEnd[1] + perp2[1] * radius
  ];
  
  // Find intersection of the two offset lines (fillet center)
  // Line 1: offset1 + t * dir1
  // Line 2: offset2 + s * dir2
  // Solve for intersection
  const dx = offset2[0] - offset1[0];
  const dy = offset2[1] - offset1[1];
  const det = dir1[0] * dir2[1] - dir1[1] * dir2[0];
  
  if (Math.abs(det) < 0.0001) {
    // Lines are parallel, can't create fillet
    return [corner];
  }
  
  const t = (dx * dir2[1] - dy * dir2[0]) / det;
  const filletCenter: Point2D = [
    offset1[0] + dir1[0] * t,
    offset1[1] + dir1[1] * t
  ];
  
  // Calculate start and end angles for the arc
  const startVec = subtract(filletStart, filletCenter);
  const endVec = subtract(filletEnd, filletCenter);
  const startAngle = Math.atan2(startVec[1], startVec[0]);
  const endAngle = Math.atan2(endVec[1], endVec[0]);
  
  // Determine arc direction (should go around the corner)
  let angleDiff = endAngle - startAngle;
  // Normalize to [-PI, PI]
  while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
  while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
  
  // Sample points along the arc
  const numSegments = Math.max(4, Math.ceil(Math.abs(angleDiff) * radius * 4)); // At least 4 segments
  const filletPoints: Point2D[] = [];
  
  for (let i = 0; i <= numSegments; i++) {
    const t = i / numSegments;
    const angle = startAngle + angleDiff * t;
    const point: Point2D = [
      filletCenter[0] + radius * Math.cos(angle),
      filletCenter[1] + radius * Math.sin(angle)
    ];
    filletPoints.push(point);
  }
  
  return filletPoints;
}

/**
 * Offsets a continuous path of connected walls and adds fillets at corners
 * 
 * @param wallGroup - Array of connected walls forming a continuous path (all walls for corner detection)
 * @param loadBearingWalls - Array of load-bearing walls to include in offset
 * @param offsetDistance - Distance to offset
 * @param filletRadius - Minimum turning radius for fillets (default: 1")
 * @returns Offset curve points with fillets at corners
 */
function offsetConnectedPath(wallGroup: Wall[], loadBearingWalls: Wall[], offsetDistance: number, filletRadius: number = 1.0): Point2D[] {
  if (wallGroup.length === 0) {
    return [];
  }
  
  // Build the continuous path from ALL walls (for proper corner detection)
  const path: Point2D[] = [];
  const pathWalls: (Wall | null)[] = []; // Maps path segment index to the wall that created that segment
  
  if (wallGroup.length > 0) {
    path.push(wallGroup[0].start);
    
    for (const wall of wallGroup) {
      path.push(wall.end);
      pathWalls.push(wall); // This wall creates the segment ending at this point
    }
  }
  
  // Determine which points should be included in the offset
  // Include points that are:
  // 1. Start or end of a load-bearing wall
  // 2. Corner points (even if connecting non-LB walls, for proper geometry)
  const includePoint: boolean[] = [];
  for (let i = 0; i < path.length; i++) {
    if (i === 0) {
      // First point: include if it's the start of a load-bearing wall
      const firstWall = pathWalls[0];
      includePoint.push(firstWall ? isLoadBearingWall(firstWall) : false);
    } else if (i === path.length - 1) {
      // Last point: include if it's the end of a load-bearing wall
      const lastWall = pathWalls[pathWalls.length - 1];
      includePoint.push(lastWall ? isLoadBearingWall(lastWall) : false);
    } else {
      // Middle point (corner): include if either adjacent segment is load-bearing
      const prevWall = pathWalls[i - 1];
      const nextWall = pathWalls[i];
      includePoint.push(
        (prevWall ? isLoadBearingWall(prevWall) : false) ||
        (nextWall ? isLoadBearingWall(nextWall) : false)
      );
    }
  }
  
  const offsetPoints: Point2D[] = [];
  
  // Offset each point along the path
  for (let i = 0; i < path.length; i++) {
    // Only include points that are part of load-bearing segments or corners
    if (!includePoint[i]) {
      continue;
    }
    
    let normal: Point2D;
    
    if (i === 0) {
      // First point: use direction from first to second point
      if (path.length > 1) {
        const dir = normalize(subtract(path[1], path[0]));
        normal = [-dir[1], dir[0]]; // Perpendicular (90° counterclockwise)
      } else {
        // Single point: use direction from wall
        const wall = wallGroup[0];
        const dir = normalize(subtract(wall.end, wall.start));
        normal = [-dir[1], dir[0]];
      }
    } else if (i === path.length - 1) {
      // Last point: use direction from second-to-last to last point
      const dir = normalize(subtract(path[i], path[i - 1]));
      normal = [-dir[1], dir[0]]; // Perpendicular (90° counterclockwise)
    } else {
      // Middle point (corner): average the normals from both segments
      const dir1 = normalize(subtract(path[i], path[i - 1]));
      const dir2 = normalize(subtract(path[i + 1], path[i]));
      const normal1: Point2D = [-dir1[1], dir1[0]];
      const normal2: Point2D = [-dir2[1], dir2[0]];
      // Average the normals for smooth corner handling
      normal = normalize([
        (normal1[0] + normal2[0]) / 2,
        (normal1[1] + normal2[1]) / 2
      ]);
    }
    
    // Offset the point along the normal
    const offsetPoint: Point2D = [
      path[i][0] + normal[0] * offsetDistance,
      path[i][1] + normal[1] * offsetDistance
    ];
    offsetPoints.push(offsetPoint);
  }
  
  // Apply fillets at corners
  if (offsetPoints.length >= 3 && filletRadius > 0) {
    const filletedPoints: Point2D[] = [];
    
    // Add first point
    filletedPoints.push(offsetPoints[0]);
    
    // Process each corner
    for (let i = 1; i < offsetPoints.length - 1; i++) {
      const prev = offsetPoints[i - 1];
      const corner = offsetPoints[i];
      const next = offsetPoints[i + 1];
      
      // Create fillet at this corner
      const filletPoints = createFillet(prev, corner, next, filletRadius);
      
      // Add fillet points (skip first point as it connects to previous segment)
      for (let j = 1; j < filletPoints.length; j++) {
        filletedPoints.push(filletPoints[j]);
      }
    }
    
    // Add last point
    filletedPoints.push(offsetPoints[offsetPoints.length - 1]);
    
    return filletedPoints;
  }
  
  return offsetPoints;
}

/**
 * Computes offset curves from wall data with corner handling
 * 
 * Offsets walls according to the offset rule:
 * - Load-bearing walls: offset by (thickness - 2") / 2 in XY axis
 * - Non-load-bearing walls: no offset (or can be configured)
 * 
 * Corner Handling:
 * - Detects when walls share common endpoints (corners)
 * - Groups connected walls into continuous paths
 * - Offsets connected paths as continuous curves instead of individual segments
 * 
 * Algorithm:
 * 1. Filter to load-bearing walls only
 * 2. Group connected walls (walls that share endpoints) into continuous paths
 * 3. For each continuous path, offset it as a whole
 * 4. Handle isolated walls (walls that don't connect to others) individually
 * 
 * @param walls - Array of wall objects to offset
 * @param tolerance - Tolerance for point comparison when detecting corners (default: 0.001)
 * @returns Array of offset curves
 * 
 * @example
 * ```typescript
 * const walls = [
 *   { start: [0, 0], end: [10, 0], thickness: 12, height: 120, isLoadBearing: true },
 *   { start: [10, 0], end: [10, 10], thickness: 12, height: 120, isLoadBearing: true }
 * ];
 * const offsetCurves = computeOffsets(walls);
 * // Returns one continuous offset curve for the connected path
 * ```
 */
export function computeOffsets(walls: Wall[], tolerance: number = 0.001): OffsetCurve[] {
  const offsetCurves: OffsetCurve[] = [];
  
  if (walls.length === 0) {
    return offsetCurves;
  }
  
  // Group ALL walls together to detect corners across all wall types
  // This ensures corners are detected even when load-bearing and non-load-bearing walls connect
  const allWallGroups = groupConnectedWalls(walls, tolerance);
  
  // Process each group
  for (const group of allWallGroups) {
    if (group.length === 0) continue;
    
    // Filter to only load-bearing walls in this group for offsetting
    const loadBearingWallsInGroup = group.filter(wall => wall.isLoadBearing);
    
    if (loadBearingWallsInGroup.length === 0) {
      // No load-bearing walls in this group, skip offsetting
      continue;
    }
    
    // Use the full group (all walls) for path building to preserve corner geometry
    // But only offset segments that belong to load-bearing walls
    // Use the first load-bearing wall's thickness for the offset distance
    const offsetDistance = (loadBearingWallsInGroup[0].thickness - 2) / 2;
    
    // Offset the connected path (using full group for corners, but only including LB segments)
    // Apply 1" minimum turning radius fillets at corners
    const offsetPoints = offsetConnectedPath(group, loadBearingWallsInGroup, offsetDistance, 1.0);
    
    if (offsetPoints.length >= 2) {
      offsetCurves.push({
        points: offsetPoints,
        distance: offsetDistance,
        sourceWalls: loadBearingWallsInGroup
      });
    }
  }
  
  return offsetCurves;
}

