# Integration audit — 2026-10-19

## Decision

Ship an independent, locally bundled Tizen TV application with a demo provider.
FrameXTV live integration is **disabled**. No sanctioned catalog, playback API,
content license, credentials flow, or external application terms were verified.
This is an evidence limitation, not a finding that no such API exists.

## Existing implementation

Inspected every original source file: app/config.xml, index.html, app.js,
style.css, icon.png, tools/smoke.py, README.md, .gitignore. The old application
loaded https://framextv.xyz/ in an iframe. Its UI only covered connection controls;
it had no independent catalog, player, storage, or internal remote navigation.
Its smoke test exercised a controlled embedded page. That architecture is removed.
The existing package/application IDs remain so the same author can sign updates.

## Research and evidence

Direct HTTPS GET probes of the following on the audit date failed at this cloud
environment's CONNECT proxy with **403 Forbidden**, before an origin response:

- https://framextv.xyz/
- https://framextv.xyz/robots.txt
- https://framextv.xyz/developers (a discovery candidate, not a known docs endpoint)
- https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/avplay-api.html
- https://developer.samsung.com/smarttv/develop/guides/user-interaction/remote-control.html
- https://peach.blender.org/about/
- https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4 (HEAD)

No browsing/search connector is available. These failures do not establish the
site's HTTP status, API availability, permission, CORS policy, or terms. No site
JavaScript was reverse engineered, internal requests reused, authentication
attempted, signed URLs synthesized, or third-party stream links collected.
The Blender test URL is NOT used in the shipped catalog: distribution and runtime
verification could not be completed. All shipped media are generated originals.

## Official API reference targets

Implementation follows the Samsung AVPlay interface: open, setDisplayRect,
setListener, prepareAsync, play/pause, seekTo, getDuration, getCurrentTime,
getTotalTrackInfo, setSelectTrack, setSilentSubtitle, setDisplayMethod, stop/close.
Optional media keys use tizen.tvinputdevice.getSupportedKeys/registerKey;
mandatory directional/Enter/Return keys need no registration. References above
are source targets for device review, **not successfully fetched documentation**.
The cloud tests use a contract double and browser media; they cannot verify the
TV's particular firmware implementation. Hardware acceptance is required.

## To enable a real FrameXTV provider

Obtain written authorization for external TV catalog and playback access, published
API/version/schema, territory/device/content rights, artwork permissions, TV app
branding rights, and support contacts. Establish documented authentication (for
example a TV device flow, if offered), secure token lifetime/storage requirements,
rate limits, pagination, search, seasons/episodes, age ratings, entitlement checks,
progress synchronization, and logout/revocation. Never ship a client secret in a
web widget. A separately authorized backend is needed if the provider requires one.

Obtain documented playback URLs, expiration/refresh rules, device/codec profiles,
HLS/DASH support, subtitle/audio metadata, allowed origins, CORS/preflight rules,
CDN host lists, DRM/license integration and AVPlay support. Signed URLs must come
from the sanctioned API. This project intentionally implements no DRM flow.
Implement the typed Provider interface, validate responses, add only the required
network hosts to config.xml and CSP, and test on the S90D. Do not activate the
placeholder by entering an arbitrary endpoint or scraping the reference site.

## Demo catalog and rights

All names, descriptions and geometric cover images are fictional, original demo
assets. Category and trending/popular/recent/recommendation tags are curated demo
metadata, not actual user metrics. Fictional episodes play clearly labeled sample
previews, not complete movies/episodes. Four bundled MP4 test scenes are generated
with FFmpeg lavfi (color/test patterns and synthesized tones), released CC0 by
this project. No third-party footage, artwork, music, logos, tracking, credentials,
or content services are used. See ASSET_LICENSES.md and tools/generate_assets.py.
The catalog, search, list/history/settings and bundled playback work offline.

## Compatibility limits

The default UI viewport is 1920x1080 and scales to other sizes. A 2160p build option
requests a larger viewport; panel resolution is independent of source resolution.
The included videos are SDR H.264/AAC at 720p. AVPlay can accept authorized HLS or
DASH sources through the provider model, but no adaptive/HDR/4K/DRM stream has been
validated. Track selection is implemented when tracks are reported; the samples
have one audio track and no subtitles. Browser fallback is for local development;
Samsung AVPlay is selected when the Samsung API is present. All hardware checks,
signing and .wgt installation are outstanding until SDK, certificate and TV access
are supplied. Nothing here establishes live FrameXTV integration or production
service readiness.
