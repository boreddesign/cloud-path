import DxfParser from 'dxf-parser'

/**
 * Parses DXF file and extracts geometry as point arrays
 * Supports: lines, polylines, arcs, circles, splines
 */

/**
 * Converts DXF entities to point arrays
 * @param {string} dxfContent - DXF file content as text
 * @param {string} expectedType - 'profile' or 'path'
 * @returns {Array} Array of points
 */
export function parseDXFFile(dxfContent, expectedType) {
  try {
    const parser = new DxfParser()
    const dxf = parser.parseSync(dxfContent)
    
    if (!dxf) {
      throw new Error('Failed to parse DXF file')
    }
    
    if (!dxf.entities || dxf.entities.length === 0) {
      throw new Error('DXF file contains no entities. Make sure the file contains geometry (lines, polylines, arcs, etc.)')
    }

    const points = []
    const lineEntities = []
    const otherEntities = []
    
    // Separate LINE entities from other entities
    // LINE entities might need to be connected into a continuous path
    for (const entity of dxf.entities) {
      if (entity.type === 'LINE') {
        lineEntities.push(entity)
      } else {
        otherEntities.push(entity)
      }
    }
    
    console.log(`DXF Parser: Found ${lineEntities.length} LINE entities and ${otherEntities.length} other entities`)
    
    // Process non-LINE entities first
    for (const entity of otherEntities) {
      try {
        const entityPoints = extractPointsFromEntity(entity, expectedType)
        if (entityPoints && entityPoints.length > 0) {
          points.push(...entityPoints)
          console.log(`Extracted ${entityPoints.length} points from ${entity.type}`)
        }
      } catch (err) {
        console.warn(`Skipping entity type ${entity.type}:`, err.message)
        // Continue processing other entities
      }
    }
    
    // Process LINE entities - connect them if they form a continuous path
    if (lineEntities.length > 0) {
      const linePoints = connectLines(lineEntities, expectedType)
      if (linePoints && linePoints.length > 0) {
        points.push(...linePoints)
        console.log(`Connected ${lineEntities.length} lines into ${linePoints.length} points`)
      }
    }

    if (points.length === 0) {
      throw new Error('No extractable geometry found in DXF file. Supported entities: lines, polylines, arcs, circles, splines')
    }
    
    console.log(`Total points extracted: ${points.length}`)

    // Remove duplicate consecutive points
    const cleanedPoints = removeDuplicatePoints(points)
    
    if (cleanedPoints.length < 2) {
      throw new Error('Not enough points extracted from DXF file. Need at least 2 points.')
    }
    
    // If it's a profile and not closed, close it
    if (expectedType === 'profile' && cleanedPoints.length > 2) {
      const first = cleanedPoints[0]
      const last = cleanedPoints[cleanedPoints.length - 1]
      
      if (!first || !last) {
        throw new Error('Invalid points in profile - first or last point is null')
      }
      
      if (!Array.isArray(first) || first.length < 2) {
        throw new Error(`Invalid first point format: expected [x, y], got ${JSON.stringify(first)}`)
      }
      
      if (!Array.isArray(last) || last.length < 2) {
        throw new Error(`Invalid last point format: expected [x, y], got ${JSON.stringify(last)}`)
      }
      
      const isClosed = Math.abs(first[0] - last[0]) < 0.001 && 
                       Math.abs(first[1] - last[1]) < 0.001
      
      if (!isClosed) {
        cleanedPoints.push([first[0], first[1]])
      }
    }

    return cleanedPoints
  } catch (error) {
    if (error.message.includes('DXF parsing error')) {
      throw error
    }
    throw new Error(`DXF parsing error: ${error.message}`)
  }
}

/**
 * Extracts points from a DXF entity
 */
function extractPointsFromEntity(entity, expectedType) {
  const points = []

  switch (entity.type) {
    case 'LINE':
      const lineStart = pointToArray(entity.start, expectedType)
      const lineEnd = pointToArray(entity.end, expectedType)
      if (lineStart) points.push(lineStart)
      if (lineEnd) points.push(lineEnd)
      break

    case 'LWPOLYLINE':
    case 'POLYLINE':
      if (entity.vertices && entity.vertices.length > 0) {
        for (const vertex of entity.vertices) {
          const vertexPoint = pointToArray(vertex, expectedType)
          if (vertexPoint) {
            points.push(vertexPoint)
          }
        }
        // If polyline is closed, add first point at end
        if (entity.closed && points.length > 0 && points[0]) {
          const firstPoint = points[0]
          if (expectedType === 'profile') {
            points.push([firstPoint[0], firstPoint[1]])
          } else {
            points.push([firstPoint[0], firstPoint[1], firstPoint[2] || 0])
          }
        }
      }
      break

    case 'ARC':
      points.push(...arcToPoints(entity, expectedType))
      break

    case 'CIRCLE':
      points.push(...circleToPoints(entity, expectedType))
      break

    case 'SPLINE':
      if (entity.controlPoints && entity.controlPoints.length > 0) {
        for (const cp of entity.controlPoints) {
          points.push(pointToArray(cp, expectedType))
        }
      } else if (entity.fitPoints && entity.fitPoints.length > 0) {
        for (const fp of entity.fitPoints) {
          points.push(pointToArray(fp, expectedType))
        }
      }
      break

    case 'SPLINECURVE':
      if (entity.controlPoints && entity.controlPoints.length > 0) {
        for (const cp of entity.controlPoints) {
          points.push(pointToArray(cp, expectedType))
        }
      }
      break

    default:
      // Try to extract points from any entity with position/start/end
      if (entity.position) {
        const posPoint = pointToArray(entity.position, expectedType)
        if (posPoint) points.push(posPoint)
      } else if (entity.start && entity.end) {
        const startPoint = pointToArray(entity.start, expectedType)
        const endPoint = pointToArray(entity.end, expectedType)
        if (startPoint) points.push(startPoint)
        if (endPoint) points.push(endPoint)
      } else {
        console.warn(`Unsupported or invalid entity type: ${entity.type}`, entity)
      }
      break
  }

  return points
}

/**
 * Converts a DXF point object to array format
 * Returns null if point is invalid
 */
function pointToArray(point, expectedType) {
  if (!point) {
    console.warn('pointToArray: point is null or undefined')
    return null
  }
  
  // Check if point has valid structure
  if (typeof point !== 'object') {
    console.warn('pointToArray: point is not an object:', typeof point)
    return null
  }
  
  const x = point.x !== undefined ? point.x : (point[0] !== undefined ? point[0] : 0)
  const y = point.y !== undefined ? point.y : (point[1] !== undefined ? point[1] : 0)
  const z = point.z !== undefined ? point.z : (point[2] !== undefined ? point[2] : 0)

  // Validate coordinates are numbers
  if (typeof x !== 'number' || isNaN(x) || !isFinite(x)) {
    console.warn('pointToArray: invalid x coordinate:', x)
    return null
  }
  if (typeof y !== 'number' || isNaN(y) || !isFinite(y)) {
    console.warn('pointToArray: invalid y coordinate:', y)
    return null
  }

  if (expectedType === 'profile') {
    // Profile is always 2D
    return [x, y]
  } else {
    // Path can be 2D or 3D, but we'll use 3D (z=0 if not specified)
    if (typeof z !== 'number' || isNaN(z) || !isFinite(z)) {
      return [x, y, 0]
    }
    return [x, y, z]
  }
}

/**
 * Converts an arc to a series of points
 */
function arcToPoints(arc, expectedType, segments = 32) {
  const points = []
  const center = { x: arc.center.x || 0, y: arc.center.y || 0, z: arc.center.z || 0 }
  const radius = arc.radius || 1
  const startAngle = (arc.startAngle || 0) * Math.PI / 180
  const endAngle = (arc.endAngle || 360) * Math.PI / 180
  
  // Handle angle wrapping
  let angle = startAngle
  const angleStep = (endAngle - startAngle) / segments
  
  for (let i = 0; i <= segments; i++) {
    const x = center.x + radius * Math.cos(angle)
    const y = center.y + radius * Math.sin(angle)
    const z = center.z
    
    if (expectedType === 'profile') {
      points.push([x, y])
    } else {
      points.push([x, y, z])
    }
    
    angle += angleStep
  }
  
  return points
}

/**
 * Converts a circle to a series of points
 */
function circleToPoints(circle, expectedType, segments = 32) {
  const points = []
  const center = { x: circle.center.x || 0, y: circle.center.y || 0, z: circle.center.z || 0 }
  const radius = circle.radius || 1
  
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI
    const x = center.x + radius * Math.cos(angle)
    const y = center.y + radius * Math.sin(angle)
    const z = center.z
    
    if (expectedType === 'profile') {
      points.push([x, y])
    } else {
      points.push([x, y, z])
    }
  }
  
  return points
}

/**
 * Connects multiple LINE entities into a continuous path
 * Tries to connect lines end-to-end to form a continuous path
 */
function connectLines(lineEntities, expectedType) {
  if (lineEntities.length === 0) return []
  
  const points = []
  const tolerance = 0.001
  
  // Extract start and end points from each line
  const lines = lineEntities
    .map(line => {
      const start = pointToArray(line.start, expectedType)
      const end = pointToArray(line.end, expectedType)
      // Only include lines with valid start and end points
      if (start && end) {
        return { start, end, used: false }
      }
      console.warn('Skipping line with invalid start or end point:', line)
      return null
    })
    .filter(line => line !== null)
  
  if (lines.length === 0) {
    console.warn('No valid lines to connect')
    return []
  }
  
  // Start with the first line
  let currentLine = lines[0]
  if (!currentLine.start || !currentLine.end) {
    console.warn('First line has invalid points')
    return []
  }
  
  currentLine.used = true
  points.push(currentLine.start)
  points.push(currentLine.end)
  let currentEnd = currentLine.end
  
  // Try to connect remaining lines
  let foundConnection = true
  while (foundConnection) {
    foundConnection = false
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].used) continue
      
      const line = lines[i]
      const distToStart = distance2D(currentEnd, line.start)
      const distToEnd = distance2D(currentEnd, line.end)
      
      // Check if this line connects to the current end
      if (distToStart < tolerance) {
        // Line starts where current ends - add its end
        points.push(line.end)
        currentEnd = line.end
        line.used = true
        foundConnection = true
        break
      } else if (distToEnd < tolerance) {
        // Line ends where current ends - add its start (reverse)
        points.push(line.start)
        currentEnd = line.start
        line.used = true
        foundConnection = true
        break
      }
    }
  }
  
  // Add any remaining unconnected lines
  for (const line of lines) {
    if (!line.used) {
      points.push(line.start)
      points.push(line.end)
    }
  }
  
  return points
}

/**
 * Calculates 2D distance between two points
 */
function distance2D(p1, p2) {
  const dx = p2[0] - p1[0]
  const dy = p2[1] - p1[1]
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Removes duplicate consecutive points
 */
function removeDuplicatePoints(points, tolerance = 0.001) {
  if (points.length === 0) return points
  
  const cleaned = [points[0]]
  
  for (let i = 1; i < points.length; i++) {
    const prev = cleaned[cleaned.length - 1]
    const curr = points[i]
    
    const dx = Math.abs(curr[0] - prev[0])
    const dy = Math.abs(curr[1] - prev[1])
    const dz = curr.length > 2 && prev.length > 2 ? Math.abs(curr[2] - prev[2]) : 0
    
    if (dx > tolerance || dy > tolerance || dz > tolerance) {
      cleaned.push(curr)
    }
  }
  
  return cleaned
}

