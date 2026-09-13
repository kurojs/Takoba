import { fetch } from "../lib/api-shim";
import { playAudioBuffer } from "../utils/play-audio";

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
  await playAudioBuffer(audioData);
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
