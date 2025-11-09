/**
 * Coordinate utilities for ZX-diagram editor
 * Platform-agnostic coordinate calculations
 */

/**
 * Snap a value to grid if snap is enabled
 *
 * @param value - Value to snap
 * @param gridSize - Size of grid cells
 * @param snapEnabled - Whether snapping is enabled
 * @returns Snapped value
 */
export function snapToGrid(value: number, gridSize: number, snapEnabled: boolean): number {
  if (!snapEnabled) return value
  return Math.round(value / gridSize) * gridSize
}

/**
 * Convert graph coordinates to screen coordinates
 * ZXLive convention: row (time) is horizontal (x), col (qubit) is vertical (y)
 *
 * @param row - Graph row coordinate
 * @param col - Graph column coordinate
 * @param scale - Pixels per graph unit
 * @param zoom - Zoom level
 * @param panOffset - Pan offset in pixels
 * @returns Screen coordinates
 */
export function graphToScreen(
  row: number,
  col: number,
  scale: number,
  zoom: number,
  panOffset: { x: number; y: number }
): { x: number; y: number } {
  const x = (row * scale + 100) * zoom + panOffset.x
  const y = (col * scale + 50) * zoom + panOffset.y
  return { x, y }
}

/**
 * Convert screen coordinates to graph coordinates (inverse of graphToScreen)
 * Note: This is the mathematical inverse; actual screen-to-SVG conversion
 * needs platform-specific APIs (see web/utils/SVGCoordinateTransform.ts)
 *
 * @param screenX - Screen X coordinate (after SVG transform)
 * @param screenY - Screen Y coordinate (after SVG transform)
 * @param scale - Pixels per graph unit
 * @param zoom - Zoom level
 * @param panOffset - Pan offset in pixels
 * @returns Graph coordinates
 */
export function screenToGraph(
  screenX: number,
  screenY: number,
  scale: number,
  zoom: number,
  panOffset: { x: number; y: number }
): { row: number; col: number } {
  const row = ((screenX - panOffset.x) / zoom - 100) / scale
  const col = ((screenY - panOffset.y) / zoom - 50) / scale
  return { row, col }
}
