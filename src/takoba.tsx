import { useState, useEffect, useRef, useCallback } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  List,
  getPreferenceValues,
  getSelectedText,
  showToast,
  Toast,
  Icon,
  Color,
} from "./lib/api-shim";
import { LANGUAGES, Lang, LANGUAGE_CODE_MAP, Preferences, SearchResults, JotobaSentence } from "./types";
import { t } from "./i18n";
import { searchWords, searchKanji, fetchSentences } from "./api/jotoba";
import { translateViaGoogle, translateText } from "./api/translate";
import { generateSoundTags } from "./api/anki";
import { playElevenLabsAudio } from "./api/elevenlabs";
import { convertFurigana } from "./utils/furigana";
import { getBestSense } from "./utils/format";
import { addNote } from "./utils/anki-ui";
import AIExplainView from "./components/AIExplainView";
import KanjiListItem from "./components/KanjiListItem";
import WordListItem from "./components/WordListItem";

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
        await new Promise(r => setTimeout(r, 200));
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
          const tr = await translateText(engSense.glosses.join("; "), LANGUAGE_CODE_MAP[userLang] || "en");
          return tr ? tr.split(/;\s*/) : [];
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
          setResults({
            words, kanji, translation,
            wordSentences, wordGlosses,
            kanjiMeanings: kanjiMeanings.filter((m): m is string => m !== null),
          });
        }
      } catch (error: unknown) {
        const isNetwork = error instanceof TypeError;
        const isApiDown = isNetwork
          && (error as any).cause
          && typeof (error as any).cause === "object"
          && "code" in (error as any).cause
          && (error as any).cause.code === "ECONNREFUSED";
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
                    markdown={`${furiganaText || debouncedText}\n\n---\n\n${results.translation.split("\n").map(l => `> ${l}`).join("\n")}`}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action
                      title={t("addSentenceToAnki", userLang)}
                      icon={{ source: Icon.Plus, tintColor: Color.Green }}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                      onAction={async () => {
                        const hasFurigana = preferences.showFurigana && !!furiganaText;
                        const rawBack = results.translation + (hasFurigana ? `\n\n${furiganaText}` : "");
                        const tags = await generateSoundTags(
                          [{ text: debouncedText, language: "ja" }],
                          preferences.elevenlabsApiKey,
                          preferences.elevenlabsVoiceId,
                          preferences.ankiPort,
                          preferences.addAudioNote,
                        );
                        const back = tags.length > 0 ? `${tags[0]}<br>${rawBack}` : rawBack;
                        await addNote("translation", `<span style="font-size:1.4em">${debouncedText}</span>`, back, preferences.ankiPort, userLang);
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
                      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
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

