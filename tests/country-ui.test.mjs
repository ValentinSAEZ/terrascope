import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('country atlas keeps all six existing data panels', async () => {
  const runtime = await readFile('terrascope-runtime.js', 'utf8');
  for (const id of ['portrait','emissions','energy','impacts','future','sources']) {
    assert.ok(runtime.includes('id="'+id+'"'));
    assert.ok(runtime.includes('href="#'+id+'"'));
  }
});
test('atlas is deferred and its assets are shipped by the build', async () => {
  const html = await readFile('country-live.html', 'utf8');
  const build = await readFile('scripts/build.mjs', 'utf8');
  assert.match(html, /<script src="country-ui.js" defer><\/script>/);
  for (const file of ['country-ui.js','country-ui.css']) assert.ok(build.includes("'"+file+"'"));
});
test('legacy country URL preserves deep-linked topic', async () => {
  assert.match(await readFile('country.html', 'utf8'), /window\.location\.hash/);
});
