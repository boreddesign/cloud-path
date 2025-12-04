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

function ProfilePreview({ profile, position }) {
  const profileKey = useMemo(() => JSON.stringify(profile), [profile])
  
  const shape = useMemo(() => {
    // Convert segments to points if needed
    const points = isSegmentFormat(profile)
      ? segmentsToPoints(profile, 'profile')
      : profile
    
    const shape = new THREE.Shape()
    if (points && points.length > 0) {
      shape.moveTo(points[0][0], points[0][1])
      for (let i = 1; i < points.length; i++) {
        shape.lineTo(points[i][0], points[i][1])
      }
    }
    return shape
  }, [profileKey])

  const geometry = useMemo(() => {
    if (!shape) return null
    return new THREE.ShapeGeometry(shape)
  }, [shape])
  
  // Dispose geometry on unmount
  useEffect(() => {
    return () => {
      if (geometry) {
        geometry.dispose()
      }
    }
  }, [geometry])
  
  // Share material instance
  const material = useMemo(() => 
    new THREE.MeshBasicMaterial({
      color: "#2191fb",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    }),
    []
  )
  
  // Dispose material on unmount
  useEffect(() => {
    return () => {
      if (material) material.dispose()
    }
  }, [material])

  if (!geometry || !position) return null

  return (
    <mesh
      position={[position[0], position[1], position[2]]}
      rotation={[0, 0, 0]}
    >
      <primitive object={geometry} />
      <primitive object={material} />
    </mesh>
  )
}

// Memoize component to prevent unnecessary re-renders
export default React.memo(ProfilePreview, (prevProps, nextProps) => {
  const profileEqual = JSON.stringify(prevProps.profile) === JSON.stringify(nextProps.profile)
  const positionEqual = JSON.stringify(prevProps.position) === JSON.stringify(nextProps.position)
  return profileEqual && positionEqual
})

