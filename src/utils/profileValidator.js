/**
 * Validates a 2D profile geometry
 * Checks if it's closed, 2D, and has valid structure
 */

/**
 * Validates a profile and returns detailed error messages
 * @param {Array} profile - Array of [x, y] points
 * @returns {Object} { isValid: boolean, errors: string[], warnings: string[] }
 */
export function validateProfileDetailed(profile) {
  const errors = []
  const warnings = []

  // Check if profile exists
  if (!profile) {
    errors.push('Profile is null or undefined')
    return { isValid: false, errors, warnings }
  }

  // Check if it's an array
  if (!Array.isArray(profile)) {
    errors.push(`Profile must be an array, got ${typeof profile}`)
    return { isValid: false, errors, warnings }
  }

  // Check minimum points
  if (profile.length < 3) {
    errors.push(`Profile must have at least 3 points, got ${profile.length}`)
    return { isValid: false, errors, warnings }
  }

  // Check if all points are valid
  for (let i = 0; i < profile.length; i++) {
    const point = profile[i]
    
    if (!Array.isArray(point)) {
      errors.push(`Point at index ${i} is not an array: ${typeof point}`)
      continue
    }

    if (point.length !== 2) {
      errors.push(`Point at index ${i} must be 2D [x, y], got ${point.length} dimensions`)
      continue
    }

    // Check for NaN or invalid numbers
    if (typeof point[0] !== 'number' || isNaN(point[0]) || !isFinite(point[0])) {
      errors.push(`Point at index ${i} has invalid X coordinate: ${point[0]}`)
    }
    if (typeof point[1] !== 'number' || isNaN(point[1]) || !isFinite(point[1])) {
      errors.push(`Point at index ${i} has invalid Y coordinate: ${point[1]}`)
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors, warnings }
  }

  // Check if profile is closed
  const first = profile[0]
  const last = profile[profile.length - 1]
  const distance = Math.sqrt(
    Math.pow(last[0] - first[0], 2) + 
    Math.pow(last[1] - first[1], 2)
  )
  
  const tolerance = 0.001
  const isClosed = distance < tolerance

  if (!isClosed) {
    errors.push(`Profile is not closed. First point [${first[0].toFixed(3)}, ${first[1].toFixed(3)}] and last point [${last[0].toFixed(3)}, ${last[1].toFixed(3)}] are ${distance.toFixed(6)} units apart (must be < ${tolerance})`)
  }

  // Check for self-intersections (basic check)
  const selfIntersections = checkSelfIntersections(profile)
  if (selfIntersections.length > 0) {
    errors.push(`Profile has ${selfIntersections.length} self-intersection(s) at segment pairs: ${selfIntersections.map(p => `${p[0]}-${p[1]}`).join(', ')}`)
  }

  // Check for duplicate consecutive points
  const duplicates = []
  for (let i = 0; i < profile.length - 1; i++) {
    const dist = Math.sqrt(
      Math.pow(profile[i + 1][0] - profile[i][0], 2) + 
      Math.pow(profile[i + 1][1] - profile[i][1], 2)
    )
    if (dist < tolerance) {
      duplicates.push(i)
    }
  }
  if (duplicates.length > 0) {
    warnings.push(`Profile has ${duplicates.length} duplicate consecutive point(s) at indices: ${duplicates.join(', ')}`)
  }

  // Check if profile has area (not just a line)
  const area = calculatePolygonArea(profile)
  if (Math.abs(area) < 0.0001) {
    warnings.push('Profile has very small or zero area - may not form a valid closed shape')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Checks for self-intersections in a polygon
 * Returns array of [segment1, segment2] pairs that intersect
 * Properly handles closed profiles by ignoring the closing segment
 */
function checkSelfIntersections(profile) {
  const intersections = []
  const tolerance = 0.001
  
  // Check if profile is closed (first and last points are the same)
  const first = profile[0]
  const last = profile[profile.length - 1]
  const isClosed = Math.sqrt(
    Math.pow(last[0] - first[0], 2) + 
    Math.pow(last[1] - first[1], 2)
  ) < tolerance
  
  // Number of actual segments (excluding the closing segment if closed)
  const numSegments = isClosed ? profile.length - 1 : profile.length - 1

  for (let i = 0; i < numSegments; i++) {
    for (let j = i + 2; j < numSegments; j++) {
      // For closed profiles, skip checking the last segment (which closes back to first)
      // against the first segment, as they share the same endpoint
      if (isClosed) {
        // Skip if checking last segment (i = numSegments-1) with first segment (j = 0)
        // or first segment (i = 0) with last segment (j = numSegments-1)
        if ((i === numSegments - 1 && j === 0) || (i === 0 && j === numSegments - 1)) {
          continue
        }
        // Skip if checking last segment with any segment
        if (i === numSegments - 1 || j === numSegments - 1) {
          // Only skip if they're adjacent (share an endpoint)
          if (Math.abs(i - j) === 1 || Math.abs(i - j) === numSegments - 1) {
            continue
          }
        }
      }
      
      const p1 = profile[i]
      const p2 = profile[i + 1]
      const p3 = profile[j]
      const p4 = profile[j + 1]

      // Only check for actual crossings in the interior of segments
      // (not just sharing endpoints, which is normal for closed polygons)
      if (segmentsCrossInterior(p1, p2, p3, p4, tolerance)) {
        intersections.push([i, j])
      }
    }
  }

  return intersections
}

/**
 * Checks if two 2D line segments cross in their interior (not just at endpoints)
 * This is the proper check for self-intersections in polygons
 */
function segmentsCrossInterior(p1, p2, p3, p4, tolerance = 0.001) {
  const ccw = (A, B, C) => {
    return (C[1] - A[1]) * (B[0] - A[0]) > (B[1] - A[1]) * (C[0] - A[0])
  }
  
  // Check if segments share an endpoint (this is normal for closed polygons)
  const shareEndpoint = (
    (Math.abs(p1[0] - p3[0]) < tolerance && Math.abs(p1[1] - p3[1]) < tolerance) ||
    (Math.abs(p1[0] - p4[0]) < tolerance && Math.abs(p1[1] - p4[1]) < tolerance) ||
    (Math.abs(p2[0] - p3[0]) < tolerance && Math.abs(p2[1] - p3[1]) < tolerance) ||
    (Math.abs(p2[0] - p4[0]) < tolerance && Math.abs(p2[1] - p4[1]) < tolerance)
  )
  
  if (shareEndpoint) {
    // If they share an endpoint, they don't count as crossing
    return false
  }
  
  // Check if segments actually cross (using CCW test)
  // Segments cross if the endpoints of one segment are on opposite sides
  // of the line containing the other segment
  const cross1 = ccw(p1, p3, p4) !== ccw(p2, p3, p4)
  const cross2 = ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  
  // Both conditions must be true for segments to cross
  return cross1 && cross2
}

/**
 * Calculates distance from a point to a line segment
 */
function pointToSegmentDistance(point, segStart, segEnd) {
  const A = point[0] - segStart[0]
  const B = point[1] - segStart[1]
  const C = segEnd[0] - segStart[0]
  const D = segEnd[1] - segStart[1]

  const dot = A * C + B * D
  const lenSq = C * C + D * D
  let param = -1

  if (lenSq !== 0) param = dot / lenSq

  let xx, yy

  if (param < 0) {
    xx = segStart[0]
    yy = segStart[1]
  } else if (param > 1) {
    xx = segEnd[0]
    yy = segEnd[1]
  } else {
    xx = segStart[0] + param * C
    yy = segStart[1] + param * D
  }

  const dx = point[0] - xx
  const dy = point[1] - yy
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Calculates the signed area of a polygon
 */
function calculatePolygonArea(points) {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    area += points[i][0] * points[j][1]
    area -= points[j][0] * points[i][1]
  }
  return area / 2
}

