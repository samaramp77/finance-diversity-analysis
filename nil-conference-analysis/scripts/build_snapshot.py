"""Validate the captured Division I conference estimate snapshot."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "division1_market.json"


def main():
    payload = json.loads(DATA.read_text())
    conferences = payload["conferences"]
    market = payload["market"]

    assert len(conferences) == market["conference_count"]
    assert sum(row["programs"] for row in conferences) == market["program_count"]
    assert abs(sum(row["market_millions"] for row in conferences) - market["total_millions"]) < 1
    assert conferences == sorted(conferences, key=lambda row: row["rank"])
    assert all(row["market_millions"] >= row["leader_millions"] for row in conferences)

    p4 = [row for row in conferences if row["tier"] == "Power 4"]
    p4_total = sum(row["market_millions"] for row in p4)
    assert abs(p4_total - market["p4_total_millions"]) < 1
    assert abs(100 * p4_total / market["total_millions"] - market["p4_share"]) < 1

    for conference, mix in payload["sport_mix"].items():
        total = sum(mix.values())
        expected = next(row["market_millions"] for row in conferences if row["conference"] == conference)
        assert abs(total - expected) < 1, (conference, total, expected)

    positions = payload["fbs_position_context"]["groups"]
    assert sum(row["players"] for row in positions) == 14519
    assert len({row["position"] for row in positions}) == len(positions)

    programs = payload["power4_programs"]
    assert len(programs) == 68
    assert {row["conference"] for row in programs} == {"SEC", "Big Ten", "ACC", "Big 12"}
    for conference in {row["conference"] for row in programs}:
        program_total = sum(row["market_millions"] for row in programs if row["conference"] == conference)
        conference_total = next(row["market_millions"] for row in conferences if row["conference"] == conference)
        assert abs(program_total - conference_total) < 1, (conference, program_total, conference_total)

    print(f"Validated {len(conferences)} Division I conferences and {market['program_count']:,} programs.")
    print(f"Modeled D-I market: ${market['total_millions']:,.1f}M")
    print(f"Power 4 share: {market['p4_share']:.1f}%")
    print(f"Largest conference: {conferences[0]['conference']} (${conferences[0]['market_millions']:,.1f}M)")
    print(f"Validated {sum(row['players'] for row in positions):,} modeled FBS football players across {len(positions)} position groups.")
    print(f"Validated {len(programs)} Power 4 school estimates.")


if __name__ == "__main__":
    main()
