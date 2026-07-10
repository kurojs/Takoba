<div align="center">

<h1> Takoba </h1> 
<p><b>Japanese dictionary, translator, TTS, and Anki integration for launchers</b></p>

  <p>
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" />
    <img src="https://img.shields.io/badge/Vicinae-Linux-informational" alt="Vicinae" />
    <img src="https://img.shields.io/badge/Raycast-Mac%20%2F%20Windows-informational" alt="Raycast" />
  </p>
</div>

Search [Jotoba](https://jotoba.de) for words, kanji, and sentences. Translate on the fly. Add cards to Anki in one keystroke. Built for [Vicinae](https://github.com/vicinaehq/vicinae) (Linux) and [Raycast](https://raycast.com) (Mac/Windows).

<p align="center">
  <img src="https://i.imgur.com/OWDbl7S.png" width="600" alt="Takoba running in Raycast" />
</p>

## Features

- **Word search** — definitions, readings, pitch accent, part of speech, and example sentences
- **Kanji analysis** — stroke order, JLPT level, grade, frequency, and radical decomposition
- **Translation** — instant Japanese → your language via Google Translate
- **AI explanations** — Gemini-powered breakdowns of words, kanji, and phrases in your language
- **Anki export** — one click (`⌘⇧A`), with per-deck duplicate detection
- **Text-to-speech** — ElevenLabs multilingual TTS (`⌘⇧P`)
- **Clipboard-aware** — auto-loads selected text on launch

<details>
<summary><b>Screenshots</b></summary>
<br>

| | |
|---|---|
| ![Word Search](https://i.imgur.com/mywPeg3.png) | ![Kanji & Stroke Order](https://i.imgur.com/49tjSXY.png) |
| Word results with meanings, readings, and pitch accent | Stroke order, JLPT level, and radicals |
| ![Translation](https://i.imgur.com/zSiHWWu.png) | ![AI Explanation](https://i.imgur.com/FpsZV0h.png) |
| Instant translation with contextual furigana | Gemini explains words and kanji in your language |

| | | |
|---|---|---|
| ![Settings 1](https://i.imgur.com/spL4qJ0.png) | ![Settings 2](https://i.imgur.com/e7jogMu.png) | ![Settings 3](https://i.imgur.com/qXxmvBU.png) |
| General & Anki | TTS & Translation | AI & advanced |

</details>

## Installation

**Vicinae** (Linux)

```bash
yay -S vicinae-takoba
```

<sup>or build from source — see [Development](#development)</sup>

**Raycast** (Mac/Windows)

```bash
git clone https://github.com/kurojs/takoba.git
cd takoba
npm install
npm run build:raycast
npx ray develop
```

The extension registers itself on first run — `Ctrl+C` once it loads, it stays available in Raycast.

## Configuration

| Setting | Default | Description |
|---|---|---|
| Definition Language | English | Jotoba definition language (9 supported) |
| AnkiConnect Port | `8765` | Local port for the AnkiConnect API |
| ElevenLabs API Key | — | Required for TTS |
| ElevenLabs Voice ID | `21m00Tcm4TlvDq8ikWAM` | Voice used for pronunciation |
| Gemini API Key | — | Required for AI explanations |
| AI Model | `gemini-2.5-flash` | 15 models available |
| AI Response Language | English | Language for AI explanations (21 supported) |
| Auto-load Selected Text | `false` | Load clipboard selection on launch |
| Show Furigana | `false` | Furigana above translations |

## Usage

| Shortcut | Action |
|---|---|
| `⌘⇧A` | Add to Anki |
| `⌘⇧P` | Play audio |
| `Tab` | AI explanation |
| `⌘C` | Copy word / kanji |
| `⌘⇧C` | Copy definition |

Search a word, kanji, or phrase — results are grouped as Translation → Words → Kanji. Select a result for full details.

## Requirements

| | Required for | Notes |
|---|---|---|
| Node.js ≥ 18 | Building from source | |
| [Anki](https://apps.ankiweb.net) + [AnkiConnect](https://foosoft.net/projects/anki-connect/) | Anki export | Plugin code `2055492159` |
| [ElevenLabs](https://elevenlabs.io) API key | TTS | Free tier available |
| [Gemini](https://aistudio.google.com/) API key | AI explanations | Free tier available |
| `ffplay` (ffmpeg) or `mpv` | Audio playback on Linux | |

## Development

```bash
git clone https://github.com/kurojs/takoba.git
cd takoba
npm install
npm run build          # Vicinae → ~/.local/share/vicinae/extensions/takoba/
npm run build:raycast  # Raycast → npx ray develop
```

## Troubleshooting

| Problem | Fix |
|---|---|
| Anki: "Not connected" | Ensure Anki is running with AnkiConnect installed |
| No audio (Linux) | `sudo pacman -S ffmpeg` or `mpv` |
| Extension missing (Vicinae) | Run `vicinae server` |

## License

[MIT](./LICENSE)
