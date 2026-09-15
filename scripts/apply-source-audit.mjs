// Enrich a candidate only from the retained, dated audit. Validation publishes it.
import {readFile,writeFile} from 'node:fs/promises';
import {annualElectricity} from './data-imports.mjs';
const read=async name=>JSON.parse(await readFile(new URL(name,import.meta.url),'utf8'));
const snapshot=await read('../data/annual-snapshot.json'),audit=await read('../output/data-audit/report.json'),electricity=await read('../output/data-audit/electricity.json');
if(audit.reference_year!==snapshot.reference_year||audit.checks.length!==189||audit.checks.some(c=>c.status!=='match'||snapshot.countries[c.country]?.metrics[c.metric]?.value!==c.published))throw Error('Incomplete, stale or differing audit requires review.');
for(const [code,c] of Object.entries(snapshot.countries)){
  const power=annualElectricity(electricity,snapshot.reference_year,code==='GRC'?'EL':c.iso2);
  c.electricity_mix_pct=power.components?Object.fromEntries(Object.entries(power.components).map(([k,v])=>[k,Number(v.toFixed(2))])):null;
  c.metrics.renewable_electricity_share_pct.provenance={...power.provenance,retrieved_at:audit.checked_at};
}
snapshot.source_audit={checked_at:audit.checked_at,reference_year:audit.reference_year,
  external_checks:audit.checks.filter(c=>!['warming_anomaly_c','hot_days_ge_30_c'].includes(c.metric)).length,
  external_matches:audit.checks.filter(c=>!['warming_anomaly_c','hot_days_ge_30_c'].includes(c.metric)&&c.status==='match').length,
  local_climate_checks:audit.checks.filter(c=>['warming_anomaly_c','hot_days_ge_30_c'].includes(c.metric)).length,
  limitations_fr:['Les valeurs des fournisseurs peuvent être révisées.','Les agrégats climatiques concordent avec les fichiers locaux, mais les NetCDF et les limites géographiques n’ont pas été retraités dans cet audit.','Les projections CMIP6 ne font pas partie de cette contre-vérification.'],
  sources:Object.fromEntries(Object.entries(audit.sources).filter(([,s])=>s.status==='retrieved').map(([k,s])=>[k,{url:s.url,retrieved_at:s.retrieved_at,sha256:s.sha256}]))};
snapshot.sources.electricity.definition='Net electricity generation from 12 complete Eurostat monthly observations. Pumped-storage output and other reported fuels are separate from renewables; any unallocated residual remains explicitly visible.';
snapshot.status='candidate';
await writeFile(new URL('../data/annual-snapshot.candidate.json',import.meta.url),JSON.stringify(snapshot,null,2)+'\n');
console.log('Audited candidate prepared; publication still requires validation.');
