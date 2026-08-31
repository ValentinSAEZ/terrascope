const countries = ["Allemagne", "Autriche", "Belgique", "Bulgarie", "Chypre", "Croatie", "Danemark", "Espagne", "Estonie", "Finlande", "France", "Grèce", "Hongrie", "Irlande", "Italie", "Lettonie", "Lituanie", "Luxembourg", "Malte", "Pays-Bas", "Pologne", "Portugal", "Roumanie", "Slovaquie", "Slovénie", "Suède", "Tchéquie"];
const form = document.querySelector('#country-search');
const input = document.querySelector('#country');
const suggestions = document.querySelector('#suggestions');
const countryIso2Search = {Allemagne:'de',Autriche:'at',Belgique:'be',Bulgarie:'bg',Chypre:'cy',Croatie:'hr',Danemark:'dk',Espagne:'es',Estonie:'ee',Finlande:'fi',France:'fr',Grèce:'gr',Hongrie:'hu',Irlande:'ie',Italie:'it',Lettonie:'lv',Lituanie:'lt',Luxembourg:'lu',Malte:'mt','Pays-Bas':'nl',Pologne:'pl',Portugal:'pt',Roumanie:'ro',Slovaquie:'sk',Slovénie:'si',Suède:'se',Tchéquie:'cz'};
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
  const matches = countries.map(country => ({country,normalized:normalizeSearch(country)})).filter(item => !query || item.normalized.includes(query)).sort((left,right) => {
    if (!query) return left.country.localeCompare(right.country, 'fr');
    const leftScore=left.normalized.startsWith(query)?0:left.normalized.split(/[-\s]/).some(word=>word.startsWith(query))?1:2;
    const rightScore=right.normalized.startsWith(query)?0:right.normalized.split(/[-\s]/).some(word=>word.startsWith(query))?1:2;
    return leftScore-rightScore||left.country.localeCompare(right.country,'fr');
  }).slice(0, 7);
  suggestions.innerHTML = matches.length ? matches.map((item,index) => `<button id="country-option-${index}" type="button" role="option" aria-selected="false" data-country="${item.country}"><img src="https://flagcdn.com/${countryIso2Search[item.country]}.svg" alt="" width="28" height="20"><span><b>${item.country}</b><small>Fiche climat · Union européenne</small></span><i>↗</i></button>`).join('') : '<p class="suggestions-empty">Aucun pays disponible ne correspond à cette recherche.</p>';
  suggestions.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  activeSuggestion = -1;
}

input.addEventListener('input', showMatches);
input.addEventListener('focus', showMatches);
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
  window.location.href = `country-live.html?country=${encodeURIComponent(button.dataset.country)}`;
});
document.addEventListener('pointerdown', event => { if (!form.contains(event.target)) closeSuggestions(); });
form.addEventListener('submit', (event) => {
  event.preventDefault();
  closeSuggestions();
  const selected = countries.find(country => normalizeSearch(country) === normalizeSearch(input.value));
  if (selected) window.location.href = `country-live.html?country=${encodeURIComponent(selected)}`;
  else input.focus();
});

function parseCsvLine(line) {
  const values = []; let quoted = false; let value = '';
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { values.push(value); value = ''; }
    else value += char;
  }
  values.push(value); return values;
}

function drawLiveHistory(rows, yearIndex, valueIndex) {
  const series = rows
    .map(row => ({ year: Number(row[yearIndex]), value: Number(row[valueIndex]) / 1e6 }))
    .filter(point => point.year >= 1990)
    .sort((left, right) => left.year - right.year);
  if (series.length < 2) return;
  const first = series[0];
  const last = series.at(-1);
  const max = Math.ceil(Math.max(...series.map(point => point.value)) / 50) * 50;
  const x = point => 25 + ((point.year - first.year) / (last.year - first.year)) * 419;
  const y = point => 24 + (1 - point.value / max) * 223;
  const path = series.map((point, index) => `${index ? 'L' : 'M'} ${x(point).toFixed(1)} ${y(point).toFixed(1)}`).join(' ');
  const historical = document.querySelector('.historic');
  const area = document.querySelector('.historic-area');
  const liveX = x(last).toFixed(1); const liveY = y(last).toFixed(1);
  historical.setAttribute('d', path);
  area.setAttribute('d', `${path} L ${liveX} 275 L 25 275 Z`);
  document.querySelector('.current-line').setAttribute('d', `M ${liveX} ${liveY} C 540 164 620 195 700 220 S 810 242 880 248`);
  document.querySelector('.target-line').setAttribute('d', `M ${liveX} ${liveY} C 530 188 610 230 700 276 S 810 305 880 320`);
  const dot = document.querySelector('.last-dot'); dot.setAttribute('cx', liveX); dot.setAttribute('cy', liveY);
  document.querySelector('.y1').textContent = max;
  document.querySelector('.y2').textContent = Math.round(max * .75);
  document.querySelector('.y3').textContent = Math.round(max * .5);
  document.querySelector('.y4').textContent = Math.round(max * .25);
  document.querySelector('.y2025').textContent = last.year;
  const decline = ((last.value / first.value) - 1) * 100;
  document.querySelector('.observed-label').innerHTML = `<b>${decline < 0 ? '−' : '+'}${Math.abs(decline).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} %</b><span>depuis ${first.year}</span>`;
  document.querySelector('.chart-caption').textContent = `Historique chargé en direct depuis OWID / Global Carbon Budget jusqu’en ${last.year}. Les lignes orange et verte restent des scénarios prospectifs, distincts des émissions observées.`;
}

async function hydrateFranceCo2() {
  const status = document.querySelector('#data-status');
  try {
    const response = await fetch(window.TERRASCOPE_SOURCES.owid.co2France);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const lines = (await response.text()).trim().split(/\r?\n/);
    const headers = parseCsvLine(lines.shift());
    const entityIndex = headers.findIndex(header => header.toLowerCase() === 'entity');
    const yearIndex = headers.findIndex(header => header.toLowerCase() === 'year');
    const valueIndex = headers.findIndex(header => /annual.*co2.*emissions|emissions_total/i.test(header));
    const rows = lines.map(parseCsvLine).filter(row => row[entityIndex] === 'France' && Number.isFinite(Number(row[valueIndex])));
    const latest = rows.sort((a, b) => Number(b[yearIndex]) - Number(a[yearIndex]))[0];
    const prior = rows.find(row => Number(row[yearIndex]) === Number(latest[yearIndex]) - 5);
    if (!latest) throw new Error('Série France introuvable');
    const megatonnes = Number(latest[valueIndex]) / 1e6;
    document.querySelector('#emissions-value').textContent = megatonnes.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
    document.querySelector('#data-updated').textContent = latest[yearIndex];
    if (prior) {
      const change = ((Number(latest[valueIndex]) / Number(prior[valueIndex])) - 1) * 100;
      const element = document.querySelector('#emissions-change');
      element.textContent = `${change < 0 ? '↓' : '↑'} ${Math.abs(change).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} % sur 5 ans`;
      element.className = change <= 0 ? 'down' : 'up';
    }
    drawLiveHistory(rows, yearIndex, valueIndex);
    status.textContent = 'DONNÉES OWID · LIVE';
  } catch (error) {
    status.textContent = 'DONNÉES OWID · INDISPONIBLES';
    document.querySelector('#emissions-change').textContent = 'Série temporairement indisponible';
  }
}
hydrateFranceCo2();

// Country explorer — the same OWID series used by the country sheet powers
// the ranking, so the comparison never mixes sources or years silently.
const explorerButton = document.querySelector('.menu');
const countryOwidNames = {Allemagne:'Germany',Autriche:'Austria',Belgique:'Belgium',Bulgarie:'Bulgaria',Chypre:'Cyprus',Croatie:'Croatia',Danemark:'Denmark',Espagne:'Spain',Estonie:'Estonia',Finlande:'Finland',France:'France',Grèce:'Greece',Hongrie:'Hungary',Irlande:'Ireland',Italie:'Italy',Lettonie:'Latvia',Lituanie:'Lithuania',Luxembourg:'Luxembourg',Malte:'Malta','Pays-Bas':'Netherlands',Pologne:'Poland',Portugal:'Portugal',Roumanie:'Romania',Slovaquie:'Slovakia',Slovénie:'Slovenia',Suède:'Sweden',Tchéquie:'Czechia'};
const countryIso2 = {Allemagne:'de',Autriche:'at',Belgique:'be',Bulgarie:'bg',Chypre:'cy',Croatie:'hr',Danemark:'dk',Espagne:'es',Estonie:'ee',Finlande:'fi',France:'fr',Grèce:'gr',Hongrie:'hu',Irlande:'ie',Italie:'it',Lettonie:'lv',Lituanie:'lt',Luxembourg:'lu',Malte:'mt','Pays-Bas':'nl',Pologne:'pl',Portugal:'pt',Roumanie:'ro',Slovaquie:'sk',Slovénie:'si',Suède:'se',Tchéquie:'cz'};
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
  explorerList.innerHTML = visible.length ? visible.map((row, index) => `<button class="explorer-row" type="button" data-country="${row.name}"><span class="rank">${String(index + 1).padStart(2, '0')}</span><img class="explorer-flag" src="https://flagcdn.com/${countryIso2[row.name]}.svg" width="20" height="15" alt=""><span class="row-name">${row.name}</span><span class="row-emission">${row.emission === null ? 'chargement…' : `${row.emission.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MtCO₂`}</span><span class="row-arrow">↗</span></button>`).join('') : `<p class="explorer-empty">Aucun pays ne correspond à cette recherche.</p>`;
}
function openExplorer() { explorer.hidden = false; explorerButton.setAttribute('aria-expanded', 'true'); renderExplorer(); setTimeout(() => explorerSearch.focus(), 0); }
function closeExplorer() { explorer.hidden = true; explorerButton.setAttribute('aria-expanded', 'false'); explorerButton.focus(); }
explorerButton.setAttribute('aria-controls', 'country-explorer'); explorerButton.setAttribute('aria-expanded', 'false'); explorer.id = 'country-explorer';
explorerButton.addEventListener('click', openExplorer);
explorer.querySelector('.explorer-close').addEventListener('click', closeExplorer);
explorer.addEventListener('click', event => { if (event.target === explorer) closeExplorer(); const row = event.target.closest('.explorer-row'); if (row) window.location.href = `country-live.html?country=${encodeURIComponent(row.dataset.country)}`; });
explorerSearch.addEventListener('input', renderExplorer);
explorer.querySelector('.sort-options').addEventListener('click', event => { const button = event.target.closest('button[data-sort]'); if (!button) return; explorerSort = button.dataset.sort; explorer.querySelectorAll('[data-sort]').forEach(item => item.classList.toggle('is-active', item === button)); renderExplorer(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !explorer.hidden) closeExplorer(); });
renderExplorer();

async function hydrateExplorerEmissions() {
  try {
    const response = await fetch(window.TERRASCOPE_SOURCES.owid.co2France);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const lines = (await response.text()).trim().split(/\r?\n/);
    const headers = parseCsvLine(lines.shift());
    const entityIndex = headers.findIndex(header => header.toLowerCase() === 'entity');
    const yearIndex = headers.findIndex(header => header.toLowerCase() === 'year');
    const valueIndex = headers.findIndex(header => /annual.*co2.*emissions|emissions_total/i.test(header));
    const latestByEntity = new Map();
    lines.map(parseCsvLine).forEach(row => { const entity = row[entityIndex], year = Number(row[yearIndex]), value = Number(row[valueIndex]); if (Number.isFinite(year) && Number.isFinite(value) && (!latestByEntity.has(entity) || year > latestByEntity.get(entity).year)) latestByEntity.set(entity, { year, value }); });
    explorerRows = explorerRows.map(row => { const source = latestByEntity.get(countryOwidNames[row.name]); return source ? { ...row, emission: source.value / 1e6, year: source.year } : row; });
    const latestYear = Math.max(...explorerRows.map(row => row.year || 0));
    explorerStatus.textContent = `SOURCE · OWID / GLOBAL CARBON BUDGET · DERNIÈRE OBSERVATION ${latestYear}`;
  } catch (error) {
    explorerStatus.textContent = 'SOURCE OWID TEMPORAIREMENT INDISPONIBLE · TRI ALPHABÉTIQUE DISPONIBLE';
    explorerSort = 'name'; explorer.querySelector('[data-sort="name"]').classList.add('is-active'); explorer.querySelector('[data-sort="emissions"]').classList.remove('is-active');
  }
  renderExplorer();
}
hydrateExplorerEmissions();
