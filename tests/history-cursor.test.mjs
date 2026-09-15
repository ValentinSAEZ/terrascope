import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

test('historical selection reveals SVG markers and aligns them with the selected value',()=>{
  const source=readFileSync(new URL('../terrascope-runtime.js',import.meta.url),'utf8');
  const start=source.indexOf('const showHistory=index=>{');
  const end=source.indexOf('const indexAt=',start);
  const node=()=>({attrs:{hidden:''},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];}});
  const cursor=node(),halo=node(),point=node(),readout={};
  const context={cursor,halo,point,co2:[{year:1990,value:400},{year:2024,value:264}],activeIndex:1,xFor:d=>d.year,yFor:d=>d.value,n:v=>String(v),put:(k,v)=>{readout[k]=v;}};
  runInNewContext(source.slice(start,end)+'showHistory(0);',context);
  for(const marker of [cursor,halo,point])assert.equal('hidden' in marker.attrs,false);
  assert.equal(cursor.attrs.x1,1990);
  assert.equal(point.attrs.cx,1990);
  assert.equal(point.attrs.cy,400);
  assert.equal(readout['#history-readout-year'],1990);
  assert.equal(readout['#history-readout-value'],'400');
});
