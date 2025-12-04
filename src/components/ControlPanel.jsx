import { useState, useEffect, useCallback } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { parseCADFile, validateGeometryType } from '../utils/cadParser'
import { pathToWalls, segmentsToWalls, computeOffsets, offsetCurvesToPath } from '../utils/wallOffset'
import FileDropZone from './FileDropZone'
import './ControlPanel.css'

function ControlPanel({ onPathChange, error, onOffsetPathChange }) {
  const [inputError, setInputError] = useState(null)
  const [loadedPath, setLoadedPath] = useState(null)
  const [pathFileName, setPathFileName] = useState(null)
  const [pathValidation, setPathValidation] = useState(null)
  const [showOffset, setShowOffset] = useState(false)
  const [wallThickness, setWallThickness] = useState(12)
  // Layer height is handled by backend, using default value of 1"
  const layerHeight = 1 // Default: 1" per layer (handled by backend)
  const [wallHeight, setWallHeight] = useState(120) // Default: 120" (10ft)
  // Preview mode and load-bearing are handled by backend, using default values
  const previewMode = true // Default: preview mode enabled (handled by backend)
  const isLoadBearing = true // Default: load-bearing walls (handled by backend)
  
  // Internal state for immediate UI updates
  const [displayWallHeight, setDisplayWallHeight] = useState(120)
  
  // Debounced callbacks to update actual layer config (triggers expensive recalculations)
  const debouncedSetWallHeight = useDebouncedCallback((value) => {
    setWallHeight(value)
  }, 300)
  
  // Sync display state with debounced state
  useEffect(() => {
    setDisplayWallHeight(wallHeight)
  }, [wallHeight])

  const handlePathFile = useCallback(async (fileContent, fileName, errorMessage) => {
    setInputError(null)
    
    if (errorMessage) {
      setInputError(errorMessage)
      setLoadedPath(null)
      setPathFileName(null)
      return
    }

    if (!fileContent) {
      setLoadedPath(null)
      setPathFileName(null)
      return
    }

    try {
      const result = await parseCADFile(fileContent, fileName, 'path')
      
      // Check if we got segments or points
      if (result && result.isSegments) {
        // Store segments directly
        setLoadedPath({ segments: result.segments, isSegments: true })
      } else {
        // Legacy format - validate and store points
        const path = result?.points || result
        validateGeometryType(path, 'path') // Validate but don't modify
        setLoadedPath({ points: path, isSegments: false })
      }
      setPathFileName(fileName)
    } catch (error) {
      setInputError(`Path file error: ${error.message}`)
      setLoadedPath(null)
      setPathFileName(null)
    }
  }, [])

  const handleGenerate = async () => {
    console.log('[ControlPanel] Generate button clicked')
    setInputError(null)
    
    if (!loadedPath) {
      console.log('[ControlPanel] No path loaded')
      setInputError('Please load a path file first')
      return
    }

    console.log('[ControlPanel] Starting generation:', {
      showOffset,
      isSegments: loadedPath.isSegments,
      hasOnOffsetPathChange: !!onOffsetPathChange,
      hasOnPathChange: !!onPathChange
    })

    try {
      if (showOffset) {
        console.log('[ControlPanel] Offset mode enabled')
        let segments
        let originalPathForDisplay
        
        // Check if we have segments (new format) or points (legacy format)
        if (loadedPath.isSegments) {
          console.log('[ControlPanel] Using segments directly')
          segments = loadedPath.segments
          originalPathForDisplay = loadedPath.segments
        } else {
          console.log('[ControlPanel] Converting points to segments')
          // Legacy format - convert points to segments
          segments = pathToWalls(loadedPath.points)
          originalPathForDisplay = loadedPath.points
        }
        
        console.log('[ControlPanel] Segments for offset:', segments.length)
        
        // Calculate offset distance: (thickness - 2") / 2
        const offsetDistance = (wallThickness - 2) / 2
        console.log('[ControlPanel] Offset distance:', offsetDistance)
        
        // Compute offset curves with new simplified algorithm
        // 1. Join segments → 2. Offset → 3. Fillet corners → 4. Output
        console.log('[ControlPanel] Computing offsets...')
        const offsetCurves = computeOffsets(segments, {
          offsetDistance: offsetDistance,
          filletRadius: 1.0 // 1" fillet radius for corners
        })
        console.log('[ControlPanel] Offset curves computed:', offsetCurves.length)
        
        if (offsetCurves.length > 0 && onOffsetPathChange) {
          console.log('[ControlPanel] Calling onOffsetPathChange with:', {
            offsetCurves: offsetCurves.length,
            originalPathLength: originalPathForDisplay?.length,
            layerConfig: { layerHeight, wallHeight, previewMode }
          })
          // Pass both original path and all offset curves for lofting
          // Each offset curve will be lofted separately, plus the original path
          // Also pass layer configuration for stacking
          onOffsetPathChange(offsetCurves, originalPathForDisplay, {
            layerHeight,
            wallHeight,
            previewMode
          })
          console.log('[ControlPanel] onOffsetPathChange called')
        } else {
          console.log('[ControlPanel] Fallback: using regular path change', {
            offsetCurvesLength: offsetCurves.length,
            hasOnOffsetPathChange: !!onOffsetPathChange
          })
          // Fallback to original path if offset computation fails
          onPathChange(originalPathForDisplay)
        }
      } else {
        console.log('[ControlPanel] Regular mode (no offset)')
        // No offset: loft the original path directly
        // Pass segments or points directly (components handle conversion)
        const pathForDisplay = loadedPath.isSegments 
          ? loadedPath.segments
          : loadedPath.points
        console.log('[ControlPanel] Calling onPathChange with path length:', pathForDisplay?.length)
        onPathChange(pathForDisplay)
        console.log('[ControlPanel] onPathChange called')
      }
    } catch (error) {
      console.error('[ControlPanel] Generation error:', error)
      setInputError(`Generation error: ${error.message}`)
    }
  }

  return (
    <div className="control-panel">
      <div className="panel-header">
        <h2>CAD Loft Visualizer</h2>
        <p className="subtitle">Define a 3D path to generate lofted geometry</p>
      </div>

      <div className="panel-content">
        <div className="input-section">
          <h3>2D/3D Wall Centerline</h3>
          <p className="input-hint">Drop or select a DXF file containing 2D or 3D path geometry (centerline of wall)</p>
          <FileDropZone
            onFileLoad={handlePathFile}
            accept=".dxf,.json"
            label="Path CAD File"
            hint="DXF or JSON format: lines, polylines, arcs, curves, splines"
          />
          {pathFileName && (
            <div className="file-status-indicator">
              ✓ {pathFileName} loaded
            </div>
          )}
        </div>

        <div className="input-section">
          <h3>Wall Offset Settings</h3>
          <div style={{ marginTop: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showOffset}
                onChange={(e) => setShowOffset(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              <span>Enable offset (loft along offset path)</span>
            </label>
            <div style={{ marginLeft: '24px', fontSize: '0.85em', color: '#FFFEFF', opacity: 0.6, marginTop: '5px' }}>
              When enabled: offset path is computed and lofted with the default profile
            </div>
            
            {showOffset && (
              <div style={{ marginLeft: '24px', marginTop: '10px' }}>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>
                    Wall Thickness (inches):
                  </label>
                  <input
                    type="number"
                    value={wallThickness}
                    onChange={(e) => setWallThickness(parseFloat(e.target.value) || 12)}
                    min="1"
                    max="24"
                    step="0.5"
                    style={{ width: '100px', padding: '5px' }}
                  />
                  <span style={{ marginLeft: '8px', fontSize: '0.9em', color: '#FFFEFF', opacity: 0.6 }}>
                    Default: 12" (1ft)
                  </span>
                  <div style={{ marginTop: '5px', fontSize: '0.85em', color: '#FFFEFF', opacity: 0.6 }}>
                    Offset: (thickness - 2") / 2 = {(wallThickness - 2) / 2}"
                  </div>
                </div>
                
                <div style={{ marginTop: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>
                    Wall Height (inches):
                  </label>
                  <input
                    type="number"
                    value={displayWallHeight}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 120
                      setDisplayWallHeight(value)
                      debouncedSetWallHeight(value)
                    }}
                    min="1"
                    max="200"
                    step="1"
                    style={{ width: '100px', padding: '5px' }}
                  />
                  <span style={{ marginLeft: '8px', fontSize: '0.9em', color: '#FFFEFF', opacity: 0.6 }}>
                    Default: 120" (10ft)
                  </span>
                  <div style={{ marginTop: '5px', fontSize: '0.85em', color: '#FFFEFF', opacity: 0.6 }}>
                    Number of layers: {Math.ceil(displayWallHeight / (layerHeight * 10))} layers (preview mode)
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="button-group">
          <button 
            onClick={handleGenerate} 
            className="btn btn-primary"
            disabled={!loadedPath}
            title={!loadedPath ? 'Load a path file first' : 'Generate the lofted geometry'}
          >
            Generate Loft
          </button>
          {!loadedPath && (
            <div className="button-hint">
              Path file required
            </div>
          )}
        </div>

        {(error || inputError) && (
          <div className="error-message">
            <strong>Error:</strong> {error || inputError}
          </div>
        )}

        <div className="info-section">
          <h4>Instructions</h4>
          <ul>
            <li><strong>Path File:</strong> 2D or 3D DXF file with path geometry (will be converted to 3D if 2D)</li>
            <li><strong>Supported DXF Entities:</strong> Lines, Polylines, Arcs, Circles, Splines, Curves</li>
            <li><strong>File Formats:</strong> DXF (.dxf) or JSON (for testing)</li>
            <li>The default profile will be oriented perpendicular to the path at each point</li>
            <li>Errors will be shown if geometry cannot be lofted</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default ControlPanel

