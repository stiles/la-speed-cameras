# Planning

Roadmap for [laspeedcameras.com](https://laspeedcameras.com). The site answers two questions for people who live in or drive through Los Angeles: where are the speed cameras, and how do I avoid them? It should be fun to read and accurate, with clear caveats while cameras are still going in.

## Key dates

- **Oct. 9, 2026:** MVP live at laspeedcameras.com and submitted to Google and Bing
- **Oct. 19, 2026:** design and mobile polish done
- **Oct. 26, 2026:** LADOT switches on the first cameras. The site should be indexed before this.
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

## Publish schedule

Go live with the MVP this week instead of waiting for the Oct. 26 activation. People are already talking about the cameras, and a new domain needs time to get crawled, indexed and linked to before searches spike. The data and pages are ready. The rest of this week is accounts, a few fixes that would embarrass us on a phone, and getting Google to find the site.

### Wednesday, Oct. 7: accounts and deploy

- [x] Push `main` to [stiles/la-speed-cameras](https://github.com/stiles/la-speed-cameras)
- [x] Import the repo in Vercel and set `NEXT_PUBLIC_MAPBOX_TOKEN` and `NEXT_PUBLIC_SITE_URL` for Production and Preview
- [x] Add `laspeedcameras.com` and `www.laspeedcameras.com` and redirect www to the apex
- [x] URL-restrict the Mapbox token to `laspeedcameras.com`, `*.vercel.app` and `localhost:3000`
- [x] Set up a site email address (for example, hello@laspeedcameras.com) and use it for the report mailto fallback, the about page and account signups
- [ ] Allow Actions to create pull requests (Settings > Actions > General), then run "Update camera data" once by hand to confirm it's a no-op
- [ ] Favicon: `/favicon.ico` returns 404. Add `app/icon.svg` and `app/apple-icon.png`.
- [ ] Header: add a hamburger menu for Neighborhoods, My commute, Full list and About. Right now small screens hide most of the links.
- [ ] "Near me" zooms in too far. It fits the user's location plus the three nearest corridors, so it can land at street level when a camera is close. Cap `maxZoom` around 13 or fit a fixed radius instead.
- [ ] Rewrite lines that sound machine-written, starting with "The fine print, but readable" (the `/about` title). Also review "The fine print" in `Caveat` and the footer.

### Thursday, Oct. 8: mobile and QA

- [ ] Do a mobile pass that covers the home bottom sheet, neighborhood and corridor pages, `/list` and `/route`. Fix anything broken and log the rest for next week.
- [ ] Click through on a phone: home map, search, "Near me", a neighborhood page and `/route`
- [ ] Enable Vercel Web Analytics and confirm GA4 receives page views from production
- [ ] Check share previews with the [Facebook sharing debugger](https://developers.facebook.com/tools/debug/) and by pasting `laspeedcameras.com/del-rey` into iMessage and Slack
- [ ] Confirm `/del-rey` redirects to `/neighborhoods/del-rey`
- [ ] Set `NEXT_PUBLIC_REPORT_URL` to a Tally or Google form for reports and photos (it falls back to a mailto)

### Friday, Oct. 9: live

- [ ] Verify the domain in Google Search Console and Bing Webmaster Tools and submit `/sitemap.xml` to both
- [ ] Use URL Inspection to request indexing for the home page, `/neighborhoods`, `/list` and the 10 neighborhoods with the most cameras
- [ ] Soft launch: share a few neighborhood links where people are already talking about the cameras (r/LosAngeles, neighborhood Reddit and Nextdoor threads, neighborhood councils). The inbound links help Google find the site faster.

### Week of Oct. 12: polish (done by Oct. 19)

Mobile:

- [ ] Map gestures: one-finger page scrolls get caught by the map. Detail pages use `cooperativeGestures`, which still feels clumsy. Consider a static preview with a "Tap to explore" button that opens the full map.
- [ ] Fix whatever Thursday's mobile pass logged

Map:

- [ ] Decide whether the corridors stay. They show the enforcement zone that "between X and Y" refers to. If they stay, add them to the legend, which only covers status and direction now.

Visual design:

- [ ] Colors: use a more subtle red than `siren` (`#ff3b1f`) and a slightly lighter black than `ink` (`#16161d`) in `app/globals.css`
- [ ] Fonts: replace Inter and Bricolage Grotesque, which show up constantly in AI-generated designs. Change both `app/layout.tsx` and `lib/og.tsx`.
- [ ] Rounding: move buttons, badges and chips from `rounded-full` to a small radius. Keep full rounding for map dots only.
- [ ] Drop the bars on the home page "Most watched" list. A ranked list with counts is enough.
- [ ] Type-heavy pages (How it works and the FAQ on `/about`): add more hierarchy with heading weights, subheads and gray text for secondary copy
- [ ] Reread the rest of the site for copy that sounds machine-written

Geography and sharing:

- [ ] Add council district boundaries from la-geography to the pipeline snapshot. District pages only use LADOT's district number now. Use the boundaries for outlines on district maps, shapes on share images and district search results.
- [ ] Share images: neighborhoods already get their own card (name, count and shape). Still needed: cards for council districts and `/route`, a redesigned site default, and an update of every card to the new colors and fonts. Rerun the Facebook debugger afterward so platforms drop the cached cards.

### Week of Oct. 19: before activation

- [ ] Check Search Console coverage and request indexing for any important pages that are still missing
- [ ] Wider announcement ahead of Oct. 26

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
