"""Create national CMIP6 temperature anomalies against the 1991–2020 model baseline."""

import datetime as dt
import json
import math
import os
import sys

import h5py
import numpy as np
from shapely.geometry import box, shape

COUNTRIES = {
    "040": "AUT", "056": "BEL", "100": "BGR", "191": "HRV", "196": "CYP", "203": "CZE",
    "208": "DNK", "233": "EST", "246": "FIN", "250": "FRA", "276": "DEU", "300": "GRC",
    "348": "HUN", "372": "IRL", "380": "ITA", "428": "LVA", "440": "LTU", "442": "LUX",
    "528": "NLD", "616": "POL", "620": "PRT", "642": "ROU", "703": "SVK", "705": "SVN",
    "724": "ESP", "752": "SWE",
}
ALL_CODES = [*COUNTRIES.values(), "MLT"]
ORIGIN = dt.datetime(1850, 1, 1)


def edges(values):
    mid = (values[:-1] + values[1:]) / 2
    return np.r_[values[0] - (mid[0] - values[0]), mid, values[-1] + (values[-1] - mid[-1])]


def years(time):
    return [int((ORIGIN + dt.timedelta(days=float(day))).year) for day in time]


def make_weights(boundaries, grid_path):
    features = json.load(open(boundaries, encoding="utf-8"))["features"]
    geometries = {COUNTRIES[str(f.get("id", "")).zfill(3)]: shape(f["geometry"])
                  for f in features if str(f.get("id", "")).zfill(3) in COUNTRIES}
    with h5py.File(grid_path, "r") as dataset:
        lat, lon = dataset["lat"][:], dataset["lon"][:]
    lon = np.where(lon > 180, lon - 360, lon)
    order = np.argsort(lon)
    lon = lon[order]
    lat_e, lon_e = edges(lat), edges(lon)
    weights = {}
    for code, geometry in geometries.items():
        minx, miny, maxx, maxy = geometry.bounds
        cells = []
        for yi, latitude in enumerate(lat):
            if lat_e[yi + 1] < miny or lat_e[yi] > maxy:
                continue
            for sorted_xi, longitude in enumerate(lon):
                if lon_e[sorted_xi + 1] < minx or lon_e[sorted_xi] > maxx:
                    continue
                area = geometry.intersection(box(lon_e[sorted_xi], lat_e[yi], lon_e[sorted_xi + 1], lat_e[yi + 1])).area
                if area:
                    cells.append((yi, int(order[sorted_xi]), area * math.cos(math.radians(latitude))))
        weights[code] = cells
    return weights


def aggregate_months(path, weights):
    with h5py.File(path, "r") as dataset:
        tas = dataset["tas"][:].astype(float)
        duration = dataset["time_bounds"][:, 1] - dataset["time_bounds"][:, 0]
        file_years = years(dataset["time"][:])
    result = {code: [] for code in ALL_CODES}
    for index, year in enumerate(file_years):
        for code in ALL_CODES:
            cells = weights.get(code, [])
            if len(cells) < 4:
                continue
            values = np.array([tas[index, yi, xi] for yi, xi, _ in cells])
            spatial = np.array([weight for _, _, weight in cells])
            valid = np.isfinite(values) & (values < 1e10)
            if valid.any():
                result[code].append((year, float(np.average(values[valid], weights=spatial[valid])), float(duration[index])))
    return result


def weighted_mean(records):
    return float(np.average([value for _, value, _ in records], weights=[duration for _, _, duration in records]))


def main(historical, continuation, future, boundaries, output):
    weights = make_weights(boundaries, future)
    baseline_records = [aggregate_months(path, weights) for path in (historical, continuation)]
    future_records = aggregate_months(future, weights)
    countries = {}
    for code in ALL_CODES:
        base = [record for batch in baseline_records for record in batch[code] if 1991 <= record[0] <= 2020]
        future_by_year = {year: [record for record in future_records[code] if record[0] == year] for year in (2050, 2100)}
        if len(weights.get(code, [])) < 4 or len(base) != 360 or any(len(items) != 12 for items in future_by_year.values()):
            countries[code] = {"status": "not_available", "reason": "Insufficient national coverage in the 1.4° CMIP6 grid."}
            continue
        normal = weighted_mean(base) - 273.15
        annual = {str(year): weighted_mean(items) - 273.15 for year, items in future_by_year.items()}
        countries[code] = {
            "status": "available",
            "baseline_1991_2020_c": round(normal, 2),
            "annual_temperature_c": {year: round(value, 2) for year, value in annual.items()},
            "anomaly_vs_1991_2020_c": {year: round(value - normal, 2) for year, value in annual.items()},
            "intersected_cells": len(weights[code]),
        }
    result = {"metadata": {
        "indicator": "Simulated annual mean near-surface air temperature anomaly",
        "unit": "°C relative to 1991–2020",
        "scenario": "SSP2-4.5", "model": "CNRM-ESM2-1", "ensemble_member": "r1i1p1f2",
        "source": "Copernicus Climate Data Store / CMIP6",
        "method": "Monthly tas values are duration-weighted. National means use fractional grid-cell area weights. Anomalies subtract the same model's 1991–2020 baseline.",
        "caveat": "Single-model, scenario-conditional simulation. It is not a forecast or an inter-model uncertainty range.",
        "baseline": "1991–2020", "years": [2050, 2100],
    }, "countries": countries}
    os.makedirs(os.path.dirname(output), exist_ok=True)
    json.dump(result, open(output, "w", encoding="utf-8"), ensure_ascii=False, indent=2)


if __name__ == "__main__":
    if len(sys.argv) != 6:
        raise SystemExit("Expected HISTORICAL.nc CONTINUATION.nc FUTURE.nc COUNTRIES.geojson OUTPUT.json")
    main(*sys.argv[1:])
