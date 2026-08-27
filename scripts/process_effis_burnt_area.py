"""Extract EFFIS annual country burnt area from its published workbook."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import openpyxl

EU27 = {
    "AUT": "AUT", "BEL": "BEL", "BGR": "BGR", "HRV": "HRV", "CYP": "CYP", "CZE": "CZE",
    "DNK": "DNK", "EST": "EST", "FIN": "FIN", "FRA": "FRA", "DEU": "DEU", "GRC": "GRC",
    "HUN": "HUN", "IRL": "IRL", "ITA": "ITA", "LVA": "LVA", "LTU": "LTU", "LUX": "LUX",
    "MLT": "MLT", "NLD": "NLD", "POL": "POL", "PRT": "PRT", "ROU": "ROU", "SVK": "SVK",
    "SVN": "SVN", "ESP": "ESP", "SWE": "SWE",
}


def number(value):
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)
    return float(str(value).replace("\u00a0", "").replace(" ", "").replace(",", "."))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    book = openpyxl.load_workbook(args.input, read_only=True, data_only=True)
    sheet = book["Burnt area (ha) 1980 - 204"]
    rows = list(sheet.iter_rows(values_only=True))
    header = list(rows[0])
    year_row = max((row for row in rows[1:] if isinstance(row[0], int)), key=lambda row: row[0])
    year = int(year_row[0])
    values = {str(header[index]): number(year_row[index]) for index in range(1, len(header))}
    countries = {
        code: ({"status": "available", "burnt_area_ha": round(values[code], 1)} if values.get(code) is not None else {"status": "not_available", "reason": "No EFFIS country total in the published annual workbook."})
        for code in EU27
    }
    result = {
        "indicator": "Annual burnt area reported by EFFIS",
        "unit": "hectares",
        "year": year,
        "source": "European Forest Fire Information System (EFFIS), country totals annual workbook",
        "method": "Published country total of burnt area. It must not be interpreted as the number of ignitions, the area of forest only, or a causal attribution to climate change.",
        "countries": countries,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {args.output} · year {year} · {sum(x['status'] == 'available' for x in countries.values())} EU countries available")


if __name__ == "__main__":
    main()
