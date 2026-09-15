export function strictNumber(value){return (typeof value==='number'||typeof value==='string'&&value.trim()!=='')&&Number.isFinite(Number(value))?Number(value):null;}
export function eurostatCell(data,coordinates){
  let index=0;
  for(let d=0;d<data.id.length;d++){
    const name=data.id[d],size=data.size[d],keys=data.dimension[name].category.index,key=coordinates[name];
    const position=key===undefined&&size===1?0:keys[key];
    if(position===undefined)return null;
    index=index*size+position;
  }
  return strictNumber(data.value?.[index]);
}
export function annualElectricity(data,year,geo){
  const months=Array.from({length:12},(_,i)=>`${year}-${String(i+1).padStart(2,'0')}`);
  const totals={};
  for(const code of ['TOTAL','RA000','N9000','FE','RA130','X9900']){
    const values=months.map(time=>eurostatCell(data,{time,siec:code,geo}));
    totals[code]=values.every(v=>v!==null&&v>=0)?values.reduce((a,b)=>a+b,0):null;
  }
  if(!(totals.TOTAL>0)||totals.RA000===null)throw Error(`${geo}: complete total and renewable monthly series required.`);
  const renewableShare=totals.RA000/totals.TOTAL*100;
  if(renewableShare>100)throw Error(`${geo}: renewable generation exceeds total.`);
  let components=null;
  if(Object.values(totals).every(v=>v!==null)){
    components={renewables:renewableShare,nuclear:totals.N9000/totals.TOTAL*100,fossil:totals.FE/totals.TOTAL*100,pumped_storage:totals.RA130/totals.TOTAL*100,other:totals.X9900/totals.TOTAL*100};
    const residual=100-Object.values(components).reduce((a,b)=>a+b,0);
    if(residual < -0.15)throw Error(`${geo}: overlapping electricity categories exceed total.`);
    components.adjustment=Math.max(0,residual);
  }
  return {renewableShare,components,provider:'eurostat-electricity',provenance:{calendar_verified:true,months:12,annual_generation_gwh:totals,source_updated_at:data.updated||null}};
}
export function assertCompleteEU(codes,co2ByCode,population,year){
  for(const code of codes){
    const rows=co2ByCode.get(code)?.filter(p=>p.year===year)||[];
    if(rows.length!==1||!Number.isFinite(rows[0].value)||!(population.get(code)>0))throw Error(`${code}: incomplete EU denominator for ${year}.`);
  }
}
