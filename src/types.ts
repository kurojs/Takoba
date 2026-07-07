export const LANGUAGES = [
  "English", "Spanish", "German", "French",
  "Russian", "Swedish", "Dutch", "Hungarian", "Slovenian",
] as const;

export type Lang = (typeof LANGUAGES)[number];

export interface Preferences {
  ankiPort: string;
  elevenlabsApiKey: string;
  elevenlabsVoiceId: string;
  userLanguage: string;
  autoLoadText: boolean;
  geminiApiKey: string;
  geminiModel: string;
  geminiCustomPrompt: string;
  geminiAiLanguage: string;
  elevenlabsAiVoiceId: string;
  showFurigana: boolean;
  addAudioNote: boolean;
}

export interface JotobaReading {
  kana: string;
  kanji?: string;
  furigana?: string;
}

export interface JotobaSense {
  language: string;
  pos?: string;
  glosses: string[];
}

export interface PitchItem {
  part: string;
  high: boolean;
}

export interface JotobaWord {
  reading: JotobaReading;
  common: boolean;
  pitch?: PitchItem[];
  senses: JotobaSense[];
  url: string;
}

export interface JotobaKanji {
  literal: string;
  meanings: string[];
  onyomi?: string[];
  kunyomi?: string[];
  jlpt: number;
  grade: number;
  stroke_count: number;
  frequency?: number;
  radical?: string;
}

export interface JotobaSentence {
  content: string;
  translation: string;
  furigana?: string;
  eng?: string;
}

export interface SearchResults {
  words: JotobaWord[];
  kanji: JotobaKanji[];
  translation: string | null;
  wordSentences?: JotobaSentence[][];
  wordGlosses?: string[][];
  kanjiMeanings?: string[];
}

export type Section = "word" | "kanji" | "translation";

export const SECTION_DECKS: Record<Section, string> = {
  word: "Takoba Words",
  kanji: "Takoba Kanji",
  translation: "Takoba Translation",
};

export const LANGUAGE_CODE_MAP: Record<string, string> = {
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

export interface FormatAnkiOptions {
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
}
