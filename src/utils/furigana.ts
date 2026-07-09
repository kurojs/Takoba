let kuroshiroInstance: any = null;
let kuroshiroInitPromise: Promise<void> | null = null;
import { join, dirname } from "path";
import { fileURLToPath } from "url";

function getDictDir(): string {
  if (typeof __dirname !== "undefined") return join(__dirname, "dict");
  return join(dirname(fileURLToPath(import.meta.url)), "dict");
}

async function getKuroshiro() {
  if (kuroshiroInstance) return;
  if (kuroshiroInitPromise) return kuroshiroInitPromise;
  kuroshiroInitPromise = (async () => {
    try {
      const Kuroshiro = require("kuroshiro").default;
      const KuromojiAnalyzer = require("kuroshiro-analyzer-kuromoji");
      const Analyzer = KuromojiAnalyzer.default || KuromojiAnalyzer;
      kuroshiroInstance = new Kuroshiro();
      await kuroshiroInstance.init(new Analyzer({ dictPath: getDictDir() }));
    } catch (e) {
      console.error("Takoba: kuroshiro init failed", e);
    }
  })();
  return kuroshiroInitPromise;
}

export async function convertFurigana(text: string): Promise<string | null> {
  try {
    await getKuroshiro();
    if (!kuroshiroInstance) return null;
    const result = await kuroshiroInstance.convert(text, {
      to: "hiragana",
      mode: "okurigana",
    });
    if (!result || result === text) return null;
    return result;
  } catch (e) {
    console.error("Takoba: furigana analysis failed", e);
    return null;
  }
}
