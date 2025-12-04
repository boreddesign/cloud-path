"""
Rhino to JSON Converter for CAD Loft Visualizer

This script exports Rhino geometry (curves, polylines, arcs, circles) to JSON format
with start/end points, geometry type, and arc/circle properties for accurate geometry sampling.

Exported Properties:
- type: line, arc, circle, polyline, curve
- start, end: endpoint coordinates [x, y] or [x, y, z]
- center (arcs/circles): center point coordinates
- radius (arcs/circles): radius value
- clockwise (arcs/circles): direction of arc/circle
- closed: whether the curve is closed

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
import math

def point_to_array(point, is_profile=False):
    """
    Convert a Rhino point to array format
    
    Args:
        point: Rhino point (list or tuple)
        is_profile: If True, returns 2D [x, y]. If False, returns 3D [x, y, z]
    
    Returns:
        Point as [x, y] or [x, y, z]
    """
    if is_profile:
        return [float(point[0]), float(point[1])]
    else:
        z = float(point[2]) if len(point) > 2 else 0.0
        return [float(point[0]), float(point[1]), z]


def get_curve_endpoints(curve_id):
    """
    Get start and end points of a curve
    
    Args:
        curve_id: Rhino object ID of the curve
    
    Returns:
        Tuple of (start_point, end_point) or None if failed
    """
    try:
        domain = rs.CurveDomain(curve_id)
        if domain is None:
            return None
        
        start_point = rs.EvaluateCurve(curve_id, domain[0])
        end_point = rs.EvaluateCurve(curve_id, domain[1])
        
        if start_point and end_point:
            return (start_point, end_point)
    except:
        pass
    
    return None


def geometry_to_segment(obj_id, is_profile=False):
    """
    Convert a Rhino geometry object to a segment with type and endpoints
    
    Args:
        obj_id: Rhino object ID
        is_profile: If True, uses 2D points. If False, uses 3D points
    
    Returns:
        Dictionary with 'type', 'start', 'end', and optionally 'center', 'radius', 'clockwise', 'closed'
    """
    obj_type = rs.ObjectType(obj_id)
    
    if obj_type != rs.filter.curve:
        return None
    
    segment = {}
    
    # Determine geometry type
    if rs.IsLine(obj_id):
        segment['type'] = 'line'
    elif rs.IsArc(obj_id):
        segment['type'] = 'arc'
        # Extract arc properties for accurate arc sampling
        try:
            arc_center = rs.ArcCenterPoint(obj_id)
            arc_radius = rs.ArcRadius(obj_id)
            
            if arc_center and arc_radius:
                segment['center'] = point_to_array(arc_center, is_profile)
                segment['radius'] = float(arc_radius)
                
                # Determine arc direction (clockwise or counterclockwise)
                # Get arc plane to determine direction
                arc_plane = rs.ArcPlane(obj_id)
                if arc_plane:
                    # Check if arc normal points up (counterclockwise) or down (clockwise)
                    # For 2D profiles, check Z component of normal
                    normal = arc_plane[3]  # Normal vector is the 4th element of plane
                    if is_profile:
                        # For profiles in XY plane, Z > 0 means counterclockwise
                        segment['clockwise'] = (normal[2] < 0)
                    else:
                        # For 3D paths, use the same logic
                        segment['clockwise'] = (normal[2] < 0)
        except:
            # If arc properties fail, continue without them
            # Fallback will handle it
            pass
    elif rs.IsCircle(obj_id):
        segment['type'] = 'circle'
        segment['closed'] = True
        # Extract circle properties
        try:
            circle_center = rs.CircleCenterPoint(obj_id)
            circle_radius = rs.CircleRadius(obj_id)
            
            if circle_center and circle_radius:
                segment['center'] = point_to_array(circle_center, is_profile)
                segment['radius'] = float(circle_radius)
                
                # Determine circle direction
                circle_plane = rs.CirclePlane(obj_id)
                if circle_plane:
                    normal = circle_plane[3]
                    if is_profile:
                        segment['clockwise'] = (normal[2] < 0)
                    else:
                        segment['clockwise'] = (normal[2] < 0)
        except:
            # If circle properties fail, continue without them
            pass
    elif rs.IsPolyline(obj_id):
        segment['type'] = 'polyline'
        # For polylines, get first and last vertices
        vertices = rs.PolylineVertices(obj_id)
        if vertices and len(vertices) >= 2:
            segment['start'] = point_to_array(vertices[0], is_profile)
            segment['end'] = point_to_array(vertices[-1], is_profile)
            if rs.IsCurveClosed(obj_id):
                segment['closed'] = True
            return segment
    else:
        # Generic curve
        segment['type'] = 'curve'
    
    # Get start and end points
    endpoints = get_curve_endpoints(obj_id)
    if endpoints:
        segment['start'] = point_to_array(endpoints[0], is_profile)
        segment['end'] = point_to_array(endpoints[1], is_profile)
        
        # Check if closed
        if rs.IsCurveClosed(obj_id):
            segment['closed'] = True
        
        return segment
    
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
    
    # Collect segments from all selected objects
    segments = []
    
    for obj_id in obj_ids:
        segment = geometry_to_segment(obj_id, is_profile)
        if segment:
            segments.append(segment)
        else:
            rs.MessageBox("Failed to extract geometry from object {}".format(obj_id), 0, "Warning")
    
    if not segments:
        rs.MessageBox("No geometry extracted from selected objects.", 0, "Error")
        return
    
    # Get file path to save
    default_name = "profile.json" if is_profile else "path.json"
    file_path = rs.SaveFileName("Save JSON file", "JSON Files (*.json)|*.json||", "", default_name)
    
    if not file_path:
        return
    
    # Write JSON file
    try:
        with open(file_path, 'w') as f:
            json.dump(segments, f, indent=2)
        
        rs.MessageBox("Successfully exported {} segments to:\n{}".format(len(segments), file_path), 
                     0, "Export Complete")
        
        print("Exported {} segments to {}".format(len(segments), file_path))
        print("Type: {}".format("Profile (2D)" if is_profile else "Path (2D/3D)"))
        
    except Exception as e:
        rs.MessageBox("Error saving file: {}".format(str(e)), 0, "Error")


# Run the export function
if __name__ == "__main__":
    export_to_json()

