/**
 * Colour utilities for ZX-diagram vertices
 *
 * Definitions match ZXLive's "Modern Red & Green" theme.
 */

import { VertexType } from '../types/ZXGraphTypes'

export function getVertexColor(type: number): string {
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

export function getVertexSelectedColor(type: number): string {
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

export function getVertexStrokeColor(): string {
  return '#000000' // Black outline for all vertices
}

/**
 * Format phase as fraction of π
 * Examples:
 * - "0" → ""
 * - "1" → "π"
 * - "1/2" → "π/2"
 * - "3/4" → "3π/4"
 * - "2" → "2π"
 *
 * TODO: Should probably not be in "Color"Utils. Maybe rename the class to "DisplayUtils".
 */
export function formatPhaseWithPi(phase: string): string {
  if (phase === '0') return ''
  if (phase === '1') return 'π'

  // Check if it's a fraction.
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

  // It's a whole number.
  return `${phase}π`
}
