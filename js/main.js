import {generateLevel,GameState,validateLevel} from "./game.js";
import {getLang,applyLang,t as tr} from "./i18n.js";
import {SoundPlayer,Haptics} from "./audio.js";

const settings={sound:localStorage.getItem("soundEnabled")!=="false",haptics:localStorage.getItem("hapticsEnabled")!=="false"};
const sound=new SoundPlayer(settings),haptics=new Haptics(settings);
let lang=applyLang(getLang()),levelNo=Number(localStorage.getItem("arrowLevel")||1),seed=Number(localStorage.getItem("arrowSeed")||1337);
let level=generateLevel(levelNo,seed),state=new GameState(level),selectedHint=null;
const canvas=document.querySelector("#board"),ctx=canvas.getContext("2d"),score=document.querySelector("#score"),hint=document.querySelector("#hint");

function resize(){
  const r=document.querySelector("#board-wrap").getBoundingClientRect(),size=Math.min(r.width-8,r.height-20,560);
  canvas.width=canvas.height=Math.max(280,size);
  draw();
}

function cell(){return canvas.width/Math.max(level.w,level.h)}

function roundRect(x,y,w,h,r){
  ctx.beginPath();
  ctx.roundRect(x,y,w,h,r);
  ctx.fill();
}

function drawArrowHead(piece,s,glow){
  const [x,y]=piece.head;
  ctx.save();
  ctx.translate(x*s+s/2,y*s+s/2);
  ctx.rotate(piece.dir.angle);
  ctx.fillStyle=glow?"#ffe98a":"#f8f2da";
  ctx.shadowColor=glow?"rgba(255,216,94,.72)":"rgba(0,0,0,.25)";
  ctx.shadowBlur=glow?14:4;
  ctx.beginPath();
  ctx.moveTo(s*.34,0);
  ctx.lineTo(-s*.17,-s*.28);
  ctx.lineTo(-s*.08,0);
  ctx.lineTo(-s*.17,s*.28);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPiece(piece,s){
  const glow=piece.id===selectedHint;
  const centers=piece.path.map(([x,y])=>[x*s+s/2,y*s+s/2]);
  ctx.save();
  ctx.lineCap="round";
  ctx.lineJoin="round";
  ctx.lineWidth=s*.58;
  ctx.strokeStyle=glow?"#e75f66":"#e9e5d7";
  ctx.shadowColor=glow?"rgba(237,95,102,.58)":"rgba(0,0,0,.28)";
  ctx.shadowBlur=glow?16:7;
  ctx.beginPath();
  centers.forEach(([x,y],index)=>index?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.stroke();
  ctx.shadowBlur=0;
  ctx.lineWidth=s*.36;
  ctx.strokeStyle=glow?"#ff8c91":"#faf7e9";
  ctx.globalAlpha=.92;
  ctx.beginPath();
  centers.forEach(([x,y],index)=>index?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.stroke();
  ctx.globalAlpha=.18;
  ctx.lineWidth=s*.13;
  ctx.strokeStyle="#ffffff";
  ctx.beginPath();
  centers.forEach(([x,y],index)=>index?ctx.lineTo(x-s*.04,y-s*.05):ctx.moveTo(x-s*.04,y-s*.05));
  ctx.stroke();
  ctx.restore();
  drawArrowHead(piece,s,glow);
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const s=cell(),offsetX=(canvas.width-level.w*s)/2,offsetY=(canvas.height-level.h*s)/2;
  ctx.save();
  ctx.translate(offsetX,offsetY);
  ctx.fillStyle="rgba(19,27,83,.28)";
  for(const [x,y] of level.maskCells)roundRect(x*s+s*.11,y*s+s*.11,s*.78,s*.78,Math.max(10,s*.16));
  for(const piece of level.pieces){
    if(!state.removed.has(piece.id))drawPiece(piece,s);
  }
  ctx.restore();
  score.textContent=`${state.removed.size} / ${level.pieces.length}`;
  document.querySelector("#level-label").textContent=levelNo;
}

function gridPoint(clientX,clientY){
  const r=canvas.getBoundingClientRect(),s=cell(),offsetX=(canvas.width-level.w*s)/2,offsetY=(canvas.height-level.h*s)/2;
  const x=(clientX-r.left)*canvas.width/r.width-offsetX,y=(clientY-r.top)*canvas.height/r.height-offsetY;
  return[Math.floor(x/s),Math.floor(y/s)];
}

function pieceAt(clientX,clientY){
  const [gx,gy]=gridPoint(clientX,clientY);
  return level.pieces.find(piece=>!state.removed.has(piece.id)&&piece.cells.some(([x,y])=>x===gx&&y===gy));
}

function finishMove(piece){
  if(state.move(piece.id)){
    sound.play("tap");
    haptics.tap();
    selectedHint=null;
    draw();
    if(state.won()){
      sound.play("win");
      document.querySelector("#win-copy").textContent=tr("cleared",lang);
      document.querySelector("#win-overlay").hidden=false;
    }
    return;
  }
  sound.play("blocked");
  haptics.blocked();
  hint.textContent=tr("blocked",lang);
  hint.classList.add("show");
  setTimeout(()=>hint.classList.remove("show"),1300);
}

function tap(e){
  sound.unlock();
  const piece=pieceAt(e.clientX,e.clientY);
  if(piece)finishMove(piece);
}

canvas.addEventListener("pointerdown",tap);
canvas.addEventListener("keydown",e=>{
  if(!["Enter"," "].includes(e.key))return;
  e.preventDefault();
  sound.unlock();
  const piece=level.pieces.find(candidate=>candidate.id===selectedHint&&!state.removed.has(candidate.id))||level.pieces.find(candidate=>!state.removed.has(candidate.id));
  if(piece)finishMove(piece);
});
window.addEventListener("resize",resize);

function reload(n=levelNo){
  levelNo=n;
  level=generateLevel(levelNo,seed);
  state=new GameState(level);
  localStorage.setItem("arrowLevel",levelNo);
  selectedHint=null;
  document.querySelector("#win-overlay").hidden=true;
  resize();
}

document.querySelector("#undo-button").onclick=()=>{if(state.undo()){sound.play("tap");draw()}};
document.querySelector("#reset-button").onclick=()=>{state.reset();draw()};
document.querySelector("#hint-button").onclick=()=>{
  selectedHint=level.order.find(id=>!state.removed.has(id));
  hint.textContent=tr("hintText",lang);
  hint.classList.add("show");
  draw();
  setTimeout(()=>{hint.classList.remove("show");selectedHint=null;draw()},1500);
};
document.querySelector("#next-button").onclick=()=>reload(levelNo+1);
document.querySelector("#replay-button").onclick=()=>reload(levelNo);

const settingsOverlay=document.querySelector("#settings-overlay");
document.querySelector("#settings-button").onclick=()=>{sound.play("tap");settingsOverlay.hidden=false};
document.querySelector("#close-settings").onclick=()=>settingsOverlay.hidden=true;
document.querySelectorAll("[data-close]").forEach(x=>x.onclick=()=>settingsOverlay.hidden=true);
function toggle(id,key){
  const b=document.querySelector(id);
  b.classList.toggle("on",settings[key]);
  b.onclick=()=>{
    settings[key]=!settings[key];
    localStorage.setItem(key==="sound"?"soundEnabled":"hapticsEnabled",String(settings[key]));
    b.classList.toggle("on",settings[key]);
  };
}
toggle("#sound-toggle","sound");
toggle("#haptics-toggle","haptics");
document.querySelector("#reset-best").onclick=()=>{localStorage.removeItem("arrowLevel");reload(1)};

const hub=new URLSearchParams(location.search).get("hub")||"https://mpmisha.github.io/playground/";
const hubOrigin=new URL(hub).origin;
const back=document.querySelector("#back-games");
if(new URLSearchParams(location.search).has("hub")){
  back.hidden=false;
  back.onclick=()=>window.parent!==window?window.parent.postMessage({type:"playground:back"},hubOrigin):location.href=hub;
}
window.addEventListener("message",e=>{
  if(e.origin!==hubOrigin||e.data?.type!=="playground:lang")return;
  lang=applyLang(e.data.lang);
  draw();
});

if(!validateLevel(level))reload(levelNo);
if("serviceWorker"in navigator)navigator.serviceWorker.register("./service-worker.js");
resize();
