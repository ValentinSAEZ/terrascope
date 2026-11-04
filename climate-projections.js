import {scenarios,periods,validateProjections} from './projection-contract.js';

const format=v=>(v>=0?'+':'−')+Math.abs(v).toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1})+' °C';
const tick=v=>(v>0?'+':v<0?'−':'')+Math.abs(v).toLocaleString('fr-FR',{maximumFractionDigits:1})+' °C';
const svgNS='http://www.w3.org/2000/svg';
const el=(tag,text,className)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(className)n.className=className;return n;};
const mark=(tag,attrs,text)=>{const n=document.createElementNS(svgNS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(text)n.textContent=text;return n;};
const span=p=>p.replace('-','–');
/* Graduations régulières : pas de 0,5, 1 ou 2 °C selon l'étendue. */
const ticksFor=(lo,hi)=>{const step=hi-lo>6?2:hi-lo>3?1:.5,out=[];for(let v=Math.floor(lo/step)*step;v<=Math.ceil(hi/step)*step+1e-9;v+=step)out.push(Math.round(v*10)/10);return out;};

export async function mountProjections(slot,code) {
  const css=el('link');css.rel='stylesheet';css.href='climate-projections.css?v=charts-3';document.head.append(css);
  const future=slot.closest('#future');
  const response=await fetch('/data/climate-projections.json');
  if(!response.ok)throw Error('Projection data unavailable');
  const data=validateProjections(await response.json()), country=data.countries[code];
  if(!country)throw Error('Country unavailable');

  future.querySelector('.head h2').textContent='Les futurs possibles.';
  future.querySelector('.head .eyebrow').textContent='PROJECTIONS CLIMATIQUES & ENGAGEMENTS';
  const sourceList=document.querySelector('#sources>div');
  if(sourceList){const card=el('a');card.href=data.source_url;card.target='_blank';card.rel='noopener';card.append(el('b','Banque mondiale · CCKP / CMIP6'),el('span','Projections multi-modèles, 3 scénarios et 4 périodes de 20 ans. Médianes et P10–P90, référence 1995–2014.'));sourceList.append(card);}

  // Composant autonome, sorti de la grille des engagements pour ne pas hériter de ses styles.
  const root=el('div',null,'cx');
  const grid=slot.parentElement;
  grid.before(root);
  slot.remove();

  const head=el('header',null,'cx-head');
  head.append(el('p','CMIP6 · Ensemble multi-modèles','cx-kicker'),el('h3','Quel réchauffement selon les émissions ?','cx-title'),
    el('p','Écart de température moyenne annuelle par rapport à 1995–2014, par période de 20 ans.','cx-sub'));
  root.append(head);

  let active='ssp245',index=1;
  const controls=el('div',null,'cx-scenarios');controls.setAttribute('role','group');controls.setAttribute('aria-label','Scénario d’émissions');
  const buttons={};
  for(const [key,s] of Object.entries(scenarios)){
    const b=el('button');b.type='button';b.style.setProperty('--sc',s.color);
    const dot=el('i');const txt=el('span');txt.append(el('b',s.label),el('small',s.description));
    b.append(dot,txt);b.addEventListener('click',()=>{active=key;draw();});buttons[key]=b;controls.append(b);
  }
  root.append(controls);

  const body=el('div',null,'cx-body');
  const chartCol=el('div',null,'cx-chart');
  const graphic=mark('svg',{role:'img','aria-label':'Réchauffement simulé de '+code+' selon trois scénarios : médianes par période et plage P10–P90 du scénario sélectionné.'});
  graphic.classList.add('cx-plot');
  const axis=el('div',null,'cx-periods');axis.setAttribute('role','group');axis.setAttribute('aria-label','Période');
  const periodButtons=periods.map((p,i)=>{const b=el('button',span(p));b.type='button';b.addEventListener('click',()=>{index=i;draw();});axis.append(b);return b;});
  const legend=el('div',null,'cx-legend');
  const lgLine=el('span');lgLine.append(el('i',null,'cx-lg-line'),document.createTextNode('Médiane des modèles'));
  const lgBand=el('span');lgBand.append(el('i',null,'cx-lg-band'),document.createTextNode('Plage P10–P90 (scénario sélectionné)'));
  legend.append(lgLine,lgBand);
  chartCol.append(graphic,axis,legend);

  const side=el('aside',null,'cx-side');side.setAttribute('aria-live','polite');
  const sideLabel=el('p',null,'cx-side-label'),sideValue=el('p',null,'cx-side-value'),sideCaption=el('p','Médiane des modèles','cx-side-caption');
  const range=el('div',null,'cx-range'),rangeBar=el('span',null,'cx-range-bar'),rangeMid=el('span',null,'cx-range-mid');range.append(rangeBar,rangeMid);
  const rangeText=el('p',null,'cx-range-text');
  const rangeScale=el('div',null,'cx-range-scale');
  side.append(sideLabel,sideValue,sideCaption,range,rangeScale,rangeText,el('p','Scénarios sans probabilité attribuée. La plage P10–P90 décrit la dispersion des modèles, pas un intervalle de confiance.','cx-caution'));
  body.append(chartCol,side);
  root.append(body);

  const details=el('details',null,'cx-details');details.append(el('summary','Méthode, sources et valeurs'));
  details.append(el('p','Source : Banque mondiale / CCKP, CMIP6 à 0,25°, données corrigées des biais et régionalisées. Les médianes et percentiles nationaux sont repris sans recalcul de TerraScope. Le nombre de modèles peut varier selon le scénario. Les médianes sont reliées pour guider la lecture : ce n’est pas une série annuelle.'));
  details.append(el('p','La référence 1995–2014 et les limites nationales sont celles du fournisseur. Ces écarts ne se soustraient pas directement aux observations ERA5 référencées à 1991–2020. L’agrégation spatiale de percentiles ne constitue pas nécessairement le percentile des moyennes nationales de chaque modèle.'));
  const links=el('p');
  const source=el('a','Source et téléchargements ↗');source.href=data.source_url;source.target='_blank';source.rel='noopener';
  const method=el('a','Comprendre l’ensemble CMIP6 ↗');method.href='https://climateknowledgeportal.worldbank.org/guidance-note';method.target='_blank';method.rel='noopener';
  links.append(source,method);details.append(links);
  details.append(el('p','Import : '+new Date(data.retrieved_at).toLocaleDateString('fr-FR')+' · 27 pays · 3 scénarios · 4 périodes. Les simulations annuelles de l’ancien modèle CNRM ne sont pas mélangées à cet ensemble.'));
  const table=el('table');table.append(el('caption','Anomalies de température · référence 1995–2014'));
  const hr=el('tr');['Scénario','Période','P10','Médiane','P90'].forEach(t=>{const th=el('th',t);th.scope='col';hr.append(th);});const thead=el('thead');thead.append(hr);table.append(thead);
  const tbody=el('tbody');for(const [key,s] of Object.entries(scenarios))country[key].forEach(p=>{const row=el('tr');[s.label,span(p.period),...['p10','median','p90'].map(q=>format(p[q]))].forEach(t=>row.append(el('td',t)));tbody.append(row);});table.append(tbody);
  const scroller=el('div',null,'cx-table');scroller.append(table);details.append(scroller);root.append(details);

  const all=Object.values(country).flat();
  const ticks=ticksFor(Math.min(0,...all.map(p=>p.p10)),Math.max(1,...all.map(p=>p.p90)));
  const min=ticks[0],max=ticks.at(-1);
  rangeScale.append(el('span',tick(min)),el('span',tick(max)));
  let geo=null;

  function draw(){
    const width=Math.max(280,Math.round(graphic.getBoundingClientRect().width||chartCol.clientWidth));
    const narrow=width<520;
    const height=narrow?240:300,left=narrow?50:58,right=width-(narrow?8:118),top=14,bottom=height-10;
    const col=(right-left)/periods.length;
    const x=i=>left+col*(i+.5),y=v=>bottom-(v-min)/(max-min)*(bottom-top);
    geo={left,right,col,width};
    graphic.setAttribute('viewBox',`0 0 ${width} ${height}`);graphic.setAttribute('width',width);graphic.setAttribute('height',height);
    graphic.replaceChildren();

    // Colonnes des périodes : la période active est surlignée sur toute la hauteur.
    periods.forEach((_,i)=>graphic.append(mark('rect',{x:left+col*i+1,y:top,width:col-2,height:bottom-top,rx:6,class:'cx-col'+(i===index?' is-active':'')})));
    ticks.forEach(v=>{
      graphic.append(mark('line',{x1:left,x2:right,y1:y(v),y2:y(v),class:v===0?'cx-zero':'cx-grid'}));
      graphic.append(mark('text',{x:left-10,y:y(v)+4,'text-anchor':'end',class:'cx-axis'},tick(v)));
    });

    const series=country[active],color=scenarios[active].color;
    const band=series.map((p,i)=>`${x(i)},${y(p.p90)}`).concat([...series].reverse().map((p,i)=>`${x(3-i)},${y(p.p10)}`)).join(' ');
    graphic.append(mark('polygon',{points:band,fill:color,opacity:'.14'}));
    const order=Object.keys(scenarios).sort((a,b)=>(a===active)-(b===active));
    for(const key of order){
      const on=key===active,c=scenarios[key].color;
      graphic.append(mark('polyline',{points:country[key].map((p,i)=>`${x(i)},${y(p.median)}`).join(' '),fill:'none',stroke:c,'stroke-width':on?2.5:1.5,opacity:on?1:.4,'stroke-linejoin':'round','stroke-linecap':'round'}));
      country[key].forEach((p,i)=>graphic.append(mark('circle',{cx:x(i),cy:y(p.median),r:on?(i===index?6:4):3,fill:c,stroke:'#1f2823','stroke-width':2,opacity:on?1:.55})));
    }
    if(!narrow){
      const labels=Object.entries(scenarios).map(([key,s])=>({key,s,y:y(country[key][3].median)})).sort((a,b)=>a.y-b.y);
      for(let i=1;i<labels.length;i++)if(labels[i].y-labels[i-1].y<18)labels[i].y=labels[i-1].y+18;
      labels.forEach(l=>{
        const on=l.key===active,g=mark('g',{class:'cx-end'+(on?' is-active':'')});
        g.append(mark('line',{x1:x(3)+8,x2:right+8,y1:y(country[l.key][3].median),y2:l.y,stroke:l.s.color,opacity:on?.8:.35}));
        g.append(mark('circle',{cx:right+14,cy:l.y,r:3,fill:l.s.color}));
        const t=mark('text',{x:right+22,y:l.y+4});t.append(mark('tspan',{},l.s.label));t.append(mark('tspan',{dx:5,class:'cx-end-value'},format(country[l.key][3].median)));
        g.append(t);graphic.append(g);
      });
    }

    // Axe des périodes : boutons HTML alignés exactement sur les colonnes du graphique.
    axis.style.paddingLeft=left+'px';axis.style.paddingRight=(width-right)+'px';
    legend.style.paddingLeft=left+'px';

    const p=series[index];
    sideLabel.replaceChildren(el('b',scenarios[active].label),document.createTextNode(' · '+span(p.period)));
    sideLabel.style.setProperty('--sc',color);
    sideValue.textContent=format(p.median);
    const pos=v=>((v-min)/(max-min)*100)+'%';
    rangeBar.style.left=pos(p.p10);rangeBar.style.width=`calc(${pos(p.p90)} - ${pos(p.p10)})`;rangeBar.style.background=color;
    rangeMid.style.left=pos(p.median);
    rangeText.textContent='Plage P10–P90 : '+format(p.p10)+' à '+format(p.p90);
    Object.entries(buttons).forEach(([key,b])=>b.setAttribute('aria-pressed',String(key===active)));
    periodButtons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
  }

  const periodAt=e=>{const r=graphic.getBoundingClientRect(),px=(e.clientX-r.left)*(geo.width/r.width);return Math.max(0,Math.min(periods.length-1,Math.floor((px-geo.left)/geo.col)));};
  let frame=0;
  graphic.addEventListener('pointermove',e=>{if(!geo||frame)return;frame=requestAnimationFrame(()=>{frame=0;const next=periodAt(e);if(next!==index){index=next;draw();}});});
  graphic.addEventListener('click',e=>{if(geo){index=periodAt(e);draw();}});
  new ResizeObserver(()=>draw()).observe(chartCol);
  draw();
}
