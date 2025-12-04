# Wall Offset Logic - Complete Rewrite

## Overview

The `wallOffset.js` file has been completely rewritten with a clean, simple, step-by-step approach following exactly 4 steps:

1. **Join segments** → Form continuous paths
2. **Offset the path** → Perpendicular offset by distance
3. **Fillet corners** → Round sharp corners with 1" radius
4. **Output for lofting** → Return offset points

---

## Architecture

### Previous Implementation (Complex)
- Mixed wall concepts with geometry
- Load-bearing wall filtering
- Complex corner detection with multiple cases
- Hard to debug and understand
- ~650 lines of code

### New Implementation (Simple)
- Pure geometry operations
- No wall/building concepts in core logic
- Clear step-by-step pipeline
- Easy to debug and understand
- ~450 lines of clean, commented code

---

## Core Functions

### 1. `joinSegments(segments, tolerance)`

**Purpose**: Connects segments that share endpoints into continuous paths

**Algorithm**:
- Start with first unused segment
- Search for segments that connect to start or end
- Reverse segments if needed to maintain direction
- Repeat until no more connections found
- Return array of continuous paths

**Input**: Array of segments `{type, start, end}`
**Output**: Array of paths (each path is array of ordered segments)

```javascript
[
  [seg1, seg2, seg3],  // Path 1: continuous
  [seg4, seg5]         // Path 2: separate path
]
```

---

### 2. `offsetPath(path, offsetDistance)`

**Purpose**: Creates true parallel offset by offsetting each segment and finding intersections

**Algorithm**:
1. Offset each segment independently (perpendicular to its direction)
2. For each pair of adjacent offset segments, find their intersection point
3. Use intersection points as corner points
4. Return array of offset points

**Input**: Path (array of ordered segments), offset distance
**Output**: Array of offset points

**Notes**:
- Positive offset = left/outward (counterclockwise perpendicular)
- Creates true parallel offsets (not bisector-based)
- Corners are sharp intersections (before filleting)
- Handles parallel segments gracefully (uses midpoint)
- This approach maintains constant offset distance along entire path

---

### 3. `filletCorners(points, radius, angleThreshold)`

**Purpose**: Replaces sharp corners with smooth circular arcs

**Algorithm**:
- For each corner point (not first/last)
- Calculate angle between incoming and outgoing vectors
- If angle < threshold (default 150°), apply fillet
- Calculate tangent points on both segments
- Find arc center using bisector
- Sample arc points between tangent points
- Replace corner point with arc points

**Input**: Array of points, fillet radius (default 1"), angle threshold
**Output**: Array of points with fillets applied

**Notes**:
- Only fillets corners sharper than 150° (2.618 radians)
- Checks segment length to ensure fillet fits
- Samples arc with appropriate density based on angle

---

### 4. `computeOffsets(segments, config)`

**Purpose**: Main function that orchestrates all steps and generates BOTH inner and outer offsets

**Algorithm**:
```javascript
1. joinSegments(segments)                    // Join into continuous paths
2. FOR EACH SIDE (outer +distance, inner -distance):
   - offsetPath(path, ±offsetDistance)       // Offset each path
   - filletCorners(offsetPoints, 1")         // Fillet sharp corners
3. Return array of offset curves (2 per path: inner + outer)
```

**Input**: 
- `segments`: Array of segment objects
- `config`: `{offsetDistance, filletRadius}`

**Output**: Array of offset curves (TWO per path - inner and outer)
```javascript
[
  {
    points: [[x1, y1], [x2, y2], ...],
    distance: 5,
    side: 'outer',
    sourceSegments: [...]
  },
  {
    points: [[x1, y1], [x2, y2], ...],
    distance: -5,
    side: 'inner',
    sourceSegments: [...]
  }
]
```

**Notes**:
- Generates TWO offset curves per path (both sides of centerline)
- Positive distance = outer offset (left/outward)
- Negative distance = inner offset (right/inward)
- Both offsets get filleted corners

---

## API Changes

### Before (Complex)
```javascript
// Convert to walls first
const walls = segmentsToWalls(segments, {
  thickness: 12,
  isLoadBearing: true,
  height: 120
})

// Compute offsets (black box)
const offsets = computeOffsets(walls)
```

### After (Simple)
```javascript
// Direct offset computation
const offsets = computeOffsets(segments, {
  offsetDistance: (wallThickness - 2) / 2,  // 5" for 12" wall
  filletRadius: 1.0                          // 1" corner radius
})
```

---

## Configuration

### Offset Distance Calculation

For a wall with thickness `T` and nozzle width `W = 2"`:

```
offsetDistance = (T - W) / 2
```

**Example**: 12" wall → `(12 - 2) / 2 = 5"` offset

**Both sides are generated**:
- Outer offset: `+5"` (outward from centerline)
- Inner offset: `-5"` (inward from centerline)

**Why**: 
- Wall centerline is the path
- Offset creates TWO print paths (both sides of the wall)
- Each path is 5" from center, creating 10" total width
- Leave 1" on each side for the 2" nozzle (10" + 2" = 12" wall)

### Fillet Radius

Default: **1"** (minimum turning radius for print head)

Can be adjusted in config:
```javascript
computeOffsets(segments, {
  offsetDistance: 5,
  filletRadius: 2.0  // Larger radius for smoother corners
})
```

---

## Debugging

All functions include console logging:

```
[computeOffsets] Input segments: 2
[computeOffsets] Joined paths: 1
[computeOffsets] Processing path with 2 segments
[computeOffsets] Offset points: 3
[computeOffsets] Filleted points: 8
[computeOffsets] Total offset curves: 1
```

**To debug**:
1. Check segment count - are all segments loaded?
2. Check joined paths - did segments connect properly?
3. Check offset points - correct number of points?
4. Check filleted points - corners rounded?

---

## Testing

### Test Case 1: Simple L-Shape
```javascript
segments = [
  { type: 'line', start: [0, 0], end: [10, 0] },
  { type: 'line', start: [10, 0], end: [10, 10] }
]

offsets = computeOffsets(segments, { offsetDistance: 2, filletRadius: 1 })

// Expected: 1 path, ~10 points (with fillet at corner)
```

### Test Case 2: Closed Rectangle
```javascript
segments = [
  { type: 'line', start: [0, 0], end: [10, 0] },
  { type: 'line', start: [10, 0], end: [10, 10] },
  { type: 'line', start: [10, 10], end: [0, 10] },
  { type: 'line', start: [0, 10], end: [0, 0] }
]

offsets = computeOffsets(segments, { offsetDistance: 2, filletRadius: 1 })

// Expected: 1 closed path with 4 filleted corners
```

---

## Known Limitations

1. **Self-intersecting offsets**: If offset distance is too large, offset path may intersect itself (not detected/handled)

2. **Concave corners**: Bisector method may not work perfectly for all concave corner cases

3. **Very sharp corners**: If corner is too sharp and fillet doesn't fit, corner is kept as-is

---

## Future Improvements

1. **Self-intersection detection**: Detect and handle offset paths that cross themselves

2. **Adaptive fillet radius**: Automatically reduce fillet radius if it doesn't fit

3. **Multiple offset distances**: Support different offsets for different segments

4. **Arc segment handling**: Currently treats arcs as straight segments, could sample arcs first

---

## Integration with Lofting

The offset curves are used for lofting:

```javascript
// 1. Generate offset curves
const offsetCurves = computeOffsets(segments, config)

// 2. Loft profile along offset curves
for (const curve of offsetCurves) {
  const geometry = loftGeometry(profile, curve.points)
  // Render geometry
}
```

The offset curves become the **print path** that the profile is lofted along to create the wall geometry.

---

## Summary

✅ **Simpler**: 4 clear steps instead of complex wall logic  
✅ **Cleaner**: Pure geometry functions, no mixed concepts  
✅ **Debuggable**: Console logging at each step  
✅ **Flexible**: Easy to adjust offset distance and fillet radius  
✅ **Maintainable**: Well-commented, easy to understand  

The new implementation follows the user's exact requirements:
1. Join segments ✓
2. Offset the joined line ✓
3. Fillet sharp corners ✓
4. Use for lofting ✓

