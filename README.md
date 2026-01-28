# Embed Width Adjuster

Control embedded note widths using aliases in Live Preview.

> [!WARNING]
> This plugin is provided **as-is** for personal use. The repository is public for anyone who wants to fork and adapt it.
> Please do not open issues for support or feature requests.

## Features

📐 **Width aliases** — Use `|wide`, `|max`, or `|full` to control embed width

✨ **Live Preview support** — Works in the editor, not just Reading view

🎨 **CSS-driven** — Bring your own styles via CSS snippets

> [!NOTE]
> This plugin is inspired by [Kepano's Minimal theme](https://github.com/kepano/obsidian-minimal) image width feature. It extracts that concept for use with any theme.

## Usage

Add an alias to your embed:

```markdown
![[My Note|wide]]
![[Dashboard|max]]
![[Full Width Content|full]]
```

The plugin adds a `data-width` attribute to the embed element:

```html
<div class="internal-embed" data-width="wide">...</div>
```

### Required CSS

This plugin only adds the attribute — you need CSS to define what each width means. Example snippet:

```css
/* Wide: break out of content width slightly */
.internal-embed[data-width="wide"] {
  max-width: 100%;
  width: 100%;
}

/* Max: full container width */
.internal-embed[data-width="max"] {
  max-width: none;
  width: calc(100% + 2rem);
  margin-left: -1rem;
}

/* Full: viewport width */
.internal-embed[data-width="full"] {
  max-width: none;
  width: 100vw;
  margin-left: calc(50% - 50vw);
}
```

| Alias  | Suggested Use                      |
| ------ | ---------------------------------- |
| `wide` | Slightly wider than content column |
| `max`  | Full container/pane width          |
| `full` | Full viewport width                |

## Installation

### Manual

1. Download `main.js` and `manifest.json` from the [Releases](../../releases) page
2. Create `.obsidian/plugins/embed-width-adjuster/` in your vault
3. Place the files in that folder
4. Enable the plugin in **Settings → Community plugins**

### BRAT

1. Install [Obsidian42 - BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. Run `BRAT: Add a beta plugin for testing`
3. Enter this repository URL

## Credits

Width alias concept inspired by [Minimal Theme](https://github.com/kepano/obsidian-minimal) by [@kepano](https://github.com/kepano).

## Images

<img width="1514" height="951" alt="SCR-20260128-ntha" src="https://github.com/user-attachments/assets/17d4c933-3a8e-41e4-bffb-77f2d84381b0" />

<img width="1514" height="951" alt="SCR-20260128-ntmu" src="https://github.com/user-attachments/assets/9ee03c64-34d5-4692-98da-d35e299c2cc5" />

## License

[MIT](LICENSE)
