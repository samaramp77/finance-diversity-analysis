# The D-I NIL Map

An interactive Division I-only comparison of modeled NIL roster-market estimates across all 32 conferences, with a focused SEC vs. Big Ten vs. Big 12 vs. ACC comparison and a separate historical layer of public NCAA NIL disclosure snapshots.

## Files

- `index.html` — the narrative report page, author line, headline numbers, eight chart-backed findings, and the closing data/method section.
- `dashboard.html` — the standalone interactive dashboard linked from the report page.
- `dashboard.js` — loads the data in the browser, applies the time, group, measure, breakdown, and row-count filters, calculates summaries, renders four filter-responsive charts, renders the table, and resets every dashboard filter.
- `report.js` — calculates report headline values and renders the report charts in the browser.
- `styles.css` — shared layout, typography, colors, responsive styles, and chart styling used by both pages.
- `data/division1_market.json` — 2026 modeled Division I conference estimates, Power 4 sport mix, 68 Power 4 school estimates, FBS football position context, and player-builder baselines.
- `data/nil_summary.json` — captured NCAA NIL Assist disclosure snapshot with 2024 comparison, 2025 segments, and sport counts.
- `data/nil_data.js` — browser-ready fallback copy of `division1_market.json` so the interactive site can load reliably on GitHub Pages.
- `data/nil_history.js` — browser-ready fallback copy of the historical disclosure rows used by the report and dashboard.
- `scripts/build_snapshot.py` — validates conference totals, program counts, Power 4 rows, sport mix totals, position counts, and school totals.

## Data and scope

The modeled conference layer uses [The Sideline NIL by Conference directory](https://thesideline.co/nil-tracker/conferences/), captured September 30, 2026. Its 32 conference rows represent 354 Division I programs and 49,842 athletes. The source describes the values as estimates that combine public valuation benchmarks with model estimates.

The historical disclosure layer uses the [NCAA NIL Assist public dashboard](https://nilassist.ncaa.org/data-dashboard/). The 2024 snapshot covers January 1 through October 31, 2024, and the 2025 snapshot covers January 1 through July 31, 2025. These are public, de-identified disclosure aggregates, not verified conference payouts or guaranteed athlete pay. Because the date ranges differ, the report labels the comparison as descriptive rather than a complete year-over-year trend.

The position-group drill-down uses [termiNIL’s FBS football position analysis](https://www.terminil.com/blog/lowest-nil-value-college-football-roster) for 14,519 modeled players across 138 FBS programs. It is a separate football model, not a complete Division I sport-by-sport salary file.

No conference rows were dropped after validation. The report explains the market totals, medians, shares, changes, sport mix, position shares, and player-builder formula in its closing methodology section.

## Run locally

From this project folder:

```bash
python3 -m http.server 8001
```

Then open `http://localhost:8001/` for the report or `http://localhost:8001/dashboard.html` for the dashboard.

Validate the modeled estimate data with:

```bash
python3 scripts/build_snapshot.py
```
