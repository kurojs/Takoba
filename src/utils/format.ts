import { Lang, JotobaWord, JotobaKanji, JotobaSentence, PitchItem, FormatAnkiOptions } from "../types";
import { t } from "../i18n";

export function formatWordTitle(word: JotobaWord): string {
  const { reading } = word;
  if (reading.kanji && reading.kanji !== reading.kana) {
    return `${reading.kanji}【${reading.kana}】`;
  }
  return reading.kana;
}

export function getBestSense(
  word: JotobaWord,
  lang: Lang,
): { glosses: string[]; language: string; pos?: string } {
  const preferred = word.senses.find((s) => s.language === lang);
  if (preferred) return preferred;
  const english = word.senses.find((s) => s.language === "English");
  if (english) return english;
  return word.senses[0] ?? { glosses: [], language: "", pos: "" };
}

export function formatPitch(pitch: PitchItem[]): string {
  const parts: string[] = [];
  let hasRisen = false;
  for (const p of pitch) {
    if (p.high && !hasRisen) { parts.push(`↑${p.part}`); hasRisen = true; }
    else if (!p.high && hasRisen) { parts.push(`↘${p.part}`); hasRisen = false; }
    else { parts.push(p.part); }
  }
  return parts.join("");
}

export function buildKanjiStrokeUrl(literal: string): string {
  return `https://jotoba.de/resource/kanji/frames/${encodeURIComponent(literal)}`;
}

export function formatKanjiReadings(onyomi?: string[], kunyomi?: string[]): string {
  const parts: string[] = [];
  if (onyomi && onyomi.length > 0) parts.push(onyomi.join("・"));
  if (kunyomi && kunyomi.length > 0) parts.push(kunyomi.join("・"));
  return parts.join(" | ");
}

export function buildWordDetailMarkdown(
  word: JotobaWord,
  sense: { glosses: string[]; language: string; pos?: string },
): string {
  const lines: string[] = [];

  lines.push(`# ${formatWordTitle(word)}`);

  lines.push(`\n${sense.glosses.join("; ")}`);

  return lines.join("\n");
}

export function buildWordFullDetailMarkdown(
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

export function buildKanjiMarkdown(kanji: JotobaKanji, lang: Lang, meaningOverride?: string): string {
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

  const imgUrl = buildKanjiStrokeUrl(kanji.literal);
  lines.push(`\n\n[![](${imgUrl})](${imgUrl})`);

  return lines.join("\n");
}

export function formatAnkiBack(
  _format: string,
  options: FormatAnkiOptions,
): string {
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
