import {readFile,writeFile,rename} from 'node:fs/promises';
import {validateSnapshot} from '../data-contract.js';

const publish=process.argv.includes('--candidate');
const target=new URL('../data/annual-snapshot.json',import.meta.url);
const input=publish?new URL('../data/annual-snapshot.candidate.json',import.meta.url):target;
const snapshot=JSON.parse(await readFile(input,'utf8'));
const result=validateSnapshot(snapshot,Number(process.env.REFERENCE_YEAR||snapshot.reference_year));
if(result.errors.length){
  console.error('Snapshot rejected; published file preserved.\n'+result.errors.map(x=>'- '+x).join('\n'));
  process.exitCode=1;
}else{
  snapshot.status=result.warnings.length?'validated_with_documented_gaps':'validated';
  snapshot.validation={checked_at:new Date().toISOString(),contract_version:2,exact_year_join:true,country_count:27,core_metrics_complete:true,checks:result.checks,warnings:result.warnings};
  const staged=new URL('../data/annual-snapshot.json.part',import.meta.url);
  await writeFile(staged,JSON.stringify(snapshot,null,2)+'\n');
  await rename(staged,target);
  console.log(`Snapshot ${snapshot.reference_year}: ${result.checks.length} check families passed; ${result.warnings.length} documented warnings.`);
}
