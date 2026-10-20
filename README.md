# SELIGER / Fishing Weather

## Mobile fishing app (2026-10-20)

- Portrait: bottom navigation Today / Charts / Diary / Reports, touch-friendly controls.
- Landscape: expanded two-column graph layouts and compact tabs.
- Today: 3-day summary of min/max temperatures, precipitation, maximum gusts, sunrise and sunset (Open-Meteo; timezone Europe/Moscow).
- Diary: manually log species, weight, lure, notes, spot; optional opt-in browser GPS coordinates. Entries live in localStorage on that one device, with JSON export. No cloud sync, no automatic import.
- Reports: direct links to relevant Seliger sections on Rusfishing; no scraped or fabricated catch data.
- Chart.js runs from an external CDN; live weather needs internet. Static HTML is not an offline-ready PWA.
- Bite index is heuristic, not catch probability; marine safety must not be inferred from it.
- Inspired by the user's earlier RYBA app: diary, point entry, species factors and report filtering. Rybinsk coordinates/historical overlays and unverified social modifiers were intentionally not copied.


Responsive static weather dashboard for Ostashkov, Lake Seliger. Russian UI.

## Features
- Hourly temperature and feels-like, wind/gusts, precipitation, pressure.
- 3/7/14-day windows and Oct 23–25 2026 trip window (if still in forecast horizon).
- Species-specific **heuristic** bite index for pike, zander, perch; not a validated probability of catching fish.
- Comparison of archived forecast **snapshots** for the same valid hour.
- Weather data from Open-Meteo. Fishing context from Rusfishing; forum content is not scraped or reproduced.
- No paid APIs or API keys.

## Deploy
1. Create a **new public GitHub repository** (e.g. `seliger-fishing-weather`).
2. Upload all files, including `.github/workflows/weather.yml`.
3. Repository Settings → Pages → Deploy from a branch → `main` / root → Save.
4. Repository Actions → `Save weather forecast` → Run workflow once to seed history.
5. Repository Settings → Actions → General → Workflow permissions: allow read and write permissions if necessary.
6. Scheduled GitHub Actions run approximately every six hours (not guaranteed to run at exact minute). Check repository history if updates stall.

## Run locally
`python -m http.server 8000` then open `http://localhost:8000`.

## Important caveats
- Weather is a **model forecast**, not on-water observations. Forecast snapshots show forecast changes, not measured historical weather.
- Historical data begins when workflow is enabled. To backfill earlier forecast runs, a separate Open-Meteo Single Runs integration is needed.
- Open-Meteo free noncommercial usage terms and GitHub Actions usage limits apply.
- CDN Chart.js needs internet. Never rely on this tool alone for boating safety.
- Wind and gusts thresholds in UI are advisory, not certified operating limits for a particular boat.
- The bite index is intentionally heuristic, not scientifically validated; pressure, wind and daylight are weak proxies for actual fish activity.