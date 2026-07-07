import { exec } from "child_process";

export function openUrl(url: string) {
  exec(`xdg-open "${url}"`);
}
