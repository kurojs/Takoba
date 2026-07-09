"use strict";
const Kuroshiro = require("kuroshiro").default;
const KuromojiAnalyzer = require("kuroshiro-analyzer-kuromoji");
const Analyzer = KuromojiAnalyzer.default || KuromojiAnalyzer;
const { join } = require("path");

const text = process.argv[2];
if (!text) { process.stdout.write(""); process.exit(0); }

const dictPath = join(__dirname, "..", "dict");

async function main() {
  try {
    const kuroshiro = new Kuroshiro();
    await kuroshiro.init(new Analyzer({ dictPath }));
    const result = await kuroshiro.convert(text, { to: "hiragana", mode: "okurigana" });
    process.stdout.write(result && result !== text ? result : "");
  } catch (e) {
    process.stderr.write("furigana-worker error: " + e.message + "\n");
    process.exit(1);
  }
}

main();
