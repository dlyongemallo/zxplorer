/**
 * Core type definitions for ZX-diagram editor
 * Platform-agnostic types that can be shared across web and mobile implementations
 */

/**
 * Vertex types in ZX-calculus
 * Values match the numeric constants used by QuiZX WASM bindings
 */
export const VertexType = {
  Boundary: 0,
  Z: 1,
  X: 2,
  H: 3,
} as const

export type VertexType = typeof VertexType[keyof typeof VertexType]

/**
 * Edge types in ZX-calculus
 */
export const EdgeType = {
  Simple: 0,
  Hadamard: 1,
} as const

export type EdgeType = typeof EdgeType[keyof typeof EdgeType]

/**
 * Tool modes for diagram editing
 */
export const ToolType = {
  SELECT: 0,
  VERTEX: 1,
  EDGE: 2,
} as const

export type ToolType = typeof ToolType[keyof typeof ToolType]

/**
 * Vertex data structure
 */
export interface Vertex {
  id: number
  vertex_type: number
  phase: string
  row: number
  col: number
}

/**
 * Edge data structure
 */
export interface Edge {
  source: number
  target: number
  edge_type: number
  curve_distance?: number  // Curvature for the edge (0 = straight)
}

/**
 * Clipboard data for copy/paste operations
 */
export interface ClipboardData {
  vertices: Vertex[]
  edges: Edge[]
}

/**
 * 2D point for coordinates
 */
export interface Point {
  x: number
  y: number
}
