"""Aggregate ERA5 monthly 2 m temperature into national observed climate indicators."""

import calendar
import datetime as dt
import json
import math
import os
import sys

import h5py
import numpy as np
from shapely.geometry import Point, shape
from shapely.prepared import prep

COUNTRIES = {
    "040": "AUT", "056": "BEL", "100": "BGR", "191": "HRV", "196": "CYP", "203": "CZE",
    "208": "DNK", "233": "EST", "246": "FIN", "250": "FRA", "276": "DEU", "300": "GRC",
    "348": "HUN", "372": "IRL", "380": "ITA", "428": "LVA", "440": "LTU", "442": "LUX",
    "470": "MLT", "528": "NLD", "616": "POL", "620": "PRT", "642": "ROU", "703": "SVK",
    "705": "SVN", "724": "ESP", "752": "SWE",
}
ORIGIN = dt.datetime(1970, 1, 1)


def country_masks(boundaries_path, latitudes, longitudes):
    features = json.load(open(boundaries_path, encoding="utf-8"))["features"]
    geometries = {COUNTRIES[str(f.get("id", "")).zfill(3)]: shape(f["geometry"])
                  for f in features if str(f.get("id", "")).zfill(3) in COUNTRIES}
    # Europe-only window, split across ERA5's 0° longitude edge.
    lat_idx = np.where((latitudes >= 34) & (latitudes <= 72))[0]
    west_idx = np.where(longitudes >= 348)[0]
    east_idx = np.where(longitudes <= 36)[0]
    region_lat = latitudes[lat_idx]
    region_lon = np.r_[longitudes[west_idx] - 360, longitudes[east_idx]]
    masks = {}
    for code, geometry in geometries.items():
        prepared = prep(geometry)
        minx, miny, maxx, maxy = geometry.bounds
        mask = np.zeros((len(region_lat), len(region_lon)), dtype=bool)
        for yi, latitude in enumerate(region_lat):
            if latitude < miny or latitude > maxy:
                continue
            for xi, longitude in enumerate(region_lon):
                if minx <= longitude <= maxx and prepared.contains(Point(float(longitude), float(latitude))):
                    mask[yi, xi] = True
        flat = np.flatnonzero(mask)
        weights = np.cos(np.deg2rad(np.repeat(region_lat, len(region_lon))[flat]))
        masks[code] = (flat, weights)
    return lat_idx, west_idx, east_idx, masks


def weighted_mean(values, weights):
    return float(np.average(values, weights=weights))


def main(source_path, boundaries_path, output_path):
    with h5py.File(source_path, "r") as dataset:
        latitudes, longitudes = dataset["latitude"][:], dataset["longitude"][:]
        valid_time = dataset["valid_time"][:]
        lat_idx, west_idx, east_idx, masks = country_masks(boundaries_path, latitudes, longitudes)
        records = {code: [] for code in COUNTRIES.values()}
        source = dataset["t2m"]
        for start in range(0, len(valid_time), 77):
            end = min(start + 77, len(valid_time))
            west = source[start:end, lat_idx[0]:lat_idx[-1] + 1, west_idx[0]:west_idx[-1] + 1]
            east = source[start:end, lat_idx[0]:lat_idx[-1] + 1, east_idx[0]:east_idx[-1] + 1]
            region = np.concatenate((west, east), axis=2).reshape(end - start, -1)
            for local_index, timestamp in enumerate(valid_time[start:end]):
                date = ORIGIN + dt.timedelta(seconds=int(timestamp))
                duration = calendar.monthrange(date.year, date.month)[1]
                for code, (flat, weights) in masks.items():
                    if len(flat) < 4:
                        continue
                    values = region[local_index, flat]
                    valid = np.isfinite(values)
                    if valid.any():
                        records[code].append((date.year, date.month, weighted_mean(values[valid], weights[valid]), duration))

    countries = {}
    for code in COUNTRIES.values():
        monthly = records[code]
        baseline = [item for item in monthly if 1991 <= item[0] <= 2020]
        recent = [item for item in monthly if 2021 <= item[0] <= 2025]
        if len(baseline) != 360 or len(recent) != 60:
            countries[code] = {"status": "not_available", "reason": "Insufficient national coverage in ERA5 0.1° grid."}
            continue
        normal = weighted_mean([value for _, _, value, _ in baseline], [days for *_, days in baseline]) - 273.15
        recent_mean = weighted_mean([value for _, _, value, _ in recent], [days for *_, days in recent]) - 273.15
        annual = {}
        for year in range(1950, 2026):
            months = [item for item in monthly if item[0] == year]
            if len(months) == 12:
                annual[str(year)] = round(weighted_mean([value for _, _, value, _ in months], [days for *_, days in months]) - 273.15, 2)
        countries[code] = {
            "status": "available", "baseline_1991_2020_c": round(normal, 2),
            "recent_anomaly_2021_2025_c": round(recent_mean - normal, 2),
            "annual_temperature_c": annual, "intersected_cells": len(masks[code][0]),
        }

    result = {"metadata": {
        "indicator": "Observed annual mean 2 m air temperature anomaly", "unit": "°C relative to 1991–2020",
        "source": "Copernicus Climate Change Service / ERA5 monthly averaged reanalysis",
        "period": "1950–2025 (complete years)", "recent_period": "2021–2025",
        "method": "Monthly 2 m temperature values are weighted by month length. Country means use 0.1° ERA5 cell centres weighted by cosine latitude and Natural Earth 1:10m boundaries.",
        "caveat": "Reanalysis combines observations and a numerical weather model; it is not a direct station-only measurement.",
    }, "countries": countries}
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    json.dump(result, open(output_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)


if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit("Expected ERA5.nc COUNTRIES.geojson OUTPUT.json")
    main(*sys.argv[1:])
