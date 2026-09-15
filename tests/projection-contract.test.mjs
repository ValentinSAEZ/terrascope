import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateProjections,nearestPeriod} from '../projection-contract.js';
const data=JSON.parse(await readFile('data/climate-projections.json','utf8'));
const codes=Object.keys(JSON.parse(await readFile('data/annual-snapshot.json','utf8')).countries);
test('27 countries have 972 bounded, ordered and sourced projection values',()=>assert.equal(validateProjections(data,codes).validation.values,972));
for(const [name,mutate] of [
 ['wrong baseline',d=>d.baseline='1991-2020'],
 ['wrong units',d=>d.unit='K'],
 ['missing country',d=>delete d.countries.FIN],
 ['missing scenario',d=>delete d.countries.FRA.ssp585],
 ['missing period',d=>d.countries.FIN.ssp126.pop()],
 ['missing value',d=>d.countries.FIN.ssp126[0].median=null],
 ['reversed percentiles',d=>d.countries.FIN.ssp126[0].p10=19],
 ['mislabelled horizon',d=>d.countries.FIN.ssp126[0].period='2050'],
 ['missing provenance',d=>d.evidence=[]],
 ['duplicate provenance',d=>d.evidence[1]=d.evidence[0]],
 ['incorrect count',d=>d.validation.values=1000],
 ['invented scenario',d=>d.countries.FIN.fake=[]],
])test('projection rejects '+name,()=>{const copy=structuredClone(data);mutate(copy);assert.throws(()=>validateProjections(copy,codes));});
test('pointer selects only source periods, with clamped endpoints',()=>{
 assert.equal(nearestPeriod(-300,48,800),0);assert.equal(nearestPeriod(900,48,800),3);
 assert.equal(nearestPeriod(48+(800-48)/3,48,800),1);
 assert.equal(nearestPeriod(48+(800-48)*2/3,48,800),2);
});
