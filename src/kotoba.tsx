import { useState, useEffect } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  List,
  getPreferenceValues,
  getSelectedText,
  showToast,
  Toast,
  Icon,
  Color,
  environment,
} from "@vicinae/api";
import { fetch } from "undici";
import { writeFile, unlink } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";

const execAsync = promisify(exec);

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

interface Preferences {
  ankiDeck: string;
  ankiModel: string;
  ankiPort: string;
  elevenlabsApiKey: string;
  elevenlabsVoiceId: string;
  userLanguage: string;
  showTranslationImage: boolean;
  gcsApiKey: string;
  gcsCxId: string;
  autoLoadText: boolean;
}

interface JotobaReading {
  kana: string;
  kanji?: string;
  furigana?: string;
}

interface JotobaSense {
  glosses: string[];
  pos?: Array<Record<string, string>>;
  language: string;
}

interface PitchItem {
  part: string;
  high: boolean;
}

interface JotobaWord {
  reading: JotobaReading;
  common: boolean;
  senses: JotobaSense[];
  audio?: string;
  pitch?: PitchItem[];
}

interface JotobaKanji {
  literal: string;
  meanings: string[];
  grade: number;
  stroke_count: number;
  frequency: number;
  jlpt: number;
  onyomi: string[];
  kunyomi: string[];
  parts: string[];
  radical: string;
}

interface JotobaSentence {
  content: string;
  furigana?: string;
  translation: string;
  language: string;
  eng?: string;
}

interface SearchResults {
  words: JotobaWord[];
  kanji: JotobaKanji[];
  translation: string | null;
  imageUrl: string | null;
}

// ────────────────────────────────────────────
// Jotoba API client
// ────────────────────────────────────────────

const JOTOBA_BASE = "https://jotoba.de/api";

async function searchWords(
  query: string,
  language: string,
): Promise<JotobaWord[]> {
  const res = await fetch(`${JOTOBA_BASE}/search/words`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      language,
      no_english: false,
    }),
  });
  const data = (await res.json()) as any;
  return (data.words || []) as JotobaWord[];
}

async function searchKanji(
  query: string,
  language: string,
): Promise<JotobaKanji[]> {
  const res = await fetch(`${JOTOBA_BASE}/search/kanji`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, language }),
  });
  const data = (await res.json()) as any;
  return (data.kanji || []) as JotobaKanji[];
}

async function fetchSentences(
  query: string,
  language: string,
): Promise<JotobaSentence[]> {
  const res = await fetch(`${JOTOBA_BASE}/search/sentences`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      language,
      no_english: false,
    }),
  });
  const data = (await res.json()) as any;
  return (data.sentences || []) as JotobaSentence[];
}

const LANGUAGE_CODE_MAP: Record<string, string> = {
  English: "en",
  Spanish: "es",
  German: "de",
  French: "fr",
  Russian: "ru",
  Dutch: "nl",
  Swedish: "sv",
  Hungarian: "hu",
  Slovenian: "sl",
};

async function translateViaGoogle(
  query: string,
  language: string,
): Promise<string | null> {
  const targetLang = LANGUAGE_CODE_MAP[language] || "en";
  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=${targetLang}&dt=t&q=${encodeURIComponent(query)}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    if (!data || !Array.isArray(data) || !data[0] || !data[0][0]) return null;
    return data[0][0][0] as string;
  } catch {
    return null;
  }
}

async function searchTranslationImage(
  query: string,
  apiKey: string,
  cxId: string,
): Promise<string | null> {
  if (!apiKey || !cxId) return null;
  try {
    const res = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cxId}&q=${encodeURIComponent(query)}&searchType=image&num=1&safe=active`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    return data?.items?.[0]?.link || null;
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────
// Anki helpers
// ────────────────────────────────────────────

async function checkAnkiConnect(port: string = "8765"): Promise<boolean> {
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

async function checkModelExists(
  modelName: string,
  port: string = "8765",
): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${port}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "modelNames", version: 6 }),
    });
    const data = (await res.json()) as any;
    return (data.result || []).includes(modelName);
  } catch {
    return false;
  }
}

async function getModelFields(
  modelName: string,
  port: string = "8765",
): Promise<string[]> {
  try {
    const res = await fetch(`http://localhost:${port}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "modelFieldNames",
        version: 6,
        params: { modelName },
      }),
    });
    const data = (await res.json()) as any;
    return data.result || [];
  } catch {
    return [];
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

async function addToAnki(
  deckName: string,
  modelName: string,
  front: string,
  back: string,
  port: string = "8765",
): Promise<void> {
  await ensureDeckExists(deckName, port);

  const modelExists = await checkModelExists(modelName, port);
  if (!modelExists) {
    throw new Error(
      `Model "${modelName}" does not exist in Anki. Please check your preferences.`,
    );
  }

  const fields = await getModelFields(modelName, port);

  if (fields.length < 2) {
    throw new Error(`Model "${modelName}" needs at least 2 fields`);
  }

  const noteFields: Record<string, string> = {};

  if (fields.includes("Front")) noteFields["Front"] = front;
  else if (fields.includes("Expression")) noteFields["Expression"] = front;
  else if (fields.includes("Word")) noteFields["Word"] = front;
  else noteFields[fields[0]] = front;

  const frontFieldName = Object.keys(noteFields)[0];

  if (fields.includes("Back")) noteFields["Back"] = back;
  else if (fields.includes("Meaning")) noteFields["Meaning"] = back;
  else if (fields.includes("Translation")) noteFields["Translation"] = back;
  else noteFields[fields[1]] = back;

  // Pre-check: findNotes to detect duplicates per deck
  const frontValue = noteFields[frontFieldName];
  const findRes = await fetch(`http://localhost:${port}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "findNotes",
      version: 6,
      params: {
        query: `deck:"${deckName}" "${frontValue.replace(/"/g, '\\"')}"`,
      },
    }),
  });
  const findData = (await findRes.json()) as any;
  if (findData.error) throw new Error(findData.error);
  if (findData.result && findData.result.length > 0) {
    throw new Error("DUPLICATE");
  }

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
          tags: ["vicinae", "japanese", "kotoba"],
        },
      },
    }),
  });

  const result = (await res.json()) as any;

  if (result.error) throw new Error(result.error);
  if (!result.result)
    throw new Error("Failed to add note - check Anki error log.");
}

// ────────────────────────────────────────────
// ElevenLabs TTS
// ────────────────────────────────────────────

async function playElevenLabsAudio(
  text: string,
  apiKey: string,
  voiceId: string,
): Promise<void> {
  if (!apiKey) {
    throw new Error("ElevenLabs API key not configured");
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${errText}`);
  }

  const audioBuffer = await res.arrayBuffer();
  const audioData = Buffer.from(audioBuffer);

  if (audioData.length === 0) throw new Error("Empty audio generated");

  const tempDir = environment.supportPath;
  const audioPath = join(tempDir, `kotoba_tts_${Date.now()}.mp3`);
  await writeFile(audioPath, audioData);

  let playCommand = "";
  try {
    await execAsync("which ffplay");
    playCommand = `ffplay -nodisp -autoexit "${audioPath}" 2>/dev/null`;
  } catch {
    try {
      await execAsync("which mpv");
      playCommand = `mpv --no-video --really-quiet "${audioPath}"`;
    } catch {
      try {
        await execAsync("which afplay");
        playCommand = `afplay "${audioPath}"`;
      } catch {
        await unlink(audioPath).catch(() => {});
        throw new Error("No audio player found (install ffplay or mpv)");
      }
    }
  }

  exec(playCommand, async (err) => {
    await unlink(audioPath).catch(() => {});
    if (err) console.error("Error playing audio:", err);
  });
}

// ────────────────────────────────────────────
// Helper functions
// ────────────────────────────────────────────

/** Format word title: 日本語【にほんご】 or just にほんご */
function formatWordTitle(word: JotobaWord): string {
  const { reading } = word;
  if (reading.kanji && reading.kanji !== reading.kana) {
    return `${reading.kanji}【${reading.kana}】`;
  }
  return reading.kana;
}

/** Get definition in user's preferred language, fallback to English */
function getBestSense(
  word: JotobaWord,
  language: string,
): { glosses: string[]; language: string; pos?: string } {
  const langSense = word.senses.find((s) => s.language === language);
  if (langSense) {
    return {
      glosses: langSense.glosses,
      language,
      pos: formatPOS(langSense.pos),
    };
  }
  const engSense = word.senses.find((s) => s.language === "English");
  if (engSense) {
    return {
      glosses: engSense.glosses,
      language: "English",
      pos: formatPOS(engSense.pos),
    };
  }
  if (word.senses.length > 0) {
    return {
      glosses: word.senses[0].glosses,
      language: word.senses[0].language,
      pos: formatPOS(word.senses[0].pos),
    };
  }
  return { glosses: [], language: "" };
}

function formatPOS(
  pos?: Array<Record<string, string>>,
): string | undefined {
  if (!pos || pos.length === 0) return undefined;
  const posNames: Record<string, string> = {
    Noun: "Noun",
    Verb: "Verb",
    Adjective: "Adjective",
    Adverb: "Adverb",
    Particle: "Particle",
    Prefix: "Prefix",
    Suffix: "Suffix",
    Interjection: "Interjection",
    Pronoun: "Pronoun",
    Conjunction: "Conjunction",
    AuxilaryVerb: "Auxiliary Verb",
    Expr: "Expression",
    Counter: "Counter",
    Numeric: "Numeric",
    Unclassified: "Unclassified",
  };
  const entries = pos.flatMap((p) => Object.entries(p));
  return entries
    .map(([cat]) => posNames[cat] || cat)
    .join(", ");
}

function formatKanjiReadings(onyomi?: string[], kunyomi?: string[]): string {
  const parts: string[] = [];
  if (onyomi && onyomi.length > 0) parts.push(`On: ${onyomi.join("・")}`);
  if (kunyomi && kunyomi.length > 0) parts.push(`Kun: ${kunyomi.join("・")}`);
  return parts.join(" | ");
}

function buildWordDetailMarkdown(
  word: JotobaWord,
  sense: { glosses: string[]; language: string; pos?: string },
): string {
  const lines: string[] = [];

  lines.push(`# ${formatWordTitle(word)}`);

  if (sense.pos) {
    lines.push(`\n${sense.pos}`);
  }

  lines.push(`\n${sense.glosses.join("; ")}`);

  return lines.join("\n");
}

function buildWordFullDetailMarkdown(
  word: JotobaWord,
  sense: { glosses: string[]; language: string; pos?: string },
  sentences: JotobaSentence[],
): string {
  let md = buildWordDetailMarkdown(word, sense);

  if (word.pitch && word.pitch.length > 0) {
    const pitchStr = word.pitch
      .map((p) => (p.high ? `**${p.part}**` : p.part))
      .join("");
    md += `\n\n**Pitch:** ${pitchStr}`;
  }

  if (sentences.length > 0) {
    md += `\n\n---\n\n## Example Sentences\n\n`;
    md += sentences
      .map((s) => {
        const eng = s.eng ? ` (${s.eng})` : "";
        return `- ${s.content} → ${s.translation}${eng}`;
      })
      .join("\n");
  }

  return md;
}

function buildKanjiMarkdown(kanji: JotobaKanji): string {
  const lines: string[] = [];
  lines.push(`# ${kanji.literal}`);

  lines.push(`\n${kanji.meanings.join(", ")}`);

  const readings: string[] = [];
  if (kanji.onyomi && kanji.onyomi.length > 0)
    readings.push(`**On'yomi:** ${kanji.onyomi.join("・")}`);
  if (kanji.kunyomi && kanji.kunyomi.length > 0)
    readings.push(`**Kun'yomi:** ${kanji.kunyomi.join("・")}`);
  if (readings.length > 0) lines.push(`\n${readings.join(" | ")}`);

  const details: string[] = [];
  details.push(`JLPT N${kanji.jlpt}`);
  details.push(`Grade ${kanji.grade}`);
  details.push(`${kanji.stroke_count} strokes`);
  details.push(`Freq: #${kanji.frequency}`);
  if (kanji.radical) details.push(`Radical: ${kanji.radical}`);
  lines.push(`\n${details.join(" · ")}`);

  const imgUrl = `https://jotoba.de/resource/kanji/frames/${encodeURIComponent(kanji.literal)}`;
  lines.push(`\n\n![Stroke Order](${imgUrl})`);

  return lines.join("\n");
}

// ────────────────────────────────────────────
// Components
// ────────────────────────────────────────────

function WordListItem({
  word,
  language,
  preferences,
}: {
  word: JotobaWord;
  language: string;
  preferences: Preferences;
}) {
  const [sentences, setSentences] = useState<JotobaSentence[]>([]);
  const [sentencesLoading, setSentencesLoading] = useState(false);
  const sense = getBestSense(word, language);
  const title = formatWordTitle(word);
  const subtitle = sense.glosses[0];
  const detailMd = buildWordFullDetailMarkdown(
    word,
    sense,
    sentences,
  );

  useEffect(() => {
    let cancelled = false;
    const query = word.reading.kanji || word.reading.kana;
    if (query && sentences.length === 0 && !sentencesLoading) {
      setSentencesLoading(true);
      fetchSentences(query, language).then((s) => {
        if (!cancelled) {
          setSentences(s);
          setSentencesLoading(false);
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const ankiBack = (() => {
    const parts: string[] = [];
    if (sense.pos) parts.push(sense.pos);
    parts.push(sense.glosses.join("; "));
    if (sentences.length > 0) {
      parts.push(
        "",
        "Example Sentences:",
        ...sentences.map(
          (s) => `${s.content} → ${s.translation}`,
        ),
      );
    }
    return parts.join("\n\n");
  })();

  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      icon={
        word.common
          ? { source: Icon.Dot, tintColor: Color.Green }
          : undefined
      }
      detail={
        <List.Item.Detail
          markdown={detailMd}
        />
      }
      actions={
        <ActionPanel>
          <Action
            title="Add to Anki"
            icon={{ source: Icon.Plus, tintColor: Color.Green }}
            shortcut={{ modifiers: ["cmd"], key: "a" }}
            onAction={async () => {
              const query = word.reading.kanji || word.reading.kana;
              if (!query) return;
              const isConnected = await checkAnkiConnect(
                preferences.ankiPort,
              );
              if (!isConnected) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Anki not connected",
                  message: `Make sure Anki is running with AnkiConnect on port ${preferences.ankiPort}`,
                });
                return;
              }
              try {
                await addToAnki(
                  preferences.ankiDeck,
                  preferences.ankiModel,
                  title,
                  ankiBack,
                  preferences.ankiPort,
                );
                await showToast({
                  style: Toast.Style.Success,
                  title: "Added to Anki! ✅",
                  message: `Card added to ${preferences.ankiDeck}`,
                });
              } catch (error) {
                const msg = String(error).toLowerCase();
                if (msg.includes("duplicate")) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Ya está en el mazo",
                    message: `"${preferences.ankiDeck}" ya tiene esta tarjeta`,
                  });
                } else {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Error al agregar",
                    message: String(error),
                  });
                }
              }
            }}
          />
          <Action
            title="Play Audio"
            icon={{ source: Icon.SpeakerOn, tintColor: Color.Blue }}
            shortcut={{ modifiers: ["cmd"], key: "p" }}
            onAction={async () => {
              const text = word.reading.kana;
              try {
                await playElevenLabsAudio(
                  text,
                  preferences.elevenlabsApiKey,
                  preferences.elevenlabsVoiceId,
                );
                await showToast({
                  style: Toast.Style.Success,
                  title: "Playing audio! 🔊",
                });
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to play audio",
                  message: String(error),
                });
              }
            }}
          />
          <ActionPanel.Section title="Copy">
            <Action
              title="Copy Word"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={async () => {
                await Clipboard.copy(title);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Copied!",
                });
              }}
            />
            <Action
              title="Copy Definition"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={async () => {
                await Clipboard.copy(sense.glosses.join("; "));
                await showToast({
                  style: Toast.Style.Success,
                  title: "Copied!",
                });
              }}
            />
          </ActionPanel.Section>
          <Action
            title="Open on Jotoba"
            icon={Icon.Globe}
            onAction={async () => {
              const query = word.reading.kanji || word.reading.kana;
              exec(`xdg-open "https://jotoba.de/search/${encodeURIComponent(query)}"`);
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function KanjiListItem({
  kanji,
  preferences,
}: {
  kanji: JotobaKanji;
  preferences: Preferences;
}) {
  const title = kanji.literal;
  const subtitle = formatKanjiReadings(kanji.onyomi, kanji.kunyomi);
  const detailMd = buildKanjiMarkdown(kanji);

  const ankiBack = [
    kanji.meanings.join(", "),
    "",
    ...(kanji.onyomi?.length ? [`On'yomi: ${kanji.onyomi.join("・")}`] : []),
    ...(kanji.kunyomi?.length ? [`Kun'yomi: ${kanji.kunyomi.join("・")}`] : []),
    "",
    `JLPT N${kanji.jlpt} · Grade ${kanji.grade} · ${kanji.stroke_count} strokes`,
  ].join("\n");

  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      detail={
        <List.Item.Detail
          markdown={detailMd}
        />
      }
      actions={
        <ActionPanel>
          <Action
            title="Add to Anki"
            icon={{ source: Icon.Plus, tintColor: Color.Green }}
            shortcut={{ modifiers: ["cmd"], key: "a" }}
            onAction={async () => {
              const isConnected = await checkAnkiConnect(
                preferences.ankiPort,
              );
              if (!isConnected) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Anki not connected",
                  message: `Make sure Anki is running with AnkiConnect on port ${preferences.ankiPort}`,
                });
                return;
              }
              try {
                await addToAnki(
                  preferences.ankiDeck,
                  preferences.ankiModel,
                  `「${kanji.literal}」 - ${kanji.meanings[0] || ""}`,
                  ankiBack,
                  preferences.ankiPort,
                );
                await showToast({
                  style: Toast.Style.Success,
                  title: "Added to Anki! ✅",
                  message: `Card added to ${preferences.ankiDeck}`,
                });
              } catch (error) {
                const msg = String(error).toLowerCase();
                if (msg.includes("duplicate")) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Ya está en el mazo",
                    message: `"${preferences.ankiDeck}" ya tiene esta tarjeta`,
                  });
                } else {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Error al agregar",
                    message: String(error),
                  });
                }
              }
            }}
          />
          <ActionPanel.Section title="Copy">
            <Action
              title="Copy Kanji"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={async () => {
                await Clipboard.copy(kanji.literal);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Copied!",
                });
              }}
            />
            <Action
              title="Copy Meanings"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={async () => {
                await Clipboard.copy(kanji.meanings.join(", "));
                await showToast({
                  style: Toast.Style.Success,
                  title: "Copied!",
                });
              }}
            />
          </ActionPanel.Section>
          <Action
            title="Open on Jotoba"
            icon={Icon.Globe}
            onAction={() => {
              exec(
                `xdg-open "https://jotoba.de/search/${encodeURIComponent(kanji.literal)}"`,
              );
            }}
          />
        </ActionPanel>
      }
    />
  );
}

// ────────────────────────────────────────────
// Main Command
// ────────────────────────────────────────────

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const userLang = preferences.userLanguage || "Spanish";

  const [searchText, setSearchText] = useState("");
  const [debouncedText, setDebouncedText] = useState("");
  const [results, setResults] = useState<SearchResults>({
    words: [],
    kanji: [],
    translation: null,
    imageUrl: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const loadInitialText = async () => {
      try {
        const selectedText = await getSelectedText();
        if (selectedText) {
          setSearchText(selectedText);
          return;
        }
      } catch {}
      try {
        const clipboardText = await Clipboard.readText();
        if (clipboardText && preferences.autoLoadText) {
          setSearchText(clipboardText);
        }
      } catch {}
    };
    loadInitialText();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedText(searchText.trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    if (!debouncedText) {
      setResults({ words: [], kanji: [], translation: null, imageUrl: null });
      setHasSearched(false);
      return;
    }

    const doSearch = async () => {
      setIsLoading(true);
      setHasSearched(true);
      try {
        const [words, kanji, translation, imageUrl] = await Promise.all([
          searchWords(debouncedText, userLang),
          searchKanji(debouncedText, userLang),
          translateViaGoogle(debouncedText, userLang),
          preferences.showTranslationImage
            ? searchTranslationImage(debouncedText, preferences.gcsApiKey, preferences.gcsCxId)
            : Promise.resolve(null),
        ]);
        setResults({ words, kanji, translation, imageUrl });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    };

    doSearch();
  }, [debouncedText, userLang]);

  const hasResults = results.words.length > 0 || results.kanji.length > 0;

  const showTranslation = !!results.translation;

  return (
    <List
      searchBarPlaceholder="Search Japanese words, kanji, or phrases..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      isShowingDetail={hasResults}
    >
      {!hasSearched ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Kotoba"
          description="Type a word, kanji, or phrase to search"
        />
      ) : !hasResults && !showTranslation ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No results found"
          description={`No results for "${debouncedText}"`}
        />
      ) : (
        <>
          {showTranslation && results.translation && (
            <List.Section title="Translation">
              <List.Item
                title={results.translation}
                subtitle="→"
                icon={{ source: Icon.Text, tintColor: Color.Yellow }}
                detail={
                  <List.Item.Detail
                    markdown={`> ${results.translation}\n\n---\n\n${debouncedText}${results.imageUrl ? `\n\n![Translation Image](${results.imageUrl})` : ""}`}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action
                      title="Add Translated Sentence to Anki"
                      icon={{ source: Icon.Plus, tintColor: Color.Green }}
                      shortcut={{ modifiers: ["cmd"], key: "a" }}
                      onAction={async () => {
                        const isConnected = await checkAnkiConnect(
                          preferences.ankiPort,
                        );
                        if (!isConnected) {
                          await showToast({
                            style: Toast.Style.Failure,
                            title: "Anki not connected",
                          });
                          return;
                        }
                        try {
                          await addToAnki(
                            preferences.ankiDeck,
                            preferences.ankiModel,
                            debouncedText,
                            `${results.translation}`,
                            preferences.ankiPort,
                          );
                          await showToast({
                            style: Toast.Style.Success,
                            title: "Added to Anki! ✅",
                          });
                        } catch (error) {
                          const msg = String(error).toLowerCase();
                          if (msg.includes("duplicate")) {
                            await showToast({
                              style: Toast.Style.Failure,
                              title: "Ya está en el mazo",
                              message: `"${preferences.ankiDeck}" ya tiene esta tarjeta`,
                            });
                          } else {
                            await showToast({
                              style: Toast.Style.Failure,
                              title: "Error al agregar",
                              message: String(error),
                            });
                          }
                        }
                      }}
                    />
                    <Action
                      title="Play Audio"
                      icon={{ source: Icon.SpeakerOn, tintColor: Color.Blue }}
                      shortcut={{ modifiers: ["cmd"], key: "p" }}
                      onAction={async () => {
                        try {
                          await playElevenLabsAudio(
                            debouncedText,
                            preferences.elevenlabsApiKey,
                            preferences.elevenlabsVoiceId,
                          );
                          await showToast({
                            style: Toast.Style.Success,
                            title: "Playing audio! 🔊",
                          });
                        } catch (error) {
                          await showToast({
                            style: Toast.Style.Failure,
                            title: "Failed to play audio",
                            message: String(error),
                          });
                        }
                      }}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}

          {results.words.length > 0 && (
            <List.Section
              title="Words"
              subtitle={`${results.words.length}`}
            >
              {results.words.map((word, idx) => (
                <WordListItem
                  key={`word-${word.reading.kanji || word.reading.kana}-${idx}`}
                  word={word}
                  language={userLang}
                  preferences={preferences}
                />
              ))}
            </List.Section>
          )}

          {results.kanji.length > 0 && (
            <List.Section
              title="Kanji"
              subtitle={`${results.kanji.length}`}
            >
              {results.kanji.map((kanji, idx) => (
                <KanjiListItem
                  key={`kanji-${kanji.literal}-${idx}`}
                  kanji={kanji}
                  preferences={preferences}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
