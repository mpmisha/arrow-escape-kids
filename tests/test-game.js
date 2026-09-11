import assert from "node:assert/strict";
import {generateLevel,validateLevel,GameState,MASKS,maskFor,shapeFor,silhouetteFor,difficultyFor,DIRS} from "../js/game.js";

const key=([x,y])=>`${x},${y}`;
const dirNames=new Set(DIRS.map(dir=>dir.name));

function assertWholePieces(level){
  const seen=new Set();
  for(const piece of level.pieces){
    assert.deepEqual(piece.head,piece.path[0],`piece ${piece.id} head should be the first path cell`);
    assert.equal(piece.cells.length,piece.path.length,`piece ${piece.id} cells/path mismatch`);
    assert.equal(dirNames.has(piece.dir.name),true,`piece ${piece.id} needs one literal board direction`);
    for(const cell of piece.path){
      const id=key(cell);
      assert.equal(seen.has(id),false,`cell ${id} overlaps another piece`);
      seen.add(id);
    }
    for(let index=1;index<piece.path.length;index++){
      const [ax,ay]=piece.path[index-1], [bx,by]=piece.path[index];
      assert.equal(Math.abs(ax-bx)+Math.abs(ay-by),1,`piece ${piece.id} path must be orthogonally contiguous`);
    }
  }
  assert.deepEqual(seen,new Set(level.maskCells.map(key)),"pieces must exactly cover the silhouette mask without overlaps");
}

function assertGridMatchesPieces(level){
  const occupied=new Set(level.pieces.flatMap(piece=>piece.cells).map(key));
  const mask=new Set(maskFor(level.level,level.seed).cells.map(key));
  assert.deepEqual(occupied,mask,`level ${level.level} should fill only its silhouette`);
  for(let y=0;y<level.h;y++)for(let x=0;x<level.w;x++){
    assert.equal(level.grid[y][x]!==null,mask.has(`${x},${y}`),`grid mask mismatch at ${x},${y}`);
  }
}

for(let levelNumber=1;levelNumber<=35;levelNumber++){
  for(const seed of [1,42,99]){
    const level=generateLevel(levelNumber,seed);
    assert.deepEqual(level,generateLevel(levelNumber,seed),`level ${levelNumber} should be reproducible`);
    assert.equal(validateLevel(level),true,`level ${levelNumber} should be solvable in generated order`);
    assertWholePieces(level);
    assertGridMatchesPieces(level);
  }
}

const onboarding=generateLevel(1,1337);
assert.equal(onboarding.pieces.length,2,"first level should be a tiny straight-piece onboarding board");
assert.equal(onboarding.pieces.every(piece=>piece.length===2&&!piece.bent),true,"onboarding pieces should be straight and easy");

for(const levelNumber of [6,12,18,24,30,35]){
  const level=generateLevel(levelNumber,20260911);
  assert.ok(level.pieces.some(piece=>piece.bent&&piece.length>=3),`level ${levelNumber} should include a bent multi-cell arrow piece`);
  assert.ok(level.pieces.some(piece=>piece.segments>=3),`level ${levelNumber} should include a multi-turn or multi-segment tail`);
  assert.ok(level.pieces.filter(piece=>piece.length>=3).length>=Math.ceil(level.pieces.length*.35),`level ${levelNumber} should mostly use longer whole pieces`);
}

let previousCells=0,previousTier=0;
for(let levelNumber=3;levelNumber<=30;levelNumber++){
  const level=generateLevel(levelNumber,20260911);
  assert.ok(level.difficulty.occupiedCount>=previousCells,`occupied cells must not decrease at level ${levelNumber}`);
  assert.ok(level.difficulty.tier>=previousTier,`difficulty tier must not decrease at level ${levelNumber}`);
  assert.equal(validateLevel(level),true,`progressive level ${levelNumber} should be solvable`);
  previousCells=level.difficulty.occupiedCount;
  previousTier=level.difficulty.tier;
}
assert.ok(difficultyFor(30).tier>difficultyFor(3).tier);

assert.equal(silhouetteFor(1),"onboardingOne");
assert.equal(silhouetteFor(2),"onboardingTwo");
for(const [offset,shape] of ["arrow","diamond","hexagon","zigzag","fish","cat","butterfly"].entries()){
  assert.equal(silhouetteFor(offset+3),shape);
  assert.ok(MASKS[shape].some(row=>row.includes("#")),`${shape} needs occupied cells`);
}
assert.deepEqual(new Set(Array.from({length:7},(_,index)=>shapeFor(index))).size,7);

const level=generateLevel(6,99),state=new GameState(level);
assert.equal(state.move(level.order[0]),true,"generated first piece should be removable");
assert.equal(state.undo(),true,"undo should restore removed piece");
assert.equal(state.removed.size,0);
assert.equal(state.move(level.order[level.order.length-1]),false,"reset board should reject an out-of-order blocked piece");
state.reset();
for(const id of level.order)assert.equal(state.move(id),true,`piece ${id} should be removable in generated order`);
assert.equal(state.won(),true);
state.reset();
assert.equal(state.removed.size,0,"reset should restore all pieces");

console.log("Arrow Escape bent whole-piece generation, solvability, and history: PASS");
