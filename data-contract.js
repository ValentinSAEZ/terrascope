// Shared, side-effect-free checks used before publishing and before ranking.
export const EU27 = ['AUT','BEL','BGR','HRV','CYP','CZE','DNK','EST','FIN','FRA','DEU','GRC','HUN','IRL','ITA','LVA','LTU','LUX','MLT','NLD','POL','PRT','ROU','SVK','SVN','ESP','SWE'];
export const METRICS = {
  co2_territorial_mt: ['MtCO₂/year',0,50000], population:['people',1,2e9],
  co2_per_capita_t:['tCO₂/person',0,100], gdp_ppp_billion:['billion constant 2021 international $',0.00001,1e6],
  co2_intensity_g_per_dollar:['gCO₂/constant 2021 international $',0,5000],
  renewable_electricity_share_pct:['% of electricity generation',0,100],
  warming_anomaly_c:['°C relative to 1991–2020',-10,10], hot_days_ge_30_c:['days/year',0,366], burnt_area_ha:['ha/year',0,1e9],
};
const core=Object.keys(METRICS).slice(0,6);
const finite=Number.isFinite;
export const isPublished=s=>['validated','validated_with_documented_gaps'].includes(s?.status);
export function validateSnapshot(s,expectedYear=s?.reference_year){
  const errors=[],warnings=[];
  const check=(ok,message)=>{if(!ok)errors.push(message);};
  check(s?.schema_version===1,'Unsupported snapshot schema.');
  check(s?.scope==='EU-27','Expected EU-27 scope.');
  check(Number.isInteger(expectedYear)&&expectedYear>=1990&&expectedYear<new Date().getUTCFullYear(),'Reference year must be a completed year.');
  check(s?.reference_year===expectedYear,'Incorrect common year.');
  const countries=s?.countries||{},codes=Object.keys(countries);
  check(codes.length===27&&EU27.every(code=>codes.includes(code)),'Exact EU-27 membership required.');
  const sourceIds=new Set(Object.values(s?.sources||{}).map(x=>x?.id));
  for(const [key,source] of Object.entries(s?.sources||{}))check(source?.id&&/^https:\/\//.test(source.url)&&source.definition,`${key}: incomplete source metadata.`);
  const iso2=new Set(),names=new Set(),providers=new Set();
  let euCo2=0,euPopulation=0;
  for(const [code,country] of Object.entries(countries)){
    check(/^[A-Z]{2}$/.test(country.iso2)&&!iso2.has(country.iso2),`${code}: invalid or duplicated ISO2.`);iso2.add(country.iso2);
    check(typeof country.name_fr==='string'&&country.name_fr.length>0&&!names.has(country.name_fr),`${code}: missing or duplicated name.`);names.add(country.name_fr);
    const m=country.metrics||{};
    for(const [key,[unit,min,max]] of Object.entries(METRICS)){
      const metric=m[key];
      if(!metric){errors.push(`${code}/${key}: missing metric record.`);continue;}
      check(metric.year===expectedYear,`${code}/${key}: wrong year.`);
      check(metric.unit===unit,`${code}/${key}: wrong unit.`);
      check(sourceIds.has(metric.source)||metric.source==='terrascope-derived',`${code}/${key}: unknown source.`);
      check(['available','not_available'].includes(metric.status),`${code}/${key}: invalid status.`);
      if(metric.status==='available'){
        const upper=key==='hot_days_ge_30_c'?(new Date(Date.UTC(expectedYear,1,29)).getUTCMonth()===1?366:365):max;
        check(finite(metric.value)&&metric.value>=min&&metric.value<=upper,`${code}/${key}: invalid value or bound.`);
      }else check(metric.value===null&&typeof metric.reason==='string'&&metric.reason.length>0,`${code}/${key}: unavailable value must be null with reason.`);
      if(core.includes(key))check(metric.status==='available',`${code}/${key}: core observation unavailable.`);
    }
    const value=key=>m[key]?.status==='available'?m[key].value:null;
    const co2=value('co2_territorial_mt'),pop=value('population'),gdp=value('gdp_ppp_billion');
    if(finite(pop))check(Number.isInteger(pop),`${code}: population must be integer.`);
    // Allow only the propagation of stored rounding (0.005 Mt, 0.005 billion).
    if(finite(co2)&&finite(pop)&&pop>0){
      check(Math.abs(value('co2_per_capita_t')-co2*1e6/pop)<=0.0051+0.005*1e6/pop,`${code}: CO₂ per capita does not match numerator / population.`);
      euCo2+=co2;euPopulation+=pop;
    }
    if(finite(co2)&&finite(gdp)&&gdp>0)check(Math.abs(value('co2_intensity_g_per_dollar')-co2*1000/gdp)<=0.0051+5/gdp+co2*5/(gdp*gdp),`${code}: carbon intensity does not match CO₂ / GDP.`);
    const series=Array.isArray(country.series?.co2_territorial_mt)?country.series.co2_territorial_mt:[];
    check(series.length>0,`${code}: missing CO₂ series.`);
    let previous=1989;
    for(const p of Array.isArray(series)?series:[]){check(Number.isInteger(p.year)&&p.year>previous&&p.year<=expectedYear&&finite(p.value)&&p.value>=0,`${code}: duplicate, unsorted or invalid history point.`);previous=p.year;}
    const last=series?.find(p=>p.year===expectedYear),base=series?.find(p=>p.year===1990),change=country.derived?.emissions_change_since_1990_pct;
    check(last&&finite(co2)&&Math.abs(last.value-co2)<=0.0051,`${code}: current emissions disagree with history.`);
    if(base?.value>0&&finite(co2))check(finite(change)&&Math.abs(change-(co2/base.value-1)*100)<=0.051+0.5/base.value+co2*0.5/(base.value**2),`${code}: 1990 change does not match history.`);
    else{check(change===null,`${code}: change without 1990 base must be null.`);warnings.push(`${code}: 1990 base unavailable.`);}
    if(Array.isArray(series)&&series.length!==expectedYear-1989)warnings.push(`${code}: historical calendar has gaps.`);
    const mix=country.electricity_mix_pct;
    if(mix){
      check(['renewables','nuclear','fossil','adjustment'].every(k=>finite(mix[k])&&mix[k]>=0&&mix[k]<=100),`${code}: invalid electricity component.`);
      check(Object.entries(mix).every(([k,v])=>['renewables','nuclear','fossil','adjustment','pumped_storage','other'].includes(k)&&finite(v)&&v>=0&&v<=100),`${code}: unknown or invalid mix component.`);
      check(Math.abs(Object.values(mix).reduce((a,b)=>a+b,0)-100)<=0.15,`${code}: mix does not total 100%.`);
      check(Math.abs(mix.renewables-value('renewable_electricity_share_pct'))<=0.011,`${code}: renewable headline differs from mix.`);
      if(mix.adjustment>0.15)warnings.push(`${code}: ${mix.adjustment}% electricity is an unallocated residual, not an identified source.`);
    }else warnings.push(`${code}: complete electricity mix unavailable.`);
    providers.add(m.renewable_electricity_share_pct?.source);
    for(const key of ['warming_anomaly_c','hot_days_ge_30_c']){
      if(m[key]?.status==='available'&&(!m[key].provenance?.calendar_verified||!m[key].provenance?.geography_verified))warnings.push(`${code}/${key}: raw calendar / geography not independently evidenced in snapshot.`);
    }
    const world=country.derived?.world_emissions_share_pct;
    check(finite(world)&&world>=0&&world<=100,`${code}: invalid world share.`);
  }
  check(providers.size===1,'Electricity providers differ between countries.');
  const euPerCapita=euPopulation>0?euCo2*1e6/euPopulation:null;
  for(const [code,c] of Object.entries(countries)){
    const pc=c.metrics?.co2_per_capita_t?.value,eu=c.derived?.difference_from_eu_per_capita_pct;
    if(finite(pc)&&finite(euPerCapita))check(finite(eu)&&Math.abs(eu-(pc/euPerCapita-1)*100)<0.08,`${code}: EU comparison is not population-weighted.`);
  }
  for(const key of Object.keys(METRICS)){
    const count=Object.values(countries).filter(c=>c.metrics?.[key]?.status==='available').length,coverage=s?.coverage?.[key];
    check(coverage?.available===count&&coverage?.total===27&&Math.abs(coverage?.percentage-count/27*100)<0.051,`${key}: coverage does not match observations.`);
    if(count<27)warnings.push(`${key}: ${count}/27 available.`);
  }
  return {errors,warnings,checks:['exact-eu27','year-unit-source','finite-bounds-null','derived-ratios','history-order-baseline','mix-components','coverage','weighted-eu-comparison'],eu_per_capita:euPerCapita};
}

export function rankedCountries(snapshot,metric,direction='desc'){
  const keys={co2:'co2_territorial_mt',capita:'co2_per_capita_t',renewables:'renewable_electricity_share_pct'};
  const rows=Object.entries(snapshot.countries).map(([code,c])=>{
    const m=c.metrics?.[keys[metric]];
    const value=metric==='change'?c.derived?.emissions_change_since_1990_pct:m?.status==='available'&&m.year===snapshot.reference_year?m.value:null;
    return {code,name:c.name_fr,iso2:c.iso2,value};
  }).filter(row=>finite(row.value));
  rows.sort((a,b)=>(direction==='asc'?a.value-b.value:b.value-a.value)||a.name.localeCompare(b.name,'fr'));
  return rows.map((r,i)=>({...r,rank:i&&r.value===rows[i-1].value?rows.slice(0,i).findIndex(x=>x.value===r.value)+1:i+1}));
}
