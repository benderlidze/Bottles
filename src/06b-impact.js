'use strict';
function spawnGlassFragment(ob,parts,sourceBody,referenceCenter=new THREE.Vector3(),cap=null){
  const center=new THREE.Vector3();let mass=0;
  for(const p of parts){center.addScaledVector(p.center,p.mass);mass+=p.mass;}center.multiplyScalar(1/mass);
  const localOffset=center.clone().sub(referenceCenter),offset=new CANNON.Vec3(localOffset.x,localOffset.y,localOffset.z);
  const wp=sourceBody.pointToWorldFrame(offset),group=new THREE.Group();
  const body=new CANNON.Body({mass:mass+(cap ? .02 : 0),material:glassPhys,position:wp,linearDamping:.025,angularDamping:.055,collisionFilterGroup:8,collisionFilterMask:4,sleepSpeedLimit:.16,sleepTimeLimit:.8});
  body.quaternion.copy(sourceBody.quaternion);body.sourceBottle=ob.body;body.detachedAt=simTime;
  const glass=[],paper=[];
  for(const p of parts){
    const mesh=new THREE.Mesh(p.geo);mesh.position.copy(center).negate();glass.push(mesh);
    if(p.label){const label=new THREE.Mesh(p.label.geometry);label.position.copy(center).negate();paper.push(label);}
    // Keep each shard's thin oriented collider. A giant axis-aligned box around
    // a curved cluster would make glass hover and bounce like a wooden block.
    const shape=setShapeGroup(new CANNON.Box(p.shape.halfExtents.clone()),SG.DEBRIS);
    body.addShape(shape,new CANNON.Vec3(p.shapeOffset.x-center.x,p.shapeOffset.y-center.y,p.shapeOffset.z-center.z),p.shapeQuat);
  }
  const geo=mergeMeshes(glass);group.add(new THREE.Mesh(geo,fragmentMats[ob.idx]),new THREE.LineSegments(new THREE.EdgesGeometry(geo,38),edgeMat));
  if(paper.length)group.add(new THREE.Mesh(mergeMeshes(paper),labels[ob.idx]));
  if(cap){cap.removeFromParent();cap.position.copy(center).negate();group.add(cap);}
  sourceBody.quaternion.vmult(offset,offset);sourceBody.angularVelocity.cross(offset,body.velocity);body.velocity.vadd(sourceBody.velocity,body.velocity);body.angularVelocity.copy(sourceBody.angularVelocity);
  group.position.copy(wp);group.quaternion.copy(body.quaternion);scene.add(group);world.addBody(body);
  const fragment={mesh:group,body,parts,ob,localCenter:center,cap,age:0,enableAt:simTime+.08,secondary:false};
  body.lastSound=-1;
  body.addEventListener('collide',event=>{
    const speed=Math.abs(event.contact.getImpactVelocityAlongNormal());
    if(speed>.45&&simTime-body.lastSound>.12){body.lastSound=simTime;shardSound(body.position,speed,body.mass);}
    if(parts.length>1&&speed>2.2&&.5*body.mass*speed*speed>2.2&&!fragment.secondary){const c=event.contact,offset=c.bi===body?c.ri:c.rj,local=body.pointToLocalFrame(body.position.vadd(offset));fragment.pendingImpact={energy:.5*body.mass*speed*speed,point:new THREE.Vector3(local.x,local.y,local.z).add(center)};fragment.secondary=true;secondaryBreaks.add(fragment);}
  });
  debris.push(fragment);return fragment;
}
const secondaryBreaks=new Set();
function splitFallenFragments(){
  for(const fragment of secondaryBreaks){
    const index=debris.indexOf(fragment);if(index<0)continue;
    fragment.secondary=false;if(fragment.parts.length<2)continue;
    const eligible=new Set(fragment.parts.map(p=>p.id));
    breakGlassBonds(fragment.ob,fragment.pendingImpact,eligible);
    const groups=glassComponents(fragment.ob,eligible);if(groups.length===1)continue;
    let cap=fragment.cap;
    for(const group of groups){const takesCap=cap&&group.some(p=>p.touchesTop);spawnGlassFragment(fragment.ob,group,fragment.body,fragment.localCenter,takesCap?cap:null);if(takesCap)cap=null;}
    world.removeBody(fragment.body);clearObject(fragment.mesh);debris.splice(index,1);
  }
  secondaryBreaks.clear();
}
function detach(ob,parts,hit){
  const attr=ob.shell.geometry.attributes.position;
  for(const p of parts){
    p.attached=false;ob.attachedCount--;ob.remainingArea-=p.area;ob.body.removeShape(p.shape);
    for(let i=p.offset;i<p.offset+p.count;i++)attr.setXYZ(i,0,0,0);
    if(p.label){const a=ob.labelMesh.geometry.attributes.position;for(let i=p.labelOffset;i<p.labelOffset+p.labelCount;i++)a.setXYZ(i,0,0,0);a.needsUpdate=true;}
  }
  const takesCap=!ob.capDetached&&parts.some(p=>p.touchesTop)&&!ob.parts.some(p=>p.attached&&p.touchesTop);
  if(takesCap)ob.capDetached=true;
  const fragment=spawnGlassFragment(ob,parts,ob.body,new THREE.Vector3(),takesCap?ob.cap:null);
  attr.needsUpdate=true;ob.shell.geometry.computeBoundingSphere();
  for(const p of ob.parts)if(p.attached&&p.neighbors.some(id=>!ob.parts[id].attached)){
    const a=p.geo.attributes.position;for(let i=p.geo.userData.surfaceCount;i<p.count;i++)attr.setXYZ(p.offset+i,a.getX(i),a.getY(i),a.getZ(i));
  }
  syncBottleMass(ob,true);ob.body.wakeUp();refreshProxies(ob);return fragment;
}

function damageBottle(ob,hit){
  if(ob.dead||!ob.attachedCount||simTime-ob.lastHit<.06)return {fragments:0};
  ob.lastHit=simTime;ob.damage+=Math.max(0,hit.energy);
  const result=breakGlassBonds(ob,hit),fragments=[];
  for(const component of glassComponents(ob)){
    if(component.some(p=>p.touchesBottom))continue;
    fragments.push(detach(ob,component,hit));
  }
  drawBondCracks(ob);updateRim(ob);
  ob.sloshV.x+=THREE.MathUtils.clamp(hit.point.x,-.3,.3)*Math.min(4,hit.energy*.04);
  ob.sloshV.y+=Math.min(1.5,hit.energy*.015);
  if(!fragments.length){glassImpact(ob,hit,result.broken);return {fragments:0,bonds:result.broken};}
  countBroken(ob);scatterFragments(ob,fragments,hit);
  // Spill only where the shell actually opened, at the lowest edge of each
  // detached component. The remaining liquid then drains through those holes.
  for(const fragment of fragments.slice(0,10)){
    const bottom=fragment.parts.reduce((a,b)=>a.y0<b.y0?a:b);
    if(ob.holes.length<16)createLeak(ob,bottom);
  }
  const detachedMass=fragments.reduce((sum,f)=>sum+f.body.mass,0),fraction=Math.min(1,detachedMass/GLASS_MASS);
  const amount=Math.min(ob.fluid,ob.fluid*fraction*.7),number=Math.min(75,Math.ceil(amount/.0015));ob.fluid-=amount;
  const p=new THREE.Vector3().copy(ob.body.pointToWorldFrame(new CANNON.Vec3(hit.point.x,hit.point.y,hit.point.z)));
  const direction=new THREE.Vector3(hit.incoming?.x||0,hit.incoming?.y||0,hit.incoming?.z||-1).normalize();
  for(let i=0;i<number;i++)emitDrop(p,new THREE.Vector3().copy(ob.body.velocity).addScaledVector(direction,rnd(.3,1.5)).add(new THREE.Vector3(rnd(-.8,.8),rnd(-.3,.9),rnd(-.6,.6))),ob.idx,amount/number,rnd(.5,1.2));
  syncBottleMass(ob,true);fractureSound(ob,hit,fragments,result.spent);shake=Math.min(.045,shake+Math.sqrt(hit.energy)*.001);
  for(const other of [...bottles,...planks])if(other.body.position.distanceTo(ob.body.position)<3)other.body.wakeUp();
  return {fragments:fragments.length,bonds:result.broken,mass:detachedMass};
}
