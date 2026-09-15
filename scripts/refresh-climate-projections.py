"""Import CCKP CMIP6 ensemble anomalies; publish only a complete validated EU27 batch.

No key required. Raw API payloads and their hashes are retained for reproducibility.
Climatological periods, not individual-year forecasts. Never rebase quantiles.
"""
import concurrent.futures
import datetime
import hashlib
import json
import math
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PERIODS = ['2020-2039', '2040-2059', '2060-2079', '2080-2099']
SCENARIOS = ['ssp126', 'ssp245', 'ssp585']
QUANTILES = ['p10', 'median', 'p90']
HEADERS = {'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json',
           'Referer': 'https://climateknowledgeportal.worldbank.org/'}

def fetch(job):
    scenario, period, quantile = job
    url = ('https://cckpapi.worldbank.org/cckp/v1/cmip6-x0.25_climatology_tas_anomaly_annual_'
           f'{period}_{quantile}_{scenario}_ensemble_all_mean/all_countries?_format=json')
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=60) as response:
        raw = response.read()
    parsed = json.loads(raw)
    if parsed.get('metadata', {}).get('status') != 'success':
        raise ValueError(f'API error: {job}')
    archive = ROOT / 'output/data-audit/cmip6'
    archive.mkdir(parents=True, exist_ok=True)
    (archive / f'{scenario}-{period}-{quantile}.json').write_bytes(raw)
    return job, parsed['data'], {'url': url, 'sha256': hashlib.sha256(raw).hexdigest()}

def main():
    codes = sorted(json.loads((ROOT/'data/annual-snapshot.json').read_text(encoding='utf-8'))['countries'])
    result = {'schema_version': 1, 'source': 'World Bank Climate Change Knowledge Portal / CMIP6',
              'source_url': 'https://climateknowledgeportal.worldbank.org/download-data',
              'documentation_url': 'https://worldbank.github.io/climateknowledgeportal/docs/collections/cmip6-x0.25.html',
              'retrieved_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'variable': 'tas', 'unit': 'degC', 'baseline': '1995-2014',
              'collection': 'cmip6-x0.25', 'aggregation': 'annual',
              'product': 'climatology_anomaly', 'ensemble': 'ensemble_all',
              'periods': PERIODS, 'scenarios': SCENARIOS,
              'method': 'CCKP national spatial aggregation of bias-corrected downscaled CMIP6 ensemble products; 20-year climatological anomalies relative to 1995-2014. Values and p10/median/p90 are imported unchanged.',
              'limitations': ['Scenario-conditional, not a prediction or assigned scenario probability.',
                             'P10-P90 is the spread of the provider ensemble product, not an 80% forecast confidence interval.',
                             'The model ensemble composition can differ between scenarios. National aggregation of ensemble quantiles is not necessarily the quantile of national model means.',
                             'Country boundaries and baseline follow CCKP, not the ERA5 observation pipeline. No direct subtraction from observed 1991-2020 anomalies.',
                             'Period centres are plotting positions only; no annual data are interpolated.'],
              'evidence': [], 'countries': {code: {s: [] for s in SCENARIOS} for code in codes}}
    jobs = [(s,p,q) for s in SCENARIOS for p in PERIODS for q in QUANTILES]
    cells = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for job, data, evidence in pool.map(fetch, jobs):
            cells[job] = data
            result['evidence'].append(evidence)
    for code in codes:
        for scenario in SCENARIOS:
            for period in PERIODS:
                point = {'period': period}
                for q in QUANTILES:
                    entry = cells[(scenario,period,q)].get(code)
                    expected = period[:4] + '-07'
                    if not isinstance(entry, dict) or set(entry) != {expected}:
                        raise ValueError(f'Missing/unexpected period {code} {scenario} {period} {q}')
                    value = entry[expected]
                    if isinstance(value, bool) or not isinstance(value, (float,int)) or not math.isfinite(value) or not -10 < value < 20:
                        raise ValueError(f'Invalid anomaly {code} {scenario} {period} {q}')
                    point[q] = value
                if not point['p10'] <= point['median'] <= point['p90']:
                    raise ValueError(f'Unordered quantiles {code} {scenario} {period}')
                result['countries'][code][scenario].append(point)
    result['validation'] = {'status': 'validated', 'countries': len(codes), 'values': len(codes)*len(jobs)}
    target = ROOT/'data/climate-projections.json'
    temporary = target.with_suffix('.json.part')
    temporary.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    temporary.replace(target)
    print(f'Validated {len(codes)} countries, {len(SCENARIOS)} scenarios, {len(PERIODS)} periods, {len(codes)*len(jobs)} values.')

if __name__ == '__main__':
    main()
