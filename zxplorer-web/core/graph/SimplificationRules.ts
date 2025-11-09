/**
 * Simplification rules for ZX-diagrams
 * Platform-agnostic wrappers around QuiZX WASM simplification methods
 */

import { ZXGraph } from 'quizx-wasm'

/**
 * Result of applying a simplification rule
 */
export interface SimplificationResult {
  applied: boolean
  message: string
  vertexReduction?: number
  edgeReduction?: number
}

/**
 * Apply a single simplification rule to the graph
 *
 * @param graph - The ZX graph to simplify
 * @param ruleName - Human-readable name of the rule
 * @param ruleFunc - Function that applies the rule and returns success boolean
 * @returns Result indicating success and message
 */
export function applyRule(
  graph: ZXGraph,
  ruleName: string,
  ruleFunc: () => boolean
): SimplificationResult {
  const result = ruleFunc()

  return {
    applied: result,
    message: result
      ? `✅ ${ruleName} applied successfully!`
      : `ℹ️ ${ruleName}: No matches found`
  }
}

/**
 * Apply spider fusion rule
 * Fuses adjacent spiders of the same color
 */
export function simplifySpiders(graph: ZXGraph): SimplificationResult {
  return applyRule(graph, 'Spider Fusion', () => graph.full_spider_fusion() > 0)
}

/**
 * Apply identity removal rule
 * Removes identity spiders (phase = 0, degree = 2)
 */
export function simplifyIdentities(graph: ZXGraph): SimplificationResult {
  return applyRule(graph, 'Identity Removal', () => graph.id_simp())
}

/**
 * Apply local complementation rule
 * Performs local complementation around a vertex
 */
export function simplifyLocalComp(graph: ZXGraph): SimplificationResult {
  return applyRule(graph, 'Local Complementation', () => graph.lcomp())
}

/**
 * Apply pivot rule
 * Performs pivot operation on a pair of vertices
 */
export function simplifyPivots(graph: ZXGraph): SimplificationResult {
  return applyRule(graph, 'Pivot', () => graph.pivot())
}

/**
 * Apply Clifford simplification
 * Applies all Clifford-preserving simplification rules
 */
export function simplifyClifford(graph: ZXGraph): SimplificationResult {
  const startVertices = graph.num_vertices()
  const startEdges = graph.num_edges()

  const result = graph.clifford_simp()

  const endVertices = graph.num_vertices()
  const endEdges = graph.num_edges()
  const vertexReduction = startVertices - endVertices
  const edgeReduction = startEdges - endEdges

  return {
    applied: result,
    message: result
      ? `✅ Clifford simplification complete!\nVertices: ${startVertices} → ${endVertices} (-${vertexReduction})\nEdges: ${startEdges} → ${endEdges} (-${edgeReduction})`
      : `ℹ️ Graph is already fully simplified!`,
    vertexReduction,
    edgeReduction
  }
}

/**
 * Apply full simplification
 * Applies all available simplification rules exhaustively
 */
export function applyFullSimplification(graph: ZXGraph): SimplificationResult {
  const startVertices = graph.num_vertices()
  const startEdges = graph.num_edges()

  const result = graph.simplify_full()

  const endVertices = graph.num_vertices()
  const endEdges = graph.num_edges()
  const vertexReduction = startVertices - endVertices
  const edgeReduction = startEdges - endEdges

  return {
    applied: result,
    message: result
      ? `✅ Full simplification complete!\nVertices: ${startVertices} → ${endVertices} (-${vertexReduction})\nEdges: ${startEdges} → ${endEdges} (-${edgeReduction})`
      : `ℹ️ Graph is already fully simplified!`,
    vertexReduction,
    edgeReduction
  }
}
