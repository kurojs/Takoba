import { fetch } from "../lib/api-shim";

const INTERNAL_SYSTEM_PROMPT = `You are a helpful Japanese language learning assistant. Provide clear, pedagogical explanations about Japanese words, kanji, phrases, and grammar.

Structure each response based on what is being asked:
- **Words**: reading (kana), meaning, common usage, and a short example sentence
- **Kanji**: meaning, on'yomi / kun'yomi, common words that use it, visual components breakdown
- **Phrases / Grammar**: meaning, structure/formation, when to use it, and examples
- **General text**: brief summary, key vocabulary breakdown, grammar points

Keep explanations concise but informative. Use examples to illustrate. Be encouraging. Format your response in clean markdown with clear sections.`;

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export async function queryGemini(
  query: string,
  apiKey: string,
  model: string,
  customPrompt: string,
  language: string,
): Promise<string> {
  const contents: { role: string; parts: { text: string }[] }[] = [];

  if ((customPrompt || "").trim()) {
    contents.push({ role: "user", parts: [{ text: (customPrompt || "").trim() }] });
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
