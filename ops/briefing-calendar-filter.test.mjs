import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
function filter(payload){const p=spawnSync(process.execPath,['ops/briefing-calendar-filter.mjs'],{input:JSON.stringify({date:'2026-11-10',sources:[],...payload}),encoding:'utf8',env:{...process.env,TZ:'America/New_York'}});assert.equal(p.status,0,p.stderr);return JSON.parse(p.stdout);}
const event=(id,title,start='2026-11-10',end='2026-11-11')=>({id,summary:title,start:{date:start},end:{date:end}});
test('hidden, filtered, cancelled and duplicate Google events',()=>{
 const rows=filter({sources:[{id:'a',label:'Family',items:[event('1','Bring snack'),event('2','Hidden'),event('3','Basketball'),{...event('4','Removed'),status:'cancelled'}]},{id:'b',label:'BMS Calendar',items:[event('5','Bring snack')]}],hiddenEventIds:['2'],calendarFilters:['basketball']});
 assert.equal(rows.length,1);assert.deepEqual(rows[0].sources,['Family','BMS Calendar']);
});
test('all-day end is exclusive; spanning events are included once',()=>{
 const rows=filter({sources:[{id:'a',label:'Family',items:[event('1','Finished yesterday','2026-11-09','2026-11-10'),event('2','Two days','2026-11-09','2026-11-11')]}]});
 assert.equal(rows.length,1);assert.equal(rows[0].title,'Two days');
});
test('custom timed event is Eastern; canceled title remains explicit',()=>{
 const rows=filter({customEvents:[{id:'1',title:'CANCELED practice',date:'2026-11-10',startTime:'18:45',type:'family'}]});
 assert.equal(rows[0].start,'2026-11-10T23:45:00.000Z');assert.equal(rows[0].cancelled,true);
});
test('mixed UTC and offset timestamps stay in chronological order',()=>{
 const rows=filter({sources:[{id:'a',label:'Family',items:[
  {id:'1',summary:'Evening',start:{dateTime:'2026-11-10T18:45:00-05:00'},end:{dateTime:'2026-11-10T19:45:00-05:00'}},
  {id:'2',summary:'Afternoon',start:{dateTime:'2026-11-10T20:00:00Z'},end:{dateTime:'2026-11-10T21:00:00Z'}}]}]});
 assert.deepEqual(rows.map(e=>e.title),['Afternoon','Evening']);
});
