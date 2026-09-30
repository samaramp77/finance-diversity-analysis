# The D-I NIL Map

An interactive Division I-only comparison of modeled NIL roster-market estimates across all 32 conferences, with a focused SEC vs. Big Ten vs. Big 12 vs. ACC comparison.

## Story

The project asks: **Is the Division I NIL market concentrated in a few conferences, and does the answer change when we compare total market with the typical program?** The 2026 estimate snapshot places the SEC first by combined market, the Big Ten second, and the Power 4 at roughly two-thirds of the modeled D-I market.

## Files

- `index.html` — single-page narrative report, interactive playground, calculator, position lens, and Power 4 school explorer.
- `dashboard.html` — legacy entry point that redirects to the interactive section on `index.html`.
- `report.js` — report charts and headline values.
- `dashboard.js` — filterable dashboard logic.
- `styles.css` — shared visual system.
- `data/division1_market.json` — Division I conference estimates and Power 4 sport mix.
- `data/nil_summary.json` — separate NCAA NIL Assist context snapshot retained from the earlier version; it is not mixed into the modeled conference figures.
- `scripts/build_snapshot.py` — validates the D-I estimate data.

## Source and scope

The primary conference-comparison source is [The Sideline NIL by Conference directory](https://thesideline.co/nil-tracker/conferences/), captured September 30, 2026. The 32 conference rows used here represent 354 Division I programs and 49,842 athletes. The source describes its numbers as estimates that combine public valuation benchmarks with model estimates.

“Combined market” is the sum of program-level roster estimates within a conference. “Median program” is the middle program estimate within that conference. Power 4 sport categories are football, men’s basketball, women’s basketball, baseball, and the source’s grouped “Everything else.”

The position-group drill-down is intentionally narrower. It uses termiNIL’s FBS football position analysis for 14,519 modeled players across 138 FBS programs. It shows estimated market value, mean value, and median value for 15 football position groups. It is not a complete position breakdown for all Division I sports.

The dashboard also includes a “Build your player profile” interaction. It combines a sport/position baseline with a transparent conference multiplier based on average roster-market value per program. Football starts from the published FBS position medians; other sports are illustrative comparison baselines and are labeled that way in the interface.

The Power 4 school explorer includes all 68 programs listed across the [SEC](https://thesideline.co/nil-tracker/conferences/sec), [Big Ten](https://thesideline.co/nil-tracker/conferences/big-ten), [ACC](https://thesideline.co/nil-tracker/conferences/acc), and [Big 12](https://thesideline.co/nil-tracker/conferences/big-12) pages. School values are modeled roster-market estimates, not actual payments.

These are not verified contracts, reported salaries, conference distributions, collective budgets, or guaranteed athlete pay. The NCAA NIL Assist dashboard is linked in the report for context, but the NCAA reported disclosure snapshot and these modeled conference estimates are kept separate.

## Run locally

```bash
python3 -m http.server 8001
```

Then open `http://localhost:8001/nil-conference-analysis/`.

Validate the estimate data with:

```bash
python3 scripts/build_snapshot.py
```
