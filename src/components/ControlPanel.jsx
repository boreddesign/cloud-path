import { useState, useEffect, useCallback } from 'react'
import { parseCADFile, validateGeometryType } from '../utils/cadParser'
import { pathToWalls, computeOffsets, offsetCurvesToPath } from '../utils/wallOffset'
import FileDropZone from './FileDropZone'
import './ControlPanel.css'

function ControlPanel({ onPathChange, error, onOffsetPathChange }) {
  const [inputError, setInputError] = useState(null)
  const [loadedPath, setLoadedPath] = useState(null)
  const [pathFileName, setPathFileName] = useState(null)
  const [pathValidation, setPathValidation] = useState(null)
  const [showOffset, setShowOffset] = useState(false)
  const [wallThickness, setWallThickness] = useState(12) // Default: 12" (1ft)
  const [isLoadBearing, setIsLoadBearing] = useState(true)
  const [layerHeight, setLayerHeight] = useState(0.2) // Default: 0.2" per layer
  const [wallHeight, setWallHeight] = useState(120) // Default: 120" (10ft)
  const [previewMode, setPreviewMode] = useState(true) // Performance mode: fewer layers

  // Debug: Log state changes
  useEffect(() => {
    console.log('=== STATE UPDATE ===')
    console.log('Path:', loadedPath ? `${loadedPath.length} points` : 'null')
    console.log('Path file:', pathFileName || 'none')
    console.log('Button enabled:', !!loadedPath)
  }, [loadedPath, pathFileName])

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
      console.log('Parsing path file:', fileName)
      const path = await parseCADFile(fileContent, fileName, 'path')
      console.log('Path parsed, validating...', path)
      // validateGeometryType may convert 2D to 3D, so use the returned value
      const validatedPath = validateGeometryType(path, 'path')
      console.log('Path validated, setting state...', validatedPath.length, 'points')
      setLoadedPath(validatedPath)
      setPathFileName(fileName)
      console.log('Path state set. loadedPath:', validatedPath !== null, 'points:', validatedPath.length)
    } catch (error) {
      console.error('Path file error:', error)
      setInputError(`Path file error: ${error.message}`)
      setLoadedPath(null)
      setPathFileName(null)
    }
  }, [])

  const handleGenerate = () => {
    setInputError(null)
    
    if (!loadedPath) {
      setInputError('Please load a path file first')
      return
    }

    try {
      if (showOffset) {
        // Convert path (centerline) to walls and compute offset
        const walls = pathToWalls(loadedPath, {
          thickness: wallThickness,
          isLoadBearing: isLoadBearing,
          height: 120 // Default 10ft
        })
        
        // Compute offset curves using Planformer algorithm
        const offsetCurves = computeOffsets(walls)
        
        if (offsetCurves.length > 0 && onOffsetPathChange) {
          // Pass both original path and all offset curves for lofting
          // Each offset curve will be lofted separately, plus the original path
          // Also pass layer configuration for stacking
          onOffsetPathChange(offsetCurves, loadedPath, {
            layerHeight,
            wallHeight,
            previewMode
          })
        } else {
          // Fallback to original path if offset computation fails
          onPathChange(loadedPath)
        }
      } else {
        // No offset: loft the original path directly
        onPathChange(loadedPath)
      }
    } catch (error) {
      setInputError(`Generation error: ${error.message}`)
    }
  }

  return (
    <div className="control-panel">
      <div className="panel-header">
        <h2>CAD Loft Visualizer</h2>
        <p className="subtitle">Define a 3D path to generate lofted geometry with the default bead profile</p>
      </div>

      <div className="panel-content">
        <div className="input-section">
          <h3>Default Profile</h3>
          <p className="input-hint">Using default bead profile (2" wide × 1" tall)</p>
          <div className="file-status-indicator" style={{ marginTop: '10px' }}>
            ✓ profile-bead.json loaded
          </div>
        </div>

        <div className="input-section">
          <h3>2D/3D Path CAD File (Wall Centerline)</h3>
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
              When enabled: offset path is computed and lofted with bead profile
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
                    Default: 12" (1ft) for load-bearing, 8" for non-load-bearing
                  </span>
                </div>
                
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isLoadBearing}
                      onChange={(e) => setIsLoadBearing(e.target.checked)}
                      style={{ marginRight: '8px' }}
                    />
                    <span>Load-bearing wall</span>
                  </label>
                  <div style={{ marginLeft: '24px', marginTop: '5px', fontSize: '0.85em', color: '#FFFEFF', opacity: 0.6 }}>
                    Offset: (thickness - 2") / 2 = {(wallThickness - 2) / 2}" 
                    {!isLoadBearing && ' (non-load-bearing walls are not offset)'}
                  </div>
                </div>
                
                <div style={{ marginTop: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>
                    Layer Height (inches):
                  </label>
                  <input
                    type="number"
                    value={layerHeight}
                    onChange={(e) => setLayerHeight(parseFloat(e.target.value) || 0.2)}
                    min="0.01"
                    max="1"
                    step="0.01"
                    style={{ width: '100px', padding: '5px' }}
                  />
                  <span style={{ marginLeft: '8px', fontSize: '0.9em', color: '#FFFEFF', opacity: 0.6 }}>
                    Default: 0.2"
                  </span>
                </div>
                
                <div style={{ marginTop: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>
                    Wall Height (inches):
                  </label>
                  <input
                    type="number"
                    value={wallHeight}
                    onChange={(e) => setWallHeight(parseFloat(e.target.value) || 120)}
                    min="1"
                    max="200"
                    step="1"
                    style={{ width: '100px', padding: '5px' }}
                  />
                  <span style={{ marginLeft: '8px', fontSize: '0.9em', color: '#FFFEFF', opacity: 0.6 }}>
                    Default: 120" (10ft)
                  </span>
                  <div style={{ marginTop: '5px', fontSize: '0.85em', color: '#FFFEFF', opacity: 0.6 }}>
                    Number of layers: {Math.ceil(wallHeight / layerHeight)} layers
                  </div>
                </div>
                
                <div style={{ marginTop: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={previewMode}
                      onChange={(e) => setPreviewMode(e.target.checked)}
                      style={{ marginRight: '8px' }}
                    />
                    <span>Preview Mode (faster, fewer layers)</span>
                  </label>
                  <div style={{ marginLeft: '24px', marginTop: '5px', fontSize: '0.85em', color: '#FFFEFF', opacity: 0.6 }}>
                    {previewMode 
                      ? `Preview: ${Math.ceil(wallHeight / (layerHeight * 10))} layers (10x layer height for performance)`
                      : `Full detail: ${Math.ceil(wallHeight / layerHeight)} layers`
                    }
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
            <li><strong>Default Profile:</strong> Using bead profile (2" wide × 1" tall, rounded rectangle)</li>
            <li><strong>Path File:</strong> 2D or 3D DXF file with path geometry (will be converted to 3D if 2D)</li>
            <li><strong>Supported DXF Entities:</strong> Lines, Polylines, Arcs, Circles, Splines, Curves</li>
            <li><strong>File Formats:</strong> DXF (.dxf) or JSON (for testing)</li>
            <li>The profile will be oriented perpendicular to the path at each point</li>
            <li>Errors will be shown if geometry cannot be lofted</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default ControlPanel

