"""
Rhino to JSON Converter for CAD Loft Visualizer

This script exports Rhino geometry (curves, polylines) to JSON format
for use with the CAD Loft Visualizer.

Usage in Rhino:
1. Open this script in Rhino's Python editor
2. Select your geometry (profile or path)
3. Run the script
4. Choose whether it's a profile (2D) or path (2D/3D)
5. The JSON file will be saved

Requirements:
- Rhino 6 or later with Python support
- rhinoscriptsyntax module
"""

import rhinoscriptsyntax as rs
import json
import os
import math

def curve_to_points(curve_id, is_profile=False, num_points=None):
    """
    Convert a Rhino curve to a list of points
    
    Args:
        curve_id: Rhino object ID of the curve
        is_profile: If True, returns 2D points [x, y]. If False, returns 3D points [x, y, z]
        num_points: Number of points to sample (None = use curve's natural points)
    
    Returns:
        List of points as [x, y] or [x, y, z]
    """
    points = []
    
    # Get curve domain
    domain = rs.CurveDomain(curve_id)
    if domain is None:
        return None
    
    # Determine number of points
    if num_points is None:
        # Use curve length to determine appropriate number of points
        length = rs.CurveLength(curve_id)
        num_points = max(20, int(length * 10))  # At least 20 points, or 10 per unit
    
    # Sample points along the curve
    for i in range(num_points + 1):
        t = domain[0] + (domain[1] - domain[0]) * (i / num_points)
        point = rs.EvaluateCurve(curve_id, t)
        
        if point:
            if is_profile:
                # For profiles, use only X and Y (ignore Z)
                points.append([point[0], point[1]])
            else:
                # For paths, use X, Y, Z
                points.append([point[0], point[1], point[2] if len(point) > 2 else 0.0])
    
    return points


def polyline_to_points(polyline_id, is_profile=False):
    """
    Convert a Rhino polyline to a list of points
    
    Args:
        polyline_id: Rhino object ID of the polyline
        is_profile: If True, returns 2D points [x, y]. If False, returns 3D points [x, y, z]
    
    Returns:
        List of points as [x, y] or [x, y, z]
    """
    points = []
    vertices = rs.PolylineVertices(polyline_id)
    
    if not vertices:
        return None
    
    for vertex in vertices:
        if is_profile:
            points.append([vertex[0], vertex[1]])
        else:
            points.append([vertex[0], vertex[1], vertex[2] if len(vertex) > 2 else 0.0])
    
    # Check if polyline is closed
    if rs.IsCurveClosed(polyline_id):
        # Add first point at end to ensure it's closed
        if points and points[0] != points[-1]:
            points.append(points[0])
    
    return points


def arc_to_points(arc_id, is_profile=False, num_points=32):
    """
    Convert a Rhino arc to a list of points
    
    Args:
        arc_id: Rhino object ID of the arc
        is_profile: If True, returns 2D points [x, y]. If False, returns 3D points [x, y, z]
        num_points: Number of points to sample along the arc
    
    Returns:
        List of points as [x, y] or [x, y, z]
    """
    # For arcs, treat them as curves and sample points along them
    # This is more reliable than trying to extract angle information
    domain = rs.CurveDomain(arc_id)
    if domain is None:
        return None
    
    points = []
    
    # Sample points along the arc curve
    for i in range(num_points + 1):
        t = domain[0] + (domain[1] - domain[0]) * (i / num_points)
        point = rs.EvaluateCurve(arc_id, t)
        
        if point:
            if is_profile:
                points.append([point[0], point[1]])
            else:
                points.append([point[0], point[1], point[2] if len(point) > 2 else 0.0])
    
    return points


def circle_to_points(circle_id, is_profile=False, num_points=32):
    """
    Convert a Rhino circle to a list of points
    
    Args:
        circle_id: Rhino object ID of the circle
        is_profile: If True, returns 2D points [x, y]. If False, returns 3D points [x, y, z]
        num_points: Number of points to sample along the circle
    
    Returns:
        List of points as [x, y] or [x, y, z]
    """
    # For circles, treat them as curves and sample points along them
    # This is more reliable than trying to extract plane information
    domain = rs.CurveDomain(circle_id)
    if domain is None:
        return None
    
    points = []
    
    # Sample points around the circle curve
    for i in range(num_points + 1):
        t = domain[0] + (domain[1] - domain[0]) * (i / num_points)
        point = rs.EvaluateCurve(circle_id, t)
        
        if point:
            if is_profile:
                points.append([point[0], point[1]])
            else:
                points.append([point[0], point[1], point[2] if len(point) > 2 else 0.0])
    
    return points


def convert_circle_to_arcs(circle_id):
    """
    Convert a circle to arcs by breaking it into segments
    This makes circles easier to process
    
    Args:
        circle_id: Rhino object ID of the circle
    
    Returns:
        List of curve object IDs (arcs or polyline segments), or original circle if conversion fails
    """
    try:
        # Method 1: Try to explode the circle into arcs
        # Some Rhino versions allow exploding circles into arcs
        exploded = rs.ExplodeCurves(circle_id, delete_input=False)
        if exploded and len(exploded) > 0:
            return exploded
        
        # Method 2: Convert circle to polyline (approximates with line segments)
        # This breaks the circle into many small segments
        try:
            polyline = rs.ConvertCurveToPolyline(circle_id, angle_tolerance=5.0, tolerance=0.01, min_edge_count=16, max_edge_count=64)
            if polyline:
                return [polyline]
        except:
            pass
        
        # Method 3: Fallback - just treat as a curve and sample it
        # This will work but won't create explicit arcs
        return [circle_id]
    except:
        # If all methods fail, return the original circle
        return [circle_id]


def geometry_to_points(obj_id, is_profile=False):
    """
    Convert any Rhino geometry to points based on its type
    
    Args:
        obj_id: Rhino object ID
        is_profile: If True, returns 2D points. If False, returns 3D points
    
    Returns:
        List of points
    """
    obj_type = rs.ObjectType(obj_id)
    
    if obj_type == rs.filter.curve:
        # Check if it's a circle - convert to arcs/polyline first
        if rs.IsCircle(obj_id):
            # Convert circle to arcs or polyline segments
            converted = convert_circle_to_arcs(obj_id)
            if converted and len(converted) > 0:
                # Process the converted geometry
                all_points = []
                for conv_id in converted:
                    # Check what type the converted object is
                    if rs.IsPolyline(conv_id):
                        points = polyline_to_points(conv_id, is_profile)
                    elif rs.IsArc(conv_id):
                        points = arc_to_points(conv_id, is_profile)
                    else:
                        points = curve_to_points(conv_id, is_profile)
                    
                    if points:
                        all_points.extend(points)
                
                return all_points if all_points else None
            else:
                # Fallback to treating as curve
                return curve_to_points(obj_id, is_profile)
        # Check if it's a polyline
        elif rs.IsPolyline(obj_id):
            return polyline_to_points(obj_id, is_profile)
        # Check if it's an arc
        elif rs.IsArc(obj_id):
            return arc_to_points(obj_id, is_profile)
        # Otherwise, treat as general curve
        else:
            return curve_to_points(obj_id, is_profile)
    else:
        rs.MessageBox("Selected object is not a curve, polyline, arc, or circle.", 0, "Error")
        return None


def export_to_json():
    """
    Main function to export selected Rhino geometry to JSON
    """
    # Get selected objects
    obj_ids = rs.GetObjects("Select geometry to export (curves, polylines, arcs, circles)", 
                           rs.filter.curve, preselect=True)
    
    if not obj_ids:
        rs.MessageBox("No objects selected.", 0, "Error")
        return
    
    # Ask user if this is a profile or path
    result = rs.GetString("Is this a PROFILE (2D) or PATH (2D/3D)?", 
                         "PROFILE", ["PROFILE", "PATH"])
    
    if not result:
        return
    
    is_profile = (result == "PROFILE")
    
    # Collect points from all selected objects
    all_points = []
    
    for obj_id in obj_ids:
        points = geometry_to_points(obj_id, is_profile)
        if points:
            all_points.extend(points)
        else:
            rs.MessageBox("Failed to extract points from object {}".format(obj_id), 0, "Warning")
    
    if not all_points:
        rs.MessageBox("No points extracted from selected geometry.", 0, "Error")
        return
    
    # Remove duplicate consecutive points
    cleaned_points = [all_points[0]]
    tolerance = 0.001
    
    for i in range(1, len(all_points)):
        prev = cleaned_points[-1]
        curr = all_points[i]
        
        if is_profile:
            dist = math.sqrt((curr[0] - prev[0])**2 + (curr[1] - prev[1])**2)
        else:
            dist = math.sqrt((curr[0] - prev[0])**2 + (curr[1] - prev[1])**2 + 
                            ((curr[2] if len(curr) > 2 else 0) - (prev[2] if len(prev) > 2 else 0))**2)
        
        if dist > tolerance:
            cleaned_points.append(curr)
    
    # For profiles, ensure it's closed
    if is_profile and len(cleaned_points) > 2:
        first = cleaned_points[0]
        last = cleaned_points[-1]
        dist = math.sqrt((last[0] - first[0])**2 + (last[1] - first[1])**2)
        
        if dist > tolerance:
            cleaned_points.append(first)
    
    # Get file path to save
    default_name = "profile.json" if is_profile else "path.json"
    file_path = rs.SaveFileName("Save JSON file", "JSON Files (*.json)|*.json||", "", default_name)
    
    if not file_path:
        return
    
    # Write JSON file
    try:
        with open(file_path, 'w') as f:
            json.dump(cleaned_points, f, indent=2)
        
        rs.MessageBox("Successfully exported {} points to:\n{}".format(len(cleaned_points), file_path), 
                     0, "Export Complete")
        
        print("Exported {} points to {}".format(len(cleaned_points), file_path))
        print("Type: {}".format("Profile (2D)" if is_profile else "Path (2D/3D)"))
        
    except Exception as e:
        rs.MessageBox("Error saving file: {}".format(str(e)), 0, "Error")


# Run the export function
if __name__ == "__main__":
    export_to_json()

