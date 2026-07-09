import { fetch } from "../lib/api-shim";
import { writeFile, unlink } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { environment } from "../lib/api-shim";

const execAsync = promisify(exec);

function getPlatform(): "win32" | "darwin" | "linux" {
  return process.platform as "win32" | "darwin" | "linux";
}

async function ttsFetch(
  text: string,
  apiKey: string,
  voiceId: string,
  language?: string,
): Promise<Buffer> {
  const body: Record<string, any> = {
    text,
    model_id: "eleven_multilingual_v2",
    voice_settings: { stability: 0.5, similarity_boost: 0.5 },
  };
  if (language) body.language = language;

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${errText}`);
  }

  const audioBuffer = Buffer.from(await res.arrayBuffer());
  if (audioBuffer.length === 0) throw new Error("Empty audio generated");
  return audioBuffer;
}

export async function playElevenLabsAudio(
  text: string,
  apiKey: string,
  voiceId: string,
  language?: string,
): Promise<void> {
  if (!apiKey) throw new Error("ElevenLabs API key not configured");
  const audioData = await ttsFetch(text, apiKey, voiceId, language);

  const tempDir = environment.supportPath;
  const audioPath = join(tempDir, `takoba_tts_${Date.now()}.mp3`);
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

export async function generateTTSBuffer(
  text: string,
  apiKey: string,
  voiceId: string,
  language?: string,
): Promise<Buffer> {
  if (!apiKey) throw new Error("ElevenLabs API key not configured");
  return ttsFetch(text, apiKey, voiceId, language);
}
