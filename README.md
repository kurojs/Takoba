# Jotoba + Anki

> A Vicinae extension that combines Japanese dictionary lookup via [Jotoba](https://jotoba.de) with one-click Anki card creation and VoiceVox text-to-speech.

Search any Japanese word or kanji and get instant definitions, readings, part-of-speech analysis, and example sentences — then push the result to Anki with a single keystroke.

---

## Features

- **Bilingual Definitions** — Results in your preferred language (Spanish, English, German, etc.) with automatic English fallback
- **Kanji Analysis** — Stroke count, JLPT level, grade, on'yomi/kun'yomi readings, radical decomposition, and stroke order diagrams
- **Example Sentences** — Contextual sentences with translations, fetched on-demand when viewing word details
- **Anki Integration** — One-click card creation (`⌘A`) using AnkiConnect. Shares configuration with the [Japanese Translator](https://github.com/kurojs/vicinae-japanese-translator) extension
- **VoiceVox TTS** — High-quality Japanese text-to-speech playback (`⌘P`) via the VoiceVox engine
- **Clipboard Integration** — Auto-loads selected text on launch; copy word, reading, or definition with keyboard shortcuts
- **Debounced Search** — 500ms debounce to minimise API calls while typing

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Vicinae (Raycast-compatible Launcher)        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │             jotoba-anki extension (TSX → JS bundle)          │   │
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
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  HTTP ─────────▶ jotoba.de/api ──────────── REST API                │
│  HTTP ─────────▶ localhost:8765  ────────── AnkiConnect             │
│  HTTP ─────────▶ localhost:50021 ────────── VoiceVox Engine         │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Search** — User types a query → 500ms debounce → parallel requests to `/api/search/words` and `/api/search/kanji`
2. **Display** — Results rendered in two List sections (`Words`, `Kanji`) with inline detail markdown
3. **Detail Expansion** — Selecting a word triggers a lazy fetch to `/api/search/sentences` for example sentences
4. **Anki Export** — `⌘A` builds a note from the word data, validates AnkiConnect connectivity, resolves the target model's field schema dynamically, and ships the card via AnkiConnect's `addNote` API
5. **Audio Playback** — `⌘P` synthesises speech via VoiceVox, writes a temp WAV, and plays it through the system's default audio player (ffplay → mpv → afplay)

---

## Prerequisites

| Dependency | Required | Notes |
|-----------|----------|-------|
| [Vicinae](https://github.com/vicinaehq/vicinae) | Yes | Raycast-compatible launcher for Linux. Install via AUR: `yay -S vicinae-bin` |
| [Anki](https://apps.ankiweb.net) with [AnkiConnect](https://foosoft.net/projects/anki-connect/) | For Anki features | Anki must be running. AnkiConnect plugin code: `2055492159` |
| [VoiceVox](https://voicevox.hiroshiba.jp) | For TTS audio | Optional. Engine must be running on port `50021` (default) |
| `ffplay` (ffmpeg) or `mpv` | For audio playback | Install: `sudo pacman -S ffmpeg` or `sudo pacman -S mpv` |

### Verifying Prerequisites

```bash
# AnkiConnect
curl -X POST http://localhost:8765 \
  -H "Content-Type: application/json" \
  -d '{"action": "version", "version": 6}'
# Expected: {"result": 6, "error": null}

# VoiceVox
curl http://localhost:50021/speakers
# Expected: JSON array of available speakers
```

---

## Installation

```bash
# Clone
git clone git@github.com:kurojs/vicinae-jotoba-anki.git
cd vicinae-jotoba-anki

# Install dependencies
npm install

# Build and install into Vicinae
npm run build
```

The built extension is automatically installed to `~/.local/share/vicinae/extensions/jotoba-anki/`.

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
| **VoiceVox Port** | `voicevoxPort` | `50021` | VoiceVox engine port |
| **VoiceVox Speaker** | `voicevoxSpeaker` | `1` | Speaker ID (1 = ずんだもん) |
| **Auto-load Text** | `autoLoadText` | `true` | Automatically load clipboard text on launch |

### Anki Note Mapping

The extension dynamically resolves the target model's field schema at export time. It attempts to match fields by convention:

| Card Side | Lookup Order |
|-----------|-------------|
| **Front** | `Front` → `Expression` → `Word` → `fields[0]` |
| **Back** | `Back` → `Meaning` → `Translation` → `fields[1]` |

Cards are tagged with `vicinae`, `japanese`, `jotoba`.

---

## Usage

### Basic Workflow

1. Launch Vicinae and type "Jotoba + Anki" (or your configured hotkey)
2. Type a Japanese word or kanji in the search bar
3. Browse results across the Words and Kanji sections
4. Select a result to view full details — definitions, readings, example sentences
5. Press `⌘A` to add a card to Anki, or `⌘P` to hear pronunciation

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘A` | Add selected word/kanji to Anki |
| `⌘P` | Play VoiceVox audio |
| `⌘C` | Copy word/kanji to clipboard |
| `⌘⇧C` | Copy definition/meanings to clipboard |

### VoiceVox Speakers

| ID | Character | Voice Type |
|----|-----------|------------|
| 1 | ずんだもん | High-pitched, friendly |
| 2 | 四国めたん | Gentle, warm |
| 3 | 春日部つむぎ | Calm, clear |
| 8 | 青山龍星 | Deep, mature |

List all available speakers:
```bash
curl http://localhost:50021/speakers | jq
```

---

## API Reference

This extension consumes three Jotoba API endpoints:

### `POST /api/search/words`

**Request:**
```json
{ "query": "日本語", "language": "Spanish", "no_english": false }
```

**Response shape:**
```json
{
  "words": [{
    "reading": { "kanji": "日本語", "kana": "にほんご" },
    "common": true,
    "senses": [
      { "glosses": ["Japanese (language)"], "pos": [{"Noun": "Normal"}], "language": "English" },
      { "glosses": ["japonés (idioma)"], "language": "Spanish" }
    ],
    "audio": "/resource/audio/..."
  }]
}
```

### `POST /api/search/kanji`

**Request:**
```json
{ "query": "日本語", "language": "Spanish" }
```

**Response:**
Kanji entries with `literal`, `meanings`, `onyomi`, `kunyomi`, `jlpt`, `grade`, `stroke_count`, `parts`, `radical`.

### `POST /api/search/sentences`

**Request:**
```json
{ "query": "日本語", "language": "Spanish", "no_english": false }
```

**Response:**
```json
{
  "sentences": [{
    "content": "日本語は話せますか。",
    "translation": "¿Sabe hablar japonés?",
    "language": "Spanish",
    "eng": "Do you speak Japanese?"
  }]
}
```

---

## Development

### Project Structure

```
vicinae-jotoba-anki/
├── assets/
│   └── icon.svg          # Extension icon
├── src/
│   └── jotoba.tsx         # Main source — full extension logic
├── package.json           # Dependencies, metadata, preferences schema
├── tsconfig.json          # TypeScript configuration
└── README.md
```

### Building

```bash
npm run build     # Production build → ~/.local/share/vicinae/extensions/jotoba-anki/
npm run dev       # Watch mode with hot-rebuild
```

### Key Technical Decisions

- **Single-file architecture** — The entire extension lives in one TSX file for maintainability. Separation is achieved through function boundaries (API client, Anki helpers, VoiceVox helpers, UI components).
- **Dynamic Anki field mapping** — Instead of hardcoding field names, the extension queries AnkiConnect for the model's schema and maps fields by convention. This makes it compatible with any note type.
- **Lazy sentence fetching** — Example sentences are fetched on-demand when a word is selected, not during the initial search. This keeps searches fast and avoids unnecessary API calls.
- **Debounced search** — A 500ms debounce prevents API rate limiting and reduces visual flicker during rapid typing.
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

### Audio: VoiceVox not responding

```bash
curl http://localhost:50021/speakers
```

Ensure VoiceVox is running and the port matches your preference (`voicevoxPort`).

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
- [VoiceVox](https://voicevox.hiroshiba.jp) — Japanese text-to-speech engine
