#!/bin/bash
set -e

echo "Building QuiZX WASM bindings..."

# Build with wasm-pack
wasm-pack build --target web

# Apply compatibility fix for WebAssembly.Table.grow()
# See: https://github.com/wasm-bindgen/wasm-bindgen/issues/4528
node patch-wasm.js

echo "✓ Build complete!"
