import assert from "node:assert/strict";
import {generateLevel,validateLevel,GameState,MASKS,maskFor,shapeFor,silhouetteFor,difficultyFor} from "../js/game.js";

const key=([x,y])=>`${x},${y}`;
for(let levelNumber=1;levelNumber<=70;levelNumber++){
  for(const seed of [1,42,99]){
    const level=generateLevel(levelNumber,seed);
    assert.deepEqual(level,generateLevel(levelNumber,seed),`level ${levelNumber} should be reproducible`);
    assert.equal(validateLevel(level),true,`level ${levelNumber} should be solvable`);
    const mask=new Set(maskFor(levelNumber,seed).cells.map(key));
    const occupied=new Set(level.pieces.flatMap(piece=>piece.cells).map(key));
    assert.deepEqual(occupied,mask,`level ${levelNumber} should fill only its silhouette`);
    for(let y=0;y<level.h;y++)for(let x=0;x<level.w;x++)assert.equal(level.grid[y][x]!==null,mask.has(`${x},${y}`),`grid mask mismatch at ${x},${y}`);
  }
}

let previousOccupied=0;
for(let levelNumber=3;levelNumber<=30;levelNumber++){
  const level=generateLevel(levelNumber,20260911);
  assert.ok(level.difficulty.occupiedCount>=previousOccupied,`difficulty must not decrease at level ${levelNumber}`);
  assert.equal(level.difficulty.occupiedCount,level.pieces.length,`difficulty count must match pieces at level ${levelNumber}`);
  assert.equal(validateLevel(level),true,`progressive level ${levelNumber} should be solvable`);
  previousOccupied=level.difficulty.occupiedCount;
}
assert.ok(difficultyFor(30).tier>difficultyFor(3).tier);

assert.equal(silhouetteFor(1),"onboardingOne");
assert.equal(silhouetteFor(2),"onboardingTwo");
for(const [offset,shape] of ["arrow","diamond","hexagon","zigzag","fish","cat","butterfly"].entries()){
  assert.equal(silhouetteFor(offset+3),shape);
  assert.ok(MASKS[shape].some(row=>row.includes("#")),`${shape} needs occupied cells`);
}
assert.deepEqual(new Set(Array.from({length:7},(_,index)=>shapeFor(index))).size,7);

const level=generateLevel(3,99),state=new GameState(level);
assert.equal(state.move(level.order[0]),true);
assert.equal(state.undo(),true);
assert.equal(state.removed.size,0);
state.reset();
for(const id of level.order)assert.equal(state.move(id),true);
assert.equal(state.won(),true);
console.log("Arrow Escape silhouettes, determinism, solvability, and move history: PASS");
