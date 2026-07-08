import { fetch } from "../lib/api-shim";
import { LANGUAGE_CODE_MAP } from "../types";

export async function translateViaGoogle(
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

export async function translateText(
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
