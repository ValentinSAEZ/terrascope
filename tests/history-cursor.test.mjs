import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const load = () => {
  const window = {};
  runInNewContext(readFileSync(new URL('../country-charts.js', import.meta.url), 'utf8'), {window});
  return window.TerraCharts;
};

test('axis ticks are round, start at the origin and cover the maximum', () => {
  const {niceTicks} = load();
  assert.deepEqual([...niceTicks(0, 430, 5)], [0, 100, 200, 300, 400, 500]);
  assert.deepEqual([...niceTicks(0, 9.2, 5)], [0, 2, 4, 6, 8, 10]);
  for (const max of [3.4, 57, 812, 1240]) {
    const ticks = niceTicks(0, max, 5);
    assert.equal(ticks[0], 0);
    assert.ok(ticks.at(-1) >= max);
  }
});

test('the runtime no longer hand-draws the history chart', () => {
  const runtime = readFileSync(new URL('../terrascope-runtime.js', import.meta.url), 'utf8');
  assert.ok(runtime.includes('TerraCharts.timeSeries('));
  assert.ok(runtime.includes('TerraCharts.mixBreakdown('));
  assert.ok(!runtime.includes('conic-gradient'));
});
