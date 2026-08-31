"""Retrieve one complete ERA5 monthly 2 m temperature year for Europe."""
from __future__ import annotations

import argparse
import os
from pathlib import Path

import cdsapi

DATASET = "reanalysis-era5-single-levels-monthly-means"
EUROPE = [72, -12, 34, 36]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    key = os.environ.get("COPERNICUS_CDS_API_KEY")
    if not key:
        raise SystemExit("COPERNICUS_CDS_API_KEY is not set.")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    if args.output.exists() and args.output.stat().st_size > 0:
        print(f"Already downloaded: {args.output}")
        return
    request = {
        "product_type": "monthly_averaged_reanalysis",
        "variable": "2m_temperature",
        "year": str(args.year),
        "month": [f"{month:02d}" for month in range(1, 13)],
        "time": "00:00",
        "area": EUROPE,
        "grid": [0.1, 0.1],
        "data_format": "netcdf",
        "download_format": "unarchived",
    }
    client = cdsapi.Client(url="https://cds.climate.copernicus.eu/api", key=key, quiet=False)
    client.retrieve(DATASET, request, str(args.output))
    print(f"Saved: {args.output}")


if __name__ == "__main__":
    main()
