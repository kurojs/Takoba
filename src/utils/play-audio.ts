import { writeFile, unlink } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { environment } from "../lib/api-shim";

const execAsync = promisify(exec);

function getPlatform(): "win32" | "darwin" | "linux" {
  return process.platform as "win32" | "darwin" | "linux";
}

export async function playAudioBuffer(
  audioData: Buffer,
  ext = "mp3",
): Promise<void> {
  const audioPath = join(
    environment.supportPath,
    `takoba_audio_${Date.now()}.${ext}`,
  );
  await writeFile(audioPath, audioData);

  const platform = getPlatform();

  if (platform === "win32") {
    exec(`start "" "${audioPath}"`, (err) => {
      if (err) console.error("Error playing audio:", err);
    });
    return;
  }

  if (platform === "darwin") {
    exec(`afplay "${audioPath}"`, async (err) => {
      await unlink(audioPath).catch(() => {});
      if (err) console.error("Error playing audio:", err);
    });
    return;
  }

  let playCommand = "";
  try {
    await execAsync("which ffplay");
    playCommand = `ffplay -nodisp -autoexit "${audioPath}" 2>/dev/null`;
  } catch {
    try {
      await execAsync("which mpv");
      playCommand = `mpv --no-video --really-quiet "${audioPath}"`;
    } catch {
      await unlink(audioPath).catch(() => {});
      throw new Error("No audio player found (install ffplay or mpv)");
    }
  }

  exec(playCommand, async (err) => {
    await unlink(audioPath).catch(() => {});
    if (err) console.error("Error playing audio:", err);
  });
}