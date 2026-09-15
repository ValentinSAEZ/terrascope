"""Create a reproducible national ERA5-Land hot-day indicator.

The reported number is the area-weighted mean annual count of grid-cell days
whose daily maximum 2 m air temperature is at least 30 °C.  It is not the
number of days at a weather station, nor a population-weighted exposure metric.
The script deliberately fails when the downloaded calendar is incomplete.
"""
from __future__ import annotations

import argparse
import calendar
import json
import re
from datetime import date, timedelta
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


def dates_from_file(dataset: h5py.Dataset) -> list[date]:
    units = dataset.attrs["units"].decode() if isinstance(dataset.attrs["units"], bytes) else dataset.attrs["units"]
    match = re.match(r"days since (\d{4}-\d{2}-\d{2})", units)
    if not match:
        raise ValueError(f"Unsupported time units: {units}")
    start = date.fromisoformat(match.group(1))
    offsets=dataset[:]
    if not np.all(np.isfinite(offsets)) or not np.all(offsets==np.floor(offsets)):
        raise ValueError('Daily timestamps must be finite whole days.')
    return [start + timedelta(days=int(day)) for day in offsets]


def expected_dates(year: int) -> set[date]:
    days = 366 if calendar.isleap(year) else 365
    start = date(year, 1, 1)
    return {start + timedelta(days=index) for index in range(days)}


def country_cells(geojson: Path, lat: np.ndarray, lon: np.ndarray) -> dict[str, tuple[np.ndarray, np.ndarray]]:
    features = json.loads(geojson.read_text(encoding="utf-8"))["features"]
    points = [Point(float(x), float(y)) for y in lat for x in lon]
    weights = np.repeat(np.cos(np.deg2rad(lat)), len(lon))
    result: dict[str, tuple[np.ndarray, np.ndarray]] = {}
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
        if len(indices) >= 1:
            result[code] = (indices, weights[indices])
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, required=True)
    parser.add_argument("--input", type=Path, required=True, help="Directory containing monthly ERA5-Land NetCDF files")
    parser.add_argument("--countries", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    files = sorted(args.input.glob(f"era5-land-tmax-{args.year}-*.nc"))
    if not files:
        raise SystemExit("No ERA5-Land daily files found.")

    observed: set[date] = set()
    masks: dict[str, tuple[np.ndarray, np.ndarray]] | None = None
    counts: dict[str, np.ndarray] = {}
    reference_grid = None
    for path in files:
        with h5py.File(path, "r") as source:
            dates = dates_from_file(source["valid_time"])
            if any(item.year != args.year for item in dates):
                raise SystemExit(f"Unexpected date in {path.name}")
            if len(dates)!=len(set(dates)) or observed.intersection(dates):
                raise SystemExit(f'Duplicate daily timestamps in {path.name}; would double-count hot days.')
            observed.update(dates)
            lat, lon = source["latitude"][:], source["longitude"][:]
            if reference_grid is not None and (not np.array_equal(lat,reference_grid[0]) or not np.array_equal(lon,reference_grid[1])):
                raise SystemExit(f'Grid changed in {path.name}.')
            reference_grid=(lat,lon)
            if masks is None:
                masks = country_cells(args.countries, lat, lon)
                counts = {code: np.zeros(len(indices), dtype=np.uint16) for code, (indices, _) in masks.items()}
            values = source["t2m"]
            unit=values.attrs.get('units','')
            if isinstance(unit,bytes): unit=unit.decode()
            if unit not in ('K','kelvin','Kelvin') or values.shape!=(len(dates),len(lat),len(lon)):
                raise SystemExit(f'Wrong temperature units or dimensions in {path.name}.')
            for day_index in range(values.shape[0]):
                daily=values[day_index, :, :].reshape(-1)
                hot = daily >= 303.15  # 30 °C in kelvin
                for code, (indices, _) in masks.items():
                    cells=daily[indices]
                    if not np.all(np.isfinite(cells)) or np.any((cells<150)|(cells>350)):
                        raise SystemExit(f'{code}: missing/invalid land-cell temperatures in {path.name}; cannot count as cold days.')
                    counts[code] += hot[indices]

    missing = expected_dates(args.year) - observed
    if missing or len(observed) != len(expected_dates(args.year)):
        raise SystemExit(f"Incomplete calendar: {len(observed)}/{len(expected_dates(args.year))} days. Missing sample: {sorted(missing)[:3]}")
    assert masks is not None
    countries = {
        code: {
            "status": "available",
            "mean_hot_days": round(float(np.average(counts[code], weights=weights)), 1),
            "grid_cells": int(len(indices)),
        }
        for code, (indices, weights) in masks.items()
    }
    output = {
        "indicator": "Area-weighted mean annual count of ERA5-Land grid-cell days with daily Tmax >= 30 °C",
        "unit": "days per year",
        "source": "Copernicus Climate Change Service / ERA5-Land post-processed daily statistics",
        "year": args.year,
        "validation": {"calendar_verified": True, "unique_days": len(observed), "expected_days": len(expected_dates(args.year)), "grid_stable": True, "finite_selected_cells": True, "geography_verified": False},
        "daily_statistic": "daily maximum of 2 m temperature, UTC, sampled hourly",
        "method": "0.1° grid cells whose centres fall within national boundaries; cosine-latitude area weighting; a complete calendar is mandatory. Grid-cell counts are retained so small-country resolution can be audited.",
        "countries": countries,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {args.output} for {len(countries)} countries")


if __name__ == "__main__":
    main()
