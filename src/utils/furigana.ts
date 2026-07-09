import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { existsSync } from "fs";

let kuroshiroInstance: any = null;
let kuroshiroInitPromise: Promise<void> | null = null;
let workerAvailable: boolean | null = null;

function getDictDir(): string {
  if (typeof __dirname !== "undefined") return join(__dirname, "dict");
  return join(dirname(fileURLToPath(import.meta.url)), "dict");
}

function getWorkerPath(): string {
  if (typeof __dirname !== "undefined") return join(__dirname, "scripts", "furigana-worker.cjs");
  return join(dirname(fileURLToPath(import.meta.url)), "scripts", "furigana-worker.cjs");
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

function checkWorker(): boolean {
  if (workerAvailable === null) {
    try {
      workerAvailable = existsSync(getWorkerPath());
    } catch {
      workerAvailable = false;
    }
  }
  return workerAvailable;
}

function convertViaWorker(text: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (!checkWorker()) {
      resolve(null);
      return;
    }
    try {
      const child = execFile(
        process.execPath,
        [getWorkerPath(), text],
        { timeout: 10000, maxBuffer: 1024 * 1024 },
        (error, stdout) => {
          if (error) {
            resolve(null);
            return;
          }
          resolve(stdout?.trim() || null);
        },
      );
    } catch {
      resolve(null);
    }
  });
}

export async function convertFurigana(text: string): Promise<string | null> {
  const workerResult = await convertViaWorker(text);
  if (workerResult !== null) return workerResult;

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
