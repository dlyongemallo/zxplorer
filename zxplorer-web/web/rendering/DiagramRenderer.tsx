/**
 * SVG rendering for ZX-diagrams
 * Web-specific rendering using SVG
 *
 * Note: This is a placeholder module for Commit 6d.
 * Full implementation will be added in Commit 6g (integration).
 *
 * This module will contain:
 * - Grid rendering
 * - Edge rendering (simple and Hadamard, curved paths, self-loops)
 * - Vertex rendering (circles for Z/X, squares for H, small for boundary)
 * - Selection indicators
 * - Edge drag preview
 * - Box selection rectangle
 * - Phase labels
 */

import React from 'react'
import { Vertex, Edge } from '../../core/types/ZXGraphTypes'
import { getVertexColor, getVertexSelectedColor, getVertexStrokeColor, formatPhaseWithPi } from '../../core/utils/ColorUtils'
import { createCurvedPath, getPointOnCurve, SCALE } from '../../core/utils/GeometryUtils'

/**
 * Props for DiagramRenderer component
 */
export interface DiagramRendererProps {
  // Graph data
  vertices: Vertex[]
  edges: Edge[]

  // Selection state
  selectedVertices: Set<number>
  selectedEdges: Set<string>

  // View state
  zoom: number
  panOffset: { x: number; y: number }
  showGrid: boolean
  gridSize: number

  // Interaction state
  isPanning: boolean
  draggingVertex: number | null
  edgeDragStart: number | null
  edgeDragPos: { x: number; y: number } | null
  selectedEdgeType: number
  isBoxSelecting: boolean
  boxStart: { x: number; y: number } | null
  boxEnd: { x: number; y: number } | null

  // Event handlers (will be implemented in integration commit)
  onCanvasClick?: (e: React.MouseEvent<SVGSVGElement>) => void
  onCanvasContextMenu?: (e: React.MouseEvent<SVGSVGElement>) => void
  onVertexClick?: (e: React.MouseEvent, vertexId: number) => void
  onVertexDoubleClick?: (e: React.MouseEvent, vertex: Vertex) => void
  onVertexContextMenu?: (e: React.MouseEvent, vertex: Vertex) => void
  onVertexMouseDown?: (e: React.MouseEvent, vertex: Vertex) => void
  onEdgeClick?: (e: React.MouseEvent, edge: Edge) => void
  onEdgeContextMenu?: (e: React.MouseEvent, edge: Edge) => void
  onEdgeSelectionMouseDown?: (e: React.MouseEvent, edge: Edge) => void
  onMouseDown?: (e: React.MouseEvent<SVGSVGElement>) => void
  onMouseMove?: (e: React.MouseEvent<SVGSVGElement>) => void
  onMouseUp?: (e: React.MouseEvent<SVGSVGElement>) => void
  onWheel?: (e: React.WheelEvent<SVGSVGElement>) => void

  // SVG ref (for coordinate transforms)
  canvasRef?: React.RefObject<SVGSVGElement>
}

/**
 * Get edge ID for selection tracking
 */
function getEdgeId(edge: Edge): string {
  return `${edge.source}-${edge.target}`
}

/**
 * DiagramRenderer component
 * Renders ZX-diagram as SVG with pan/zoom support
 *
 * This is a placeholder - full implementation in Commit 6g
 */
export const DiagramRenderer: React.FC<DiagramRendererProps> = (props) => {
  const {
    vertices,
    edges,
    selectedVertices,
    selectedEdges,
    zoom,
    panOffset,
    showGrid,
    gridSize,
    isPanning,
    draggingVertex,
    edgeDragStart,
    edgeDragPos,
    selectedEdgeType,
    isBoxSelecting,
    boxStart,
    boxEnd,
    canvasRef,
    onCanvasClick,
    onCanvasContextMenu,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onWheel,
    onVertexClick,
    onVertexDoubleClick,
    onVertexContextMenu,
    onVertexMouseDown,
    onEdgeClick,
    onEdgeContextMenu,
    onEdgeSelectionMouseDown,
  } = props

  // Cursor style based on interaction state
  const cursor = isPanning ? 'grabbing' : (draggingVertex ? 'grabbing' : 'crosshair')

  return (
    <svg
      ref={canvasRef}
      viewBox="0 0 700 650"
      preserveAspectRatio="xMidYMid meet"
      style={{
        border: '2px solid #ddd',
        background: '#ffffff',
        borderRadius: '8px',
        cursor,
        width: '100%',
        height: '100%',
        maxWidth: '100%',
        maxHeight: '100%',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none'
      }}
      onClick={onCanvasClick}
      onContextMenu={onCanvasContextMenu}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onWheel={onWheel}
    >
      {/* Main transform group for pan/zoom */}
      <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`}>
        {/* Placeholder for grid - will be implemented in 6g */}
        {showGrid && (
          <g opacity="0.5">
            {/* Grid rendering will be added in Commit 6g */}
          </g>
        )}

        {/* Placeholder for edges - will be implemented in 6g */}
        {edges.map((edge, idx) => {
          const sourceVertex = vertices.find((v) => v.id === edge.source)
          const targetVertex = vertices.find((v) => v.id === edge.target)
          if (!sourceVertex || !targetVertex) return null

          // Edge rendering will be fully implemented in Commit 6g
          return <g key={`edge-${idx}`} />
        })}

        {/* Placeholder for edge drag preview - will be implemented in 6g */}
        {edgeDragStart !== null && edgeDragPos !== null && (
          <g>{/* Edge drag preview will be added in Commit 6g */}</g>
        )}

        {/* Placeholder for vertices - will be implemented in 6g */}
        {vertices.map((vertex) => {
          // Vertex rendering will be fully implemented in Commit 6g
          return <g key={`vertex-${vertex.id}`} />
        })}
      </g>

      {/* Placeholder for box selection - will be implemented in 6g */}
      {isBoxSelecting && boxStart && boxEnd && (
        <g>{/* Box selection will be added in Commit 6g */}</g>
      )}
    </svg>
  )
}
