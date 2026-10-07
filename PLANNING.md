# Planning

Roadmap for [laspeedcameras.com](https://laspeedcameras.com). The site answers two questions for people who live in or drive through Los Angeles: where are the speed cameras, and how do I avoid them? It should be fun to read and accurate, with clear caveats while cameras are still going in.

## Key dates

- **Oct. 26, 2026:** LADOT switches on the first cameras. The site should be live and indexed before this.
- **End of 2026:** LADOT expects all 125 locations to be active.
- **60 days after each activation:** warnings end and tickets start for that camera.
- **Jan. 1, 2032:** the AB 645 pilot ends.

## Built

The MVP and the phase 2 route check are both done. The site builds 740 static pages.

- Data pipeline in `pipeline/` that finds LADOT's date-stamped layers, links cameras and status points to corridors, publishes only public fields and diffs each run against `data/history.json`
- GitHub Action twice a day: status-only changes commit to `main`, location changes open a PR, failures open an issue
- Home page map with a mobile bottom sheet, search (neighborhoods, streets, corridors, addresses) and "Near me"
- Pages for 159 neighborhoods (114 in LA city plus 45 bordering areas), 72 streets, 125 corridors and 15 council districts, plus `/list` with CSV and GeoJSON downloads and `/about`
- Short share links (`/del-rey`), a share bar on every page, Open Graph images for neighborhoods, streets and corridors, FAQ and breadcrumb JSON-LD, a sitemap and robots.txt
- `/route`: Mapbox driving alternatives, matching that counts only cameras enforcing your direction, and "Find a route that dodges them" using Directions `exclude=point(...)`
- Google Analytics 4 and Vercel Analytics, with custom events for `search`, `share`, `route_check` and `route_avoid`

## Launch (by Oct. 19)

Hosting and accounts:

- [ ] Push `main` to [stiles/la-speed-cameras](https://github.com/stiles/la-speed-cameras)
- [ ] Import the repo in Vercel and set `NEXT_PUBLIC_MAPBOX_TOKEN` and `NEXT_PUBLIC_SITE_URL` for Production and Preview
- [ ] Add `laspeedcameras.com` and `www.laspeedcameras.com` and redirect www to the apex
- [ ] URL-restrict the Mapbox token to `laspeedcameras.com`, `*.vercel.app` and `localhost:3000`
- [ ] Enable Vercel Web Analytics and confirm GA4 receives page views from production
- [ ] Allow Actions to create pull requests (Settings > Actions > General), then run "Update camera data" once by hand to confirm it's a no-op
- [ ] Set `NEXT_PUBLIC_REPORT_URL` to a Tally or Google form for reports and photos (it falls back to a mailto)

QA before announcing:

- [ ] Click through on a phone: home map and bottom sheet, search, "Near me", a neighborhood page and `/route`
- [ ] Check share previews with the [Facebook sharing debugger](https://developers.facebook.com/tools/debug/) and by pasting `laspeedcameras.com/del-rey` into iMessage and Slack
- [ ] Confirm `/del-rey` redirects to `/neighborhoods/del-rey`
- [ ] Verify the domain in Google Search Console and Bing Webmaster Tools and submit `/sitemap.xml` to both

## Activation weeks (Oct. 26 to end of year)

- [ ] Watch the workflow runs and the `warnings` in `data/meta.json`. LADOT hasn't published its wording for active cameras, and any label we don't recognize shows as "Status unclear".
- [ ] Add new labels to `status_key()` in `pipeline/build_site_data.py` and rerun with `--force`
- [ ] Confirm status changes reach corridor pages, map colors and legend counts, and that the warning-period estimate shows up
- [ ] Review location-change PRs against LADOT's map before merging
- [ ] Ask LADOT (ladot.speedsafety@lacity.org) about the five cameras with no enforced direction and the Avalon Blvd location with two northbound cameras

## Gaps from the original plan

These were in the plan but didn't make the first build:

- Tapping a camera on the home map highlights it but doesn't scroll to its row in the bottom sheet
- Choosing a street in search opens the street page instead of flying the home map to it
- `/route` has no Open Graph image, so shared commute links use the site default
- Neighborhood pages have an in-page "Warn a neighbor" link rather than a sticky share prompt

## Next

- Pipeline tests for slug stability, status matching and the diff, using a saved fixture of LADOT's layers
- A Playwright smoke test that loads a neighborhood page and `/route` on a mobile viewport
- An RSS feed and an "activated this week" section built from `history.json`, which also gives people a reason to come back
- A Spanish version of the neighborhood and about pages

## Later

- Photo submissions: uploads to Vercel Blob, a moderation queue, an EXIF location check against the nearest camera, and approved photos on corridor pages. Camera and corridor slugs are already stable enough to attach photos to.
- Email alerts when a camera in a saved neighborhood switches on
- Cameras from neighboring programs, starting with Glendale and Long Beach, if their data is public

## Risks

- **LADOT changes its schema or layer names.** Discovery handles new date suffixes. Renamed fields fail validation and open an issue instead of publishing bad data.
- **Camera positions are planned, not surveyed.** Some cameras sit hundreds of feet from their corridor polygon. The caveat on every page says positions are approximate.
- **Mapbox costs.** Geocoding and Directions run in the browser on the public token. The free tiers should cover launch traffic, but set a billing alert.
