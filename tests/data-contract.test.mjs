import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateSnapshot,isPublished,rankedCountries} from '../data-contract.js';
import {strictNumber,annualElectricity,assertCompleteEU} from '../scripts/data-imports.mjs';
const sample=JSON.parse(await readFile(new URL('../data/annual-snapshot.json',import.meta.url),'utf8'));
test('current snapshot satisfies structural and arithmetic checks',()=>assert.deepEqual(validateSnapshot(sample).errors,[]));
const mutations={
  'wrong country membership':s=>{s.countries.XXX=s.countries.FRA;delete s.countries.FRA;},
  'wrong observation year':s=>s.countries.FRA.metrics.population.year--,
  'wrong unit':s=>s.countries.FRA.metrics.co2_territorial_mt.unit='t',
  'fabricated ratio':s=>s.countries.FRA.metrics.co2_per_capita_t.value=50,
  'fabricated intensity':s=>s.countries.FRA.metrics.co2_intensity_g_per_dollar.value=5,
  'missing derived ratio':s=>delete s.countries.FRA.metrics.co2_per_capita_t.value,
  'non-integer population':s=>s.countries.FRA.metrics.population.value+=0.2,
  'negative emissions':s=>s.countries.FRA.metrics.co2_territorial_mt.value=-1,
  'NaN':s=>s.countries.FRA.metrics.co2_territorial_mt.value=NaN,
  'unknown source':s=>s.countries.FRA.metrics.population.source='unknown',
  'false completeness':s=>s.coverage.population.available=26,
  'duplicate history':s=>s.countries.FRA.series.co2_territorial_mt.push(s.countries.FRA.series.co2_territorial_mt.at(-1)),
  'bad historical value':s=>s.countries.FRA.series.co2_territorial_mt[0].value=null,
  'bad history container':s=>s.countries.FRA.series.co2_territorial_mt={},
  'false 1990 change':s=>s.countries.FRA.derived.emissions_change_since_1990_pct=5,
  'base missing with published change':s=>s.countries.FRA.series.co2_territorial_mt.shift(),
  'negative mix':s=>s.countries.FRA.electricity_mix_pct.fossil=-1,
  'headline mismatch':s=>s.countries.FRA.electricity_mix_pct.renewables=10,
  'unweighted EU':s=>s.countries.FRA.derived.difference_from_eu_per_capita_pct=80,
  'unavailable as zero':s=>{s.countries.FRA.metrics.warming_anomaly_c.status='not_available';s.countries.FRA.metrics.warming_anomaly_c.value=0;},
};
for(const [name,mutate] of Object.entries(mutations))test('rejects '+name,()=>{const s=structuredClone(sample);mutate(s);assert.ok(validateSnapshot(s).errors.length);});
test('publication status is exact, not a prefix',()=>{assert.ok(isPublished({status:'validated_with_documented_gaps'}));assert.ok(!isPublished({status:'validated_but_rejected'}));});
test('rank ties and direction preserve competition ranks',()=>{
 const s={reference_year:2024,countries:{AAA:{name_fr:'A',iso2:'AA',metrics:{co2_territorial_mt:{value:10,status:'available',year:2024}}},BBB:{name_fr:'B',iso2:'BB',metrics:{co2_territorial_mt:{value:10,status:'available',year:2024}}},CCC:{name_fr:'C',iso2:'CC',metrics:{co2_territorial_mt:{value:0,status:'available',year:2024}}}}};
 assert.deepEqual(rankedCountries(s,'co2').map(r=>r.rank),[1,1,3]);assert.equal(rankedCountries(s,'co2','asc')[0].value,0);
 s.countries.CCC.metrics.co2_territorial_mt.year=2023;assert.equal(rankedCountries(s,'co2').length,2);
});
test('empty and null numeric input never becomes zero',()=>{for(const v of [null,undefined,'',' ',false])assert.equal(strictNumber(v),null);assert.equal(strictNumber(0),0);});
function electric(){
 const fuels=['TOTAL','RA000','N9000','FE','RA130','X9900'],time=Object.fromEntries(Array.from({length:12},(_,i)=>['2024-'+String(i+1).padStart(2,'0'),i]));
 // Time deliberately precedes fuel: ensure indexing does not assume dimension order.
 const d={id:['time','siec','geo'],size:[12,6,1],dimension:{time:{category:{index:time}},siec:{category:{index:Object.fromEntries(fuels.map((k,i)=>[k,i]))}},geo:{category:{index:{FR:0}}}},value:{}};
 for(let t=0;t<12;t++)[100,25,60,10,4,1].forEach((v,f)=>d.value[t*6+f]=v);return d;
}
test('electricity reads all 12 months with arbitrary JSON-stat dimension order',()=>{const r=annualElectricity(electric(),2024,'FR');assert.equal(r.renewableShare,25);assert.equal(r.components.pumped_storage,4);});
test('missing renewable month cannot be zero-filled',()=>{const d=electric();delete d.value[7];assert.throws(()=>annualElectricity(d,2024,'FR'));});
test('missing mix component withholds mix, not renewable observation',()=>{const d=electric();delete d.value[4];const r=annualElectricity(d,2024,'FR');assert.equal(r.components,null);assert.equal(r.renewableShare,25);});
test('overlapping categories rejected',()=>{const d=electric();d.value[2]=1000;assert.throws(()=>annualElectricity(d,2024,'FR'));});
test('EU aggregate cannot silently omit a country',()=>assert.throws(()=>assertCompleteEU(['FRA','DEU'],new Map([['FRA',[{year:2024,value:10}]]]),new Map([['FRA',100]]),2024)));
