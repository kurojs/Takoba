import { writeFile, unlink } from "fs/promises";
import { exec, spawn } from "child_process";
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
    // Play headless via Windows Presentation Foundation's MediaPlayer so
    // Windows never asks which app to open the file or opens a player window.
    const psScript = [
      "Add-Type -AssemblyName PresentationCore",
      "$m = New-Object System.Windows.Media.MediaPlayer",
      "$m.Open([uri]$args[0]); $m.Play()",
      "if ($m.NaturalDuration.HasTimeSpan) {",
      "  $t0 = Get-Date",
      "  do { Start-Sleep -Milliseconds 100; $d = $m.NaturalDuration.HasTimeSpan -and $m.Position -ge $m.NaturalDuration.TimeSpan } while (-not $d -and ((Get-Date) - $t0).TotalSeconds -lt 30)",
      "} else { Start-Sleep -Seconds 2 }",
      "$m.Close()",
    ].join("; ");
    const child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-WindowStyle",
        "Hidden",
        "-Command",
        `& { ${psScript} }`,
        audioPath,
      ],
      { windowsHide: true },
    );
    child.on("error", (err) => console.error("Error playing audio:", err));
    child.on("exit", () => unlink(audioPath).catch(() => {}));
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