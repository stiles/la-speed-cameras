# Geography snapshot

Copied from [stiles/la-geography](https://github.com/stiles/la-geography) `data/standard/` at commit `97d6539`:

- `neighborhoods.geojson` is `la_neighborhoods_comprehensive_simplified.geojson`, LA Times Mapping LA boundaries for every LA City neighborhood, city and unincorporated area in the county
- `la_city_boundary.geojson` is `la_city_boundary.geojson`
- `council_districts.geojson` is `la_city_council_districts.geojson`, trimmed to `district` and `member` (renamed from `name`) and simplified to about 5 meters. Council member names change with elections, so refresh this after each one.

These change rarely. To refresh, copy the files again and rerun `run.py`.
