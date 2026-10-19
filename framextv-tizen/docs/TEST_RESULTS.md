# Validation results — 2026-10-19

## Passed in this cloud instance

- `node --test tests/core.test.cjs`: **9 tests passed, 0 failed, 0 skipped**.
  Covers persistent watchlist/settings/progress/completion, corrupt/quota storage,
  provider search/localization/catalog/episode consistency, disabled live adapter,
  AVPlay asynchronous prepare/resume/play/pause/seek clamping/tracks/display mode,
  ended handling, stale callback cleanup, failure/retry, premature operation guards,
  and supported-only optional remote key registration including API failures.
  AVPlay is a contract double, not a Samsung device implementation.
- `python tools/check.py`: app identity/profile/XML, local-only CSP and no frames,
  all runtime JS syntax, artwork XML, four sample video codec checks passed.
  ffprobe reports H.264/yuv420p plus AAC; no external source is required.
- `python tools/smoke.py`: real Chromium functional workflow passed at 1920x1080
  and layout checks at 3840x2160. Exercises home/details focus and restoration,
  repeated horizontal row scrolling, watchlist across reload, OSK input/deletion,
  physical input search, seasons and episode selection, real bundled MP4 playback,
  pause/forward seek/stop/resume, autoplay next, Samsung play/pause key codes,
  final-episode completion/replay UI with no next loop, history, language setting,
  Arabic OSK and RTL directional movement, offline/online recovery, cancel-first
  exit confirmation, invalid-media recovery and safe Back. No uncaught JS errors
  or external application requests were observed. Screenshots are included for
  visual review; they are browser captures, not photos from a Samsung TV.
- `python -m py_compile tools/*.py`: Python tools compile.
- `git diff --check`: no whitespace errors.

## Failure diagnosed and corrected

The first browser playback run could not seek because Python's simple HTTP server
advertised no usable media ranges (seekable range ended at zero). Added the
range-aware development handler in tools/serve.py and used it for browser tests.
The same real pause/seek/resume workflow then passed. This was a local server
prerequisite defect; Samsung widget playback uses local resource URIs instead.

## Not run / not verified

- ESLint and TypeScript compiler are not installed. No dedicated linter or static
  TypeScript type check was executed. JS parse checks passed; models.d.ts documents
  the provider contract, and tests exercise the implemented demo provider.
- Tizen CLI, TV SDK/extension, PowerShell, Samsung certificates and a physical TV
  are unavailable. No SDK build, signed `.wgt`, Windows build-script execution,
  install, firmware compatibility test or physical Samsung remote test occurred.
  XML/source checks are preflight only, not schema certification or SDK success.
- Samsung AVPlay decoder, native video plane, absolute packaged-file URIs, native
  lifecycle state behavior, subtitle/audio switching and 2160p widget support need
  target hardware validation. Browser fallback and contract tests do not prove them.
- All media are original 720p SDR 18-second MP4 previews. No real network HLS/DASH,
  adaptive bitrate, DRM, HDR, 4K, live streams, licensing server, or account flow was
  tested. The player passes sanctioned provider URLs to AVPlay without scraping.
- External HTTPS probes were blocked at this environment's CONNECT proxy with 403.
  FrameXTV integration and current online Samsung documentation were not verified.
  See INTEGRATION_REPORT.md. There is no production-service readiness claim.

Required next step: build/sign on a Samsung TV SDK machine and execute
[DEVICE_ACCEPTANCE.md](DEVICE_ACCEPTANCE.md) on the S90D. A real FrameXTV feed needs
separate authorization, documentation and implementation before it can be enabled.
