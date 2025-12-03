# Visualization Optimization Strategies

## Current Performance Issues
- Multiple geometry recalculations on every state change
- No memoization of expensive components
- Path arrays recreated on every render
- No debouncing for rapid state updates
- Geometry merging happens synchronously

## Optimization Strategies

### 1. React.memo for Component Memoization
**Problem**: Components re-render even when props haven't changed
**Solution**: Wrap expensive components with React.memo

```javascript
export default React.memo(LoftedMesh, (prevProps, nextProps) => {
  // Custom comparison function
  return prevProps.profile === nextProps.profile && 
         prevProps.path === nextProps.path
})
```

### 2. Optimize useMemo Dependencies
**Problem**: useMemo recalculates when object references change (even if values are same)
**Solution**: Use deep comparison or serialize dependencies

```javascript
// Instead of passing entire objects, pass serialized keys
const profileKey = JSON.stringify(profile)
const pathKey = JSON.stringify(path)
const geometry = useMemo(() => {
  // ... calculation
}, [profileKey, pathKey, layerHeight, wallHeight, previewMode])
```

### 3. Debounce State Updates
**Problem**: Rapid input changes trigger expensive recalculations
**Solution**: Debounce layer config updates

```javascript
import { useDebouncedCallback } from 'use-debounce'

const debouncedUpdate = useDebouncedCallback((config) => {
  setLayerConfig(config)
}, 300) // Wait 300ms after last change
```

### 4. Geometry Instancing (for repeated layers)
**Problem**: Creating separate geometry for each layer
**Solution**: Use THREE.InstancedMesh for repeated geometry

```javascript
// Instead of merging, use instancing for identical layers
const instancedMesh = useMemo(() => {
  const baseGeometry = loftGeometry(profile, path)
  const instanced = new THREE.InstancedMesh(baseGeometry, material, numLayers)
  // Set matrix for each instance
  return instanced
}, [profile, path, numLayers])
```

### 5. Web Worker for Geometry Calculation
**Problem**: Heavy geometry calculations block main thread
**Solution**: Offload to Web Worker

```javascript
// geometryWorker.js
self.onmessage = (e) => {
  const { profile, path, layerHeight, wallHeight } = e.data
  const geometry = calculateGeometry(profile, path, layerHeight, wallHeight)
  self.postMessage(geometry)
}
```

### 6. Canvas-based 2D Preview (Alternative to 3D)
**Problem**: 3D rendering is expensive for preview
**Solution**: Use HTML5 Canvas for 2D path preview

```javascript
// Use useRef and useEffect to draw to canvas
const canvasRef = useRef()
useEffect(() => {
  const ctx = canvasRef.current.getContext('2d')
  // Draw paths to canvas
  // Only redraw when paths change
}, [paths])
```

### 7. Lazy Loading / Progressive Rendering
**Problem**: All layers render at once
**Solution**: Render layers progressively or on-demand

```javascript
// Render first N layers immediately, rest on requestAnimationFrame
const [renderedLayers, setRenderedLayers] = useState(10)
useEffect(() => {
  if (renderedLayers < totalLayers) {
    requestAnimationFrame(() => {
      setRenderedLayers(prev => Math.min(prev + 5, totalLayers))
    })
  }
}, [renderedLayers, totalLayers])
```

### 8. Path Array Memoization
**Problem**: Path arrays recreated on every render
**Solution**: Memoize path transformations

```javascript
const offsetPath3D = useMemo(() => 
  curve.points.map(p => [p[0], p[1], 0]),
  [curve.points]
)
```

### 9. Material Sharing
**Problem**: Each mesh creates its own material
**Solution**: Share material instance across meshes

```javascript
const sharedMaterial = useMemo(() => 
  new THREE.MeshStandardMaterial({ color: '#FFFEFF' }),
  []
)
```

### 10. Geometry Disposal
**Problem**: Old geometries not disposed, causing memory leaks
**Solution**: Dispose geometries when component unmounts

```javascript
useEffect(() => {
  return () => {
    if (geometry) geometry.dispose()
  }
}, [geometry])
```

## Implementation Priority

1. **High Impact, Low Effort**:
   - React.memo for components
   - Path array memoization
   - Material sharing

2. **High Impact, Medium Effort**:
   - Debounce state updates
   - Optimize useMemo dependencies
   - Geometry disposal

3. **High Impact, High Effort**:
   - Web Worker for geometry
   - Instanced meshes
   - Progressive rendering

4. **Alternative Approach**:
   - Canvas-based 2D preview option


