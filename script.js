// Registre unique des 27 pays couverts (country-registry.js).
const registry = window.TerraCountries;
const countries = registry.list.map(c => c.name);
const form = document.querySelector('#country-search');
const input = document.querySelector('#country');
const suggestions = document.querySelector('#suggestions');
const countryIso2Search = Object.fromEntries(registry.list.map(c => [c.name, c.flag]));
const normalizeSearch = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').trim();
let activeSuggestion = -1;

function closeSuggestions() {
  suggestions.hidden = true;
  input.setAttribute('aria-expanded', 'false');
  input.removeAttribute('aria-activedescendant');
  activeSuggestion = -1;
}

function setActiveSuggestion(index) {
  const options = [...suggestions.querySelectorAll('[role="option"]')];
  if (!options.length) return;
  activeSuggestion = (index + options.length) % options.length;
  options.forEach((option, optionIndex) => {
    const selected=optionIndex === activeSuggestion;
    option.classList.toggle('is-active', selected);
    option.setAttribute('aria-selected', String(selected));
  });
  input.setAttribute('aria-activedescendant', options[activeSuggestion].id);
}

function showMatches() {
  const query = normalizeSearch(input.value);
  if (!query) {
    suggestions.innerHTML = '';
    closeSuggestions();
    return;
  }
  const matches = countries.map(country => ({country,normalized:normalizeSearch(country)})).filter(item => !query || item.normalized.includes(query)).sort((left,right) => {
    const leftScore=left.normalized.startsWith(query)?0:left.normalized.split(/[-\s]/).some(word=>word.startsWith(query))?1:2;
    const rightScore=right.normalized.startsWith(query)?0:right.normalized.split(/[-\s]/).some(word=>word.startsWith(query))?1:2;
    return leftScore-rightScore||left.country.localeCompare(right.country,'fr');
  }).slice(0, 6);
  suggestions.innerHTML = matches.length ? matches.map((item,index) => `<button id="country-option-${index}" type="button" role="option" aria-selected="false" data-country="${item.country}"><img src="/assets/flags/${countryIso2Search[item.country]}.svg" alt="" width="28" height="20"><span><b>${item.country}</b><small>Fiche climat · Union européenne</small></span><i>↗</i></button>`).join('') : '<p class="suggestions-empty">Aucun pays disponible ne correspond à cette recherche.</p>';
  suggestions.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  activeSuggestion = -1;
}

input.addEventListener('input', showMatches);
input.addEventListener('keydown', event => {
  const options = suggestions.querySelectorAll('[role="option"]');
  if (event.key === 'ArrowDown' && options.length) { event.preventDefault(); setActiveSuggestion(activeSuggestion + 1); }
  if (event.key === 'ArrowUp' && options.length) { event.preventDefault(); setActiveSuggestion(activeSuggestion - 1); }
  if (event.key === 'Escape') closeSuggestions();
  if (event.key === 'Enter' && activeSuggestion >= 0) { event.preventDefault(); options[activeSuggestion].click(); }
});
suggestions.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  input.value = button.dataset.country;
  closeSuggestions();
  window.location.href = registry.path(registry.resolve(button.dataset.country));
});
document.addEventListener('pointerdown', event => { if (!form.contains(event.target)) closeSuggestions(); });
form.addEventListener('submit', (event) => {
  event.preventDefault();
  closeSuggestions();
  const selected = registry.resolve(input.value)?.name;
  if (selected) window.location.href = registry.path(registry.resolve(selected));
  else input.focus();
});



// Country explorer — the validated annual snapshot powers both country cards
// and rankings, so comparisons cannot silently mix years.
const explorerButton = document.querySelector('.menu');
const countryIso2 = countryIso2Search;
const explorer = document.createElement('div');
explorer.className = 'explorer-overlay'; explorer.hidden = true;
explorer.innerHTML = `<section class="explorer-dialog" role="dialog" aria-modal="true" aria-labelledby="explorer-title"><div class="explorer-top"><div><p class="eyebrow">PAYS DISPONIBLES · UNION EUROPÉENNE</p><h2 id="explorer-title">Explorer les pays.</h2><p class="explorer-meta" id="explorer-status">CLASSEMENT ALPHABÉTIQUE · CHARGEMENT DES ÉMISSIONS…</p></div><button class="explorer-close" type="button" aria-label="Fermer">×</button></div><div class="explorer-tools"><input class="explorer-search" type="search" placeholder="Rechercher un pays…" aria-label="Rechercher parmi les pays" /><div class="sort-options"><button type="button" data-sort="emissions" class="is-active">ÉMISSIONS ↓</button><button type="button" data-sort="name">A → Z</button></div></div><div class="explorer-list" aria-live="polite"></div></section>`;
document.body.append(explorer);
const explorerList = explorer.querySelector('.explorer-list');
const explorerSearch = explorer.querySelector('.explorer-search');
const explorerStatus = explorer.querySelector('#explorer-status');
let explorerSort = 'emissions';
let explorerRows = countries.map(name => ({ name, emission: null, year: null }));

function renderExplorer() {
  const term = explorerSearch.value.trim().toLocaleLowerCase('fr');
  const visible = explorerRows.filter(row => row.name.toLocaleLowerCase('fr').includes(term)).sort((left, right) => explorerSort === 'name' ? left.name.localeCompare(right.name, 'fr') : (right.emission ?? -Infinity) - (left.emission ?? -Infinity));
  explorerList.innerHTML = visible.length ? visible.map((row, index) => `<button class="explorer-row" type="button" data-country="${row.name}"><span class="rank">${String(index + 1).padStart(2, '0')}</span><img class="explorer-flag" src="/assets/flags/${countryIso2[row.name]}.svg" width="20" height="15" alt=""><span class="row-name">${row.name}</span><span class="row-emission">${row.emission === null ? 'chargement…' : `${row.emission.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MtCO₂`}</span><span class="row-arrow">↗</span></button>`).join('') : `<p class="explorer-empty">Aucun pays ne correspond à cette recherche.</p>`;
}
function openExplorer() { explorer.hidden = false; explorerButton.setAttribute('aria-expanded', 'true'); renderExplorer(); setTimeout(() => explorerSearch.focus(), 0); }
function closeExplorer() { explorer.hidden = true; explorerButton.setAttribute('aria-expanded', 'false'); explorerButton.focus(); }
explorerButton.setAttribute('aria-controls', 'country-explorer'); explorerButton.setAttribute('aria-expanded', 'false'); explorer.id = 'country-explorer';
explorerButton.addEventListener('click', openExplorer);
explorer.querySelector('.explorer-close').addEventListener('click', closeExplorer);
explorer.addEventListener('click', event => { if (event.target === explorer) closeExplorer(); const row = event.target.closest('.explorer-row'); if (row) window.location.href = registry.path(registry.resolve(row.dataset.country)); });
explorerSearch.addEventListener('input', renderExplorer);
explorer.querySelector('.sort-options').addEventListener('click', event => { const button = event.target.closest('button[data-sort]'); if (!button) return; explorerSort = button.dataset.sort; explorer.querySelectorAll('[data-sort]').forEach(item => item.classList.toggle('is-active', item === button)); renderExplorer(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !explorer.hidden) closeExplorer(); });
renderExplorer();

async function hydrateExplorerEmissions() {
  try {
    const response = await fetch('/data/annual-snapshot.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const snapshot = await response.json();
    if (!/^validated/.test(snapshot.status)) throw new Error('Snapshot non validé');
    const byName = new Map(Object.values(snapshot.countries).map(country => [country.name_fr, country]));
    explorerRows = explorerRows.map(row => {
      const source = byName.get(row.name)?.metrics?.co2_territorial_mt;
      return source?.status === 'available' ? { ...row, emission: source.value, year: source.year } : row;
    });
    explorerStatus.textContent = `SOURCE · GLOBAL CARBON BUDGET · ANNÉE ${snapshot.reference_year}`;
  } catch (error) {
    explorerStatus.textContent = 'SNAPSHOT ANNUEL TEMPORAIREMENT INDISPONIBLE · TRI ALPHABÉTIQUE DISPONIBLE';
    explorerSort = 'name'; explorer.querySelector('[data-sort="name"]').classList.add('is-active'); explorer.querySelector('[data-sort="emissions"]').classList.remove('is-active');
  }
  renderExplorer();
}
hydrateExplorerEmissions();
