import {isPublished,validateSnapshot,rankedCountries} from './data-contract.js';

const configs={
  co2:{title:'Émissions territoriales',unit:'MtCO₂ / an',key:'co2_territorial_mt',sources:['co2'],order:'desc',definition:'CO₂ fossile et industriel émis sur le territoire au cours de l’année.',reading:'Les pays les plus peuplés ou industriels peuvent émettre davantage au total. Cette mesure exclut le changement d’usage des terres et les autres gaz à effet de serre.',formula:'Observation Global Carbon Budget en tonnes, convertie en millions de tonnes.'},
  capita:{title:'CO₂ par habitant',unit:'tCO₂ / habitant',key:'co2_per_capita_t',sources:['co2','population'],order:'desc',definition:'Émissions territoriales divisées par la population de la même année.',reading:'Cet indicateur ramène les émissions à la taille de la population. Il ne mesure pas l’empreinte de consommation des habitants.',formula:'CO₂ territorial (Mt) × 1 000 000 ÷ population. Les deux séries portent sur la même année.'},
  change:{title:'Évolution depuis 1990',unit:'% par rapport à 1990',sources:['co2'],order:'asc',definition:'Variation du CO₂ territorial entre 1990 et l’année commune.',reading:'Une valeur négative indique une baisse. Le tri initial place les plus fortes baisses en tête. Les barres partent de zéro au centre ; elles partagent la même échelle.',formula:'(Émissions de l’année commune ÷ émissions de 1990 − 1) × 100. Sans base 1990 valide, le pays reste non classé.'},
  renewables:{title:'Électricité renouvelable',unit:'% de la production électrique',key:'renewable_electricity_share_pct',sources:['electricity'],order:'desc',definition:'Part de l’électricité produite à partir de sources renouvelables.',reading:'Le nucléaire n’est pas une énergie renouvelable. Cette mesure ne concerne ni toute l’énergie consommée, ni la part bas-carbone du mix.',formula:'Production renouvelable ÷ production totale × 100. Le périmètre exact du fournisseur est indiqué ci-dessous.'},
};
const $=selector=>document.querySelector(selector),params=new URLSearchParams(location.search);
let metric=configs[params.get('metric')]?params.get('metric'):'co2',snapshot=null,current=params.get('country');
const format=n=>n.toLocaleString('fr-FR',{maximumFractionDigits:2});
$('#reading-panel').open=!matchMedia('(max-width:680px)').matches;
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function element(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function formatted(value){return (metric==='change'&&value>0?'+':'')+format(value)+(metric==='renewables'||metric==='change'?' %':'');}
function configure(){
  const c=configs[metric];document.title=c.title+' — TerraScope';
  $('#metric-title').textContent=c.title;$('#ranking-unit').textContent=c.unit;$('#value-heading').textContent=c.unit;
  $('#definition').textContent=c.definition;$('#interpretation').textContent=c.reading;$('#sort-order').value=c.order;
  document.querySelectorAll('[data-metric]').forEach(a=>{a.setAttribute('aria-current',String(a.dataset.metric===metric));a.href='?'+new URLSearchParams({metric:a.dataset.metric,...(current?{country:current}:{})});});
}
function render(){
  if(!snapshot)return;
  const c=configs[metric],rows=rankedCountries(snapshot,metric,$('#sort-order').value),query=normalize($('#country-filter').value),visible=rows.filter(r=>normalize(r.name).includes(query));
  const max=Math.max(1,...rows.map(r=>Math.abs(r.value))),fragment=document.createDocumentFragment();
  for(const r of visible){
    const li=element('li','ranking-item'+(r.name===current?' is-current':''));li.id='rank-'+r.code;
    const link=element('a','ranking-entry');link.href='country-live.html?country='+encodeURIComponent(r.name);
    const position=element('span','ranking-position',String(r.rank));const block=element('span','ranking-country-block'),name=element('span','ranking-country-name'),flag=element('img');flag.src='https://flagcdn.com/'+r.iso2.toLowerCase()+'.svg';flag.alt='';flag.loading='lazy';
    name.append(flag,element('span','',r.name));const track=element('span','ranking-track'+(metric==='change'?' signed':'')),bar=element('i',r.value>0&&metric==='change'?'positive':'');track.setAttribute('aria-hidden','true');
    const width=Math.abs(r.value)/max*(metric==='change'?50:100);bar.style.width=width+'%';bar.style.left=(metric==='change'?(r.value<0?50-width:50):0)+'%';track.append(bar);block.append(name,track);
    const amount=element('strong','ranking-amount',formatted(r.value));link.append(position,block,amount);li.append(link);fragment.append(li);
  }
  if(!visible.length)fragment.append(element('li','ranking-empty',query?'Aucun pays ne correspond à cette recherche.':'Aucune observation comparable disponible.'));
  $('#ranking').replaceChildren(fragment);$('#ranking').setAttribute('aria-busy','false');
  $('#ranking-status').textContent=visible.length+' pays affichés · '+rows.length+'/27 classés'+(rows.length<27?' · '+(27-rows.length)+' non classés : donnée ou base manquante':'')+' · '+($('#sort-order').value==='asc'?'valeurs croissantes':'valeurs décroissantes');
  const focus=rows.find(r=>r.name===current);$('#country-focus').hidden=!focus;
  if(focus){$('#focus-name').textContent=focus.name;$('#focus-value').replaceChildren(document.createTextNode(formatted(focus.value)),element('small','',c.unit));$('#focus-rank').textContent='Rang '+focus.rank+' sur '+rows.length+' · selon le tri choisi';$('#back-country').textContent='← '+focus.name;$('#back-country').href='country-live.html?country='+encodeURIComponent(focus.name);}
  const sourceDetail=element('div');sourceDetail.append(element('p','',c.formula));
  for(const key of c.sources){const source=snapshot.sources[key];const p=element('p',''),a=element('a','',source.label+' ↗');if(/^https:\/\//.test(source.url)){a.href=source.url;a.target='_blank';a.rel='noopener';}p.append(a);sourceDetail.append(p);}
  sourceDetail.append(element('p','', 'Registre du '+new Date(snapshot.generated_at).toLocaleDateString('fr-FR')+'. Contrôles de cohérence ; les observations peuvent être révisées par les sources.'));
  $('#source-detail').replaceChildren(sourceDetail);
}
document.querySelectorAll('[data-metric]').forEach(a=>a.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();metric=a.dataset.metric;history.pushState(null,'',a.href);configure();render();}));
window.addEventListener('popstate',()=>{const p=new URLSearchParams(location.search);metric=configs[p.get('metric')]?p.get('metric'):'co2';current=p.get('country');configure();render();});
$('#country-filter').addEventListener('input',render);$('#sort-order').addEventListener('change',render);
$('#find-current').addEventListener('click',()=>{$('#country-filter').value='';render();document.querySelector('.ranking-item.is-current')?.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
configure();
fetch('/data/annual-snapshot.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('unavailable');return r.json();}).then(data=>{
  if(!isPublished(data)||validateSnapshot(data).errors.length)throw Error('incompatible data');snapshot=data;$('#ranking-year').textContent=data.reference_year;render();
}).catch(()=>{$('#ranking-status').textContent='Le classement ne peut pas être vérifié pour le moment.';$('#ranking').replaceChildren(element('li','ranking-empty','Aucune valeur de remplacement. Consultez la santé des données ou réessayez plus tard.'));$('#ranking').setAttribute('aria-busy','false');});
