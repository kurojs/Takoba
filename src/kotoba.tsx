import { useState, useEffect, useCallback } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  List,
  Detail,
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
// Localization
// ────────────────────────────────────────────

const LANGUAGES = [
  "English", "Spanish", "German", "French",
  "Russian", "Swedish", "Dutch", "Hungarian", "Slovenian",
] as const;

type Lang = (typeof LANGUAGES)[number];

const UI: Record<string, Record<string, string>> = {
  English: {
    translation: "Translation",
    words: "Words",
    kanji: "Kanji",
    pitch: "Pitch",
    onyomi: "On'yomi",
    kunyomi: "Kun'yomi",
    strokeOrder: "Stroke Order",
    grade: "Grade",
    strokes: "strokes",
    freq: "Freq",
    radical: "Radical",
    exampleSentences: "Example Sentences",
    addToAnki: "Add to Anki",
    addSentenceToAnki: "Add Translated Sentence to Anki",
    playAudio: "Play Audio",
    copy: "Copy",
    copyWord: "Copy Word",
    copyDefinition: "Copy Definition",
    copyKanji: "Copy Kanji",
    copyMeanings: "Copy Meanings",
    openOnJotoba: "Open on Jotoba",
    viewStrokeOrder: "View Stroke Order",
    copied: "Copied!",
    addedToAnki: "Added to Anki! ✅",
    playingAudio: "Playing audio! 🔊",
    ankiNotConnected: "Anki not connected",
    ankiNotConnectedMsg: "Make sure Anki is running with AnkiConnect on port {port}",
    cardAddedMsg: "Card added to {deck}",
    search: "Search Kotoba",
    searchPlaceholder: "Search Japanese words, kanji, or phrases...",
    noResults: "No results found",
    noResultsMsg: "No results for \"{query}\"",
    typeToSearch: "Type a word, kanji, or phrase to search",
    alreadyInDeck: "Ya está en el mazo",
    alreadyInDeckMsg: "\"{deck}\" already has this card",
    errorAdding: "Error adding to Anki",
    errorAddingMsg: "{msg}",
    failPlayAudio: "Failed to play audio",
    copyResponse: "Copy Response",
    explainWithAI: "Explain with AI",
    aiLoading: "Generating explanation",
  },
  Spanish: {
    translation: "Traducción",
    words: "Palabras",
    kanji: "Kanji",
    pitch: "Acento",
    onyomi: "On'yomi",
    kunyomi: "Kun'yomi",
    strokeOrder: "Orden de Trazos",
    grade: "Grado",
    strokes: "trazos",
    freq: "Frec",
    radical: "Radical",
    exampleSentences: "Oraciones de Ejemplo",
    addToAnki: "Agregar a Anki",
    addSentenceToAnki: "Agregar Oración a Anki",
    playAudio: "Reproducir Audio",
    copy: "Copiar",
    copyWord: "Copiar Palabra",
    copyDefinition: "Copiar Definición",
    copyKanji: "Copiar Kanji",
    copyMeanings: "Copiar Significados",
    openOnJotoba: "Abrir en Jotoba",
    viewStrokeOrder: "Ver Orden de Trazos",
    copied: "¡Copiado!",
    addedToAnki: "¡Agregado a Anki! ✅",
    playingAudio: "¡Reproduciendo audio! 🔊",
    ankiNotConnected: "Anki no conectado",
    ankiNotConnectedMsg: "Asegurate que Anki esté corriendo con AnkiConnect en puerto {port}",
    cardAddedMsg: "Tarjeta agregada a {deck}",
    search: "Buscar Kotoba",
    searchPlaceholder: "Buscá palabras, kanji o frases en japonés...",
    noResults: "Sin resultados",
    noResultsMsg: "Sin resultados para \"{query}\"",
    typeToSearch: "Escribí una palabra, kanji o frase para buscar",
    alreadyInDeck: "Ya está en el mazo",
    alreadyInDeckMsg: "\"{deck}\" ya tiene esta tarjeta",
    errorAdding: "Error al agregar",
    errorAddingMsg: "{msg}",
    failPlayAudio: "Error al reproducir audio",
    copyResponse: "Copiar Respuesta",
    explainWithAI: "Explicar con IA",
    aiLoading: "Generando explicación",
  },
};

function t(key: string, lang: Lang): string {
  return UI[lang]?.[key] ?? UI.English[key] ?? key;
}

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

interface Preferences {
  ankiDeck: string;
  ankiModel: string;
  ankiPort: string;
  elevenlabsApiKey: string;
  elevenlabsVoiceId: string;
  elevenlabsAiVoiceId: string;
  userLanguage: string;
  showTranslationImage: boolean;
  ankiIncludeImage: boolean;
  autoLoadText: boolean;
  geminiApiKey: string;
  geminiModel: string;
  geminiCustomPrompt: string;
  geminiAiLanguage: string;
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

async function translateText(
  text: string,
  from: string,
  to: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    return data?.[0]?.[0]?.[0] || null;
  } catch {
    return null;
  }
}

async function searchWikiImage(query: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&format=json&origin=*`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const pages = data?.query?.pages;
    if (!pages) return null;
    const pageId = Object.keys(pages)[0];
    return pages[pageId]?.imageinfo?.[0]?.url || null;
  } catch {
    return null;
  }
}

function imageSearchTerm(debouncedText: string, firstWord: JotobaWord | undefined): string {
  if (firstWord && /[\u4e00-\u9fff\u3400-\u4dbf]/.test(debouncedText)) {
    return firstWord.senses[0]?.glosses[0] || debouncedText;
  }
  return debouncedText;
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
  language?: string,
): Promise<void> {
  if (!apiKey) {
    throw new Error("ElevenLabs API key not configured");
  }

  const body: Record<string, any> = {
    text,
    model_id: "eleven_multilingual_v2",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.5,
    },
  };
  if (language) body.language = language;

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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

  lines.push(`\n${sense.glosses.join("; ")}`);

  return lines.join("\n");
}

function buildWordFullDetailMarkdown(
  word: JotobaWord,
  sense: { glosses: string[]; language: string; pos?: string },
  sentences: JotobaSentence[],
  lang: Lang,
): string {
  let md = buildWordDetailMarkdown(word, sense);

  if (word.pitch && word.pitch.length > 0) {
    const parts: string[] = [];
    let hasRisen = false;
    for (const p of word.pitch) {
      if (p.high && !hasRisen) {
        parts.push(`↑${p.part}`);
        hasRisen = true;
      } else if (!p.high && hasRisen) {
        parts.push(`↘${p.part}`);
        hasRisen = false;
      } else {
        parts.push(p.part);
      }
    }
    md += `\n\n**${t("pitch", lang)}:** ${parts.join("")}`;
  }

  if (sentences.length > 0) {
    md += `\n\n---\n\n## ${t("exampleSentences", lang)}\n\n`;
    md += sentences
      .map((s) => `${s.content}<br>${s.translation}`)
      .join("<br><br>");
  }

  return md;
}

function buildKanjiMarkdown(kanji: JotobaKanji, lang: Lang, meaningOverride?: string): string {
  const lines: string[] = [];
  lines.push(`# ${kanji.literal}`);
  lines.push(`\n${meaningOverride || kanji.meanings.join(", ")}`);

  if (kanji.onyomi && kanji.onyomi.length > 0)
    lines.push(`\n**On:** ${kanji.onyomi.join("・")}`);
  if (kanji.kunyomi && kanji.kunyomi.length > 0)
    lines.push(`\n**Kun:** ${kanji.kunyomi.join("・")}`);

  const details: string[] = [];
  details.push(`JLPT N${kanji.jlpt} · ${t("grade", lang)} ${kanji.grade} · ${kanji.stroke_count} ${t("strokes", lang)}`);
  if (kanji.frequency) details.push(`${t("freq", lang)}: #${kanji.frequency}`);
  if (kanji.radical) details.push(`${t("radical", lang)}: ${kanji.radical}`);
  lines.push(`\n${details.join(" · ")}`);

  const imgUrl = `https://jotoba.de/resource/kanji/frames/${encodeURIComponent(kanji.literal)}`;
  lines.push(`\n\n[![](${imgUrl})](${imgUrl})`);

  return lines.join("\n");
}

// ────────────────────────────────────────────
// Gemini AI
// ────────────────────────────────────────────

const INTERNAL_SYSTEM_PROMPT = `You are a helpful Japanese language learning assistant. Provide clear, pedagogical explanations about Japanese words, kanji, phrases, and grammar.

Structure each response based on what is being asked:
- **Words**: reading (kana), meaning, common usage, and a short example sentence
- **Kanji**: meaning, on'yomi / kun'yomi, common words that use it, visual components breakdown
- **Phrases / Grammar**: meaning, structure/formation, when to use it, and examples
- **General text**: brief summary, key vocabulary breakdown, grammar points

Keep explanations concise but informative. Use examples to illustrate. Be encouraging. Format your response in clean markdown with clear sections.`;

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

async function queryGemini(
  query: string,
  apiKey: string,
  model: string,
  customPrompt: string,
  language: string,
): Promise<string> {
  const contents: { role: string; parts: { text: string }[] }[] = [];

  if (customPrompt.trim()) {
    contents.push({ role: "user", parts: [{ text: customPrompt.trim() }] });
    contents.push({ role: "model", parts: [{ text: "Understood. I will follow these instructions for every response." }] });
  }

  const systemMsg = `${INTERNAL_SYSTEM_PROMPT}\n\nRespond in ${language}.`;
  contents.push({ role: "user", parts: [{ text: systemMsg }] });
  contents.push({ role: "model", parts: [{ text: "Understood. I'll provide clear pedagogical explanations." }] });

  contents.push({ role: "user", parts: [{ text: query }] });

  const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errBody}`);
  }

  const data = (await res.json()) as any;
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ No response from AI";
}

function AIExplainView({
  query,
  geminiApiKey,
  model,
  customPrompt,
  aiLanguage,
  elevenlabsApiKey,
  aiVoiceId,
  lang,
  onBack,
}: {
  query: string;
  geminiApiKey: string;
  model: string;
  customPrompt: string;
  aiLanguage: string;
  elevenlabsApiKey: string;
  aiVoiceId: string;
  lang: Lang;
  onBack: () => void;
}) {
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    queryGemini(query, geminiApiKey, model, customPrompt, aiLanguage)
      .then((text) => {
        if (!cancelled) setResponse(text);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (isLoading) {
    return (
      <Detail
        markdown={`<br><br><br><br><br><br><center>_${t("aiLoading", lang)}…_</center>`}
        actions={
          <ActionPanel>
            <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} />
          </ActionPanel>
        }
      />
    );
  }

  if (error) {
    return (
      <Detail
        markdown={`# ❌ ${t("errorAdding", lang)}\n\n\`\`\`\n${error}\n\`\`\``}
        actions={
          <ActionPanel>
            <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      markdown={response}
      actions={
        <ActionPanel>
          <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} />
          {aiVoiceId && (
            <Action
              title={t("playAudio", lang)}
              icon={{ source: Icon.SpeakerOn, tintColor: Color.Blue }}
              shortcut={{ modifiers: [], key: "return" }}
              onAction={async () => {
                try {
                  await playElevenLabsAudio(
                    response.replace(/[*#\[\]`>|_~-]/g, "").slice(0, 2000),
                    elevenlabsApiKey,
                    aiVoiceId,
                  );
                  await showToast({
                    style: Toast.Style.Success,
                    title: t("playingAudio", lang),
                  });
                } catch (e) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: t("failPlayAudio", lang),
                    message: String(e),
                  });
                }
            }}
          />
          )}
          <Action
            title={t("copyResponse", lang)}
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onAction={async () => {
              await Clipboard.copy(response);
              await showToast({ style: Toast.Style.Success, title: t("copied", lang) });
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
  lang,
  onRequestAI,
}: {
  kanji: JotobaKanji;
  preferences: Preferences;
  lang: Lang;
  onRequestAI: (query: string) => void;
}) {
  const [translatedMeaning, setTranslatedMeaning] = useState("");
  const title = kanji.literal;
  const subtitle = formatKanjiReadings(kanji.onyomi, kanji.kunyomi);
  const detailMd = buildKanjiMarkdown(kanji, lang, translatedMeaning || undefined);

  useEffect(() => {
    if (lang === "English") return;
    let cancelled = false;
    translateText(
      kanji.meanings.join(", "),
      "en",
      LANGUAGE_CODE_MAP[lang] || "en",
    ).then((t) => {
      if (!cancelled && t) setTranslatedMeaning(t);
    });
    return () => { cancelled = true; };
  }, []);

  const ankiBack = [
    kanji.meanings.join(", "),
    "",
    ...(kanji.onyomi?.length ? [`${t("onyomi", lang)}: ${kanji.onyomi.join("・")}`] : []),
    ...(kanji.kunyomi?.length ? [`${t("kunyomi", lang)}: ${kanji.kunyomi.join("・")}`] : []),
    "",
    `JLPT N${kanji.jlpt} · ${t("grade", lang)} ${kanji.grade} · ${kanji.stroke_count} ${t("strokes", lang)}`,
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
            title={t("addToAnki", lang)}
            icon={{ source: Icon.Plus, tintColor: Color.Green }}
            shortcut={{ modifiers: ["cmd"], key: "a" }}
            onAction={async () => {
              const isConnected = await checkAnkiConnect(
                preferences.ankiPort,
              );
              if (!isConnected) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: t("ankiNotConnected", lang),
                  message: t("ankiNotConnectedMsg", lang).replace("{port}", String(preferences.ankiPort)),
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
                  title: t("addedToAnki", lang),
                  message: t("cardAddedMsg", lang).replace("{deck}", preferences.ankiDeck),
                });
              } catch (error) {
                const msg = String(error).toLowerCase();
                if (msg.includes("duplicate")) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: t("alreadyInDeck", lang),
                    message: t("alreadyInDeckMsg", lang).replace("{deck}", preferences.ankiDeck),
                  });
                } else {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: t("errorAdding", lang),
                    message: String(error),
                  });
                }
              }
            }}
          />
          {preferences.geminiApiKey && (
            <Action
              title={t("explainWithAI", lang)}
              icon={{ source: Icon.Wand, tintColor: Color.Purple }}
              shortcut={{ modifiers: [], key: "tab" }}
              onAction={() => onRequestAI(kanji.literal)}
            />
          )}
          <Action
            title={t("viewStrokeOrder", lang)}
            icon={Icon.Image}
            onAction={() => {
              const imgUrl = `https://jotoba.de/resource/kanji/frames/${encodeURIComponent(kanji.literal)}`;
              exec(`xdg-open "${imgUrl}"`);
            }}
          />
          <ActionPanel.Section title={t("copy", lang)}>
            <Action
              title={t("copyKanji", lang)}
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={async () => {
                await Clipboard.copy(kanji.literal);
                await showToast({
                  style: Toast.Style.Success,
                  title: t("copied", lang),
                });
              }}
            />
            <Action
              title={t("copyMeanings", lang)}
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={async () => {
                await Clipboard.copy(translatedMeaning || kanji.meanings.join(", "));
                await showToast({
                  style: Toast.Style.Success,
                  title: t("copied", lang),
                });
              }}
            />
          </ActionPanel.Section>
          <Action
            title={t("openOnJotoba", lang)}
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

function WordListItem({
  word,
  lang,
  preferences,
  searchText,
  onRequestAI,
}: {
  word: JotobaWord;
  lang: Lang;
  preferences: Preferences;
  searchText: string;
  onRequestAI: (query: string) => void;
}) {
  const [sentences, setSentences] = useState<JotobaSentence[]>([]);
  const [sentencesLoading, setSentencesLoading] = useState(false);
  const [translatedGlosses, setTranslatedGlosses] = useState<string[]>([]);
  const sense = getBestSense(word, lang);
  const displayGlosses = translatedGlosses.length > 0 ? translatedGlosses : sense.glosses;
  const title = formatWordTitle(word);
  const subtitle = displayGlosses[0];
  const displaySense = { ...sense, glosses: displayGlosses };
  const detailMd = buildWordFullDetailMarkdown(word, displaySense, sentences, lang);

  useEffect(() => {
    let cancelled = false;
    const query = word.reading.kanji || word.reading.kana;
    if (!query || sentences.length > 0 || sentencesLoading) return;
    setSentencesLoading(true);
    (async () => {
      const raw = await fetchSentences(query, lang);
      if (cancelled) return;
      let result = raw;
      if (lang !== "English" && result.length > 0) {
        const pending = result
          .map((s, i) => ({ s, i }))
          .filter(({ s }) => {
            if (s.translation && s.eng && s.translation === s.eng) return true;
            if (s.translation && !/[^\x20-\x7E\s]/.test(s.translation)) return true;
            return false;
          });
        if (pending.length > 0) {
          const code = LANGUAGE_CODE_MAP[lang] || "en";
          for (const p of pending) {
            if (cancelled) return;
            const t = await translateText(p.s.translation, "en", code);
            if (t) result[p.i] = { ...result[p.i], translation: t };
          }
        }
      }
      if (!cancelled) {
        setSentences(result);
        setSentencesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (lang === "English" || sense.language !== "English" || sense.glosses.length === 0) return;
    let cancelled = false;
    translateText(
      sense.glosses.join("; "),
      "en",
      LANGUAGE_CODE_MAP[lang] || "en",
    ).then((t) => {
      if (!cancelled && t) setTranslatedGlosses(t.split(/;\s*/));
    });
    return () => { cancelled = true; };
  }, []);

  const ankiBack = (() => {
    const parts: string[] = [];
    if (displaySense.pos) parts.push(displaySense.pos);
    parts.push(displaySense.glosses.join("; "));
    if (sentences.length > 0) {
      parts.push(
        "",
        "Example Sentences:",
        ...sentences.map((s) => `${s.content} → ${s.translation}`),
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
      detail={<List.Item.Detail markdown={detailMd} />}
      actions={
        <ActionPanel>
          <Action
            title={t("addToAnki", lang)}
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
                  title: t("ankiNotConnected", lang),
                  message: t("ankiNotConnectedMsg", lang).replace("{port}", String(preferences.ankiPort)),
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
                  title: t("addedToAnki", lang),
                  message: t("cardAddedMsg", lang).replace("{deck}", preferences.ankiDeck),
                });
              } catch (error) {
                const msg = String(error).toLowerCase();
                if (msg.includes("duplicate")) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: t("alreadyInDeck", lang),
                    message: t("alreadyInDeckMsg", lang).replace("{deck}", preferences.ankiDeck),
                  });
                } else {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: t("errorAdding", lang),
                    message: String(error),
                  });
                }
              }
            }}
          />
          {preferences.geminiApiKey && (
            <Action
              title={t("explainWithAI", lang)}
              icon={{ source: Icon.Wand, tintColor: Color.Purple }}
              shortcut={{ modifiers: [], key: "tab" }}
              onAction={() => onRequestAI(searchText)}
            />
          )}
          <Action
            title={t("playAudio", lang)}
            icon={{ source: Icon.SpeakerOn, tintColor: Color.Blue }}
            shortcut={{ modifiers: ["cmd"], key: "p" }}
            onAction={async () => {
              const text = word.reading.kana;
              try {
                await playElevenLabsAudio(
                  text,
                  preferences.elevenlabsApiKey,
                  preferences.elevenlabsVoiceId,
                  "ja",
                );
                await showToast({
                  style: Toast.Style.Success,
                  title: t("playingAudio", lang),
                });
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: t("failPlayAudio", lang),
                  message: String(error),
                });
              }
            }}
          />
          <ActionPanel.Section title={t("copy", lang)}>
            <Action
              title={t("copyWord", lang)}
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={async () => {
                await Clipboard.copy(title);
                await showToast({
                  style: Toast.Style.Success,
                  title: t("copied", lang),
                });
              }}
            />
            <Action
              title={t("copyDefinition", lang)}
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={async () => {
                await Clipboard.copy(sense.glosses.join("; "));
                await showToast({
                  style: Toast.Style.Success,
                  title: t("copied", lang),
                });
              }}
            />
          </ActionPanel.Section>
          <Action
            title={t("openOnJotoba", lang)}
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

// ────────────────────────────────────────────
// Main Command
// ────────────────────────────────────────────

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const userLang = (LANGUAGES.includes(preferences.userLanguage as Lang)
    ? preferences.userLanguage
    : "English") as Lang;

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
        const [words, kanji, translation] = await Promise.all([
          searchWords(debouncedText, userLang),
          searchKanji(debouncedText, userLang),
          translateViaGoogle(debouncedText, userLang),
        ]);
        const imageUrl =
          preferences.showTranslationImage
            ? await searchWikiImage(
                imageSearchTerm(debouncedText, words[0]),
              )
            : null;
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
  const [aiQuery, setAiQuery] = useState<string | null>(null);
  const aiLanguage = preferences.geminiAiLanguage || userLang;

  const openAI = useCallback((query: string) => setAiQuery(query), []);
  const closeAI = useCallback(() => setAiQuery(null), []);

  if (aiQuery) {
    return (
      <AIExplainView
        query={aiQuery}
        geminiApiKey={preferences.geminiApiKey}
        model={preferences.geminiModel}
        customPrompt={preferences.geminiCustomPrompt}
        aiLanguage={aiLanguage}
        elevenlabsApiKey={preferences.elevenlabsApiKey}
        aiVoiceId={preferences.elevenlabsAiVoiceId}
        lang={userLang}
        onBack={closeAI}
      />
    );
  }

  return (
    <List
      searchBarPlaceholder={t("searchPlaceholder", userLang)}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      isShowingDetail={hasResults}
    >
      {!hasSearched ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={t("search", userLang)}
          description={t("typeToSearch", userLang)}
        />
      ) : !hasResults && !showTranslation ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={t("noResults", userLang)}
          description={t("noResultsMsg", userLang).replace("{query}", debouncedText)}
        />
      ) : (
        <>
          {showTranslation && results.translation && (
            <List.Section title={t("translation", userLang)}>
              <List.Item
                title={results.translation}
                subtitle="→"
                icon={{ source: Icon.Text, tintColor: Color.Yellow }}
                detail={
                  <List.Item.Detail
                    markdown={`${debouncedText}\n\n---\n\n> ${results.translation}${results.imageUrl ? `\n\n![](${results.imageUrl})` : ""}`}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action
                      title={t("addSentenceToAnki", userLang)}
                      icon={{ source: Icon.Plus, tintColor: Color.Green }}
                      shortcut={{ modifiers: ["cmd"], key: "a" }}
                      onAction={async () => {
                        const isConnected = await checkAnkiConnect(
                          preferences.ankiPort,
                        );
                        if (!isConnected) {
                          await showToast({
                            style: Toast.Style.Failure,
                            title: t("ankiNotConnected", userLang),
                          });
                          return;
                        }
                        try {
                          const backContent = results.imageUrl && preferences.ankiIncludeImage
                            ? `${results.translation}\n\n<img src="${results.imageUrl}">`
                            : `${results.translation}`;
                          await addToAnki(
                            preferences.ankiDeck,
                            preferences.ankiModel,
                            debouncedText,
                            backContent,
                            preferences.ankiPort,
                          );
                          await showToast({
                            style: Toast.Style.Success,
                            title: t("addedToAnki", userLang),
                          });
                        } catch (error) {
                          const msg = String(error).toLowerCase();
                          if (msg.includes("duplicate")) {
                            await showToast({
                              style: Toast.Style.Failure,
                              title: t("alreadyInDeck", userLang),
                              message: t("alreadyInDeckMsg", userLang).replace("{deck}", preferences.ankiDeck),
                            });
                          } else {
                            await showToast({
                              style: Toast.Style.Failure,
                              title: t("errorAdding", userLang),
                              message: String(error),
                            });
                          }
                        }
            }}
          />
          {preferences.geminiApiKey && (
            <Action
              title={t("explainWithAI", userLang)}
              icon={{ source: Icon.Wand, tintColor: Color.Purple }}
              shortcut={{ modifiers: [], key: "tab" }}
              onAction={() => openAI(debouncedText)}
            />
          )}
          <Action
                      title={t("playAudio", userLang)}
                      icon={{ source: Icon.SpeakerOn, tintColor: Color.Blue }}
                      shortcut={{ modifiers: ["cmd"], key: "p" }}
                      onAction={async () => {
                        try {
                          await playElevenLabsAudio(
                            results.words[0]?.reading?.kana || debouncedText,
                            preferences.elevenlabsApiKey,
                            preferences.elevenlabsVoiceId,
                            "ja",
                          );
                          await showToast({
                            style: Toast.Style.Success,
                            title: t("playingAudio", userLang),
                          });
                        } catch (error) {
                          await showToast({
                            style: Toast.Style.Failure,
                            title: t("failPlayAudio", userLang),
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
              title={t("words", userLang)}
              subtitle={`${results.words.length}`}
            >
              {results.words.map((word, idx) => (
                <WordListItem
                  key={`word-${word.reading.kanji || word.reading.kana}-${idx}`}
                  word={word}
                  lang={userLang}
                  preferences={preferences}
                  searchText={debouncedText}
                  onRequestAI={openAI}
                />
              ))}
            </List.Section>
          )}

          {results.kanji.length > 0 && (
            <List.Section
              title={t("kanji", userLang)}
              subtitle={`${results.kanji.length}`}
            >
              {results.kanji.map((kanji, idx) => (
                <KanjiListItem
                  key={`kanji-${kanji.literal}-${idx}`}
                  kanji={kanji}
                  preferences={preferences}
                  lang={userLang}
                  onRequestAI={openAI}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
