# Segment-Based Architecture Refactor

## Summary
The entire application has been refactored to use **segments** as the primary data structure throughout, instead of converting to points early. Segments are only converted to points when needed for Three.js rendering operations.

## Benefits
1. **Preserves Geometry Type Information**: Segments maintain information about line, arc, circle, etc.
2. **More Accurate Representation**: Arcs and curves are properly sampled with appropriate density
3. **Cleaner Architecture**: Single data structure (segments) flows through the app
4. **Better Performance**: Conversion only happens at rendering time, not at every step

## Changes Made

### 1. Enhanced Segment-to-Points Conversion (`src/utils/cadParser.js`)
- Added `sampleArc()` function to properly sample arc segments with configurable density
- Enhanced `segmentsToPoints()` to handle different segment types (line, arc, circle, polyline, curve)
- Arcs are now sampled with appropriate point density based on `maxSegmentLength` parameter

### 2. Updated Geometry Functions (`src/utils/geometry.js`)
- `validateProfile()` and `validatePath()` now accept segments or points
- `loftGeometry()` accepts segments or points and converts internally
- Added `isSegmentFormat()` and `ensurePoints()` helper functions

### 3. Updated Components
- **LoftedMesh.jsx**: No changes needed - `loftGeometry()` handles segments internally
- **StackedLoftedMesh.jsx**: Converts segments to points only for layer transformation
- **PathLine.jsx**: Converts segments to points for Three.js line geometry
- **ProfilePreview.jsx**: Converts segments to points for Three.js Shape geometry

### 4. Updated App Entry Points
- **App.jsx**: Passes segments directly to components (no early conversion)
- **ControlPanel.jsx**: Passes segments directly instead of converting to points

### 5. Updated Validation
- `validateGeometryType()` now handles both segments and points
- Validation functions work with segments natively

## Data Flow

```
Rhino Export (segments)
    ↓
parseCADFile() → returns segments
    ↓
App.jsx / ControlPanel.jsx → stores segments
    ↓
Components receive segments
    ↓
loftGeometry() / PathLine / ProfilePreview → converts segments to points internally
    ↓
Three.js rendering (points)
```

## Segment Format

```javascript
[
  {
    type: 'line' | 'arc' | 'circle' | 'polyline' | 'curve',
    start: [x, y, z?],
    end: [x, y, z?],
    // For arcs/circles:
    center?: [x, y, z?],
    radius?: number,
    clockwise?: boolean
  }
]
```

## Backward Compatibility

The refactor maintains backward compatibility:
- Legacy point arrays are still accepted
- `isSegmentFormat()` detects the format automatically
- Conversion happens transparently when needed

## Testing

All components now accept segments directly. The conversion to points happens:
- In `loftGeometry()` for 3D mesh generation
- In `PathLine` for line rendering
- In `ProfilePreview` for 2D shape rendering
- In `StackedLoftedMesh` for layer transformation

No other components need to know about the conversion - they just pass segments through.

