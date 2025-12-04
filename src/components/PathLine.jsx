import { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import React from 'react'
import { segmentsToPoints } from '../utils/cadParser'

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

function PathLine({ path, color = "#2191fb" }) {
  // Memoize path key for stable comparison
  const pathKey = useMemo(() => JSON.stringify(path), [path])
  
  const lineGeometry = useMemo(() => {
    // Convert segments to points if needed
    const points = isSegmentFormat(path) 
      ? segmentsToPoints(path, 'path')
      : path
    
    const threePoints = points.map(p => new THREE.Vector3(...p))
    return new THREE.BufferGeometry().setFromPoints(threePoints)
  }, [pathKey])
  
  // Dispose geometry on unmount
  useEffect(() => {
    return () => {
      if (lineGeometry) {
        lineGeometry.dispose()
      }
    }
  }, [lineGeometry])

  // Share material instance
  const material = useMemo(() => 
    new THREE.LineBasicMaterial({ color, linewidth: 2 }),
    [color]
  )
  
  // Dispose material on unmount
  useEffect(() => {
    return () => {
      if (material) material.dispose()
    }
  }, [material])

  return (
    <line geometry={lineGeometry} material={material} />
  )
}

// Memoize component
export default React.memo(PathLine, (prevProps, nextProps) => {
  const pathEqual = JSON.stringify(prevProps.path) === JSON.stringify(nextProps.path)
  return pathEqual && prevProps.color === nextProps.color
})

