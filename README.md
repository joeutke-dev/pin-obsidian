# Pin on Top

Keep the window on top of all other windows, with adjustable translucency.

## Features

- **Always on top toggle** — via ribbon icon or command
- **Translucency** — opacity presets plus a fine-grained slider (50–100%)
- **Persistent state** — remembers your settings between sessions
- **Hotkey support** — assign keyboard shortcuts to the toggle commands

## Usage

| Action | How |
|---|---|
| Toggle always-on-top | Click the pin icon in the ribbon |
| Toggle via keyboard | Settings → Hotkeys → search "Pin on Top" |
| Adjust opacity | Settings → Pin on Top → drag the slider or pick a preset |
| Cycle presets | Command palette: "Cycle opacity preset" |

## Opacity presets

| Preset | Value |
|---|---|
| Opaque | 100% |
| Barely there | 95% |
| Light | 90% |
| Medium | 80% |
| Heavy | 70% |

## Development

```bash
npm install      # install dependencies
npm run dev      # watch + rebuild main.js on change
npm run build    # type-check and produce a production main.js
```

The plugin is written in TypeScript (`main.ts`) and bundled to `main.js` with esbuild.

## Notes

- Desktop only (macOS, Windows, Linux) — uses the Electron window APIs through `@electron/remote`.
- Opacity affects the entire Obsidian window. Values above 85% are recommended for readability.
- Window opacity is supported on macOS and Windows; on Linux it depends on the compositor.
- Always-on-top and opacity reset to defaults when the plugin is disabled.

## License

[MIT](LICENSE)
