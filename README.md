# The Finance Ladder

An interactive public-data project about race, gender, job categories, and leadership representation in the U.S. Finance and Insurance sector.

## Project files

- `index.html` — the scrollable report page with the project summary, eight findings, headline numbers, charts, and methodology notes.
- `dashboard.html` — the interactive page with filters, switches, reactive charts, a career-ladder interaction, and a table.
- `styles.css` — shared layout, typography, colors, responsive styles, chart styling, and the dashboard’s visual system.
- `report.js` — loads the compact JSON summary and renders the report charts in SVG.
- `dashboard.js` — loads and parses the tidy CSV in the browser, filters rows, calculates summaries, and renders the dashboard.
- `data/finance_diversity.csv` — the tidy, browser-ready dataset used by the dashboard.
- `data/finance_summary.json` — precomputed summary values used by the report page.
- `scripts/build_eeoc_dataset.py` — reproducible standard-library script that reads the official EEOC XLSX files, filters the Finance and Insurance sector, reshapes demographic columns, and writes the two files in `data/`.
- `submission.md` — the four-line hand-in template; replace the student ID, GitHub username, and URLs before submitting.
- `.gitignore` — keeps downloaded source workbooks and Python cache files out of the public repository.

## Data source and scope

The project uses the official [EEOC EEO-1 Employer Information Report statistics](https://www.eeoc.gov/data/eeo-1-employer-information-report-statistics) and the EEOC [Public Use File Data Download User Guide](https://www.eeoc.gov/sites/default/files/2020-11/PUF%20Data%20Download%20User%20Guide.pdf). The source files cover reporting years 2014 through 2023.

The build keeps state-level records for NAICS sector 52, Finance and Insurance. It excludes CBSA and county rows, subsector rows, and source rows that are not state-level sector totals. A tidy output row is one year × state × job category × race/ethnicity × sex aggregate. The final file has 71,400 rows, 14 columns, 10 years, 51 states/territories, 10 job categories, 7 race/ethnicity categories, and 2 sex categories. The raw workbooks are intentionally ignored because they are large; they can be downloaded again by following the URLs in `scripts/build_eeoc_dataset.py`.

The EEO-1 public-use files are aggregate, confidentiality-protected data. Blank or suppressed cells are left blank and excluded from totals. The 2022 and 2023 aggregate totals are higher than earlier years in this extract, so the report treats that as a coverage/reporting break and does not describe it as a sudden hiring wave.

## Calculations

- Annual, job-category, and dashboard shares use the non-suppressed `employee_count` values in the tidy file as numerator and denominator.
- The report’s state and region Black-women shares use the Black-women count divided by the source row’s one unique `finance_total` all-workforce denominator. This reduces suppression-driven distortion in small state totals.
- Leadership = Senior officials and managers + Mid-level officials and managers.
- Leadership share in the dashboard = leadership employee count ÷ current non-suppressed employee count × 100.
- The report’s leadership composition chart divides each race/sex leadership count by the total non-suppressed leadership count.

The dashboard repeats these calculations from `finance_diversity.csv` in the browser after each filter change. It does not rely on a server or an API.

## Run locally

From this folder, use a local web server so the browser can fetch the CSV and JSON files:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/` in a browser.

To rebuild the data after downloading the official source workbooks into `source_eeoc/`:

```bash
python3 scripts/build_eeoc_dataset.py
```

## GitHub Pages

Push the repository to a public GitHub repository with the default branch named `main`. In the repository settings, enable Pages from the `main` branch and the root folder. The live site will use `index.html` as its home page and link to `dashboard.html`.
