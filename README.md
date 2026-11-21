# Aura Kinetic Desktop

Minimal, locked-down Electron desktop shell for **Aura Kinetic ERP** on macOS (`.dmg` universal) and Windows (`.exe` x64 NSIS).

## Security Model
- Loads **only** the configured Aura Kinetic origin (`config.json` → `https://aura-kinetic-erp.pages.dev`).
- Runs with `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`.
- Blocks navigation to any external host; safe external links (`https:`, `mailto:`, `tel:`) open in the system default browser.
- Grants only `media` (camera for QR scanning), `fullscreen`, and `clipboard-sanitized-write` for our own origin.
- Exposes only `window.auraDesktop` (`isDesktop`, `platform`, `getVersion`, `retry`, `setKiosk`).

## Running Locally

```bash
npm install
npm start
```

### Pointing at a Staging / Preview Deployment (Unpackaged Only)

```bash
AURA_APP_URL=https://<preview-url>.aura-kinetic-erp.pages.dev npm start
```

> Packaged builds **always** ignore `AURA_APP_URL` and load `config.json`.

## Running Tests

```bash
npm test
```

## Building Installers Locally

- **macOS (Universal `.dmg`)** — run on macOS:
  ```bash
  npm run dist:mac
  ```
- **Windows (x64 `.exe`)** — run on Windows:
  ```bash
  npm run dist:win
  ```

Outputs are written to `dist/` using the naming format `AuraKinetic-<version>-<os>-<arch>.<ext>`.

## Releasing (GitHub Actions)
Releases are automated via `.github/workflows/release.yml` (pull requests are verified by `.github/workflows/ci.yml`).
1. Edit `"version"` in `package.json` (e.g., `"1.0.1"`).
2. Commit the change to `main`.
3. Tag and push (the workflow fails if the tag does not equal `v<package.json version>`):
   ```bash
   git tag v1.0.1 && git push --tags
   ```
4. GitHub Actions builds `AuraKinetic-<version>-mac-universal.dmg` on `macos-latest` and `AuraKinetic-<version>-win-x64.exe` on `windows-latest`, generates `SHA256SUMS.txt`, and publishes them to the GitHub Release.

## Unsigned Installers (v1)
v1 installers are **not code-signed** with an Apple Developer ID or Windows Authenticode certificate:
- On **macOS**, `scripts/adhoc-sign.js` applies an ad-hoc signature (`codesign --force --deep --sign -`) when `CSC_LINK` is unset so Apple Silicon Macs can run the app after right-click → **Open** (or System Settings → Privacy & Security → **Open Anyway**).
- On **Windows**, SmartScreen may show *"Windows protected your PC"* → click **More info** → **Run anyway**.

## Replacing the App Icon
`build/icon.png` is a generated 1024×1024 placeholder icon (`npm run make-icon`). Replace `build/icon.png` with your final 1024×1024 PNG logo (no alpha clipping issues); `electron-builder` automatically derives macOS `.icns` and Windows `.ico` from it.
