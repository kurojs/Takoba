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

function platformVicinaeDir() {
  const p = process.platform;
  if (p === "linux") {
    const xdg = process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
    return path.join(xdg, "vicinae", "extensions", "takoba");
  }
  if (p === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "vicinae", "extensions", "takoba");
  }
  if (p === "win32") {
    return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "vicinae", "extensions", "takoba");
  }
  return null;
}

const destArg = process.argv[2];
if (destArg) {
  copyDict(path.resolve(destArg));
} else {
  const candidates = [];

  const vicDir = platformVicinaeDir();
  if (vicDir) candidates.push(vicDir);

  if (process.platform === "linux") {
    candidates.push(path.join(os.homedir(), ".config", "raycast", "extensions", "takoba"));
  }
  if (process.platform === "darwin") {
    candidates.push(path.join(os.homedir(), "Library", "Application Support", "com.raycast.macos", "extensions", "takoba"));
  }

  candidates.push(path.join(__dirname, "..", "dist"));

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      copyDict(dir);
      return;
    }
  }

  console.error("Takoba: could not find extension output directory");
  console.error("Takoba: tried:", candidates.join(", "));
  process.exit(1);
}
