(() => {
  const main=document.querySelector('.health-page');
  const nav=document.createElement('nav');nav.className='health-nav';nav.setAttribute('aria-label','Rubriques de la santé des données');
  const section=id=>document.querySelector(id).closest('.health-section');
  const groups=[['overview','Vue d’ensemble',[section('#source-audit'),section('#projection-health')]],['coverage','Couverture',[section('#coverage-grid')]],['registry','Sources',[section('#health-sources')]],['checks','Contrôles',[section('.health-rules')]]];
  const panels=[];
  for(const [id,label,items] of groups){
    const a=document.createElement('a');a.href='#'+id;a.textContent=label;nav.append(a);
    const panel=document.createElement('div');panel.id=id;panel.className='health-panel';panel.append(...items);main.append(panel);panels.push(panel);
  }
  main.querySelector('.health-summary').after(nav);
  const overview=panels[0];overview.classList.add('health-overview');
  // Keep scientific reservations prominent, not buried in a closed accordion.
  overview.append(document.querySelector('#validation-reserves'),main.querySelector(':scope > .health-caveat'));
  const source=document.createElement('a');source.href='https://climateknowledgeportal.worldbank.org/download-data';source.target='_blank';source.rel='noopener';source.className='health-projection-source';source.textContent='Source des projections · Banque mondiale / CCKP ↗';section('#projection-health').append(source);
  const rules=document.querySelector('.health-rules');
  [...rules.children].forEach(article=>{const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent=article.querySelector('b').textContent;details.append(summary,article.querySelector('p'));article.replaceWith(details);});
  function select(){const selected=panels.find(p=>'#'+p.id===location.hash)||panels[0];panels.forEach(p=>p.hidden=p!==selected);[...nav.children].forEach(a=>{if(a.hash==='#'+selected.id)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});}
  window.addEventListener('hashchange',select);select();
})();
