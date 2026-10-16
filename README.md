# Asuka Linter Buddy

A little companion panel that reacts to your code's diagnostics (the red/yellow
squiggly lines): it stays visible while idle, scolds you while there's an error,
and congratulates you briefly when you fix it.

## Why a panel and not a floating character?

VS Code's extension API doesn't allow arbitrary floating overlays drawn on top
of the text editor itself — webviews always live inside a docked panel (sidebar,
bottom panel, or editor tab). This extension adds an icon to the Activity Bar
(left side) that opens a small "Linter Buddy" panel. Keep it open in a side
panel while you code and it'll react in real time.

## Setup

1. Copy this folder anywhere, then in a terminal:
   ```bash
   npm install -g @vscode/vsce   # only if you want to package it later
   ```
2. Open the folder in VS Code.
3. The `media/` folder includes multiple idle, angry, and happy images. Add or
   replace images there and update the corresponding image lists in
   `MOOD_IMAGES` in `extension.js` if you want to include additional files.
4. Press `F5` (or Run > Start Debugging). This opens a new "Extension
   Development Host" window with the extension loaded.
5. Click the new icon in the Activity Bar to open the "Linter Buddy" view.
6. The idle character is visible when there are no diagnostics. Open any file
   and introduce a syntax error / type error — the scolding bubble appears.
   Fix it — you get a "Good job" message for a few seconds, then the view
   returns to idle.

## How it works

- `vscode.languages.onDidChangeDiagnostics` fires every time squiggles are
  added or removed anywhere in the workspace.
- On each change (and on editor switch), we call
  `vscode.languages.getDiagnostics(uri)` for the *active* file only, and check
  whether any diagnostic meets the configured severity threshold.
- A `WebviewViewProvider` (`extension.js`) tracks state (`idle` / `error` /
  `good`) and re-renders a tiny HTML page with a randomly selected image for
  that mood. The idle image remains visible without a speech bubble.
- Settings (Preferences > Settings > search "Asuka"):
  - `asukaBuddy.severityThreshold`: react to `Error`s only, or `Warning`s too.
  - `asukaBuddy.goodJobDurationMs`: how long the "Good job" message lingers.

## Customizing further

- Add more lines to `ERROR_LINES` / `GOOD_LINES` in `extension.js` for
  variety.
- To react per-file instead of "any file in the workspace", you're already
  doing that — `checkActiveEditor()` only looks at the currently open file.
- If you want it to also count problems across the *whole project* (not just
  the open file), swap `vscode.languages.getDiagnostics(editor.document.uri)`
  for `vscode.languages.getDiagnostics()` with no argument, which returns
  `[uri, diagnostics][]` pairs for every file.
- To package it as a real `.vsix` you can install elsewhere:
  ```bash
  npx vsce package
  ```

## Packaging note

This scaffold has no build step (plain CommonJS `extension.js`), so `npm install`
isn't required to run it in the Dev Host — only `@vscode/vsce` is needed if you
want to produce a `.vsix` file.
