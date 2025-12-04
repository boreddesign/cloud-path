# Segment to Points Conversion Audit

## Summary
This document tracks all places in the app that expect **points arrays** (not segments) and ensures segments are properly converted.

## Entry Points (Where Segments Enter the App)

### 1. **App.jsx - Default Profile Loading**
- **Location**: `src/App.jsx` lines 17-40
- **Status**: ✅ **FIXED** - Converts segments to points on load
- **Code**: Detects segment format, calls `segmentsToPoints()`, validates, then sets profile

### 2. **ControlPanel.jsx - Path File Loading**
- **Location**: `src/components/ControlPanel.jsx` lines 51-70
- **Status**: ✅ **FIXED** - Stores segments separately, converts when needed
- **Code**: Detects segment format, stores with `isSegments` flag, converts in `handleGenerate()`

## Conversion Functions

### `segmentsToPoints()` in `src/utils/cadParser.js`
- **Purpose**: Converts segment array to points array
- **Features**:
  - Reorders segments to form continuous path
  - Handles closed loops (profiles)
  - Supports both 2D (profile) and 3D (path) output

## Components That Expect Points (Not Segments)

### ✅ All components expect points arrays:

1. **Scene3D.jsx**
   - `validateProfile(profile)` - expects points array
   - `validatePath(path)` - expects points array
   - `loftGeometry(profile, path)` - expects points arrays
   - Passes points to child components

2. **LoftedMesh.jsx**
   - `loftGeometry(profile, path)` - expects points arrays

3. **StackedLoftedMesh.jsx**
   - `loftGeometry(profile, path)` - expects points arrays
   - `path.map(p => ...)` - expects points array

4. **ProfilePreview.jsx**
   - `profile[0][0]`, `profile[i][0]` - expects points array
   - `THREE.Shape()` - expects points array

5. **PathLine.jsx**
   - `path.map(p => new THREE.Vector3(...p))` - expects points array

## Validation Functions (Expect Points)

1. **validateProfile()** in `src/utils/geometry.js`
   - Expects: `Array<[x, y]>`
   - Checks: closed loop, self-intersections

2. **validatePath()** in `src/utils/geometry.js`
   - Expects: `Array<[x, y, z]>`
   - Checks: minimum points, duplicates, self-intersections

3. **validateGeometryType()** in `src/utils/cadParser.js`
   - Expects: Points array
   - Converts 2D to 3D for paths

## Geometry Functions (Expect Points)

1. **loftGeometry()** in `src/utils/geometry.js`
   - Expects: `profile: Array<[x, y]>, path: Array<[x, y, z]>`
   - Calls `validateProfile()` and `validatePath()`

2. **getPathFrame()** in `src/utils/geometry.js`
   - Expects: `path: Array<[x, y, z]>`
   - Accesses `path[index]` as point array

## Data Flow

### Profile Flow:
```
profile-bead.json (segments) 
  → App.jsx (detects segments)
  → segmentsToPoints() (converts to points)
  → validateGeometryType() (validates)
  → setProfile() (points array)
  → Scene3D (receives points)
  → LoftedMesh/StackedLoftedMesh (uses points)
```

### Path Flow (with offset):
```
path2.json (segments)
  → ControlPanel.handlePathFile() (detects segments)
  → setLoadedPath({ segments, isSegments: true })
  → handleGenerate() (checks isSegments)
  → segmentsToWalls() (for offset calculation)
  → segmentsToPoints() (for visualization)
  → validateGeometryType() (validates)
  → onOffsetPathChange() (passes points)
  → Scene3D (receives points)
  → StackedLoftedMesh (uses points)
```

### Path Flow (without offset):
```
path.json (segments)
  → ControlPanel.handlePathFile() (detects segments)
  → setLoadedPath({ segments, isSegments: true })
  → handleGenerate() (checks isSegments)
  → segmentsToPoints() (converts to points)
  → validateGeometryType() (validates)
  → onPathChange() (passes points)
  → Scene3D (receives points)
  → LoftedMesh (uses points)
```

## Verification Checklist

- ✅ App.jsx converts profile segments to points
- ✅ ControlPanel.jsx converts path segments to points
- ✅ All components receive points arrays (not segments)
- ✅ All validation functions receive points arrays
- ✅ All geometry functions receive points arrays
- ✅ No direct segment usage in rendering components

## Potential Issues

None found - all conversion happens at entry points before data reaches components.

