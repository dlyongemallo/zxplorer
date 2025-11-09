# ZXplorer

A web-based ZX-calculus diagram editor built with React, TypeScript, and Rust/WebAssembly.

## Overview

ZXplorer is an interactive editor for ZX-diagrams, a graphical language for quantum computing and quantum information. It uses the [QuiZX](https://github.com/zxcalc/quizx) library (Rust) compiled to WebAssembly for graph operations.

## Prerequisites

- **Rust** (stable) with `wasm32-unknown-unknown` target
- **Node.js** 20+ and npm
- **wasm-pack** (install with `cargo install wasm-pack`)
- **wasm-opt** (optional, for optimization)

### Install Rust and wasm32 target

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
```

### Install wasm-opt (optional)

On macOS:
```bash
brew install binaryen
```

On Ubuntu/Debian:
```bash
sudo apt install binaryen
```

## Building

### 1. Initialize submodules

```bash
git submodule update --init --recursive
```

### 2. Build WebAssembly bindings

```bash
cd quizx-wasm
wasm-pack build --target web
cd ..
```

This compiles the Rust QuiZX bindings to WebAssembly and generates the `pkg/` directory. wasm-pack will automatically use wasm-bindgen 0.2.104 as specified in Cargo.toml.

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
│   ├── Cargo.toml      # Rust dependencies (pins wasm-bindgen to 0.2.104)
│   └── pkg/            # Generated WASM package (after build)
└── zxplorer-web/       # React web application
    ├── src/            # TypeScript source code
    └── dist/           # Production build (after npm run build)
```

## Development

- **WASM changes**: Rebuild with `cd quizx-wasm && wasm-pack build --target web`
- **React changes**: Hot-reload is automatic when dev server is running
- **Build for production**: `npm run build` in zxplorer-web/

## License

Apache 2.0 (same as QuiZX)

## Credits

- Built on [QuiZX](https://github.com/zxcalc/quizx) by Aleks Kissinger and John van de Wetering
- Inspired by [ZXLive](https://github.com/zxcalc/zxlive)
