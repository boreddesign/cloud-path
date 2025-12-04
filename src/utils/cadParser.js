/**
 * Parses CAD files and extracts geometry data
 * Supports JSON files and DXF files
 */

import { parseDXFFile } from './dxfParser'

/**
 * Parses a CAD file and extracts profile or path geometry
 * @param {string} fileContent - The file content as text
 * @param {string} fileName - The name of the file
 * @param {string} expectedType - 'profile' or 'path'
 * @returns {Array} Array of points
 */
export async function parseCADFile(fileContent, fileName, expectedType) {
  const extension = fileName.split('.').pop().toLowerCase()

  switch (extension) {
    case 'json':
      return parseJSONFile(fileContent, expectedType)
    
    case 'dxf':
      return parseDXFFile(fileContent, expectedType)
    
    case 'step':
    case 'stp':
      throw new Error('STEP file format not yet supported. Please use DXF or JSON format.')
    
    case 'iges':
    case 'igs':
      throw new Error('IGES file format not yet supported. Please use DXF or JSON format.')
    
    default:
      throw new Error(`Unsupported file format: .${extension}. Please use DXF or JSON format.`)
  }
}

/**
 * Checks if data is in segment format
 */
function isSegmentFormat(data) {
  return Array.isArray(data) && 
         data.length > 0 && 
         typeof data[0] === 'object' && 
         data[0] !== null && 
         'type' in data[0] &&
         'start' in data[0] &&
         'end' in data[0]
}

/**
 * Parses JSON file containing geometry data
 * Expected formats:
 * - Array of points: [[x, y], [x, y], ...] for profile (legacy format)
 * - Array of points: [[x, y, z], [x, y, z], ...] for path (legacy format)
 * - Array of segments: [{type: 'line', start: [x,y,z], end: [x,y,z]}, ...] (new format)
 * - Object with profile/path: { profile: [...], path: [...] }
 * 
 * Returns segments if detected, otherwise returns points array
 */
function parseJSONFile(fileContent, expectedType) {
  try {
    const data = JSON.parse(fileContent)
    
    // If it's an array, check if it's segments or points
    if (Array.isArray(data)) {
      // Check if first element is a segment object (new format)
      if (isSegmentFormat(data)) {
        // Return segments directly (don't convert to points)
        return { segments: data, isSegments: true }
      }
      // Legacy format - array of points
      return { points: data, isSegments: false }
    }
    
    // If it's an object, extract the relevant property
    if (typeof data === 'object' && data !== null) {
      if (expectedType === 'profile' && data.profile) {
        if (isSegmentFormat(data.profile)) {
          return { segments: data.profile, isSegments: true }
        }
        return { points: data.profile, isSegments: false }
      }
      if (expectedType === 'path' && data.path) {
        if (isSegmentFormat(data.path)) {
          return { segments: data.path, isSegments: true }
        }
        return { points: data.path, isSegments: false }
      }
      // Try to find any array property
      const arrayKeys = Object.keys(data).filter(key => Array.isArray(data[key]))
      if (arrayKeys.length === 1) {
        const arr = data[arrayKeys[0]]
        if (isSegmentFormat(arr)) {
          return { segments: arr, isSegments: true }
        }
        return { points: arr, isSegments: false }
      }
      throw new Error(`JSON file must contain a ${expectedType} array or a single array property`)
    }
    
    throw new Error('JSON file must contain an array of points or segments, or an object with profile/path arrays')
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format')
    }
    throw error
  }
}

/**
 * Converts segment-based geometry to a continuous path of points (for visualization)
 * @param {Array} segments - Array of segment objects with type, start, end
 * @param {string} expectedType - 'profile' or 'path'
 * @returns {Array} Array of points
 */
/**
 * Reorders segments to form a continuous path
 * Tries to connect segments end-to-end
 */
function reorderSegments(segments, isProfile) {
  if (segments.length <= 1) return segments
  
  const tolerance = 0.001
  const ordered = [segments[0]]
  const used = new Set([0])
  
  // Helper to check if two points match
  const pointsMatch = (p1, p2) => {
    const dist = isProfile
      ? Math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)
      : Math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2 + ((p1[2] || 0) - (p2[2] || 0))**2)
    return dist < tolerance
  }
  
  // Helper to get point from segment
  const getPoint = (seg, which) => {
    const pt = which === 'start' ? seg.start : seg.end
    return isProfile 
      ? [pt[0], pt[1]]
      : (pt.length === 3 ? pt : [pt[0], pt[1], 0])
  }
  
  // Build continuous path
  while (ordered.length < segments.length) {
    const lastSeg = ordered[ordered.length - 1]
    const lastEnd = getPoint(lastSeg, 'end')
    let found = false
    
    // Find next segment that connects
    for (let i = 0; i < segments.length; i++) {
      if (used.has(i)) continue
      
      const seg = segments[i]
      const segStart = getPoint(seg, 'start')
      const segEnd = getPoint(seg, 'end')
      
      // Check if segment connects at start
      if (pointsMatch(lastEnd, segStart)) {
        ordered.push(seg)
        used.add(i)
        found = true
        break
      }
      
      // Check if segment connects at end (reverse it)
      if (pointsMatch(lastEnd, segEnd)) {
        ordered.push({ ...seg, start: seg.end, end: seg.start })
        used.add(i)
        found = true
        break
      }
    }
    
    if (!found) break // Can't find next segment
  }
  
  // Add any remaining segments (they might be disconnected or form separate loops)
  for (let i = 0; i < segments.length; i++) {
    if (!used.has(i)) {
      ordered.push(segments[i])
    }
  }
  
  return ordered
}

/**
 * Samples an arc segment to points
 * @param {Object} segment - Segment with type 'arc', start, end, and optional center, radius
 * @param {boolean} isProfile - Whether this is a 2D profile
 * @param {number} maxSegmentLength - Maximum length between sampled points
 * @returns {Array} Array of points along the arc
 */
function sampleArc(segment, isProfile, maxSegmentLength = 1.0) {
  const points = []
  const tolerance = 0.001
  
  // Helper to get point in correct format
  const getPoint = (pt) => {
    if (isProfile) {
      return [pt[0], pt[1]]
    }
    return pt.length === 3 ? pt : [pt[0], pt[1], 0]
  }
  
  const start = getPoint(segment.start)
  const end = getPoint(segment.end)
  
  // If we have center and radius, use them for accurate arc sampling
  if (segment.center && segment.radius !== undefined) {
    const center = getPoint(segment.center)
    const radius = segment.radius
    
    // Calculate angles
    const startAngle = Math.atan2(start[1] - center[1], start[0] - center[0])
    const endAngle = Math.atan2(end[1] - center[1], end[0] - center[0])
    
    // Determine sweep angle (handle wrap-around)
    let sweepAngle = endAngle - startAngle
    if (segment.clockwise !== undefined && segment.clockwise) {
      if (sweepAngle > 0) sweepAngle -= 2 * Math.PI
    } else {
      if (sweepAngle < 0) sweepAngle += 2 * Math.PI
    }
    
    // Calculate number of segments needed
    const arcLength = Math.abs(sweepAngle) * radius
    const numSegments = Math.max(2, Math.ceil(arcLength / maxSegmentLength))
    
    // Sample points along arc
    for (let i = 0; i <= numSegments; i++) {
      const t = i / numSegments
      const angle = startAngle + sweepAngle * t
      const x = center[0] + radius * Math.cos(angle)
      const y = center[1] + radius * Math.sin(angle)
      const z = isProfile ? undefined : (start[2] !== undefined ? start[2] + (end[2] - start[2]) * t : 0)
      
      if (isProfile) {
        points.push([x, y])
      } else {
        points.push([x, y, z !== undefined ? z : 0])
      }
    }
  } else {
    // Fallback: treat as line if no arc info
    // For arcs without center/radius, we need to estimate the arc
    // If it's a semicircle or similar, we can approximate it
    // For now, sample as a line with a few intermediate points to approximate curvature
    const midPoint = [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2
    ]
    
    // If it's an arc type, try to create a curved approximation
    // Estimate radius from chord length (assuming semicircle)
    const chordLength = Math.sqrt((end[0] - start[0])**2 + (end[1] - start[1])**2)
    if (chordLength > 0.001 && segment.type === 'arc') {
      // Estimate as semicircle: radius = chordLength / 2
      const estimatedRadius = chordLength / 2
      const estimatedCenter = midPoint
      
      // Sample as semicircle
      const numSegments = Math.max(4, Math.ceil(chordLength / maxSegmentLength))
      for (let i = 0; i <= numSegments; i++) {
        const t = i / numSegments
        const angle = Math.PI * t // Semicircle from 0 to PI
        const x = estimatedCenter[0] + estimatedRadius * Math.cos(angle - Math.PI/2)
        const y = estimatedCenter[1] + estimatedRadius * Math.sin(angle - Math.PI/2)
        
        if (isProfile) {
          points.push([x, y])
        } else {
          points.push([x, y, start[2] !== undefined ? start[2] + (end[2] - start[2]) * t : 0])
        }
      }
    } else {
      // Just a line
      points.push(start)
      points.push(end)
    }
  }
  
  return points
}

/**
 * Converts segment-based geometry to a continuous path of points
 * Properly samples arcs and other curve types
 * @param {Array} segments - Array of segment objects with type, start, end
 * @param {string} expectedType - 'profile' or 'path'
 * @param {Object} options - Options for sampling (maxSegmentLength for arcs)
 * @returns {Array} Array of points
 */
export function segmentsToPoints(segments, expectedType, options = {}) {
  const points = []
  const isProfile = expectedType === 'profile'
  const maxSegmentLength = options.maxSegmentLength || 1.0
  
  // Helper to get point in correct format (defined outside loop for reuse)
  const getPoint = (pt) => {
    if (isProfile) {
      return [pt[0], pt[1]]
    }
    return pt.length === 3 ? pt : [pt[0], pt[1], 0]
  }
  
  // Reorder segments to form continuous path
  const orderedSegments = reorderSegments(segments, isProfile)
  
  for (let i = 0; i < orderedSegments.length; i++) {
    const segment = orderedSegments[i]
    
    if (!segment.start || !segment.end) {
      throw new Error(`Segment at index ${i} is missing start or end point`)
    }
    
    const start = getPoint(segment.start)
    const end = getPoint(segment.end)
    
    // Handle different segment types
    if (segment.type === 'arc' || segment.type === 'circle') {
      // Sample arc with appropriate density
      const arcPoints = sampleArc(segment, isProfile, maxSegmentLength)
      
      // Add points, avoiding duplicates at connections
      if (i === 0) {
        // First segment - add all points
        points.push(...arcPoints)
      } else {
        // Check if first point of arc matches last point we added
        const prevSegment = orderedSegments[i - 1]
        const prevEnd = getPoint(prevSegment.end)
        const tolerance = 0.001
        const dist = isProfile
          ? Math.sqrt((arcPoints[0][0] - prevEnd[0])**2 + (arcPoints[0][1] - prevEnd[1])**2)
          : Math.sqrt((arcPoints[0][0] - prevEnd[0])**2 + (arcPoints[0][1] - prevEnd[1])**2 + ((arcPoints[0][2] || 0) - (prevEnd[2] || 0))**2)
        
        if (dist > tolerance) {
          // Not connected - add all points
          points.push(...arcPoints)
        } else {
          // Connected - skip first point to avoid duplicate
          points.push(...arcPoints.slice(1))
        }
      }
    } else {
      // Line, polyline, or curve - just add start and end
      if (i === 0) {
        points.push(start)
      } else {
        // Check if this segment connects to the previous one
        const prevSegment = orderedSegments[i - 1]
        const prevEnd = getPoint(prevSegment.end)
        const tolerance = 0.001
        const dist = isProfile
          ? Math.sqrt((start[0] - prevEnd[0])**2 + (start[1] - prevEnd[1])**2)
          : Math.sqrt((start[0] - prevEnd[0])**2 + (start[1] - prevEnd[1])**2 + ((start[2] || 0) - (prevEnd[2] || 0))**2)
        
        if (dist > tolerance) {
          points.push(start)
        }
      }
      
      points.push(end)
    }
  }
  
  // For profiles, check if the segments form a closed loop
  // (last segment's end should equal first segment's start)
  if (isProfile && orderedSegments.length > 0) {
    const firstSegment = orderedSegments[0]
    const lastSegment = orderedSegments[orderedSegments.length - 1]
    const firstStart = getPoint(firstSegment.start)
    const lastEnd = getPoint(lastSegment.end)
    
    const tolerance = 0.001
    const dist = Math.sqrt((lastEnd[0] - firstStart[0])**2 + (lastEnd[1] - firstStart[1])**2)
    
    // If the loop is closed (last end == first start), ensure the points array reflects this
    if (dist < tolerance) {
      // Check if the last point already equals the first point
      const lastPoint = points[points.length - 1]
      const firstPoint = points[0]
      const lastPointDist = Math.sqrt((lastPoint[0] - firstPoint[0])**2 + (lastPoint[1] - firstPoint[1])**2)
      
      // If last point doesn't match first point, add it to close the loop
      if (lastPointDist >= tolerance) {
        points.push(firstPoint)
      }
    }
  }
  
  return points
}

/**
 * Validates that the parsed geometry matches the expected type
 * Accepts segments or points
 * @param {Array} geometry - Array of points or segments
 * @param {string} expectedType - 'profile' or 'path'
 * @returns {Array} Returns geometry as-is (segments or points)
 */
export function validateGeometryType(geometry, expectedType) {
  if (!Array.isArray(geometry) || geometry.length === 0) {
    throw new Error(`${expectedType} must be an array with at least one element`)
  }

  // Check if it's segment format
  if (isSegmentFormat(geometry)) {
    // Validate segments have required properties
    for (let i = 0; i < geometry.length; i++) {
      const seg = geometry[i]
      if (!seg.start || !seg.end || !seg.type) {
        throw new Error(`Segment at index ${i} must have type, start, and end properties`)
      }
    }
    return geometry // Return segments as-is
  }

  // Legacy point format validation
  const firstPoint = geometry[0]
  if (!Array.isArray(firstPoint)) {
    throw new Error(`${expectedType} must be an array of point arrays or segments`)
  }

  if (expectedType === 'profile') {
    // Profile should be 2D points [x, y]
    if (firstPoint.length !== 2) {
      throw new Error('Profile must contain 2D points [x, y]')
    }
    // Check all points are 2D
    for (let i = 0; i < geometry.length; i++) {
      if (!Array.isArray(geometry[i]) || geometry[i].length !== 2) {
        throw new Error(`Profile point at index ${i} must be a 2D point [x, y]`)
      }
    }
  } else if (expectedType === 'path') {
    // Path can be 2D or 3D points
    // If 2D, convert to 3D by adding z=0
    if (firstPoint.length === 2) {
      // Convert 2D points to 3D
      return geometry.map(p => [p[0], p[1], 0])
    } else if (firstPoint.length === 3) {
      // Already 3D, validate all points
      for (let i = 0; i < geometry.length; i++) {
        if (!Array.isArray(geometry[i]) || geometry[i].length !== 3) {
          throw new Error(`Path point at index ${i} must be a 2D or 3D point`)
        }
      }
      return geometry
    } else {
      throw new Error('Path must contain 2D [x, y] or 3D [x, y, z] points')
    }
  }
  
  return geometry
}

