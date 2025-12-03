/**
 * Test script for offset computation
 * Run with: npx tsx test-offset.ts (or ts-node, or compile first)
 */

import { computeOffsets } from './src/offset/index';
import type { Wall } from './src/types/index';

// Test case 1: Simple horizontal load-bearing wall
const testWall1: Wall = {
  start: [0, 0],
  end: [10, 0],
  thickness: 12, // 12" = 1ft
  height: 120, // 10ft
  isLoadBearing: true
};

// Test case 2: Vertical load-bearing wall
const testWall2: Wall = {
  start: [0, 0],
  end: [0, 10],
  thickness: 12,
  height: 120,
  isLoadBearing: true
};

// Test case 3: Diagonal load-bearing wall
const testWall3: Wall = {
  start: [0, 0],
  end: [10, 10],
  thickness: 12,
  height: 120,
  isLoadBearing: true
};

// Test case 4: Non-load-bearing wall (should be skipped)
const testWall4: Wall = {
  start: [0, 0],
  end: [5, 0],
  thickness: 8,
  height: 120,
  isLoadBearing: false
};

// Test case 5: Load-bearing wall with different thickness
const testWall5: Wall = {
  start: [0, 0],
  end: [10, 0],
  thickness: 16, // 16" wall
  height: 120,
  isLoadBearing: true
};

console.log('=== Testing Offset Computation ===\n');

const testWalls: Wall[] = [testWall1, testWall2, testWall3, testWall4, testWall5];

console.log('Input walls:');
testWalls.forEach((wall, i) => {
  console.log(`  Wall ${i + 1}:`, {
    start: wall.start,
    end: wall.end,
    thickness: `${wall.thickness}"`,
    isLoadBearing: wall.isLoadBearing,
    expectedOffset: wall.isLoadBearing ? `(${wall.thickness} - 2) / 2 = ${(wall.thickness - 2) / 2}"` : 'N/A (skipped)'
  });
});

console.log('\nComputing offsets...\n');
const offsetCurves = computeOffsets(testWalls);

console.log(`Results: ${offsetCurves.length} offset curves generated\n`);

offsetCurves.forEach((curve, i) => {
  const wall = curve.sourceWalls?.[0];
  console.log(`Offset Curve ${i + 1}:`);
  console.log(`  Source wall: [${wall?.start}] → [${wall?.end}]`);
  console.log(`  Wall thickness: ${wall?.thickness}"`);
  console.log(`  Offset distance: ${curve.distance}"`);
  console.log(`  Offset start point: [${curve.points[0][0].toFixed(4)}, ${curve.points[0][1].toFixed(4)}]`);
  console.log(`  Offset end point: [${curve.points[1][0].toFixed(4)}, ${curve.points[1][1].toFixed(4)}]`);
  
  // Calculate the offset vector to verify
  const originalVec = [wall!.end[0] - wall!.start[0], wall!.end[1] - wall!.start[1]];
  const offsetVec = [curve.points[1][0] - curve.points[0][0], curve.points[1][1] - curve.points[0][1]];
  console.log(`  Original vector: [${originalVec[0]}, ${originalVec[1]}]`);
  console.log(`  Offset vector: [${offsetVec[0].toFixed(4)}, ${offsetVec[1].toFixed(4)}]`);
  console.log(`  (Should be same direction, just offset perpendicularly)\n`);
});

console.log('=== Test Summary ===');
console.log(`Total walls: ${testWalls.length}`);
console.log(`Load-bearing walls: ${testWalls.filter(w => w.isLoadBearing).length}`);
console.log(`Non-load-bearing walls: ${testWalls.filter(w => !w.isLoadBearing).length}`);
console.log(`Offset curves generated: ${offsetCurves.length}`);
console.log(`Expected: ${testWalls.filter(w => w.isLoadBearing).length} (should match load-bearing count)`);

