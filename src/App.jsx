import { useState, useEffect } from 'react'
import Scene3D from './components/Scene3D'
import ControlPanel from './components/ControlPanel'
import profileBead from './profile-bead.json'
import './App.css'

function App() {
  const [profile, setProfile] = useState(null)
  const [path, setPath] = useState(null)
  const [offsetCurves, setOffsetCurves] = useState(null) // Array of offset curves
  const [originalPath, setOriginalPath] = useState(null) // Store original for visualization
  const [layerConfig, setLayerConfig] = useState({ layerHeight: 0.2, wallHeight: 120 })
  const [error, setError] = useState(null)

  // Load default profile on mount
  useEffect(() => {
    try {
      // Load the default bead profile
      setProfile(profileBead)
    } catch (error) {
      console.error('Failed to load default profile:', error)
      setError('Failed to load default profile')
    }
  }, [])

  const handlePathChange = (newPath) => {
    setPath(newPath)
    setOffsetCurves(null) // Clear offset when using regular path
    setOriginalPath(null)
    setError(null)
  }

  const handleOffsetPathChange = (newOffsetCurves, originalPathForDisplay, layerConfig) => {
    setOffsetCurves(newOffsetCurves) // Array of offset curves to loft
    setOriginalPath(originalPathForDisplay) // Store original for lofting and visualization
    setPath(null) // Clear regular path when using offset
    setError(null)
    // Store layer config for stacking
    setLayerConfig(layerConfig || { layerHeight: 0.2, wallHeight: 120, previewMode: true })
  }

  const handleError = (errorMessage) => {
    setError(errorMessage)
  }

  return (
    <div className="app">
      <ControlPanel
        onPathChange={handlePathChange}
        onOffsetPathChange={handleOffsetPathChange}
        error={error}
      />
      <Scene3D
        profile={profile}
        path={path} // Regular path (when offset is disabled)
        offsetCurves={offsetCurves} // Array of offset curves to loft (when offset is enabled)
        originalPath={originalPath} // Original centerline to loft (when offset is enabled)
        layerConfig={layerConfig} // Layer configuration for stacking
        onError={handleError}
      />
    </div>
  )
}

export default App

