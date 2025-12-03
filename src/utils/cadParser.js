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
 * Parses JSON file containing geometry data
 * Expected formats:
 * - Array of points: [[x, y], [x, y], ...] for profile
 * - Array of points: [[x, y, z], [x, y, z], ...] for path
 * - Object with profile/path: { profile: [...], path: [...] }
 */
function parseJSONFile(fileContent, expectedType) {
  try {
    const data = JSON.parse(fileContent)
    
    // If it's an array, use it directly
    if (Array.isArray(data)) {
      return data
    }
    
    // If it's an object, extract the relevant property
    if (typeof data === 'object' && data !== null) {
      if (expectedType === 'profile' && data.profile) {
        return data.profile
      }
      if (expectedType === 'path' && data.path) {
        return data.path
      }
      // Try to find any array property
      const arrayKeys = Object.keys(data).filter(key => Array.isArray(data[key]))
      if (arrayKeys.length === 1) {
        return data[arrayKeys[0]]
      }
      throw new Error(`JSON file must contain a ${expectedType} array or a single array property`)
    }
    
    throw new Error('JSON file must contain an array of points or an object with profile/path arrays')
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format')
    }
    throw error
  }
}

/**
 * Validates that the parsed geometry matches the expected type
 * @param {Array} geometry - Array of points
 * @param {string} expectedType - 'profile' or 'path'
 */
export function validateGeometryType(geometry, expectedType) {
  if (!Array.isArray(geometry) || geometry.length === 0) {
    throw new Error(`${expectedType} must be an array with at least one point`)
  }

  const firstPoint = geometry[0]
  if (!Array.isArray(firstPoint)) {
    throw new Error(`${expectedType} must be an array of point arrays`)
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
}

