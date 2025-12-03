# Rhino to JSON Export Instructions

This guide explains how to use the `rhino_to_json.py` script to export your Rhino geometry to JSON format for the CAD Loft Visualizer.

## Setup

1. **Open Rhino** (version 6 or later with Python support)

2. **Open the Python Script Editor**:
   - Go to `Tools` → `PythonScript` → `Edit`
   - Or press `F5` to open the script editor

3. **Load the Script**:
   - Open `rhino_to_json.py` in the script editor
   - Or copy and paste the script into the editor

## Usage

### Exporting a Profile (2D)

1. **Create or select your 2D profile geometry** in Rhino:
   - Draw a closed curve, polyline, or combination of curves
   - Make sure it's in the XY plane (Z = 0 or constant)
   - The profile must be closed (first and last points should match)

2. **Select the geometry**:
   - Click on the curve(s) you want to export
   - You can select multiple curves - they will be combined

3. **Run the script**:
   - Click the "Run" button in the Python script editor
   - Or press `F5` if the script is already loaded

4. **Choose "PROFILE"** when prompted

5. **Save the file**:
   - Choose a location and filename (e.g., `profile-bead.json`)
   - The script will automatically format it correctly

### Exporting a Path (2D or 3D)

1. **Create or select your path geometry** in Rhino:
   - Draw a curve, polyline, or combination of curves
   - Can be 2D or 3D
   - Does not need to be closed

2. **Select the geometry**

3. **Run the script**

4. **Choose "PATH"** when prompted

5. **Save the file** (e.g., `path.json`)

## Supported Geometry Types

The script supports:
- **Curves** (any NURBS curve)
- **Polylines** (including closed polylines)
- **Arcs**
- **Circles**
- **Lines** (as curves)

## Tips

1. **For Profiles**:
   - Make sure your profile is closed
   - Keep it in the XY plane (Z = 0)
   - Use `Join` command to combine multiple curves into one
   - Use `Make2D` if you have 3D geometry you want to flatten

2. **For Paths**:
   - Can be open or closed
   - Can be 2D or 3D
   - Multiple curves will be connected end-to-end

3. **Quality**:
   - The script automatically samples enough points for smooth curves
   - For very complex curves, you may want to simplify them first in Rhino

4. **Troubleshooting**:
   - If export fails, make sure your geometry is valid (use `Check` command)
   - For profiles, ensure the shape is closed
   - Check that curves are not self-intersecting

## Example Workflow

1. **Create Profile**:
   ```
   Draw → Circle → Center, Radius
   Draw a circle with radius 0.5
   Select the circle
   Run rhino_to_json.py
   Choose "PROFILE"
   Save as "profile-circle.json"
   ```

2. **Create Path**:
   ```
   Draw → Curve → Control Points
   Draw a 3D curve
   Select the curve
   Run rhino_to_json.py
   Choose "PATH"
   Save as "path-curve.json"
   ```

3. **Use in Visualizer**:
   - Upload `profile-circle.json` as the profile file
   - Upload `path-curve.json` as the path file
   - Click "Generate Loft"

## Advanced: Batch Export

To export multiple profiles/paths at once, you can modify the script to loop through multiple objects or create separate scripts for different geometry types.

## Notes

- The script automatically removes duplicate consecutive points
- Profiles are automatically closed if not already closed
- Point coordinates are exported with full precision
- The JSON format matches exactly what the CAD Loft Visualizer expects

