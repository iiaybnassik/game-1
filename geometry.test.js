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
