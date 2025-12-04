/**
 * Wall offset utility for Print Path app
 * Simple, clean implementation: join segments → offset → fillet → loft
 */

/**
 * Step 1: Join segments into continuous paths
 * Orders segments to form continuous paths by connecting endpoints
 * 
 * @param {Array} segments - Array of segment objects with {type, start, end}
 * @param {number} tolerance - Distance tolerance for joining (default: 0.001)
 * @returns {Array} Array of continuous paths (each path is array of ordered segments)
 */
function joinSegments(segments, tolerance = 0.001) {
  if (!segments || segments.length === 0) {
    return []
  }

  const paths = []
  const used = new Set()

  // Helper: Check if two points match
  const pointsMatch = (p1, p2) => {
    const dx = p2[0] - p1[0]
    const dy = p2[1] - p1[1]
    const dist = Math.sqrt(dx * dx + dy * dy)
    return dist < tolerance
  }

  // Build continuous paths
  for (let i = 0; i < segments.length; i++) {
    if (used.has(i)) continue

    const currentPath = [segments[i]]
    used.add(i)

    // Try to extend path forward and backward
    let changed = true
    while (changed) {
      changed = false

      const firstSeg = currentPath[0]
      const lastSeg = currentPath[currentPath.length - 1]

      // Try to extend at the end
      for (let j = 0; j < segments.length; j++) {
        if (used.has(j)) continue

        const candidate = segments[j]

        // Check if candidate connects to end of current path
        if (pointsMatch(lastSeg.end, candidate.start)) {
          currentPath.push(candidate)
          used.add(j)
          changed = true
          break
        } else if (pointsMatch(lastSeg.end, candidate.end)) {
          // Reverse candidate
          currentPath.push({
            ...candidate,
            start: candidate.end,
            end: candidate.start
          })
          used.add(j)
          changed = true
          break
        }
      }

      // Try to extend at the beginning
      if (!changed) {
        for (let j = 0; j < segments.length; j++) {
          if (used.has(j)) continue

          const candidate = segments[j]

          if (pointsMatch(candidate.end, firstSeg.start)) {
            currentPath.unshift(candidate)
            used.add(j)
            changed = true
            break
          } else if (pointsMatch(candidate.start, firstSeg.start)) {
            // Reverse candidate
            currentPath.unshift({
              ...candidate,
              start: candidate.end,
              end: candidate.start
            })
            used.add(j)
            changed = true
            break
          }
        }
      }
    }

    paths.push(currentPath)
  }

  return paths
}

/**
 * Step 2: Offset a continuous path by perpendicular distance
 * Creates parallel offset by offsetting each segment and finding intersections
 * 
 * @param {Array} path - Array of ordered segments forming continuous path
 * @param {number} offsetDistance - Distance to offset (positive = left/outward)
 * @returns {Array} Array of points representing offset path
 */
function offsetPath(path, offsetDistance) {
  if (!path || path.length === 0) {
    return []
  }

  // Helper: Normalize vector
  const normalize = (v) => {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1])
    if (len < 0.0001) return [0, 0]
    return [v[0] / len, v[1] / len]
  }

  // Helper: Offset a line segment (both endpoints)
  const offsetSegment = (seg, distance) => {
    const dir = normalize([
      seg.end[0] - seg.start[0],
      seg.end[1] - seg.start[1]
    ])
    
    // Perpendicular (90° counterclockwise)
    const perpX = -dir[1]
    const perpY = dir[0]
    
    return {
      start: [
        seg.start[0] + perpX * distance,
        seg.start[1] + perpY * distance
      ],
      end: [
        seg.end[0] + perpX * distance,
        seg.end[1] + perpY * distance
      ]
    }
  }

  // Helper: Find intersection of two lines (defined by two points each)
  const lineIntersection = (p1, p2, p3, p4) => {
    const denom = (p1[0] - p2[0]) * (p3[1] - p4[1]) - (p1[1] - p2[1]) * (p3[0] - p4[0])
    
    if (Math.abs(denom) < 0.0001) {
      // Lines are parallel, return midpoint
      return [
        (p2[0] + p3[0]) / 2,
        (p2[1] + p3[1]) / 2
      ]
    }
    
    const t = ((p1[0] - p3[0]) * (p3[1] - p4[1]) - (p1[1] - p3[1]) * (p3[0] - p4[0])) / denom
    
    return [
      p1[0] + t * (p2[0] - p1[0]),
      p1[1] + t * (p2[1] - p1[1])
    ]
  }

  // Offset all segments
  const offsetSegments = path.map(seg => offsetSegment(seg, offsetDistance))

  const offsetPoints = []

  // Add first point
  offsetPoints.push(offsetSegments[0].start)

  // For each adjacent pair of offset segments, find their intersection
  for (let i = 0; i < offsetSegments.length - 1; i++) {
    const seg1 = offsetSegments[i]
    const seg2 = offsetSegments[i + 1]
    
    // Find intersection of seg1 and seg2
    const intersection = lineIntersection(seg1.start, seg1.end, seg2.start, seg2.end)
    offsetPoints.push(intersection)
  }

  // Add last point
  offsetPoints.push(offsetSegments[offsetSegments.length - 1].end)

  return offsetPoints
}

/**
 * Step 3: Add fillets to sharp corners
 * Detects corners with angle < threshold and replaces with arc
 * 
 * @param {Array} points - Array of points forming path
 * @param {number} radius - Fillet radius (default: 1")
 * @param {number} angleThreshold - Angle threshold in radians for filleting (default: 150° = 2.618 rad)
 * @returns {Array} Array of points with fillets applied
 */
function filletCorners(points, radius = 1.0, angleThreshold = 2.618) {
  if (!points || points.length < 3) {
    return points
  }

  const filleted = []

  // Helper: Calculate angle between two vectors
  const calcAngle = (v1, v2) => {
    const dot = v1[0] * v2[0] + v1[1] * v2[1]
    const len1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1])
    const len2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1])
    const cos = dot / (len1 * len2)
    return Math.acos(Math.max(-1, Math.min(1, cos)))
  }

  // Helper: Distance between points
  const distance = (p1, p2) => {
    const dx = p2[0] - p1[0]
    const dy = p2[1] - p1[1]
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Helper: Create fillet arc
  const createFillet = (prev, corner, next, r) => {
    // Vectors from corner
    const v1 = [prev[0] - corner[0], prev[1] - corner[1]]
    const v2 = [next[0] - corner[0], next[1] - corner[1]]
    
    // Normalize
    const len1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1])
    const len2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1])
    if (len1 < 0.001 || len2 < 0.001) return [corner]
    
    v1[0] /= len1
    v1[1] /= len1
    v2[0] /= len2
    v2[1] /= len2
    
    // Calculate angle
    const angle = calcAngle(v1, v2)
    
    // Check if sharp enough to fillet
    if (angle > angleThreshold) {
      return [corner] // Not sharp enough
    }
    
    // Calculate offset distance from corner to fillet tangent points
    const offset = r / Math.tan(angle / 2)
    
    // Check if segments are long enough
    const dist1 = distance(prev, corner)
    const dist2 = distance(corner, next)
    if (offset >= dist1 * 0.9 || offset >= dist2 * 0.9) {
      return [corner] // Segments too short
    }
    
    // Calculate fillet start and end points
    const start = [
      corner[0] + v1[0] * offset,
      corner[1] + v1[1] * offset
    ]
    const end = [
      corner[0] + v2[0] * offset,
      corner[1] + v2[1] * offset
    ]
    
    // Calculate arc center (perpendicular from start/end)
    const bisector = [
      (v1[0] + v2[0]) / 2,
      (v1[1] + v2[1]) / 2
    ]
    const bisectorLen = Math.sqrt(bisector[0] * bisector[0] + bisector[1] * bisector[1])
    if (bisectorLen < 0.001) return [corner]
    
    bisector[0] /= bisectorLen
    bisector[1] /= bisectorLen
    
    const centerDist = r / Math.sin(angle / 2)
    const center = [
      corner[0] + bisector[0] * centerDist,
      corner[1] + bisector[1] * centerDist
    ]
    
    // Sample arc
    const numSegments = Math.max(4, Math.ceil(angle * r * 2))
    const arcPoints = []
    
    const startAngle = Math.atan2(start[1] - center[1], start[0] - center[0])
    const endAngle = Math.atan2(end[1] - center[1], end[0] - center[0])
    
    let sweepAngle = endAngle - startAngle
    // Normalize to shortest path
    if (sweepAngle > Math.PI) sweepAngle -= 2 * Math.PI
    if (sweepAngle < -Math.PI) sweepAngle += 2 * Math.PI
    
    for (let i = 0; i <= numSegments; i++) {
      const t = i / numSegments
      const a = startAngle + sweepAngle * t
      arcPoints.push([
        center[0] + r * Math.cos(a),
        center[1] + r * Math.sin(a)
      ])
    }
    
    return arcPoints
  }

  // Process points
  filleted.push(points[0]) // Always add first point

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]
    const corner = points[i]
    const next = points[i + 1]
    
    const filletPoints = createFillet(prev, corner, next, radius)
    
    // Skip first point of fillet (already connected)
    for (let j = 1; j < filletPoints.length; j++) {
      filleted.push(filletPoints[j])
    }
  }

  filleted.push(points[points.length - 1]) // Always add last point

  return filleted
}

/**
 * Main function: Convert segments to offset path with fillets
 * Creates BOTH inner and outer offsets (both sides of centerline)
 * 
 * @param {Array} segments - Array of segment objects {type, start, end}
 * @param {Object} config - Configuration
 * @param {number} config.offsetDistance - Offset distance (default: 5")
 * @param {number} config.filletRadius - Fillet radius (default: 1")
 * @returns {Array} Array of offset curves with points
 */
export function computeOffsets(segments, config = {}) {
  const {
    offsetDistance = 5, // Default: 5" offset
    filletRadius = 1.0  // Default: 1" fillet radius
  } = config

  console.log('[computeOffsets] Input segments:', segments.length)

  // Step 1: Join segments into continuous paths
  const paths = joinSegments(segments)
  console.log('[computeOffsets] Joined paths:', paths.length)

  const offsetCurves = []

  // Process each continuous path
  for (const path of paths) {
    console.log('[computeOffsets] Processing path with', path.length, 'segments')
    
    // Generate BOTH inner and outer offsets
    const offsets = [
      { distance: offsetDistance, label: 'outer' },
      { distance: -offsetDistance, label: 'inner' }
    ]
    
    for (const { distance, label } of offsets) {
      console.log(`[computeOffsets] Creating ${label} offset (distance: ${distance})`)
      
      // Step 2: Offset the path
      const offsetPoints = offsetPath(path, distance)
      console.log(`[computeOffsets] ${label} offset points:`, offsetPoints.length)
      
      // Step 3: Apply fillets to sharp corners
      const filletedPoints = filletCorners(offsetPoints, filletRadius)
      console.log(`[computeOffsets] ${label} filleted points:`, filletedPoints.length)
      
      if (filletedPoints.length >= 2) {
        offsetCurves.push({
          points: filletedPoints,
          distance: distance,
          side: label,
          sourceSegments: path
        })
      }
    }
  }

  console.log('[computeOffsets] Total offset curves:', offsetCurves.length)
  return offsetCurves
}

/**
 * Legacy function: Convert wall objects to segments
 * (Kept for backward compatibility)
 */
export function segmentsToWalls(segments, config = {}) {
  // Just pass through - we work with segments directly
  return segments
}

/**
 * Legacy function: Convert path points to wall objects
 * (Kept for backward compatibility)
 */
export function pathToWalls(path, config = {}) {
  // Convert points to segments
  if (!path || path.length < 2) {
    return []
  }

  const segments = []
  for (let i = 0; i < path.length - 1; i++) {
    segments.push({
      type: 'line',
      start: [path[i][0], path[i][1]],
      end: [path[i + 1][0], path[i + 1][1]]
    })
  }

  return segments
}

/**
 * Legacy function: Convert offset curves to path
 * (Kept for backward compatibility)
 */
export function offsetCurvesToPath(offsetCurves, z = 0) {
  if (offsetCurves.length === 0) {
    return []
  }

  const path = []
  for (const curve of offsetCurves) {
    for (const point of curve.points) {
      path.push([point[0], point[1], z])
    }
  }

  return path
}
