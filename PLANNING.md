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

The MVP and the route check are live. The site builds 740 static pages.

Data:

- Pipeline in `pipeline/` that finds LADOT's date-stamped layers, links cameras and status points to corridors, publishes only public fields and diffs each run against `data/history.json`
- GitHub Action twice a day: status-only changes commit to `main`, location changes open a PR, failures open an issue
- Council district boundaries from la-geography, with a warning when a camera sits in a different district than LADOT lists

Pages:

- Home page map with search (neighborhoods, streets, corridors, districts, addresses) over the map, "Near me," a result card and an overlaid legend
- Pages for 159 neighborhoods (114 in LA city plus 45 bordering areas), 72 streets, 125 corridors and 15 council districts, plus `/list` with CSV and GeoJSON downloads and `/about`
- `/route`: Mapbox driving alternatives, matching that counts only cameras enforcing your direction, and "Find a route that dodges them" using Directions `exclude=point(...)`
- Every map uses two-finger panning on phones and Cmd/Ctrl + scroll to zoom on desktop

Sharing and search:

- Short share links (`/del-rey`), a share bar on every page and light share cards for every page type, plus a site default with every camera in the city outline
- FAQ and breadcrumb JSON-LD, a sitemap and robots.txt, verified in Google Search Console and Bing Webmaster Tools
- Google Analytics 4 and Vercel Analytics, with custom events for `search`, `share`, `route_check` and `route_avoid`

Design and copy:

- `siren` `#d63c2c` and `ink` `#23232a`; Overpass for headlines and Public Sans for body, on the site and in share images
- Small corner radius on buttons, badges and chips; full rounding only on map dots
- AP numbers (`spell()` in `lib/format.ts`) and a copy pass for lines that read as machine-written

Testing:

- Playwright smoke tests (`npm run test:e2e`) for the home map, search, a neighborhood page, `/route` and the 404 page on phone and desktop

## Now: polish (through Oct. 19)

Launch follow-ups:

- [ ] Click through on a phone: home map, search, "Near me," a neighborhood page and `/route`
- [ ] Enable Vercel Web Analytics and confirm GA4 receives page views from production
- [ ] Check share previews with the [Facebook sharing debugger](https://developers.facebook.com/tools/debug/) and by pasting `laspeedcameras.com/del-rey` into iMessage and Slack. Rerun the debugger after any share-card change so platforms drop cached cards.
- [ ] Set `NEXT_PUBLIC_REPORT_URL` to a Tally or Google form for reports and photos (it falls back to a mailto to hello@laspeedcameras.com)
- [ ] Soft launch: share a few neighborhood links where people are already talking about the cameras (r/LosAngeles, neighborhood Reddit and Nextdoor threads, neighborhood councils). Inbound links help Google find the site faster.

Home page and sharing:

- [x] Say why this site is worth using over the others, such as speedcamla.com. A short paragraph under the home map covers enforced directions, the twice-daily LADOT check and the commute check.
- [x] Choosing a street in home search flies the map to it, highlights its corridors and shows a street card. Other result types still open their pages.
- [x] Neighborhood pages get a sticky "Warn them" bar between the map and the share card. It never shows on pages short enough that the share card is already on screen, and dismissing it hides it for the session.
- [x] Drop the yellow-and-black hazard stripes. They read as road construction and echoed the yellow warning-period dots. The share card has no accent now, and the footer has a 4px siren rule.

## Before activation (Oct. 19 to 26)

- [ ] Check Search Console coverage and request indexing for any important pages that are still missing
- [ ] Wider announcement ahead of Oct. 26

## Activation weeks (Oct. 26 to end of year)

- [ ] Watch the workflow runs and the `warnings` in `data/meta.json`. LADOT hasn't published its wording for active cameras, and any label we don't recognize shows as "Status unclear."
- [ ] Add new labels to `status_key()` in `pipeline/build_site_data.py` and rerun with `--force`
- [ ] Confirm status changes reach corridor pages, map colors and legend counts, and that the warning-period estimate shows up
- [ ] Review location-change PRs against LADOT's map before merging
- [ ] Ask LADOT (ladot.speedsafety@lacity.org) about the five cameras with no enforced direction and the Avalon Blvd location with two northbound cameras
- [ ] The update cron assumes daylight time. After Nov. 1 it runs at 6:15 a.m. and 4:15 p.m. Pacific; adjust if that matters.

## Next

- Pipeline tests for slug stability, status matching and the diff, using a saved fixture of LADOT's layers
- An RSS feed and an "activated this week" section built from `history.json`, which also gives people a reason to come back
- A Spanish version of the neighborhood and about pages

## Later

- Photo submissions: uploads to Vercel Blob, a moderation queue, an EXIF location check against the nearest camera, and approved photos on corridor pages. Camera and corridor slugs are already stable enough to attach photos to.
- Email alerts when a camera in a saved neighborhood switches on
- Cameras from neighboring AB 645 programs, if their data is public:
  - [Glendale](https://www.glendaleca.gov/government/departments/public-works/projects/current/glendale-speed-safety-program-ab-645)
  - [Malibu](https://www.malibucity.org/PCHsafetycameras) (cameras already running on PCH)
  - [Long Beach](https://longbeach.gov/pw/projects/automated-speed-enforcement-system/)

## Risks

- **LADOT changes its schema or layer names.** Discovery handles new date suffixes. Renamed fields fail validation and open an issue instead of publishing bad data.
- **Camera positions are planned, not surveyed.** Some cameras sit hundreds of feet from their corridor polygon. The caveat on every page says positions are approximate.
- **Mapbox costs.** Geocoding and Directions run in the browser on the public token. The free tiers should cover launch traffic, but set a billing alert.

## Coverage

- [LA Times, Oct. 1: Speed demons, beware: Speed cameras are coming to Los Angeles by Halloween](https://www.latimes.com/california/story/2026-10-01/speed-demons-beware-125-speed-cameras-are-coming-to-los-angeles-by-halloween)
- [LA Times, Oct. 9: Speed camera shocker: 100,000 violators seen in nine days on Pacific Coast Highway in Malibu](https://www.latimes.com/california/story/2026-10-09/speed-cameras-caught-100-000-violations-on-malibus-pch-in-just-nine-days)

## Original prompt

I want to make a simple static website whose mission is to help residents of Los Angeles and its neighboring residents learn the locations of speed cameras in the city. The site should have a modern design with a large, searchable map and also take advantage of the la-geography repo to allow users to find the cameras in their specific neighborhoods. "I live in Del Rey. Are there any cameras in my neighborhood or adjacent neighborhoods? I drive from X to Y each day for work. Are there any along the route?" Ideally, the site would also have text listings and also POTENTIALLY SOMEDAY allow users to submit pictures of camera locations. The main point, though: Where they are, how can I avoid them. The site should have excellent SEO and perhaps URLs with neighborhood names. Like for users who google “speed cameras hollywood” or “LA cameras Mar Vista”. Needs a robust social sharing call to action, too. I want people to share this with their friends. Fun copy, too. “Watch your rear end out there.” Can you help me come up with a plan? I’ve had good luck with Next JS and Vercel and I own laspeedcameras.com. I like mapbox but not sure whether a streets map or a monotone map is best for this. 

See /Users/mstiles/github/scripts/la-speeding-cameras for data https://ladot.lacity.gov/speed-safety-system  for background on the city's program. It's important that the site is fun but also accurate, with proper caveats for construction plans and locations subject to change. The site also needs a workflow to regularly check the camera locations and update the dataset. 

I have mapbox keys in my environment and can add them to the repo when we get to that, if needed. 

Let's plan.  Keep working until you have a solid plan and a roadmap to implement it. This is a personal project so careful not to include any CNN references. 