import {test} from 'node:test';
import assert from 'node:assert/strict';
import {geometry,rowLabel} from './geometry.js';
for(const paper of ['a4','letter'])for(const orientation of ['portrait','landscape'])for(const overlap of [0,5,6,10])for(const mode of ['fit','fill'])test(`${paper} ${orientation} ${overlap} ${mode}: exact shared coordinates`,()=>{
 const g=geometry({rows:5,cols:6,paper,orientation,overlap,mode},1920,1080);
 assert.equal(g.tiles.length,30);
 assert.equal(g.tiles[5].label,'A6');assert.equal(g.tiles[6].label,'B1');
 for(const t of g.tiles){if(t.c<5){const right=g.tiles[t.r*6+t.c+1];assert.ok(Math.abs(t.x+t.w-right.x-overlap)<1e-9);}if(t.r<4){const down=g.tiles[(t.r+1)*6+t.c];assert.ok(Math.abs(t.y+t.h-down.y-overlap)<1e-9);}}
 const last=g.tiles.at(-1);assert.ok(Math.abs(last.x+last.w-g.width)<1e-9);assert.ok(Math.abs(last.y+last.h-g.height)<1e-9);
 if(mode==='fit'){assert.ok(g.image.w<=g.width+1e-9);assert.ok(g.image.h<=g.height+1e-9);}else{assert.ok(g.image.w>=g.width-1e-9);assert.ok(g.image.h>=g.height-1e-9);}
});
test('alphabetical rows',()=>{assert.equal(rowLabel(0),'A');assert.equal(rowLabel(25),'Z');assert.equal(rowLabel(26),'AA');});
for(const paper of ['a4','letter'])for(const orientation of ['portrait','landscape'])for(const overlap of [0,5,6,10])test(`Custom final size: ${paper} ${orientation} ${overlap}`,()=>{
 const g=geometry({paper,orientation,overlap,mode:'fit',posterSize:{width:600,height:900}},1200,800);
 assert.equal(g.width,600);assert.equal(g.height,900);
 assert.ok(g.w<=g.pw-20+1e-9);assert.ok(g.h<=g.ph-20+1e-9);
 const last=g.tiles.at(-1);assert.ok(Math.abs(last.x+last.w-600)<1e-9);assert.ok(Math.abs(last.y+last.h-900)<1e-9);
 for(const t of g.tiles){if(t.c<g.cols-1)assert.ok(Math.abs(t.x+t.w-g.tiles[t.r*g.cols+t.c+1].x-overlap)<1e-9);if(t.r<g.rows-1)assert.ok(Math.abs(t.y+t.h-g.tiles[(t.r+1)*g.cols+t.c].y-overlap)<1e-9);}
});
test('Custom one-page poster and exact multiples avoid excess pages',()=>{
 const args={paper:'a4',orientation:'portrait',overlap:10,mode:'fit'};
 let g=geometry({...args,posterSize:{width:50,height:70}},100,100);assert.equal(g.tiles.length,1);assert.equal(g.w,50);assert.equal(g.h,70);
 g=geometry({...args,posterSize:{width:370,height:544}},100,100);assert.equal(g.rows,2);assert.equal(g.cols,2);
});
test('Reject invalid and excessive custom sizes',()=>{
 const args={paper:'a4',orientation:'portrait',overlap:0,mode:'fit'};
 for(const width of [0,-1,NaN,Infinity,100000])assert.throws(()=>geometry({...args,posterSize:{width,height:500}},100,100));
});
