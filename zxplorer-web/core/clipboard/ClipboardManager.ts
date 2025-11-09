/**
 * Clipboard manager for copy/paste operations
 * Platform-agnostic clipboard operations for ZX-diagrams
 */

import { ZXGraph } from 'quizx-wasm'
import { Vertex, Edge, ClipboardData } from '../types/ZXGraphTypes'

/**
 * Manages clipboard operations for copy/paste
 * Tracks paste count to offset pasted elements
 */
export class ClipboardManager {
  private clipboard: ClipboardData | null = null
  private pasteCount: number = 0

  /**
   * Copy selected vertices and their connecting edges
   *
   * @param vertices - All vertices in the graph
   * @param edges - All edges in the graph
   * @param selectedVertices - Set of selected vertex IDs
   * @returns Number of vertices copied
   */
  copy(vertices: Vertex[], edges: Edge[], selectedVertices: Set<number>): number {
    if (selectedVertices.size === 0) {
      return 0
    }

    // Get selected vertices
    const selectedVertexData = vertices.filter(v => selectedVertices.has(v.id))

    // Get edges that connect two selected vertices (internal edges only)
    const selectedEdgeData = edges.filter(e =>
      selectedVertices.has(e.source) && selectedVertices.has(e.target)
    )

    this.clipboard = {
      vertices: selectedVertexData,
      edges: selectedEdgeData
    }

    // Reset paste counter for new clipboard content
    this.pasteCount = 0

    return selectedVertexData.length
  }

  /**
   * Paste clipboard contents into the graph
   * Each paste is offset to prevent overlap
   *
   * @param graph - The ZX graph to paste into
   * @returns Set of newly created vertex IDs, or null if clipboard is empty
   */
  paste(graph: ZXGraph): Set<number> | null {
    if (!this.clipboard || this.clipboard.vertices.length === 0) {
      return null
    }

    // Create a mapping from old vertex IDs to new vertex IDs
    const idMap = new Map<number, number>()

    // Offset for pasted vertices - increments with each paste
    // This prevents multiple pastes from overlapping
    const baseOffset = 0.5
    const offset = baseOffset * (this.pasteCount + 1)

    // Create new vertices
    this.clipboard.vertices.forEach(v => {
      const newId = graph.add_vertex_with_position(
        v.vertex_type,
        v.row + offset,
        v.col + offset
      )
      idMap.set(v.id, newId)

      // Copy the phase if it's not default
      if (v.phase !== '0') {
        try {
          graph.set_vertex_phase(newId, v.phase)
        } catch (err) {
          console.error(`Failed to set phase for vertex ${newId}:`, err)
        }
      }
    })

    // Create new edges using the ID mapping
    this.clipboard.edges.forEach(e => {
      const newSource = idMap.get(e.source)
      const newTarget = idMap.get(e.target)
      if (newSource !== undefined && newTarget !== undefined) {
        graph.add_edge_with_type(newSource, newTarget, e.edge_type)
      }
    })

    // Increment paste counter so next paste has a different offset
    this.pasteCount += 1

    return new Set(idMap.values())
  }

  /**
   * Check if clipboard has content
   */
  isEmpty(): boolean {
    return this.clipboard === null || this.clipboard.vertices.length === 0
  }

  /**
   * Get clipboard contents (for inspection)
   */
  getClipboard(): ClipboardData | null {
    return this.clipboard
  }

  /**
   * Clear clipboard
   */
  clear(): void {
    this.clipboard = null
    this.pasteCount = 0
  }

  /**
   * Get number of items in clipboard
   */
  getCount(): { vertices: number; edges: number } {
    if (!this.clipboard) {
      return { vertices: 0, edges: 0 }
    }
    return {
      vertices: this.clipboard.vertices.length,
      edges: this.clipboard.edges.length
    }
  }
}
