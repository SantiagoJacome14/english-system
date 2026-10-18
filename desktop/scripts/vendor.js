// Copies the browser builds of the speech libraries into vendor/, so the installer ships only
// these files instead of the whole node_modules (which includes large native builds we don't use).
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const out = path.join(root, "vendor");
fs.mkdirSync(out, { recursive: true });
const files = [
  "@huggingface/transformers/dist/transformers.min.js",
  "@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.mjs",
  "@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.wasm",
  "kokoro-js/dist/kokoro.web.js",
];
for (const f of files) fs.copyFileSync(path.join(root, "node_modules", f), path.join(out, path.basename(f)));
console.log("vendor: copied", files.length, "files");
