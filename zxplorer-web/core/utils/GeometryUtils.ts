/**
 * Geometry utilities for ZX-diagram rendering
 * Platform-agnostic mathematical calculations for edge curvature and paths
 */

import { Point } from '../types/ZXGraphTypes'

/**
 * Pixels per graph unit (for coordinate scaling)
 */
export const SCALE = 80

/**
 * Calculate perpendicular direction for edge curvature
 * Returns a normalized perpendicular vector (rotated 90 degrees)
 */
export function computePerpendicular(x1: number, y1: number, x2: number, y2: number): Point {
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.sqrt(dx * dx + dy * dy)

  if (length === 0) return { x: 0, y: 1 }

  // Return normalized perpendicular vector (rotated 90 degrees)
  return { x: -dy / length, y: dx / length }
}

/**
 * Create SVG path string for a curved edge
 * Uses quadratic Bezier curve with perpendicular offset
 *
 * @param x1 - Start point X coordinate (screen space)
 * @param y1 - Start point Y coordinate (screen space)
 * @param x2 - End point X coordinate (screen space)
 * @param y2 - End point Y coordinate (screen space)
 * @param curveDistance - Curvature amount in graph units
 * @returns SVG path string (M/L for straight, M/Q for curved)
 */
export function createCurvedPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curveDistance: number
): string {
  if (curveDistance === 0 || Math.abs(curveDistance) < 0.01) {
    // Straight line
    return `M ${x1},${y1} L ${x2},${y2}`
  }

  // Calculate control point for quadratic bezier curve
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2
  const perp = computePerpendicular(x1, y1, x2, y2)

  // Offset the midpoint perpendicular to the line (matches ZXLive)
  const offset = curveDistance * SCALE
  const ctrlX = midX + perp.x * offset
  const ctrlY = midY + perp.y * offset

  return `M ${x1},${y1} Q ${ctrlX},${ctrlY} ${x2},${y2}`
}

/**
 * Get point on a curved path at parameter t
 * Uses quadratic Bezier formula
 *
 * @param x1 - Start point X coordinate (screen space)
 * @param y1 - Start point Y coordinate (screen space)
 * @param x2 - End point X coordinate (screen space)
 * @param y2 - End point Y coordinate (screen space)
 * @param curveDistance - Curvature amount in graph units
 * @param t - Parameter along curve (0 = start, 0.5 = middle, 1 = end)
 * @returns Point on the curve
 */
export function getPointOnCurve(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curveDistance: number,
  t: number = 0.5
): Point {
  if (curveDistance === 0 || Math.abs(curveDistance) < 0.01) {
    // Straight line - just return interpolated point
    return { x: (1 - t) * x1 + t * x2, y: (1 - t) * y1 + t * y2 }
  }

  // Calculate control point (matches ZXLive)
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2
  const perp = computePerpendicular(x1, y1, x2, y2)
  const offset = curveDistance * SCALE
  const ctrlX = midX + perp.x * offset
  const ctrlY = midY + perp.y * offset

  // Quadratic bezier formula: B(t) = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
  const x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * ctrlX + t * t * x2
  const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * ctrlY + t * t * y2

  return { x, y }
}
