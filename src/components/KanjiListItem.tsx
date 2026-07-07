import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  Clipboard,
  showToast,
  Toast,
} from "../lib/api-shim";
import { JotobaKanji, Lang, Preferences } from "../types";
import { t } from "../i18n";
import { buildKanjiMarkdown, formatKanjiReadings, buildKanjiStrokeUrl, formatAnkiBack } from "../utils/format";
import { generateSoundTags } from "../api/anki";
import { addNote } from "../utils/anki-ui";
import { openUrl } from "../utils/open";

export default function KanjiListItem({
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
  const kanjiStrokeImage = buildKanjiStrokeUrl(kanji.literal);

  const ankiBack = formatAnkiBack("takoba", {
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
              const audioTexts: { text: string; language?: string }[] = [];
              if (kanji.onyomi?.length)
                audioTexts.push({ text: kanji.onyomi.join("、"), language: "ja" });
              if (kanji.kunyomi?.length)
                audioTexts.push({ text: kanji.kunyomi.join("、"), language: "ja" });
              const tags = await generateSoundTags(
                audioTexts,
                preferences.elevenlabsApiKey,
                preferences.elevenlabsVoiceId,
                preferences.ankiPort,
                preferences.addAudioNote,
              );
              let back = ankiBack;
              if (kanji.onyomi?.length && tags[0])
                back = back.replace(`<b>On:</b> ${kanji.onyomi.join("・")}`, `<b>On:</b> ${kanji.onyomi.join("・")} ${tags[0]}`);
              if (kanji.kunyomi?.length) {
                const idx = kanji.onyomi?.length ? 1 : 0;
                if (tags[idx])
                  back = back.replace(`<b>Kun:</b> ${kanji.kunyomi.join("・")}`, `<b>Kun:</b> ${kanji.kunyomi.join("・")} ${tags[idx]}`);
              }
              await addNote("kanji", `<div style="font-size:6em;text-align:center">${kanji.literal}</div>`, back, preferences.ankiPort, lang);
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
            onAction={() => openUrl(buildKanjiStrokeUrl(kanji.literal))}
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
                await Clipboard.copy(kanjiTranslatedMeanings || kanji.meanings.join(", "));
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
            onAction={() => openUrl(`https://jotoba.de/search/${encodeURIComponent(kanji.literal)}`)}
          />
        </ActionPanel>
      }
    />
  );
}
