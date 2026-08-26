/* Registre des sources : les clefs privées ne sont jamais exposées côté navigateur. */
window.TERRASCOPE_SOURCES = {
  owid: {
    name: 'Our World in Data / Global Carbon Budget',
    co2France: 'https://ourworldindata.org/grapher/annual-co2-emissions-per-country.csv?csvType=full&useColumnShortNames=true',
    electricityMix: 'https://ourworldindata.org/grapher/share-elec-by-source.csv?csvType=full&useColumnShortNames=true',
    gdp: 'https://ourworldindata.org/grapher/gdp-worldbank.csv?csvType=full&useColumnShortNames=true',
    gdpPerCapita: 'https://ourworldindata.org/grapher/gdp-per-capita-worldbank.csv?csvType=full&useColumnShortNames=true',
    gdpPerCapitaCurrentUsd: 'https://api.worldbank.org/v2/country/{iso2}/indicator/NY.GDP.PCAP.CD?format=json&per_page=2'
  },
  eurostat: { name: 'Eurostat', endpoint: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/' },
  oecd: { name: 'OCDE', endpoint: 'https://sdmx.oecd.org/public/rest/v1/data/' },
  data360: { name: 'World Bank Data360', endpoint: 'https://data360api.worldbank.org/data360/data' },
  unicef: { name: 'UNICEF', endpoint: 'https://sdmx.data.unicef.org/ws/public/sdmxapi/rest/' },
  undp: { name: 'PNUD', endpoint: 'https://hdr.undp.org/data-center/' },
  who: { name: 'OMS', endpoint: 'https://ghoapi.azureedge.net/api/' },
  ember: { name: 'Ember', endpoint: '/api/ember', requiresKey: true },
  gdelt: {
    name: 'GDELT 2.0 DOC API',
    endpoint: location.hostname === '127.0.0.1' ? 'http://127.0.0.1:8788/api/gdelt' : '/api/gdelt',
    documentation: 'https://www.gdeltproject.org/',
    note: 'Agrégation d’articles de presse : chaque lien conserve sa source éditoriale originale.'
  },
  cbam: { name: 'Commission européenne — CBAM', priceEur: 75.28, period: 'T2 2026', published: '6 juillet 2026', frequency: 'trimestrielle en 2026', url: 'https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/price-cbam-certificates_en' }
};

if (window.location.pathname.endsWith('country-live.html')) {
  const firstMetricLabel = document.querySelector('.live-grid .label');
  if (firstMetricLabel) firstMetricLabel.textContent = 'CO₂ FOSSILE & INDUSTRIE';
  const style = document.createElement('style');
  style.textContent = `.deep-dive{margin-top:88px;border-top:1px solid var(--line);padding-top:65px}.deep-dive h2{font:600 45px/1 var(--serif);letter-spacing:-2px;margin:0 0 25px}.deep-dive h2 em{color:var(--forest)}.scenario-grid,.policy-grid{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-top:28px}.scenario-grid article,.policy-grid article{padding:28px;border-right:1px solid var(--line);min-height:200px}.scenario-grid article:first-child,.policy-grid article:first-child{padding-left:0}.scenario-grid article:last-child,.policy-grid article:last-child{border:0}.scenario-grid strong{display:block;font:600 35px var(--serif);margin:25px 0 7px}.scenario-grid p,.policy-grid p{font-size:13px;line-height:1.55;color:#666860}.policy-grid h3{font:600 23px var(--serif);margin:20px 0 8px}.tag{font:9px var(--mono);letter-spacing:1px;color:var(--forest)}.method{margin-top:20px;background:#eeeadf;padding:17px 20px;font:12px/1.55 var(--sans);color:#62645d}.method b{color:var(--forest)}@media(max-width:650px){.scenario-grid,.policy-grid{grid-template-columns:1fr}.scenario-grid article,.scenario-grid article:first-child,.policy-grid article,.policy-grid article:first-child{padding:24px 0;border-right:0;border-bottom:1px solid var(--line)}.scenario-grid article:last-child,.policy-grid article:last-child{border:0}.deep-dive h2{font-size:37px}}`;
  document.head.append(style);
  const page = document.querySelector('.page');
  const country = new URLSearchParams(window.location.search).get('country') || 'ce pays';
  const detail = document.createElement('section');
  detail.className = 'deep-dive';
  detail.innerHTML = `<p class="eyebrow">TRAJECTOIRE & POLITIQUE CLIMATIQUE</p><h2>Où va <em>${country}</em> ?</h2><div class="scenario-grid"><article><span class="tag">POINT DE DÉPART</span><strong>Observé</strong><p>La courbe ci-dessus est la série CO₂ historique effectivement mesurée, mise à jour par OWID.</p></article><article><span class="tag">HORIZON 2030</span><strong>−55 %</strong><p>Objectif UE de réduction nette des émissions par rapport à 1990. Il s’agit d’un cadre commun, pas d’une prévision nationale.</p></article><article><span class="tag">HORIZON 2050</span><strong>Net zéro</strong><p>Objectif juridiquement contraignant de neutralité climatique de l’Union européenne.</p></article></div><p class="method"><b>Lecture correcte :</b> les données observées sont live ; les horizons 2030 et 2050 sont des objectifs politiques. Une projection chiffrée par pays sera ajoutée lorsque les hypothèses de modèle, le plan national énergie-climat et la méthodologie seront réunis.</p><div style="height:72px"></div><p class="eyebrow">ENGAGEMENTS & INSTRUMENTS</p><h2>Le cadre <em>politique.</em></h2><div class="policy-grid"><article><span class="tag">ACCORD INTERNATIONAL</span><h3>Accord de Paris</h3><p>${country} participe au cadre de contribution déterminée au niveau national (NDC) de l’Union européenne, enregistré auprès de la CCNUCC.</p></article><article><span class="tag">DROIT EUROPÉEN</span><h3>Loi européenne sur le climat</h3><p>La loi fixe l’objectif de neutralité climatique en 2050 et une réduction nette d’au moins 55 % en 2030 par rapport à 1990.</p></article><article><span class="tag">MISE EN ŒUVRE</span><h3>ETS & plan national</h3><p>Le marché carbone européen couvre une partie des émissions. Le plan national énergie-climat précisera ensuite les politiques propres à ${country}.</p></article></div>`;
  page.append(detail);
  const chartStyle = document.createElement('style');
  chartStyle.textContent = `.live-chart{margin-top:78px;padding:30px;background:#f8f7f2;border:1px solid #d6d3c9}.live-chart-head{display:flex;justify-content:space-between;gap:20px;align-items:end}.live-chart h2{font:600 28px var(--serif);margin:8px 0 0}.live-chart small{font:10px var(--mono);color:#7d7e76}.live-chart svg{display:block;width:100%;height:310px;margin-top:25px;background:repeating-linear-gradient(to bottom,transparent 0 76px,#dedbd1 77px 78px)}.live-chart polygon{fill:rgba(45,104,76,.12)}.live-chart polyline{fill:none;stroke:#20251f;stroke-width:3}.live-chart .axis{font:10px var(--mono);fill:#777971}`;
  document.head.append(chartStyle);
  const liveChart = document.createElement('section');
  liveChart.className = 'live-chart';
  liveChart.innerHTML = `<div class="live-chart-head"><div><p class="eyebrow">ÉMISSIONS OBSERVÉES</p><h2>Une tendance, année par année.</h2></div><small>MtCO₂ · FOSSILES & INDUSTRIE</small></div><svg viewBox="0 0 520 120" preserveAspectRatio="none" role="img" aria-label="Évolution historique des émissions de CO2"><polygon id="big-area" points=""></polygon><polyline id="big-line" points=""></polyline><text class="axis" x="0" y="118">1990</text><text class="axis" x="475" y="118">aujourd’hui</text></svg></section>`;
  page.insertBefore(liveChart, detail);
  const sourceLine = document.querySelector('#line');
  const copyChart = () => {
    document.querySelector('#big-line').setAttribute('points', sourceLine.getAttribute('points') || '');
    document.querySelector('#big-area').setAttribute('points', sourceLine.getAttribute('points') ? `0,120 ${sourceLine.getAttribute('points')} 520,120` : '');
  };
  new MutationObserver(copyChart).observe(sourceLine, { attributes: true, attributeFilter: ['points'] });
  copyChart();
  const energyStyle = document.createElement('style');
  energyStyle.textContent = `.scenario-grid article:first-child{display:none}.scenario-grid{grid-template-columns:1fr 1fr}.energy-mix{margin-top:48px;padding:28px;background:#f8f7f2;border:1px solid #d6d3c9}.energy-wrap{display:flex;align-items:center;gap:35px;margin-top:20px}.donut{width:175px;height:175px;border-radius:50%;position:relative;flex:none}.donut:after{content:'';position:absolute;inset:39px;border-radius:50%;background:#f8f7f2}.energy-list{display:grid;grid-template-columns:repeat(2,minmax(120px,1fr));gap:10px;width:100%;font:10px var(--mono);color:#565951}.energy-list span{display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid #dfdcd3;padding-bottom:5px}.energy-list i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px}@media(max-width:600px){.energy-wrap{flex-direction:column;align-items:flex-start}.scenario-grid{grid-template-columns:1fr}}`;
  document.head.append(energyStyle);
  const energy = document.createElement('section'); energy.className='energy-mix';
  energy.innerHTML=`<p class="eyebrow">MIX ÉLECTRIQUE · LIVE</p><h2 style="font:600 28px var(--serif);margin:5px 0">D’où vient l’électricité ?</h2><div class="energy-wrap"><div class="donut" id="donut"></div><div class="energy-list" id="energy-list"><span>Chargement du mix électrique…</span></div></div><p class="source" id="energy-source">SOURCE · OWID / EMBER</p>`;
  page.insertBefore(energy, detail);
  const localized = {Allemagne:'Germany',Autriche:'Austria',Belgique:'Belgium',Espagne:'Spain',Grèce:'Greece','Pays-Bas':'Netherlands',Suède:'Sweden',Tchéquie:'Czechia'};
  const mixCountry = localized[country] || country;
  fetch(window.TERRASCOPE_SOURCES.owid.electricityMix).then(r=>r.text()).then(text=>{
    const rows=text.trim().split(/\r?\n/), header=rows.shift().split(','), ei=header.indexOf('entity'), yi=header.indexOf('year');
    const entries=rows.map(x=>x.split(',')).filter(x=>x[ei]===mixCountry).sort((a,b)=>+b[yi]-+a[yi]); const latest=entries[0]; if(!latest) throw Error();
    const groups=[['Nucléaire','nuclear_share_elec','#355c92'],['Éolien','wind_share_elec','#397d74'],['Solaire','solar_share_elec','#d59b3e'],['Hydro','hydro_share_elec','#66a0ba'],['Gaz','gas_share_elec','#b85a32'],['Charbon','coal_share_elec','#4b4b47'],['Autres','other_renewables_share_elec','#8ca360']].map(([name,key,color])=>({name,value:+latest[header.indexOf(key)]||0,color})).filter(x=>x.value>.4);
    let total=groups.reduce((s,x)=>s+x.value,0), cursor=0; const stops=groups.map(x=>{const start=cursor;cursor+=x.value/total*100;return `${x.color} ${start}% ${cursor}%`}).join(',');
    document.querySelector('#donut').style.background=`conic-gradient(${stops})`;
    document.querySelector('#energy-list').innerHTML=groups.map(x=>`<span><b><i style="background:${x.color}"></i>${x.name}</b><b>${x.value.toLocaleString('fr-FR',{maximumFractionDigits:1})} %</b></span>`).join('');
    document.querySelector('#energy-source').textContent=`SOURCE · OWID / EMBER · ${latest[yi]}`;
  }).catch(()=>{document.querySelector('#energy-list').textContent='Mix électrique temporairement indisponible.'});
  const forecastStyle = document.createElement('style');
  forecastStyle.textContent = `.forecast{margin-top:48px;padding:30px;background:#e9e4d9}.forecast h2{font:600 29px var(--serif);margin:8px 0}.forecast svg{display:block;width:100%;height:330px;margin-top:24px;background:repeating-linear-gradient(to bottom,transparent 0 81px,rgba(100,100,90,.18) 82px 83px)}.forecast .obs{fill:none;stroke:#20251f;stroke-width:3}.forecast .trend{fill:none;stroke:#b25431;stroke-width:3;stroke-dasharray:8 5}.forecast .target{fill:none;stroke:#2d684c;stroke-width:3}.forecast .axis{font:9px var(--mono);fill:#777971}.forecast .legend{display:flex;gap:16px;font:10px var(--mono);color:#5c6058}.forecast .legend i{display:inline-block;width:14px;border-top:2px solid;margin:0 4px 3px 0}.forecast .legend .a{border-color:#20251f}.forecast .legend .b{border-color:#b25431;border-top-style:dashed}.forecast .legend .c{border-color:#2d684c}`;
  document.head.append(forecastStyle);
  const forecast = document.createElement('section'); forecast.className='forecast';
  forecast.innerHTML=`<p class="eyebrow">SCÉNARIOS CALCULÉS</p><h2>De l’historique vers 2050.</h2><div class="legend"><span><i class="a"></i>Observé</span><span><i class="b"></i>Rythme récent prolongé</span><span><i class="c"></i>Trajectoire objectif UE</span></div><svg viewBox="0 0 600 150" preserveAspectRatio="none"><path id="f-obs" class="obs"></path><path id="f-trend" class="trend"></path><path id="f-target" class="target"></path><text class="axis" x="0" y="147">1990</text><text class="axis" x="310" y="147">aujourd’hui</text><text class="axis" x="400" y="147">2030</text><text class="axis" x="560" y="147">2050</text></svg><p class="method" id="forecast-method">Calcul en cours à partir de la série OWID.</p>`;
  page.insertBefore(forecast, detail);
  fetch(window.TERRASCOPE_SOURCES.owid.co2France).then(r=>r.text()).then(text=>{
    const rows=text.trim().split(/\r?\n/), header=rows.shift().split(','), ci=header.indexOf('code'), yi=header.indexOf('year'), vi=header.findIndex(x=>/emissions_total/i.test(x));
    const facts=rows.map(x=>x.split(',')).filter(x=>x[ci]===code&&Number(x[vi])).map(x=>({year:+x[yi],value:+x[vi]/1e6})).filter(x=>x.year>=1990).sort((a,b)=>a.year-b.year);
    const first=facts[0], last=facts.at(-1), prior=facts.find(x=>x.year===last.year-5)||facts[Math.max(0,facts.length-6)];
    const rate=Math.pow(last.value/prior.value,1/(last.year-prior.year))-1, max=Math.max(...facts.map(x=>x.value))*1.08;
    const px=x=>((x.year-1990)/(2050-1990)*560+12).toFixed(1), py=x=>(138-(x.value/max*120)).toFixed(1), path=list=>list.map((x,i)=>`${i?'L':'M'} ${px(x)} ${py(x)}`).join(' ');
    const observed=facts.map(x=>({year:x.year,value:x.value})), trend=[last,{year:2030,value:last.value*Math.pow(1+rate,2030-last.year)},{year:2050,value:last.value*Math.pow(1+rate,2050-last.year)}], target=[last,{year:2030,value:first.value*.45},{year:2050,value:0}];
    document.querySelector('#f-obs').setAttribute('d',path(observed));document.querySelector('#f-trend').setAttribute('d',path(trend));document.querySelector('#f-target').setAttribute('d',path(target));
    document.querySelector('#forecast-method').innerHTML=`<b>Méthode :</b> noir = série OWID observée ; orange = prolongation du taux annuel moyen ${prior.year}–${last.year} ; vert = chemin illustratif vers l’objectif UE −55 % vs 1990 en 2030 et neutralité en 2050. Ce sont des scénarios calculés, pas des prévisions officielles.`;
  }).catch(()=>document.querySelector('#forecast-method').textContent='Scénario temporairement indisponible.');
}

if (window.location.pathname.endsWith('country-live.html')) {
  const country = new URLSearchParams(window.location.search).get('country') || 'Allemagne';
  const names = {Allemagne:'Germany',Autriche:'Austria',Belgique:'Belgium',Espagne:'Spain',Grèce:'Greece','Pays-Bas':'Netherlands',Suède:'Sweden',Tchéquie:'Czechia'};
  fetch(window.TERRASCOPE_SOURCES.owid.electricityMix).then(r=>r.text()).then(text=>{
    const rows=text.trim().split(/\r?\n/), header=rows.shift().split(','), entity=header.findIndex(x=>x.toLowerCase()==='entity'), year=header.findIndex(x=>x.toLowerCase()==='year');
    const row=rows.map(x=>x.split(',')).filter(x=>x[entity]===(names[country]||country)).sort((a,b)=>+b[year]-+a[year])[0]; if(!row) return;
    const source=[['Nucléaire','nuclear','#355c92'],['Éolien','wind','#397d74'],['Solaire','solar','#d59b3e'],['Hydro','hydro','#66a0ba'],['Gaz','gas','#b85a32'],['Charbon','coal','#4b4b47'],['Autres','renewable','#8ca360']];
    const data=source.map(([name,term,color])=>({name,color,value:+row[header.findIndex(x=>x.toLowerCase().includes(term))]||0})).filter(x=>x.value>.4); if(!data.length) return;
    let at=0,total=data.reduce((s,x)=>s+x.value,0); const stops=data.map(x=>{const a=at;at+=x.value/total*100;return `${x.color} ${a}% ${at}%`}).join(',');
    const donut=document.querySelector('#donut'); donut.style.background=`conic-gradient(${stops})`;
    document.querySelector('#energy-list').innerHTML=data.map(x=>`<span><b><i style="background:${x.color}"></i>${x.name}</b><b>${x.value.toLocaleString('fr-FR',{maximumFractionDigits:1})} %</b></span>`).join('');
  });
}

if (window.location.pathname.endsWith('country-live.html')) {
  const scenarioSkin = document.createElement('style');
  scenarioSkin.textContent = `.forecast{position:relative!important;overflow:hidden!important;background:#1f2823!important;color:#f6f2e8!important;border:0!important;border-radius:2px!important;padding:38px!important;box-shadow:0 20px 45px rgba(27,38,30,.16)!important}.forecast:before{content:''!important;position:absolute!important;width:430px!important;height:430px!important;border:1px solid rgba(187,214,184,.12)!important;border-radius:50%!important;right:-150px!important;top:-265px!important}.forecast .eyebrow{color:#a5c6a9!important}.forecast h2{font-size:38px!important;letter-spacing:-1.5px!important}.forecast .legend{position:relative!important;display:flex!important;flex-wrap:wrap!important;gap:9px!important;margin-top:22px!important}.forecast .legend span{padding:7px 9px!important;background:rgba(255,255,255,.07)!important;border:1px solid rgba(255,255,255,.12)!important;color:#e4e5dc!important}.forecast .obs{stroke:#f1eee4!important;stroke-width:3.5!important}.forecast .trend{stroke:#e58b67!important;stroke-width:3.5!important}.forecast .target{stroke:#8ec894!important;stroke-width:3.5!important}.forecast svg{position:relative!important;background:repeating-linear-gradient(to bottom,transparent 0 81px,rgba(255,255,255,.1) 82px 83px)!important;border-bottom:1px solid rgba(255,255,255,.25)!important}.forecast .axis{fill:#b9c0b6!important}.forecast .method{position:relative!important;background:rgba(255,255,255,.07)!important;border-left:2px solid #8ec894!important;color:#d4d8d0!important;margin-top:25px!important}.forecast .method b{color:#b7dbbb!important}`;
  document.head.append(scenarioSkin);
}

if (window.location.pathname.endsWith('country-live.html')) {
  const forecast = document.querySelector('.forecast');
  if (forecast) {
    const oldSvg = forecast.querySelector('svg');
    const professional = document.createElement('div');
    professional.className = 'professional-chart';
    professional.innerHTML = `<div class="pro-head"><span>MTCO₂ · ÉCHELLE HISTORIQUE</span><span class="divider-key">DONNÉES OBSERVÉES <b>│</b> SCÉNARIOS</span></div><svg viewBox="0 0 1000 440" preserveAspectRatio="xMidYMid meet"><g class="pro-grid"><line x1="86" y1="65" x2="955" y2="65"/><line x1="86" y1="165" x2="955" y2="165"/><line x1="86" y1="265" x2="955" y2="265"/><line x1="86" y1="365" x2="955" y2="365"/></g><line class="pro-divider" x1="695" y1="42" x2="695" y2="385"/><path id="pro-observed" class="pro-observed"></path><path id="pro-trend" class="pro-trend"></path><path id="pro-target" class="pro-target"></path><g class="pro-labels"><text x="86" y="415">1990</text><text x="648" y="415">2024</text><text x="755" y="415">2030</text><text x="925" y="415">2050</text><text x="708" y="58">PROJECTION</text></g></svg><div class="pro-callouts"><span><i class="dot-white"></i>Historique OWID</span><span><i class="dot-orange"></i>Rythme récent</span><span><i class="dot-green"></i>Trajectoire climat</span></div>`;
    oldSvg.style.display = 'none';
    forecast.querySelector('.legend').style.display = 'none';
    oldSvg.after(professional);
    const proStyle = document.createElement('style');
    proStyle.textContent = `.professional-chart{margin-top:24px;padding:21px 22px 15px;background:#18201c;border:1px solid rgba(255,255,255,.12)}.pro-head{display:flex;justify-content:space-between;font:10px var(--mono);color:#abb7ac;letter-spacing:.8px}.divider-key b{color:#8ec894;margin:0 7px}.professional-chart svg{width:100%!important;height:350px!important;margin:9px 0 0!important;background:none!important;border:0!important}.pro-grid line{stroke:rgba(220,228,219,.18);stroke-width:1}.pro-divider{stroke:#8ec894;stroke-width:1.5;stroke-dasharray:5 5}.pro-observed{fill:none;stroke:#f4f0e6;stroke-width:5;stroke-linejoin:round;stroke-linecap:round}.pro-trend{fill:none;stroke:#e99670;stroke-width:5;stroke-dasharray:11 8}.pro-target{fill:none;stroke:#8ec894;stroke-width:5;stroke-linejoin:round}.pro-labels text{fill:#c4cec3;font:14px var(--mono)}.pro-labels text:last-child{fill:#8ec894;font-size:11px;letter-spacing:1px}.pro-callouts{display:flex;gap:18px;padding:12px 0 2px;border-top:1px solid rgba(255,255,255,.13);font:11px var(--mono);color:#dfe4dc}.pro-callouts i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}.dot-white{background:#f4f0e6}.dot-orange{background:#e99670}.dot-green{background:#8ec894}@media(max-width:600px){.professional-chart{padding:15px 10px}.professional-chart svg{height:230px!important}.pro-head{font-size:8px}.pro-callouts{gap:8px;font-size:9px}}`;
    document.head.append(proStyle);
    const convert = value => {
      const pairs = [...value.matchAll(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)];
      return pairs.map((pair, index) => `${index ? 'L' : 'M'} ${(86 + Number(pair[1]) / 600 * 869).toFixed(1)} ${(42 + Number(pair[2]) / 150 * 343).toFixed(1)}`).join(' ');
    };
    const mirror = () => ['obs','trend','target'].forEach(name => {
      const source = document.querySelector(`#f-${name}`).getAttribute('d') || '';
      document.querySelector(`#pro-${name === 'obs' ? 'observed' : name}`).setAttribute('d', convert(source));
    });
    new MutationObserver(mirror).observe(document.querySelector('#f-obs'), { attributes: true, attributeFilter: ['d'] });
    new MutationObserver(mirror).observe(document.querySelector('#f-trend'), { attributes: true, attributeFilter: ['d'] });
    new MutationObserver(mirror).observe(document.querySelector('#f-target'), { attributes: true, attributeFilter: ['d'] });
    mirror();
  }
}

// The legacy SVG/legend remains in the DOM as the data source for the
// professional chart. Keep it visually out of the layout, even if an older
// stylesheet contains an !important display declaration.
if (window.location.pathname.endsWith('country-live.html')) {
  const chartCleanup = document.createElement('style');
  chartCleanup.textContent = `.forecast > .legend,.forecast > svg{display:none!important}.forecast .professional-chart{display:block!important;visibility:visible!important;opacity:1!important}.forecast .professional-chart svg{display:block!important;visibility:visible!important;opacity:1!important}`;
  document.head.append(chartCleanup);
}

// Provenance register: each visible number is either retrieved from a named
// dataset or explicitly identified as a legal target / calculated scenario.
if (window.location.pathname.endsWith('country-live.html')) {
  const provenanceStyle = document.createElement('style');
  provenanceStyle.textContent = `.provenance{margin-top:76px;padding-top:34px;border-top:1px solid var(--line)}.provenance h2{font:600 34px var(--serif);margin:7px 0 10px}.provenance-intro{max-width:720px;font-size:14px;line-height:1.55;color:#62645d}.provenance-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-top:26px}.provenance-item{padding:20px 22px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}.provenance-item:nth-child(even){border-right:0}.provenance-item:nth-last-child(-n+2){border-bottom:0}.provenance-item strong{display:block;font:600 20px var(--serif);margin:8px 0}.provenance-item p{font-size:12px;line-height:1.5;color:#62645d;margin:0}.provenance-item a{font:10px var(--mono);letter-spacing:.4px;color:var(--forest);text-decoration:none}.provenance-status{display:inline-block;margin-top:12px;font:9px var(--mono);letter-spacing:.7px;color:var(--forest)}@media(max-width:650px){.provenance-grid{grid-template-columns:1fr}.provenance-item,.provenance-item:nth-child(even),.provenance-item:nth-last-child(-n+2){border-right:0;border-bottom:1px solid var(--line);padding:20px 0}.provenance-item:last-child{border-bottom:0}}`;
  document.head.append(provenanceStyle);
  const register = document.createElement('section');
  register.className = 'provenance';
  register.innerHTML = `<p class="eyebrow">REGISTRE DE PROVENANCE</p><h2>Ce que mesure la fiche.</h2><p class="provenance-intro">Chaque résultat affiché est rattaché à sa source, à son millésime et à sa nature. Les scénarios ne sont jamais présentés comme des observations ni comme des prévisions officielles.</p><div class="provenance-grid"><article class="provenance-item"><span class="tag">OBSERVATION · API PUBLIQUE</span><strong>Émissions territoriales de CO₂</strong><p>Combustibles fossiles et industrie, hors changement d’usage des terres, aviation et maritime internationaux.</p><a href="https://ourworldindata.org/grapher/annual-co2-emissions-per-country" target="_blank" rel="noopener">OWID · Global Carbon Budget</a><span class="provenance-status" id="co2-proof">VÉRIFICATION EN COURS…</span></article><article class="provenance-item"><span class="tag">OBSERVATION · API PUBLIQUE</span><strong>Mix électrique</strong><p>Part de la production d’électricité par source. Le millésime affiché est celui de la dernière observation disponible.</p><a href="https://ourworldindata.org/grapher/share-elec-by-source" target="_blank" rel="noopener">OWID · données Ember</a><span class="provenance-status" id="mix-proof">VÉRIFICATION EN COURS…</span></article><article class="provenance-item"><span class="tag">CALCUL TERRASCOPE</span><strong>Scénarios vers 2050</strong><p>Une extrapolation du rythme récent et un chemin illustratif : ce ne sont ni une projection nationale publiée, ni une donnée de base.</p><a href="https://ourworldindata.org/grapher/annual-co2-emissions-per-country" target="_blank" rel="noopener">Entrée · série OWID ci-dessus</a><span class="provenance-status" id="scenario-proof">MÉTHODE AFFICHÉE SOUS LE GRAPHIQUE</span></article><article class="provenance-item"><span class="tag">CADRE JURIDIQUE · SOURCE PRIMAIRE</span><strong>Objectifs européens</strong><p>La réduction nette d’au moins 55 % en 2030 et la neutralité 2050 sont des objectifs de l’Union, non des objectifs nationaux individualisés.</p><a href="https://climate.ec.europa.eu/eu-action/european-climate-law_en" target="_blank" rel="noopener">Commission européenne · Loi climat</a><span class="provenance-status">TEXTE NORMATIF · PAS UNE SÉRIE STATISTIQUE</span></article></div>`;
  document.querySelector('.page').append(register);
  const updateProof = () => {
    const year = document.querySelector('#year')?.textContent || '';
    const mix = document.querySelector('#energy-source')?.textContent || '';
    const co2Proof = document.querySelector('#co2-proof');
    const mixProof = document.querySelector('#mix-proof');
    if (/\d{4}/.test(year) && co2Proof) co2Proof.textContent = `CHARGÉ · ${year.replace('DERNIÈRE ANNÉE · ','')}`;
    if (/\d{4}/.test(mix) && mixProof) mixProof.textContent = `CHARGÉ · ${mix.match(/\d{4}/)?.[0] || ''}`;
  };
  // Watch only the two source labels. Watching document.body also watched the
  // register itself, which caused a self-triggering mutation loop.
  const co2Year = document.querySelector('#year');
  const energySource = document.querySelector('#energy-source');
  if (co2Year) new MutationObserver(updateProof).observe(co2Year, { childList: true, characterData: true, subtree: true });
  if (energySource) new MutationObserver(updateProof).observe(energySource, { childList: true, characterData: true, subtree: true });
  updateProof();
}

if (window.location.pathname.endsWith('country-live.html')) {
  const tickerParts = document.querySelectorAll('.ticker span');
  if (tickerParts[1]) tickerParts[1].textContent = 'ÉMISSIONS CO₂ · SÉRIES ANNUELLES SOURCÉES';
  const pageEyebrow = document.querySelector('.page > .eyebrow');
  if (pageEyebrow) pageEyebrow.textContent = 'PAYS DE L’UNION EUROPÉENNE · SOURCES PUBLIQUES';
}

if (window.location.pathname.endsWith('country-live.html')) {
  const country = new URLSearchParams(window.location.search).get('country') || 'Allemagne';
  const iso3 = {Allemagne:'DEU',Autriche:'AUT',Belgique:'BEL',Bulgarie:'BGR',Chypre:'CYP',Croatie:'HRV',Danemark:'DNK',Espagne:'ESP',Estonie:'EST',Finlande:'FIN',France:'FRA',Grèce:'GRC',Hongrie:'HUN',Irlande:'IRL',Italie:'ITA',Lettonie:'LVA',Lituanie:'LTU',Luxembourg:'LUX',Malte:'MLT','Pays-Bas':'NLD',Pologne:'POL',Portugal:'PRT',Roumanie:'ROU',Slovaquie:'SVK',Slovénie:'SVN',Suède:'SWE',Tchéquie:'CZE'};
  const iso2 = {Allemagne:'de',Autriche:'at',Belgique:'be',Bulgarie:'bg',Chypre:'cy',Croatie:'hr',Danemark:'dk',Espagne:'es',Estonie:'ee',Finlande:'fi',France:'fr',Grèce:'gr',Hongrie:'hu',Irlande:'ie',Italie:'it',Lettonie:'lv',Lituanie:'lt',Luxembourg:'lu',Malte:'mt','Pays-Bas':'nl',Pologne:'pl',Portugal:'pt',Roumanie:'ro',Slovaquie:'sk',Slovénie:'si',Suède:'se',Tchéquie:'cz'};
  const economyStyle = document.createElement('style');
  economyStyle.textContent = `.economy-context{margin-top:48px;padding:29px;background:#f8f7f2;border:1px solid #d6d3c9}.economy-context h2{font:600 28px var(--serif);margin:5px 0 0}.economy-grid{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-top:22px}.economy-grid article{min-height:145px;padding:20px 22px;border-right:1px solid var(--line)}.economy-grid article:first-child{padding-left:0}.economy-grid article:last-child{border:0}.economy-grid strong{display:block;font:600 31px var(--serif);margin:18px 0 4px}.economy-grid span{font:10px var(--mono);color:#777971}.economy-grid small{display:block;margin-top:13px;font:9px var(--mono);color:var(--forest)}.economy-context .source{margin:18px 0 0}@media(max-width:650px){.economy-grid{grid-template-columns:1fr}.economy-grid article,.economy-grid article:first-child{min-height:auto;padding:20px 0;border-right:0;border-bottom:1px solid var(--line)}.economy-grid article:last-child{border:0}}`;
  document.head.append(economyStyle);
  const economy = document.createElement('section'); economy.className = 'economy-context';
  economy.innerHTML = `<p class="eyebrow">CONTEXTE ÉCONOMIQUE · SÉRIE ANNUELLE</p><h2>Quelle économie à décarboner ?</h2><div class="economy-grid"><article><p class="label">PIB RÉEL · PPA</p><strong id="gdp-total">—</strong><span>Md $ internationaux 2021</span><small id="gdp-year">CHARGEMENT…</small></article><article><p class="label">PIB PAR HABITANT · PPA</p><strong id="gdp-per-capita">—</strong><span>$ internationaux 2021 / hab.</span><small id="gdp-per-capita-year">CHARGEMENT…</small><small id="gdp-nominal-note">REPÈRE NOMINAL · CHARGEMENT…</small></article><article><p class="label">ÉVOLUTION ANNUELLE DU PIB</p><strong id="gdp-growth">—</strong><span>VARIATION DU PIB RÉEL</span><small id="gdp-growth-year">CALCUL EN COURS…</small></article></div><p class="source" id="gdp-source">SOURCE · OWID / WORLD DEVELOPMENT INDICATORS · CHARGEMENT…</p>`;
  const anchor = document.querySelector('.energy-mix') || document.querySelector('.deep-dive');
  if (anchor) anchor.after(economy);
  const provenanceGrid = document.querySelector('.provenance-grid');
  if (provenanceGrid) provenanceGrid.insertAdjacentHTML('beforeend', `<article class="provenance-item"><span class="tag">OBSERVATION · SÉRIE ANNUELLE</span><strong>PIB réel et PIB par habitant</strong><p>Mesures en parité de pouvoir d’achat, prix internationaux constants de 2021, afin de comparer les économies dans le temps et entre pays.</p><a href="https://ourworldindata.org/grapher/gdp-worldbank" target="_blank" rel="noopener">OWID · Eurostat / OCDE / FMI / Banque mondiale</a><span class="provenance-status" id="gdp-proof">VÉRIFICATION EN COURS…</span></article>`);
  const parse = line => { const values=[]; let quote=false, value=''; for(let i=0;i<line.length;i+=1){const char=line[i];if(char==='"'&&line[i+1]==='"'){value+='"';i+=1;}else if(char==='"')quote=!quote;else if(char===','&&!quote){values.push(value);value='';}else value+=char;} values.push(value);return values; };
  const latest = async url => { const response=await fetch(url); if(!response.ok) throw new Error(); const lines=(await response.text()).trim().split(/\r?\n/); const header=parse(lines.shift()); const codeIndex=header.findIndex(value=>value.toLowerCase()==='code'); const yearIndex=header.findIndex(value=>value.toLowerCase()==='year'); const valueIndex=header.findIndex((value,index)=>index!==codeIndex&&index!==yearIndex&&value.toLowerCase()!=='entity'); const points=lines.map(parse).filter(row=>row[codeIndex]===iso3[country]&&Number(row[valueIndex])).map(row=>({year:+row[yearIndex],value:+row[valueIndex]})).sort((a,b)=>a.year-b.year); if(!points.length) throw new Error(); return { last:points.at(-1), previous:points.at(-2) }; };
  Promise.all([latest(window.TERRASCOPE_SOURCES.owid.gdp),latest(window.TERRASCOPE_SOURCES.owid.gdpPerCapita)]).then(([gdp, perCapita])=>{
    document.querySelector('#gdp-total').textContent=(gdp.last.value/1e9).toLocaleString('fr-FR',{maximumFractionDigits:0});
    document.querySelector('#gdp-year').textContent=`DERNIÈRE ANNÉE · ${gdp.last.year}`;
    document.querySelector('#gdp-per-capita').textContent=perCapita.last.value.toLocaleString('fr-FR',{maximumFractionDigits:0});
    document.querySelector('#gdp-per-capita-year').textContent=`DERNIÈRE ANNÉE · ${perCapita.last.year}`;
    const growth=(gdp.last.value/gdp.previous.value-1)*100;
    document.querySelector('#gdp-growth').textContent=`${growth<0?'−':'+'}${Math.abs(growth).toLocaleString('fr-FR',{maximumFractionDigits:1})} %`;
    document.querySelector('#gdp-growth-year').textContent=`DE ${gdp.previous.year} À ${gdp.last.year}`;
    document.querySelector('#gdp-source').textContent=`SOURCE · OWID · EUROSTAT / OCDE / FMI / BANQUE MONDIALE · ${Math.max(gdp.last.year,perCapita.last.year)}`;
    const gdpProof = document.querySelector('#gdp-proof'); if (gdpProof) gdpProof.textContent = `CHARGÉ · ${Math.max(gdp.last.year,perCapita.last.year)}`;
  }).catch(()=>{ document.querySelector('#gdp-source').textContent='SOURCE PIB TEMPORAIREMENT INDISPONIBLE'; document.querySelectorAll('#gdp-year,#gdp-per-capita-year,#gdp-growth-year').forEach(node=>node.textContent='VALEUR NON AFFICHÉE'); });
  fetch(window.TERRASCOPE_SOURCES.owid.gdpPerCapitaCurrentUsd.replace('{iso2}', iso2[country])).then(response=>response.ok?response.json():Promise.reject()).then(payload=>{
    const latestNominal = payload?.[1]?.find(item=>Number.isFinite(Number(item.value)));
    const note = document.querySelector('#gdp-nominal-note');
    if (latestNominal && note) note.textContent = `NOMINAL · ${Number(latestNominal.value).toLocaleString('fr-FR',{maximumFractionDigits:0})} $ COURANTS · ${latestNominal.date}`;
  }).catch(()=>{ const note=document.querySelector('#gdp-nominal-note'); if(note) note.textContent='REPÈRE NOMINAL NON DISPONIBLE'; });
}

// Atlas-style overview, populated only from the values already fetched on the
// sheet. It gives a dense, comparable entry point without duplicating data.
if (window.location.pathname.endsWith('country-live.html')) {
  const dashboardStyle = document.createElement('style');
  dashboardStyle.textContent = `.climate-dashboard{margin:45px 0 50px}.dashboard-head{display:flex;justify-content:space-between;align-items:end;gap:22px;border-bottom:1px solid var(--line);padding-bottom:17px}.dashboard-head h2{font:600 34px var(--serif);margin:5px 0 0;letter-spacing:-1px}.dashboard-head p:last-child{font:9px var(--mono);color:#777971;margin:0;text-align:right}.dashboard-grid{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid var(--line)}.dashboard-card{position:relative;min-height:166px;padding:20px 22px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);overflow:hidden}.dashboard-card:nth-child(3n){border-right:0}.dashboard-card:nth-last-child(-n+3){border-bottom:0}.dashboard-card strong{display:block;font:600 31px var(--serif);letter-spacing:-1px;margin:16px 0 3px}.dashboard-card span{font:10px var(--mono);color:#777971}.dashboard-card small{display:block;position:relative;z-index:1;margin-top:11px;font:9px var(--mono);letter-spacing:.3px;color:var(--forest)}.dashboard-card .micro{position:absolute;width:112px;height:44px;right:15px;bottom:16px;opacity:.62}.micro polyline{fill:none;stroke:#2d684c;stroke-width:2.5}.micro path{stroke:#dedbd1;stroke-width:1}.dashboard-card.is-scenario small{color:#a05a38}.dashboard-card.is-scenario{background:linear-gradient(135deg,transparent 70%,rgba(230,223,206,.35))}@media(max-width:760px){.dashboard-grid{grid-template-columns:1fr 1fr}.dashboard-card:nth-child(3n){border-right:1px solid var(--line)}.dashboard-card:nth-child(2n){border-right:0}.dashboard-card:nth-last-child(-n+3){border-bottom:1px solid var(--line)}.dashboard-card:nth-last-child(-n+2){border-bottom:0}}@media(max-width:500px){.dashboard-head{display:block}.dashboard-head p:last-child{text-align:left;margin-top:12px}.dashboard-grid{grid-template-columns:1fr}.dashboard-card,.dashboard-card:nth-child(3n){border-right:0;border-bottom:1px solid var(--line)}.dashboard-card:last-child{border-bottom:0}}`;
  document.head.append(dashboardStyle);
  const dashboard = document.createElement('section'); dashboard.className = 'climate-dashboard';
  const cbam = window.TERRASCOPE_SOURCES.cbam;
  dashboard.innerHTML = `<div class="dashboard-head"><div><p class="eyebrow">VUE D’ENSEMBLE · DERNIERS MILLÉSIMES DISPONIBLES</p><h2>Le profil <em>climat-économie.</em></h2></div><p>OBSERVATIONS ANNUELLES<br>ET CALCULS TERRASCOPE SIGNALÉS</p></div><div class="dashboard-grid"><article class="dashboard-card"><p class="label">CO₂ TERRITORIAL</p><strong id="dash-co2">—</strong><span>MtCO₂ / an</span><small id="dash-co2-note">CHARGEMENT…</small><svg class="micro" viewBox="0 0 120 44" preserveAspectRatio="none"><path d="M0 34H120"/><polyline id="dash-co2-line" points=""/></svg></article><article class="dashboard-card"><p class="label">ÉVOLUTION 5 ANS</p><strong id="dash-change">—</strong><span>ÉMISSIONS TERRITORIALES</span><small id="dash-change-note">CHARGEMENT…</small></article><article class="dashboard-card"><p class="label">PIB RÉEL · PPA</p><strong id="dash-gdp">—</strong><span>Md $ internationaux 2021</span><small id="dash-gdp-note">CHARGEMENT…</small></article><article class="dashboard-card"><p class="label">PIB PAR HABITANT · PPA</p><strong id="dash-gdp-capita">—</strong><span>$ int. 2021 / hab.</span><small id="dash-gdp-capita-note">CHARGEMENT…</small></article><article class="dashboard-card"><p class="label">INTENSITÉ CARBONE DU PIB</p><strong id="dash-intensity">—</strong><span>gCO₂ / $ int. 2021</span><small id="dash-intensity-note">CALCUL TERRASCOPE · CO₂ / PIB</small></article><article class="dashboard-card is-scenario"><p class="label">RÉFÉRENCE CARBONE · CBAM</p><strong>${cbam.priceEur.toLocaleString('fr-FR',{minimumFractionDigits:2})} €</strong><span>PAR tCO₂e · PRIX CBAM UE</span><small>${cbam.period} · PUBLIÉ LE ${cbam.published.toUpperCase()}</small></article></div>`;
  const source = document.querySelector('#source');
  if (source) source.after(dashboard);
  const put = (selector, value) => { const node = document.querySelector(selector); if (node) node.textContent = value; };
  const refreshDashboard = () => {
    const co2 = document.querySelector('#value')?.textContent || '—';
    const co2Year = document.querySelector('#year')?.textContent || 'CHARGEMENT…';
    const change = document.querySelector('#change')?.textContent || '—';
    const changeNote = document.querySelector('#change-note')?.textContent || 'CHARGEMENT…';
    const gdp = document.querySelector('#gdp-total')?.textContent || '—';
    const gdpYear = document.querySelector('#gdp-year')?.textContent || 'CHARGEMENT…';
    const capita = document.querySelector('#gdp-per-capita')?.textContent || '—';
    const capitaYear = document.querySelector('#gdp-per-capita-year')?.textContent || 'CHARGEMENT…';
    put('#dash-co2', co2); put('#dash-co2-note', co2Year); put('#dash-change', change); put('#dash-change-note', changeNote); put('#dash-gdp', gdp); put('#dash-gdp-note', gdpYear); put('#dash-gdp-capita', capita); put('#dash-gdp-capita-note', capitaYear);
    const co2Value = Number(co2.replace(/[^0-9,.-]/g,'').replace(',','.'));
    const gdpValue = Number(gdp.replace(/[^0-9,.-]/g,'').replace(',','.'));
    if (Number.isFinite(co2Value) && Number.isFinite(gdpValue) && gdpValue > 0) put('#dash-intensity', (co2Value / gdpValue * 1000).toLocaleString('fr-FR',{maximumFractionDigits:0}));
    const original = document.querySelector('#line')?.getAttribute('points') || '';
    const pairs = original.trim().split(/\s+/).map(pair=>pair.split(',').map(Number)).filter(pair=>pair.length===2&&pair.every(Number.isFinite));
    if (pairs.length) { const ys=pairs.map(pair=>pair[1]); const min=Math.min(...ys), max=Math.max(...ys); const scaled=pairs.map((pair,index)=>`${(index/(pairs.length-1)*120).toFixed(1)},${(5+(pair[1]-min)/Math.max(1,max-min)*32).toFixed(1)}`).join(' '); document.querySelector('#dash-co2-line').setAttribute('points',scaled); }
  };
  ['#value','#year','#change','#change-note','#gdp-total','#gdp-year','#gdp-per-capita','#gdp-per-capita-year','#line'].forEach(selector=>{const node=document.querySelector(selector); if(node)new MutationObserver(refreshDashboard).observe(node,{childList:true,characterData:true,attributes:true,subtree:true});});
  refreshDashboard();
}

if (window.location.pathname.endsWith('country-live.html')) {
  const flagStyle = document.createElement('style');
  flagStyle.textContent = `.country-identity{display:flex;align-items:center;gap:18px}.country-identity .flag-image{display:block;width:74px;height:auto;max-height:55px;object-fit:contain;border:0!important;outline:0!important;box-shadow:none!important;background:transparent}.country-identity .country-heading{min-width:0}.source-nav{align-self:stretch;display:flex;align-items:center;padding:0 18px;border-left:1px solid var(--line);font:10px var(--mono);letter-spacing:.7px;color:var(--forest);text-decoration:none}@media(max-width:650px){.source-nav{display:none}.country-identity .flag-image{width:54px;max-height:40px}.country-identity{gap:13px}.country-identity h1{font-size:48px!important}}`;
  document.head.append(flagStyle);
  const country = new URLSearchParams(window.location.search).get('country') || 'Allemagne';
  const iso2 = {Allemagne:'de',Autriche:'at',Belgique:'be',Bulgarie:'bg',Chypre:'cy',Croatie:'hr',Danemark:'dk',Espagne:'es',Estonie:'ee',Finlande:'fi',France:'fr',Grèce:'gr',Hongrie:'hu',Irlande:'ie',Italie:'it',Lettonie:'lv',Lituanie:'lt',Luxembourg:'lu',Malte:'mt','Pays-Bas':'nl',Pologne:'pl',Portugal:'pt',Roumanie:'ro',Slovaquie:'sk',Slovénie:'si',Suède:'se',Tchéquie:'cz'};
  setTimeout(() => {
    const name = document.querySelector('#name');
    if (name && iso2[country] && !name.parentElement.classList.contains('country-identity')) {
      const identity = document.createElement('div'); identity.className = 'country-identity';
      name.parentNode.insertBefore(identity, name); identity.append(Object.assign(document.createElement('img'), { className:'flag-image', src:`https://flagcdn.com/${iso2[country]}.svg`, width:74, height:55, alt:`Drapeau de ${country}` }));
      const heading = document.createElement('div'); heading.className = 'country-heading'; identity.append(heading); heading.append(name);
    }
    const menu = document.querySelector('.nav .menu');
    if (menu && !document.querySelector('.source-nav')) menu.insertAdjacentHTML('beforebegin','<a class="source-nav" href="sources.html">SOURCES ↗</a>');
  }, 0);
}

// Press review — GDELT is an index of external publisher links. No article is
// copied into TerraScope, and a failed request leaves a transparent fallback.
if (window.location.pathname.endsWith('country-live.html')) {
  const newsStyle = document.createElement('style');
  newsStyle.textContent = `.country-news{margin-top:76px;padding-top:34px;border-top:1px solid var(--line)}.country-news-head{display:flex;justify-content:space-between;align-items:end;gap:24px}.country-news h2{font:600 34px var(--serif);margin:7px 0}.country-news-head small{max-width:280px;text-align:right;font:10px/1.55 var(--mono);color:#777971}.news-feed{margin-top:23px;border-top:1px solid var(--line)}.news-item{display:grid;grid-template-columns:120px minmax(0,1fr) 24px;gap:20px;align-items:start;padding:20px 0;border-bottom:1px solid var(--line);color:inherit;text-decoration:none}.news-item:hover .news-title{color:var(--forest)}.news-meta{font:9px/1.65 var(--mono);letter-spacing:.35px;color:var(--forest)}.news-title{font:600 21px/1.18 var(--serif);letter-spacing:-.35px;transition:color .18s}.news-domain{display:block;margin-top:7px;font:10px var(--mono);color:#777971}.news-arrow{font:18px var(--mono);color:var(--forest)}.news-status{padding:23px 0;font:12px var(--sans);color:#62645d;border-bottom:1px solid var(--line)}.news-foot{margin:17px 0 0;font:10px/1.5 var(--mono);color:#777971}.news-foot a{color:var(--forest)}@media(max-width:650px){.country-news-head{display:block}.country-news-head small{display:block;text-align:left;margin-top:12px}.news-item{grid-template-columns:1fr 18px;gap:8px}.news-meta{grid-column:1}.news-title{font-size:19px}.news-arrow{grid-column:2;grid-row:1 / span 2;align-self:center}}`;
  document.head.append(newsStyle);
  const country = new URLSearchParams(window.location.search).get('country') || 'Allemagne';
  const news = document.createElement('section');
  news.className = 'country-news';
  news.innerHTML = `<div class="country-news-head"><div><p class="eyebrow">REVUE DE PRESSE · LIVE</p><h2>${country} dans l’actualité.</h2></div><small>ARTICLES EXTERNES · CLIMAT, ÉNERGIE & ÉCONOMIE</small></div><div class="news-feed" id="country-news-feed"><p class="news-status">Recherche des dernières publications…</p></div><p class="news-foot">AGRÉGATION GDELT · LES TITRES ET LIENS RESTENT LA PROPRIÉTÉ DE LEUR MÉDIA D’ORIGINE · <a href="${window.TERRASCOPE_SOURCES.gdelt.documentation}" target="_blank" rel="noopener">MÉTHODOLOGIE GDELT ↗</a></p>`;
  const anchor = document.querySelector('.provenance');
  if (anchor) anchor.before(news); else document.querySelector('.page')?.append(news);

  const params = new URLSearchParams({ country });
  const feed = news.querySelector('#country-news-feed');
  const formatDate = value => {
    const match = String(value || '').match(/^(\d{4})(\d{2})(\d{2})/);
    if (match) return `${match[3]}.${match[2]}.${match[1]}`;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'DATE NON PRÉCISÉE';
  };
  const toDomain = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'MÉDIA EXTERNE'; } };
  fetch(`${window.TERRASCOPE_SOURCES.gdelt.endpoint}?${params.toString()}`)
    .then(response => response.ok ? response.json() : Promise.reject(new Error('GDELT indisponible')))
    .then(payload => {
      const articles = Array.isArray(payload.articles) ? payload.articles.filter(article => article.title && article.url).slice(0, 6) : [];
      if (!articles.length) throw new Error(payload?.message || 'Aucun article correspondant à cette requête');
      feed.replaceChildren();
      const provider = news.querySelector('.country-news-head small');
      if (provider && payload.provider) provider.textContent = `${payload.provider.toUpperCase()} · CLIMAT, ÉNERGIE & ÉCONOMIE`;
      articles.forEach(article => {
        const link = document.createElement('a');
        link.className = 'news-item'; link.href = article.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        const meta = document.createElement('span'); meta.className = 'news-meta'; meta.textContent = `PRESSE · ${formatDate(article.seendate)}`;
        const content = document.createElement('span');
        const title = document.createElement('span'); title.className = 'news-title'; title.textContent = article.title;
        const domain = document.createElement('span'); domain.className = 'news-domain'; domain.textContent = article.domain || toDomain(article.url);
        content.append(title, domain);
        const arrow = document.createElement('span'); arrow.className = 'news-arrow'; arrow.textContent = '↗';
        link.append(meta, content, arrow); feed.append(link);
      });
    })
    .catch(error => {
      console.warn('Revue de presse GDELT indisponible :', error.message);
      feed.innerHTML = '<p class="news-status">La revue de presse est temporairement indisponible. Les indicateurs climat et économie de la fiche restent accessibles.</p>';
    });
}

// Shortcuts at the top of every country sheet. The linked blocks are created
// progressively above, so this runs after the page composition is complete.
if (window.location.pathname.endsWith('country-live.html')) {
  const sectionNavStyle = document.createElement('style');
  sectionNavStyle.textContent = `html{scroll-behavior:smooth}.sheet-shortcuts{display:flex;flex-wrap:wrap;gap:8px;margin:30px 0 2px;padding:15px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.sheet-shortcuts a{display:inline-flex;align-items:center;min-height:31px;padding:0 11px;border:1px solid #d5d2c8;background:#faf9f5;color:var(--forest);font:9px var(--mono);letter-spacing:.5px;text-decoration:none;transition:background .18s,color .18s,border-color .18s}.sheet-shortcuts a:hover,.sheet-shortcuts a:focus-visible{background:var(--forest);border-color:var(--forest);color:#fff;outline:0}.climate-dashboard,.energy-mix,.economy-context,.forecast,.deep-dive,.country-news,.provenance{scroll-margin-top:84px}@media(max-width:600px){.sheet-shortcuts{gap:6px}.sheet-shortcuts a{padding:0 9px;font-size:8px}}`;
  document.head.append(sectionNavStyle);
  setTimeout(() => {
    const intro = document.querySelector('.intro-live');
    if (!intro || document.querySelector('.sheet-shortcuts')) return;
    const sections = [
      ['actualites', '.country-news', 'ACTUALITÉS'],
      ['projections', '.forecast', 'PROJECTIONS'],
      ['energie', '.energy-mix', 'ÉNERGIE'],
      ['economie', '.economy-context', 'ÉCONOMIE'],
      ['politique', '.deep-dive', 'POLITIQUE CLIMAT'],
      ['sources', '.provenance', 'SOURCES']
    ];
    const nav = document.createElement('nav');
    nav.className = 'sheet-shortcuts'; nav.setAttribute('aria-label', 'Accès rapide à la fiche pays');
    sections.forEach(([id, selector, label]) => {
      const section = document.querySelector(selector);
      if (!section) return;
      section.id = id;
      const link = document.createElement('a'); link.href = `#${id}`; link.textContent = label;
      nav.append(link);
    });
    if (nav.childElementCount) intro.after(nav);
  }, 0);
}

// Clear project notice at the end of every country profile.
if (window.location.pathname.endsWith('country-live.html')) {
  const projectNoticeStyle = document.createElement('style');
  projectNoticeStyle.textContent = `.project-notice{margin-top:72px;padding:27px 0 0;border-top:1px solid var(--line);display:grid;grid-template-columns:180px minmax(0,1fr);gap:28px}.project-notice strong{font:10px var(--mono);letter-spacing:.8px;color:var(--forest)}.project-notice p{max-width:710px;margin:0;font-size:12px;line-height:1.65;color:#6a6b64}.project-notice a{color:var(--forest);text-decoration:none}@media(max-width:600px){.project-notice{grid-template-columns:1fr;gap:10px;margin-top:52px}}`;
  document.head.append(projectNoticeStyle);
  setTimeout(() => {
    if (document.querySelector('.project-notice')) return;
    const notice = document.createElement('aside');
    notice.className = 'project-notice';
    notice.innerHTML = `<strong>À PROPOS DU PROJET</strong><p><b>TerraScope est un projet indépendant de sensibilisation au climat et à l’économie.</b> Les données sont présentées avec leurs sources et millésimes ; les scénarios sont des calculs illustratifs, et non des prévisions officielles ni un avis scientifique, financier ou politique. <a href="sources.html">Consulter les sources et la méthodologie ↗</a></p>`;
    const page = document.querySelector('.page');
    if (page) page.append(notice);
  }, 0);
}
