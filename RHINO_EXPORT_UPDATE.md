# Rhino Export Script Update

## What Changed

The `rhino_to_json.py` script has been updated to extract complete arc and circle geometry information for accurate lofting.

### New Properties Exported

For **arcs** and **circles**, the script now exports:

| Property | Description | Example |
|----------|-------------|---------|
| `center` | Center point coordinates | `[0.0, -0.5]` or `[0.0, -0.5, 0.0]` |
| `radius` | Arc/circle radius | `0.5` |
| `clockwise` | Direction of arc (true/false) | `false` |

### Why This Matters

**Before (without center/radius):**
- Arcs were estimated as semicircles (180°)
- Quarter circles (90°) rendered incorrectly
- Full circles couldn't be represented accurately
- Flat arcs rendered as curves

**After (with center/radius):**
- ✅ Semicircles (180°) - accurate
- ✅ Quarter circles (90°) - accurate
- ✅ Full circles (360°) - accurate
- ✅ Any arc angle - accurate
- ✅ Proper clockwise/counterclockwise direction

---

## How to Use the Updated Script

### In Rhino:

1. **Open the script**:
   - Tools → PythonScript → Edit
   - Open `rhino_to_json.py`

2. **Select your geometry**:
   - Select the curves/arcs you want to export
   - Can be profile (2D) or path (2D/3D)

3. **Run the script**:
   - Run → Run Script (or F5)
   - Choose "PROFILE" or "PATH" when prompted
   - Save the JSON file

4. **Result**:
   - JSON file with complete arc/circle properties
   - Ready to use in the CAD Loft Visualizer

---

## Example Output

### Before (old format):
```json
{
  "type": "arc",
  "start": [-0.5, -0.5],
  "end": [0.5, -0.5]
}
```

### After (new format):
```json
{
  "type": "arc",
  "start": [-0.5, -0.5],
  "end": [0.5, -0.5],
  "center": [0.0, -0.5],
  "radius": 0.5,
  "clockwise": false
}
```

---

## Next Steps

### To Fix Your Current Profile (`profile-bead.json`)

**Option 1: Re-export from Rhino (Recommended)**
1. Open your profile geometry in Rhino
2. Run the updated `rhino_to_json.py` script
3. Select your arcs/curves
4. Export as "PROFILE"
5. Replace `src/profile-bead.json` with the new file

**Option 2: Add Properties Manually**
If you know the arc geometry, add `center`, `radius`, and `clockwise` to each arc segment.

Example for a semicircular arc from `[-0.5, -0.5]` to `[0.5, -0.5]`:
```json
{
  "type": "arc",
  "start": [-0.5, -0.5],
  "end": [0.5, -0.5],
  "center": [0.0, -0.5],
  "radius": 0.5,
  "clockwise": false
}
```

### To Test Lofting

1. **Load a path file**:
   - Create or load a DXF/JSON path file in the UI
   - Path should be a 2D or 3D curve representing the wall centerline

2. **Click "Generate Loft"**:
   - With valid profile + path, geometry should appear
   - Check browser console for any errors

---

## Technical Details

### Arc Direction Detection

The script uses Rhino's plane normal to determine arc direction:
- **Counterclockwise**: Normal points up (Z > 0)
- **Clockwise**: Normal points down (Z < 0)

This ensures arcs are sampled in the correct direction for proper geometry.

### Fallback Behavior

If the script can't extract arc properties (rare edge cases):
- Arc is exported without `center`/`radius`
- JavaScript code falls back to semicircle estimation
- May result in incorrect geometry (use Option 2 to fix manually)

---

## Troubleshooting

### "Arc properties failed to extract"
- Arc might be a trimmed curve or complex geometry
- Try exploding the arc and re-creating it as a simple arc
- Or add properties manually

### "Profile not closed" error
- Segments must form a continuous closed loop
- Check that segment endpoints connect (within 0.001 tolerance)
- The `reorderSegments` function will try to fix ordering automatically

### "Generate Loft" button disabled
- You need to load a path file first
- Upload a DXF or JSON file with the wall centerline
- Button will enable once path is loaded

---

## Questions?

If you need help:
1. Check browser console for error messages
2. Verify profile has `center`/`radius` for all arcs
3. Verify path file is loaded
4. Check that segments form a continuous closed path

