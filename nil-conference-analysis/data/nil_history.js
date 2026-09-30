/* A small browser-ready copy of the historical NCAA disclosure snapshot. */
window.NIL_HISTORY = {
  source: "NCAA NIL Assist public Data Dashboard",
  source_url: "https://nilassist.ncaa.org/data-dashboard/",
  note: "The 2024 and 2025 rows are public, de-identified disclosure snapshots. They are separate from the 2026 modeled conference-market estimates.",
  trend: [
    { year: 2024, group: "All public disclosures", date_range: "Jan 1–Oct 31, 2024", disclosure_count: null, average_disclosure_value: 2296, median_disclosure_value: 60, average_total_athlete_earnings: 22628, median_total_athlete_earnings: 548 },
    { year: 2025, group: "All public disclosures", date_range: "Jan 1–Jul 31, 2025", disclosure_count: 158156, average_disclosure_value: 4141, median_disclosure_value: 46, average_total_athlete_earnings: 21075, median_total_athlete_earnings: 703 },
    { year: 2025, group: "Power 4", date_range: "Jan 1–Jul 31, 2025", disclosure_count: 95463, average_disclosure_value: 6464, median_disclosure_value: 55, average_total_athlete_earnings: 29837, median_total_athlete_earnings: 1033 },
    { year: 2025, group: "Group of 5", date_range: "Jan 1–Jul 31, 2025", disclosure_count: 39913, average_disclosure_value: 625, median_disclosure_value: 32, average_total_athlete_earnings: 10139, median_total_athlete_earnings: 210 },
    { year: 2025, group: "FCS / no football", date_range: "Jan 1–Jul 31, 2025", disclosure_count: 22780, average_disclosure_value: 566, median_disclosure_value: 36, average_total_athlete_earnings: 3078, median_total_athlete_earnings: 237 }
  ],
  segments: [
    { year: 2025, group: "Power 4", disclosure_count: 95463, average_disclosure_value: 6464, median_disclosure_value: 55, average_total_athlete_earnings: 29837, median_total_athlete_earnings: 1033 },
    { year: 2025, group: "Group of 5", disclosure_count: 39913, average_disclosure_value: 625, median_disclosure_value: 32, average_total_athlete_earnings: 10139, median_total_athlete_earnings: 210 },
    { year: 2025, group: "FCS / no football", disclosure_count: 22780, average_disclosure_value: 566, median_disclosure_value: 36, average_total_athlete_earnings: 3078, median_total_athlete_earnings: 237 }
  ],
  sports: [
    { year: 2025, group: "All public disclosures", sport: "Football", count: 62776 },
    { year: 2025, group: "All public disclosures", sport: "Men's basketball", count: 15528 },
    { year: 2025, group: "All public disclosures", sport: "Baseball", count: 15479 },
    { year: 2025, group: "All public disclosures", sport: "Women's basketball", count: 10374 },
    { year: 2025, group: "All public disclosures", sport: "Softball", count: 8817 },
    { year: 2025, group: "All public disclosures", sport: "Women's soccer", count: 7191 },
    { year: 2025, group: "All public disclosures", sport: "Women's volleyball", count: 6528 },
    { year: 2025, group: "All public disclosures", sport: "Women's lacrosse", count: 3667 },
    { year: 2025, group: "All public disclosures", sport: "Track and field", count: 3285 },
    { year: 2025, group: "All public disclosures", sport: "Men's soccer", count: 2293 },
    { year: 2025, group: "All public disclosures", sport: "Women's gymnastics", count: 2276 },
    { year: 2025, group: "All public disclosures", sport: "Other sports", count: 19942 }
  ],
  segment_sports: {
    "Power 4": [
      { sport: "Football", count: 39304 }, { sport: "Baseball", count: 10149 }, { sport: "Men's basketball", count: 8448 }, { sport: "Softball", count: 5726 }, { sport: "Women's basketball", count: 5479 }, { sport: "Women's soccer", count: 4015 }, { sport: "Women's volleyball", count: 3694 }, { sport: "Women's lacrosse", count: 2371 }, { sport: "Men's wrestling", count: 1994 }, { sport: "Track and field", count: 1940 }, { sport: "Women's gymnastics", count: 1608 }, { sport: "Other sports", count: 10735 }
    ],
    "Group of 5": [
      { sport: "Football", count: 17075 }, { sport: "Men's basketball", count: 4052 }, { sport: "Baseball", count: 3415 }, { sport: "Women's basketball", count: 2689 }, { sport: "Women's soccer", count: 2001 }, { sport: "Women's volleyball", count: 1683 }, { sport: "Softball", count: 1614 }, { sport: "Men's track and field", count: 1242 }, { sport: "Women's lacrosse", count: 1079 }, { sport: "Track and field", count: 746 }, { sport: "Men's soccer", count: 615 }, { sport: "Other sports", count: 3702 }
    ],
    "FCS / no football": [
      { sport: "Football", count: 6397 }, { sport: "Men's basketball", count: 3028 }, { sport: "Women's basketball", count: 2206 }, { sport: "Baseball", count: 1915 }, { sport: "Softball", count: 1477 }, { sport: "Women's soccer", count: 1175 }, { sport: "Women's volleyball", count: 1151 }, { sport: "Men's ice hockey", count: 778 }, { sport: "Track and field", count: 599 }, { sport: "Men's track and field", count: 392 }, { sport: "Men's soccer", count: 362 }, { sport: "Other sports", count: 3300 }
    ]
  }
};
