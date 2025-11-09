/**
 * Graph operations for ZX-diagrams
 * Platform-agnostic operations using QuiZX WASM API
 */

import { ZXGraph } from 'quizx-wasm'
import { Vertex, Edge } from '../types/ZXGraphTypes'

/**
 * Add a vertex to the graph at specified coordinates
 *
 * @param graph - The ZX graph
 * @param vertexType - Type of vertex (0=Boundary, 1=Z, 2=X, 3=H)
 * @param row - Row coordinate (horizontal/time)
 * @param col - Column coordinate (vertical/qubit)
 * @returns ID of the newly created vertex
 */
export function addVertex(
  graph: ZXGraph,
  vertexType: number,
  row: number,
  col: number
): number {
  return graph.add_vertex_with_position(vertexType, row, col)
}

/**
 * Add an edge between two vertices
 *
 * @param graph - The ZX graph
 * @param source - Source vertex ID
 * @param target - Target vertex ID
 * @param edgeType - Edge type (0=Simple, 1=Hadamard)
 */
export function addEdge(
  graph: ZXGraph,
  source: number,
  target: number,
  edgeType: number
): void {
  graph.add_edge_with_type(source, target, edgeType)
}

/**
 * Remove a vertex from the graph
 * Also removes all edges connected to this vertex
 *
 * @param graph - The ZX graph
 * @param vertexId - ID of vertex to remove
 */
export function removeVertex(graph: ZXGraph, vertexId: number): void {
  graph.remove_vertex(vertexId)
}

/**
 * Remove an edge from the graph
 *
 * @param graph - The ZX graph
 * @param source - Source vertex ID
 * @param target - Target vertex ID
 */
export function removeEdge(graph: ZXGraph, source: number, target: number): void {
  graph.remove_edge(source, target)
}

/**
 * Delete selected vertices and edges from the graph
 *
 * @param graph - The ZX graph
 * @param selectedVertices - Set of vertex IDs to delete
 * @param selectedEdges - Set of edge IDs (format: "source-target") to delete
 */
export function deleteSelection(
  graph: ZXGraph,
  selectedVertices: Set<number>,
  selectedEdges: Set<string>
): void {
  // Delete selected vertices
  selectedVertices.forEach(vId => {
    graph.remove_vertex(vId)
  })

  // Delete selected edges
  selectedEdges.forEach(edgeId => {
    const [sourceStr, targetStr] = edgeId.split('-')
    const source = parseInt(sourceStr)
    const target = parseInt(targetStr)
    graph.remove_edge(source, target)
  })
}

/**
 * Convert a vertex to a different type
 *
 * @param graph - The ZX graph
 * @param vertexId - ID of vertex to convert
 * @param newType - New vertex type (0=Boundary, 1=Z, 2=X, 3=H)
 * @throws Error if conversion fails
 */
export function convertVertexType(
  graph: ZXGraph,
  vertexId: number,
  newType: number
): void {
  graph.set_vertex_type(vertexId, newType)
}

/**
 * Toggle an edge between Simple and Hadamard types
 *
 * @param graph - The ZX graph
 * @param source - Source vertex ID
 * @param target - Target vertex ID
 * @param currentType - Current edge type
 * @returns New edge type
 */
export function toggleEdgeType(
  graph: ZXGraph,
  source: number,
  target: number,
  currentType: number
): number {
  const newType = currentType === 0 ? 1 : 0
  graph.set_edge_type(source, target, newType)
  return newType
}

/**
 * Set the phase of a vertex
 *
 * @param graph - The ZX graph
 * @param vertexId - ID of vertex
 * @param phase - Phase as string (e.g., "0", "1/2", "3/4", "1")
 * @throws Error if phase is invalid
 */
export function setVertexPhase(
  graph: ZXGraph,
  vertexId: number,
  phase: string
): void {
  graph.set_vertex_phase(vertexId, phase)
}

/**
 * Get vertices from graph as array
 *
 * @param graph - The ZX graph
 * @returns Array of vertex objects
 */
export function getVertices(graph: ZXGraph): Vertex[] {
  const verticesJson = graph.get_vertices_json()
  return JSON.parse(verticesJson) as Vertex[]
}

/**
 * Get edges from graph as array
 *
 * @param graph - The ZX graph
 * @returns Array of edge objects
 */
export function getEdges(graph: ZXGraph): Edge[] {
  const edgesJson = graph.get_edges_json()
  return JSON.parse(edgesJson) as Edge[]
}

/**
 * Update vertices and edges from graph
 * Convenience function for refreshing UI state
 *
 * @param graph - The ZX graph
 * @returns Object containing vertices and edges arrays
 */
export function updateGraphData(graph: ZXGraph): { vertices: Vertex[]; edges: Edge[] } {
  return {
    vertices: getVertices(graph),
    edges: getEdges(graph)
  }
}
