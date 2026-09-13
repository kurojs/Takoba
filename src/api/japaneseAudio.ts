import { fetch } from "../lib/api-shim";
import { playAudioBuffer } from "../utils/play-audio";

const JAPANESE_POD_BASE =
  "https://assets.languagepod101.com/dictionary/japanese/audiomp3.php";

const MIN_AUDIO_BYTES = 64;

// Real JapanesePod101 word clips are ~1-3 KB. The endpoint returns a ~52 KB
// generic clip for unknown text, so anything larger is treated as "no audio".
const MAX_AUDIO_BYTES = 16 * 1024;

export interface JapaneseAudioLookup {
  kanji?: string;
  kana: string;
}

export async function fetchJapanesePodAudio({
  kanji,
  kana,
}: JapaneseAudioLookup): Promise<Buffer | null> {
  if (!kana && !kanji) return null;

  const params = new URLSearchParams();
  params.set("kanji", kanji ?? "");
  params.set("kana", kana ?? "");

  const res = await fetch(`${JAPANESE_POD_BASE}?${params.toString()}`);
  if (!res.ok) return null;

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("audio")) return null;

  const audio = Buffer.from(await res.arrayBuffer());
  if (audio.length < MIN_AUDIO_BYTES || audio.length > MAX_AUDIO_BYTES) {
    return null;
  }

  return audio;
}

export async function playJapanesePodAudio(
  lookup: JapaneseAudioLookup,
): Promise<void> {
  const audio = await fetchJapanesePodAudio(lookup);
  if (!audio) {
    throw new Error("No JapanesePod101 audio found for this word");
  }
  await playAudioBuffer(audio);
}