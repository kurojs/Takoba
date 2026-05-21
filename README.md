<div align="center">
  <img src="https://i.imgur.com/ji48awU.png" width="80" alt="Kotoba Icon" />
  <h1>KOTOBA <sub>言葉</sub></h1>
  <p>Japanese dictionary, translator, and Anki integration for Vicinae</p>
  <p>Search Jotoba for words, kanji, and sentences. Translate on the fly. Add cards to Anki with one click. All inside your launcher.</p>
</div>

---

## Features

| Section | Description |
|---------|-------------|
| **🔍 Word Search** | Look up any Japanese word — get definitions, readings, pitch accent, part-of-speech, and example sentences |
| **🗾 Kanji Analysis** | Stroke order diagrams, JLPT level, grade, frequency, radical decomposition, and on'yomi/kun'yomi readings |
| **Translation** | Google Translate integration for instant Japanese → your language translations, with relevant images from Wikimedia Commons |
| **👾 AI Explanations** | Gemini-powered explanations for words, kanji, and phrases — customize the language and model |
| **📦 Anki Export** | One-click card creation (`⌘A`) with per-deck duplicate detection. Smart field mapping works with any note type |
| **Text-to-Speech** | ElevenLabs multilingual TTS — hear Japanese pronunciation with a single keystroke (`⌘P`) |
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
      <td align="center"><em>Instant translation with contextual image from Wikimedia Commons</em></td>
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

## 📦 Installation

### AUR (recommended)

```bash
yay -S vicinae-kotoba
```

### From source

```bash
# Clone
git clone https://github.com/kurojs/vicinae-jotoba-anki.git
cd vicinae-jotoba-anki

# Install dependencies
npm install

# Build and install into Vicinae
npm run build
```

The extension is automatically installed to `~/.local/share/vicinae/extensions/kotoba/`. No server restart needed.

### Requirements

| Dependency | Required | Notes |
|-----------|----------|-------|
| [Vicinae](https://github.com/vicinaehq/vicinae) | ✅ Yes | Launcher. Install via `yay -S vicinae-bin` or from GitHub releases |
| [Anki](https://apps.ankiweb.net) + [AnkiConnect](https://foosoft.net/projects/anki-connect/) | Optional | For Anki export features. AnkiConnect plugin code: `2055492159` |
| [ElevenLabs](https://elevenlabs.io) API key | Optional | For text-to-speech. Get a free API key at elevenlabs.io |
| `ffplay` (ffmpeg) or `mpv` | Optional | For audio playback: `sudo pacman -S ffmpeg` or `sudo pacman -S mpv` |
| [Gemini](https://aistudio.google.com/) API key | Optional | For AI-powered explanations. Free tier available |

### Verifying installation

```bash
# Check if extension is installed
ls ~/.local/share/vicinae/extensions/kotoba/

# Test AnkiConnect (if using Anki)
curl -X POST http://localhost:8765 \
  -H "Content-Type: application/json" \
  -d '{"action": "version", "version": 6}'
# Expected: {"result": 6, "error": null}
```

---

## Configuration

Access preferences through Vicinae's extension settings panel (`Extensions → Kotoba → Preferences`).

### General

| Setting | Default | What it does |
|---------|---------|-------------|
| **Definition Language** | `Spanish` | Language for Jotoba definitions (English, Spanish, German, French, Russian, Swedish, Dutch, Hungarian, Slovenian) |
| **Auto-load Text** | `true` | Automatically load selected/clipboard text when Kotoba opens |

### Anki

| Setting | Default | What it does |
|---------|---------|-------------|
| **Anki Deck Name** | `CUSTOM TRANSLATE` | Target deck for card creation |
| **Anki Note Type** | `Basic-d5482` | Note model — dynamically maps Front/Back fields |
| **AnkiConnect Port** | `8765` | Local port for AnkiConnect API |
| **Include Image in Anki Card** | `false` | Appends the translation image to the card back |

### Text-to-Speech

| Setting | Default | What it does |
|---------|---------|-------------|
| **ElevenLabs API Key** | — | Your API key for TTS. Get one at elevenlabs.io |
| **ElevenLabs Voice ID** | `21m00Tcm4TlvDq8ikWAM` | Voice for word pronunciation (default: Rachel). Use a Japanese voice for best results |

### Translation Images

| Setting | Default | What it does |
|---------|---------|-------------|
| **Show Translation Image** | `false` | Shows a relevant image from Wikimedia Commons below translations |

### AI Explanations

| Setting | Default | What it does |
|---------|---------|-------------|
| **Gemini API Key** | — | API key from Google AI Studio. Required for AI features |
| **AI Model** | `gemini-2.5-flash` | Gemini model. 14 models available including Pro and Flash variants |
| **AI Response Language** | `Spanish` | Language for AI explanations. 21 languages supported |
| **Custom AI Prompt** | — | Extra instructions for the AI (personality, format, focus areas) |
| **AI Voice ID** | `21m00Tcm4TlvDq8ikWAM` | ElevenLabs voice for reading AI responses aloud |

---

## Usage

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘A` | Add current item to Anki |
| `⌘P` | Play audio pronunciation |
| `Tab` | Explain with AI |
| `⌘C` | Copy word/kanji to clipboard |
| `⌘⇧C` | Copy definition/meanings |

### Workflow

1. Launch Vicinae and search for "Kotoba"
2. Type a Japanese word, kanji, or phrase
3. **Translation section** appears at the top if Google Translate has results
4. **Words** and **Kanji** sections show Jotoba dictionary results
5. Select any result to see full details
6. `⌘A` to add to Anki, `⌘P` to hear pronunciation, `Tab` for AI explanation

### Tips

- **Translation images**: Enable "Show Translation Image" in settings. The extension uses Jotoba's English gloss to find relevant Commons images — searching for "fruit" for 実 instead of random kanji matches.
- **AI language**: Set the "AI Response Language" independently from "Definition Language" — get definitions in Spanish and AI explanations in English, or vice versa.
- **Anki with images**: Enable "Include Image in Anki Card" to embed translation images in your Anki cards automatically.

---

## Architecture

```
                    ┌─────────────────────────────────────┐
                    │          Vicinae Launcher            │
                    │  ┌───────────────────────────────┐   │
                    │  │          Kotoba (TSX)          │   │
                    │  │  ┌─────┐ ┌──────┐ ┌────────┐  │   │
                    │  │  │Search│→│Detail│→│Actions │  │   │
                    │  │  └──┬──┘ └──┬───┘ └────┬───┘  │   │
                    │  │     │       │          │       │   │
                    │  │     ▼       ▼          ▼       │   │
                    │  │   ┌─────────────────────────┐  │   │
                    │  │   │       API Layer          │  │   │
                    │  │   │ Jotoba · Google · Gemini │  │   │
                    │  │   │ ElevenLabs · Wikimedia   │  │   │
                    │  │   └─────────────────────────┘  │   │
                    └─────────────────────────────────────┘
```

### Data Flow

1. **Search** → 500ms debounce → parallel Jotoba lookups (words + kanji) + Google Translate
2. **Display** → Results in sections (Translation, Words, Kanji) with inline markdown
3. **Detail** → Lazy sentence fetching from Jotoba/Tatoeba corpus
4. **Images** → Jotoba English gloss → Wikimedia Commons search → relevant image
5. **Anki** → Dynamic field mapping via AnkiConnect schema → per-deck dedup → card created
6. **Audio** → ElevenLabs multilingual TTS → temp MP3 → system player (ffplay/mpv)

### Key Technical Decisions

- **Single-file architecture**: ~1500 lines of TSX in one file. Separation through function boundaries.
- **No build-time framework**: Uses Vicinae's `vici` bundler. Just TypeScript + fetch.
- **Zero-cost image search**: Wikimedia Commons API + Jotoba English gloss. No API key needed.
- **Dynamic Anki mapping**: Queries AnkiConnect for field schema instead of hardcoding field names.
- **Lazy loading**: Example sentences fetched on-demand when selecting a word.

---

## Troubleshooting

### Anki: "Not connected"
Ensure Anki is running and AnkiConnect is installed (plugin code `2055492159`).

```bash
curl -X POST http://localhost:8765 \
  -H "Content-Type: application/json" \
  -d '{"action": "version", "version": 6}'
```

### Anki: "Model does not exist"
List available note types:
```bash
curl -X POST http://localhost:8765 \
  -H "Content-Type: application/json" \
  -d '{"action": "modelNames", "version": 6}'
```
Update the preference with an existing model name.

### Audio not working
```bash
sudo pacman -S ffmpeg    # provides ffplay
# or
sudo pacman -S mpv
```

### Extension not appearing
```bash
vicinae server    # Restart the Vicinae server
```

---

## Development

### Project Structure

```
kotoba/
├── assets/
│   └── icon.png          # Extension icon (256×256)
├── src/
│   └── kotoba.tsx         # Main source — full extension logic
├── package.json           # Dependencies, metadata, preferences schema
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

### Commands

```bash
npm run build     # Production build → ~/.local/share/vicinae/extensions/kotoba/
npm run dev       # Watch mode with hot-rebuild
```

### Code Quality

```bash
npx tsc            # TypeScript type check
npm run build      # Full build
```

---

## License

MIT — see [LICENSE](./LICENSE).

## Acknowledgements

- [Jotoba](https://jotoba.de) — Free multilingual Japanese dictionary API
- [Vicinae](https://github.com/vicinaehq/vicinae) — Linux launcher platform
- [AnkiConnect](https://foosoft.net/projects/anki-connect/) — Anki automation API
- [ElevenLabs](https://elevenlabs.io) — AI text-to-speech
- [Wikimedia Commons](https://commons.wikimedia.org) — Free image repository
- [Google Gemini](https://deepmind.google/technologies/gemini/) — AI explanation engine
- [KanjiVG](https://kanjivg.tagaini.net) — Kanji vector graphics reference
