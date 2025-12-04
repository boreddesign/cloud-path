import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { loftGeometry } from '../utils/geometry'
import { segmentsToPoints } from '../utils/cadParser'
import React from 'react'

/**
 * StackedLoftedMesh - Efficiently renders multiple layers of lofted geometry
 * Merges all layers into a single geometry for better performance
 */
function StackedLoftedMesh({ profile, path, layerHeight, wallHeight, previewMode, onError }) {
  // Memoize dependencies for stable comparison
  const profileKey = useMemo(() => JSON.stringify(profile), [profile])
  const pathKey = useMemo(() => JSON.stringify(path), [path])
  
  const geometry = useMemo(() => {
    try {
      console.log('[StackedLoftedMesh] Creating geometry:', {
        profileLength: profile?.length,
        profileType: Array.isArray(profile) && profile.length > 0 ? (typeof profile[0] === 'object' && 'type' in profile[0] ? 'segments' : 'points') : 'unknown',
        pathLength: path?.length,
        pathType: Array.isArray(path) && path.length > 0 ? (typeof path[0] === 'object' && 'type' in path[0] ? 'segments' : 'points') : 'unknown',
        layerHeight,
        wallHeight,
        previewMode
      })
      
      // Calculate effective layer height (preview mode uses larger spacing)
      const effectiveLayerHeight = previewMode ? layerHeight * 10 : layerHeight
      const numLayers = Math.ceil(wallHeight / effectiveLayerHeight)
      
      console.log('[StackedLoftedMesh] Layer calculation:', {
        effectiveLayerHeight,
        numLayers
      })
      
      // If only one layer, use regular lofting
      if (numLayers === 1) {
        const geom = loftGeometry(profile, path)
        console.log('[StackedLoftedMesh] Single layer geometry created:', geom)
        return geom
      }
      
      // Merge all layers into a single geometry
      const geometries = []
      
      // Convert segments to points if needed for layer transformation
      const isSegments = Array.isArray(path) && 
                        path.length > 0 && 
                        typeof path[0] === 'object' && 
                        path[0] !== null && 
                        'type' in path[0]
      
      // If segments, convert to points for layer transformation
      let pathPoints = path
      if (isSegments) {
        pathPoints = segmentsToPoints(path, 'path')
      }
      
      for (let i = 0; i < numLayers; i++) {
        const z = i * effectiveLayerHeight
        
        // Create path at this layer height
        const pathAtLayer = pathPoints.map(p => {
          const zCoord = p[2] !== undefined ? p[2] + z : z
          return [p[0], p[1], zCoord]
        })
        
        // Generate geometry for this layer (loftGeometry handles segments internally)
        const layerGeometry = loftGeometry(profile, pathAtLayer)
        geometries.push(layerGeometry)
      }
      
      // Merge all geometries into one for better performance
      const merged = mergeGeometries(geometries)
      console.log('[StackedLoftedMesh] Merged geometry created:', merged, 'from', geometries.length, 'layers')
      return merged
    } catch (error) {
      console.error('[StackedLoftedMesh] Error creating geometry:', error)
      if (onError) {
        onError(error)
      }
      return null
    }
  }, [profileKey, pathKey, layerHeight, wallHeight, previewMode, onError])
  
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
export default React.memo(StackedLoftedMesh, (prevProps, nextProps) => {
  // Custom comparison: only re-render if dependencies actually changed
  const profileEqual = JSON.stringify(prevProps.profile) === JSON.stringify(nextProps.profile)
  const pathEqual = JSON.stringify(prevProps.path) === JSON.stringify(nextProps.path)
  return profileEqual && 
         pathEqual && 
         prevProps.layerHeight === nextProps.layerHeight &&
         prevProps.wallHeight === nextProps.wallHeight &&
         prevProps.previewMode === nextProps.previewMode
})

