export const scenarios = {
  ssp126: {label:'SSP1-2.6', description:'Faibles émissions', color:'#a8d5bd'},
  ssp245: {label:'SSP2-4.5', description:'Émissions intermédiaires', color:'#efbe79'},
  ssp585: {label:'SSP5-8.5', description:'Très fortes émissions', color:'#eb968a'},
};
export const periods = ['2020-2039','2040-2059','2060-2079','2080-2099'];
export function validateProjections(data, codes) {
  if(data?.schema_version!==1 || data.baseline!=='1995-2014' || data.unit!=='degC' || data.product!=='climatology_anomaly' || data.collection!=='cmip6-x0.25' || data.validation?.status!=='validated') throw Error('Projection metadata invalid');
  if(JSON.stringify(data.periods)!==JSON.stringify(periods) || JSON.stringify(data.scenarios)!==JSON.stringify(Object.keys(scenarios))) throw Error('Projection dimensions invalid');
  if(!data.countries || !Array.isArray(data.evidence) || data.evidence.length!==36 || !data.evidence.every(e=>/^https:\/\/cckpapi\.worldbank\.org\//.test(e.url)&&/^[a-f0-9]{64}$/.test(e.sha256))) throw Error('Projection provenance missing');
  if(new Set(data.evidence.map(e=>e.url)).size!==36 || !Number.isFinite(Date.parse(data.retrieved_at)))throw Error('Projection provenance invalid');
  if(Object.keys(data.countries).length!==27 || data.validation.countries!==27 || data.validation.values!==972)throw Error('Projection coverage counts invalid');
  if(codes && Object.keys(data.countries).sort().join()!==[...codes].sort().join()) throw Error('Country coverage invalid');
  for(const country of Object.values(data.countries)) {
    if(Object.keys(country).sort().join()!==Object.keys(scenarios).sort().join())throw Error('Unexpected scenario');
    for(const scenario of Object.keys(scenarios)) {
    const series=country[scenario];
    if(!Array.isArray(series)||series.length!==periods.length) throw Error('Incomplete projection');
    series.forEach((p,i)=>{
      if(p.period!==periods[i] || ![p.p10,p.median,p.p90].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>-10&&v<20)||p.p10>p.median||p.median>p.p90) throw Error('Invalid projection quantiles');
    });
  }
  }
  return data;
}
export function nearestPeriod(x,left,right) { return Math.max(0,Math.min(3,Math.round((x-left)/(right-left)*3))); }
