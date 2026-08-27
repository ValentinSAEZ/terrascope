"""Aggregate the supplied CMIP6 grid into reproducible national annual means.

Usage (from repository root):
  PYTHONPATH=work/cmip-deps python scripts/process_cmip_projection.py INPUT.nc COUNTRIES.geojson OUTPUT.json
"""

import json
import math
import os
import sys

import h5py
import numpy as np
from shapely.geometry import box, shape


COUNTRIES = {
    "040": "AUT", "056": "BEL", "100": "BGR", "191": "HRV", "196": "CYP",
    "203": "CZE", "208": "DNK", "233": "EST", "246": "FIN", "250": "FRA",
    "276": "DEU", "300": "GRC", "348": "HUN", "372": "IRL", "380": "ITA",
    "428": "LVA", "440": "LTU", "442": "LUX", "528": "NLD", "616": "POL",
    "620": "PRT", "642": "ROU", "703": "SVK", "705": "SVN", "724": "ESP",
    "752": "SWE",
}


def cell_edges(values):
    midpoints = (values[1:] + values[:-1]) / 2
    return np.concatenate(([values[0] - (midpoints[0] - values[0])], midpoints,
                           [values[-1] + (values[-1] - midpoints[-1])]))


def main(source_path, boundaries_path, output_path):
    with open(boundaries_path, encoding="utf-8") as handle:
        features = json.load(handle)["features"]
    geometries = {
        COUNTRIES[str(feature.get("id", "")).zfill(3)]: shape(feature["geometry"])
        for feature in features if str(feature.get("id", "")).zfill(3) in COUNTRIES
    }

    with h5py.File(source_path, "r") as dataset:
        latitudes = dataset["lat"][:]
        longitudes = dataset["lon"][:]
        temperatures = dataset["tas"][:].astype(float)
        durations = dataset["time_bounds"][:, 1] - dataset["time_bounds"][:, 0]
        time = dataset["time"][:]
        units = dataset["tas"].attrs["units"]
        model = dataset.attrs.get("source_id", "CNRM-ESM2-1")

    # CMIP6 grid longitudes are 0..360; Natural Earth uses -180..180.
    longitudes = np.where(longitudes > 180, longitudes - 360, longitudes)
    lon_order = np.argsort(longitudes)
    longitudes, temperatures = longitudes[lon_order], temperatures[:, :, lon_order]
    lat_edges, lon_edges = cell_edges(latitudes), cell_edges(longitudes)

    # The supplied file contains Jan–Dec 2050 then Jan–Dec 2100.
    years = [2050] * 12 + [2100] * 12
    country_weights = {}
    for code, geometry in geometries.items():
        minx, miny, maxx, maxy = geometry.bounds
        weights = []
        for yi, latitude in enumerate(latitudes):
            if lat_edges[yi + 1] < miny or lat_edges[yi] > maxy:
                continue
            for xi, longitude in enumerate(longitudes):
                if lon_edges[xi + 1] < minx or lon_edges[xi] > maxx:
                    continue
                overlap = geometry.intersection(box(lon_edges[xi], lat_edges[yi], lon_edges[xi + 1], lat_edges[yi + 1]))
                if not overlap.is_empty and overlap.area > 0:
                    # cos(latitude) approximates the area change in a lon/lat grid cell.
                    weights.append((yi, xi, overlap.area * math.cos(math.radians(latitude))))
        country_weights[code] = weights

    output = {}
    # Malta is intentionally retained in the output even though the 1:110m
    # boundary set does not resolve it at this CMIP6 grid resolution.
    for code in [*COUNTRIES.values(), "MLT"]:
        weights = country_weights.get(code, [])
        if len(weights) < 4:
            output[code] = {"status": "not_available", "reason": "Fewer than four intersected cells in the 1.4° CMIP6 grid; a national mean would be misleading."}
            continue
        per_year = {}
        for year in (2050, 2100):
            indices = [index for index, item_year in enumerate(years) if item_year == year]
            values = []
            for index in indices:
                cell_values = np.array([temperatures[index, yi, xi] for yi, xi, _ in weights])
                spatial_weights = np.array([weight for _, _, weight in weights])
                valid = np.isfinite(cell_values) & (cell_values < 1e10)
                if not valid.any():
                    continue
                values.append((np.average(cell_values[valid], weights=spatial_weights[valid]), durations[index]))
            annual_kelvin = np.average([value for value, _ in values], weights=[duration for _, duration in values])
            per_year[str(year)] = round(float(annual_kelvin - 273.15), 2)
        output[code] = {"status": "available", "annual_temperature_c": per_year, "intersected_cells": len(weights)}

    result = {
        "metadata": {
            "indicator": "Projected annual mean near-surface air temperature",
            "unit": "°C",
            "scenario": "SSP2-4.5",
            "model": str(model),
            "ensemble_member": "r1i1p1f2",
            "source": "Copernicus Climate Data Store / CMIP6",
            "method": "Monthly values are duration-weighted into annual means. Each national value is a fraction-of-grid-cell area-weighted mean using Natural Earth 1:110m boundaries.",
            "caveat": "Single-model, scenario-conditional projection. It is not a forecast and does not represent inter-model uncertainty.",
            "years": [2050, 2100],
            "input_file": os.path.basename(source_path),
        },
        "countries": output,
    }
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit("Expected INPUT.nc COUNTRIES.geojson OUTPUT.json")
    main(*sys.argv[1:])
