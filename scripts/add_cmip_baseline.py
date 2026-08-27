"""Add a 1991–2020 same-model baseline to an existing CMIP6 projection JSON."""

import json
import os
import sys

from process_cmip_anomaly import ALL_CODES, aggregate_months, make_weights, weighted_mean


def main(historical, continuation, boundaries, projection_path):
    weights = make_weights(boundaries, historical)
    historical_records = aggregate_months(historical, weights)
    continuation_records = aggregate_months(continuation, weights)
    with open(projection_path, encoding="utf-8") as handle:
        result = json.load(handle)

    for code in ALL_CODES:
        entry = result["countries"].get(code, {})
        records = [record for record in historical_records[code] + continuation_records[code]
                   if 1991 <= record[0] <= 2020]
        annual = entry.get("annual_temperature_c", {})
        if entry.get("status") != "available" or len(records) != 360 or not all(year in annual for year in ("2050", "2100")):
            result["countries"][code] = {"status": "not_available", "reason": "Insufficient national coverage in the 1.4° CMIP6 grid."}
            continue
        baseline = weighted_mean(records) - 273.15
        entry["baseline_1991_2020_c"] = round(baseline, 2)
        entry["anomaly_vs_1991_2020_c"] = {
            year: round(float(annual[year]) - baseline, 2) for year in ("2050", "2100")
        }

    result["metadata"].update({
        "indicator": "Simulated annual mean near-surface air temperature anomaly",
        "unit": "°C relative to 1991–2020",
        "baseline": "1991–2020",
        "baseline_input_files": [os.path.basename(historical), os.path.basename(continuation)],
        "method": "Monthly tas values are duration-weighted. National means use fractional grid-cell area weights. Anomalies subtract the same model's 1991–2020 baseline.",
        "caveat": "Single-model, scenario-conditional simulation. It is not a forecast or an inter-model uncertainty range.",
    })
    with open(projection_path, "w", encoding="utf-8") as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    if len(sys.argv) != 5:
        raise SystemExit("Expected HISTORICAL.nc CONTINUATION.nc COUNTRIES.geojson PROJECTIONS.json")
    main(*sys.argv[1:])
