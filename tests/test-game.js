import assert from "node:assert/strict";
import {generateLevel,validateLevel,GameState,shapeFor} from "../js/game.js";
for(let n=1;n<=18;n++){const a=generateLevel(n,42),b=generateLevel(n,42);assert.deepEqual(a,b);assert.equal(validateLevel(a),true);assert.equal(a.pieces.length, b.pieces.length);assert.ok(a.pieces.every(p=>Array.isArray(p.cells)&&p.cells.length>0))}
assert.ok(generateLevel(1,42).pieces.every(p=>p.shape==="arrow"));
assert.ok(generateLevel(2,42).pieces.every(p=>p.shape==="arrow"));
assert.ok(generateLevel(3,42).pieces.some(p=>p.shape!=="arrow"));
assert.deepEqual(new Set(Array.from({length:7},(_,i)=>shapeFor(i))).size,7);
const level=generateLevel(2,99),s=new GameState(level);assert.equal(s.move(level.order[0]),true);assert.equal(s.undo(),true);assert.equal(s.removed.size,0);s.reset();assert.equal(s.removed.size,0);for(const id of level.order)assert.equal(s.move(id),true);assert.equal(s.won(),true);
console.log("Arrow Escape generator, determinism, shapes, move/undo/reset: PASS");
