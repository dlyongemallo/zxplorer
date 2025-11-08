#!/bin/bash
set -e

echo "Building WASM..."

# Build the Rust code
cargo build --release --target wasm32-unknown-unknown

# Find wasm-bindgen
WASM_BINDGEN=$(find ~/.cache/.wasm-pack -name "wasm-bindgen" -type f 2>/dev/null | head -1)

if [ -z "$WASM_BINDGEN" ]; then
    echo "wasm-bindgen not found in cache, installing wasm-bindgen-cli..."
    cargo install wasm-bindgen-cli --version 0.2.105
    WASM_BINDGEN="wasm-bindgen"
fi

# Run wasm-bindgen
$WASM_BINDGEN \
    target/wasm32-unknown-unknown/release/quizx_wasm.wasm \
    --out-dir pkg \
    --typescript \
    --target web

# Optimize with wasm-opt if available
if command -v wasm-opt &> /dev/null; then
    echo "Optimizing WASM..."
    wasm-opt pkg/quizx_wasm_bg.wasm -O2 -o pkg/quizx_wasm_bg.wasm
fi

echo "Build complete!"
