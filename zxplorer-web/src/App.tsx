import { useState, useEffect } from 'react'
import './App.css'
import ZXDiagram from '../web/components/ZXDiagram'

function App() {
  const [wasmLoaded, setWasmLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let initialized = false

    const initWasm = async () => {
      if (initialized) return

      try {
        console.log('Attempting to load WASM module...')
        const module = await import('quizx-wasm')
        console.log('WASM module imported, initializing...')

        // Initialize the WASM module only once
        await module.default()
        initialized = true

        console.log('WASM module initialized successfully!')
        setWasmLoaded(true)
      } catch (err: any) {
        console.error('Failed to load WASM module:', err)
        setError(err.message || 'Unknown error loading WASM')
      }
    }

    initWasm()
  }, [])

  if (error) {
    return (
      <div className="App">
        <header>
          <h1>ZXplorer</h1>
          <p>Interactive ZX-diagram editor powered by QuiZX</p>
        </header>
        <p style={{ color: 'red', padding: '20px' }}>Error loading WASM module: {error}</p>
        <p style={{ padding: '0 20px' }}>Check browser console for details</p>
      </div>
    )
  }

  if (!wasmLoaded) {
    return (
      <div className="App">
        <header>
          <h1>ZXplorer</h1>
          <p>Interactive ZX-diagram editor powered by QuiZX</p>
        </header>
        <p style={{ padding: '20px' }}>Loading ZX-calculus engine...</p>
      </div>
    )
  }

  return (
    <div className="App">
      <ZXDiagram />
    </div>
  )
}

export default App
