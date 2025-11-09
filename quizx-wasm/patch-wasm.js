#!/usr/bin/env node
/**
 * Post-build patch for wasm-bindgen generated JavaScript
 * Fixes the WebAssembly.Table.grow() issue that causes:
 * "RangeError: WebAssembly.Table.grow(): failed to grow table by 4"
 *
 * See: https://github.com/wasm-bindgen/wasm-bindgen/issues/4528
 */

const fs = require('fs');
const path = require('path');

const jsFile = path.join(__dirname, 'pkg', 'quizx_wasm.js');

console.log('Patching quizx_wasm.js to fix externref table grow issue...');

let content = fs.readFileSync(jsFile, 'utf8');

// Find and replace the problematic __wbindgen_init_externref_table function
// Supports both old format (wasm.__wbindgen_export_N) and new format (wasm.__wbindgen_externrefs)
const originalPattern = /imports\.wbg\.__wbindgen_init_externref_table = function\(\) \{[\s\S]*?const table = wasm\.(__wbindgen_export_\d+|__wbindgen_externrefs);[\s\S]*?const offset = table\.grow\(\d+\);[\s\S]*?table\.set\(0, undefined\);[\s\S]*?table\.set\(offset \+ 0, undefined\);[\s\S]*?table\.set\(offset \+ 1, null\);[\s\S]*?table\.set\(offset \+ 2, true\);[\s\S]*?table\.set\(offset \+ 3, false\);[\s\S]*?\};/;

const match = content.match(originalPattern);
if (!match) {
    console.log('⚠️  Could not find pattern to patch - file may have already been patched or structure changed');
    process.exit(0);
}

const tableName = match[1]; // Extract the actual table name used

const patched = `imports.wbg.__wbindgen_init_externref_table = function() {
        // PATCHED: Catch and suppress externref table initialization errors
        // Our API doesn't use JavaScript object references, only primitives and strings
        try {
            const table = wasm.${tableName};
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        } catch (e) {
            // Externref table initialization failed, but that's OK
            // since our API only uses primitives and JSON strings
            console.debug('Skipping externref table initialization (not needed for this API)');
        }
    };`;

content = content.replace(originalPattern, patched);
fs.writeFileSync(jsFile, content, 'utf8');
console.log('✅ Successfully patched quizx_wasm.js');
