import { exec } from "child_process";

function getPlatform(): "win32" | "darwin" | "linux" {
  return process.platform as "win32" | "darwin" | "linux";
}

export function openUrl(url: string): void {
  const platform = getPlatform();
  if (platform === "win32") {
    exec(`start "" "${url}"`);
  } else if (platform === "darwin") {
    exec(`open "${url}"`);
  } else {
    exec(`xdg-open "${url}"`);
  }
}
