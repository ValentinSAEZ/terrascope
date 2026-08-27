"""Download ERA5-Land daily maximum 2 m temperature in monthly European chunks.

The Copernicus token is read only from COPERNICUS_CDS_API_KEY.  It must never
be placed in source control or sent to the public TerraScope website.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path

import cdsapi

DATASET = "derived-era5-land-daily-statistics"
EUROPE = [72, -12, 34, 36]  # north, west, south, east
MONTHS = [f"{month:02d}" for month in range(1, 13)]
DAYS = [f"{day:02d}" for day in range(1, 32)]


def request_for(year: int, month: str) -> dict:
    return {
        "variable": "2m_temperature",
        "year": str(year),
        "month": month,
        "day": DAYS,
        "daily_statistic": "daily_maximum",
        "time_zone": "utc+00:00",
        "frequency": "1_hourly",
        "area": EUROPE,
        "data_format": "netcdf",
        "download_format": "unarchived",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, required=True)
    parser.add_argument("--out", type=Path, default=Path("data/raw/era5-land"))
    parser.add_argument("--month", choices=MONTHS, help="Retrieve one month only (connectivity check).")
    args = parser.parse_args()
    key = os.environ.get("COPERNICUS_CDS_API_KEY")
    if not key:
        raise SystemExit("COPERNICUS_CDS_API_KEY is not set. Put it in a local environment variable, not in this repository.")

    args.out.mkdir(parents=True, exist_ok=True)
    client = cdsapi.Client(url="https://cds.climate.copernicus.eu/api", key=key, quiet=False)
    for month in [args.month] if args.month else MONTHS:
        target = args.out / f"era5-land-tmax-{args.year}-{month}.nc"
        if target.exists() and target.stat().st_size > 0:
            print(f"Already downloaded: {target}")
            continue
        print(f"Requesting {args.year}-{month}…")
        client.retrieve(DATASET, request_for(args.year, month), str(target))
        print(f"Saved: {target}")


if __name__ == "__main__":
    main()
