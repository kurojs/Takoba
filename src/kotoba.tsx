import { useState, useEffect, useRef, useCallback } from "react";
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
    addedToAnki: "Added ✅",
    playingAudio: "Playing audio! 🔊",
    ankiNotConnected: "Anki not connected",
    ankiNotConnectedMsg: "Make sure Anki is running with AnkiConnect on port {port}",
    cardAddedMsg: "→ {deck}",
    search: "Search Kotoba",
    searchPlaceholder: "Type a word, kanji, or ask AI...",
    noResults: "No results found",
    noResultsMsg: "No results for \"{query}\"",
    typeToSearch: "Search Japanese words, kanji, or ask AI for explanations",
    alreadyInDeck: "Duplicate",
    alreadyInDeckMsg: "Duplicate in {deck}",
    errorAdding: "Anki error",
    failPlayAudio: "Failed to play audio",
    searchError: "Search failed",
    noInternet: "No internet connection",
    noInternetMsg: "Check your connection and try again",
    apiDown: "API unavailable",
    copyResponse: "Copy Response",
    explainWithAI: "Explain with AI",
    aiLoading: "Generating explanation",
    furigana: "Furigana",
    furiganaError: "Furigana can't be loaded",
    aiExplainError: "AI explanation unavailable",
    ttsError: "Audio unavailable",
  },
  Spanish: {
    translation: "Traducción",
    words: "Palabras",
    kanji: "Kanji",
    pitch: "Acento",
    onyomi: "On'yomi",
    kunyomi: "Kun'yomi",
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
    addedToAnki: "Agregada ✅",
    playingAudio: "¡Reproduciendo audio! 🔊",
    ankiNotConnected: "Anki no conectado",
    ankiNotConnectedMsg: "Asegurate que Anki esté corriendo con AnkiConnect en puerto {port}",
    cardAddedMsg: "→ {deck}",
    search: "Buscar Kotoba",
    searchPlaceholder: "Buscá palabras, kanji o consultá a la IA...",
    noResults: "Sin resultados",
    noResultsMsg: "Sin resultados para \"{query}\"",
    typeToSearch: "Buscá palabras, kanji o consultá a la IA",
    alreadyInDeck: "Duplicado",
    alreadyInDeckMsg: "Duplicado en {deck}",
    errorAdding: "Error en Anki",
    failPlayAudio: "Error al reproducir audio",
    copyResponse: "Copiar Respuesta",
    explainWithAI: "Explicar con IA",
    aiLoading: "Generando explicación",
    furigana: "Furigana",
    furiganaError: "Furigana no disponible",
    aiExplainError: "Explicación no disponible",
    ttsError: "Audio no disponible",
    noInternet: "Sin conexión a internet",
    noInternetMsg: "Revisá tu conexión e intentá de nuevo",
    apiDown: "API no disponible",
  },
};

function t(key: string, lang: Lang): string {
  return UI[lang]?.[key] ?? UI.English[key] ?? key;
}

// ────────────────────────────────────────────
// In-memory cache for API calls
// ────────────────────────────────────────────

const aiExplainCache = new Map<string, { response: string; timestamp: number }>();
const AI_EXPLAIN_CACHE_TTL = 3_600_000; // 1 hour

// ────────────────────────────────────────────
// Kuroshiro + kuromoji for furigana
// ────────────────────────────────────────────

let kuroshiroInstance: any = null;
let kuroshiroInitPromise: Promise<void> | null = null;

async function getKuroshiro() {
  if (kuroshiroInstance) return;
  if (kuroshiroInitPromise) return kuroshiroInitPromise;
  kuroshiroInitPromise = (async () => {
    try {
      const Kuroshiro = require("kuroshiro").default;
      const KuromojiAnalyzer = require("kuroshiro-analyzer-kuromoji");
      const Analyzer = KuromojiAnalyzer.default || KuromojiAnalyzer;
      kuroshiroInstance = new Kuroshiro();
      await kuroshiroInstance.init(new Analyzer());
    } catch {}
  })();
  return kuroshiroInitPromise;
}

async function convertFurigana(text: string): Promise<string | null> {
  try {
    await getKuroshiro();
    if (!kuroshiroInstance) return null;
    const result = await kuroshiroInstance.convert(text, {
      to: "hiragana",
      mode: "okurigana",
    });
    if (!result || result === text) return null;
    return result;
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

interface Preferences {
  ankiPort: string;
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
  wordSentences?: JotobaSentence[][];
  wordGlosses?: string[][];
  kanjiMeanings?: string[];
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
  to: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${to}&dt=t&q=${encodeURIComponent(text)}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    return data?.[0]?.[0]?.[0] || null;
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

type Section = "word" | "kanji" | "translation";

const SECTION_DECKS: Record<Section, string> = {
  word: "Kotoba Words",
  kanji: "Kotoba Kanji",
  translation: "Kotoba Translation",
};

async function addToAnki(
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
          tags: ["vicinae", "japanese", "kotoba"],
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

async function generateTTSBuffer(
  text: string,
  apiKey: string,
  voiceId: string,
  language?: string,
): Promise<ArrayBuffer> {
  if (!apiKey) throw new Error("ElevenLabs API key not configured");

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
  if (audioBuffer.byteLength === 0) throw new Error("Empty audio generated");
  return audioBuffer;
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

async function generateSoundTags(
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
      const audioBuffer = await generateTTSBuffer(
        text.slice(0, 500),
        apiKey,
        voiceId,
        audioTexts[i].language,
      );
      const base64Data = Buffer.from(audioBuffer).toString("base64");
      const filename = `kotoba_card_${timestamp}_${i}.mp3`;
      await storeMediaFile(filename, base64Data, port);
      tags.push(`[sound:${filename}]`);
    } catch (e) {
      console.error("Failed to add audio:", e);
    }
  }

  return tags;
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
    AuxiliaryVerb: "Auxiliary Verb",
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

function formatAnkiBack(
  _format: string,
  options: {
    wordTitle: string;
    reading: string;
    definitions: string;
    pitch?: string;
    sentences: { content: string; translation: string }[];
    pos?: string;
    lang: Lang;
    kanjiMeanings?: string;
    kanjiOnyomi?: string;
    kanjiKunyomi?: string;
    kanjiMeta?: string;
    kanjiImage?: string;
  },
): string {
  // "kotoba" — matches UI detail view
  const html: string[] = [];

  if (options.kanjiMeanings) {
    html.push(options.kanjiMeanings);
    if (options.kanjiOnyomi || options.kanjiKunyomi) {
      const readings: string[] = [];
      if (options.kanjiOnyomi) readings.push(`<b>On:</b> ${options.kanjiOnyomi}`);
      if (options.kanjiKunyomi) readings.push(`<b>Kun:</b> ${options.kanjiKunyomi}`);
      html.push(readings.join(" | "));
    }
    if (options.kanjiMeta) html.push(options.kanjiMeta);
    if (options.kanjiImage) html.push(`<img src="${options.kanjiImage}">`);
  } else {
    if (options.reading) html.push(`<b>${options.reading}</b>`);
    html.push(options.definitions);
    if (options.pos) html[html.length - 1] += ` | ${options.pos}`;
    if (options.pitch) html.push(options.pitch);
    if (options.sentences.length > 0) {
      html.push(`<br><b>--- ${t("exampleSentences", options.lang)} ---</b><br>`);
      for (const s of options.sentences) {
        html.push(`${s.content}<br>${s.translation}`);
      }
    }
  }
  return html.join("<br><br>");
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
    const cacheKey = `${query}|${model}|${customPrompt}|${aiLanguage}`;
    const cached = aiExplainCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < AI_EXPLAIN_CACHE_TTL) {
      setResponse(cached.response);
      setIsLoading(false);
      return;
    }
    queryGemini(query, geminiApiKey, model, customPrompt, aiLanguage)
      .then((text) => {
        if (!cancelled) {
          aiExplainCache.set(cacheKey, { response: text, timestamp: Date.now() });
          setResponse(text);
        }
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
        markdown={`<br><br><br><br><br><br><center>_${t("aiExplainError", lang)}_</center>`}
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
                    title: t("ttsError", lang),
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
  initialTranslatedMeaning,
}: {
  kanji: JotobaKanji;
  preferences: Preferences;
  lang: Lang;
  onRequestAI: (query: string) => void;
  initialTranslatedMeaning?: string;
}) {
  const title = kanji.literal;
  const subtitle = formatKanjiReadings(kanji.onyomi, kanji.kunyomi);
  const detailMd = buildKanjiMarkdown(kanji, lang, initialTranslatedMeaning || undefined);
  const kanjiTranslatedMeanings = initialTranslatedMeaning || kanji.meanings.join(", ");
  const kanjiStrokeImage = `https://jotoba.de/resource/kanji/frames/${encodeURIComponent(kanji.literal)}`;

  const ankiBack = formatAnkiBack("kotoba", {
    wordTitle: kanji.literal,
    reading: "",
    definitions: kanjiTranslatedMeanings,
    pitch: undefined,
    sentences: [],
    lang,
    kanjiMeanings: kanjiTranslatedMeanings,
    kanjiOnyomi: kanji.onyomi?.join("・"),
    kanjiKunyomi: kanji.kunyomi?.join("・"),
    kanjiMeta: `JLPT N${kanji.jlpt} · ${t("grade", lang)} ${kanji.grade} · ${kanji.stroke_count} ${t("strokes", lang)}${kanji.frequency ? ` · ${t("freq", lang)}: #${kanji.frequency}` : ""}${kanji.radical ? ` · ${t("radical", lang)}: ${kanji.radical}` : ""}`,
    kanjiImage: kanjiStrokeImage,
  });

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
              const kanjiDeck = "Kotoba Kanji";
              try {
                const kanjiAudioTexts: { text: string; language?: string }[] = [];
                if (kanji.onyomi && kanji.onyomi.length > 0)
                  kanjiAudioTexts.push({ text: kanji.onyomi.join("、"), language: "ja" });
                if (kanji.kunyomi && kanji.kunyomi.length > 0)
                  kanjiAudioTexts.push({ text: kanji.kunyomi.join("、"), language: "ja" });
                const kanjiTags = await generateSoundTags(
                  kanjiAudioTexts,
                  preferences.elevenlabsApiKey,
                  preferences.elevenlabsVoiceId,
                  preferences.ankiPort,
                  preferences.addAudioNote,
                );
                let kanjiBack = ankiBack;
                if (kanji.onyomi?.length && kanjiTags[0]) {
                  kanjiBack = kanjiBack.replace(
                    `<b>On:</b> ${kanji.onyomi.join("・")}`,
                    `<b>On:</b> ${kanji.onyomi.join("・")} ${kanjiTags[0]}`,
                  );
                }
                if (kanji.kunyomi?.length) {
                  const kunIdx = kanji.onyomi?.length ? 1 : 0;
                  if (kanjiTags[kunIdx]) {
                    kanjiBack = kanjiBack.replace(
                      `<b>Kun:</b> ${kanji.kunyomi.join("・")}`,
                      `<b>Kun:</b> ${kanji.kunyomi.join("・")} ${kanjiTags[kunIdx]}`,
                    );
                  }
                }
                await addToAnki(
                  "kanji",
                  kanji.literal,
                  kanjiBack,
                  preferences.ankiPort,
                );
                await showToast({
                  style: Toast.Style.Success,
                  title: t("addedToAnki", lang),
                  message: t("cardAddedMsg", lang).replace("{deck}", kanjiDeck),
                });
              } catch (error) {
                const msg = String(error).toLowerCase();
                if (msg.includes("duplicate")) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: t("alreadyInDeck", lang),
                    message: t("alreadyInDeckMsg", lang).replace("{deck}", kanjiDeck),
                  });
                } else {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: t("errorAdding", lang),
                  });
                }
              }
            }}
          />
          {preferences.geminiApiKey && (
            <Action
              title={t("explainWithAI", lang)}
              icon={{ source: Icon.Wand, tintColor: Color.Purple }}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
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
  initialSentences,
  initialTranslatedGlosses,
}: {
  word: JotobaWord;
  lang: Lang;
  preferences: Preferences;
  searchText: string;
  onRequestAI: (query: string) => void;
  initialSentences?: JotobaSentence[];
  initialTranslatedGlosses?: string[];
}) {
  const sense = getBestSense(word, lang);
  const displayGlosses = (initialTranslatedGlosses && initialTranslatedGlosses.length > 0) ? initialTranslatedGlosses : sense.glosses;
  const title = formatWordTitle(word);
  const subtitle = displayGlosses[0];
  const displaySense = { ...sense, glosses: displayGlosses };
  const sentences = initialSentences || [];
  const detailMd = buildWordFullDetailMarkdown(word, displaySense, sentences, lang);

  const pitchStr = word.pitch && word.pitch.length > 0
    ? (() => {
        const pitchParts: string[] = [];
        let hasRisen = false;
        for (const p of word.pitch) {
          if (p.high && !hasRisen) { pitchParts.push(`↑${p.part}`); hasRisen = true; }
          else if (!p.high && hasRisen) { pitchParts.push(`↘${p.part}`); hasRisen = false; }
          else { pitchParts.push(p.part); }
        }
        return `${t("pitch", lang)}: ${pitchParts.join("")}`;
      })()
    : undefined;

  const ankiBack = formatAnkiBack("kotoba", {
    wordTitle: title,
    reading: word.reading.kana,
    definitions: displaySense.glosses.join("; "),
    pitch: pitchStr,
    sentences,
    pos: displaySense.pos,
    lang,
  });

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
              const wordDeck = "Kotoba Words";
              try {
                const wordAudioKana = word.reading.kana;
                const wordTags = await generateSoundTags(
                  [{ text: wordAudioKana, language: "ja" }],
                  preferences.elevenlabsApiKey,
                  preferences.elevenlabsVoiceId,
                  preferences.ankiPort,
                  preferences.addAudioNote,
                );
                const wordBack = wordTags.length > 0
                  ? ankiBack.replace("</b>", `</b>${wordTags[0]}`)
                  : ankiBack;
                const noteId = await addToAnki(
                  "word",
                  query,
                  wordBack,
                  preferences.ankiPort,
                );
                await showToast({
                  style: Toast.Style.Success,
                  title: t("addedToAnki", lang),
                  message: t("cardAddedMsg", lang).replace("{deck}", wordDeck),
                });
              } catch (error) {
                const msg = String(error).toLowerCase();
                if (msg.includes("duplicate")) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: t("alreadyInDeck", lang),
                    message: t("alreadyInDeckMsg", lang).replace("{deck}", wordDeck),
                  });
                } else {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: t("errorAdding", lang),
                  });
                }
              }
            }}
          />
          {preferences.geminiApiKey && (
            <Action
              title={t("explainWithAI", lang)}
              icon={{ source: Icon.Wand, tintColor: Color.Purple }}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
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
                  title: t("ttsError", lang),
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
  const searchToken = useRef(0);
  const [results, setResults] = useState<SearchResults>({
    words: [],
    kanji: [],
    translation: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  useEffect(() => {
    if (!preferences.autoLoadText) return;
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
        if (clipboardText) {
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
        setResults({ words: [], kanji: [], translation: null });
      setHasSearched(false);
      return;
    }

    const doSearch = async () => {
      const token = ++searchToken.current;
      setIsLoading(true);
      setHasSearched(true);
      setNetworkError(false);
      try {
        const [words, kanji, translation] = await Promise.all([
          searchWords(debouncedText, userLang),
          searchKanji(debouncedText, userLang),
          translateViaGoogle(debouncedText, userLang),
        ]);

        const wordLimit = 8;
        const kanjiLimit = 5;
        const topWords = words.slice(0, wordLimit);
        const topKanji = kanji.slice(0, kanjiLimit);

        const wordSentencePromises = topWords.map(async (w) => {
          const q = w.reading.kanji || w.reading.kana;
          const raw = await fetchSentences(q, userLang).catch(() => [] as JotobaSentence[]);
          if (userLang === "English" || raw.length === 0) return raw;
          const code = LANGUAGE_CODE_MAP[userLang] || "en";
          const result = [...raw];
          for (let i = 0; i < result.length; i++) {
            const s = result[i];
            const needsTranslation = (s.translation && s.eng && s.translation === s.eng) ||
              (s.translation && !/[^\x20-\x7E\s]/.test(s.translation));
            if (needsTranslation) {
              const t = await translateText(s.translation, code);
              if (t) result[i] = { ...result[i], translation: t };
            }
          }
          return result;
        });

        const wordGlossPromises = topWords.map(async (w) => {
          if (userLang === "English") return [] as string[];
          const sense = getBestSense(w, userLang);
          if (sense.language === userLang && sense.glosses.length > 0) return sense.glosses;
          const engSense = w.senses.find(s => s.language === "English");
          if (!engSense || engSense.glosses.length === 0) return [] as string[];
          const t = await translateText(engSense.glosses.join("; "), LANGUAGE_CODE_MAP[userLang] || "en");
          return t ? t.split(/;\s*/) : [];
        });

        const kanjiMeaningPromises = topKanji.map((k) => {
          if (userLang === "English") return Promise.resolve("");
          return translateText(k.meanings.join(", "), LANGUAGE_CODE_MAP[userLang] || "en");
        });

        const [wordSentences, wordGlosses, kanjiMeanings] = await Promise.all([
          Promise.all(wordSentencePromises),
          Promise.all(wordGlossPromises),
          Promise.all(kanjiMeaningPromises),
        ]);

        if (token === searchToken.current) {
          setResults({ words, kanji, translation, wordSentences, wordGlosses, kanjiMeanings });
        }
      } catch (error) {
        const isNetwork = error instanceof TypeError;
        const isApiDown = isNetwork
          && error.cause
          && typeof error.cause === "object"
          && "code" in error.cause
          && error.cause.code === "ECONNREFUSED";
        setNetworkError(isNetwork && !isApiDown);
        await showToast({
          style: Toast.Style.Failure,
          title: isApiDown ? t("apiDown", userLang) : isNetwork ? t("noInternet", userLang) : t("searchError", userLang),
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

  const [furiganaText, setFuriganaText] = useState("");

  useEffect(() => {
    if (!preferences.showFurigana || !debouncedText) {
      setFuriganaText("");
      return;
    }
    let cancelled = false;
    convertFurigana(debouncedText)
      .then(text => {
        if (!cancelled) setFuriganaText(text || "");
      })
      .catch(() => {
        if (!cancelled) setFuriganaText("");
      });
    return () => { cancelled = true; };
  }, [preferences.showFurigana, debouncedText]);

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
      ) : networkError ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title={t("noInternet", userLang)}
          description={t("noInternetMsg", userLang)}
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
                    markdown={`${furiganaText || debouncedText}\n\n---\n\n> ${results.translation}`}
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
                        const transDeck = "Kotoba Translation";
                        try {
                          const hasFurigana = preferences.showFurigana && !!furiganaText;
                          const furiganaSuffix = hasFurigana
                            ? `\n\n${furiganaText}`
                            : "";
                          const rawBack = `${results.translation}${furiganaSuffix}`;
                          const transTags = await generateSoundTags(
                            [{ text: debouncedText, language: "ja" }],
                            preferences.elevenlabsApiKey,
                            preferences.elevenlabsVoiceId,
                            preferences.ankiPort,
                            preferences.addAudioNote,
                          );
                          const backContent = transTags.length > 0
                            ? `${transTags[0]}<br>${rawBack}`
                            : rawBack;
                          await addToAnki(
                            "translation",
                            debouncedText,
                            backContent,
                            preferences.ankiPort,
                          );
                          await showToast({
                            style: Toast.Style.Success,
                            title: t("addedToAnki", userLang),
                            message: t("cardAddedMsg", userLang).replace("{deck}", transDeck),
                          });
                        } catch (error) {
                          const msg = String(error).toLowerCase();
                          if (msg.includes("duplicate")) {
                            await showToast({
                              style: Toast.Style.Failure,
                              title: t("alreadyInDeck", userLang),
                              message: t("alreadyInDeckMsg", userLang).replace("{deck}", transDeck),
                            });
                          } else {
                            await showToast({
                              style: Toast.Style.Failure,
                              title: t("errorAdding", userLang),
                            });
                          }
                        }
            }}
          />
          {preferences.geminiApiKey && (
            <Action
              title={t("explainWithAI", userLang)}
              icon={{ source: Icon.Wand, tintColor: Color.Purple }}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
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
                            debouncedText,
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
                            title: t("ttsError", userLang),
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
                  initialSentences={results.wordSentences?.[idx]}
                  initialTranslatedGlosses={results.wordGlosses?.[idx]}
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
                  initialTranslatedMeaning={results.kanjiMeanings?.[idx]}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
