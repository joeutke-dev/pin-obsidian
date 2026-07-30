Keep the window on top of all other windows, with adjustable translucency.

<img width="1112" height="720" alt="pinontop" src="https://github.com/user-attachments/assets/875f6064-b31c-4e88-a0e6-3992a91e5d1a" />


## Features





- **Always on top toggle** — via ribbon icon or command
- **Translucency** — opacity presets plus a fine-grained slider

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

