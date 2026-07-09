const fs = require("fs");
const path = require("path");

const dictSrc = path.join(__dirname, "..", "node_modules", "@sglkc", "kuromoji", "dict");

function copyDict(destDir) {
  const dictDest = path.join(destDir, "dict");
  if (fs.existsSync(dictDest)) {
    fs.rmSync(dictDest, { recursive: true });
  }
  fs.cpSync(dictSrc, dictDest, { recursive: true });
  console.log(`Takoba: dict copied to ${dictDest}`);
}

const destArg = process.argv[2];
if (destArg) {
  copyDict(path.resolve(destArg));
} else {
  const os = require("os");
  const xdgData = process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
  const extDir = path.join(xdgData, "vicinae", "extensions", "takoba");

  if (fs.existsSync(extDir)) {
    copyDict(extDir);
  } else {
    // Fallback: try dist/ directory
    const distDir = path.join(__dirname, "..", "dist");
    if (fs.existsSync(distDir)) {
      copyDict(distDir);
    } else {
      console.error("Takoba: could not find extension output directory");
      process.exit(1);
    }
  }
}
