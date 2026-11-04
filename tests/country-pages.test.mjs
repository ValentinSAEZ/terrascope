import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registry, renderCountryPage, sitemap, robots, SITE_URL} from '../scripts/country-pages.mjs';

const shell = readFileSync(new URL('../country-live.html', import.meta.url), 'utf8');
const snapshot = JSON.parse(readFileSync(new URL('../data/annual-snapshot.json', import.meta.url), 'utf8'));

test('France static page carries its key figures in raw HTML', () => {
  const html = renderCountryPage(shell, registry.resolve('France'), snapshot);
  assert.match(html, /<html lang="fr" data-country="FRA">/);
  assert.match(html, /<h1>France<\/h1>/);
  assert.match(html, /264,2/);
  assert.match(html, /la France a émis/);
  assert.ok(html.includes(`<link rel="canonical" href="${SITE_URL}/pays/france/">`));
  assert.match(html, /<meta property="og:title" content="France : émissions/);
  assert.match(html, /<meta property="og:description" content="Émissions de CO₂ 2024 de la France/);
  assert.equal((html.match(/<title>/g) || []).length, 1);
  assert.equal((html.match(/<meta name="description"/g) || []).length, 1);
});

test('every covered country gets a page with absolute asset paths and its own figures', () => {
  for (const place of registry.list) {
    const html = renderCountryPage(shell, place, snapshot);
    assert.ok(html.includes(`data-country="${place.iso3}"`), place.name);
    assert.doesNotMatch(html, /(href|src)="(?!https?:|\/|#)[^"]+"/, place.name);
    const co2 = snapshot.countries[place.iso3].series.co2_territorial_mt.find(p => p.year === snapshot.reference_year).value;
    assert.ok(html.includes(co2.toLocaleString('fr-FR', {maximumFractionDigits: 1})), place.name);
  }
  assert.match(renderCountryPage(shell, registry.resolve('NLD'), snapshot), /les Pays-Bas ont émis/);
});

test('sitemap lists the home page, the hubs and the 27 country pages; robots points to it', () => {
  const xml = sitemap('2026-11-05');
  assert.equal((xml.match(/<url>/g) || []).length, 4 + 27);
  assert.ok(xml.includes(`${SITE_URL}/pays/tchequie/`));
  assert.match(robots(), new RegExp(`Sitemap: ${SITE_URL.replace(/[.]/g, '\.')}/sitemap\.xml`));
});
