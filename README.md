<div align="center">
  <div style="display: flex; align-items: center; justify-content: center; gap: 20px; flex-wrap: wrap;">
    <h1>Takoba</h1>
    <img src="https://i.imgur.com/dB66ibV.png" height="75" alt="Takoba Pet" />
  </div>

  <hr style="margin: 20px 0; border: none; border-top: 1px solid #30363d;" />

  <p>Japanese dictionary, translator, TTS, and Anki integration — for launchers</p>
  <p>Search Jotoba for words, kanji, and sentences. Translate on the fly. Add cards to Anki with one click. Works with <b>Vicinae</b> (Linux) and <b>Raycast</b> (Mac/Windows).</p>
</div>

---

## Features

| Section | Description |
|---------|-------------|
| **Word Search** | Look up any Japanese word — get definitions, readings, pitch accent, part-of-speech, and example sentences |
| **Kanji Analysis** | Stroke order diagrams, JLPT level, grade, frequency, radical decomposition, and on'yomi/kun'yomi readings |
| **Translation** | Google Translate integration for instant Japanese → your language translations |
| **AI Explanations** | Gemini-powered explanations for words, kanji, and phrases — customize the language and model |
| **Anki Export** | One-click card creation (`⌘⇧A`) with per-deck duplicate detection. Uses Anki's built-in Basic model |
| **Text-to-Speech** | ElevenLabs multilingual TTS — hear Japanese pronunciation with a single keystroke (`⌘⇧P`) |
| **Clipboard** | Auto-loads selected text on launch; copy word, reading, or definition with keyboard shortcuts |

---

## Screenshots

### Main Search
<div align="center">
  <table>
    <tr>
      <td><img src="https://i.imgur.com/mywPeg3.png" width="400" alt="Word Search"/></td>
      <td><img src="https://i.imgur.com/49tjSXY.png" width="400" alt="Kanji & Stroke Order"/></td>
    </tr>
    <tr>
      <td align="center"><em>Word results with meanings, readings, and pitch accent</em></td>
      <td align="center"><em>Kanji detail with stroke order diagram, JLPT level, and radicals</em></td>
    </tr>
    <tr>
      <td><img src="https://i.imgur.com/zSiHWWu.png" width="400" alt="Translation"/></td>
      <td><img src="https://i.imgur.com/FpsZV0h.png" width="400" alt="AI Explanation"/></td>
    </tr>
    <tr>
      <td align="center"><em>Instant translation with contextual furigana support</em></td>
      <td align="center"><em>Gemini AI explains words and kanji in your language</em></td>
    </tr>
  </table>
</div>

### Preferences
<div align="center">
  <table>
    <tr>
      <td><img src="https://i.imgur.com/spL4qJ0.png" width="250" alt="Settings 1"/></td>
      <td><img src="https://i.imgur.com/e7jogMu.png" width="250" alt="Settings 2"/></td>
      <td><img src="https://i.imgur.com/qXxmvBU.png" width="250" alt="Settings 3"/></td>
    </tr>
    <tr>
      <td align="center"><em>General & Anki settings</em></td>
      <td align="center"><em>TTS & Translation settings</em></td>
      <td align="center"><em>AI & advanced settings</em></td>
    </tr>
  </table>
</div>

---

## Installation

### Linux → Vicinae

```bash
# AUR (recommended)
yay -S vicinae-takoba

# Or from source
git clone https://github.com/kurojs/takoba.git
cd takoba
npm install && npm run build
```

Extension goes to `~/.local/share/vicinae/extensions/takoba/`. Restart Vicinae or run `vicinae server`.

---

### Mac / Windows → Raycast

```bash
git clone https://github.com/kurojs/takoba.git
cd takoba
npm install && npm run build:raycast && npx ray develop
```

After registering with `npx ray develop`, the extension appears in Raycast instantly. You can Ctrl+C after it loads — the extension stays registered.

---

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Definition Language | Spanish | Language for Jotoba definitions (9 languages) |
| AnkiConnect Port | 8765 | Local port for AnkiConnect API |
| ElevenLabs API Key | — | TTS. Get one at elevenlabs.io |
| ElevenLabs Voice ID | `21m00Tcm4TlvDq8ikWAM` | Voice for word pronunciation |
| Gemini API Key | — | Required for AI features |
| AI Model | `gemini-2.5-flash` | 15 models available |
| AI Response Language | Spanish | Language for AI explanations (21 languages) |
| Show Furigana | false | Furigana readings above translations |

---

## Usage

| Shortcut | Action |
|----------|--------|
| `⌘⇧A` | Add to Anki |
| `⌘⇧P` | Play audio |
| `Tab` | AI explanation |
| `⌘C` | Copy word/kanji |
| `⌘⇧C` | Copy definition |

1. Launch your launcher and search "Takoba"
2. Type a Japanese word, kanji, or phrase
3. Results show Translation → Words → Kanji sections
4. Select any result for full details
5. `⌘⇧A` for Anki, `⌘⇧P` for audio, `Tab` for AI

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Anki: "Not connected" | Ensure Anki is running and AnkiConnect is installed (plugin `2055492159`) |
| Audio not working (Linux) | `sudo pacman -S ffmpeg` or `sudo pacman -S mpv` |
| Extension not appearing | Run `vicinae server` |

---

## Requirements

| Dependency | Required | Notes |
|-----------|----------|-------|
| **Vicinae** (Linux) | ✅ For Vicinae | Launcher. Install via `yay -S vicinae-bin` or from [releases](https://github.com/vicinaehq/vicinae) |
| **Raycast** (Mac/Windows) | ✅ For Raycast | Install from [raycast.com](https://raycast.com) |
| Node.js ≥ 18 | ✅ | Required for source builds |
| [Anki](https://apps.ankiweb.net) + [AnkiConnect](https://foosoft.net/projects/anki-connect/) | Optional | For Anki export. Plugin code: `2055492159` |
| [ElevenLabs](https://elevenlabs.io) API key | Optional | For TTS. Free key at elevenlabs.io |
| `ffplay` (ffmpeg) or `mpv` | Optional | For audio on Linux |
| [Gemini](https://aistudio.google.com/) API key | Optional | For AI explanations. Free tier |

### Verifying installation

```bash
# Vicinae: check if extension files exist
ls ~/.local/share/vicinae/extensions/takoba/

# Raycast: open Raycast and search for "Takoba"
# If registered, the extension appears in the command list

# Test AnkiConnect (if using Anki)
curl -X POST http://localhost:8765 \
  -H "Content-Type: application/json" \
  -d '{"action": "version", "version": 6}'
# Expected: {"result": 6, "error": null}
```

---

## License

MIT — see [LICENSE](./LICENSE).
