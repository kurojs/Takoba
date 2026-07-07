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
import { JotobaWord, JotobaSentence, Lang, Preferences } from "../types";
import { t } from "../i18n";
import {
  formatWordTitle,
  getBestSense,
  formatPitch,
  buildWordFullDetailMarkdown,
  formatAnkiBack,
} from "../utils/format";
import { generateSoundTags } from "../api/anki";
import { addNote } from "../utils/anki-ui";
import { playElevenLabsAudio } from "../api/elevenlabs";
import { openUrl } from "../utils/open";

export default function WordListItem({
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
    ? `${t("pitch", lang)}: ${formatPitch(word.pitch)}`
    : undefined;

  const ankiBack = formatAnkiBack("takoba", {
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
              const tags = await generateSoundTags(
                [{ text: word.reading.kana, language: "ja" }],
                preferences.elevenlabsApiKey,
                preferences.elevenlabsVoiceId,
                preferences.ankiPort,
                preferences.addAudioNote,
              );
              const back = tags.length > 0
                ? ankiBack.replace("</b>", `</b>${tags[0]}`)
                : ankiBack;
              await addNote("word", `<span style="font-size:1.4em">${query}</span>`, back, preferences.ankiPort, lang);
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
            onAction={() => {
              const q = word.reading.kanji || word.reading.kana;
              openUrl(`https://jotoba.de/search/${encodeURIComponent(q)}`);
            }}
          />
        </ActionPanel>
      }
    />
  );
}
