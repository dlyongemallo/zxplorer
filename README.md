# ZXplorer

A web-based ZX-calculus diagram editor built with React, TypeScript, and Rust/WebAssembly.

## Overview

ZXplorer is web-based editor for [ZX-diagrams](https://zxcalculus.com/), a graphical language for quantum computation and quantum information. It uses the [QuiZX](https://github.com/zxcalc/quizx) library (Rust) compiled to WebAssembly for graph operations. It is inspired by [ZXLive](https://github.com/zxcalc/zxlive).

## Prerequisites

- **Rust** (stable) with `wasm32-unknown-unknown` target
- **Node.js** 20+ and npm
- **wasm-bindgen-cli** 0.2.105 (installed automatically by build script)

## Building

### 1. Initialize quixz submodule

```bash
git submodule update --init --recursive
```

### 2. Build WebAssembly bindings

```bash
cd quizx-wasm
./build.sh
cd ..
```

This compiles the Rust QuiZX bindings to WebAssembly and generates the `pkg/` directory.

### 3. Install npm dependencies

```bash
cd zxplorer-web
npm install
```

### 4. Run development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Project Structure

```
zxplorer/
├── quizx/              # QuiZX library (Rust, submodule)
├── quizx-wasm/         # WebAssembly bindings for QuiZX
│   ├── src/lib.rs      # Rust WASM API
│   ├── build.sh        # Build script
│   └── pkg/            # Generated WASM package (after build)
└── zxplorer-web/       # React web application
    ├── src/            # TypeScript source code
    └── dist/           # Production build (after npm run build)
```

## Development

- **WASM changes**: Rebuild with `cd quizx-wasm && ./build.sh`
- **React changes**: Hot-reload is automatic when dev server is running.
- **Build for production**: `npm run build` in zxplorer-web/

