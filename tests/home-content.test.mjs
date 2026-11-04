import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const headline = JSON.parse(readFileSync(new URL('../data/headline.json', import.meta.url), 'utf8'));
const body = html.slice(html.indexOf('<body'));
const text = body.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ');

test('homepage has no placeholder, fake real-time or loading text', () => {
  for (const word of [/aujourd/i, /chargement/i, /seront alimentées/i, /démonstration/i]) assert.doesNotMatch(text, word);
  assert.ok(!html.includes('id="country-panel"') && !html.includes('id="trajectory"'));
});

test('every decimal figure on the homepage is declared, dated and sourced in data/headline.json', () => {
  const declared = new Set();
  for (const item of Object.values(headline.items)) {
    assert.ok(item.source && item.url && (item.year || item.period), JSON.stringify(item));
    declared.add(item.display.replace(/^[+−-]/, ''));
    if (item.uncertainty) declared.add(String(item.uncertainty).replace('.', ','));
  }
  const figures = text.match(/\d+,\d+/g) || [];
  assert.ok(figures.length >= 3);
  for (const figure of figures) assert.ok(declared.has(figure), 'undeclared figure ' + figure);
});

test('hero promise matches the EU-27 scope', () => {
  assert.match(text, /chaque pays de l’Union européenne/);
});
