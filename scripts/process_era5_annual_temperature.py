"""Aggregate one complete ERA5 monthly year and compare it with the 1991–2020 baseline."""
from __future__ import annotations

import argparse
import calendar
import datetime as dt
import json
import re
from pathlib import Path

import h5py
import numpy as np
from shapely.geometry import Point, shape
from shapely.prepared import prep

NUMERIC_TO_ISO3 = {
    "040": "AUT", "056": "BEL", "100": "BGR", "191": "HRV", "196": "CYP", "203": "CZE",
    "208": "DNK", "233": "EST", "246": "FIN", "250": "FRA", "276": "DEU", "300": "GRC",
    "348": "HUN", "372": "IRL", "380": "ITA", "428": "LVA", "440": "LTU", "442": "LUX",
    "470": "MLT", "528": "NLD", "616": "POL", "620": "PRT", "642": "ROU", "703": "SVK",
    "705": "SVN", "724": "ESP", "752": "SWE",
}
EU27 = set(NUMERIC_TO_ISO3.values())


def dates(dataset: h5py.Dataset) -> list[dt.datetime]:
    units = dataset.attrs["units"]
    if isinstance(units, bytes):
        units = units.decode()
    match = re.match(r"(seconds|hours|days) since (\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}:\d{2}))?", units)
    if not match:
        raise ValueError(f"Unsupported time units: {units}")
    origin = dt.datetime.fromisoformat(f"{match.group(2)}T{match.group(3) or '00:00:00'}")
    multipliers = {"seconds": 1, "hours": 3600, "days": 86400}
    return [origin + dt.timedelta(seconds=float(value) * multipliers[match.group(1)]) for value in dataset[:]]


def masks(boundaries: Path, lat: np.ndarray, lon: np.ndarray) -> dict[str, tuple[np.ndarray, np.ndarray]]:
    features = json.loads(boundaries.read_text(encoding="utf-8"))["features"]
    points = [Point(float(x), float(y)) for y in lat for x in lon]
    weights = np.repeat(np.cos(np.deg2rad(lat)), len(lon))
    result = {}
    for feature in features:
        properties = feature.get("properties", {})
        candidates = [
            properties.get("ADM0_A3"), properties.get("ISO_A3"), properties.get("SOV_A3"),
            NUMERIC_TO_ISO3.get(str(feature.get("id", "")).zfill(3)),
        ]
        code = next((candidate for candidate in candidates if candidate in EU27), None)
        if not code:
            continue
        polygon = prep(shape(feature["geometry"]))
        indices = np.fromiter((index for index, point in enumerate(points) if polygon.contains(point)), dtype=np.int64)
        if len(indices):
            result[code] = (indices, weights[indices])
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, required=True)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--countries", type=Path, required=True)
    parser.add_argument("--baseline", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    baseline = json.loads(args.baseline.read_text(encoding="utf-8"))
    with h5py.File(args.input, "r") as source:
        time_name = "valid_time" if "valid_time" in source else "time"
        timestamps = dates(source[time_name])
        target_indices = [index for index, item in enumerate(timestamps) if item.year == args.year]
        target_dates = [timestamps[index] for index in target_indices]
        if len(target_dates) != 12 or {item.month for item in target_dates} != set(range(1, 13)):
            raise SystemExit(f"Incomplete ERA5 monthly calendar for {args.year}.")
        lat, lon = source["latitude"][:], source["longitude"][:]
        country_masks = masks(args.countries, lat, lon)
        values = source["t2m"][target_indices, :, :].reshape(12, -1)
        countries = {}
        for code in sorted(EU27):
            country_baseline = baseline.get("countries", {}).get(code, {}).get("baseline_1991_2020_c")
            if code not in country_masks or not isinstance(country_baseline, (int, float)):
                countries[code] = {"status": "not_available", "reason": "Boundary coverage or baseline unavailable."}
                continue
            indices, area_weights = country_masks[code]
            monthly = [float(np.average(values[index, indices], weights=area_weights)) for index in range(12)]
            month_weights = [calendar.monthrange(args.year, month)[1] for month in range(1, 13)]
            annual_c = float(np.average(monthly, weights=month_weights)) - 273.15
            countries[code] = {
                "status": "available",
                "annual_temperature_c": round(annual_c, 2),
                "baseline_1991_2020_c": country_baseline,
                "anomaly_vs_1991_2020_c": round(annual_c - country_baseline, 2),
                "grid_cells": int(len(indices)),
            }
    result = {
        "indicator": "Observed annual mean 2 m air temperature anomaly",
        "unit": "°C relative to 1991–2020",
        "year": args.year,
        "source": "Copernicus Climate Change Service / ERA5 monthly averaged reanalysis",
        "method": "Twelve complete monthly means, weighted by month length; national grid-cell means weighted by cosine latitude.",
        "countries": countries,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {args.output} for {sum(item['status'] == 'available' for item in countries.values())} countries")


if __name__ == "__main__":
    main()
