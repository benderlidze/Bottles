'use strict';
// GIANT mode: one huge bottle (twice the normal size, random brand) stands in the middle of the table.
// Once most of its glass is gone it collapses, and the next giant appears in the same spot.
const GIANT_SMASH=.5,GIANT_COLLAPSE_AT=.35,GIANT_NEXT_AT=1.1;
let giant=null,giantSmashed=0,giantLast=-1;
function giantHud(){$('broken').textContent=String(giantSmashed).padStart(2,'0');$('broken').nextElementSibling.textContent='SMASHED';}
function startGiant(){giant=null;giantSmashed=0;giantLast=-1;giantHud();spawnGiant();showToast('Smash the giant bottle — a new one appears right away.');}
function spawnGiant(){
 let pick;do pick=(Math.random()*BASE_BRANDS)|0;while(pick===giantLast&&BASE_BRANDS>1);giantLast=pick;
 // Shards of the previous bottle lying around the spot stay where they are, just without physics.
 for(let i=debris.length-1;i>=0;i--){const d=debris[i],p=d.body.position;if(p.y>.5||Math.abs(p.x)>1.8||Math.abs(p.z)>1.8)continue;
  world.removeBody(d.body);d.mesh.position.copy(p);d.mesh.quaternion.copy(d.body.quaternion);bakeStatic(d.mesh);debris.splice(i,1);}
 const ob=addBottle(0,0,BASE_BRANDS+pick);ob.spawnAt=simTime;ob.group.scale.setScalar(.7);resetAt=simTime;
 giant={ob,phase:'standing',at:0};shadowFrames=3;
}
// The rest of the glass lets go in one go, so the stump never blocks the next bottle.
function shatterRemains(ob){
 for(const bond of ob.bonds)bond.health=0;
 const rest=ob.parts.filter(p=>p.attached);if(!rest.length)return;
 const point=rest.reduce((v,p)=>v.add(p.center),new THREE.Vector3()).multiplyScalar(1/rest.length);
 const hit={energy:20,speed:3,point,other:null,incoming:new THREE.Vector3(0,-.3,-1),ballistic:false};
 const fragments=rest.map(p=>detach(ob,[p],hit));
 drawBondCracks(ob);updateRim(ob);scatterFragments(ob,fragments,hit);fractureSound(ob,hit,fragments,10);
}
// Whatever is left in the bottle splashes onto the table when it is removed.
function spillRest(ob){
 const amount=ob.fluid,base=ob.body.position,n=48;if(amount<=.001)return;ob.fluid=0;
 for(let i=0;i<n;i++){const a=Math.random()*TAU,r=rnd(.1,.9);
  emitDrop(new THREE.Vector3(base.x+Math.cos(a)*r*.5,.06,base.z+Math.sin(a)*r*.5),new THREE.Vector3(Math.cos(a)*r*2,rnd(.6,2.4),Math.sin(a)*r*1.4),ob.idx,amount/n,rnd(.8,1.5));}
}
function updateGiant(){
 if(gameMode!=='giant'||!started||!giant)return;
 const {ob}=giant,age=simTime-ob.spawnAt;
 if(age<.2)ob.group.scale.setScalar(.7+.3*Math.sin(age/.2*Math.PI/2));else if(ob.group.scale.x!==1)ob.group.scale.setScalar(1);
 if(giant.phase==='standing'){
  const lost=ob.remainingArea<=ob.shellArea*GIANT_SMASH,away=Math.abs(ob.body.position.x)>10||ob.body.position.y<-1;
  if(!lost&&!away)return;
  giant.phase=away&&!lost?'away':'collapsing';giant.at=simTime;
  if(lost){giantSmashed++;giantHud();showToast('Smashed!');}
 }
 if(giant.phase==='collapsing'&&simTime-giant.at>=GIANT_COLLAPSE_AT){giant.phase='collapsed';shatterRemains(ob);}
 if(simTime-giant.at>=GIANT_NEXT_AT&&giant.phase!=='standing'){spillRest(ob);removeBottle(ob);spawnGiant();}
}
