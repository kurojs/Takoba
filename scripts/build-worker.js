const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const entry = path.join(__dirname, "furigana-worker.js");
const outDir = path.join(__dirname, "..", "dist");
const outfile = path.join(outDir, "furigana-worker.cjs");
fs.mkdirSync(outDir, { recursive: true });

esbuild.buildSync({
  entryPoints: [entry],
  bundle: true,
  platform: "node",
  target: "node18",
  outfile,
  minify: true,
});

console.log("Takoba: furigana worker bundled to dist/furigana-worker.cjs");
