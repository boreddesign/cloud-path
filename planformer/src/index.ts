/**
 * Planformer - Lightweight geometry and toolpath backend
 * 
 * Main entry point that exports all public APIs
 */

// Types
export type {
  Point2D,
  Point3D,
  Wall,
  Polygon,
  OffsetCurve,
  Layer,
  Toolpath,
  GCodeConfig,
  WallConfig
} from './types';

// Parser
export { parseWallData, DEFAULT_WALL_CONFIG } from './parser';

// Geometry
export * from './geometry';

// Offset
export { computeOffsets } from './offset';

// Join
export { joinCurves } from './join';

// Rules
export { applyRules } from './rules';

// Layers
export { generateLayers } from './layers';

// Toolpath
export { generateToolpath } from './toolpath';

// G-code
export { generateGCode } from './gcode';

