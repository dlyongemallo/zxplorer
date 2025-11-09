/**
 * Undo/Redo history manager for ZX-diagrams
 * Platform-agnostic state management using JSON serialization
 */

import { ZXGraph } from 'quizx-wasm'

/**
 * Maximum number of states to keep in history
 * Prevents unlimited memory growth
 */
const MAX_HISTORY_SIZE = 50

/**
 * Manages undo/redo history for a ZX graph
 * Uses JSON serialization to capture graph states
 */
export class UndoRedoManager {
  private undoStack: string[] = []
  private redoStack: string[] = []

  /**
   * Save the current graph state to undo stack
   * Clears redo stack when new action is performed
   *
   * @param graph - Current graph state
   */
  saveState(graph: ZXGraph): void {
    const state = graph.to_json()

    // Add to undo stack
    this.undoStack.push(state)

    // Limit stack size to prevent memory issues
    if (this.undoStack.length > MAX_HISTORY_SIZE) {
      this.undoStack.shift() // Remove oldest state
    }

    // Clear redo stack when new action is performed
    this.redoStack = []
  }

  /**
   * Undo the last action
   *
   * @param currentGraph - Current graph state
   * @returns Restored graph, or null if nothing to undo
   */
  undo(currentGraph: ZXGraph): ZXGraph | null {
    if (this.undoStack.length === 0) return null

    const currentState = currentGraph.to_json()
    const previousState = this.undoStack.pop()!

    try {
      const restoredGraph = ZXGraph.from_json(previousState)

      // Move current state to redo stack
      this.redoStack.push(currentState)

      return restoredGraph
    } catch (err) {
      console.error('Error during undo:', err)
      // Restore the state we just popped
      this.undoStack.push(previousState)
      throw new Error('Failed to undo: ' + err)
    }
  }

  /**
   * Redo the last undone action
   *
   * @param currentGraph - Current graph state
   * @returns Restored graph, or null if nothing to redo
   */
  redo(currentGraph: ZXGraph): ZXGraph | null {
    if (this.redoStack.length === 0) return null

    const currentState = currentGraph.to_json()
    const nextState = this.redoStack.pop()!

    try {
      const restoredGraph = ZXGraph.from_json(nextState)

      // Move current state to undo stack
      this.undoStack.push(currentState)

      return restoredGraph
    } catch (err) {
      console.error('Error during redo:', err)
      // Restore the state we just popped
      this.redoStack.push(nextState)
      throw new Error('Failed to redo: ' + err)
    }
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = []
    this.redoStack = []
  }

  /**
   * Get number of states in undo stack
   */
  getUndoCount(): number {
    return this.undoStack.length
  }

  /**
   * Get number of states in redo stack
   */
  getRedoCount(): number {
    return this.redoStack.length
  }
}
