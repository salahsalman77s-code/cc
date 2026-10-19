# S90D hardware acceptance — NOT executed

Record firmware version, SDK/TV Extension version, author/distributor profile
identifiers (no secrets), DUID authorization status, package hash and date.

1. Build both 1080p and optional 2160p staged configurations. Sign/install through
   Samsung profile and SDB. Confirm app ID FrameXTV01.FrameXTV, version 2.0.0.
2. Confirm independent UI, legible text from viewing distance, safe-area padding,
   no clipped focus at all edges, actual innerWidth/innerHeight and panel coverage.
   Compare RTL layout and Arabic shaping at both viewport sizes.
3. Exercise every sidebar item; traverse full rows with held arrows, grid bounds,
   OSK rows/tools in both languages, details/seasons/episodes, My List, history and
   settings. Confirm OK fires once and Back restores the originating card/scroll.
4. Repeated Back at home must show a cancel-first exit dialog. Only explicit Exit
   closes the app. Platform long-Return/Home behavior is outside app control.
5. Verify real optional media keys available on the remote: play, pause, play/pause,
   rewind, fast-forward, stop. Check getSupportedKeys/registerKey failures safely.
6. Play all four local MP4s using **Samsung AVPlay**, not browser fallback. Confirm
   picture/audio, nonzero duration/current time, pause/resume/seek, fit/fill,
   buffering and errors. Confirm the native video plane is visible behind overlays
   in both UI resolutions. Verify absolute widget resource URI support.
7. Stop midway, return, reopen, check saved resume. Select another episode, verify
   independent progress, autoplay next across seasons, no endless final-episode
   loop, replay complete preview. Relaunch the widget to check persistence.
8. Exercise audio/subtitle controls. Samples contain one audio track, no subtitles;
   unavailable-state UI should be useful. Validate actual track switching and
   subtitle callback timing separately with an authorized multilingual stream.
9. Home/suspend/hide mid-playback and during prepare; confirm pause, saved progress,
   no hidden autoplay, explicit resume, no leaked audio. Open/close 25 times and
   inspect memory, native resource state, duplicate listeners and timers.
10. Disconnect LAN before launch and during local playback. Local catalog/samples
    should remain usable. Verify offline/restored indicators. For future sanctioned
    network media also test timeout, CDN errors, buffering, retry, expired URLs,
    range handling and server CORS. No such network provider is enabled today.
11. Test storage disabled/full/corrupted and catalog/media errors. Check recoverable
    UI and logs, no crash, no credentials printed, no external network requests.
12. Future 4K/HDR/HLS/DASH tests require authorized streams with known codecs,
    profiles, bitrates, segment/CDN policy and HDR metadata. Confirm actual decoder
    capability and output mode on the S90D; do not infer these from its 4K panel.
    Any future DRM flow needs a separately documented official implementation.

Do not mark the app production-ready until applicable checks pass on the target
TV. Samsung Seller Office policies/certification require separate review.
