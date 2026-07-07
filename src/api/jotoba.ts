import { fetch } from "undici";
import { JotobaWord, JotobaKanji, JotobaSentence } from "../types";

const JOTOBA_BASE = "https://jotoba.de/api";

export async function searchWords(
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

export async function searchKanji(
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

export async function fetchSentences(
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
