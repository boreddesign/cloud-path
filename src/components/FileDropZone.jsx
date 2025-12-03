import { useCallback, useState } from 'react'
import './FileDropZone.css'

function FileDropZone({ onFileLoad, accept, label, hint }) {
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)

  const handleFile = useCallback(async (file) => {
    setIsLoading(true)
    setFileName(file.name)
    setLoadError(null)
    console.log(`[FileDropZone:${label}] ===== FILE DROP START =====`)
    console.log(`[FileDropZone:${label}] File:`, file.name, 'Type:', file.type, 'Size:', file.size)
    console.log(`[FileDropZone:${label}] onFileLoad callback type:`, typeof onFileLoad, 'is function:', typeof onFileLoad === 'function')

    if (typeof onFileLoad !== 'function') {
      const error = 'onFileLoad is not a function!'
      console.error(`[FileDropZone:${label}]`, error)
      setLoadError(error)
      setIsLoading(false)
      return
    }

    try {
      const text = await file.text()
      console.log(`[FileDropZone:${label}] File read successfully, ${text.length} characters`)
      console.log(`[FileDropZone:${label}] First 200 chars:`, text.substring(0, 200))
      console.log(`[FileDropZone:${label}] About to call onFileLoad with:`, { 
        hasText: !!text, 
        textLength: text.length, 
        fileName: file.name,
        errorMessage: null 
      })
      
      try {
        const result = await onFileLoad(text, file.name, null)
        console.log(`[FileDropZone:${label}] onFileLoad returned:`, result)
        // If callback succeeded but returned nothing, that's OK
      } catch (callbackError) {
        console.error(`[FileDropZone:${label}] ERROR in onFileLoad callback:`, callbackError)
        console.error(`[FileDropZone:${label}] Callback error message:`, callbackError.message)
        console.error(`[FileDropZone:${label}] Callback error stack:`, callbackError.stack)
        setLoadError(`Processing error: ${callbackError.message}`)
        // Reset fileName to show error state
        setFileName(null)
      }
      
      console.log(`[FileDropZone:${label}] onFileLoad call completed`)
    } catch (error) {
      console.error(`[FileDropZone:${label}] Error reading file:`, error)
      console.error(`[FileDropZone:${label}] Error stack:`, error.stack)
      setLoadError(`File read error: ${error.message}`)
      setFileName(null)
      try {
        await onFileLoad(null, file.name, error.message)
      } catch (callbackError) {
        console.error(`[FileDropZone:${label}] ERROR calling onFileLoad with error:`, callbackError)
      }
    } finally {
      setIsLoading(false)
      console.log(`[FileDropZone:${label}] ===== FILE DROP END =====`)
    }
  }, [onFileLoad, label])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFile(files[0])
    }
  }, [handleFile])

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      handleFile(files[0])
    }
  }, [handleFile])

  return (
    <div
      className={`file-drop-zone ${isDragging ? 'dragging' : ''} ${fileName ? 'has-file' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        id={`file-input-${label}`}
        accept={accept}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <label htmlFor={`file-input-${label}`} className="drop-zone-label">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <span>Loading...</span>
          </div>
        ) : loadError ? (
          <div className="file-error">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div className="file-info">
              <span className="file-name">Error</span>
              <span className="file-status" style={{ color: '#ff570a' }}>{loadError}</span>
            </div>
          </div>
        ) : fileName ? (
          <div className="file-loaded">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <div className="file-info">
              <span className="file-name">{fileName}</span>
              <span className="file-status">Loaded</span>
            </div>
          </div>
        ) : (
          <div className="drop-zone-content">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div className="drop-zone-text">
              <strong>{label}</strong>
              <span className="hint">{hint}</span>
            </div>
          </div>
        )}
      </label>
    </div>
  )
}

export default FileDropZone

