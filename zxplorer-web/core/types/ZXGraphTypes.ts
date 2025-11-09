/**
 * Core type definitions for ZX-diagram editor
 *
 * Platform-agnostic types that can be shared across web and mobile implementations.
 */

/**
 * TODO: Use proper enums when support becomes available.
 */
export const VertexType = {
  Boundary: 0,
  Z: 1,
  X: 2,
  H: 3,
} as const

export type VertexType = typeof VertexType[keyof typeof VertexType]

export const EdgeType = {
  Simple: 0,
  Hadamard: 1,
} as const

export type EdgeType = typeof EdgeType[keyof typeof EdgeType]

export interface Vertex {
  id: number
  vertex_type: number
  phase: string
  row: number
  col: number
}

export interface Edge {
  source: number
  target: number
  edge_type: number
  curve_distance?: number  // Curvature for the edge (0 = straight)
}

export interface ClipboardData {
  vertices: Vertex[]
  edges: Edge[]
}

export interface Point {
  x: number
  y: number
}

/**
 * Tool modes for diagram editing
 * TODO: Put this elsewhere, not really part of ZX diagram representation.
 */
export const ToolType = {
  SELECT: 0,
  VERTEX: 1,
  EDGE: 2,
} as const

export type ToolType = typeof ToolType[keyof typeof ToolType]

