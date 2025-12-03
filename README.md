# CAD Loft Visualizer

A cloud-based web application that visualizes 2D CAD profiles lofted along 3D paths, creating 3D geometry in real-time.

## Features

- **2D Profile Input**: Define closed 2D profiles in the XY plane
- **3D Path Input**: Define 3D paths along which profiles are lofted
- **Real-time Visualization**: Interactive 3D rendering using Three.js
- **Error Handling**: Validates geometry and shows errors for unloftable cases
- **Interactive Controls**: Zoom, pan, and rotate the 3D view

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Usage

1. **Upload Profile DXF File**: Drag and drop or select a DXF file containing your 2D profile geometry
   - Supports lines, polylines, arcs, circles, and splines
   - Profile will be automatically closed if not already closed
   - Must be 2D geometry in the XY plane

2. **Upload Path DXF File**: Drag and drop or select a DXF file containing your 2D or 3D path geometry
   - Supports lines, polylines, arcs, curves, and splines
   - 2D paths will be automatically converted to 3D (z=0)
   - Multiple entities will be combined into a continuous path

3. **View the Result**: The 3D lofted geometry will be rendered automatically in the 3D viewport

4. **Load Example**: Click "Load Example" to load sample profile and path files (JSON format for testing)

## Geometry Validation

The application validates:
- Profile must be closed (first and last points match)
- Profile must have at least 3 points
- Profile must not self-intersect
- Path must have at least 2 points
- Path must not have duplicate consecutive points

## Technology Stack

- **React**: UI framework
- **Vite**: Build tool
- **Three.js**: 3D rendering
- **@react-three/fiber**: React renderer for Three.js
- **@react-three/drei**: Useful helpers for Three.js

## File Format Support

- **DXF Files (.dxf)**: Full support for DXF files with the following entities:
  - Lines
  - Polylines (including closed polylines)
  - Arcs
  - Circles
  - Splines/Curves
- **JSON Files (.json)**: For testing and simple geometry definition
- **Planned**: STEP (.step, .stp), IGES (.iges, .igs)

### JSON File Format

**Profile File** (2D points):
```json
[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]
```

**Path File** (3D points):
```json
[[0, 0, 0], [2, 0, 0], [2, 2, 1], [0, 2, 2]]
```

**Combined Format** (optional):
```json
{
  "profile": [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]],
  "path": [[0, 0, 0], [2, 0, 0], [2, 2, 1], [0, 2, 2]]
}
```

## Future Enhancements

- Support for native CAD file formats (STEP, IGES, DXF)
- More advanced lofting options (twist, scale along path)
- Export functionality (STL, OBJ)
- Advanced error detection and visualization

