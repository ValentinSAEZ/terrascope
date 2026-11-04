import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const window = {};
runInNewContext(readFileSync(new URL('../country-registry.js', import.meta.url), 'utf8'), {window});
const C = window.TerraCountries;
const snapshot = JSON.parse(readFileSync(new URL('../data/annual-snapshot.json', import.meta.url), 'utf8'));

test('registry covers exactly the snapshot countries', () => {
  assert.equal(C.list.length, 27);
  assert.deepEqual([...C.list.map(c => c.iso3)].sort(), Object.keys(snapshot.countries).sort());
});

test('names, ISO codes, English names and case/accent variants resolve to the same country', () => {
  for (const input of ['France', 'france', 'FRANCE', 'FRA', 'fra', 'fr', 'FR', ' France ']) assert.equal(C.resolve(input)?.iso3, 'FRA', input);
  for (const input of ['Grèce', 'grece', 'GRC', 'EL', 'gr', 'Greece']) assert.equal(C.resolve(input)?.iso3, 'GRC', input);
  for (const input of ['Pays-Bas', 'pays bas', 'paysbas', 'NLD', 'Netherlands']) assert.equal(C.resolve(input)?.iso3, 'NLD', input);
  for (const input of ['Tchéquie', 'tchequie', 'CZE', 'Czechia', 'Czech Republic']) assert.equal(C.resolve(input)?.iso3, 'CZE', input);
});

test('uncovered, empty or hostile input never resolves to another country', () => {
  for (const input of ['Suisse', 'Etats-Unis', 'CHE', 'USA', '', '   ', null, undefined, '<b id="probe">x</b>', '<img src=x onerror=alert(1)>', 'France<script>', 'a'.repeat(500)]) {
    assert.equal(C.resolve(input), null, String(input));
  }
});

test('every alias maps to a single country', () => {
  const seen = new Map();
  for (const c of C.list) for (const alias of [c.name, c.iso3, c.eurostat, c.english, c.flag, c.slug]) {
    const k = String(alias).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[\s_’'-]+/g, '');
    if (seen.has(k)) assert.equal(seen.get(k), c.iso3, alias);
    seen.set(k, c.iso3);
  }
});

test('generated sentences are grammatical for all 27 countries', () => {
  const summary = c => 'En 2024, ' + c.the + ' ' + C.verb(c, 'a émis', 'ont émis') + ' 10 MtCO₂.';
  const policy = c => C.capitalize(c.the) + ' ' + C.verb(c, 'participe', 'participent') + ' à la contribution de l’UE.';
  const expected = {
    FRA: ['En 2024, la France a émis 10 MtCO₂.', 'La France participe à la contribution de l’UE.', 'Drapeau de la France'],
    NLD: ['En 2024, les Pays-Bas ont émis 10 MtCO₂.', 'Les Pays-Bas participent à la contribution de l’UE.', 'Drapeau des Pays-Bas'],
    DEU: ['En 2024, l’Allemagne a émis 10 MtCO₂.', 'L’Allemagne participe à la contribution de l’UE.', 'Drapeau de l’Allemagne'],
    CYP: ['En 2024, Chypre a émis 10 MtCO₂.', 'Chypre participe à la contribution de l’UE.', 'Drapeau de Chypre'],
    MLT: ['En 2024, Malte a émis 10 MtCO₂.', 'Malte participe à la contribution de l’UE.', 'Drapeau de Malte'],
    LUX: ['En 2024, le Luxembourg a émis 10 MtCO₂.', 'Le Luxembourg participe à la contribution de l’UE.', 'Drapeau du Luxembourg'],
    DNK: ['En 2024, le Danemark a émis 10 MtCO₂.', 'Le Danemark participe à la contribution de l’UE.', 'Drapeau du Danemark'],
  };
  for (const [iso3, [s, p, alt]] of Object.entries(expected)) {
    const c = C.byIso3(iso3);
    assert.equal(summary(c), s); assert.equal(policy(c), p); assert.equal('Drapeau ' + c.of, alt);
  }
  for (const c of C.list) {
    assert.match(c.the, /^(la |le |les |l’)?[A-ZÀ-Ý]/, c.name);
    assert.match(c.of, /^(de la |de l’|du |des |de )[A-ZÀ-Ý]/, c.name);
    assert.ok(!/\bde le\b|\bde les\b/.test(c.of), c.name);
  }
});

test('escapeHtml neutralises markup', () => {
  assert.equal(C.escapeHtml('<b id="probe">x</b>'), '&lt;b id=&quot;probe&quot;&gt;x&lt;/b&gt;');
});
