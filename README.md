<div align="center">
  <table style="border: none; border-collapse: collapse; border-spacing: 0; background: transparent;">
    <tr style="border: none; background: transparent;">
      <td align="center" valign="middle" style="border: none; padding: 0 20px 0 0;">
        <img src="https://i.imgur.com/13FTsfa.png" height="55" alt="Takoba Title" />
      </td>
      <td align="center" valign="middle" style="border: none; padding: 0;">
        <img src="https://i.imgur.com/dB66ibV.png" height="75" alt="Takoba Pet" />
      </td>
    </tr>
  </table>
  <p style="margin-top: 15px;">Japanese dictionary, translator, TTS, and Anki integration — for launchers</p>
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
| **Anki Export** | One-click card creation (`⌘A`) with per-deck duplicate detection. Uses Anki's built-in Basic model |
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

#### AUR (recommended for Arch Linux)

```bash
yay -S vicinae-takoba
```

#### From source

```bash
git clone https://github.com/kurojs/takoba.git
cd takoba
npm install
npm run build
```

Extension goes to `~/.local/share/vicinae/extensions/takoba/`. Restart Vicinae or run `vicinae server`.

---

### Mac / Windows → Raycast

#### One-liner

**Mac (Terminal):**
```bash
curl -sSL https://raw.githubusercontent.com/kurojs/Takoba/main/scripts/install-raycast.sh | bash
```

**Windows (PowerShell):**
```powershell
iwr -useb https://raw.githubusercontent.com/kurojs/Takoba/main/scripts/install-raycast.ps1 | iex
```

#### Manual

```bash
git clone https://github.com/kurojs/takoba.git ~/Takoba
cd ~/Takoba
npm install
npm run build:raycast
npx ray develop   # registers with Raycast
```

After registering with `ray develop`, the extension appears in Raycast instantly. You can Ctrl+C after it loads — the extension stays registered.

---

### Requirements

| Dependency | Required | Notes |
|-----------|----------|-------|
| **Vicinae** (Linux) | ✅ For Vicinae | Launcher. Install via `yay -S vicinae-bin` or from [GitHub releases](https://github.com/vicinaehq/vicinae) |
| **Raycast** (Mac/Windows) | ✅ For Raycast | Install from [raycast.com](https://raycast.com) |
| Node.js ≥ 18 | ✅ Yes | Required for build |
| [Anki](https://apps.ankiweb.net) + [AnkiConnect](https://foosoft.net/projects/anki-connect/) | Optional | For Anki export. AnkiConnect plugin code: `2055492159` |
| [ElevenLabs](https://elevenlabs.io) API key | Optional | For TTS. Free key at elevenlabs.io |
| `ffplay` (ffmpeg) or `mpv` | Optional | For audio on Linux: `sudo pacman -S ffmpeg` or `sudo pacman -S mpv` |
| [Gemini](https://aistudio.google.com/) API key | Optional | For AI explanations. Free tier available |

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

## Configuration

Access preferences through your launcher's extension settings panel:
- **Vicinae**: `Extensions → Takoba → Preferences`
- **Raycast**: `⌘ , → Extensions → Takoba`

### General

| Setting | Default | What it does |
|---------|---------|-------------|
| **Definition Language** | `Spanish` | Language for Jotoba definitions (English, Spanish, German, French, Russian, Swedish, Dutch, Hungarian, Slovenian) |
| **Auto-load Text** | `true` | Automatically load selected/clipboard text when Takoba opens |

### Anki

| Setting | Default | What it does |
|---------|---------|-------------|
| **AnkiConnect Port** | `8765` | Local port for AnkiConnect API |

### Text-to-Speech

| Setting | Default | What it does |
|---------|---------|-------------|
| **ElevenLabs API Key** | — | Your API key for TTS. Get one at elevenlabs.io |
| **ElevenLabs Voice ID** | `21m00Tcm4TlvDq8ikWAM` | Voice for word pronunciation (default: Rachel). Use a Japanese voice for best results |

### AI Explanations

| Setting | Default | What it does |
|---------|---------|-------------|
| **Gemini API Key** | — | API key from Google AI Studio. Required for AI features |
| **AI Model** | `gemini-2.5-flash` | Gemini model. 15 models available including Pro and Flash variants |
| **AI Response Language** | `Spanish` | Language for AI explanations. 21 languages supported |
| **Custom AI Prompt** | — | Extra instructions for the AI (personality, format, focus areas) |
| **AI Voice ID** | `21m00Tcm4TlvDq8ikWAM` | ElevenLabs voice for reading AI responses aloud |
| **Show Furigana** | `false` | Adds furigana readings above translations — uses local kuroshiro+kuromoji |

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

1. Launch your launcher (Vicinae on Linux, Raycast on Mac/Windows) and search for "Takoba"
2. Type a Japanese word, kanji, or phrase
3. **Translation section** appears at the top if Google Translate has results
4. **Words** and **Kanji** sections show Jotoba dictionary results
5. Select any result to see full details
6. `⌘A` to add to Anki, `⌘P` to hear pronunciation, `Tab` for AI explanation

### Tips

- **AI language**: Set the "AI Response Language" independently from "Definition Language" — get definitions in Spanish and AI explanations in English, or vice versa.
- **Furigana**: Enable "Show Furigana" in settings. Readings are generated locally using kuroshiro+kuromoji — no API key needed.
- **TTS voice**: Use a native Japanese ElevenLabs voice for best pronunciation results.

---

## Architecture

```
          ┌───────────────────┐   ┌────────────────────┐
          │ Vicinae (Linux)    │   │ Raycast (Mac/Win)  │
          │  ┌─────────────┐   │   │  ┌──────────────┐  │
          │  │  Takoba     │   │   │  │  Takoba      │  │
          │  └──────┬──────┘   │   │  └──────┬───────┘  │
          └─────────┼──────────┘   └─────────┼──────────┘
                    │                        │
                    ▼                        ▼
            ┌────────────────────────────────────┐
            │           API / Data Layer          │
            │ Jotoba · Google Translate · Gemini  │
            │   ElevenLabs · AnkiConnect          │
            └────────────────────────────────────┘
```

### Data Flow

1. **Search** → 500ms debounce → parallel Jotoba lookups (words + kanji) + Google Translate
2. **Display** → Results in sections (Translation, Words, Kanji) with inline markdown
3. **Detail** → Lazy sentence fetching from Jotoba/Tatoeba corpus
4. **Anki** → 3 auto-created decks (Takoba Words/Kanji/Translation) with per-deck dedup → card created using Basic model
5. **Audio** → ElevenLabs multilingual TTS → temp MP3 → system player (ffplay/mpv)
6. **AI** → Gemini-powered explanations for any word, kanji, or phrase

### Key Technical Decisions

- **Single-file architecture**: ~1500 lines of TSX in one file. Separation through function boundaries.
- **No build-time framework**: Uses Vicinae's `vici` bundler. Just TypeScript + fetch.
- **Section-based decks**: 3 flat decks (Takoba Words/Kanji/Translation) — no user configuration needed
- **Lazy loading**: Example sentences fetched on-demand when selecting a word.
- **In-memory API caching**: Furigana and AI explanation results cached for 1 hour per session.

---

## Troubleshooting

### Anki: "Not connected"
Ensure Anki is running and AnkiConnect is installed (plugin code `2055492159`).

```bash
curl -X POST http://localhost:8765 \
  -H "Content-Type: application/json" \
  -d '{"action": "version", "version": 6}'
```

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
takoba/
├── assets/
│   └── icon.png          # Extension icon (256×256)
├── src/
│   ├── takoba.tsx         # Main entry point
│   ├── types.ts           # TypeScript types & constants
│   ├── i18n/index.ts      # 9-language translations
│   ├── api/               # External API clients
│   ├── utils/             # Formatters & utilities
│   └── components/        # List/detail components
├── package.json           # Dependencies, metadata, preferences schema
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

### Commands

```bash
npm run build            # Build for Vicinae (Linux)
npm run build:raycast    # Build for Raycast (Mac/Windows)
npm run dev              # Watch mode (builds for current shim)
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
- [Raycast](https://raycast.com) — Mac/Windows launcher platform
- [AnkiConnect](https://foosoft.net/projects/anki-connect/) — Anki automation API
- [ElevenLabs](https://elevenlabs.io) — AI text-to-speech
- [Google Gemini](https://deepmind.google/technologies/gemini/) — AI explanation engine
- [KanjiVG](https://kanjivg.tagaini.net) — Kanji vector graphics reference
