import { useState, useEffect, useRef } from 'react'
import { ZXGraph } from 'quizx-wasm'
import './ZXDiagram.css'
import { VertexType, ToolType, Vertex, Edge, ClipboardData } from '../../core/types/ZXGraphTypes'
import { createExampleGraph } from '../../src/utils/exampleGraphs'

const ZXDiagram = () => {
  const [graph, setGraph] = useState<ZXGraph | null>(null)
  const [vertices, setVertices] = useState<Vertex[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const canvasRef = useRef<SVGSVGElement>(null)

  // Tool state (ZXLive-style)
  const [currentTool, setCurrentTool] = useState<ToolType>(ToolType.SELECT)

  // Interactive editing state
  const [selectedVertexType, setSelectedVertexType] = useState<VertexType>(VertexType.Z)
  const [selectedEdgeType, setSelectedEdgeType] = useState<number>(0) // 0 = Simple, 1 = Hadamard
  const [selectedVertices, setSelectedVertices] = useState<Set<number>>(new Set())
  const selectedVerticesRef = useRef<Set<number>>(new Set()) // Ref for immediate access
  const [draggingVertex, setDraggingVertex] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Edge creation state (for drag-to-connect)
  const [edgeDragStart, setEdgeDragStart] = useState<number | null>(null) // Source vertex ID
  const [edgeDragPos, setEdgeDragPos] = useState<{ x: number; y: number } | null>(null) // Current mouse pos

  // Pan/Zoom state
  const [zoom, setZoom] = useState<number>(1.0)
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState<boolean>(false)
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [showGrid, setShowGrid] = useState<boolean>(true)
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true)
  const gridSize = 0.5 // Grid spacing in graph units

  // Undo/Redo state
  const [undoStack, setUndoStack] = useState<string[]>([])
  const [redoStack, setRedoStack] = useState<string[]>([])
  const maxHistorySize = 50  // Limit history to prevent memory issues

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Phase editing state
  const [editingPhase, setEditingPhase] = useState<{ vertexId: number; currentPhase: string } | null>(null)
  const [phaseInput, setPhaseInput] = useState<string>('')

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; vertex: Vertex } | null>(null)

  // Edge selection and context menu state
  const [selectedEdges, setSelectedEdges] = useState<Set<string>>(new Set())
  const [edgeContextMenu, setEdgeContextMenu] = useState<{ x: number; y: number; edge: Edge } | null>(null)

  // Edge curvature dragging state
  const [draggingEdgeCurve, setDraggingEdgeCurve] = useState<string | null>(null) // edge ID being curve-dragged
  const [edgeCurveDragStart, setEdgeCurveDragStart] = useState<{ x: number; y: number } | null>(null)

  // Pending vertex placement (for right-click on canvas - only place if no drag)
  const [pendingVertexPlacement, setPendingVertexPlacement] = useState<{ x: number; y: number } | null>(null)

  // Box selection state
  const [isBoxSelecting, setIsBoxSelecting] = useState<boolean>(false)
  const [boxStart, setBoxStart] = useState<{ x: number; y: number } | null>(null)
  const [boxEnd, setBoxEnd] = useState<{ x: number; y: number } | null>(null)

  // Track if mouse has moved (to prevent unwanted clicks after pan/drag)
  const [hasMouseMoved, setHasMouseMoved] = useState<boolean>(false)

  // Clipboard for copy/paste
  const [, setClipboard] = useState<ClipboardData | null>(null)
  const clipboardRef = useRef<ClipboardData | null>(null) // Ref for immediate access
  const pasteCountRef = useRef<number>(0) // Track number of pastes from current clipboard

  // Help modal state
  const [showHelp, setShowHelp] = useState<boolean>(false)

  useEffect(() => {
    // Guard against React StrictMode double-mounting in development
    if (graph) return

    try {
      // Create default example graph (ZXLive default)
      console.log('Creating example graph...')
      const g = createExampleGraph()
      console.log('Example graph created:', g)
      setGraph(g)
      updateGraphData(g)
    } catch (err) {
      console.error('Error creating graph:', err)
    }
  }, [graph])

  // Add native wheel event listener to prevent page scroll during zoom
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleNativeWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
      }
    }

    canvas.addEventListener('wheel', handleNativeWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleNativeWheel)
  }, [])

  const updateGraphData = (g: ZXGraph) => {
    try {
      const verticesJson = g.get_vertices_json()
      const edgesJson = g.get_edges_json()
      const verticesData = JSON.parse(verticesJson) as Vertex[]
      const edgesData = JSON.parse(edgesJson) as Edge[]

      // Group edges by vertex pairs (treating as undirected)
      // This ensures parallel edges between the same vertices get spaced out
      const edgeGroups = new Map<string, Edge[]>()
      edgesData.forEach(e => {
        // Normalize edge key so (s,t) and (t,s) are treated as the same pair
        const key = e.source < e.target ? `${e.source}-${e.target}` : `${e.target}-${e.source}`
        if (!edgeGroups.has(key)) {
          edgeGroups.set(key, [])
        }
        edgeGroups.get(key)!.push(e)
      })

      // Apply ZXLive's parallel edge spacing algorithm
      // Formula: curve_distance = (n - midpoint_index) * 0.5
      // This centers parallel edges symmetrically around the straight line
      const mergedEdges: Edge[] = []
      edgeGroups.forEach(groupEdges => {
        const midpointIndex = 0.5 * (groupEdges.length - 1)
        groupEdges.forEach((e, n) => {
          mergedEdges.push({
            ...e,
            curve_distance: (n - midpointIndex) * 0.5
          })
        })
      })

      setVertices(verticesData)
      setEdges(mergedEdges)
      console.log(`Updated graph: ${verticesData.length} vertices, ${mergedEdges.length} edges`)
    } catch (err) {
      console.error('Error updating graph data:', err)
    }
  }

  // Helper: update selected vertices (both state and ref for immediate access)
  const updateSelectedVertices = (newSelection: Set<number>) => {
    selectedVerticesRef.current = newSelection
    setSelectedVertices(newSelection)
  }

  // Helper: snap to grid
  const snapValue = (value: number): number => {
    if (!snapToGrid) return value
    return Math.round(value / gridSize) * gridSize
  }

  // Helper: convert screen coordinates to graph coordinates
  // ZXLive convention: row (time) is horizontal (x), col (qubit) is vertical (y)
  const screenToGraph = (screenX: number, screenY: number): { row: number; col: number } => {
    if (!canvasRef.current) return { row: 0, col: 0 }
    const svg = canvasRef.current
    const pt = svg.createSVGPoint()
    pt.x = screenX
    pt.y = screenY
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse())

    // Apply inverse pan and zoom transformations
    // Swap: row maps to x (horizontal), col maps to y (vertical)
    const row = ((svgP.x - panOffset.x) / zoom - 100) / scale
    const col = ((svgP.y - panOffset.y) / zoom - 50) / scale

    return { row: snapValue(row), col: snapValue(col) }
  }

  // Helper: convert graph coordinates to screen coordinates (unused for now)
  // ZXLive convention: row (time) is horizontal (x), col (qubit) is vertical (y)
  // const _graphToScreen = (row: number, col: number): { x: number; y: number } => {
  //   const x = (row * scale + 100) * zoom + panOffset.x
  //   const y = (col * scale + 50) * zoom + panOffset.y
  //   return { x, y }
  // }

  // Zoom controls
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5.0))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.2))
  }

  const handleZoomReset = () => {
    setZoom(1.0)
    setPanOffset({ x: 0, y: 0 })
  }

  // Save current graph state to undo stack
  const saveState = () => {
    if (!graph) return

    const state = graph.to_json()
    setUndoStack(prev => {
      const newStack = [...prev, state]
      // Limit stack size
      if (newStack.length > maxHistorySize) {
        return newStack.slice(1)
      }
      return newStack
    })
    // Clear redo stack when new action is performed
    setRedoStack([])
  }

  // Undo last action
  const undo = () => {
    if (undoStack.length === 0) return

    const currentState = graph?.to_json()
    if (!currentState) return

    const previousState = undoStack[undoStack.length - 1]

    try {
      const restoredGraph = ZXGraph.from_json(previousState)
      setGraph(restoredGraph)
      updateGraphData(restoredGraph)

      // Move current state to redo stack
      setRedoStack(prev => [...prev, currentState])
      // Remove last state from undo stack
      setUndoStack(prev => prev.slice(0, -1))

      updateSelectedVertices(new Set())
    } catch (err) {
      console.error('Error during undo:', err)
      alert('Failed to undo: ' + err)
    }
  }

  // Redo last undone action
  const redo = () => {
    if (redoStack.length === 0) return

    const currentState = graph?.to_json()
    if (!currentState) return

    const nextState = redoStack[redoStack.length - 1]

    try {
      const restoredGraph = ZXGraph.from_json(nextState)
      setGraph(restoredGraph)
      updateGraphData(restoredGraph)

      // Move current state to undo stack
      setUndoStack(prev => [...prev, currentState])
      // Remove last state from redo stack
      setRedoStack(prev => prev.slice(0, -1))

      updateSelectedVertices(new Set())
    } catch (err) {
      console.error('Error during redo:', err)
      alert('Failed to redo: ' + err)
    }
  }

  // Unused helper functions (kept for potential future use)
  // const _addVertex = (type: VertexType) => {
  //   if (!graph) return
  //   const row = Math.random() * 4
  //   const col = Math.random() * 4
  //   graph.add_vertex_with_position(type, row, col)
  //   updateGraphData(graph)
  // }

  // const _applySimplification = () => {
  //   if (!graph) return
  //   const fusionCount = graph.full_spider_fusion()
  //   console.log(`Applied ${fusionCount} spider fusions`)
  //   updateGraphData(graph)
  //   if (fusionCount > 0) {
  //     alert(`✅ Simplified! Applied ${fusionCount} spider fusion${fusionCount > 1 ? 's' : ''}`)
  //   } else {
  //     alert('ℹ️ Graph is already fully simplified!')
  //   }
  // }

  const applyRule = (ruleName: string, ruleFunc: () => boolean) => {
    if (!graph) return

    // Save state before applying rule
    saveState()

    const result = ruleFunc()
    updateGraphData(graph)

    if (result) {
      alert(`✅ ${ruleName} applied successfully!`)
    } else {
      alert(`ℹ️ ${ruleName}: No matches found`)
    }
  }

  const applyFullSimplification = () => {
    if (!graph) return

    // Save state before simplification
    saveState()

    const startVertices = graph.num_vertices()
    const startEdges = graph.num_edges()

    const result = graph.simplify_full()
    updateGraphData(graph)

    const endVertices = graph.num_vertices()
    const endEdges = graph.num_edges()

    if (result) {
      const vertexReduction = startVertices - endVertices
      const edgeReduction = startEdges - endEdges
      alert(`✅ Full simplification complete!\nVertices: ${startVertices} → ${endVertices} (-${vertexReduction})\nEdges: ${startEdges} → ${endEdges} (-${edgeReduction})`)
    } else {
      alert('ℹ️ Graph is already fully simplified!')
    }
  }

  // Interactive editing handlers
  const handleCanvasClick = (_e: React.MouseEvent<SVGSVGElement>) => {
    // Clear selections when clicking on empty canvas
    if (!graph || isPanning || hasMouseMoved) return

    updateSelectedVertices(new Set())
    setSelectedEdges(new Set())
  }

  const handleCanvasContextMenu = (e: React.MouseEvent<SVGSVGElement>) => {
    e.preventDefault()
    e.stopPropagation()

    // Don't set pending vertex if we're already dragging something
    if (!graph || isPanning || edgeDragStart !== null || draggingVertex !== null) return

    // Only prepare vertex placement in SELECT and VERTEX modes
    if (currentTool === ToolType.SELECT || currentTool === ToolType.VERTEX) {
      const { row, col } = screenToGraph(e.clientX, e.clientY)
      setPendingVertexPlacement({ x: row, y: col })
    }
  }

  const handleVertexClick = (e: React.MouseEvent, vertexId: number) => {
    e.stopPropagation()

    // In SELECT mode, only handle left-click for selection
    // (Right-click in SELECT mode adds vertex via context menu, not handled here)
    if (currentTool === ToolType.SELECT && e.button === 0) {
      if (e.shiftKey) {
        // Toggle selection - add or remove from current selection
        const newSelected = new Set(selectedVerticesRef.current)
        if (newSelected.has(vertexId)) {
          newSelected.delete(vertexId)
        } else {
          newSelected.add(vertexId)
        }
        updateSelectedVertices(newSelected)
        // Keep edge selection when using Shift
      } else {
        // Replace selection - select only this vertex
        updateSelectedVertices(new Set([vertexId]))
        // Clear edge selection when replacing
        setSelectedEdges(new Set())
      }
    }

    // In VERTEX and EDGE modes, clicks on vertices do nothing (handled in mouseDown/mouseUp)
  }

  const handleVertexDoubleClick = (e: React.MouseEvent, vertex: Vertex) => {
    e.stopPropagation()
    // Don't allow phase editing for boundary vertices
    if (vertex.vertex_type === VertexType.Boundary) return

    setEditingPhase({ vertexId: vertex.id, currentPhase: vertex.phase })
    setPhaseInput(vertex.phase)
  }

  const handlePhasePreset = (preset: string) => {
    setPhaseInput(preset)
  }

  const handlePhaseSubmit = () => {
    if (!graph || !editingPhase) return

    try {
      // Save state before modifying
      saveState()

      // Set the phase
      graph.set_vertex_phase(editingPhase.vertexId, phaseInput)
      updateGraphData(graph)

      setEditingPhase(null)
      setPhaseInput('')
    } catch (err) {
      alert(`Failed to set phase: ${err}`)
    }
  }

  const handlePhaseCancel = () => {
    setEditingPhase(null)
    setPhaseInput('')
  }

  const handleVertexContextMenu = (e: React.MouseEvent, vertex: Vertex) => {
    e.preventDefault()
    e.stopPropagation()

    // Don't show context menu if we're in the middle of an edge drag
    if (edgeDragStart !== null) {
      return
    }

    // In SELECT and EDGE modes, right-click on vertex is for edge creation, not context menu
    if (currentTool === ToolType.SELECT || currentTool === ToolType.EDGE) {
      return
    }

    // Don't show context menu for boundary vertices
    if (vertex.vertex_type === VertexType.Boundary) return

    // Only show context menu in VERTEX mode (for converting vertex types)
    setContextMenu({ x: e.clientX, y: e.clientY, vertex })
  }

  const handleConvertVertexType = (newType: VertexType) => {
    if (!graph || !contextMenu) return

    try {
      saveState()
      graph.set_vertex_type(contextMenu.vertex.id, newType)
      updateGraphData(graph)
      setContextMenu(null)
    } catch (err) {
      alert(`Failed to convert vertex type: ${err}`)
    }
  }

  const handleCloseContextMenu = () => {
    setContextMenu(null)
  }

  // Edge selection and context menu handlers
  const getEdgeId = (edge: Edge): string => {
    return `${edge.source}-${edge.target}`
  }

  const handleEdgeClick = (e: React.MouseEvent, edge: Edge) => {
    e.stopPropagation()
    const edgeId = getEdgeId(edge)

    if (e.shiftKey) {
      // Toggle selection - add or remove from current selection
      setSelectedEdges(prev => {
        const newSelected = new Set(prev)
        if (newSelected.has(edgeId)) {
          newSelected.delete(edgeId)
        } else {
          newSelected.add(edgeId)
        }
        return newSelected
      })
      // Keep vertex selection when using Shift
    } else {
      // Replace selection
      setSelectedEdges(new Set([edgeId]))
      // Clear vertex selection when replacing
      updateSelectedVertices(new Set())
    }
  }

  const handleEdgeContextMenu = (e: React.MouseEvent, edge: Edge) => {
    e.preventDefault()
    e.stopPropagation()

    setEdgeContextMenu({ x: e.clientX, y: e.clientY, edge })

    // Select the edge if not already selected
    const edgeId = getEdgeId(edge)
    if (!selectedEdges.has(edgeId)) {
      setSelectedEdges(new Set([edgeId]))
    }
  }

  const handleToggleEdgeType = () => {
    if (!graph || !edgeContextMenu) return

    try {
      saveState()
      const edge = edgeContextMenu.edge
      // Toggle between Simple (0) and Hadamard (1)
      const newType = edge.edge_type === 0 ? 1 : 0
      graph.set_edge_type(edge.source, edge.target, newType)
      updateGraphData(graph)
      setEdgeContextMenu(null)
    } catch (err) {
      alert(`Failed to toggle edge type: ${err}`)
    }
  }

  const handleCloseEdgeContextMenu = () => {
    setEdgeContextMenu(null)
  }

  // Edge curvature dragging handlers
  const handleEdgeSelectionMouseDown = (e: React.MouseEvent, edge: Edge) => {
    e.stopPropagation()
    e.preventDefault()

    const edgeId = getEdgeId(edge)
    setDraggingEdgeCurve(edgeId)
    setEdgeCurveDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleEdgeSelectionMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingEdgeCurve || !edgeCurveDragStart) return

    // Find the edge being dragged
    const edge = edges.find(e => getEdgeId(e) === draggingEdgeCurve)
    if (!edge) return

    const sourceVertex = vertices.find(v => v.id === edge.source)
    const targetVertex = vertices.find(v => v.id === edge.target)
    if (!sourceVertex || !targetVertex) return

    // Calculate perpendicular movement
    const x1 = sourceVertex.row * scale + 100
    const y1 = sourceVertex.col * scale + 50
    const x2 = targetVertex.row * scale + 100
    const y2 = targetVertex.col * scale + 50

    const perp = computePerpendicular(x1, y1, x2, y2)
    const dx = e.clientX - edgeCurveDragStart.x
    const dy = e.clientY - edgeCurveDragStart.y

    // Dot product to get perpendicular distance
    const perpDistance = (dx * perp.x + dy * perp.y) / scale

    // Update the edge's curve_distance
    setEdges(prevEdges => prevEdges.map(e => {
      if (getEdgeId(e) === draggingEdgeCurve) {
        const currentCurve = e.curve_distance || 0
        return { ...e, curve_distance: currentCurve + perpDistance * 2 }
      }
      return e
    }))

    // Update drag start for next movement
    setEdgeCurveDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleEdgeSelectionMouseUp = () => {
    if (draggingEdgeCurve) {
      // Could save to undo history here if needed
      setDraggingEdgeCurve(null)
      setEdgeCurveDragStart(null)
    }
  }

  const handleVertexMouseDown = (e: React.MouseEvent, vertex: Vertex) => {
    e.stopPropagation()
    if (!canvasRef.current) return

    // Don't allow any interaction while panning (middle mouse or Ctrl+left)
    if (e.button === 1 || (e.button === 0 && (e.ctrlKey || e.metaKey))) {
      return
    }

    // SELECT mode behavior
    if (currentTool === ToolType.SELECT) {
      if (e.button === 2) {
        // Right-drag: start edge creation
        e.preventDefault()
        setPendingVertexPlacement(null) // Clear any pending vertex placement
        setEdgeDragStart(vertex.id)
        const { row, col } = screenToGraph(e.clientX, e.clientY)
        setEdgeDragPos({ x: row, y: col })
      } else if (e.button === 0) {
        // Left-drag: start vertex drag (selection happens in onClick)
        setDraggingVertex(vertex.id)
        const { row, col } = screenToGraph(e.clientX, e.clientY)
        setDragOffset({ x: col - vertex.col, y: row - vertex.row })
      }
      return
    }

    // VERTEX mode behavior
    if (currentTool === ToolType.VERTEX) {
      if (e.button === 0) {
        // Left-drag: start vertex drag (just like SELECT mode)
        setDraggingVertex(vertex.id)
        const { row, col } = screenToGraph(e.clientX, e.clientY)
        setDragOffset({ x: col - vertex.col, y: row - vertex.row })
      }
      // Right-drag: do nothing (ignored)
      return
    }

    // EDGE mode behavior
    if (currentTool === ToolType.EDGE) {
      // Both left-drag and right-drag: start edge creation
      if (e.button === 0 || e.button === 2) {
        e.preventDefault()
        setPendingVertexPlacement(null) // Clear any pending vertex placement
        setEdgeDragStart(vertex.id)
        const { row, col } = screenToGraph(e.clientX, e.clientY)
        setEdgeDragPos({ x: row, y: col })
      }
      return
    }
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!graph) return

    // Track mouse movement for any active drag operation or pending vertex placement
    if (isPanning || draggingVertex !== null || isBoxSelecting || edgeDragStart !== null || draggingEdgeCurve !== null || pendingVertexPlacement !== null) {
      setHasMouseMoved(true)
    }

    // Handle edge curvature dragging
    if (draggingEdgeCurve !== null) {
      handleEdgeSelectionMouseMove(e)
      return
    }

    // Handle edge drag preview
    if (edgeDragStart !== null) {
      const { row, col } = screenToGraph(e.clientX, e.clientY)
      setEdgeDragPos({ x: row, y: col })
      return
    }

    // Handle panning
    if (isPanning && canvasRef.current) {
      const svg = canvasRef.current
      const rect = svg.getBoundingClientRect()

      // Calculate SVG to screen scale factors
      const scaleX = 700 / rect.width  // viewBox width / actual width
      const scaleY = 650 / rect.height // viewBox height / actual height

      const dx = (e.clientX - panStart.x) * scaleX
      const dy = (e.clientY - panStart.y) * scaleY

      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }))
      setPanStart({ x: e.clientX, y: e.clientY })
      return
    }

    // Handle box selection
    if (isBoxSelecting && boxStart) {
      setBoxEnd({ x: e.clientX, y: e.clientY })
      return
    }

    // Handle vertex dragging
    if (draggingVertex !== null) {
      const { row, col } = screenToGraph(e.clientX, e.clientY)

      // Apply offset
      const newRow = row - dragOffset.y
      const newCol = col - dragOffset.x

      // Update vertex position
      const vertex = vertices.find(v => v.id === draggingVertex)
      if (vertex) {
        vertex.row = newRow
        vertex.col = newCol
        setVertices([...vertices])
      }
    }
  }

  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    // Handle edge drag completion
    if (edgeDragStart !== null) {
      // Check if mouse is over a vertex
      const { row, col } = screenToGraph(e.clientX, e.clientY)
      const targetVertex = vertices.find(v => {
        const distance = Math.sqrt(Math.pow(v.row - row, 2) + Math.pow(v.col - col, 2))
        return distance < 0.3 // Within 0.3 units of vertex center
      })

      if (targetVertex && targetVertex.id !== edgeDragStart && graph) {
        // Create edge between source and target
        saveState()
        graph.add_edge_with_type(edgeDragStart, targetVertex.id, selectedEdgeType)
        updateGraphData(graph)
      }

      // Clear edge drag state
      setEdgeDragStart(null)
      setEdgeDragPos(null)
      setPendingVertexPlacement(null) // Clear any pending vertex placement
      return
    }

    // Handle pending vertex placement from right-click (SELECT or VERTEX mode)
    // Only place vertex if there was no dragging
    if (pendingVertexPlacement && !hasMouseMoved && graph && !isPanning) {
      const { x: row, y: col } = pendingVertexPlacement

      // Check if we clicked on a vertex (if so, don't add a new one)
      const clickedOnVertex = vertices.some(v => {
        const distance = Math.sqrt(Math.pow(v.row - row, 2) + Math.pow(v.col - col, 2))
        return distance < 0.3
      })

      if (!clickedOnVertex) {
        // Save state before adding vertex
        saveState()

        // Clear all selections when adding a new vertex
        updateSelectedVertices(new Set())
        setSelectedEdges(new Set())

        // Add vertex at clicked position
        graph.add_vertex_with_position(selectedVertexType, row, col)
        updateGraphData(graph)
      }

      // Clear pending vertex placement
      setPendingVertexPlacement(null)
    }

    // In VERTEX mode, left-click without drag adds a vertex
    if (currentTool === ToolType.VERTEX && e.button === 0 && !hasMouseMoved && graph && !isPanning) {
      const { row, col } = screenToGraph(e.clientX, e.clientY)

      // Check if we clicked on a vertex (if so, don't add a new one)
      const clickedOnVertex = vertices.some(v => {
        const distance = Math.sqrt(Math.pow(v.row - row, 2) + Math.pow(v.col - col, 2))
        return distance < 0.3
      })

      if (!clickedOnVertex) {
        // Save state before adding vertex
        saveState()

        // Clear all selections when adding a new vertex
        updateSelectedVertices(new Set())
        setSelectedEdges(new Set())

        // Add vertex at clicked position
        graph.add_vertex_with_position(selectedVertexType, row, col)
        updateGraphData(graph)
      }
    }

    // Handle box selection
    if (isBoxSelecting && boxStart && boxEnd && canvasRef.current) {
      const svg = canvasRef.current

      // Get selection box in SVG coordinates
      const pt1 = svg.createSVGPoint()
      pt1.x = Math.min(boxStart.x, boxEnd.x)
      pt1.y = Math.min(boxStart.y, boxEnd.y)
      const svgP1 = pt1.matrixTransform(svg.getScreenCTM()?.inverse())

      const pt2 = svg.createSVGPoint()
      pt2.x = Math.max(boxStart.x, boxEnd.x)
      pt2.y = Math.max(boxStart.y, boxEnd.y)
      const svgP2 = pt2.matrixTransform(svg.getScreenCTM()?.inverse())

      // Convert to graph coordinates
      const minRow = ((svgP1.x - panOffset.x) / zoom - 100) / scale
      const minCol = ((svgP1.y - panOffset.y) / zoom - 50) / scale
      const maxRow = ((svgP2.x - panOffset.x) / zoom - 100) / scale
      const maxCol = ((svgP2.y - panOffset.y) / zoom - 50) / scale

      // Select all vertices within the box
      const boxedVertices = new Set<number>()
      vertices.forEach(vertex => {
        if (vertex.row >= minRow && vertex.row <= maxRow &&
            vertex.col >= minCol && vertex.col <= maxCol) {
          boxedVertices.add(vertex.id)
        }
      })

      if (e.shiftKey) {
        // Toggle selection - add if not selected, remove if already selected
        const newSelection = new Set(selectedVerticesRef.current)
        boxedVertices.forEach(id => {
          if (newSelection.has(id)) {
            newSelection.delete(id)
          } else {
            newSelection.add(id)
          }
        })
        updateSelectedVertices(newSelection)
        // Keep edge selection when using Shift
      } else {
        // Replace selection
        updateSelectedVertices(boxedVertices)
        // Clear edge selection when replacing
        if (boxedVertices.size > 0) {
          setSelectedEdges(new Set())
        }
      }

      setIsBoxSelecting(false)
      setBoxStart(null)
      setBoxEnd(null)
    }

    if (draggingVertex !== null && graph) {
      const vertex = vertices.find(v => v.id === draggingVertex)
      if (vertex) {
        // Update the position in the actual graph
        graph.set_vertex_position(vertex.id, vertex.row, vertex.col)
      }
    }
    setDraggingVertex(null)
    setIsPanning(false)

    // Clear pending vertex placement if not handled
    setPendingVertexPlacement(null)

    // Handle edge curvature drag end
    handleEdgeSelectionMouseUp()
  }

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    setHasMouseMoved(false)

    // Middle mouse button or Ctrl+Left click for panning
    if (e.button === 1 || (e.button === 0 && (e.ctrlKey || e.metaKey))) {
      e.preventDefault()
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
      return
    }

    // Left click (with or without Shift) - start box selection (only in SELECT mode)
    if (e.button === 0 && currentTool === ToolType.SELECT) {
      setIsBoxSelecting(true)
      setBoxStart({ x: e.clientX, y: e.clientY })
      setBoxEnd({ x: e.clientX, y: e.clientY })
    }
  }

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    // Only zoom when Ctrl (or Cmd on Mac) is pressed
    if (!e.ctrlKey && !e.metaKey) {
      // Allow normal scrolling
      return
    }

    // Prevent page scroll when zooming
    e.preventDefault()
    e.stopPropagation()

    // Get mouse position relative to SVG before zoom
    const { row: oldRow, col: oldCol } = screenToGraph(e.clientX, e.clientY)

    // Apply zoom
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9
    const newZoom = Math.max(0.2, Math.min(5.0, zoom * zoomFactor))

    // Adjust pan to keep the point under the mouse fixed
    if (canvasRef.current) {
      const svg = canvasRef.current
      const pt = svg.createSVGPoint()
      pt.x = e.clientX
      pt.y = e.clientY
      const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse())

      // Calculate new screen position of the same graph point
      // Remember: row maps to X (horizontal), col maps to Y (vertical)
      const newScreenX = (oldRow * scale + 100) * newZoom
      const newScreenY = (oldCol * scale + 50) * newZoom

      // Adjust pan offset to keep point under cursor
      setPanOffset({
        x: svgP.x - newScreenX,
        y: svgP.y - newScreenY
      })
    }

    setZoom(newZoom)
  }

  const handleDelete = () => {
    if (!graph || (selectedVertices.size === 0 && selectedEdges.size === 0)) return

    // Save state before deleting
    saveState()

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

    updateGraphData(graph)
    updateSelectedVertices(new Set())
    setSelectedEdges(new Set())
  }

  // Copy/Paste functionality
  const handleCopy = () => {
    // Use ref for immediate access to current selection (not stale state)
    const currentSelection = selectedVerticesRef.current
    if (!graph || currentSelection.size === 0) return

    // Get fresh data directly from the graph to avoid stale state issues
    const verticesJson = graph.get_vertices_json()
    const edgesJson = graph.get_edges_json()
    const currentVertices = JSON.parse(verticesJson) as Vertex[]
    const currentEdges = JSON.parse(edgesJson) as Edge[]

    // Get selected vertices using the ref
    const selectedVertexData = currentVertices.filter(v => currentSelection.has(v.id))

    // Get edges that connect two selected vertices (internal edges)
    const selectedEdgeData = currentEdges.filter(e =>
      currentSelection.has(e.source) && currentSelection.has(e.target)
    )

    const clipboardData = {
      vertices: selectedVertexData,
      edges: selectedEdgeData
    }

    // Update both state and ref for immediate access
    clipboardRef.current = clipboardData
    setClipboard(clipboardData)

    // Reset paste counter for new clipboard content
    pasteCountRef.current = 0

    console.log(`Copied ${selectedVertexData.length} vertices and ${selectedEdgeData.length} edges`)
  }

  const handlePaste = () => {
    // Use ref for immediate access to clipboard (not stale state)
    const currentClipboard = clipboardRef.current
    if (!graph || !currentClipboard || currentClipboard.vertices.length === 0) return

    // Clear current selection first (both state and ref)
    updateSelectedVertices(new Set())
    setSelectedEdges(new Set())

    // Save state before pasting
    saveState()

    // Create a mapping from old vertex IDs to new vertex IDs
    const idMap = new Map<number, number>()

    // Offset for pasted vertices - increments with each paste from same clipboard
    // This prevents multiple pastes from overlapping
    const baseOffset = 0.5
    const offset = baseOffset * (pasteCountRef.current + 1)

    // Create new vertices
    currentClipboard.vertices.forEach(v => {
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
    currentClipboard.edges.forEach(e => {
      const newSource = idMap.get(e.source)
      const newTarget = idMap.get(e.target)
      if (newSource !== undefined && newTarget !== undefined) {
        graph.add_edge_with_type(newSource, newTarget, e.edge_type)
      }
    })

    updateGraphData(graph)

    // Select the newly pasted vertices (both state and ref)
    updateSelectedVertices(new Set(idMap.values()))
    setSelectedEdges(new Set())

    // Increment paste counter so next paste has a different offset
    pasteCountRef.current += 1

    console.log(`Pasted ${currentClipboard.vertices.length} vertices and ${currentClipboard.edges.length} edges (paste #${pasteCountRef.current})`)
  }

  // Save/Load functionality
  const handleSave = () => {
    if (!graph) return

    const json = graph.to_json()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `zx-diagram-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleLoad = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string
        const loadedGraph = ZXGraph.from_json(json)

        // Save current state before loading
        if (graph) {
          saveState()
        }

        setGraph(loadedGraph)
        updateGraphData(loadedGraph)
        updateSelectedVertices(new Set())

        alert('✅ Diagram loaded successfully!')
      } catch (err) {
        console.error('Error loading diagram:', err)
        alert('❌ Failed to load diagram: ' + err)
      }
    }
    reader.readAsText(file)

    // Reset file input so the same file can be loaded again
    e.target.value = ''
  }

  const handleNew = () => {
    if (!graph) return

    const confirmed = window.confirm('Create a new diagram? Current diagram will be lost unless saved.')
    if (!confirmed) return

    // Save current state before clearing
    saveState()

    const newGraph = new ZXGraph()
    setGraph(newGraph)
    updateGraphData(newGraph)
    updateSelectedVertices(new Set())
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keyboard events when phase editor is open
      // (except Escape to close it)
      if (editingPhase && e.key !== 'Escape') {
        return
      }

      // Help: ? key
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setShowHelp(prev => !prev)
        return
      }

      // Escape: Close help, phase editor, or clear selections
      if (e.key === 'Escape') {
        e.preventDefault()
        if (editingPhase) {
          handlePhaseCancel()
        } else if (showHelp) {
          setShowHelp(false)
        } else {
          updateSelectedVertices(new Set())
          setSelectedEdges(new Set())
        }
        return
      }

      // Undo: Ctrl+Z (or Cmd+Z on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z (or Cmd+Y/Cmd+Shift+Z on Mac)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
        return
      }

      // Save: Ctrl+S (or Cmd+S on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
        return
      }

      // Copy: Ctrl+C (or Cmd+C on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault()
        handleCopy()
        return
      }

      // Paste: Ctrl+V (or Cmd+V on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault()
        handlePaste()
        return
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        handleDelete()
        return
      }

      // Tool shortcuts (only when no modifiers are pressed)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key.toLowerCase() === 's') {
          e.preventDefault()
          setCurrentTool(ToolType.SELECT)
          return
        }
        if (e.key.toLowerCase() === 'v') {
          e.preventDefault()
          setCurrentTool(ToolType.VERTEX)
          return
        }
        if (e.key.toLowerCase() === 'w') {
          e.preventDefault()
          setCurrentTool(ToolType.EDGE)
          return
        }
      }

      // Convert selected vertices with keyboard shortcuts
      if (selectedVertices.size > 0 && graph) {
        let targetType: VertexType | null = null

        if (e.key.toLowerCase() === 'z') {
          targetType = VertexType.Z
        } else if (e.key.toLowerCase() === 'x') {
          targetType = VertexType.X
        } else if (e.key.toLowerCase() === 'h') {
          targetType = VertexType.H
        }

        if (targetType !== null) {
          e.preventDefault()
          saveState()
          selectedVertices.forEach(vId => {
            const vertex = vertices.find(v => v.id === vId)
            // Don't convert boundary vertices
            if (vertex && vertex.vertex_type !== VertexType.Boundary) {
              try {
                graph.set_vertex_type(vId, targetType!)
              } catch (err) {
                console.error(`Failed to convert vertex ${vId}:`, err)
              }
            }
          })
          updateGraphData(graph)
        }
      }

      // Toggle edge type with 'E' key
      if (e.key.toLowerCase() === 'e' && selectedEdges.size > 0 && graph) {
        e.preventDefault()
        saveState()
        selectedEdges.forEach(edgeId => {
          const [sourceStr, targetStr] = edgeId.split('-')
          const source = parseInt(sourceStr)
          const target = parseInt(targetStr)
          const edge = edges.find(e => e.source === source && e.target === target)
          if (edge) {
            try {
              // Toggle between Simple (0) and Hadamard (1)
              const newType = edge.edge_type === 0 ? 1 : 0
              graph.set_edge_type(source, target, newType)
            } catch (err) {
              console.error(`Failed to toggle edge ${edgeId}:`, err)
            }
          }
        })
        updateGraphData(graph)
      }

      // Arrow keys: Move selected vertices or pan view
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()

        if (selectedVertices.size > 0 && graph) {
          // Move selected vertices
          saveState()

          // Determine movement amount (fine movement with Shift)
          const moveAmount = e.shiftKey ? gridSize * 0.1 : gridSize
          let deltaRow = 0
          let deltaCol = 0

          if (e.key === 'ArrowLeft') deltaRow = -moveAmount
          if (e.key === 'ArrowRight') deltaRow = moveAmount
          if (e.key === 'ArrowUp') deltaCol = -moveAmount
          if (e.key === 'ArrowDown') deltaCol = moveAmount

          // Move each selected vertex
          selectedVertices.forEach(vId => {
            const vertex = vertices.find(v => v.id === vId)
            if (vertex) {
              try {
                const newRow = vertex.row + deltaRow
                const newCol = vertex.col + deltaCol
                graph.set_vertex_position(vId, newRow, newCol)
              } catch (err) {
                console.error(`Failed to move vertex ${vId}:`, err)
              }
            }
          })
          updateGraphData(graph)
        } else {
          // Pan the view when nothing is selected
          const panAmount = 50 // pixels to pan
          let deltaX = 0
          let deltaY = 0

          if (e.key === 'ArrowLeft') deltaX = panAmount
          if (e.key === 'ArrowRight') deltaX = -panAmount
          if (e.key === 'ArrowUp') deltaY = panAmount
          if (e.key === 'ArrowDown') deltaY = -panAmount

          setPanOffset(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }))
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedVertices, selectedEdges, graph, undoStack, redoStack, vertices, edges, showHelp, snapToGrid, gridSize, editingPhase])

  // Get vertex fill color (unselected state) - ZXLive Modern Red & Green theme
  const getVertexColor = (type: VertexType): string => {
    switch (type) {
      case VertexType.Z:
        return '#ccffcc' // Light green
      case VertexType.X:
        return '#ff8888' // Light red
      case VertexType.H:
        return '#ffff00' // Yellow
      case VertexType.Boundary:
        return '#000000' // Black
      default:
        return '#FFFFFF'
    }
  }

  // Get vertex fill color (selected state) - darker shades
  const getVertexSelectedColor = (type: VertexType): string => {
    switch (type) {
      case VertexType.Z:
        return '#64BC90' // Darker green
      case VertexType.X:
        return '#bb0f0f' // Dark red
      case VertexType.H:
        return '#f1c232' // Darker yellow
      case VertexType.Boundary:
        return '#444444' // Dark gray
      default:
        return '#CCCCCC'
    }
  }

  // Get vertex stroke color - always black for ZXLive style
  const getVertexStrokeColor = (): string => {
    return '#000000' // Black outline for all vertices
  }

  // Format phase as fraction of π (e.g., "1/2" → "π/2", "3/4" → "3π/4", "1" → "π")
  const formatPhaseWithPi = (phase: string): string => {
    if (phase === '0') return ''
    if (phase === '1') return 'π'

    // Check if it's a fraction
    if (phase.includes('/')) {
      const parts = phase.split('/')
      const numerator = parts[0]
      const denominator = parts[1]

      if (numerator === '1') {
        return `π/${denominator}`
      } else {
        return `${numerator}π/${denominator}`
      }
    }

    // It's a whole number
    return `${phase}π`
  }

  const scale = 80 // Pixels per unit

  // Helper function to calculate perpendicular direction for edge curvature
  const computePerpendicular = (x1: number, y1: number, x2: number, y2: number): { x: number; y: number } => {
    const dx = x2 - x1
    const dy = y2 - y1
    const length = Math.sqrt(dx * dx + dy * dy)
    if (length === 0) return { x: 0, y: 1 }
    // Return normalized perpendicular vector (rotated 90 degrees)
    return { x: -dy / length, y: dx / length }
  }

  // Helper function to create curved path for an edge
  const createCurvedPath = (x1: number, y1: number, x2: number, y2: number, curveDistance: number): string => {
    if (curveDistance === 0 || Math.abs(curveDistance) < 0.01) {
      // Straight line
      return `M ${x1},${y1} L ${x2},${y2}`
    }

    // Calculate control point for quadratic bezier curve
    const midX = (x1 + x2) / 2
    const midY = (y1 + y2) / 2
    const perp = computePerpendicular(x1, y1, x2, y2)

    // Offset the midpoint perpendicular to the line (matches ZXLive)
    const offset = curveDistance * scale
    const ctrlX = midX + perp.x * offset
    const ctrlY = midY + perp.y * offset

    return `M ${x1},${y1} Q ${ctrlX},${ctrlY} ${x2},${y2}`
  }

  // Helper function to get point on curved path (for selection circle position)
  const getPointOnCurve = (x1: number, y1: number, x2: number, y2: number, curveDistance: number, t: number = 0.5): { x: number; y: number } => {
    if (curveDistance === 0 || Math.abs(curveDistance) < 0.01) {
      // Straight line - just return midpoint
      return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }
    }

    // Calculate control point (matches ZXLive)
    const midX = (x1 + x2) / 2
    const midY = (y1 + y2) / 2
    const perp = computePerpendicular(x1, y1, x2, y2)
    const offset = curveDistance * scale
    const ctrlX = midX + perp.x * offset
    const ctrlY = midY + perp.y * offset

    // Quadratic bezier formula at t=0.5 (midpoint)
    const x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * ctrlX + t * t * x2
    const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * ctrlY + t * t * y2

    return { x, y }
  }

  return (
    <div className="zx-diagram-container">
      <div className="controls">
        <h3>Controls</h3>

        <div className="file-section">
          <button onClick={handleNew} className="new-btn" title="New Diagram">
            📄 New
          </button>
          <button onClick={handleSave} className="save-btn" title="Save Diagram (Ctrl+S)">
            💾 Save
          </button>
          <button onClick={handleLoad} className="load-btn" title="Load Diagram">
            📂 Load
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        <div className="undo-redo-section">
          <button onClick={undo} disabled={undoStack.length === 0} className="undo-btn" title="Undo (Ctrl+Z)">
            ↶ Undo
          </button>
          <button onClick={redo} disabled={redoStack.length === 0} className="redo-btn" title="Redo (Ctrl+Y)">
            ↷ Redo
          </button>
        </div>

        <div className="zoom-section">
          <h4>View Controls</h4>
          <div className="zoom-controls">
            <button onClick={handleZoomIn} className="zoom-btn" title="Zoom In (Mouse Wheel)">
              🔍+ Zoom In
            </button>
            <button onClick={handleZoomOut} className="zoom-btn" title="Zoom Out (Mouse Wheel)">
              🔍− Zoom Out
            </button>
            <button onClick={handleZoomReset} className="zoom-reset-btn" title="Reset View">
              ⟲ Reset View
            </button>
          </div>
          <div className="view-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
              />
              <span>Show Grid</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={snapToGrid}
                onChange={(e) => setSnapToGrid(e.target.checked)}
              />
              <span>Snap to Grid</span>
            </label>
          </div>
          <p className="hint">Ctrl+Click or middle mouse to pan</p>
          <p className="hint">Ctrl+Scroll to zoom</p>
        </div>

        <div className="control-section">
          <label htmlFor="vertex-type">Vertex Type:</label>
          <select
            id="vertex-type"
            value={selectedVertexType}
            onChange={(e) => setSelectedVertexType(Number(e.target.value) as VertexType)}
            className="vertex-type-selector"
          >
            <option value={VertexType.Z}>Z Spider (Green)</option>
            <option value={VertexType.X}>X Spider (Red)</option>
            <option value={VertexType.H}>H-box (Yellow)</option>
            <option value={VertexType.Boundary}>Boundary (Gray)</option>
          </select>
          <p className="hint">Right-click on canvas to place</p>
          <p className="hint">Drag to box-select, Shift+Drag to toggle</p>
          <p className="hint">Ctrl+C to copy, Ctrl+V to paste</p>
          <p className="hint">Right-click vertex to convert</p>
          <p className="hint">Press Z/X/H to convert selected</p>
        </div>

        <div className="control-section">
          <label htmlFor="edge-type">Edge Type:</label>
          <select
            id="edge-type"
            value={selectedEdgeType}
            onChange={(e) => setSelectedEdgeType(Number(e.target.value))}
            className="edge-type-selector"
          >
            <option value={0}>Simple (Solid)</option>
            <option value={1}>Hadamard (Dotted)</option>
          </select>
          <p className="hint">Right-drag between vertices to create edge</p>
          <p className="hint">Right-click vertex for self-loop</p>
          <p className="hint">Press E to toggle selected edge type</p>
        </div>

        <button onClick={handleDelete} className="delete-btn" disabled={selectedVertices.size === 0 && selectedEdges.size === 0}>
          Delete Selected
        </button>

        <div className="simplification-section">
          <h4>Simplification Rules</h4>

          <button onClick={applyFullSimplification} className="simplify-full-btn">
            🚀 Full Simplification
          </button>

          <button onClick={() => applyRule('Clifford Simplification', () => graph!.simplify_clifford())} className="simplify-btn">
            Clifford Simp
          </button>

          <div className="rule-group">
            <p className="rule-group-label">Individual Rules:</p>
            <button onClick={() => applyRule('Spider Fusion', () => graph!.simplify_spiders())} className="rule-btn">
              Spider Fusion
            </button>
            <button onClick={() => applyRule('Identity Removal', () => graph!.simplify_identities())} className="rule-btn">
              Remove IDs
            </button>
            <button onClick={() => applyRule('Local Complementation', () => graph!.simplify_local_comp())} className="rule-btn">
              Local Comp
            </button>
            <button onClick={() => applyRule('Pivot', () => graph!.simplify_pivots())} className="rule-btn">
              Pivot
            </button>
          </div>
        </div>

        <div className="info">
          <p>Vertices: {vertices.length}</p>
          <p>Edges: {edges.length}</p>
          <p>Selected: {selectedVertices.size} vertices, {selectedEdges.size} edges</p>
          {/* graph && <p>{graph.to_string()}</p> */}
        </div>
      </div>

      <div className="diagram" style={{ position: 'relative' }}>
        {/* ZXLive-style toolbar */}
        <div className="diagram-toolbar">
          <button
            className={`tool-btn ${currentTool === ToolType.SELECT ? 'active' : ''}`}
            onClick={() => setCurrentTool(ToolType.SELECT)}
            title="Select Tool (S) - Click to select, drag to move, right-drag to create edges"
          >
            ⬆ SELECT
          </button>
          <button
            className={`tool-btn ${currentTool === ToolType.VERTEX ? 'active' : ''}`}
            onClick={() => setCurrentTool(ToolType.VERTEX)}
            title="Vertex Tool (V) - Click to place vertices"
          >
            ● VERTEX
          </button>
          <button
            className={`tool-btn ${currentTool === ToolType.EDGE ? 'active' : ''}`}
            onClick={() => setCurrentTool(ToolType.EDGE)}
            title="Edge Tool (W) - Drag between vertices to create edges"
          >
            ─ EDGE
          </button>
        </div>

        <svg
          ref={canvasRef}
          viewBox="0 0 700 650"
          preserveAspectRatio="xMidYMid meet"
          style={{
            border: '2px solid #ddd',
            background: '#ffffff',
            borderRadius: '8px',
            cursor: isPanning ? 'grabbing' : (draggingVertex ? 'grabbing' : 'crosshair'),
            width: '100%',
            height: '100%',
            maxWidth: '100%',
            maxHeight: '100%',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none'
          }}
          onClick={handleCanvasClick}
          onContextMenu={handleCanvasContextMenu}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* Main transform group for pan/zoom */}
          <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`}>
            {/* Grid overlay */}
            {showGrid && (() => {
              // Calculate visible range in graph coordinates
              // viewBox is 700x650, transform is translate(panOffset) scale(zoom)
              const viewBoxWidth = 700
              const viewBoxHeight = 650

              // Calculate the graph coordinate bounds visible in the current view
              const minX = (-panOffset.x / zoom) / scale
              const maxX = ((viewBoxWidth - panOffset.x) / zoom) / scale
              const minY = (-panOffset.y / zoom) / scale
              const maxY = ((viewBoxHeight - panOffset.y) / zoom) / scale

              // Round to grid boundaries and add extra padding to ensure full coverage
              const startX = Math.floor(minX / gridSize) - 12
              const endX = Math.ceil(maxX / gridSize) + 12
              const startY = Math.floor(minY / gridSize) - 12
              const endY = Math.ceil(maxY / gridSize) + 12

              const numVerticalLines = endX - startX
              const numHorizontalLines = endY - startY

              return (
                <g opacity="0.5">
                  {/* Vertical lines */}
                  {Array.from({ length: numVerticalLines }, (_, i) => startX + i).map(i => (
                    <line
                      key={`grid-v-${i}`}
                      x1={i * gridSize * scale}
                      y1={startY * gridSize * scale}
                      x2={i * gridSize * scale}
                      y2={endY * gridSize * scale}
                      stroke="#cccccc"
                      strokeWidth="1"
                    />
                  ))}
                  {/* Horizontal lines */}
                  {Array.from({ length: numHorizontalLines }, (_, i) => startY + i).map(i => (
                    <line
                      key={`grid-h-${i}`}
                      x1={startX * gridSize * scale}
                      y1={i * gridSize * scale}
                      x2={endX * gridSize * scale}
                      y2={i * gridSize * scale}
                      stroke="#cccccc"
                      strokeWidth="1"
                    />
                  ))}
                </g>
              )
            })()}

          {/* Draw edges */}
          {edges.map((edge, idx) => {
            const sourceVertex = vertices.find((v) => v.id === edge.source)
            const targetVertex = vertices.find((v) => v.id === edge.target)
            if (!sourceVertex || !targetVertex) return null

            const isHadamardEdge = edge.edge_type === 1
            const edgeId = getEdgeId(edge)
            const isSelected = selectedEdges.has(edgeId)
            const isSelfLoop = edge.source === edge.target

            const x1 = sourceVertex.row * scale + 100
            const y1 = sourceVertex.col * scale + 50
            const x2 = targetVertex.row * scale + 100
            const y2 = targetVertex.col * scale + 50

            // ZXLive style: Simple edges are black, Hadamard edges are blue dashed
            const edgeColor = isHadamardEdge ? '#0077ff' : '#000000'
            const dashArray = isHadamardEdge ? '8,4' : undefined
            const linecap = isHadamardEdge ? 'butt' : 'round'

            // For self-loops, draw a circular arc (ZXLive style)
            if (isSelfLoop) {
              // Count how many self-loops exist on this vertex (to offset them)
              const selfLoopCount = edges.filter(e => e.source === edge.source && e.target === edge.target).findIndex(e => e === edge)
              const loopRadius = 25 + selfLoopCount * 15 // Increase radius for each additional loop
              const angle = -45 + selfLoopCount * 30 // Rotate angle for each additional loop

              const angleRad = (angle * Math.PI) / 180
              const cx = x1 + Math.cos(angleRad) * loopRadius
              const cy = y1 + Math.sin(angleRad) * loopRadius

              return (
                <g key={`edge-${idx}`}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={loopRadius}
                    fill="none"
                    stroke={edgeColor}
                    strokeWidth="3"
                    strokeDasharray={dashArray}
                    onClick={(e) => { e.stopPropagation(); handleEdgeClick(e, edge) }}
                    onContextMenu={(e) => { e.stopPropagation(); handleEdgeContextMenu(e, edge) }}
                    style={{ cursor: 'pointer' }}
                  />
                  {/* Selection indicator */}
                  {isSelected && (
                    <circle
                      cx={cx}
                      cy={cy - loopRadius}
                      r="6"
                      fill="none"
                      stroke="#0022FF"
                      strokeWidth="4"
                      opacity="0.5"
                      pointerEvents="none"
                    />
                  )}
                </g>
              )
            }

            // Get curve distance (default to 0 for straight line)
            const curveDistance = edge.curve_distance || 0

            // Create curved path
            const pathData = createCurvedPath(x1, y1, x2, y2, curveDistance)

            // Calculate position for selection indicator (on the curve)
            const selectionPos = getPointOnCurve(x1, y1, x2, y2, curveDistance)

            return (
              <g key={`edge-${idx}`}>
                {/* Invisible wider path for easier clicking */}
                <path
                  d={pathData}
                  stroke="transparent"
                  strokeWidth="20"
                  strokeLinecap="round"
                  fill="none"
                  onClick={(e) => handleEdgeClick(e, edge)}
                  onContextMenu={(e) => handleEdgeContextMenu(e, edge)}
                  style={{ cursor: 'pointer' }}
                />
                {/* Visible edge path - ZXLive style */}
                <path
                  d={pathData}
                  stroke={edgeColor}
                  strokeWidth="3"
                  strokeLinecap={linecap}
                  strokeDasharray={dashArray}
                  fill="none"
                  pointerEvents="none"
                />
                {/* Selection indicator - draggable circle on the curve */}
                {isSelected && (
                  <circle
                    cx={selectionPos.x}
                    cy={selectionPos.y}
                    r="6"
                    fill="#0022FF"
                    stroke="#0022FF"
                    strokeWidth="4"
                    opacity="0.5"
                    style={{ cursor: 'move' }}
                    onMouseDown={(e) => handleEdgeSelectionMouseDown(e, edge)}
                  />
                )}
              </g>
            )
          })}

          {/* Edge drag preview line */}
          {edgeDragStart !== null && edgeDragPos !== null && (() => {
            const sourceVertex = vertices.find(v => v.id === edgeDragStart)
            if (!sourceVertex) return null

            const x1 = sourceVertex.row * scale + 100
            const y1 = sourceVertex.col * scale + 50
            const x2 = edgeDragPos.x * scale + 100
            const y2 = edgeDragPos.y * scale + 50

            const edgeColor = selectedEdgeType === 1 ? '#0077ff' : '#000000'
            const dashArray = selectedEdgeType === 1 ? '8,4' : undefined

            return (
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={edgeColor}
                strokeWidth="3"
                strokeLinecap="butt"
                strokeDasharray={dashArray}
                pointerEvents="none"
                opacity="0.6"
              />
            )
          })()}

          {/* Draw vertices */}
          {vertices.map((vertex) => {
            const isHadamard = vertex.vertex_type === VertexType.H
            const isBoundary = vertex.vertex_type === VertexType.Boundary
            const isSelected = selectedVertices.has(vertex.id)
            const cx = vertex.row * scale + 100
            const cy = vertex.col * scale + 50
            const size = isBoundary ? 8 : 22

            // ZXLive style: selected vertices have thicker border and darker fill
            const fillColor = isSelected ? getVertexSelectedColor(vertex.vertex_type as VertexType) : getVertexColor(vertex.vertex_type as VertexType)
            const strokeWidth = isSelected ? 5 : 3
            // For boundary vertices, stroke color also changes when selected
            const strokeColor = (isBoundary && isSelected) ? '#444444' : getVertexStrokeColor()

            return (
              <g
                key={`vertex-${vertex.id}`}
                onClick={(e) => handleVertexClick(e, vertex.id)}
                onDoubleClick={(e) => handleVertexDoubleClick(e, vertex)}
                onContextMenu={(e) => handleVertexContextMenu(e, vertex)}
                onMouseDown={(e) => handleVertexMouseDown(e, vertex)}
                style={{ cursor: 'pointer' }}
              >
                {/* Main shape - ZXLive style: no labels, color/shape indicates type */}
                {isHadamard ? (
                  <rect
                    x={cx - size}
                    y={cy - size}
                    width={size * 2}
                    height={size * 2}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                  />
                ) : (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={size}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                  />
                )}

                {/* Phase label (if not zero) - shown above and to the right like ZXLive */}
                {vertex.phase !== '0' && (
                  <text
                    x={cx + size - 20}
                    y={cy - size - 5}
                    textAnchor="start"
                    fontSize="12"
                    fill="#006bb3"
                    fontWeight="500"
                  >
                    {formatPhaseWithPi(vertex.phase)}
                  </text>
                )}
              </g>
            )
          })}

          </g> {/* Close main transform group */}


          {/* Box selection rectangle (not transformed) */}
          {isBoxSelecting && boxStart && boxEnd && canvasRef.current && (() => {
            const svg = canvasRef.current!

            // Convert screen coordinates to SVG coordinates using SVG's transformation matrix
            const pt1 = svg.createSVGPoint()
            pt1.x = boxStart.x
            pt1.y = boxStart.y
            const svgP1 = pt1.matrixTransform(svg.getScreenCTM()!.inverse())

            const pt2 = svg.createSVGPoint()
            pt2.x = boxEnd.x
            pt2.y = boxEnd.y
            const svgP2 = pt2.matrixTransform(svg.getScreenCTM()!.inverse())

            return (
              <rect
                x={Math.min(svgP1.x, svgP2.x)}
                y={Math.min(svgP1.y, svgP2.y)}
                width={Math.abs(svgP2.x - svgP1.x)}
                height={Math.abs(svgP2.y - svgP1.y)}
                fill="rgba(33, 150, 243, 0.1)"
                stroke="#2196F3"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            )
          })()}
        </svg>

        {/* Zoom indicator - HTML overlay below toolbar */}
        <div style={{
          position: 'absolute',
          top: '64px',
          left: '10px',
          fontSize: '16px',
          color: '#666',
          fontWeight: 500,
          pointerEvents: 'none',
          userSelect: 'none'
        }}>
          Zoom: {(zoom * 100).toFixed(0)}%
        </div>

        {/* Legend - HTML overlay at bottom-left */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          fontSize: '16px',
          color: '#424242',
          pointerEvents: 'none',
          userSelect: 'none',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '10px',
          borderRadius: '4px',
          border: '1px solid #ddd'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '18px' }}>Legend:</div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#ccffcc', border: '2px solid #000', marginRight: '8px' }}></div>
            <span>Z-spider (green circle)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#ff8888', border: '2px solid #000', marginRight: '8px' }}></div>
            <span>X-spider (red circle)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{ width: '16px', height: '16px', background: '#ffff00', border: '2px solid #000', marginRight: '8px' }}></div>
            <span>H-box (yellow square)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{ width: '20px', height: '2px', background: '#000', marginRight: '8px' }}></div>
            <span>Simple edge (solid)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '20px', height: '2px', background: '#0077ff', marginRight: '8px', backgroundImage: 'repeating-linear-gradient(90deg, #0077ff 0, #0077ff 4px, transparent 4px, transparent 8px)' }}></div>
            <span>Hadamard edge (blue dashed)</span>
          </div>
        </div>
      </div>

      {/* Phase Editor Modal */}
      {editingPhase && (
        <div className="phase-editor-overlay" onClick={handlePhaseCancel}>
          <div className="phase-editor-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Phase</h3>
            <p className="phase-hint">Enter phase as a multiple of π (e.g., "0", "1/2", "1", "3/4")</p>

            <div className="phase-presets">
              <button onClick={() => handlePhasePreset('0')} className="phase-preset-btn">0</button>
              <button onClick={() => handlePhasePreset('1/4')} className="phase-preset-btn">π/4</button>
              <button onClick={() => handlePhasePreset('1/2')} className="phase-preset-btn">π/2</button>
              <button onClick={() => handlePhasePreset('3/4')} className="phase-preset-btn">3π/4</button>
              <button onClick={() => handlePhasePreset('1')} className="phase-preset-btn">π</button>
              <button onClick={() => handlePhasePreset('-1/4')} className="phase-preset-btn">-π/4</button>
              <button onClick={() => handlePhasePreset('-1/2')} className="phase-preset-btn">-π/2</button>
              <button onClick={() => handlePhasePreset('-1')} className="phase-preset-btn">-π</button>
            </div>

            <div className="phase-input-section">
              <label htmlFor="phase-input">Custom Phase:</label>
              <input
                id="phase-input"
                type="text"
                value={phaseInput}
                onChange={(e) => setPhaseInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePhaseSubmit()
                  if (e.key === 'Escape') handlePhaseCancel()
                }}
                autoFocus
                placeholder="e.g., 1/2"
                className="phase-input"
              />
            </div>

            <div className="phase-editor-buttons">
              <button onClick={handlePhaseCancel} className="phase-cancel-btn">Cancel</button>
              <button onClick={handlePhaseSubmit} className="phase-submit-btn">Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="context-menu-overlay" onClick={handleCloseContextMenu} />
          <div
            className="context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="context-menu-header">
              Convert to:
            </div>
            <button
              onClick={() => handleConvertVertexType(VertexType.Z)}
              className="context-menu-item"
              disabled={contextMenu.vertex.vertex_type === VertexType.Z}
            >
              <span className="vertex-icon z-icon">●</span> Z Spider (Green)
            </button>
            <button
              onClick={() => handleConvertVertexType(VertexType.X)}
              className="context-menu-item"
              disabled={contextMenu.vertex.vertex_type === VertexType.X}
            >
              <span className="vertex-icon x-icon">●</span> X Spider (Red)
            </button>
            <button
              onClick={() => handleConvertVertexType(VertexType.H)}
              className="context-menu-item"
              disabled={contextMenu.vertex.vertex_type === VertexType.H}
            >
              <span className="vertex-icon h-icon">■</span> H-box (Yellow)
            </button>
          </div>
        </>
      )}

      {/* Edge Context Menu */}
      {edgeContextMenu && (
        <>
          <div className="context-menu-overlay" onClick={handleCloseEdgeContextMenu} />
          <div
            className="context-menu"
            style={{ left: edgeContextMenu.x, top: edgeContextMenu.y }}
          >
            <div className="context-menu-header">
              Edge Type:
            </div>
            <button
              onClick={handleToggleEdgeType}
              className="context-menu-item"
            >
              {edgeContextMenu.edge.edge_type === 0 ? (
                <>
                  <span className="edge-type-icon">⚬⚬⚬</span> Convert to Hadamard
                </>
              ) : (
                <>
                  <span className="edge-type-icon">━━━</span> Convert to Simple
                </>
              )}
            </button>
          </div>
        </>
      )}

      {/* Help Modal */}
      {showHelp && (
        <>
          <div className="modal-overlay" onClick={() => setShowHelp(false)} />
          <div className="help-modal">
            <div className="help-header">
              <h2>Controls Reference</h2>
              <button className="close-button" onClick={() => setShowHelp(false)}>×</button>
            </div>
            <div className="help-content">
              <div className="help-section">
                <h3>Editing</h3>
                <div className="help-item">
                  <kbd>Right-Click</kbd>
                  <span>Add vertex</span>
                </div>
                <div className="help-item">
                  <kbd>Double-Click</kbd>
                  <span>Edit vertex phase</span>
                </div>
                <div className="help-item">
                  <kbd>Delete</kbd> / <kbd>Backspace</kbd>
                  <span>Delete selection</span>
                </div>
              </div>

              <div className="help-section">
                <h3>Edge Creation</h3>
                <div className="help-item">
                  <kbd>Right-Click + Drag</kbd>
                  <span>Create edge between vertices</span>
                </div>
                <div className="help-item">
                  <kbd>Right-Click on vertex</kbd>
                  <span>Create self-loop</span>
                </div>
              </div>

              <div className="help-section">
                <h3>Selection</h3>
                <div className="help-item">
                  <kbd>Click</kbd>
                  <span>Select vertex/edge</span>
                </div>
                <div className="help-item">
                  <kbd>Shift + Click</kbd>
                  <span>Toggle vertex/edge in selection</span>
                </div>
                <div className="help-item">
                  <kbd>Drag</kbd>
                  <span>Box select vertices</span>
                </div>
                <div className="help-item">
                  <kbd>Shift + Drag</kbd>
                  <span>Toggle vertices in box</span>
                </div>
                <div className="help-item">
                  <kbd>Esc</kbd>
                  <span>Clear selection</span>
                </div>
              </div>

              <div className="help-section">
                <h3>Clipboard</h3>
                <div className="help-item">
                  <kbd>Ctrl + C</kbd>
                  <span>Copy selection</span>
                </div>
                <div className="help-item">
                  <kbd>Ctrl + V</kbd>
                  <span>Paste</span>
                </div>
              </div>

              <div className="help-section">
                <h3>History</h3>
                <div className="help-item">
                  <kbd>Ctrl + Z</kbd>
                  <span>Undo</span>
                </div>
                <div className="help-item">
                  <kbd>Ctrl + Y</kbd> / <kbd>Ctrl + Shift + Z</kbd>
                  <span>Redo</span>
                </div>
              </div>

              <div className="help-section">
                <h3>View</h3>
                <div className="help-item">
                  <kbd>Arrow Keys</kbd>
                  <span>Pan (no selected vertices)</span>
                </div>
                <div className="help-item">
                  <kbd>Ctrl + Drag</kbd> / <kbd>Middle Mouse</kbd>
                  <span>Pan</span>
                </div>
                <div className="help-item">
                  <kbd>Ctrl + Scroll</kbd>
                  <span>Zoom in/out</span>
                </div>
              </div>

              <div className="help-section">
                <h3>Movement</h3>
                <div className="help-item">
                  <kbd>Arrow Keys</kbd>
                  <span>Move selected vertices</span>
                </div>
                <div className="help-item">
                  <kbd>Shift + Arrow Keys</kbd>
                  <span>Fine movement</span>
                </div>
              </div>

              <div className="help-section">
                <h3>Tools</h3>
                <div className="help-item">
                  <kbd>S</kbd>
                  <span>SELECT tool</span>
                </div>
                <div className="help-item">
                  <kbd>V</kbd>
                  <span>VERTEX tool</span>
                </div>
                <div className="help-item">
                  <kbd>W</kbd>
                  <span>EDGE tool</span>
                </div>
              </div>

              <div className="help-section">
                <h3>Conversion</h3>
                <div className="help-item">
                  <kbd>Z</kbd>
                  <span>Convert to Z-spider</span>
                </div>
                <div className="help-item">
                  <kbd>X</kbd>
                  <span>Convert to X-spider</span>
                </div>
                <div className="help-item">
                  <kbd>H</kbd>
                  <span>Convert to H-box</span>
                </div>
                <div className="help-item">
                  <kbd>E</kbd>
                  <span>Toggle edge type</span>
                </div>
              </div>

              <div className="help-section">
                <h3>File</h3>
                <div className="help-item">
                  <kbd>Ctrl + S</kbd>
                  <span>Save diagram</span>
                </div>
              </div>

              <div className="help-section">
                <h3>Help</h3>
                <div className="help-item">
                  <kbd>?</kbd>
                  <span>Toggle this help</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ZXDiagram
