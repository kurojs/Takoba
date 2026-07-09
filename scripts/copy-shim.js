const fs = require("fs");
const target = process.argv[2];
if (!target || !["vicinae", "raycast"].includes(target)) {
  console.error("Usage: node scripts/copy-shim.js <vicinae|raycast>");
  process.exit(1);
}
const src = `src/lib/api-shim-${target}.ts`;
const dest = "src/lib/api-shim.ts";
fs.copyFileSync(src, dest);
