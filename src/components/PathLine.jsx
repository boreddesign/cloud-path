import { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import React from 'react'

function PathLine({ path, color = "#2191fb" }) {
  // Memoize path key for stable comparison
  const pathKey = useMemo(() => JSON.stringify(path), [path])
  
  const lineGeometry = useMemo(() => {
    const points = path.map(p => new THREE.Vector3(...p))
    return new THREE.BufferGeometry().setFromPoints(points)
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

