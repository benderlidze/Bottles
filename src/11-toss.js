'use strict';
// TOSS mode: bottles are flung into the air one at a time - hit each one with the ball before it touches anything.
// The ball needs ~0.5 s to reach the bottle plane, so you have to lead the target. Later bottles fly faster and spin more.
const TOSS_ROUND=10,TOSS_KEEP=6;
// in toss mode only the game's own messages are shown, crack/chip toasts would drown out "Hit!"
const baseToast=showToast;let tossSpeaking=false;showToast=text=>{if(gameMode!=='toss'||tossSpeaking)baseToast(text);};
function tossSay(text,ms=2100){tossSpeaking=true;showToast(text);tossSpeaking=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),ms);}
let toss=null,tossCount=0,tossHits=0,tossStreak=0,tossBest=0,tossNextAt=0,tossOverShown=false;
function tossHud(){$('broken').innerHTML=String(tossHits).padStart(2,'0')+`<span style="display:inline;font-size:14px"> / ${String(tossCount).padStart(2,'0')}</span>`;$('broken').nextElementSibling.textContent='HITS';}
function pyramidHud(){$('broken').innerHTML=String(broken).padStart(2,'0')+'<span style="display:inline;font-size:14px"> / 15</span>';$('broken').nextElementSibling.textContent='DAMAGED';}
function startTossRound(){toss=null;tossCount=tossHits=tossStreak=0;tossOverShown=false;tossNextAt=simTime+1.2;tossHud();tossSay('Toss mode: hit the bottle before it lands. Lead your shot!',3000);}
function removeBottle(ob){const i=bottles.indexOf(ob);if(i<0)return;clearObject(ob.group);for(const part of ob.parts)if(part.attached){part.geo.dispose();part.label?.geometry.dispose();}for(const h of ob.holes)clearObject(h.stream);world.removeBody(ob.body);breakQueue.delete(ob);bottles.splice(i,1);}
function launchToss(){const side=Math.random()<.5?-1:1,idx=(Math.random()*brands.length)|0,x0=side*rnd(6,7.5),ob=addBottle(x0,.4,idx),level=tossCount/TOSS_ROUND;
const apexY=rnd(4.5,7),apexX=rnd(-3,3),vy=Math.sqrt(2*9.81*(apexY-ob.body.position.y)),vx=(apexX-x0)/(vy/9.81)*(1+level*.5);
ob.body.wakeUp();ob.body.velocity.set(vx,vy,0);ob.body.angularVelocity.set(rnd(-1,1),rnd(-1,1),-side*rnd(2,4+level*6));
const t={ob,hit:false,done:false,start:simTime};toss=t;tossCount++;tossHud();whoosh();
// first contact decides: the ball -> hit, anything else (table, old bottles) -> miss
ob.body.addEventListener('collide',e=>{if(t.done)return;t.hit=!!e.body.ball;resolveToss(t);});
while(bottles.length>TOSS_KEEP)removeBottle(bottles[0]);}
function resolveToss(t){t.done=true;if(t.hit){tossHits++;tossStreak++;tossBest=Math.max(tossBest,tossStreak);tossSay(tossStreak>2?`${tossStreak} in a row!`:'Hit!');}else{tossStreak=0;tossSay('Missed. It landed.');}tossHud();tossNextAt=simTime+1.1;}
function updateToss(){if(gameMode!=='toss'||!started)return;if(toss&&!toss.done){const p=toss.ob.body.position;if(p.y<-2||Math.abs(p.x)>14||simTime-toss.start>8)resolveToss(toss);return;}if(simTime<tossNextAt)return;
if(tossCount<TOSS_ROUND){launchToss();return;}if(!tossOverShown){tossOverShown=true;tossSay(`Round over: ${tossHits} / ${TOSS_ROUND} · best streak ${tossBest} · R to play again`,7000);}}
(function tossLoop(){requestAnimationFrame(tossLoop);updateToss();})();
function toggleMode(){gameMode=gameMode==='toss'?'pyramid':'toss';$('mode').textContent=gameMode==='toss'?'PYRAMID':'TOSS MODE';$('mode').classList.toggle('on',gameMode==='toss');rebuild();if(gameMode==='pyramid')pyramidHud();shadowFrames=3;}
$('mode').onclick=toggleMode;document.addEventListener('keydown',e=>{if(e.target.tagName!=='INPUT'&&e.key.toLowerCase()==='t')toggleMode();});
