import { useRef, useEffect, useMemo, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { loftGeometry, validateProfile, validatePath } from '../utils/geometry'
import { segmentsToPoints } from '../utils/cadParser'
import LoftedMesh from './LoftedMesh'
import StackedLoftedMesh from './StackedLoftedMesh'
import PathLine from './PathLine'
import ProfilePreview from './ProfilePreview'
import './Scene3D.css'

// Component to auto-fit camera and controls to geometry
function AutoFitCamera({ profile, paths, controlsRef, viewMode = '3d', autoZoom = false }) {
  const { camera, size, set } = useThree()
  
  // Ensure we have an orthographic camera
  useEffect(() => {
    if (!(camera instanceof THREE.OrthographicCamera)) {
      console.log('[AutoFitCamera] Creating orthographic camera to replace', camera.constructor.name)
      const orthoCam = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000)
      orthoCam.position.copy(camera.position)
      orthoCam.zoom = camera.zoom || 50
      orthoCam.updateProjectionMatrix()
      set({ camera: orthoCam })
      console.log('[AutoFitCamera] Orthographic camera created and set')
    }
  }, [camera, set])
  
  // Memoize profile and paths keys for stable comparison
  const profileKey = useMemo(() => JSON.stringify(profile), [profile])
  const pathsKey = useMemo(() => JSON.stringify(paths), [paths])
  
  // Memoize geometry calculation to avoid recalculating on every render
  // paths can be a single path or array of paths (for offset mode)
  const geometry = useMemo(() => {
    console.log('[AutoFitCamera] Computing geometry for camera:', {
      hasProfile: !!profile,
      profileLength: profile?.length,
      pathsType: Array.isArray(paths) ? 'array' : typeof paths,
      pathsLength: Array.isArray(paths) ? paths.length : (paths ? 1 : 0)
    })
    
    if (!profile) {
      console.log('[AutoFitCamera] No profile, returning null')
      return null
    }
    
    const pathArray = Array.isArray(paths) && paths.length > 0 ? paths : (paths ? [paths] : [])
    if (pathArray.length === 0) {
      console.log('[AutoFitCamera] No paths, returning null')
      return null
    }
    
    console.log('[AutoFitCamera] Processing', pathArray.length, 'paths')
    
    try {
      // Create geometries for all paths and merge them
      const geometries = []
      for (let i = 0; i < pathArray.length; i++) {
        const path = pathArray[i]
        if (path && path.length > 0) {
          console.log(`[AutoFitCamera] Creating geometry for path ${i}, length:`, path.length)
          const geom = loftGeometry(profile, path)
          geometries.push(geom)
          console.log(`[AutoFitCamera] Geometry ${i} created:`, geom)
        }
      }
      
      if (geometries.length === 0) {
        console.log('[AutoFitCamera] No geometries created, returning null')
        return null
      }
      
      // Merge all geometries to get combined bounding box
      if (geometries.length === 1) {
        geometries[0].computeBoundingBox()
        console.log('[AutoFitCamera] Single geometry bounding box:', geometries[0].boundingBox)
        return geometries[0]
      }
      
      // Merge multiple geometries
      console.log('[AutoFitCamera] Merging', geometries.length, 'geometries')
      const merged = mergeGeometries(geometries)
      merged.computeBoundingBox()
      console.log('[AutoFitCamera] Merged geometry bounding box:', merged.boundingBox)
      return merged
    } catch (error) {
      console.error('[AutoFitCamera] Error calculating geometry:', error)
      return null
    }
  }, [profileKey, pathsKey])
  
  useEffect(() => {
    console.log('[AutoFitCamera] Fit useEffect triggered:', {
      hasGeometry: !!geometry,
      hasBoundingBox: !!geometry?.boundingBox,
      cameraType: camera?.constructor?.name,
      isOrthographic: camera instanceof THREE.OrthographicCamera,
      viewMode,
      autoZoom
    })
    
    if (!geometry || !geometry.boundingBox) {
      console.log('[AutoFitCamera] No geometry or bounding box, skipping')
      return
    }
    
    // Get the current camera (might have been replaced by the other useEffect)
    const currentCamera = camera
    
    // Ensure we have an orthographic camera
    // In React Three Fiber, the camera might not be an instance of THREE.OrthographicCamera
    // Check if it has orthographic properties instead
    const isOrthographic = currentCamera instanceof THREE.OrthographicCamera || 
                          (currentCamera.left !== undefined && currentCamera.right !== undefined && currentCamera.top !== undefined && currentCamera.bottom !== undefined)
    
    if (!isOrthographic) {
      console.log('[AutoFitCamera] Not orthographic camera yet, camera type:', currentCamera?.constructor?.name)
      console.log('[AutoFitCamera] Camera properties:', {
        left: currentCamera.left,
        right: currentCamera.right,
        top: currentCamera.top,
        bottom: currentCamera.bottom,
        zoom: currentCamera.zoom,
        type: currentCamera.type
      })
      // Wait a bit for the camera to be replaced, then retry
      const timeout = setTimeout(() => {
        // Retry after camera replacement
        if (currentCamera instanceof THREE.OrthographicCamera || 
            (currentCamera.left !== undefined && currentCamera.right !== undefined)) {
          console.log('[AutoFitCamera] Camera is now orthographic, retrying fit')
        }
      }, 100)
      return () => clearTimeout(timeout)
    }
    
    console.log('[AutoFitCamera] Camera is orthographic, proceeding with fit')
    
    const box = geometry.boundingBox
    
    if (box) {
      const center = new THREE.Vector3()
      box.getCenter(center)
      const size = new THREE.Vector3()
      box.getSize(size)
      
      console.log('[AutoFitCamera] Bounding box:', {
        min: box.min,
        max: box.max,
        center: center,
        size: size
      })
      
      // Calculate the maximum dimension for fitting
      const maxDim = Math.max(size.x, size.y, size.z)
      const padding = 1.2 // Add 20% padding
      const fitSize = maxDim * padding
      
      console.log('[AutoFitCamera] Camera fitting:', {
        maxDim,
        padding,
        fitSize
      })
      
      // For orthographic camera, we adjust the bounds instead of distance
      const aspect = window.innerWidth / window.innerHeight
      const viewSize = fitSize
      
      // Update orthographic camera bounds
      currentCamera.left = -viewSize * aspect
      currentCamera.right = viewSize * aspect
      currentCamera.top = viewSize
      currentCamera.bottom = -viewSize
      currentCamera.near = 0.1
      currentCamera.far = maxDim * 10
      
      if (viewMode === 'plan') {
        // Plan view: top-down axonometric
        currentCamera.position.set(center.x, center.y, center.z + maxDim * 2)
        currentCamera.lookAt(center)
        currentCamera.up.set(0, 1, 0) // Ensure Y is up
        console.log('[AutoFitCamera] Plan view - camera position:', currentCamera.position)
      } else {
        // 3D view: isometric axonometric (45° angle)
        const distance = maxDim * 2
        currentCamera.position.set(
          center.x + distance * 0.7,
          center.y + distance * 0.7,
          center.z + distance * 0.7
        )
        currentCamera.lookAt(center)
        currentCamera.up.set(0, 1, 0)
        console.log('[AutoFitCamera] 3D view - camera position:', currentCamera.position)
      }
      
      currentCamera.updateProjectionMatrix()
      console.log('[AutoFitCamera] Camera updated:', {
        left: currentCamera.left,
        right: currentCamera.right,
        top: currentCamera.top,
        bottom: currentCamera.bottom,
        position: currentCamera.position
      })
      
      // Update controls target if available
      if (controlsRef.current) {
        // Set the target to geometry center
        controlsRef.current.target.set(center.x, center.y, center.z)
        
        if (viewMode === 'plan') {
          // In plan view, limit rotation to prevent tilting
          controlsRef.current.minPolarAngle = Math.PI / 2 // 90 degrees (top-down)
          controlsRef.current.maxPolarAngle = Math.PI / 2 // 90 degrees (top-down)
        } else {
          // In 3D view, allow full rotation
          controlsRef.current.minPolarAngle = 0
          controlsRef.current.maxPolarAngle = Math.PI
        }
        
        // Force immediate update (no damping delay)
        controlsRef.current.update()
        
        // Reset damping to ensure smooth orbit after reset
        if (controlsRef.current.enableDamping) {
          controlsRef.current.dampingFactor = 0.05
        }
        
        console.log('[AutoFitCamera] Controls updated, target:', controlsRef.current.target)
      }
    }
  }, [geometry, camera, controlsRef, viewMode, size, autoZoom, set])
  
  return null
}

function Scene3D({ profile, path, offsetCurves, originalPath, layerConfig, onError }) {
  const errorHandled = useRef(false)
  const controlsRef = useRef()
  const [viewMode, setViewMode] = useState('3d')
  const [autoZoomTrigger, setAutoZoomTrigger] = useState(0)

  useEffect(() => {
    errorHandled.current = false
    // Trigger autozoom when geometry changes
    if (profile && (path || (offsetCurves && offsetCurves.length > 0))) {
      setAutoZoomTrigger(prev => prev + 1)
    }
  }, [profile, path, offsetCurves, originalPath])

  // Reset camera handler
  const handleResetCamera = () => {
    setAutoZoomTrigger(prev => prev + 1)
  }

  const handleError = (error) => {
    if (!errorHandled.current) {
      errorHandled.current = true
      onError(error.message || error)
    }
  }

  // Memoize offset curve path transformations to avoid recreating arrays on every render
  const memoizedOffsetPaths = useMemo(() => {
    if (!offsetCurves || offsetCurves.length === 0) return []
    return offsetCurves.map(curve => {
      if (!curve.points || curve.points.length < 2) return null
      return curve.points.map(p => [p[0], p[1], 0])
    }).filter(Boolean)
  }, [offsetCurves])

  // Memoize original path 3D transformation (handle segments or points)
  const originalPath3D = useMemo(() => {
    if (!originalPath || originalPath.length === 0) return null
    
    // Check if it's segments format
    const isSegments = Array.isArray(originalPath) && 
                      originalPath.length > 0 && 
                      typeof originalPath[0] === 'object' && 
                      originalPath[0] !== null && 
                      'type' in originalPath[0]
    
    if (isSegments) {
      // Convert segments to points for visualization
      const points = segmentsToPoints(originalPath, 'path')
      return points.map(p => [p[0], p[1], p[2] !== undefined ? p[2] : 0])
    }
    
    // Legacy points format
    return originalPath.map(p => [p[0], p[1], p[2] !== undefined ? p[2] : 0])
  }, [originalPath])

  // Validate inputs before rendering
  let isValid = false
  let hasOffsetMode = false
  
  try {
    if (profile) {
      console.log('[Scene3D] Validating profile:', profile?.length, 'points/segments')
      validateProfile(profile)
      console.log('[Scene3D] Profile validation passed')
    }
    
    // Check if we're in offset mode (have offset curves and original path)
    if (offsetCurves && offsetCurves.length > 0 && originalPath) {
      console.log('[Scene3D] Offset mode detected:', {
        offsetCurves: offsetCurves.length,
        originalPathLength: originalPath?.length,
        memoizedOffsetPaths: memoizedOffsetPaths.length
      })
      validatePath(originalPath)
      // Validate each offset curve using memoized paths
      for (const offsetPath3D of memoizedOffsetPaths) {
        if (offsetPath3D) {
          validatePath(offsetPath3D)
        }
      }
      isValid = true
      hasOffsetMode = true
      console.log('[Scene3D] Offset mode validation passed, isValid:', isValid)
    } else if (path) {
      // Regular mode: just one path
      console.log('[Scene3D] Regular mode detected, path length:', path?.length)
      validatePath(path)
      isValid = profile && path
      console.log('[Scene3D] Regular mode validation passed, isValid:', isValid)
    } else {
      console.log('[Scene3D] No path or offset curves available')
    }
  } catch (error) {
    console.error('[Scene3D] Validation error:', error)
    handleError(error)
  }
  
  console.log('[Scene3D] Render state:', { 
    isValid, 
    hasOffsetMode, 
    profile: !!profile, 
    profileLength: profile?.length,
    path: !!path, 
    pathLength: path?.length,
    offsetCurves: !!offsetCurves,
    offsetCurvesLength: offsetCurves?.length,
    originalPath: !!originalPath,
    originalPathLength: originalPath?.length,
    memoizedOffsetPathsLength: memoizedOffsetPaths?.length
  })

  return (
    <div className="scene-container">
      {/* Floating View Mode Toggle */}
      <div className="floating-view-toggle">
        <button
          className={`view-toggle-btn ${viewMode === '3d' ? 'active' : ''}`}
          onClick={() => setViewMode('3d')}
          title="3D View"
        >
          3D
        </button>
        <button
          className={`view-toggle-btn ${viewMode === 'plan' ? 'active' : ''}`}
          onClick={() => setViewMode('plan')}
          title="Plan View (Top-Down)"
        >
          Plan
        </button>
        <button
          className="view-toggle-btn"
          onClick={handleResetCamera}
          title="Reset Camera to Fit Geometry"
        >
          ⟲ Reset
        </button>
      </div>
      
      <Canvas 
        gl={{ alpha: false }} 
        style={{ background: '#000300' }}
        camera={{ position: [10, 10, 10], zoom: 50 }}
        orthographic
      >
        <orthographicCamera makeDefault position={[10, 10, 10]} zoom={50} left={-10} right={10} top={10} bottom={-10} near={0.1} far={1000} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -5]} intensity={0.5} />
        
        <Grid args={[100, 100]} cellColor="#1a1a1a" sectionColor="#2a2a2a" />
        <axesHelper args={[10]} />
        
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enablePan={true}
          enableZoom={true}
          enableRotate={viewMode === '3d'} // Disable rotation in plan view
          zoomSpeed={1.2}
          enableDamping={false}
        />
        
        {isValid && !hasOffsetMode && (
          <AutoFitCamera 
            profile={profile} 
            paths={path} 
            controlsRef={controlsRef} 
            viewMode={viewMode}
            autoZoom={autoZoomTrigger > 0}
          />
        )}
        {isValid && hasOffsetMode && originalPath && (
          <AutoFitCamera 
            profile={profile} 
            paths={memoizedOffsetPaths.filter(Boolean)} 
            controlsRef={controlsRef} 
            viewMode={viewMode}
            autoZoom={autoZoomTrigger > 0}
          />
        )}

        {isValid && !hasOffsetMode && (
          <>
            {/* Regular mode: loft single path */}
            <LoftedMesh profile={profile} path={path} onError={handleError} />
            <PathLine path={path} color="#2191fb" />
            <ProfilePreview profile={profile} position={path[0]} />
          </>
        )}

        {isValid && hasOffsetMode && (() => {
          const { layerHeight = 1, wallHeight = 120, previewMode = true } = layerConfig || {}
          
          return (
            <>
              {/* ONLY loft the bead centerlines (offset curves) - NOT the wall centerline */}
              {memoizedOffsetPaths.map((offsetPath3D, curveIndex) => {
                if (!offsetPath3D) return null
                
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
              
              {/* Show path lines for visualization only */}
              {/* Wall centerline (reference only - not lofted) */}
              {originalPath3D && (
                <PathLine path={originalPath3D} color="#888888" />
              )}
              {/* Bead centerlines (these ARE lofted) */}
              {memoizedOffsetPaths.map((offsetPath3D, index) => {
                if (!offsetPath3D) return null
                // Accent colors for bead paths
                const accentColors = ["#ff570a", "#841c26"]
                const color = accentColors[index % accentColors.length]
                return <PathLine key={`offset-line-${index}`} path={offsetPath3D} color={color} />
              })}
              
              {/* Show profile preview at start of first bead centerline */}
              {memoizedOffsetPaths.length > 0 && memoizedOffsetPaths[0] && memoizedOffsetPaths[0].length > 0 && (
                <ProfilePreview profile={profile} position={memoizedOffsetPaths[0][0]} />
              )}
            </>
          )
        })()}
      </Canvas>
    </div>
  )
}

export default Scene3D

