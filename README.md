# Link Extractor — Obsidian Plugin

Scan any note for external links and copy them as a list — great for building bibliographies, reference lists, or sharing resources.

## Features

- Extracts all external (`http`/`https`) links from the active note
- Detects markdown links `[text](url)`, bare URLs, and angle-bracket links `<url>`
- Deduplicates automatically
- Four output formats:
  - **Plain URLs** — one per line
  - **Bullet List** — `- https://...`
  - **Numbered List** — `1. https://...`
  - **Markdown Links** — `- [url](url)`
- One-click **Copy to Clipboard**

## Usage

1. Open any note
2. Open the Command Palette (`Ctrl+P` / `Cmd+P`)
3. Run **"Extract External Links from Note"**
4. Choose your format and click **Copy to Clipboard**
5. Paste into another note, a bibliography generator, a spreadsheet — wherever you need it

## Installation

### From Obsidian Community Plugins (recommended)

1. Open **Settings → Community Plugins**
2. Search for **Link Extractor**
3. Click **Install**, then **Enable**

### Manual

1. Download `main.js`, `manifest.json`, and `versions.json` from the [latest release](https://github.com/AndyM-DC/obsidian-link-extractor/releases/latest)
2. Copy them into `<YourVault>/.obsidian/plugins/link-extractor/`
3. Reload Obsidian and enable the plugin under **Settings → Community Plugins**

## Development

```bash
npm install
npm run dev      # watch mode
npm run build    # production build
```

## License

[MIT](LICENSE)
