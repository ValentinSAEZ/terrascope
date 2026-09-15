import {scenarios,periods,validateProjections,nearestPeriod} from './projection-contract.js';
const format=v=>(v>=0?'+':'')+v.toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1})+' °C';
const svgNS='http://www.w3.org/2000/svg';
const el=(tag,text,className)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(className)n.className=className;return n;};
const mark=(tag,attrs,text)=>{const n=document.createElementNS(svgNS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(text)n.textContent=text;return n;};

export async function mountProjections(root,code) {
  const css=el('link');css.rel='stylesheet';css.href='climate-projections.css?v=cmip6-ensemble-1';document.head.append(css);
  root.classList.add('clim-explorer');
  root.parentElement.prepend(root);
  const future=root.closest('#future');
  future.querySelector('.head h2').textContent='Les futurs possibles.';
  future.querySelector('.head .eyebrow').textContent='PROJECTIONS CLIMATIQUES & ENGAGEMENTS';
  const response=await fetch('/data/climate-projections.json');
  if(!response.ok)throw Error('Projection data unavailable');
  const data=validateProjections(await response.json()), country=data.countries[code];
  if(!country)throw Error('Country unavailable');
  const sourceList=document.querySelector('#sources>div');
  if(sourceList){const card=el('a');card.href=data.source_url;card.target='_blank';card.rel='noopener';card.append(el('b','Banque mondiale · CCKP / CMIP6'),el('span','Projections multi-modèles, 3 scénarios et 4 périodes de 20 ans. Médianes et P10–P90, référence 1995–2014.'));sourceList.append(card);}
  root.replaceChildren();
  root.append(el('p','CMIP6 · ENSEMBLE MULTI-MODÈLES','clim-kicker'),el('h3','Quel réchauffement selon les émissions ?'));
  root.append(el('p','Écart de température moyenne par rapport à 1995–2014. Chaque point représente une période de 20 ans.','clim-intro'));
  const controls=el('div',null,'clim-scenarios');controls.setAttribute('role','group');controls.setAttribute('aria-label','Scénario mis en évidence');
  const buttons={}; let active='ssp245',index=1;
  for(const [key,s] of Object.entries(scenarios)) {
    const b=el('button');b.type='button';b.style.setProperty('--scenario',s.color);
    b.append(el('b',s.label),el('small',s.description));b.addEventListener('click',()=>{active=key;draw();});buttons[key]=b;controls.append(b);
  }
  root.append(controls);
  const display=el('div',null,'clim-readout');
  const periodText=el('span'),value=el('strong'),spread=el('span');display.append(periodText,value,spread);root.append(display);
  const graphic=mark('svg',{'role':'img','aria-label':'Réchauffement simulé selon trois scénarios. Médianes par période et plage P10–P90 du scénario sélectionné.'});graphic.classList.add('clim-plot');root.append(graphic);
  const horizons=el('div',null,'clim-periods');horizons.setAttribute('role','group');horizons.setAttribute('aria-label','Période climatique');
  const periodButtons=periods.map((p,i)=>{const b=el('button',p.replace('-','–'));b.type='button';b.addEventListener('click',()=>{index=i;draw();});horizons.append(b);return b;});root.append(horizons);
  root.append(el('p','Traits : médianes reliées pour guider la lecture, pas une série annuelle. Zone colorée : plage P10–P90 du produit multi-modèles sélectionné.','clim-legend'));
  root.append(el('p','Ces scénarios n’ont pas de probabilité attribuée. La plage P10–P90 n’est pas un intervalle de confiance sur la température future.','clim-caution'));
  const details=el('details');details.append(el('summary','Méthode, sources et valeurs'));
  details.append(el('p','Source : Banque mondiale / CCKP, CMIP6 à 0,25°, données corrigées des biais et régionalisées. Les médianes et percentiles nationaux sont repris sans recalcul de TerraScope. Le nombre de modèles peut varier selon le scénario.'));
  details.append(el('p','La référence 1995–2014 et les limites nationales sont celles du fournisseur. Ces écarts ne se soustraient pas directement aux observations ERA5 référencées à 1991–2020. L’agrégation spatiale de percentiles ne constitue pas nécessairement le percentile des moyennes nationales de chaque modèle.'));
  const source=el('a','Source et téléchargements ↗');source.href=data.source_url;source.target='_blank';source.rel='noopener';details.append(source);
  const method=el('a','Comprendre l’ensemble CMIP6 ↗');method.href='https://climateknowledgeportal.worldbank.org/guidance-note';method.target='_blank';method.rel='noopener';details.append(method);
  details.append(el('p','Import : '+new Date(data.retrieved_at).toLocaleDateString('fr-FR')+' · 27 pays · 3 scénarios · 4 périodes. Les simulations annuelles de l’ancien modèle CNRM ne sont pas mélangées à cet ensemble.'));
  const table=el('table');table.append(el('caption','Anomalies de température · référence 1995–2014'));
  const head=el('tr');['Scénario','Période','P10','Médiane','P90'].forEach(t=>{const th=el('th',t);th.scope='col';head.append(th);});const thead=el('thead');thead.append(head);table.append(thead);
  const body=el('tbody');for(const [key,s] of Object.entries(scenarios))country[key].forEach(p=>{const row=el('tr');[s.label,p.period,...['p10','median','p90'].map(q=>format(p[q]))].forEach(t=>row.append(el('td',t)));body.append(row);});table.append(body);const scroller=el('div',null,'clim-table');scroller.append(table);details.append(scroller);root.append(details);
  // Pixel-to-viewBox mapping stays correct under SVG letterboxing and mobile resizing.
  let width=800;
  function draw() {
    width=Math.max(340,Math.min(1000,root.clientWidth-40));
    const height=320,left=48,right=width-18,top=24,bottom=268;
    const all=Object.values(country).flat();
    const min=Math.floor(Math.min(0,...all.map(p=>p.p10))),max=Math.ceil(Math.max(1,...all.map(p=>p.p90)));
    const x=i=>left+i*(right-left)/3,y=v=>bottom-(v-min)/(max-min)*(bottom-top);
    graphic.setAttribute('viewBox',`0 0 ${width} ${height}`);graphic.replaceChildren();
    for(let i=0;i<=4;i++) { const v=min+(max-min)*i/4,py=y(v);graphic.append(mark('line',{x1:left,x2:right,y1:py,y2:py,class:'clim-grid'}),mark('text',{x:left-8,y:py+4,'text-anchor':'end',class:'clim-axis'},v.toLocaleString('fr-FR',{maximumFractionDigits:1})+'°')); }
    const series=country[active];
    const band=series.map((p,i)=>`${x(i)},${y(p.p90)}`).concat([...series].reverse().map((p,i)=>`${x(3-i)},${y(p.p10)}`)).join(' ');
    graphic.append(mark('polygon',{points:band,fill:scenarios[active].color,opacity:'.13'}));
    for(const [key,s] of Object.entries(scenarios)) {
      graphic.append(mark('polyline',{points:country[key].map((p,i)=>`${x(i)},${y(p.median)}`).join(' '),fill:'none',stroke:s.color,'stroke-width':key===active?3:1.8,opacity:key===active?1:.6,'stroke-linejoin':'round'}));
      country[key].forEach((p,i)=>graphic.append(mark('circle',{cx:x(i),cy:y(p.median),r:key===active?4:2.5,fill:s.color})));
    }
    graphic.append(mark('line',{x1:x(index),x2:x(index),y1:top,y2:bottom,stroke:'#e3e8df','stroke-dasharray':'3 5',opacity:'.5'}));
    graphic.append(mark('circle',{cx:x(index),cy:y(series[index].median),r:7,fill:scenarios[active].color,stroke:'#202d25','stroke-width':3}));
    periods.forEach((p,i)=>{graphic.append(mark('text',{x:x(i),y:292,'text-anchor':i===0?'start':i===3?'end':'middle',class:'clim-axis'},p.slice(0,4)),mark('text',{x:x(i),y:308,'text-anchor':i===0?'start':i===3?'end':'middle',class:'clim-axis'},'–'+p.slice(5)));});
    const p=series[index];periodText.textContent=scenarios[active].label+' · '+p.period.replace('-','–');value.textContent=format(p.median);value.style.color=scenarios[active].color;spread.textContent='Médiane · P10–P90 : '+format(p.p10)+' à '+format(p.p90);
    Object.entries(buttons).forEach(([key,b])=>b.setAttribute('aria-pressed',String(key===active)));
    periodButtons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
  }
  let scheduled=false,lastEvent;
  graphic.addEventListener('pointermove',e=>{lastEvent=e;if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;const matrix=graphic.getScreenCTM();if(!matrix)return;const p=new DOMPoint(lastEvent.clientX,lastEvent.clientY).matrixTransform(matrix.inverse());const next=nearestPeriod(p.x,48,width-18);if(next!==index){index=next;draw();}});});
  graphic.addEventListener('click',e=>{const m=graphic.getScreenCTM();if(m){index=nearestPeriod(new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse()).x,48,width-18);draw();}});
  new ResizeObserver(()=>draw()).observe(root);
  draw();
}
