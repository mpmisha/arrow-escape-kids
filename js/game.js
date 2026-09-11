export const DIRS=[{name:"up",dx:0,dy:-1,angle:-Math.PI/2},{name:"right",dx:1,dy:0,angle:0},{name:"down",dx:0,dy:1,angle:Math.PI/2},{name:"left",dx:-1,dy:0,angle:Math.PI}];
const SHAPES=["arrow","diamond","hexagon","zigzag","fish","cat","butterfly"];
export function rng(seed){let x=(seed>>>0)||1;return()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296}}
export function shapeFor(i){return SHAPES[i%SHAPES.length]}
function cellsFor(shape,x,y,d){const p=[[0,0]];if(shape==="diamond"||shape==="hexagon")p.push([1,0],[0,1],[-1,0],[0,-1]);if(shape==="zigzag")p.push([1,0],[0,1]);if(shape==="fish")p.push([1,0],[2,0],[0,1]);if(shape==="cat")p.push([-1,0],[1,0],[0,1]);if(shape==="butterfly")p.push([-1,0],[1,0],[0,1],[0,-1]);return p.map(([a,b])=>{let rx=a,ry=b;if(d===1){rx=-b;ry=a}if(d===2){rx=-a;ry=-b}if(d===3){rx=b;ry=-a}return[x+rx,y+ry]})}
function canRemove(board,piece,removed){for(const [x,y] of piece.cells){let cx=x+piece.dir.dx,cy=y+piece.dir.dy;while(cx>=0&&cy>=0&&cx<board.w&&cy<board.h){const hit=board.grid[cy][cx];if(hit!==null&&hit!==piece.id&&!removed.has(hit))return false;cx+=piece.dir.dx;cy+=piece.dir.dy}}return true}
export function generateLevel(level=1,seed=level){
  const random=rng(seed+level*7919),w=level<3?4:Math.min(8,5+Math.floor(level/4)),h=w;
  const count=Math.min(Math.floor(w*h/2),Math.max(3,level<3?3+level:5+Math.floor(level*1.2)));
  const pieces=[],occupied=new Set(),order=[];
  // Build backwards from an empty board. Each newly added piece is guaranteed
  // to have a clear lane through all pieces that will be removed after it.
  for(let id=count-1;id>=0;id--){
    let placed=null;
    for(let attempt=0;attempt<400&&!placed;attempt++){
      const shape=shapeFor(id+level),dir=DIRS[Math.floor(random()*4)];
      const cells=cellsFor(shape,Math.floor(random()*w),Math.floor(random()*h),Math.floor(random()*4));
      if(cells.some(([x,y])=>x<0||y<0||x>=w||y>=h))continue;
      if(cells.some(([x,y])=>occupied.has(`${x},${y}`)))continue;
      const candidate={id,x:cells[0][0],y:cells[0][1],dir,shape,cells};
      const later={w,h,grid:makeGrid(w,h,pieces)};
      if(!canRemove(later,candidate,new Set()))continue;
      placed=candidate;
    }
    if(!placed){
      const fallback=DIRS[id%4], cells=[];
      for(let y=0;y<h&&!cells.length;y++)for(let x=0;x<w&&!cells.length;x++){
        const candidate={id,x,y,dir:fallback,shape:"arrow",cells:[[x,y]]};
        if(!occupied.has(`${x},${y}`)&&canRemove({w,h,grid:makeGrid(w,h,pieces)},candidate,new Set()))cells.push([x,y]);
      }
      if(!cells.length)return generateLevel(level,seed+1);
      placed={id,x:cells[0][0],y:cells[0][1],dir:fallback,shape:"arrow",cells};
    }
    pieces.push(placed);for(const [x,y] of placed.cells)occupied.add(`${x},${y}`);order.unshift(id);
  }
  pieces.sort((a,b)=>a.id-b.id);
  return{level,seed,w,h,pieces,order,grid:makeGrid(w,h,pieces)}
}
function makeGrid(w,h,pieces){const g=Array.from({length:h},()=>Array(w).fill(null));for(const p of pieces)for(const [x,y] of p.cells)if(g[y][x]===null)g[y][x]=p.id;return g}
export function isLegal(level,id,removed=new Set()){const p=level.pieces.find(x=>x.id===id);return !!p&&!removed.has(id)&&canRemove(level,p,removed)}
export class GameState{constructor(level){this.level=level;this.removed=new Set();this.history=[]}move(id){if(!isLegal(this.level,id,this.removed))return false;this.history.push(new Set(this.removed));this.removed.add(id);return true}undo(){if(!this.history.length)return false;this.removed=this.history.pop();return true}reset(){this.removed=new Set();this.history=[]}won(){return this.removed.size===this.level.pieces.length}}
export function validateLevel(level){const s=new GameState(level);for(const id of level.order)if(!s.move(id))return false;return s.won()}
export {cellsFor};
