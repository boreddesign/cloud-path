import { useRef, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { loftGeometry, validateProfile, validatePath } from '../utils/geometry'
import LoftedMesh from './LoftedMesh'
import StackedLoftedMesh from './StackedLoftedMesh'
import PathLine from './PathLine'
import ProfilePreview from './ProfilePreview'
import './Scene3D.css'

// Component to auto-fit camera and controls to geometry
function AutoFitCamera({ profile, path, controlsRef }) {
  const { camera } = useThree()
  
  useEffect(() => {
    if (!profile || !path) return
    
    try {
      // Calculate bounding box of the geometry
      const geometry = loftGeometry(profile, path)
      geometry.computeBoundingBox()
      const box = geometry.boundingBox
      
      if (box) {
        const center = new THREE.Vector3()
        box.getCenter(center)
        const size = new THREE.Vector3()
        box.getSize(size)
        
        // Calculate distance needed to fit the geometry
        const maxDim = Math.max(size.x, size.y, size.z)
        const distance = maxDim * 2.5 // Add some padding
        
        // Position camera to view the geometry
        camera.position.set(
          center.x + distance * 0.7,
          center.y + distance * 0.7,
          center.z + distance * 0.7
        )
        camera.lookAt(center)
        camera.updateProjectionMatrix()
        
        // Update controls target if available
        if (controlsRef.current) {
          controlsRef.current.target.copy(center)
          controlsRef.current.update()
        }
      }
    } catch (error) {
      // If geometry calculation fails, use default position
      console.warn('Could not auto-fit camera:', error)
    }
  }, [profile, path, camera, controlsRef])
  
  return null
}

function Scene3D({ profile, path, offsetCurves, originalPath, layerConfig, onError }) {
  const errorHandled = useRef(false)
  const controlsRef = useRef()

  useEffect(() => {
    errorHandled.current = false
  }, [profile, path, offsetCurves, originalPath])

  const handleError = (error) => {
    if (!errorHandled.current) {
      errorHandled.current = true
      onError(error.message || error)
    }
  }

  // Validate inputs before rendering
  let isValid = false
  let hasOffsetMode = false
  
  try {
    if (profile) validateProfile(profile)
    
    // Check if we're in offset mode (have offset curves and original path)
    if (offsetCurves && offsetCurves.length > 0 && originalPath) {
      validatePath(originalPath)
      // Validate each offset curve
      for (const curve of offsetCurves) {
        if (curve.points && curve.points.length >= 2) {
          // Convert offset curve points to 3D path format
          const offsetPath3D = curve.points.map(p => [p[0], p[1], 0])
          validatePath(offsetPath3D)
        }
      }
      isValid = true
      hasOffsetMode = true
    } else if (path) {
      // Regular mode: just one path
      validatePath(path)
      isValid = profile && path
    }
  } catch (error) {
    handleError(error)
  }

  return (
    <div className="scene-container">
      <Canvas gl={{ alpha: false }} style={{ background: '#000300' }}>
        <PerspectiveCamera makeDefault position={[10, 10, 10]} fov={50} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -5]} intensity={0.5} />
        
        <Grid args={[100, 100]} cellColor="#1a1a1a" sectionColor="#2a2a2a" />
        <axesHelper args={[10]} />
        
        <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={0.1}
          maxDistance={1000}
          zoomSpeed={1.2}
        />
        
        {isValid && !hasOffsetMode && <AutoFitCamera profile={profile} path={path} controlsRef={controlsRef} />}
        {isValid && hasOffsetMode && originalPath && <AutoFitCamera profile={profile} path={originalPath} controlsRef={controlsRef} />}

        {isValid && !hasOffsetMode && (
          <>
            {/* Regular mode: loft single path */}
            <LoftedMesh profile={profile} path={path} onError={handleError} />
            <PathLine path={path} color="#2191fb" />
            <ProfilePreview profile={profile} position={path[0]} />
          </>
        )}

        {isValid && hasOffsetMode && (() => {
          const { layerHeight = 0.2, wallHeight = 120, previewMode = true } = layerConfig || {}
          
          return (
            <>
              {/* Loft original path with stacking (merged geometry for performance) */}
              {originalPath && (
                <StackedLoftedMesh
                  profile={profile}
                  path={originalPath}
                  layerHeight={layerHeight}
                  wallHeight={wallHeight}
                  previewMode={previewMode}
                  onError={handleError}
                />
              )}
              
              {/* Loft each offset curve with stacking (merged geometry for performance) */}
              {offsetCurves.map((curve, curveIndex) => {
                if (!curve.points || curve.points.length < 2) return null
                
                // Convert 2D offset curve points to 3D path format
                const offsetPath3D = curve.points.map(p => [p[0], p[1], 0])
                
                return (
                  <StackedLoftedMesh
                    key={`offset-${curveIndex}`}
                    profile={profile}
                    path={offsetPath3D}
                    layerHeight={layerHeight}
                    wallHeight={wallHeight}
                    previewMode={previewMode}
                    onError={handleError}
                  />
                )
              })}
              
              {/* Show path lines only for first layer */}
              {originalPath && originalPath.length > 0 && (
                <PathLine path={originalPath.map(p => [p[0], p[1], 0])} color="#2191fb" />
              )}
              {offsetCurves.map((curve, index) => {
                if (!curve.points || curve.points.length < 2) return null
                const offsetPath3D = curve.points.map(p => [p[0], p[1], 0])
                // Alternate between accent colors for offset paths
                const accentColors = ["#ff570a", "#841c26", "#2191fb"]
                const color = accentColors[index % accentColors.length]
                return <PathLine key={`offset-line-${index}`} path={offsetPath3D} color={color} />
              })}
              
              {/* Show profile preview at start of original path */}
              {originalPath && originalPath.length > 0 && (
                <ProfilePreview profile={profile} position={originalPath[0]} />
              )}
            </>
          )
        })()}
      </Canvas>
    </div>
  )
}

export default Scene3D

