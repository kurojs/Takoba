import { fetch } from "../lib/api-shim";
import { Section, SECTION_DECKS } from "../types";

interface AnkiNote {
  deckName: string;
  modelName: string;
  fields: Record<string, string>;
  tags?: string[];
}

interface AnkiCard {
  cardId: number;
  note: number[];
  fields?: Record<string, string>;
}

export async function ankiInvoke(
  action: string,
  params: any = {},
  version = 6,
  port = "8765",
): Promise<any> {
  const res = await fetch(`http://127.0.0.1:${port}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, params, version }),
  });
  const data: any = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

export async function getAnkiCards(query: string): Promise<AnkiCard[]> {
  const cardIds: number[] = await ankiInvoke("findCards", { query });
  if (cardIds.length === 0) return [];

  const cards: any[] = await ankiInvoke("cardsInfo", { cards: cardIds });
  return cards.map((c: any) => ({
    cardId: c.cardId,
    note: c.note,
    fields: c.fields,
  }));
}

export async function createAnkiNote(
  deckName: string,
  front: string,
  back: string,
  tags?: string[],
): Promise<number | null> {
  const modelName = "Basic";
  const fieldNames: string[] = await ankiInvoke("modelFieldNames", { modelName });
  const frontKey = fieldNames[0] || "Front";
  const backKey = fieldNames[1] || "Back";
  const note: AnkiNote = {
    deckName,
    modelName,
    fields: { [frontKey]: front, [backKey]: back },
    tags,
  };
  return await ankiInvoke("addNote", { note });
}

export async function checkAnkiConnect(port: string): Promise<boolean> {
  try {
    await ankiInvoke("deckNames", {}, 6, port);
    return true;
  } catch {
    return false;
  }
}

export async function getAnkiDecks(): Promise<string[]> {
  return await ankiInvoke("deckNames");
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

async function ensureModelExists(
  modelName: string,
  port: string = "8765",
): Promise<void> {
  const modelNames: string[] = await ankiInvoke("modelNames", {}, 6, port).catch(() => []);
  if (modelNames.includes(modelName)) return;

  await ankiInvoke(
    "createModel",
    {
      modelName: "Basic",
      inOrderFields: ["Front", "Back"],
      css: ".card { font-family: arial; font-size: 20px; text-align: center; color: black; background-color: white; }",
      cardTemplates: [
        {
          Name: "Card 1",
          Front: "{{Front}}",
          Back: "{{FrontSide}}<hr id=\"answer\">{{Back}}",
        },
      ],
    },
    6,
    port,
  );
}

export async function addToAnki(
  section: Section,
  front: string,
  back: string,
  port: string = "8765",
): Promise<number> {
  const deckName = SECTION_DECKS[section];
  await ensureDeckExists(deckName, port);
  await ensureModelExists("Basic", port);

  const fieldNames: string[] = await ankiInvoke("modelFieldNames", { modelName: "Basic" });
  const frontKey = fieldNames[0] || "Front";
  const backKey = fieldNames[1] || "Back";
  const noteFields: Record<string, string> = {
    [frontKey]: front,
    [backKey]: back,
  };

  return await ankiInvoke("addNote", {
    note: {
      deckName,
      modelName: "Basic",
      fields: noteFields,
      options: {
        allowDuplicate: false,
        duplicateScope: "deck",
        duplicateScopeOptions: { deckName },
      },
      tags: ["vicinae", "japanese", "takoba"],
    },
  }, 6, port);
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
