const fs = require("fs");
const path = require("path");
const os = require("os");

const dictSrc = path.join(__dirname, "..", "node_modules", "@sglkc", "kuromoji", "dict");

function copyDict(destDir) {
  const dictDest = path.join(destDir, "dict");
  if (fs.existsSync(dictDest)) {
    fs.rmSync(dictDest, { recursive: true });
  }
  fs.cpSync(dictSrc, dictDest, { recursive: true });
  console.log(`Takoba: dict copied to ${dictDest}`);
}

function copyWorker(destDir) {
  const workerSrc = path.join(__dirname, "..", "dist", "furigana-worker.cjs");
  if (!fs.existsSync(workerSrc)) {
    console.warn("Takoba: furigana worker not found at", workerSrc);
    return;
  }
  const workerDestDir = path.join(destDir, "scripts");
  fs.mkdirSync(workerDestDir, { recursive: true });
  fs.copyFileSync(workerSrc, path.join(workerDestDir, "furigana-worker.cjs"));
  console.log(`Takoba: furigana worker copied to ${workerDestDir}`);
}

const destArg = process.argv[2];
if (destArg) {
  copyDict(path.resolve(destArg));
  copyWorker(path.resolve(destArg));
} else {
  const candidates = [];

  const platform = process.platform;

  // Vicinae — Linux only
  if (platform === "linux") {
    const xdg = process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
    candidates.push(path.join(xdg, "vicinae", "extensions", "takoba"));
  }

  // Raycast — macOS / Windows only
  if (platform === "darwin") {
    candidates.push(path.join(os.homedir(), "Library", "Application Support", "com.raycast.macos", "extensions", "takoba"));
  }
  if (platform === "win32") {
    candidates.push(path.join(os.homedir(), ".config", "raycast-x", "extensions", "takoba"));
  }

  candidates.push(path.join(__dirname, "..", "dist"));

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      copyDict(dir);
      copyWorker(dir);
      return;
    }
  }

  // Fallback: if no extension dir found, try dist/
  const fallbackDir = path.join(__dirname, "..", "dist");
  if (fs.existsSync(fallbackDir)) {
    copyDict(fallbackDir);
    copyWorker(fallbackDir);
    return;
  }

  console.error("Takoba: could not find extension output directory");
  console.error("Takoba: tried:", candidates.join(", "));
  process.exit(1);
}
