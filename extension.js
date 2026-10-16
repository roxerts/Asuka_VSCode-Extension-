const vscode = require('vscode');

const SEVERITY_MAP = {
  Error: vscode.DiagnosticSeverity.Error,
  Warning: vscode.DiagnosticSeverity.Warning,
};

// A small library of lines so she doesn't say the exact same thing every time.
const ERROR_LINES = [
  'Fix that!',
  'Are you serious right now?',
  "That's a mistake. Obviously.",
  "You call that code?",
  "I can't believe you wrote this.",
  'Hmph. Try again.',
];

const GOOD_LINES = [
  'Good job.',
  "Well, it's not terrible.",
  "Hmph, not bad.",
  'I guess you know what you are doing.',
  'I suppose that is acceptable.',
  'Finally.',
];

const MOOD_IMAGES = {
  idle: ['asuka-idle.jpg', 'asuka-idle1.jpg'],
  error: ['asuka-angry.jpg', 'asuka-angry2.jpg', 'asuka-angry3.jpg'],
  good: ['asuka-happy.jpg', 'asuka-happy2.jpg'],
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

class AsukaViewProvider {
  static viewType = 'asukaHelper.view';

  constructor(extensionUri) {
    this._extensionUri = extensionUri;
    this._view = undefined;
    this._hasIssue = false;
    this._hideTimer = null;
  }

  resolveWebviewView(webviewView) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    this.render(this._hasIssue ? 'error' : 'idle');
  }

  /** Call this whenever diagnostics for the active file change. */
  setHasIssue(hasIssue) {
    const wasIssue = this._hasIssue;
    this._hasIssue = hasIssue;

    if (!this._view) return;
    if (this._hideTimer) {
      clearTimeout(this._hideTimer);
      this._hideTimer = null;
    }

    if (hasIssue) {
      this.render('error');
    } else if (wasIssue && !hasIssue) {
      // Just went from broken -> clean: brag about it, then hide.
      this.render('good');
      const duration = vscode.workspace
        .getConfiguration('asukaBuddy')
        .get('goodJobDurationMs', 3000);
      this._hideTimer = setTimeout(() => this.render('idle'), duration);
    }
    // If it was already clean and still clean, stay hidden — do nothing.
  }

  render(mode) {
    if (!this._view) return;
    const webview = this._view.webview;
    const imageFile = pick(MOOD_IMAGES[mode]);
    const imgUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', imageFile)
    );
    const message = mode === 'error' ? pick(ERROR_LINES) : mode === 'good' ? pick(GOOD_LINES) : '';

    webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  html, body {
    margin: 0; padding: 0; height: 100%;
    background: transparent;
    font-family: var(--vscode-font-family, sans-serif);
    color: var(--vscode-editor-foreground, #ccc);
  }
  .wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    height: 100%;
    padding: 12px;
    box-sizing: border-box;
    gap: 10px;
  }
  .bubble {
    background: #fff;
    color: #111;
    padding: 10px 14px;
    border-radius: 14px;
    font-size: 13px;
    line-height: 1.3;
    max-width: 220px;
    text-align: center;
    box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    position: relative;
  }
  .bubble::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -8px;
    transform: translateX(-50%);
    border: 8px solid transparent;
    border-top-color: #fff;
  }
  img {
    max-width: 140px;
    height: auto;
    image-rendering: pixelated;
  }
  .placeholder {
    font-size: 11px;
    opacity: 0.6;
    text-align: center;
    padding: 8px;
  }
</style>
</head>
<body>
  <div class="wrap">
    ${message ? `<div class="bubble">${message}</div>` : ''}
    <img src="${imgUri}" onerror="this.style.display='none'; document.getElementById('ph').style.display='block';" />
    <div id="ph" class="placeholder" style="display:none;">
      Add an image for this mood to the media/ folder.
    </div>
  </div>
</body>
</html>`;
  }
}

function activate(context) {
  const provider = new AsukaViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(AsukaViewProvider.viewType, provider)
  );

  function currentSeverityThreshold() {
    const setting = vscode.workspace
      .getConfiguration('asukaBuddy')
      .get('severityThreshold', 'Error');
    return SEVERITY_MAP[setting] ?? vscode.DiagnosticSeverity.Error;
  }

  function checkActiveEditor() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      provider.setHasIssue(false);
      return;
    }
    const threshold = currentSeverityThreshold();
    const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
    const hasIssue = diagnostics.some((d) => d.severity <= threshold);
    provider.setHasIssue(hasIssue);
  }

  context.subscriptions.push(vscode.languages.onDidChangeDiagnostics(checkActiveEditor));
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(checkActiveEditor));
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('asukaBuddy.severityThreshold')) checkActiveEditor();
    })
  );

  checkActiveEditor();
}

function deactivate() {}

module.exports = { activate, deactivate };
