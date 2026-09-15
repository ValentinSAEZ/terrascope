"""Read-only source audit: never replaces the published snapshot.

Downloads same-year public observations and retains their retrieval metadata.
Source failures are reported as unavailable, never as successful checks.
"""
import csv
import io
import json
import concurrent.futures
import datetime
import hashlib
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
snapshot = json.loads((ROOT / 'data/annual-snapshot.json').read_text(encoding='utf-8'))
year = snapshot['reference_year']
stamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
out = ROOT / 'output/data-audit'
out.mkdir(parents=True, exist_ok=True)

def retrieve(name, url):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'TerraScope source audit'}), timeout=45) as response:
            content = response.read()
        (out / (name + ('.csv' if name == 'co2' else '.json'))).write_bytes(content)
        return name, {'status': 'retrieved', 'url': url, 'retrieved_at': stamp, 'sha256': hashlib.sha256(content).hexdigest(), 'data': content.decode('utf-8-sig')}
    except Exception as error:
        return name, {'status': 'unavailable', 'url': url, 'error': str(error)}

query = [('freq','M'),('unit','GWH'),('sinceTimePeriod',f'{year}-01'),('untilTimePeriod',f'{year}-12')]
query += [('siec',code) for code in ['TOTAL','RA000','N9000','FE','RA130','X9900']]
query += [('geo','EL' if c['iso2']=='GR' else c['iso2']) for c in snapshot['countries'].values()]
urls = {
    'electricity': 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_cb_pem?' + urllib.parse.urlencode(query),
    'population': f'https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?date={year}&format=json&per_page=400',
    'gdp': f'https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.PP.KD?date={year}&format=json&per_page=400',
    'co2': snapshot['sources']['co2']['dataset_url'],
}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    sources = dict(pool.map(lambda kv: retrieve(*kv), urls.items()))

def cell(data, coords):
    idx = 0
    for dimension, size in zip(data['id'], data['size']):
        categories = data['dimension'][dimension]['category']['index']
        key = coords.get(dimension)
        if key is None:
            if size != 1: raise ValueError('Unselected dimension ' + dimension)
            position = 0
        else:
            if key not in categories: return None
            position = categories[key]
        idx = idx * size + position
    value = data.get('value',{}).get(str(idx))
    return value if isinstance(value,(int,float)) else None

checks = []
def compare(code, metric, value, tolerance):
    old = snapshot['countries'][code]['metrics'][metric]['value']
    checks.append({'country':code,'metric':metric,'published':old,'source_value':value,
      'difference': None if value is None or old is None else round(value-old,6),
      'status': 'unavailable' if value is None else ('match' if old is not None and abs(value-old)<=tolerance else 'difference')})

for name, metric, scale in [('population','population',1),('gdp','gdp_ppp_billion',1e9)]:
    if sources[name]['status'] != 'retrieved': continue
    records=json.loads(sources[name]['data'])[1]
    values={r['countryiso3code']:r['value'] for r in records if str(r['date'])==str(year)}
    for code in snapshot['countries']:
        raw=values.get(code)
        compare(code,metric,raw/scale if isinstance(raw,(int,float)) else None,0.0051)
if sources['co2']['status']=='retrieved':
    records=list(csv.DictReader(io.StringIO(sources['co2']['data'])))
    for code in snapshot['countries']:
        matches=[r for r in records if r.get('code',r.get('Code'))==code and r.get('year',r.get('Year'))==str(year)]
        raw=matches[0].get('emissions_total') if len(matches)==1 else None
        compare(code,'co2_territorial_mt',float(raw)/1e6 if raw else None,0.0051)
if sources['electricity']['status']=='retrieved':
    data=json.loads(sources['electricity']['data'])
    sources['electricity']['updated']=data.get('updated')
    for code,country in snapshot['countries'].items():
        geo='EL' if country['iso2']=='GR' else country['iso2']
        totals={}
        for fuel in ['TOTAL','RA000','N9000','FE','RA130','X9900']:
            vals=[cell(data,{'geo':geo,'siec':fuel,'time':f'{year}-{month:02}'}) for month in range(1,13)]
            totals[fuel]=sum(vals) if all(v is not None for v in vals) else None
        value=totals['RA000']/totals['TOTAL']*100 if totals['TOTAL'] and totals['RA000'] is not None else None
        compare(code,'renewable_electricity_share_pct',value,0.0051)
        sources['electricity'].setdefault('annual_totals_gwh',{})[code]=totals

fire_urls={code:'https://cprof.effis.emergency.copernicus.eu/api/v3/banf?'+urllib.parse.urlencode({'level':'ADM0','value':code,'year':year,'yearFrom':year,'yearTo':year,'env':'PROD'}) for code in snapshot['countries']}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    fire_results=dict(pool.map(lambda kv: retrieve('fire-'+kv[0],kv[1]),fire_urls.items()))
for code in snapshot['countries']:
    record=fire_results['fire-'+code]
    sources['fire-'+code]=record
    value=None
    if record['status']=='retrieved':
        rows=[r for r in json.loads(record['data']).get('banfyear',[]) if str(r.get('year'))==str(year)]
        if len(rows)==1 and isinstance(rows[0].get('lc_tot'),(int,float)): value=rows[0]['lc_tot']
    compare(code,'burnt_area_ha',value,0.0051)

for metric,filename,key in [('warming_anomaly_c','era5-annual-eu.json','anomaly_vs_1991_2020_c'),('hot_days_ge_30_c','era5-land-hot-days-eu.json','mean_hot_days')]:
    data=json.loads((ROOT/'data'/filename).read_text(encoding='utf-8'))
    for code in snapshot['countries']:
        row=data.get('countries',{}).get(code,{})
        compare(code,metric,row.get(key) if data.get('year')==year and row.get('status')=='available' else None,0.011)
    sources[metric]={'status':'local_aggregate_only','path':filename,'limitation':'Matches derived local files; raw NetCDF, spatial coverage and baseline not independently reprocessed in this audit.'}

for source in sources.values(): source.pop('data',None)
report={'checked_at':stamp,'reference_year':year,'sources':sources,'checks':checks,
 'summary':{status:sum(c['status']==status for c in checks) for status in ['match','difference','unavailable']},
 'limitations':['An agreement with a provider is not a guarantee of physical exactness.','Climate aggregates require raw-file and geographic validation.','Projections are not externally rechecked by this script.']}
(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'summary':report['summary'],'sources':{k:v['status'] for k,v in sources.items()},'differences':[c for c in checks if c['status']!='match']},ensure_ascii=False,indent=2))
