import { showToast, Toast } from "../lib/api-shim";
import { Lang, Section, SECTION_DECKS } from "../types";
import { t } from "../i18n";
import { checkAnkiConnect, addToAnki } from "../api/anki";

export async function addNote(
  section: Section,
  front: string,
  back: string,
  port: string,
  lang: Lang,
): Promise<void> {
  const deckName = SECTION_DECKS[section];
  const isConnected = await checkAnkiConnect(port);
  if (!isConnected) {
    await showToast({
      style: Toast.Style.Failure,
      title: t("ankiNotConnected", lang),
      message: t("ankiNotConnectedMsg", lang).replace("{port}", port),
    });
    return;
  }
  try {
    await addToAnki(section, front, back, port);
    await showToast({
      style: Toast.Style.Success,
      title: t("addedToAnki", lang),
      message: t("cardAddedMsg", lang).replace("{deck}", deckName),
    });
  } catch (error) {
    const msg = String(error);
    if (msg.toLowerCase().includes("duplicate")) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("alreadyInDeck", lang),
        message: t("alreadyInDeckMsg", lang).replace("{deck}", deckName),
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: t("errorAdding", lang),
        message: msg,
      });
    }
  }
}
