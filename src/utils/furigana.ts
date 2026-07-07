let kuroshiroInstance: any = null;
let kuroshiroInitPromise: Promise<void> | null = null;

async function getKuroshiro() {
  if (kuroshiroInstance) return;
  if (kuroshiroInitPromise) return kuroshiroInitPromise;
  kuroshiroInitPromise = (async () => {
    try {
      const Kuroshiro = require("kuroshiro").default;
      const KuromojiAnalyzer = require("kuroshiro-analyzer-kuromoji");
      const Analyzer = KuromojiAnalyzer.default || KuromojiAnalyzer;
      kuroshiroInstance = new Kuroshiro();
      await kuroshiroInstance.init(new Analyzer());
    } catch {}
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
  } catch {
    return null;
  }
}
