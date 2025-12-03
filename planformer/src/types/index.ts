/**
 * Core type definitions for Planformer
 */

/**
 * 2D point coordinates [x, y]
 */
export type Point2D = [number, number];

/**
 * 3D point coordinates [x, y, z]
 */
export type Point3D = [number, number, number];

/**
 * Wall data structure representing a wall segment in a floorplan
 */
export interface Wall {
  /** Start point of the wall [x, y] */
  start: Point2D;
  /** End point of the wall [x, y] */
  end: Point2D;
  /** Wall thickness in units (inches) */
  thickness: number;
  /** Wall height in units (inches, default: 10ft = 120") */
  height: number;
  /** Whether this is a load-bearing wall (default: false) */
  isLoadBearing?: boolean;
}

/**
 * Closed polygon represented as an array of 2D points
 */
export type Polygon = Point2D[];

/**
 * Offset curve data structure
 */
export interface OffsetCurve {
  /** The offset curve points */
  points: Point2D[];
  /** Offset distance used */
  distance: number;
  /** Reference to the original wall(s) this curve was derived from */
  sourceWalls?: Wall[];
}

/**
 * Layer data structure representing a single printing layer
 */
export interface Layer {
  /** Layer height (Z coordinate) */
  z: number;
  /** Layer thickness */
  thickness: number;
  /** Geometry polygons for this layer */
  polygons: Polygon[];
  /** Layer index (0-based) */
  index: number;
}

/**
 * Toolpath segment data structure
 */
export interface Toolpath {
  /** Toolpath points (3D coordinates) */
  points: Point3D[];
  /** Movement type (e.g., 'travel', 'print', 'retract') */
  type: 'travel' | 'print' | 'retract';
  /** Feed rate for this segment */
  feedRate?: number;
  /** Layer index this toolpath belongs to */
  layerIndex: number;
}

/**
 * G-code generation configuration
 */
export interface GCodeConfig {
  /** Feed rate for printing moves (units per minute) */
  printFeedRate: number;
  /** Feed rate for travel moves (units per minute) */
  travelFeedRate: number;
  /** Extrusion multiplier */
  extrusionMultiplier?: number;
  /** Layer height */
  layerHeight: number;
  /** Nozzle diameter */
  nozzleDiameter?: number;
  /** Filament diameter */
  filamentDiameter?: number;
  /** Initial G-code header commands */
  header?: string[];
  /** Final G-code footer commands */
  footer?: string[];
}

/**
 * Configuration for wall processing defaults
 */
export interface WallConfig {
  /** Default load-bearing wall thickness in inches (default: 12" = 1ft) */
  loadBearingWallThickness: number;
  /** Default non-load-bearing wall thickness in inches (default: 8") */
  nonLoadBearingWallThickness: number;
  /** Default wall height in inches (default: 120" = 10ft) */
  defaultWallHeight: number;
}

