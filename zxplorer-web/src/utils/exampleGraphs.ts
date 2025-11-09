import { ZXGraph } from 'quizx-wasm'

/**
 * Create the default example graph from ZXLive.
 * Copied from: https://github.com/zxcalc/zxlive/blob/master/zxlive/construct.py
 */
export function createExampleGraph(): ZXGraph {
  const g = new ZXGraph()

  const qubits = 4

  const vlist = [
    [0, 0, 1], [1, 1, 2], [2, 2, 1], [3, 3, 1],
    [4, 0, 1], [5, 1, 1], [6, 2, 2], [7, 3, 1],
    [8, 0, 1], [9, 1, 2], [10, 2, 1], [11, 3, 1],
    [12, 0, 2], [13, 1, 2], [14, 2, 1], [15, 3, 2],
  ]

  const elist = [
    [0, 1, 0], [0, 4, 0], [1, 5, 0], [1, 6, 0],
    [2, 6, 0], [3, 7, 0], [4, 8, 0], [5, 9, 1],
    [6, 10, 0], [7, 11, 0], [8, 12, 0], [8, 13, 0],
    [9, 13, 1], [9, 14, 1], [10, 13, 0], [10, 14, 0],
    [11, 14, 0], [11, 15, 0],
  ]

  const vertexIds: number[] = []

  const curRow = Array(qubits).fill(1.0)

  for (let i = 0; i < qubits; i++) {
    const v = g.add_vertex_with_position(0, curRow[i], i)
    curRow[i] += 1.0
    vertexIds.push(v)
  }

  for (const [, qu, vtype] of vlist) {
    const v = g.add_vertex_with_position(vtype, curRow[qu], qu)
    curRow[qu] += 1.0
    vertexIds.push(v)
  }

  for (let i = 0; i < qubits; i++) {
    const v = g.add_vertex_with_position(0, curRow[i], i)
    vertexIds.push(v)
  }

  for (const [id1, id2, etype] of elist) {
    const v1 = vertexIds[id1 + qubits]
    const v2 = vertexIds[id2 + qubits]
    g.add_edge_with_type(v1, v2, etype)
  }

  for (let i = 0; i < qubits; i++) {
    g.add_edge_with_type(vertexIds[i], vertexIds[i + qubits], 0)
  }

  for (let i = 0; i < qubits; i++) {
    const outputIdx = vertexIds.length - qubits + i
    const lastInternalIdx = outputIdx - qubits
    g.add_edge_with_type(vertexIds[lastInternalIdx], vertexIds[outputIdx], 0)
  }

  return g
}
