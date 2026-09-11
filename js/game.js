export const DIRS=[{name:"up",dx:0,dy:-1,angle:-Math.PI/2},{name:"right",dx:1,dy:0,angle:0},{name:"down",dx:0,dy:1,angle:Math.PI/2},{name:"left",dx:-1,dy:0,angle:Math.PI}];
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

export function rng(seed){let x=(seed>>>0)||1;return()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296}}
export function shapeFor(i){return SHAPES[i%SHAPES.length]}
export function silhouetteFor(level){
  if(level===1)return"onboardingOne";
  if(level===2)return"onboardingTwo";
  return shapeFor(level-3);
}
const MAX_BOARD_SIZE=9;
const MAX_OCCUPIED_CELLS=58;
const MAX_BASE_CELLS=Math.max(...Object.values(MASKS).map(rows=>rows.reduce((count,row)=>count+[...row].filter(value=>value==="#").length,0)));
function hash32(value){let x=(value>>>0)^0x9e3779b9;x=Math.imul(x^(x>>>16),0x85ebca6b);x=Math.imul(x^(x>>>13),0xc2b2ae35);return(x^(x>>>16))>>>0}
export function difficultyFor(level){
  if(level<3)return{tier:0,targetCells:level===1?4:9,w:level===1?2:3,h:level===1?2:3};
  const tier=Math.min(6,1+Math.floor((level-3)/5));
  const targetCells=Math.min(MAX_OCCUPIED_CELLS,MAX_BASE_CELLS+(level-3));
  const base=MASKS[silhouetteFor(level)];
  let w=Math.min(MAX_BOARD_SIZE,Math.max(base[0].length,base[0].length+tier-1));
  let h=Math.min(MAX_BOARD_SIZE,Math.max(base.length,base.length+tier-1));
  while(w*h<targetCells&& (w<MAX_BOARD_SIZE||h<MAX_BOARD_SIZE)){
    if(w<=h&&w<MAX_BOARD_SIZE)w++;
    else if(h<MAX_BOARD_SIZE)h++;
    else w++;
  }
  return{tier,targetCells,w,h};
}
export function maskFor(level,seed=level){
  const silhouette=silhouetteFor(level),rows=MASKS[silhouette];
  if(level<3){
    const cells=[];
    rows.forEach((row,y)=>[...row].forEach((value,x)=>{if(value==="#")cells.push([x,y])}));
    return{silhouette,w:rows[0].length,h:rows.length,cells,difficulty:difficultyFor(level)};
  }
  const difficulty=difficultyFor(level),baseCells=[];
  const offsetX=Math.floor((difficulty.w-rows[0].length)/2);
  const offsetY=Math.floor((difficulty.h-rows.length)/2);
  rows.forEach((row,y)=>[...row].forEach((value,x)=>{if(value==="#")baseCells.push([x+offsetX,y+offsetY])}));
  const occupied=new Set(baseCells.map(([x,y])=>`${x},${y}`));
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
    baseCells.push([candidate.x,candidate.y]);
  }
  const cells=[...occupied].map(value=>value.split(",").map(Number));
  cells.sort(([ax,ay],[bx,by])=>ay-by||ax-bx);
  return{silhouette,w:difficulty.w,h:difficulty.h,cells,difficulty:{...difficulty,occupiedCount:cells.length}};
}
function makeGrid(w,h,pieces){const grid=Array.from({length:h},()=>Array(w).fill(null));for(const piece of pieces)for(const [x,y] of piece.cells)grid[y][x]=piece.id;return grid}
function canRemove(board,piece,removed){for(const [x,y] of piece.cells){let cx=x+piece.dir.dx,cy=y+piece.dir.dy;while(cx>=0&&cy>=0&&cx<board.w&&cy<board.h){const hit=board.grid[cy][cx];if(hit!==null&&hit!==piece.id&&!removed.has(hit))return false;cx+=piece.dir.dx;cy+=piece.dir.dy}}return true}

export function generateLevel(level=1,seed=level){
  const random=rng(seed+level*7919),mask=maskFor(level,seed),pieces=[],order=[];
  let id=0;
  for(let y=0;y<mask.h;y++){
    const row=mask.cells.filter(([,cellY])=>cellY===y).sort(([a],[b])=>a-b);
    const towardRight=random()>=.5;
    if(towardRight)row.reverse();
    const dir=DIRS[towardRight?1:3];
    for(const [x] of row){
      pieces.push({id,x,y,dir,shape:"arrow",cells:[[x,y]]});
      order.push(id++);
    }
  }
  const grid=makeGrid(mask.w,mask.h,pieces);
  return{level,seed,w:mask.w,h:mask.h,silhouette:mask.silhouette,difficulty:mask.difficulty,maskCells:mask.cells,pieces,order,grid};
}
export function isLegal(level,id,removed=new Set()){const piece=level.pieces.find(candidate=>candidate.id===id);return !!piece&&!removed.has(id)&&canRemove(level,piece,removed)}
export class GameState{constructor(level){this.level=level;this.removed=new Set();this.history=[]}move(id){if(!isLegal(this.level,id,this.removed))return false;this.history.push(new Set(this.removed));this.removed.add(id);return true}undo(){if(!this.history.length)return false;this.removed=this.history.pop();return true}reset(){this.removed=new Set();this.history=[]}won(){return this.removed.size===this.level.pieces.length}}
export function validateLevel(level){const state=new GameState(level);for(const id of level.order)if(!state.move(id))return false;return state.won()}
export {MASKS};
