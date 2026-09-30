#!/usr/bin/env python3
"""Turn annual EEOC EEO-1 public-use spreadsheets into a tidy finance dataset."""

from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from pathlib import Path
from zipfile import ZipFile
from xml.etree.ElementTree import iterparse


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source_eeoc"
DATA = ROOT / "data"
OUTPUT = DATA / "finance_diversity.csv"
SUMMARY = DATA / "finance_summary.json"
YEARS = list(range(2014, 2024))

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
OUTPUT_FIELDS = [
    "year",
    "state",
    "region",
    "division",
    "industry",
    "job_category",
    "race_ethnicity",
    "sex",
    "employee_count",
    "job_total",
    "share_of_job",
    "finance_total",
    "share_of_finance",
    "establishments",
]

RACES = {
    "WH": "White",
    "BLK": "Black or African American",
    "HISP": "Hispanic",
    "ASIAN": "Asian",
    "AIAN": "American Indian or Alaska Native",
    "NHOPI": "Native Hawaiian or Other Pacific Islander",
    "TOMR": "Two or more races",
}
SEXES = {"M": "Male", "F": "Female"}
JOBS = {
    "1": "Senior officials and managers",
    "2": "Professionals",
    "3": "Technicians",
    "4": "Sales workers",
    "5": "Administrative support",
    "6": "Craft workers",
    "7": "Operatives",
    "8": "Laborers and helpers",
    "9": "Service workers",
    "1_2": "Mid-level officials and managers",
}
JOB_ORDER = list(JOBS)
RACE_ORDER = list(RACES.values())


def excel_column_index(reference: str) -> int:
    letters = "".join(character for character in reference if character.isalpha())
    index = 0
    for character in letters:
        index = index * 26 + ord(character.upper()) - 64
    return index - 1


def cell_value(cell, shared: list[str]) -> str:
    cell_type = cell.attrib.get("t")
    if cell_type == "inlineStr":
        return "".join(text.text or "" for text in cell.iter(NS + "t"))
    value = cell.find(NS + "v")
    if value is None or value.text is None:
        return ""
    if cell_type == "s":
        return shared[int(value.text)]
    return value.text


def read_workbook(path: Path):
    """Stream rows from the first sheet of an xlsx file without pandas/openpyxl."""
    with ZipFile(path) as workbook:
        shared: list[str] = []
        if "xl/sharedStrings.xml" in workbook.namelist():
            for _, element in iterparse(workbook.open("xl/sharedStrings.xml"), events=("end",)):
                if element.tag == NS + "si":
                    shared.append("".join(text.text or "" for text in element.iter(NS + "t")))
                    element.clear()

        header: list[str] | None = None
        for _, element in iterparse(workbook.open("xl/worksheets/sheet1.xml"), events=("end",)):
            if element.tag != NS + "row":
                continue
            values = [""] * 275
            for cell in element.findall(NS + "c"):
                index = excel_column_index(cell.attrib["r"])
                if index < len(values):
                    values[index] = cell_value(cell, shared)
            element.clear()
            if header is None:
                header = values
                continue
            yield {name: values[index] for index, name in enumerate(header) if name}


def integer(value: str | None) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(float(value))
    except ValueError:
        return None


def number(value: str | None) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except ValueError:
        return None


def demographic_columns() -> list[tuple[str, str, str, str]]:
    columns = []
    for race_code, race_label in RACES.items():
        for sex_code, sex_label in SEXES.items():
            for job_code, job_label in JOBS.items():
                columns.append((f"{race_code}{sex_code}{job_code}", race_label, sex_label, job_label))
    return columns


def rounded_percent(part: float | int | None, whole: float | int | None) -> float | None:
    if part is None or whole in (None, 0):
        return None
    return round(100 * part / whole, 2)


def main() -> None:
    DATA.mkdir(exist_ok=True)
    demographic_fields = demographic_columns()
    records: list[dict] = []
    state_year_stats: dict[tuple[int, str], dict] = {}
    national_job: defaultdict[tuple[int, str, str, str], int] = defaultdict(int)

    for year in YEARS:
        path = SOURCE / f"eeo1_{year}.xlsx"
        if not path.exists():
            raise FileNotFoundError(f"Missing {path}")
        state_rows = 0
        for row in read_workbook(path):
            if not row.get("State") or row.get("CBSA") or row.get("County"):
                continue
            if row.get("NAICS2") != "52" or row.get("NAICS3"):
                continue
            state_rows += 1
            state = row["State"]
            finance_total = integer(row.get("TOTAL10"))
            establishments = integer(row.get("Establishments"))
            state_key = (year, state)
            state_year_stats[state_key] = {
                "year": year,
                "state": state,
                "region": row.get("Region", ""),
                "division": row.get("Division", ""),
                "finance_total": finance_total,
                "establishments": establishments,
                "women": sum(integer(row.get(f"FT{job}")) or 0 for job in JOBS),
                "black_women": sum(integer(row.get(f"BLKF{job}")) or 0 for job in JOBS),
                "black_women_leaders": (integer(row.get("BLKF1")) or 0) + (integer(row.get("BLKF1_2")) or 0),
                "senior_total": (integer(row.get("TOTAL1")) or 0) + (integer(row.get("TOTAL1_2")) or 0),
                "tidy_total": 0,
                "tidy_women": 0,
                "tidy_black_women": 0,
                "tidy_black_women_leaders": 0,
                "tidy_leadership_total": 0,
            }
            for code, race, sex, job in demographic_fields:
                employees = integer(row.get(code))
                job_code = code[len(next(prefix for prefix in RACES if code.startswith(prefix))) + 1 :]
                job_total = integer(row.get(f"TOTAL{job_code}"))
                if employees is not None:
                    national_job[(year, job, race, sex)] += employees
                    state_year_stats[state_key]["tidy_total"] += employees
                    if sex == "Female":
                        state_year_stats[state_key]["tidy_women"] += employees
                    if race == "Black or African American" and sex == "Female":
                        state_year_stats[state_key]["tidy_black_women"] += employees
                    if job in {JOBS["1"], JOBS["1_2"]}:
                        state_year_stats[state_key]["tidy_leadership_total"] += employees
                        if race == "Black or African American" and sex == "Female":
                            state_year_stats[state_key]["tidy_black_women_leaders"] += employees
                records.append(
                    {
                        "year": year,
                        "state": state,
                        "region": row.get("Region", ""),
                        "division": row.get("Division", ""),
                        "industry": row.get("NAICS2_Name", "Finance and Insurance"),
                        "job_category": job,
                        "race_ethnicity": race,
                        "sex": sex,
                        "employee_count": employees,
                        "job_total": job_total,
                        "share_of_job": rounded_percent(employees, job_total),
                        "finance_total": finance_total,
                        "share_of_finance": rounded_percent(employees, finance_total),
                        "establishments": establishments,
                    }
                )
        print(f"{year}: {state_rows} state-level finance rows", flush=True)

    with OUTPUT.open("w", newline="", encoding="utf-8") as output:
        writer = csv.DictWriter(output, fieldnames=OUTPUT_FIELDS)
        writer.writeheader()
        writer.writerows(records)

    latest = YEARS[-1]
    latest_state = [value for (year, _), value in state_year_stats.items() if year == latest]
    year_rows = []
    for year in YEARS:
        total = sum(national_job[(year, job, race, sex)] for job in JOBS.values() for race in RACE_ORDER for sex in SEXES.values())
        women = sum(national_job[(year, job, race, "Female")] for job in JOBS.values() for race in RACE_ORDER)
        black_women = sum(national_job[(year, job, "Black or African American", "Female")] for job in JOBS.values())
        black_women_leaders = sum(national_job[(year, job, "Black or African American", "Female")] for job in {JOBS["1"], JOBS["1_2"]})
        leadership_total = sum(national_job[(year, job, race, sex)] for job in {JOBS["1"], JOBS["1_2"]} for race in RACE_ORDER for sex in SEXES.values())
        year_rows.append(
            {
                "year": year,
                "finance_total": total,
                "women": women,
                "women_share": rounded_percent(women, total),
                "black_women": black_women,
                "black_women_share": rounded_percent(black_women, total),
                "black_women_leaders": black_women_leaders,
                "black_women_leader_share": rounded_percent(black_women_leaders, leadership_total),
                "senior_total": leadership_total,
            }
        )

    job_sex = []
    for job in JOBS.values():
        female = sum(national_job[(latest, job, race, "Female")] for race in RACE_ORDER)
        male = sum(national_job[(latest, job, race, "Male")] for race in RACE_ORDER)
        total = female + male
        job_sex.append({"job": job, "female": female, "male": male, "total": total, "female_share": rounded_percent(female, total)})

    race_sex = []
    for race in RACE_ORDER:
        for sex in SEXES.values():
            employees = sum(national_job[(latest, job, race, sex)] for job in JOBS.values())
            race_sex.append({"race": race, "sex": sex, "employees": employees})

    leadership = []
    for race in RACE_ORDER:
        for sex in SEXES.values():
            employees = national_job[(latest, JOBS["1"], race, sex)] + national_job[(latest, JOBS["1_2"], race, sex)]
            leadership.append({"race": race, "sex": sex, "employees": employees})

    states = []
    for value in latest_state:
        states.append(
            {
                "state": value["state"],
                "region": value["region"],
                "finance_total": value["finance_total"],
                "women_share": rounded_percent(value["women"], value["finance_total"]),
                "black_women_share": rounded_percent(value["black_women"], value["finance_total"]),
                "black_women_leader_share": rounded_percent(value["black_women_leaders"], value["senior_total"]),
                "establishments": value["establishments"],
            }
        )
    states.sort(key=lambda item: item["black_women_share"] or 0, reverse=True)

    regions = {}
    for value in latest_state:
        region = value["region"]
        if region not in regions:
            regions[region] = {"region": region, "finance_total": 0, "women": 0, "black_women": 0, "leaders": 0, "senior_total": 0}
        regions[region]["finance_total"] += value["finance_total"] or 0
        regions[region]["women"] += value["women"]
        regions[region]["black_women"] += value["black_women"]
        regions[region]["leaders"] += value["black_women_leaders"]
        regions[region]["senior_total"] += value["senior_total"]
    region_rows = []
    for value in regions.values():
        region_rows.append(
            {
                "region": value["region"],
                "finance_total": value["finance_total"],
                "women_share": rounded_percent(value["women"], value["finance_total"]),
                "black_women_share": rounded_percent(value["black_women"], value["finance_total"]),
                "black_women_leader_share": rounded_percent(value["leaders"], value["senior_total"]),
            }
        )
    region_rows.sort(key=lambda item: item["black_women_share"] or 0, reverse=True)

    female_leadership = sum(item["female"] for item in job_sex if item["job"] in {JOBS["1"], JOBS["1_2"]})
    leadership_total = sum(item["total"] for item in job_sex if item["job"] in {JOBS["1"], JOBS["1_2"]})

    summary = {
        "dataset": "EEOC EEO-1 Finance and Insurance workforce data, 2014–2023",
        "source": "U.S. Equal Employment Opportunity Commission EEO-1 Public Use Files",
        "source_url": "https://www.eeoc.gov/data/eeo-1-employer-information-report-statistics",
        "methodology_url": "https://www.eeoc.gov/sites/default/files/2020-11/PUF%20Data%20Download%20User%20Guide.pdf",
        "row_definition": "One row is one state × year × job category × race/ethnicity × sex aggregate.",
        "years": YEARS,
        "row_count": len(records),
        "state_count": len({record["state"] for record in records}),
        "job_count": len(JOBS),
        "race_count": len(RACES),
        "column_count": len(OUTPUT_FIELDS),
        "year_rows": year_rows,
        "job_sex": job_sex,
        "race_sex": race_sex,
        "leadership": leadership,
        "states": states,
        "regions": region_rows,
        "latest_year": latest,
        "latest_total": year_rows[-1]["finance_total"],
        "latest_women_share": year_rows[-1]["women_share"],
        "latest_black_women_share": year_rows[-1]["black_women_share"],
        "latest_black_women_leader_share": year_rows[-1]["black_women_leader_share"],
        "latest_female_leadership_share": rounded_percent(female_leadership, leadership_total),
        "latest_leadership_total": leadership_total,
    }
    with SUMMARY.open("w", encoding="utf-8") as output:
        json.dump(summary, output, indent=2)
    print(json.dumps({key: summary[key] for key in ["row_count", "state_count", "job_count", "race_count", "column_count", "latest_total", "latest_women_share", "latest_black_women_share", "latest_black_women_leader_share"]}, indent=2))


if __name__ == "__main__":
    main()
