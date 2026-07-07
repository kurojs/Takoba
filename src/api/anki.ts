import { fetch } from "undici";
import { Section, SECTION_DECKS } from "../types";

export async function checkAnkiConnect(port: string = "8765"): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${port}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "version", version: 6 }),
    });
    const data = (await res.json()) as any;
    return data.result !== null && data.result >= 6;
  } catch {
    return false;
  }
}

async function ensureDeckExists(
  deckName: string,
  port: string = "8765",
): Promise<void> {
  try {
    const checkRes = await fetch(`http://localhost:${port}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deckNames", version: 6 }),
    });
    const checkData = (await checkRes.json()) as any;
    const decks = checkData.result || [];

    if (!decks.includes(deckName)) {
      await fetch(`http://localhost:${port}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createDeck",
          version: 6,
          params: { deck: deckName },
        }),
      });
    }
  } catch (error) {
    console.error("Error ensuring deck exists:", error);
  }
}

export async function addToAnki(
  section: Section,
  front: string,
  back: string,
  port: string = "8765",
): Promise<number> {
  const deckName = SECTION_DECKS[section];
  await ensureDeckExists(deckName, port);

  const modelName = "Basic";

  const noteFields: Record<string, string> = {
    Front: front,
    Back: back,
  };

  const res = await fetch(`http://localhost:${port}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "addNote",
      version: 6,
      params: {
        note: {
          deckName,
          modelName,
          fields: noteFields,
          options: {
            allowDuplicate: false,
            duplicateScope: "deck",
            duplicateScopeOptions: { deckName },
          },
          tags: ["vicinae", "japanese", "takoba"],
        },
      },
    }),
  });

  const result = (await res.json()) as any;

  if (result.error) throw new Error(result.error);
  if (!result.result)
    throw new Error("Failed to add note - check Anki error log.");
  return result.result as number;
}

async function storeMediaFile(
  filename: string,
  data: string,
  port: string,
): Promise<void> {
  const res = await fetch(`http://localhost:${port}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "storeMediaFile",
      version: 6,
      params: { filename, data },
    }),
  });
  const result = (await res.json()) as any;
  if (result.error) throw new Error(result.error);
}

export async function generateSoundTags(
  audioTexts: { text: string; language?: string }[],
  apiKey: string,
  voiceId: string,
  port: string,
  enabled: boolean = true,
): Promise<string[]> {
  if (!enabled || !apiKey || audioTexts.length === 0) return [];

  const timestamp = Date.now();
  const tags: string[] = [];

  for (let i = 0; i < audioTexts.length; i++) {
    try {
      const text = audioTexts[i].text;
      if (!text) continue;
      const { generateTTSBuffer } = await import("./elevenlabs");
      const audioBuffer = await generateTTSBuffer(
        text.slice(0, 500),
        apiKey,
        voiceId,
        audioTexts[i].language,
      );
      const base64Data = Buffer.from(audioBuffer).toString("base64");
      const filename = `takoba_card_${timestamp}_${i}.mp3`;
      await storeMediaFile(filename, base64Data, port);
      tags.push(`[sound:${filename}]`);
    } catch (e) {
      console.error("Failed to add audio:", e);
    }
  }

  return tags;
}
