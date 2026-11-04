/* Génère au build les pages statiques /pays/<pays>/, le sitemap et robots.txt.
   Le contenu principal est pré-rendu depuis le snapshot validé : moteurs de
   recherche et aperçus de liens le lisent sans JavaScript. Le script de la
   fiche remplace ensuite ce contenu par la version interactive. */
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const registrySource = readFileSync(new URL('../country-registry.js', import.meta.url), 'utf8');
const sandbox = {window: {}};
runInNewContext(registrySource, sandbox);
export const registry = sandbox.window.TerraCountries;

export const SITE_URL = (process.env.SITE_URL || 'https://terra-scope.online').replace(/\/$/, '');

const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));
const n = value => Number(value).toLocaleString('fr-FR', {maximumFractionDigits: 1});
const signed = value => (value < 0 ? '−' : '+') + n(Math.abs(value));
const metric = m => (m?.status === 'available' && Number.isFinite(m.value) ? m.value : null);

/** Chiffres clés d'un pays, tels que la fiche interactive les affiche. */
export function keyFigures(snapshot, iso3) {
  const country = snapshot.countries[iso3];
  const co2 = country.series?.co2_territorial_mt || [];
  const last = co2.find(p => p.year === snapshot.reference_year);
  const base = co2.find(p => p.year === 1990) || co2[0];
  return {
    year: snapshot.reference_year,
    co2: last ? last.value : null,
    baseYear: base?.year,
    change: Number.isFinite(country.derived?.emissions_change_since_1990_pct) ? country.derived.emissions_change_since_1990_pct : null,
    perCapita: metric(country.metrics?.co2_per_capita_t),
    renewables: metric(country.metrics?.renewable_electricity_share_pct),
    warming: metric(country.metrics?.warming_anomaly_c),
  };
}

export function describe(place, f) {
  const parts = [];
  if (f.co2 !== null) parts.push(`Émissions de CO₂ ${f.year} ${place.of} : ${n(f.co2)} MtCO₂` + (f.change !== null ? ` (${signed(f.change)} % depuis ${f.baseYear})` : ''));
  if (f.perCapita !== null) parts.push(`${n(f.perCapita)} tCO₂ par habitant`);
  if (f.renewables !== null) parts.push(`${n(f.renewables)} % d’électricité renouvelable`);
  return parts.join(', ') + '. Sources, millésimes et méthode sur TerraScope.';
}

function card(title, value, unit) {
  return `<article><p>${esc(title)}</p><strong>${esc(value)}</strong><span>${esc(unit)}</span></article>`;
}

/** Rend la page statique d'un pays à partir de la coquille country-live.html. */
export function renderCountryPage(shell, place, snapshot) {
  const f = keyFigures(snapshot, place.iso3);
  const url = `${SITE_URL}${registry.path(place)}`;
  const title = `${place.name} : émissions, énergie et climat — TerraScope`;
  const description = describe(place, f);
  const summary = f.co2 === null ? 'Série d’émissions non publiée pour cette année.'
    : `En ${f.year}, ${place.the} ${registry.verb(place, 'a émis', 'ont émis')} ${n(f.co2)} MtCO₂.` + (f.change !== null ? ` Les émissions ont ${f.change < 0 ? 'baissé' : 'augmenté'} de ${n(Math.abs(f.change))} % depuis ${f.baseYear}.` : '');
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="TerraScope">`,
    `<meta property="og:locale" content="fr_FR">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta name="twitter:card" content="summary">`,
  ].join('\n  ');
  const body = `<div class="topline"></div><header class="nav"><a class="brand" href="/index.html">terra<span>•</span>scope</a><a class="menu" href="/index.html">RETOUR <b>↖</b></a></header>
  <main class="sheet prerendered">
    <a class="back" href="/index.html">← EXPLORER LES PAYS</a>
    <p class="eyebrow">FICHE PAYS · UNION EUROPÉENNE</p>
    <h1>${esc(place.name)}</h1>
    <p class="lede" id="summary">${esc(summary)}</p>
    <section class="metrics" aria-label="Repères ${esc(f.year)}">
      ${f.warming !== null ? card('Réchauffement observé', (f.warming < 0 ? '−' : '+') + Math.abs(f.warming).toLocaleString('fr-FR', {minimumFractionDigits: 1, maximumFractionDigits: 1}), '°C au-dessus de 1991–2020') : ''}
      ${f.co2 !== null ? card('CO₂ territorial', n(f.co2), `MtCO₂ en ${f.year}`) : ''}
      ${f.perCapita !== null ? card('CO₂ par habitant', n(f.perCapita), `tCO₂ / hab. en ${f.year}`) : ''}
      ${f.renewables !== null ? card('Production renouvelable', n(f.renewables) + ' %', `de l’électricité produite en ${f.year}`) : ''}
    </section>
    <p><a href="/sources.html">Sources et méthodologie</a> · <a href="/ranking.html?country=${encodeURIComponent(place.name)}">Classement européen</a></p>
  </main>`;

  let html = shell
    // Ressources en chemin absolu : la page vit dans /pays/<pays>/.
    .replace(/(href|src)="(?!https?:|\/|#|data:)([^"]+)"/g, '$1="/$2"')
    .replace('<html lang="fr">', `<html lang="fr" data-country="${place.iso3}">`)
    .replace(/<title>[^<]*<\/title>/, head)
    .replace(/<meta name="description"[^>]*>\s*/, '')
    .replace(/<body([^>]*)>/, `<body$1>\n  ${body}`);
  if (!html.includes(`data-country="${place.iso3}"`)) throw Error('Country page shell changed: cannot set data-country');
  return html;
}

export function sitemap(lastmod) {
  const pages = ['/', '/ranking.html', '/sources.html', '/data-health.html', ...registry.list.map(c => registry.path(c))];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(p => `  <url><loc>${SITE_URL}${p}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`;
}

export function robots() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}
