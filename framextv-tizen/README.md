# FrameXTV — independent Samsung Tizen TV application

Locally bundled HTML/CSS/JavaScript for Samsung S90D (2024). **No iframe, embedded
website, remote UI, Android APK, or browser navigation to FrameXTV.** This version
replaces the old wrapper and retains its application ID for signed updates.

**The shipped content is a demo, not the live FrameXTV catalog.** No authorized
FrameXTV API could be verified in this environment. The adapter is disabled.
Read [INTEGRATION_REPORT.md](INTEGRATION_REPORT.md) for evidence and requirements.

## Included features

- Cinematic home, movies, series, anime, curated demo trending/popular/recent rows.
- Details, two seasons with three sample episodes each for series/anime, related
  titles based on category, search and English/Arabic on-screen keyboards.
- Spatial remote focus, horizontal row scrolling, details focus restoration,
  explicit exit confirmation, optional media key registration, RTL layouts.
- Watchlist, continue watching, history, per-episode resume, autoplay-next setting,
  language, picture mode, and confirmation before clearing history/progress.
- AVPlay state controller, prepare/buffering timeout, play/pause/seek, duration,
  resume, next episode, available audio/subtitle track controls, native resource
  cleanup, visibility pause. Browser HTML5 playback is a development fallback.
- Local loading skeletons, empty/error states, missing image placeholders,
  network status, media retry, storage error recovery, lazy/cached local artwork.
- Sixteen fictional titles and four generated 18-second CC0 MP4 samples, bundled
  for offline use. Episodes reuse sample scenes and are clearly labeled previews.

Demo popularity is curated metadata, not audience data. Recommendations are
category-based. There is no account, external content service, sync, telemetry,
DRM integration, purchase flow, or access to actual FrameXTV movies. This is a
functional foundation with device validation outstanding, not a production
streaming service. Assets and licenses: [ASSET_LICENSES.md](ASSET_LICENSES.md).

## Windows: build a signed WGT

1. Install **Tizen Studio**, the **Samsung TV Extension**, **Web CLI tools**, and
   **Samsung Certificate Extension** through Package Manager. Consult Samsung's
   current SDK requirements for supported Windows/Java versions.
2. Add these SDK folders to your Windows user PATH (adjust the install location):

   ```text
   C:\tizen-studio\tools
   C:\tizen-studio\tools\ide\bin
   ```

   Open a new PowerShell and verify `tizen version` and `sdb version`.
3. Extract the source ZIP. In PowerShell, change to the extracted project:

   ```powershell
   Set-Location "$HOME\Downloads\framextv-tizen-source\framextv-tizen"
   ```

   Adjust to where Windows Extract All actually created the folder. It must
   contain `app`, `tools`, and this README.
4. In Tizen Studio **Certificate Manager**, create a **Samsung / TV** profile
   named `FrameXTV`. Sign in with your Samsung account, create/import the author
   certificate, and create a distributor certificate containing your TV's **DUID**.
   Retrieve the DUID through Device Manager when the TV is connected. Follow the
   current Samsung wizard for consumer TV development. Keep the same author
   certificate for future updates. Back up its certificate and password securely;
   distributor authorization can expire and must include each development TV.
   Generic Tizen certificates may not authorize installation on a Samsung TV.
   No keys, passwords or certificates are supplied by this project. Do not put
   them in Git, this ZIP, scripts, issue comments, or chat.
5. Run the build script with your real existing certificate profile:

   ```powershell
   .\tools\build.ps1 -Profile FrameXTV
   ```

   It copies the app into `.output\project`, runs `tizen build-web`, signs with
   `tizen package`, and writes `.wgt` files under `.output\packages`. It does not
   alter source config.xml. If execution policy blocks the local script, review
   the file and use your organization's permitted policy or the manual commands
   below. Do not globally weaken your PowerShell policy.

   To request a 3840x2160 UI viewport for a supported firmware:

   ```powershell
   .\tools\build.ps1 -Profile FrameXTV -Resolution 2160p
   ```

   Default UI is 1920x1080. CSS scales with the viewport and includes safe-area
   padding. AVPlay uses Samsung's separate 1920x1080 display reference space.
   A 4K viewport does not turn the bundled 720p SDR source into 4K/HDR video.
6. Manual CLI alternative (build default 1080p config directly):

   ```powershell
   tizen build-web -- .\app
   tizen package -t wgt -s FrameXTV -- .\app\.buildResult
   ```

   Use the actual `.wgt` path printed by the CLI. An unsigned ZIP renamed WGT is
   not installable. Successful source checks are not a substitute for SDK build
   and Samsung signing. Neither signed packaging nor the PowerShell script could
   be executed here: this cloud machine has no Tizen SDK, PowerShell, certificates
   or connected TV. The script uses supported build/package CLI commands but
   still needs a first real SDK execution.

## Samsung S90D: developer mode, install and launch

1. Put the TV and Windows computer on the same trusted LAN. On the TV open
   **Apps**, enter **12345** through the remote's numeric keypad, turn Developer
   Mode on, enter the Windows computer's LAN IPv4 address, then restart the TV.
   Menus vary by firmware; use Samsung's current Developer Mode instructions.
2. In Tizen Studio **Device Manager**, connect to the TV IP, usually port 26101.
   Accept any TV prompt and choose **Permit to install applications** when offered.
   Retrieve its DUID and ensure the Samsung distributor certificate includes it.
3. In PowerShell, replace the example values and run:

   ```powershell
   sdb connect 192.168.1.50:26101
   sdb devices
   tizen device list
   tizen install -n "C:\path\to\FrameXTV.wgt" -t YOUR_TV_TARGET
   tizen run -p FrameXTV01.FrameXTV -t YOUR_TV_TARGET
   ```

   `YOUR_TV_TARGET` is the exact target name from `tizen device list`. `-n` is the
   actual generated package filename/path, not the source ZIP. This uses Samsung
   **SDB**, not Android ADB.
4. Confirm the independent demo home appears. Play a bundled preview, pause,
   seek, return, reopen and confirm resume. Test all items in
   [docs/DEVICE_ACCEPTANCE.md](docs/DEVICE_ACCEPTANCE.md). Inspect the TV console
   using **Debug As > Tizen Web Application** in Tizen Studio. The player label
   must say **Samsung AVPlay**; browser fallback does not validate native playback.
5. If install fails, check SDK/TV compatibility, Developer Mode host IP and reboot,
   Windows firewall/LAN routing, DUID, distributor expiry, author identity and
   Permit to install. For signature mismatch use the original author certificate.
   Public distribution requires Samsung Seller Office submission and review;
   developer sideloading is not store publication.

## Development and tests

No JavaScript packages or build transpiler are required. Use the existing cloud
checkout; do not create a Git worktree. Source runs directly in the TV engine.
Typed integration models are in `app/js/models.d.ts`; they are a documented
contract, not a claim of a TypeScript-compiled or runtime-validated external API.

Requirements for checks: Node.js 18+, Python 3.10+, FFmpeg/ffprobe, and for browser
smoke tests Python Playwright plus Chromium. On a development machine with network
access install test tools using `python -m pip install playwright`, followed by
`python -m playwright install chromium`. Set `CHROMIUM_PATH` to your Chromium
executable if using a system browser; this cloud environment provides it at
`/usr/bin/chromium`. Otherwise the smoke test uses Playwright's managed browser. Runtime production code has no third-party dependency.

```sh
node --test tests/core.test.cjs
python tools/check.py
python tools/smoke.py
```

For local browser development, `python tools/serve.py` starts a local-only server
on port 8000 with byte-range support. Stop with Ctrl+C. Browsers use the development
HTML5 player; no Samsung API is imitated in the shipped application.

Regenerate original assets (only missing MP4s are encoded):

```sh
python tools/generate_assets.py
```

Create the clean source ZIP one folder above the project:

```sh
python tools/source_zip.py
```

See [docs/TEST_RESULTS.md](docs/TEST_RESULTS.md) for executed outcomes and limits.

## Architecture and extension rules

- `app/app.js`: local screens, route/focus stack, OSK, player UI and lifecycle.
- `app/js/navigation.js`: directional geometry, scrolling, optional Samsung keys.
- `app/js/player.js`: native AVPlay state controller and browser media fallback.
- `app/js/store.js`: versioned bounded local persistence; 100 history titles and
  200 progress entries, resilient to corrupt/unavailable storage.
- `app/js/provider.js`: asynchronous demo Provider and disabled FrameXTV adapter.
- `app/js/models.d.ts`: localized catalog, image, episode, season, media/provider,
  progress and settings models. Positions/durations in milliseconds, except
  catalog episode duration in seconds.
- `app/js/i18n.js`: English/Arabic text. Visual directional movement follows screen
  geometry, so RTL layouts use the expected physical left/right directions.
- `tools/build.ps1`: Windows SDK staging, resolution selection, signed packaging.

The finite demo catalog is bounded (16 titles; home rows at most 16 cards), uses
lazy SVG image loading and browser caching, and bounds grid pages to 12 at a time.
A larger provider needs server pagination and measured list virtualization before
shipping; this project does not claim unbounded-catalog performance. Persistent
storage is device-local and unencrypted, suitable for preferences/progress only;
never store service secrets here. File-URI storage on the actual widget and
firmware behavior still need TV verification.

The default widget grants only TV key and AVPlay privileges. It has no internet
privilege, external access hosts, frames, remote scripts, or network fetch policy.
Do not broaden the policy or enable the FrameXTV adapter without documented
permission and an implemented integration. For an authorized network provider,
add the Tizen internet privilege and exact API/CDN hosts to access declarations,
CSP connect/media policies as applicable, then verify CORS, expiring URLs,
authentication and format capabilities on hardware. Browser CORS and native
AVPlay transport can differ. The widget never bypasses server restrictions.
AVPlay HLS/DASH transport can be selected through a sanctioned MediaSource;
4K, HDR, adaptive streaming, tracks, DRM and network behavior require real
provider streams and Samsung firmware tests. No DRM implementation is shipped.
