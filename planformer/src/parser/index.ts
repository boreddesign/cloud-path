/**
 * Parser module for converting JSON wall data into Wall objects
 */

import type { Wall, WallConfig } from '../types';

/**
 * Default wall configuration
 */
export const DEFAULT_WALL_CONFIG: WallConfig = {
  loadBearingWallThickness: 12, // 1ft = 12"
  nonLoadBearingWallThickness: 8, // 8"
  defaultWallHeight: 120 // 10ft = 120"
};

/**
 * Parses JSON string or object containing wall data into an array of Wall objects
 * 
 * Applies default values for missing properties:
 * - thickness: uses loadBearingWallThickness or nonLoadBearingWallThickness based on isLoadBearing
 * - height: uses defaultWallHeight (120" = 10ft)
 * - isLoadBearing: defaults to false
 * 
 * @param input - JSON string or parsed object containing wall data
 * @param config - Wall configuration with default thicknesses and height
 * @returns Array of Wall objects
 * @throws Error if input is invalid or cannot be parsed
 * 
 * @example
 * ```typescript
 * const jsonString = '[{"start": [0, 0], "end": [10, 0], "isLoadBearing": true}]';
 * const walls = parseWallData(jsonString);
 * // Uses default thickness (12" for load-bearing) and height (120")
 * ```
 */
export function parseWallData(
  input: string | unknown,
  config: WallConfig = DEFAULT_WALL_CONFIG
): Wall[] {
  // TODO: Implement JSON parsing logic
  // Expected input format: Array of wall objects with:
  // - start: [x, y]
  // - end: [x, y]
  // - thickness?: number (optional, uses config default based on isLoadBearing)
  // - height?: number (optional, defaults to config.defaultWallHeight)
  // - isLoadBearing?: boolean (optional, defaults to false)
  
  // Parse logic:
  // 1. Parse JSON if string
  // 2. Validate it's an array
  // 3. For each wall object:
  //    - Validate start and end points
  //    - Apply default thickness based on isLoadBearing
  //    - Apply default height if not provided
  //    - Set isLoadBearing to false if not provided
  
  throw new Error('parseWallData not yet implemented');
}

