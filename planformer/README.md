# Planformer

Lightweight geometry and toolpath backend for converting simple floorplan data (walls with thickness + height) into offset curves, layers, and naive G-code for 3D construction printing.

## Architecture

Planformer is organized into modular components that process geometry data through a pipeline:

```
Input (JSON walls) 
  → Parser 
  → Geometry 
  → Offsets 
  → Join 
  → Rules 
  → Layers 
  → Toolpath 
  → G-code Output
```

## Project Structure

```
planformer/
├── src/
│   ├── index.ts           # Main entry point (exports all public APIs)
│   ├── types/             # TypeScript type definitions
│   ├── parser/            # JSON wall data parsing
│   ├── geometry/          # 2D geometry utilities and polygon operations
│   ├── offset/            # Offset curve computation
│   ├── join/              # Joining/merging offset curves
│   ├── rules/             # Business rules engine
│   ├── layers/            # Layer generation from geometry
│   ├── toolpath/          # Toolpath generation from layers
│   └── gcode/             # G-code output generation
├── package.json
├── tsconfig.json
└── README.md
```

## Core Modules

### Types (`src/types/`)
Core TypeScript definitions:
- `Point2D`, `Point3D` - Coordinate types
- `Wall` - Wall data structure (start, end, thickness, height)
- `Polygon` - Closed polygon representation
- `OffsetCurve` - Offset curve data
- `Layer` - Printing layer data
- `Toolpath` - Toolpath segment data
- `GCodeConfig` - G-code generation configuration

### Parser (`src/parser/`)
- `parseWallData()` - Converts JSON wall data into `Wall[]` objects

### Geometry (`src/geometry/`)
2D geometry utilities:
- `utils.ts` - Vector operations (distance, normalize, dot/cross product, etc.)
- `polygon.ts` - Polygon operations (area, contains, bounding box, etc.)

### Offset (`src/offset/`)
- `computeOffsets()` - Computes offset curves from wall data

### Join (`src/join/`)
- `joinCurves()` - Joins offset curves into continuous polygons

### Rules (`src/rules/`)
- `applyRules()` - Applies business rules and constraints (placeholder for user logic)

### Layers (`src/layers/`)
- `generateLayers()` - Generates printing layers from geometry

### Toolpath (`src/toolpath/`)
- `generateToolpath()` - Converts layers into toolpath segments

### G-code (`src/gcode/`)
- `generateGCode()` - Generates G-code string from toolpaths

## Usage

```typescript
import {
  parseWallData,
  computeOffsets,
  joinCurves,
  applyRules,
  generateLayers,
  generateToolpath,
  generateGCode,
  DEFAULT_WALL_CONFIG
} from 'planformer';

// Parse input (uses default config: load-bearing 12", non-load-bearing 8", height 120")
const walls = parseWallData(jsonString);

// Or use custom config
const customConfig = {
  loadBearingWallThickness: 12, // 1ft
  nonLoadBearingWallThickness: 8, // 8"
  defaultWallHeight: 120 // 10ft
};
const walls = parseWallData(jsonString, customConfig);

// Compute offsets (load-bearing walls offset by (thickness - 2") / 2)
const offsetCurves = computeOffsets(walls);

// Join curves into polygons
const polygons = joinCurves(offsetCurves);

// Apply rules
const filteredPolygons = applyRules(polygons);

// Generate layers (stacks up to wall height, default 120" = 10ft)
const layers = generateLayers(filteredPolygons, 0.2, 120);

// Generate toolpaths
const toolpaths = generateToolpath(layers);

// Generate G-code
const gcode = generateGCode(toolpaths, {
  printFeedRate: 1200,
  travelFeedRate: 3000,
  layerHeight: 1
});
```

## Wall Configuration

Default values:
- **Load-bearing wall thickness**: 12" (1ft)
- **Non-load-bearing wall thickness**: 8"
- **Default wall height**: 120" (10ft)

## Offset Rules

- **Load-bearing walls**: Offset by `(thickness - 2") / 2` in XY axis
- **Non-load-bearing walls**: No offset (or can be configured)
- This applies to **1 layer** (single layer processing)

## Layer Stacking

Layers are stacked from 0 to the wall height (default: 10ft = 120"). Each layer contains the same polygon geometry, positioned at increasing Z heights.

## Development

### Build
```bash
npm run build
```

### Watch Mode
```bash
npm run watch
```

### Clean
```bash
npm run clean
```

## Design Principles

- **Modularity**: Each module is independent and can be tested separately
- **Type Safety**: Full TypeScript coverage for all data structures
- **Extensibility**: Clear interfaces allow for future enhancements
- **Separation of Concerns**: Each module has a single, well-defined responsibility
- **Placeholder Ready**: Stub functions ready to receive implementation logic

## Status

This is a scaffolded architecture. Core implementation logic will be added step-by-step.

