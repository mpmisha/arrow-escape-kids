export const DIRS=[
  {name:"up",dx:0,dy:-1,angle:-Math.PI/2},
  {name:"right",dx:1,dy:0,angle:0},
  {name:"down",dx:0,dy:1,angle:Math.PI/2},
  {name:"left",dx:-1,dy:0,angle:Math.PI}
];

const SHAPES=["arrow","diamond","hexagon","zigzag","fish","cat","butterfly"];
const MASKS={
  onboardingOne:["##","##"],
  onboardingTwo:["###","###","###"],
  arrow:["..#..",".###.","#####","..#..","..#.."],
  diamond:["...#...","..###..",".#####.","#######",".#####.","..###..","...#..."],
  hexagon:["..###..",".#####.","#######","#######","#######",".#####.","..###.."],
  zigzag:["##.....",".##....","..##...","...##..","....##.",".....##.",".....##."],
  fish:["#..###.","##.####","#######","##.####","#..###."],
  cat:[".#...#.",".##.##.","#######",".#####.","..###..","..###..",".###..."],
  butterfly:["##...##","###.###",".#####.","..###..",".#####.","###.###","##...##"]
};

const MAX_BOARD_SIZE=9;
const MAX_OCCUPIED_CELLS=58;
const MAX_BASE_CELLS=Math.max(...Object.values(MASKS).map(rows=>rows.reduce((count,row)=>count+[...row].filter(value=>value==="#").length,0)));
const key=([x,y])=>`${x},${y}`;
const fromKey=value=>value.split(",").map(Number);

export function rng(seed){
  let x=(seed>>>0)||1;
  return()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296};
}

function hash32(value){
  let x=(value>>>0)^0x9e3779b9;
  x=Math.imul(x^(x>>>16),0x85ebca6b);
  x=Math.imul(x^(x>>>13),0xc2b2ae35);
  return(x^(x>>>16))>>>0;
}

export function shapeFor(index){return SHAPES[index%SHAPES.length]}
export function silhouetteFor(level){
  if(level===1)return"onboardingOne";
  if(level===2)return"onboardingTwo";
  return shapeFor(level-3);
}

export function difficultyFor(level){
  if(level<3)return{tier:0,targetCells:level===1?4:9,w:level===1?2:3,h:level===1?2:3,minLength:2,maxLength:level===1?2:3,bent:false};
  const tier=Math.min(6,1+Math.floor((level-3)/5));
  const targetCells=Math.min(MAX_OCCUPIED_CELLS,MAX_BASE_CELLS+(level-3));
  const base=MASKS[silhouetteFor(level)];
  let w=Math.min(MAX_BOARD_SIZE,Math.max(base[0].length,base[0].length+tier-1));
  let h=Math.min(MAX_BOARD_SIZE,Math.max(base.length,base.length+tier-1));
  while(w*h<targetCells&&(w<MAX_BOARD_SIZE||h<MAX_BOARD_SIZE)){
    if(w<=h&&w<MAX_BOARD_SIZE)w++;
    else if(h<MAX_BOARD_SIZE)h++;
    else w++;
  }
  return{
    tier,
    targetCells,
    w,
    h,
    minLength:tier<2?2:3,
    maxLength:Math.min(7,4+tier),
    bent:level>=4
  };
}

export function maskFor(level,seed=level){
  const silhouette=silhouetteFor(level),rows=MASKS[silhouette];
  if(level<3){
    const cells=[];
    rows.forEach((row,y)=>[...row].forEach((value,x)=>{if(value==="#")cells.push([x,y])}));
    return{silhouette,w:rows[0].length,h:rows.length,cells,difficulty:{...difficultyFor(level),occupiedCount:cells.length}};
  }
  const difficulty=difficultyFor(level),baseCells=[];
  const offsetX=Math.floor((difficulty.w-rows[0].length)/2);
  const offsetY=Math.floor((difficulty.h-rows.length)/2);
  rows.forEach((row,y)=>[...row].forEach((value,x)=>{if(value==="#")baseCells.push([x+offsetX,y+offsetY])}));
  const occupied=new Set(baseCells.map(key));
  const candidates=[];
  for(let y=0;y<difficulty.h;y++)for(let x=0;x<difficulty.w;x++){
    if(occupied.has(`${x},${y}`))continue;
    const distance=Math.min(...baseCells.map(([baseX,baseY])=>Math.abs(x-baseX)+Math.abs(y-baseY)));
    candidates.push({x,y,distance,order:hash32(seed+x*374761393+y*668265263)});
  }
  candidates.sort((a,b)=>a.distance-b.distance||a.order-b.order);
  for(const candidate of candidates){
    if(occupied.size>=difficulty.targetCells)break;
    occupied.add(`${candidate.x},${candidate.y}`);
  }
  const cells=[...occupied].map(fromKey).sort(([ax,ay],[bx,by])=>ay-by||ax-bx);
  return{silhouette,w:difficulty.w,h:difficulty.h,cells,difficulty:{...difficulty,occupiedCount:cells.length}};
}

function makeGrid(w,h,pieces){
  const grid=Array.from({length:h},()=>Array(w).fill(null));
  for(const piece of pieces)for(const [x,y] of piece.cells)grid[y][x]=piece.id;
  return grid;
}

function hasTurn(path){
  for(let index=2;index<path.length;index++){
    const [ax,ay]=path[index-2], [bx,by]=path[index-1], [cx,cy]=path[index];
    if((bx-ax)!==(cx-bx)||(by-ay)!==(cy-by))return true;
  }
  return false;
}

function segmentCount(path){
  if(path.length<2)return 1;
  let count=1,previous=[path[1][0]-path[0][0],path[1][1]-path[0][1]];
  for(let index=2;index<path.length;index++){
    const next=[path[index][0]-path[index-1][0],path[index][1]-path[index-1][1]];
    if(next[0]!==previous[0]||next[1]!==previous[1]){count++;previous=next}
  }
  return count;
}

function cellsAheadAreInPath(pathSet,remaining,cell,dir,w,h){
  let cx=cell[0]+dir.dx,cy=cell[1]+dir.dy;
  while(cx>=0&&cy>=0&&cx<w&&cy<h){
    const id=`${cx},${cy}`;
    if(remaining.has(id)&&!pathSet.has(id))return false;
    cx+=dir.dx;
    cy+=dir.dy;
  }
  return true;
}

function canEscapePath(path,dir,remaining,w,h){
  const pathSet=new Set(path.map(key));
  return path.every(cell=>cellsAheadAreInPath(pathSet,remaining,cell,dir,w,h));
}

function candidatePathsFrom(head,dir,remaining,w,h,maxLength,limit){
  const candidates=[];
  const seen=new Set();
  function visit(path){
    if(candidates.length>=limit)return;
    const signature=path.map(key).join("|");
    if(seen.has(signature))return;
    seen.add(signature);
    if(path.length>=2&&canEscapePath(path,dir,remaining,w,h))candidates.push(path.map(cell=>[cell[0],cell[1]]));
    if(path.length>=maxLength)return;
    const [x,y]=path[path.length-1];
    const neighbors=DIRS.map(n=>[x+n.dx,y+n.dy])
      .filter(([nx,ny])=>remaining.has(`${nx},${ny}`)&&!path.some(([px,py])=>px===nx&&py===ny));
    neighbors.sort(([ax,ay],[bx,by])=>Math.abs(bx-head[0])+Math.abs(by-head[1])-Math.abs(ax-head[0])-Math.abs(ay-head[1])||ay-by||ax-bx);
    for(const neighbor of neighbors)visit([...path,neighbor]);
  }
  visit([head]);
  return candidates;
}

function makePiece(id,path,dir){
  return{
    id,
    x:path[0][0],
    y:path[0][1],
    dir,
    head:path[0],
    path:path.map(cell=>[cell[0],cell[1]]),
    cells:path.map(cell=>[cell[0],cell[1]]),
    length:path.length,
    segments:segmentCount(path),
    bent:hasTurn(path)
  };
}

function fallbackSingle(id,remaining,w,h){
  const [x,y]=[...remaining].map(fromKey).sort(([ax,ay],[bx,by])=>ay-by||ax-bx)[0];
  const dir=DIRS.find(candidate=>cellsAheadAreInPath(new Set([`${x},${y}`]),remaining,[x,y],candidate,w,h))||DIRS[1];
  return makePiece(id,[[x,y]],dir);
}

function chooseCandidate(mask,remaining,random,id,wantsBent){
  const difficulty=mask.difficulty;
  const all=[];
  const frontier=[...remaining].map(fromKey);
  for(const dir of DIRS){
    for(const head of frontier){
      if(!cellsAheadAreInPath(new Set([key(head)]),remaining,head,dir,mask.w,mask.h))continue;
      for(const path of candidatePathsFrom(head,dir,remaining,mask.w,mask.h,difficulty.maxLength,40)){
        all.push({path,dir});
      }
    }
  }
  if(!all.length)return fallbackSingle(id,remaining,mask.w,mask.h);
  all.sort((a,b)=>{
    const bentDelta=Number(hasTurn(b.path))-Number(hasTurn(a.path));
    if(wantsBent&&bentDelta)return bentDelta;
    const lengthDelta=b.path.length-a.path.length;
    if(lengthDelta)return lengthDelta;
    const segmentDelta=segmentCount(b.path)-segmentCount(a.path);
    if(segmentDelta)return segmentDelta;
    return hash32(id*8191+a.path.length*17+a.path[0][0]*31+a.path[0][1]*43)-hash32(id*8191+b.path.length*17+b.path[0][0]*31+b.path[0][1]*43);
  });
  const pool=all.slice(0,Math.min(8,all.length));
  const choice=pool[Math.floor(random()*pool.length)];
  return makePiece(id,choice.path,choice.dir);
}

function generateOnboarding(level,seed,mask){
  const random=rng(seed+level*7919),pieces=[];
  if(level===1){
    const right=random()>=.5;
    const dir=DIRS[right?1:3];
    const rows=[0,1];
    for(const y of rows){
      const path=right?[[1,y],[0,y]]:[[0,y],[1,y]];
      pieces.push(makePiece(pieces.length,path,dir));
    }
  }else{
    for(let y=0;y<3;y++){
      const dir=y%2===0?DIRS[1]:DIRS[3];
      const path=dir.dx>0?[[2,y],[1,y],[0,y]]:[[0,y],[1,y],[2,y]];
      pieces.push(makePiece(pieces.length,path,dir));
    }
  }
  const order=pieces.map(piece=>piece.id);
  return{level,seed,w:mask.w,h:mask.h,silhouette:mask.silhouette,difficulty:{...mask.difficulty,pieceCount:pieces.length},maskCells:mask.cells,pieces,order,grid:makeGrid(mask.w,mask.h,pieces)};
}

function generateByPeeling(level,seed,mask){
  let best=null;
  for(let attempt=0;attempt<18;attempt++){
    const random=rng(seed+level*7919+attempt*104729);
    const remaining=new Set(mask.cells.map(key));
    const removal=[];
    let safety=0;
    while(remaining.size&&safety++<mask.cells.length+8){
      const wantsBent=mask.difficulty.bent&&!removal.some(piece=>piece.bent);
      const piece=chooseCandidate(mask,remaining,random,removal.length,wantsBent);
      piece.id=removal.length;
      for(const cell of piece.cells)remaining.delete(key(cell));
      removal.push(piece);
    }
    if(remaining.size)continue;
    const bentCount=removal.filter(piece=>piece.bent).length;
    const multiCount=removal.filter(piece=>piece.length>=3).length;
    const score=bentCount*20+multiCount*4-removal.length;
    const pieces=removal;
    const levelData={level,seed,w:mask.w,h:mask.h,silhouette:mask.silhouette,difficulty:{...mask.difficulty,pieceCount:pieces.length,bentCount,multiCount},maskCells:mask.cells,pieces,order:pieces.map(piece=>piece.id),grid:makeGrid(mask.w,mask.h,pieces)};
    if((!mask.difficulty.bent||bentCount>0)&&multiCount>0&&validateLevel(levelData))return levelData;
    if(!best||score>best.score)best={score,levelData};
  }
  if(best?.levelData&&validateLevel(best.levelData))return best.levelData;
  throw new Error(`Could not generate solvable level ${level}`);
}

export function generateLevel(level=1,seed=level){
  const mask=maskFor(level,seed);
  if(level<3)return generateOnboarding(level,seed,mask);
  return generateByPeeling(level,seed,mask);
}

function canRemove(board,piece,removed){
  for(const [x,y] of piece.cells){
    let cx=x+piece.dir.dx,cy=y+piece.dir.dy;
    while(cx>=0&&cy>=0&&cx<board.w&&cy<board.h){
      const hit=board.grid[cy][cx];
      if(hit!==null&&hit!==piece.id&&!removed.has(hit))return false;
      cx+=piece.dir.dx;
      cy+=piece.dir.dy;
    }
  }
  return true;
}

export function isLegal(level,id,removed=new Set()){
  const piece=level.pieces.find(candidate=>candidate.id===id);
  return !!piece&&!removed.has(id)&&canRemove(level,piece,removed);
}

export class GameState{
  constructor(level){this.level=level;this.removed=new Set();this.history=[]}
  move(id){if(!isLegal(this.level,id,this.removed))return false;this.history.push(new Set(this.removed));this.removed.add(id);return true}
  undo(){if(!this.history.length)return false;this.removed=this.history.pop();return true}
  reset(){this.removed=new Set();this.history=[]}
  won(){return this.removed.size===this.level.pieces.length}
}

export function validateLevel(level){
  const state=new GameState(level);
  for(const id of level.order)if(!state.move(id))return false;
  return state.won();
}

export {MASKS,hasTurn};
