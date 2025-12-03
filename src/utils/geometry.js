import * as THREE from 'three'

/**
 * Validates a 2D profile (array of points)
 */
export function validateProfile(profile) {
  if (!profile || !Array.isArray(profile)) {
    throw new Error('Profile must be an array of points')
  }
  
  if (profile.length < 3) {
    throw new Error('Profile must have at least 3 points to form a closed shape')
  }

  // Check if profile is closed (first and last points should be the same)
  const first = profile[0]
  const last = profile[profile.length - 1]
  const isClosed = Math.abs(first[0] - last[0]) < 0.001 && 
                   Math.abs(first[1] - last[1]) < 0.001

  if (!isClosed) {
    throw new Error('Profile must be closed (first and last points must match)')
  }

  // Check for self-intersections (properly handle closed profiles)
  const tolerance = 0.001
  // For closed profiles, we have profile.length points where last = first
  // So we have profile.length - 1 actual segments (the last one closes back)
  const numSegments = profile.length - 1
  
  for (let i = 0; i < numSegments; i++) {
    for (let j = i + 2; j < numSegments; j++) {
      // Skip checking adjacent segments (they share an endpoint)
      // For closed profiles: skip last segment (i = numSegments-1) with first segment (j = 0)
      // and first segment (i = 0) with last segment (j = numSegments-1)
      if (i === 0 && j === numSegments - 1) continue
      
      const p1 = profile[i]
      const p2 = profile[i + 1]
      const p3 = profile[j]
      const p4 = profile[j + 1]
      
      // Only check for actual crossings in interior (not at endpoints)
      if (segmentsCrossInterior(p1, p2, p3, p4, tolerance)) {
        throw new Error('Profile contains self-intersecting segments')
      }
    }
  }

  return true
}

/**
 * Validates a path (array of 3D points)
 */
export function validatePath(path) {
  if (!path || !Array.isArray(path)) {
    throw new Error('Path must be an array of 3D points')
  }
  
  if (path.length < 2) {
    throw new Error('Path must have at least 2 points')
  }

  // Check for duplicate consecutive points
  for (let i = 0; i < path.length - 1; i++) {
    const dist = distance3D(path[i], path[i + 1])
    if (dist < 0.001) {
      throw new Error('Path contains duplicate consecutive points')
    }
  }

  // Check for self-intersections (paths can be open or closed)
  const tolerance = 0.001
  const first = path[0]
  const last = path[path.length - 1]
  const isClosed = path.length > 2 && 
    Math.abs(last[0] - first[0]) < tolerance && 
    Math.abs(last[1] - first[1]) < tolerance &&
    Math.abs((last[2] || 0) - (first[2] || 0)) < tolerance
  
  // Number of segments to check (exclude closing segment if closed)
  const numSegments = isClosed ? path.length - 1 : path.length - 1
  
  for (let i = 0; i < numSegments; i++) {
    for (let j = i + 2; j < numSegments; j++) {
      // For closed paths, skip checking closing segment with first segment
      if (isClosed) {
        if ((i === numSegments - 1 && j === 0) || (i === 0 && j === numSegments - 1)) {
          continue
        }
        // Skip if checking last segment with adjacent segments
        if (i === numSegments - 1 || j === numSegments - 1) {
          if (Math.abs(i - j) === 1 || Math.abs(i - j) === numSegments - 1) {
            continue
          }
        }
      }
      
      const p1 = path[i]
      const p2 = path[i + 1]
      const p3 = path[j]
      const p4 = path[j + 1]
      
      // Check for 2D projection intersection (ignore Z for intersection check)
      if (segmentsCrossInterior2D(p1, p2, p3, p4, tolerance)) {
        throw new Error('Path contains self-intersecting segments')
      }
    }
  }

  return true
}

/**
 * Calculates the distance between two 3D points
 */
function distance3D(p1, p2) {
  const dx = p2[0] - p1[0]
  const dy = p2[1] - p1[1]
  const dz = p2[2] - p1[2]
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/**
 * Checks if two 2D line segments cross in their interior (not just at endpoints)
 * This properly handles closed polygons where segments share endpoints
 */
function segmentsCrossInterior(p1, p2, p3, p4, tolerance = 0.001) {
  return segmentsCrossInterior2D(p1, p2, p3, p4, tolerance)
}

/**
 * Checks if two line segments cross in their interior (2D projection)
 * Works with 2D or 3D points (uses only X and Y coordinates)
 */
function segmentsCrossInterior2D(p1, p2, p3, p4, tolerance = 0.001) {
  const ccw = (A, B, C) => {
    // Extract 2D coordinates (ignore Z if present)
    const ax = A[0], ay = A[1]
    const bx = B[0], by = B[1]
    const cx = C[0], cy = C[1]
    return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax)
  }
  
  // Extract 2D coordinates
  const p1_2d = [p1[0], p1[1]]
  const p2_2d = [p2[0], p2[1]]
  const p3_2d = [p3[0], p3[1]]
  const p4_2d = [p4[0], p4[1]]
  
  // Check if segments share an endpoint (this is normal for closed polygons/paths)
  const shareEndpoint = (
    (Math.abs(p1_2d[0] - p3_2d[0]) < tolerance && Math.abs(p1_2d[1] - p3_2d[1]) < tolerance) ||
    (Math.abs(p1_2d[0] - p4_2d[0]) < tolerance && Math.abs(p1_2d[1] - p4_2d[1]) < tolerance) ||
    (Math.abs(p2_2d[0] - p3_2d[0]) < tolerance && Math.abs(p2_2d[1] - p3_2d[1]) < tolerance) ||
    (Math.abs(p2_2d[0] - p4_2d[0]) < tolerance && Math.abs(p2_2d[1] - p4_2d[1]) < tolerance)
  )
  
  if (shareEndpoint) {
    // If they share an endpoint, they don't count as crossing
    return false
  }
  
  // Check if segments actually cross (using CCW test)
  const cross1 = ccw(p1_2d, p3_2d, p4_2d) !== ccw(p2_2d, p3_2d, p4_2d)
  const cross2 = ccw(p1_2d, p2_2d, p3_2d) !== ccw(p1_2d, p2_2d, p4_2d)
  
  // Both conditions must be true for segments to cross
  return cross1 && cross2
}

/**
 * Creates a transformation matrix for a point along a path
 * Calculates the normal, tangent, and binormal vectors (Frenet-Serret frame)
 */
function getPathFrame(path, index, up = new THREE.Vector3(0, 0, 1)) {
  const pointIndex = Math.min(index, path.length - 1)
  const current = new THREE.Vector3(...path[pointIndex])
  
  let tangent
  
  // Calculate tangent based on position along path
  if (pointIndex === path.length - 1) {
    // At the last point, use the previous segment's direction
    if (path.length > 1) {
      const prev = new THREE.Vector3(...path[pointIndex - 1])
      tangent = current.clone().sub(prev).normalize()
    } else {
      tangent = new THREE.Vector3(1, 0, 0) // Fallback
    }
  } else {
    // Use direction to next point
    const next = new THREE.Vector3(...path[pointIndex + 1])
    tangent = next.clone().sub(current).normalize()
  }
  
  // Handle zero-length tangent (shouldn't happen due to validation, but safety check)
  if (tangent.length() < 0.001) {
    tangent = new THREE.Vector3(1, 0, 0)
  }
  
  // If tangent is parallel to up vector, use a different up
  if (Math.abs(tangent.dot(up)) > 0.99) {
    up = new THREE.Vector3(1, 0, 0)
    if (Math.abs(tangent.dot(up)) > 0.99) {
      up = new THREE.Vector3(0, 1, 0)
    }
  }
  
  // Binormal (perpendicular to tangent and up)
  const binormal = tangent.clone().cross(up).normalize()
  
  // Normal (perpendicular to tangent and binormal)
  const normal = binormal.clone().cross(tangent).normalize()
  
  // Create transformation matrix
  // makeBasis creates a matrix where the vectors become columns
  // So profile [x, y, 0] maps: x -> normal, y -> binormal, z -> tangent
  const matrix = new THREE.Matrix4()
  matrix.makeBasis(normal, binormal, tangent)
  matrix.setPosition(current)
  
  return { matrix, position: current, normal, tangent, binormal }
}

/**
 * Performs lofting operation: extrudes a 2D profile along a 3D path
 * Returns a Three.js BufferGeometry
 */
export function loftGeometry(profile, path) {
  // Validate inputs
  validateProfile(profile)
  validatePath(path)

  // Convert 2D profile to 3D (assuming profile is in XY plane, z=0)
  const profile3D = profile.map(p => [p[0], p[1], 0])

  const vertices = []
  const indices = []
  const normals = []

  // Generate vertices by transforming profile along path
  for (let i = 0; i < path.length; i++) {
    const { matrix, normal } = getPathFrame(path, i)
    
    // Transform each profile point
    for (const profilePoint of profile3D) {
      const point = new THREE.Vector3(...profilePoint)
      point.applyMatrix4(matrix)
      vertices.push(point.x, point.y, point.z)
      
      // Calculate normal for this vertex
      const vertexNormal = normal.clone()
      normals.push(vertexNormal.x, vertexNormal.y, vertexNormal.z)
    }
  }

  // Generate faces (triangles)
  const profilePointCount = profile3D.length
  for (let i = 0; i < path.length - 1; i++) {
    const baseIndex = i * profilePointCount
    const nextBaseIndex = (i + 1) * profilePointCount

    for (let j = 0; j < profilePointCount - 1; j++) {
      const a = baseIndex + j
      const b = baseIndex + j + 1
      const c = nextBaseIndex + j
      const d = nextBaseIndex + j + 1

      // First triangle
      indices.push(a, b, c)
      // Second triangle
      indices.push(b, d, c)
    }
  }

  // Create geometry
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  return geometry
}

/**
 * Parses JSON geometry input
 * Expected format:
 * {
 *   profile: [[x1, y1], [x2, y2], ...],
 *   path: [[x1, y1, z1], [x2, y2, z2], ...]
 * }
 */
export function parseGeometryInput(input) {
  try {
    const data = typeof input === 'string' ? JSON.parse(input) : input
    
    if (!data.profile || !data.path) {
      throw new Error('Input must contain both "profile" and "path" arrays')
    }

    return {
      profile: data.profile,
      path: data.path
    }
  } catch (error) {
    throw new Error(`Failed to parse geometry input: ${error.message}`)
  }
}

