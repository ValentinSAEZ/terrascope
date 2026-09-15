/* Atlas presentation: keep the existing data nodes and chart event handlers. */
(() => {
  const sheet = document.querySelector('.sheet');
  if (!sheet) return;
  document.body.classList.add('country-atlas');
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = 'country-ui.css';
  document.head.append(css);
  const hero = sheet.querySelector('.hero-sheet');
  const title = hero.querySelector('h1');
  title.querySelector('br')?.remove(); title.querySelector('em')?.remove();
  const nav = hero.querySelector('.tabs');
  const labels = ['Synthèse', 'Émissions', 'Électricité', 'Climat & impacts', 'Futur', 'Sources'];
  const links = [...nav.querySelectorAll('a')];
  nav.setAttribute('aria-label', 'Rubriques de la fiche pays');
  links.forEach((link, i) => { link.textContent = labels[i]; link.id = 'nav-' + link.hash.slice(1); });
  const workspace = document.createElement('div'); workspace.className = 'atlas-workspace';
  const sidebar = document.createElement('aside'); sidebar.className = 'atlas-sidebar';
  const kicker = document.createElement('p'); kicker.className = 'eyebrow'; kicker.textContent = 'EXPLORER LA FICHE';
  sidebar.append(kicker, nav);
  const health = document.createElement('a'); health.href = 'data-health.html'; health.className = 'atlas-health'; health.textContent = 'Santé des données ↗'; sidebar.append(health);
  const content = document.createElement('div'); content.className = 'atlas-content';
  const panels = links.map(link => sheet.querySelector(link.hash));
  panels.forEach(panel => { panel.setAttribute('aria-labelledby', 'nav-' + panel.id); content.append(panel); });
  workspace.append(sidebar, content); sheet.append(workspace);
  const policy = sheet.querySelector('.policy');
  const details = document.createElement('details'); details.className = 'atlas-policy';
  const summary = document.createElement('summary'); summary.textContent = 'Accords et mise en œuvre · cadre politique';
  details.append(summary, policy); content.querySelector('#future').append(details);
  const intro = document.querySelector('#summary');
  intro.setAttribute('role', 'status');
  const overview = content.querySelector('#portrait');
  const shortcuts = document.createElement('div'); shortcuts.className = 'atlas-shortcuts';
  [['emissions','Trajectoire carbone','Explorer les émissions depuis 1990'],['energy','Production électrique','Comprendre chaque composante du mix'],['impacts','Climat & impacts','Chaleur, incendies et limites des données'],['future','Horizons 2050 · 2100','Distinguer scénarios et engagements']].forEach(([id, heading, copy]) => {
    const a = document.createElement('a'); a.href = '#' + id;
    const h = document.createElement('h3'); h.textContent = heading;
    const p = document.createElement('p'); p.textContent = copy + ' →'; a.append(h, p); shortcuts.append(a);
  });
  overview.append(shortcuts);
  // Explanations remain available without repeating them above every panel.
  panels.forEach(panel => {
    const copy = panel.querySelector('.head > p');
    if (!copy) return;
    const explanation = document.createElement('details'); explanation.className = 'atlas-explanation';
    const label = document.createElement('summary'); label.textContent = 'Comment lire ces données';
    explanation.append(label, copy); panel.append(explanation);
  });
  function show(hash, navigate = false) {
    const selected = panels.find(panel => '#' + panel.id === hash) || panels[0];
    panels.forEach(panel => { panel.hidden = panel !== selected; });
    links.forEach(link => { if (link.hash === '#' + selected.id) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
    if (navigate) {
      selected.setAttribute('tabindex', '-1'); selected.focus({preventScroll:true});
      const top = workspace.getBoundingClientRect().top + window.scrollY - 16;
      if (window.scrollY > top) window.scrollTo({top:Math.max(0, top), behavior:'instant'});
    }
  }
  sheet.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if (!panels.some(panel => '#' + panel.id === link.hash)) return;
    event.preventDefault();
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
    show(link.hash, true);
  });
  window.addEventListener('hashchange', () => show(location.hash));
  window.addEventListener('popstate', () => show(location.hash));
  show(location.hash);
})();
