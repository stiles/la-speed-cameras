# LA Speed Cameras

[laspeedcameras.com](https://laspeedcameras.com) maps every City of Los Angeles speed camera by neighborhood, street, council district and commute. It's a static Next.js site on Vercel, built from LADOT's public ArcGIS layers and refreshed by a scheduled GitHub Action.

The roadmap, launch checklist and known gaps are in [PLANNING.md](PLANNING.md).

## Layout

- `pipeline/`: Python (uv) job that finds LADOT's current date-stamped layers, fetches corridors, camera points and status, links them and writes the site data
- `data/`: build-time JSON (`corridors`, `neighborhoods`, `streets`, `meta`, `history`)
- `public/data/`: GeoJSON the map loads in the browser, plus the CSV download
- `app/`: routes. Every neighborhood, street, corridor and district page is statically generated.
- `components/`, `lib/`: map, search, sharing, route checking, analytics and data helpers

## Setup

```bash
git clone https://github.com/stiles/la-speed-cameras.git
cd la-speed-cameras
cp .env.example .env.local   # add a public pk.* Mapbox token
npm install
npm run dev
```

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Public Mapbox token for the map, geocoding and directions |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for metadata, the sitemap and share links |
| `NEXT_PUBLIC_GA_ID` | GA4 measurement ID, `G-Q32FS03M95` by default |
| `NEXT_PUBLIC_REPORT_URL` | Form for camera reports and photos; falls back to a mailto |

The map uses the `wheres-my-la-base-gray` style on the `stiles` Mapbox account.

## Analytics

Google Analytics 4 and Vercel Analytics load in production builds only, not in local dev or Vercel previews. `lib/analytics.ts` sends custom events to both:

| Event | Fired when |
|---|---|
| `search_start` | Someone first types in a search box |
| `search` | A result is chosen (`kind`: neighborhood, street, corridor, address or locate) |
| `share` | A share button is used (`channel`, `page`) |
| `route_check` | A commute is checked (`routes`, `cameras`) |
| `route_avoid` | "Find a route that dodges them" runs (`before`, `after`) |

## Updating the data

```bash
npm run data          # same as: cd pipeline && uv run python run.py
```

`run.py` only rewrites files when cameras were added, removed, moved more than 300 ft or changed status. Pass `--force` after editing `build_site_data.py`, or `--dry-run` to fetch and validate without writing.

[`.github/workflows/update-data.yml`](.github/workflows/update-data.yml) runs twice a day:

- status-only changes are committed straight to `main`, and Vercel redeploys
- location changes open a PR with the diff for review
- validation failures (counts out of range, cameras outside the city, missing fields, duplicate slugs) open or update an issue

Neighborhood boundaries are a snapshot from [la-geography](https://github.com/stiles/la-geography); see `pipeline/geography/README.md`.

## Data notes

- Only public fields are published. Streetlight IDs, power status and vendor and BSL survey notes are dropped.
- LADOT's status labels map to `construction`, `warning`, `ticketing` or `active`. A label the pipeline doesn't recognize shows as "Status unclear" and adds a warning to `data/meta.json`.
- Warnings in `meta.json` also flag source quirks, such as cameras without an enforced direction or cameras far from their corridor polygon.
- Questions about the source data go to LADOT at ladot.speedsafety@lacity.org.
