import { fetch } from "../lib/api-shim";
import { LANGUAGE_CODE_MAP } from "../types";

const PA_ENDPOINT = "https://translate-pa.googleapis.com/v1/translateHtml";
const PA_API_KEY = "AIzaSyATBXajvzQLTDHEQbcpq0Ihe0vWDHmO520";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

async function translatePa(
  text: string,
  source: string,
  target: string,
): Promise<string | null> {
  const lines = text.split("\n");
  const payload = lines.filter((line) => line.trim() !== "");
  if (payload.length === 0) return text;
  try {
    const res = await fetch(PA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json+protobuf",
        "X-Goog-API-Key": PA_API_KEY,
      },
      body: JSON.stringify([
        [payload.map(escapeHtml), source, target],
        "te_lib",
      ]),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const out = data?.[0];
    if (!Array.isArray(out)) return null;
    const result = [...lines];
    let p = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() !== "") {
        if (typeof out[p] === "string") result[i] = decodeEntities(out[p]);
        p++;
      }
    }
    return result.join("\n");
  } catch {
    return null;
  }
}

async function translateLegacy(
  text: string,
  source: string,
  target: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    if (!data || !Array.isArray(data?.[0])) return null;
    return data[0]
      .map((segment: any) =>
        Array.isArray(segment) && typeof segment[0] === "string" ? segment[0] : "",
      )
      .join("");
  } catch {
    return null;
  }
}

export async function translateViaGoogle(
  query: string,
  language: string,
): Promise<string | null> {
  const targetLang = LANGUAGE_CODE_MAP[language] || "en";
  return (
    (await translatePa(query, "ja", targetLang)) ??
    (await translateLegacy(query, "ja", targetLang))
  );
}

export async function translateText(
  text: string,
  to: string,
): Promise<string | null> {
  return (
    (await translatePa(text, "auto", to)) ??
    (await translateLegacy(text, "en", to))
  );
}
