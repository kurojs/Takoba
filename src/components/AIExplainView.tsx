import { useState, useEffect } from "react";
import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  Color,
  Clipboard,
  showToast,
  Toast,
} from "../lib/api-shim";
import { queryGemini } from "../api/gemini";
import { playElevenLabsAudio } from "../api/elevenlabs";
import { t, Lang } from "../i18n";

const aiExplainCache = new Map<string, { response: string; timestamp: number }>();
const AI_EXPLAIN_CACHE_TTL = 3_600_000;

export default function AIExplainView({
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
        markdown={`<div style="height:100vh;display:flex;align-items:center;justify-content:center;text-align:center"><em>${t("aiLoading", lang)}…</em></div>`}
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
        markdown={`<div style="height:100vh;display:flex;align-items:center;justify-content:center;text-align:center"><em>${t("aiExplainError", lang)}</em>\n\n<small>${error}</small></div>`}
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
                    message: String(e),
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
