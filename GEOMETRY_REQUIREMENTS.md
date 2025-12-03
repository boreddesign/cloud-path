# Geometry Requirements for CAD Loft Visualizer

## Profile File Requirements (2D)

The profile file must contain a **closed 2D shape** in the XY plane. The profile will be extruded along the path.

### Supported DXF Entities:
- **LWPOLYLINE** (Lightweight Polyline) - Recommended
- **POLYLINE** (Polyline)
- **LINE** (Multiple lines that form a closed shape)
- **ARC** (Arcs)
- **CIRCLE** (Circles)
- **SPLINE** (Splines/Curves)

### Requirements:
1. **Must be 2D**: All geometry must be in the XY plane (Z coordinate is ignored)
2. **Must be closed**: The first and last points must match (within 0.001 units tolerance)
3. **Minimum 3 points**: Need at least 3 points to form a closed shape
4. **No self-intersections**: The profile cannot cross itself
5. **Valid coordinates**: All points must have valid X and Y coordinates

### Examples of Valid Profiles:
- ✅ Closed rectangle (4 lines or 1 closed polyline)
- ✅ Closed circle
- ✅ Closed polygon (any number of sides)
- ✅ Closed shape made of connected lines and arcs

### Examples of Invalid Profiles:
- ❌ Open shape (first and last points don't match)
- ❌ Single line (needs at least 3 points)
- ❌ Self-intersecting shape
- ❌ 3D geometry (must be 2D)

## Path File Requirements (2D or 3D)

The path file defines the trajectory along which the profile will be lofted.

### Supported DXF Entities:
- **LWPOLYLINE** (Lightweight Polyline) - Recommended
- **POLYLINE** (Polyline)
- **LINE** (Multiple lines that form a continuous path)
- **ARC** (Arcs)
- **SPLINE** (Splines/Curves)
- **CIRCLE** (Circles - will create a circular path)

### Requirements:
1. **2D or 3D**: Can be 2D (will be converted to 3D with Z=0) or 3D
2. **Minimum 2 points**: Need at least 2 points to define a path
3. **Continuous path**: Multiple entities will be connected end-to-end
4. **Valid coordinates**: All points must have valid coordinates

### Examples of Valid Paths:
- ✅ Straight line (2 points)
- ✅ Curved path (multiple points)
- ✅ 3D path with varying Z coordinates
- ✅ Multiple connected lines/arcs

## How the System Works:

1. **Profile Processing**:
   - Extracts all geometry entities from DXF
   - Connects multiple LINE entities end-to-end
   - Converts arcs/circles to point series
   - Automatically closes the profile if not already closed
   - Validates the profile meets all requirements

2. **Path Processing**:
   - Extracts all geometry entities from DXF
   - Connects multiple entities into a continuous path
   - Converts 2D paths to 3D (adds Z=0)
   - Validates the path has sufficient points

3. **Lofting**:
   - Orients the profile perpendicular to the path at each point
   - Creates a 3D mesh by extruding the profile along the path
   - Uses Frenet-Serret frame for proper orientation

## Common Issues and Solutions:

### "Profile is not closed"
- **Problem**: First and last points don't match
- **Solution**: Ensure your DXF profile is a closed shape. If using lines, make sure the last line connects back to the first line's start point.

### "Cannot read properties of null"
- **Problem**: DXF entity has missing or invalid point data
- **Solution**: Check that all entities in your DXF file have valid start/end points or vertices. The system will now show more detailed error messages.

### "No extractable geometry found"
- **Problem**: DXF file doesn't contain supported entities
- **Solution**: Make sure your DXF file contains lines, polylines, arcs, circles, or splines. Text, dimensions, and other non-geometric entities are ignored.

### "Profile has self-intersections"
- **Problem**: The profile crosses itself
- **Solution**: Redesign the profile so it doesn't intersect itself. The system will show which segments intersect.

## Tips for Creating Valid DXF Files:

1. **Use Polylines**: LWPOLYLINE or POLYLINE entities are preferred as they're easier to validate
2. **Close Your Shapes**: Make sure polylines are marked as "closed" in your CAD software
3. **Check Coordinates**: Ensure all geometry is in the correct plane (XY for profiles)
4. **Simplify**: Remove unnecessary entities like text, dimensions, or hatches
5. **Test in CAD Software**: Open your DXF file in a CAD viewer to verify the geometry before uploading

