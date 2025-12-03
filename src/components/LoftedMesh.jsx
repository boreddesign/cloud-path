import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { loftGeometry } from '../utils/geometry'
import React from 'react'

function LoftedMesh({ profile, path, onError }) {
  // Memoize geometry with stable dependencies
  // Use JSON.stringify for deep comparison of arrays
  const profileKey = useMemo(() => JSON.stringify(profile), [profile])
  const pathKey = useMemo(() => JSON.stringify(path), [path])
  
  const geometry = useMemo(() => {
    try {
      return loftGeometry(profile, path)
    } catch (error) {
      if (onError) {
        onError(error)
      }
      return null
    }
  }, [profileKey, pathKey, onError])
  
  // Dispose geometry on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (geometry) {
        geometry.dispose()
      }
    }
  }, [geometry])

  const meshRef = useRef()

  useFrame(() => {
    if (meshRef.current) {
      // Optional: Add rotation animation
      // meshRef.current.rotation.y += 0.001
    }
  })

  if (!geometry) {
    return null
  }

  // Share material instance across all meshes
  const material = useMemo(() => 
    new THREE.MeshStandardMaterial({
      color: "#FFFEFF",
      metalness: 0.1,
      roughness: 0.6,
      side: THREE.DoubleSide
    }),
    []
  )
  
  // Dispose material on unmount
  useEffect(() => {
    return () => {
      if (material) material.dispose()
    }
  }, [material])

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} />
  )
}

// Memoize component to prevent unnecessary re-renders
export default React.memo(LoftedMesh, (prevProps, nextProps) => {
  // Custom comparison: only re-render if profile or path actually changed
  const profileEqual = JSON.stringify(prevProps.profile) === JSON.stringify(nextProps.profile)
  const pathEqual = JSON.stringify(prevProps.path) === JSON.stringify(nextProps.path)
  return profileEqual && pathEqual
})

