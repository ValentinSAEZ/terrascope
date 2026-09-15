import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('health page retains the live audit, coverage and projection targets',async()=>{
 const html=await readFile('data-health.html','utf8');
 for(const id of ['health-status','health-year','health-scope','source-audit','projection-health','validation-warning-list','coverage-grid','health-sources'])assert.equal(html.split('id="'+id+'"').length-1,1);
 assert.match(html,/id="validation-reserves" open hidden/);
 assert.match(html,/health-ui\.js\?v=health-1/);
});
test('health assets are included in production build',async()=>{
 const build=await readFile('scripts/build.mjs','utf8');
 for(const asset of ['health-ui.css','health-ui.js'])assert.ok(build.includes("'"+asset+"'"));
});
