# FrameX TV for Samsung Tizen

A dependency-free Tizen Web Application shell for https://framextv.xyz/.
Target: Samsung S90D (2024), TV Samsung profile. This is not an Android app.

## What works and what needs TV validation

The local shell supplies a loading screen, a 25-second timeout, offline recovery,
Retry/Show website/Exit controls, and arrow/Enter/Back navigation in its own UI.
The website runs in a full-window cross-origin iframe with fullscreen, autoplay,
and encrypted-media permissions. Compatible HTML5 video uses the TV web engine;
this shell does not download streams, transcode, bypass DRM, or add codecs.

**Website integration is unverified.** The cloud network proxy returned HTTP 403
CONNECT denial when requesting the website; that is not a response from the site.
Its framing headers, internal remote navigation, media sources, redirects, DRM,
and CORS could not be checked. The shell is a starting implementation, not a
claim of working streaming or complete remote navigation on the live site.

Cross-origin isolation prevents the shell from inspecting readiness, finding
links, injecting spatial navigation, operating video elements, or receiving keys
consumed inside the website. Arrow/OK/Back inside it depend on its implementation
and the Samsung browser. Back opens shell controls only if delivered to the
parent. Long Back is handled by the TV platform to exit. Use Home if needed.
Iframe load events can fire for blocked documents; a blank page may therefore
require Back then Retry. Reliable in-page error detection and remote integration
require cooperation from the site owner, e.g. a validated postMessage protocol.

## Build a signed .wgt on your computer

1. Install Samsung Tizen Studio with the **TV Extension**, Web CLI tools, and
   **Samsung Certificate Extension** using Package Manager. Add the Studio tools
   and tools/ide/bin directories to PATH. Check `tizen version` and `sdb version`.
2. In Certificate Manager create a **Samsung / TV** certificate profile, e.g.
   `FrameXTV`. Sign in to your Samsung account. Create an author certificate and
   a distributor certificate that includes your TV's DUID (Device Manager can
   retrieve it while connected). Follow the current wizard's certificate level
   for consumer TV development. Back up the author certificate and its password
   securely: future updates must use the same author identity. Distributor
   certificates authorize installation on listed development TVs and can expire.
   Never commit private keys, passwords, or certificate profiles.
3. From this directory run:

   ```sh
   tizen build-web -- ./app
   tizen package -t wgt -s FrameXTV -- ./app/.buildResult
   ```

   The CLI prints the generated `.wgt` path. Use that actual path below. Do not
   rename a ZIP to WGT or use an unsigned archive. CLI package signing uses the
   existing named certificate profile; it cannot create Samsung authorization.
   Packaging has not been run here because the Samsung TV SDK and signing
   certificates are not installed in the cloud environment.

## Enable development and install on the S90D

1. Connect the computer and TV to the same trusted LAN. Open **Apps** on the TV
   and enter **12345** (use the remote's number keypad) to open Developer Mode.
   Turn it on, enter the development computer's LAN IP, then restart the TV.
   Menus vary by firmware; consult Samsung's TV Developer Mode guide if needed.
2. In Tizen Studio Device Manager connect to the TV's LAN IP (normally port 26101),
   accept any TV prompt, and use **Permit to install applications** when offered.
   Include this TV's DUID in the Samsung distributor certificate before signing.
3. Use Samsung **SDB**, not Android ADB:

   ```sh
   sdb connect TV_IP:26101
   sdb devices
   tizen device list
   tizen install -n /absolute/path/to/FrameX\ TV.wgt -t TV_TARGET_NAME
   tizen run -p FrameXTV01.FrameXTV -t TV_TARGET_NAME
   ```

   Replace the filename with the actual packaging output and the target name
   with the name reported by `tizen device list`. For signature errors verify
   DUID, certificate validity, profile selection and install permission, then
   rebuild/sign. Use the same author certificate for updates. This is developer
   sideloading; public distribution requires Samsung Seller Office review.

## Live-site acceptance checks (required before calling it TV-ready)

From a network that can reach the site, inspect a real GET and redirect chain:

```sh
curl --location --dump-header headers.txt --output page.html https://framextv.xyz/
```

Inspect every final document's `Content-Security-Policy: frame-ancestors` and
`X-Frame-Options`. `DENY`, `SAMEORIGIN`, or restrictive frame-ancestors can block
this packaged app's origin. CORS headers do not grant iframe permission. Do not
remove security headers or proxy around them. If embedding is blocked, obtain
a site-owner-supported TV page or integration. A separately designed hosted
Tizen application needs its own lifecycle, navigation, permissions and signing
validation; simply navigating away would discard this shell and its controls.

Use Tizen Studio **Debug As > Tizen Web Application** on the connected TV to
inspect Console and Network (remote web inspector). Verify:

- Home page, login, popups, redirects and all important links. Additional frame
  destinations need explicit local CSP allowances and any required Tizen access
  declarations after inspecting the actual origins. Do not broadly whitelist
  unknown hosts. Embedded document subresources have their own origin policies.
- Arrow keys reach every link/player control, OK activates, Back returns through
  site history, long Back exits, and re-entry restores a usable app.
- A real movie/episode plays with sound, seek, pause, subtitles and fullscreen.
  Test media startup after OK; permissions alone do not guarantee autoplay.
  Test actual codecs/profiles/bitrates on hardware. MP4/H.264/AAC is a useful
  initial candidate; HLS, DASH/MSE and DRM depend on the site player, codec,
  firmware and license integration. AVPlay is not integrated by this wrapper.
- Identify manifest, segment, subtitle and license URLs in Network. JavaScript
  fetch/MSE requests require correct server CORS for the requesting origin;
  credentialed requests need matching origin and credentials headers. Check
  preflights and redirects. Simple media playback can differ from fetch/MSE.
  The wrapper cannot repair upstream CORS, unavailable DRM or unsupported codecs.
- Disconnect/reconnect network during initial load and during playback. Local
  offline events show recovery, but a remote player must handle its own HTTP,
  CDN and buffering failures while the device remains online.
- `window.innerWidth/innerHeight`, `devicePixelRatio`, actual video dimensions
  and full panel coverage in the TV inspector. The Samsung screen.size metadata
  requests a 3840x2160 application viewport; firmware support must be verified.
  CSS fills the available viewport at other resolutions. A 4K panel or viewport
  does not make a lower-resolution stream 4K; browser Fullscreen API is separate
  from a packaged app occupying the screen.

## Local development

No package installation is required. Run `node --check app/app.js` and
`python tools/smoke.py` (requires Python Playwright and Chromium). The smoke test
uses a controlled website fixture, not the live service or a TV emulator.
Use the existing checkout in cloud tasks; no additional Git worktree is needed.
Keep generated `.buildResult` and `.wgt` files and all certificates out of Git.
