import { useState, useEffect } from 'react'
import './App.css'
import { createExampleGraph } from './utils/exampleGraphs'

function App() {
  const [wasmLoaded, setWasmLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [graphInfo, setGraphInfo] = useState<string>('')

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

        // Create example graph
        const graph = createExampleGraph()
        setGraphInfo(`Created example graph: ${graph.to_string()}`)
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
      <header>
        <h1>ZXplorer</h1>
        <p>Interactive ZX-diagram editor powered by QuiZX</p>
      </header>
      <main style={{ padding: '40px 20px' }}>
        <p style={{ fontSize: '1.1em', color: '#333' }}>{graphInfo}</p>
        <p style={{ marginTop: '20px', color: '#666' }}>
          Visual editor coming soon...
        </p>
      </main>
    </div>
  )
}

export default App
