#!/usr/bin/env python3
"""Fetch LADOT's speed camera layers, rebuild the site data and report what changed.

    uv run python run.py            # fetch, validate, write data/ and public/data/
    uv run python run.py --dry-run  # fetch and validate only

In GitHub Actions, writes `changed` and `status_only` to $GITHUB_OUTPUT and the
change summary to pipeline/summary.md.
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from arcgis import layer_info
from build_site_data import ROOT, build, write_outputs
from discover import discover
from fetch import fetch_cameras, fetch_corridors, fetch_status, link_cameras, link_status
from validate import ValidationError, diff, summarize, validate

META = ROOT / "data" / "meta.json"
HISTORY = ROOT / "data" / "history.json"
SUMMARY = Path(__file__).resolve().parent / "summary.md"
CHANGELOG_LIMIT = 50


def _load(path, default):
    return json.loads(path.read_text()) if path.exists() else default


def _edit_date(url):
    try:
        ms = (layer_info(url).get("editingInfo") or {}).get("lastEditDate")
        return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).isoformat() if ms else None
    except Exception:  # noqa: BLE001
        return None


def _gh_output(**values):
    path = os.environ.get("GITHUB_OUTPUT")
    if path:
        with open(path, "a") as f:
            for k, v in values.items():
                f.write(f"{k}={v}\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--force", action="store_true",
        help="rewrite outputs even when cameras are unchanged, e.g. after editing build_site_data.py",
    )
    args = parser.parse_args()

    meta = _load(META, {})
    previous_history = _load(HISTORY, {})
    today = datetime.now(ZoneInfo("America/Los_Angeles")).date().isoformat()

    print("Discovering layers...")
    urls = discover(fallback=meta.get("sources"))
    for k, v in urls.items():
        print(f"  {k}: {v}")

    print("Fetching...")
    corridors, centerlines = fetch_corridors(urls["corridors"])
    cameras = link_cameras(fetch_cameras(urls["cameras"]), corridors)
    status = link_status(fetch_status(urls["status"]), corridors)

    print("Building site data...")
    out = build(corridors, centerlines, cameras, status, previous_history)

    try:
        warnings = validate(out)
    except ValidationError as exc:
        print(f"VALIDATION FAILED\n{exc}")
        SUMMARY.write_text(f"## Speed camera data validation failed\n\n```\n{exc}\n```\n")
        _gh_output(changed="false", status_only="false", failed="true")
        sys.exit(1)
    for w in warnings:
        print(f"  warning: {w}")

    d = diff(previous_history, out)
    changes = summarize(d)
    first_run = not previous_history
    changed = first_run or any(d.values())
    status_only = bool(d["status"]) and not (d["added"] or d["removed"] or d["moved"])

    # Stamp history dates now that we know what changed.
    for cam_id, h in out["history"].items():
        if h["_new"]:
            h["first_seen"] = h["first_seen"] or today
        if h["_status_changed"]:
            h["status_changed_at"] = today

    source_edits = {k: _edit_date(v) for k, v in urls.items()}
    status_counts = {}
    for f in out["camera_features"]:
        status_counts[f["properties"]["status"]] = status_counts.get(f["properties"]["status"], 0) + 1

    changelog = meta.get("changelog", [])
    if first_run:
        changes = [
            f"Initial import: {len(out['camera_features'])} cameras on {len(out['corridors'])} corridors"
        ]
    if changed:
        entry = {"date": today, "changes": changes}
        changelog = [entry, *changelog][:CHANGELOG_LIMIT]

    new_meta = {
        "data_updated": today if changed else meta.get("data_updated", today),
        "sources": urls,
        "source_edited": source_edits if changed else meta.get("source_edited", source_edits),
        "counts": {
            "cameras": len(out["camera_features"]),
            "corridors": len(out["corridors"]),
            "neighborhoods_with_cameras": sum(1 for h in out["neighborhoods"] if h["camera_count"]),
            "council_districts": len({c["district"] for c in out["corridors"]}),
            "miles": round(sum(c["length_miles"] or 0 for c in out["corridors"]), 1),
        },
        "status_counts": status_counts,
        "warnings": warnings,
        "changelog": changelog,
    }

    print("\nChanges:" if changes else "\nNo changes since last run.")
    for line in changes:
        print(f"  {line}")

    body = ["## Speed camera data update", ""]
    body += [f"- {line}" for line in changes] or ["- No camera changes (first run or metadata only)"]
    if warnings:
        body += ["", "### Warnings", ""] + [f"- {w}" for w in warnings[:30]]
    SUMMARY.write_text("\n".join(body) + "\n")

    if args.dry_run:
        print("Dry run: nothing written.")
        return
    if changed or args.force:
        write_outputs(out, new_meta)
        print("Wrote data/ and public/data/.")
    _gh_output(changed=str(changed).lower(), status_only=str(status_only).lower(), failed="false")


if __name__ == "__main__":
    main()
