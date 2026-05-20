# Kotoba (言葉)

> A Vicinae extension that combines Japanese dictionary lookup via [Jotoba](https://jotoba.de), sentence translation, and one-click Anki card creation with ElevenLabs text-to-speech.

Search any Japanese word, kanji, or full sentence — get instant definitions, readings, furigana breakdown, part-of-speech analysis, and example sentences — then push the result to Anki with a single keystroke.

---

## Features

- **Sentence Translation** — Paste a full Japanese sentence and get the translation plus furigana readings for every kanji, powered by Jotoba's Tatoeba corpus
- **Bilingual Definitions** — Results in your preferred language (Spanish, English, German, etc.) with automatic English fallback
- **Kanji Analysis** — Stroke count, JLPT level, grade, on'yomi/kun'yomi readings, radical decomposition, and stroke order diagrams
- **Example Sentences** — Contextual sentences with translations, fetched on-demand when viewing word details
- **Anki Integration** — One-click card creation (`⌘A`) using AnkiConnect with per-deck duplicate detection. Shares configuration with the [Japanese Translator](https://github.com/kurojs/vicinae-japanese-translator) extension
- **ElevenLabs TTS** — High-quality Japanese text-to-speech playback (`⌘P`) via the ElevenLabs API
- **Pitch Accent** — Visual pitch accent indicators for words (when available from Jotoba)
- **Clipboard Integration** — Auto-loads selected text on launch; copy word, reading, or definition with keyboard shortcuts
- **Debounced Search** — 500ms debounce to minimise API calls while typing

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Vicinae (Raycast-compatible Launcher)        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                Kotoba (TSX → JS bundle)                      │   │
│  │                                                              │   │
│  │  ┌─────────────┐    ┌──────────────┐    ┌────────────────┐  │   │
│  │  │ Search View  │───▶│  Detail View  │───▶│  Action Panel   │  │   │
│  │  │ (List +      │    │ (Markdown +   │    │ (Anki, Audio,   │  │   │
│  │  │  Sections)   │    │  Metadata)    │    │  Copy, Open)    │  │   │
│  │  └──────┬───────┘    └──────┬────────┘    └────────┬───────┘  │   │
│  │         │                   │                       │          │   │
│  │         ▼                   ▼                       ▼          │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │                    API Layer                             │   │   │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │   │
│  │  │  │ Jotoba Words │  │ Jotoba Kanji │  │ Jotoba Sents │   │   │   │
│  │  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │
│  │  HTTP ─────────▶ jotoba.de/api ──────────── REST API                │
│  │  HTTP ─────────▶ localhost:8765  ────────── AnkiConnect             │
│  │  HTTPS ────────▶ api.elevenlabs.io ──────── ElevenLabs TTS API      │
│  └─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Search** — User types a query → 500ms debounce → parallel requests to `/api/search/words`, `/api/search/kanji`, and `/api/search/sentences`
2. **Translation Header** — If the query is a sentence (≥20 chars or 3+ words), a translation section appears at the top with the sentence's furigana breakdown and translation
3. **Display** — Results rendered in sections (`Translation`, `Words`, `Kanji`) with inline detail markdown
4. **Detail Expansion** — Selecting a word triggers a lazy fetch to `/api/search/sentences` for example sentences relevant to that word
5. **Anki Export** — `⌘A` builds a note from the word data, validates AnkiConnect connectivity, resolves the target model's field schema dynamically, checks for duplicates within the target deck only, and ships the card via AnkiConnect's `addNote` API
6. **Audio Playback** — `⌘P` streams text-to-speech via ElevenLabs API (multilingual model), saves a temp MP3, and plays it through the system's default audio player (ffplay → mpv → afplay)

---

## Prerequisites

| Dependency | Required | Notes |
|-----------|----------|-------|
| [Vicinae](https://github.com/vicinaehq/vicinae) | Yes | Raycast-compatible launcher for Linux. Install via AUR: `yay -S vicinae-bin` |
| [Anki](https://apps.ankiweb.net) with [AnkiConnect](https://foosoft.net/projects/anki-connect/) | For Anki features | Anki must be running. AnkiConnect plugin code: `2055492159` |
| [ElevenLabs](https://elevenlabs.io) API Key | For TTS audio | Optional. Configure in extension settings |
| `ffplay` (ffmpeg) or `mpv` | For audio playback | Install: `sudo pacman -S ffmpeg` or `sudo pacman -S mpv` |

### Verifying Prerequisites

```bash
# AnkiConnect
curl -X POST http://localhost:8765 \
  -H "Content-Type: application/json" \
  -d '{"action": "version", "version": 6}'
# Expected: {"result": 6, "error": null}
```

---

## Installation

### From AUR (recommended)

```bash
yay -S kotoba
```

### From Source

```bash
# Clone
git clone git@github.com:kurojs/vicinae-jotoba-anki.git
cd vicinae-jotoba-anki

# Install dependencies
npm install

# Build and install into Vicinae
npm run build
```

The built extension is automatically installed to `~/.local/share/vicinae/extensions/kotoba/`.

### Development Mode

```bash
npm run dev
```

This starts a file watcher that rebuilds on every change.

---

## Configuration

Access preferences through Vicinae's extension settings panel.

| Setting | Key | Default | Description |
|---------|-----|---------|-------------|
| **Definition Language** | `userLanguage` | `Spanish` | Language for word definitions (English, Spanish, German, etc.) |
| **Anki Deck** | `ankiDeck` | `CUSTOM TRANSLATE` | Target Anki deck name |
| **Anki Note Model** | `ankiModel` | `Basic-d5482` | Note type for card creation |
| **AnkiConnect Port** | `ankiPort` | `8765` | AnkiConnect API port |
| **ElevenLabs API Key** | `elevenlabsApiKey` | — | API key for ElevenLabs TTS. Get yours at [elevenlabs.io](https://elevenlabs.io) |
| **ElevenLabs Voice ID** | `elevenlabsVoiceId` | `21m00Tcm4TlvDq8ikWAM` | Voice ID (default: Rachel). Browse voices at [elevenlabs.io](https://elevenlabs.io) |
| **Show Translation Image** | `showTranslationImage` | `false` | Show a Google image below the translation (requires GCS API) |
| **Google Custom Search Key** | `gcsApiKey` | — | API key for Google Custom Search Image. Get one at [console.cloud.google.com](https://console.cloud.google.com) |
| **Google Search Engine ID** | `gcsCxId` | — | Search Engine ID (cx) for Google CSE. Create at [cse.google.com](https://cse.google.com/cse/) |
| **Auto-load Text** | `autoLoadText` | `true` | Automatically load clipboard text on launch |

### Anki Note Mapping

The extension dynamically resolves the target model's field schema at export time. It attempts to match fields by convention:

| Card Side | Lookup Order |
|-----------|-------------|
| **Front** | `Front` → `Expression` → `Word` → `fields[0]` |
| **Back** | `Back` → `Meaning` → `Translation` → `fields[1]` |

Cards are tagged with `vicinae`, `japanese`, `kotoba`. Duplicate detection is scoped to the target deck only (you can add the same word to different decks).

---

## Usage

### Basic Workflow

1. Launch Vicinae and type "Kotoba" (or your configured hotkey)
2. Type a Japanese word, kanji, or full sentence in the search bar
3. **For sentences:** See the translation and furigana breakdown at the top, plus word-by-word analysis below
4. **For words:** Browse results across Words and Kanji sections
5. Select a result to view full details — definitions, readings, example sentences, pitch accent
6. Press `⌘A` to add a card to Anki, or `⌘P` to hear pronunciation

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘A` | Add selected word/kanji/sentence to Anki |
| `⌘P` | Play ElevenLabs audio |
| `⌘C` | Copy word/kanji to clipboard |
| `⌘⇧C` | Copy definition/meanings to clipboard |

---

## API Reference

This extension consumes three Jotoba API endpoints and the ElevenLabs TTS API:

### `POST /api/search/words`

```json
{ "query": "日本語", "language": "Spanish", "no_english": false }
```

### `POST /api/search/kanji`

```json
{ "query": "日本語", "language": "Spanish" }
```

### `POST /api/search/sentences`

```json
{ "query": "日本語", "language": "Spanish", "no_english": false }
```

Response includes `content`, `furigana` (e.g. `[日本|にほん][語|ご]`), and `translation`.

### ElevenLabs TTS

```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
Headers: xi-api-key: {key}
Body: { text: "...", model_id: "eleven_multilingual_v2", voice_settings: {...} }
```

---

## Development

### Project Structure

```
kotoba/
├── assets/
│   └── icon.svg           # Extension icon
├── src/
│   └── kotoba.tsx          # Main source — full extension logic
├── package.json            # Dependencies, metadata, preferences schema
├── tsconfig.json           # TypeScript configuration
└── README.md
```

### Building

```bash
npm run build     # Production build → ~/.local/share/vicinae/extensions/kotoba/
npm run dev       # Watch mode with hot-rebuild
```

### Key Technical Decisions

- **Single-file architecture** — The entire extension lives in one TSX file for maintainability. Separation is achieved through function boundaries (API client, Anki helpers, ElevenLabs TTS, UI components).
- **Dynamic Anki field mapping** — Instead of hardcoding field names, the extension queries AnkiConnect for the model's schema and maps fields by convention. This makes it compatible with any note type.
- **Lazy sentence fetching** — Example sentences are fetched on-demand when a word is selected, not during the initial search. This keeps searches fast and avoids unnecessary API calls.
- **Debounced search** — A 500ms debounce prevents API rate limiting and reduces visual flicker during rapid typing.
- **Per-deck duplicate detection** — Uses AnkiConnect's `duplicateScope: "deck"` option so the same word can exist in different decks without conflict.
- **Cross-extension compatibility** — Shares Anki configuration with the companion [Japanese Translator](https://github.com/kurojs/vicinae-japanese-translator) extension, so both extensions use the same deck, model, and AnkiConnect port.

---

## Troubleshooting

### Anki: "Not connected"

```bash
curl -X POST http://localhost:8765 \
  -H "Content-Type: application/json" \
  -d '{"action": "version", "version": 6}'
```

Ensure Anki is running and AnkiConnect is installed (plugin code: `2055492159`).

### Anki: "Model does not exist"

List available note types:
```bash
curl -X POST http://localhost:8765 \
  -H "Content-Type: application/json" \
  -d '{"action": "modelNames", "version": 6}'
```

Update the extension preference with an existing model name from the response.

### Audio: "No audio player found"

Install either:
```bash
sudo pacman -S ffmpeg    # provides ffplay
# or
sudo pacman -S mpv
```

### Audio: "ElevenLabs API key not configured"

Add your ElevenLabs API key in the extension preferences. Get one at [elevenlabs.io](https://elevenlabs.io).

### Extension not appearing in Vicinae

```bash
vicinae server    # Restart the Vicinae server
```

---

## License

MIT — see [LICENSE](./LICENSE).

---

## Acknowledgements

- [Jotoba](https://jotoba.de) — Free multilingual Japanese dictionary API
- [Vicinae](https://github.com/vicinaehq/vicinae) — Linux launcher platform
- [AnkiConnect](https://foosoft.net/projects/anki-connect/) — Anki automation API
- [ElevenLabs](https://elevenlabs.io) — AI text-to-speech
