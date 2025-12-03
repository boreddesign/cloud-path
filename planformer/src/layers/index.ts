/**
 * Layers module - generates printing layers from geometry
 */

import type { Polygon, Layer, Wall } from '../types';

/**
 * Generates printing layers from geometry polygons
 * 
 * Creates layer data structures with appropriate Z heights
 * based on the layer height parameter. Stacks layers up to the wall height
 * (default: 10ft = 120").
 * 
 * @param polygons - Array of polygons to generate layers from
 * @param layerHeight - Height of each layer in units (inches)
 * @param wallHeight - Total wall height to stack layers to (inches, default: 120" = 10ft)
 * @returns Array of Layer objects
 * 
 * @example
 * ```typescript
 * const polygons = [[[0,0], [10,0], [10,10], [0,10], [0,0]]];
 * const layers = generateLayers(polygons, 0.2, 120);
 * ```
 */
export function generateLayers(
  polygons: Polygon[],
  layerHeight: number,
  wallHeight: number = 120 // Default: 10ft = 120"
): Layer[] {
  // TODO: Implement layer generation
  // This will:
  // - Calculate number of layers based on wallHeight and layerHeight
  // - Create Layer objects with appropriate Z coordinates (stacking from 0 to wallHeight)
  // - Assign polygons to each layer (same polygons for all layers in this case)
  // - Handle layer indexing (0-based)
  
  const layers: Layer[] = [];
  const numLayers = Math.ceil(wallHeight / layerHeight);
  
  for (let i = 0; i < numLayers; i++) {
    const z = i * layerHeight;
    layers.push({
      z,
      thickness: layerHeight,
      polygons: polygons, // Same polygons for all layers
      index: i
    });
  }
  
  return layers;
}

