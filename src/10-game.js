'use strict';
const raycaster=new THREE.Raycaster(),aim=new THREE.Vector2(0,0),target=new THREE.Vector3(),aimPlane=new THREE.Plane(new THREE.Vector3(0,0,1),0);
const ballMaterial=new THREE.MeshStandardMaterial({color:0xcbd1cf,metalness:1,roughness:.12});const ballGeo=new THREE.SphereGeometry(.105,32,24);
// Launch in camera space: the ball always starts at the lower screen edge.
const launchNDC=new THREE.Vector2(0,-.84),launchRay=new THREE.Raycaster();
const trajectoryGeo=new THREE.BufferGeometry();trajectoryGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(32*3),3));
const trajectory=new THREE.Points(trajectoryGeo,new THREE.PointsMaterial({color:0xf2cc8f,size:.035,transparent:true,opacity:.65,depthWrite:false}));trajectory.frustumCulled=false;scene.add(trajectory);
const aimBox=new THREE.Box3(),aimMatrix=new THREE.Matrix4(),aimLocalRay=new THREE.Ray(),aimHit=new THREE.Vector3(),aimScale=new THREE.Vector3(1,1,1);
function aimAtDepth(){
 if(!raycaster.ray.intersectPlane(aimPlane,target))return false;let nearest=Infinity;
 for(const ob of bottles){if(!ob.attachedCount)continue;const b=brands[ob.idx];aimMatrix.compose(ob.body.position,ob.body.quaternion,aimScale).invert();aimLocalRay.copy(raycaster.ray).applyMatrix4(aimMatrix);aimBox.min.set(-b.w/2,-b.h/2,-b.depth/2);aimBox.max.set(b.w/2,b.h/2,b.depth/2);if(!aimLocalRay.intersectBox(aimBox,aimHit))continue;aimHit.applyMatrix4(aimMatrix.invert());const d=aimHit.distanceToSquared(camera.position);if(d<nearest){nearest=d;target.copy(aimHit);}}
 return true;
}
function shotPath(power){
 camera.updateMatrixWorld();launchRay.setFromCamera(launchNDC,camera);raycaster.setFromCamera(aim,camera);
 if(!aimAtDepth())return null;
 const origin=launchRay.ray.at(3.6,new THREE.Vector3()),delta=target.clone().sub(origin);
 const flight=delta.length()/(6+power*.32),velocity=delta.divideScalar(flight);velocity.y+=4.905*flight;
 return {origin,velocity,flight};
}
function updateLauncher(){
 trajectory.visible=started&&charging;
 if(!trajectory.visible)return;const path=shotPath(Math.min(100,+$('power').value+(performance.now()-chargeStart)/24));if(!path){trajectory.visible=false;return;}
 if(trajectory.visible){const a=trajectoryGeo.attributes.position;for(let i=0;i<32;i++){const t=path.flight*i/31;a.setXYZ(i,path.origin.x+path.velocity.x*t,path.origin.y+path.velocity.y*t-4.905*t*t,path.origin.z+path.velocity.z*t);}a.needsUpdate=true;}
}
function fire(power){
 if(!started)return false;try{initAudio();}catch{}const path=shotPath(power);if(!path)return false;
 const {origin,velocity}=path,mesh=new THREE.Mesh(ballGeo,ballMaterial);mesh.castShadow=true;mesh.position.copy(origin);scene.add(mesh);
 const body=new CANNON.Body({mass:.28,material:steelPhys,shape:new CANNON.Sphere(.105),position:new CANNON.Vec3(origin.x,origin.y,origin.z),velocity:new CANNON.Vec3(velocity.x,velocity.y,velocity.z),linearDamping:0,angularDamping:.25,collisionFilterGroup:2,collisionFilterMask:31});
 body.ball=true;body.lastSound=-1;body.addEventListener('collide',e=>{const speed=Math.abs(e.contact.getImpactVelocityAlongNormal());if(speed>.8&&simTime-body.lastSound>.12){body.lastSound=simTime;impactSound(body.position.x,speed,e.body.bottle?'glass':'wood');}});world.addBody(body);balls.push({mesh,body,age:0});shots++;whoosh(power);refreshRoundHUD();
 while(balls.length>12){const o=balls.shift();scene.remove(o.mesh);world.removeBody(o.body);}return true;
}
let charging=false,chargeStart=0,pointerID=null;function setAim(e){let rect=renderer.domElement.getBoundingClientRect();aim.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);$('cross').style.left=e.clientX+'px';$('cross').style.top=e.clientY+'px';}
renderer.domElement.addEventListener('pointermove',setAim);renderer.domElement.addEventListener('pointerdown',e=>{if(!started||charging||e.button>0)return;setAim(e);charging=true;chargeStart=performance.now();pointerID=e.pointerId;renderer.domElement.setPointerCapture(e.pointerId);});renderer.domElement.addEventListener('pointerup',e=>{if(!charging||e.pointerId!==pointerID)return;setAim(e);charging=false;if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);fire(Math.min(100,+$('power').value+(performance.now()-chargeStart)/24));$('charge').style.width='0';});renderer.domElement.addEventListener('pointercancel',()=>{charging=false;$('charge').style.width='0';});
addEventListener('blur',()=>{charging=false;$('charge').style.width='0';});
$('power').oninput=()=>{$('powerLabel').textContent=$('power').value+'%';};function toggleSlow(){slow=!slow;$('slow').classList.toggle('on',slow);$('slow').setAttribute('aria-pressed',String(slow));$('slow').textContent=slow?'0.25× · ON':'0.25×';} $('slow').onclick=toggleSlow;function resetGame(){charging=false;$('charge').style.width='0';rebuild();shadowFrames=3;} $('reset').onclick=resetGame;$('sound').onclick=()=>{initAudio();muted=!muted;master.gain.setTargetAtTime(muted?0:+$('volume').value*.6,ac.currentTime,.02);$('sound').textContent=muted?'SOUND OFF':'SOUND ON';$('sound').setAttribute('aria-pressed',String(!muted));};$('volume').oninput=()=>{if(ac)master.gain.setTargetAtTime(muted?0:+$('volume').value*.6,ac.currentTime,.02);};$('start').onclick=async()=>{$('start').disabled=true;try{await initAudio();}catch(e){$('sound').textContent='SOUND UNAVAILABLE';}started=true;$('intro').style.display='none';};document.addEventListener('keydown',e=>{if(e.target.closest('input,select,textarea,[contenteditable=true]'))return;if(e.key.toLowerCase()==='r')resetGame();if(e.code==='Space'&&!e.target.closest('button')){e.preventDefault();toggleSlow();}});
let toastTimer;function showToast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2100);}
function resize(){const w=innerWidth,h=innerHeight;camera.aspect=w/h;const distance=24;baseCamera.set(focus.x,focus.y+1.6,(w/h<.85?Math.max(distance,distance*.85/(w/h)):distance)/zoom);camera.position.copy(baseCamera);camera.lookAt(focus);camera.updateProjectionMatrix();renderer.setSize(w,h);}addEventListener('resize',resize);resize();renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();setAim(e);raycaster.setFromCamera(aim,camera);const p=new THREE.Vector3();raycaster.ray.intersectPlane(aimPlane,p);const oldZoom=zoom;zoom=THREE.MathUtils.clamp(zoom*Math.exp(-e.deltaY*.0012),1,2.6);if(zoom===1)focus.set(0,viewFocusY(),0);else if(e.deltaY<0){focus.lerp(p,1-oldZoom/zoom);focus.x=THREE.MathUtils.clamp(focus.x,-3,3);focus.y=THREE.MathUtils.clamp(focus.y,1,9);}resize();},{passive:false});
function refreshRoundHUD(){if(gameMode==='pyramid'){$('broken').textContent=String(broken).padStart(2,'0')+' / '+bottles.length;$('broken').nextElementSibling.textContent='DAMAGED';}else if(gameMode==='giant')giantHud();}
// The first rebuild and the start button wait for the shader warm-up (13-warmup.js).
let warming=true;let prev=performance.now(),acc=0;const step=1/120,maxPhysicsSteps=8;
// Under heavy load the simulation briefly slows down instead of piling up more steps every frame (the "spiral of death").
const PHYSICS_BUDGET_MS=12;
// Shadows are re-rendered only while something moves.
renderer.shadowMap.autoUpdate=false;let shadowFrames=3,lastShadowAt=0;$('reset').addEventListener('click',()=>shadowFrames=3);addEventListener('keydown',e=>{if(e.key.toLowerCase()==='r')shadowFrames=3;});
// Keep opaque print at least one rendered pixel per CSS pixel. Reduce the
// separate refraction buffer first; a slow burst must not permanently cap quality.
const maxPR=Math.min(devicePixelRatio,2),minPR=Math.min(1,maxPR);let pixelRatio=maxPR,frameEMA=16.7,prChangedAt=0;
function adaptQuality(now,dtSec){
 if(document.hidden)return;frameEMA+=(Math.min(100,dtSec*1000)-frameEMA)*.06;if(now-prChangedAt<1500)return;
 if(frameEMA>20){
  if(renderer.transmissionResolutionScale>.5)renderer.transmissionResolutionScale=.5;
  else if(pixelRatio>minPR){pixelRatio=Math.max(minPR,pixelRatio-.125);renderer.setPixelRatio(pixelRatio);}
  else return;
  prChangedAt=now;
 }else if(frameEMA<15&&now-prChangedAt>5000){
  if(pixelRatio<maxPR){pixelRatio=Math.min(maxPR,pixelRatio+.125);renderer.setPixelRatio(pixelRatio);}
  else if(renderer.transmissionResolutionScale<.7)renderer.transmissionResolutionScale=.7;
  else return;
  prChangedAt=now;
 }
}
// Only bottles (labels, caps), planks, balls and a shard carrying a cap cast shadows; flying glass does not.
function shadowCastersMoving(){for(const o of bottles)if(o.body.sleepState!==2)return true;for(const o of planks)if(o.body.sleepState!==2)return true;for(const o of balls)if(o.body.sleepState!==2)return true;for(const d of debris)if(d.cap&&d.body.sleepState!==2)return true;return false;}
const vec=new THREE.Vector3(),normal=new THREE.Vector3(),invQ=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0);
// Sleeping stack bodies never notice that their support moved or broke away -> they hang in the air. Wake sleeping bottles/planks above anything that moves.
const stackBodies=[];function wakeStack(){stackBodies.length=0;for(const o of bottles)stackBodies.push(o.body);for(const o of planks)stackBodies.push(o.body);for(const m of stackBodies){if(m.sleepState===2||(m.velocity.lengthSquared()<.01&&m.angularVelocity.lengthSquared()<.01))continue;for(const s of stackBodies)if(s.sleepState===2&&s.position.y>m.position.y-.6&&Math.abs(s.position.x-m.position.x)<3&&Math.abs(s.position.z-m.position.z)<2.5)s.wakeUp();for(const d of debris){const b=d.body;if(b.sleepState===2&&b.position.y>.5&&b.position.y>m.position.y-.6&&Math.abs(b.position.x-m.position.x)<3&&Math.abs(b.position.z-m.position.z)<2.5)b.wakeUp();}}}
// cannon has no rolling resistance: slow, low bodies (rolling bottles, balls, rocking shards) would never fall asleep. Bleed off their last bit of motion.
function settleDamping(){for(const b of world.bodies){if(b.mass===0||b.sleepState===2)continue;const v=b.velocity.lengthSquared(),w=b.angularVelocity.lengthSquared();if(v<.16&&w<1){b.velocity.scale(.985,b.velocity);b.angularVelocity.scale(.97,b.angularVelocity);}if(b.ball&&b.position.y<.2){b.velocity.scale(.993,b.velocity);b.angularVelocity.scale(.993,b.angularVelocity);}if(b.position.y<-.6&&!b.bottle){b.velocity.set(0,0,0);b.sleep();}}}
// Keep moving debris in contact with the table, shelves and bottles. Only
// sleeping pieces near the table are baked; airborne fragments retain physics.
const DEBRIS_MAX=240;
function settleDebris(dt){let removed=false;for(let i=0;i<debris.length;i++){const d=debris[i],b=d.body;if(b.position.y<-3||Math.abs(b.position.x)>24||Math.abs(b.position.z)>24||(d.age||0)>45){world.removeBody(b);clearObject(d.mesh);debris[i]=null;removed=true;continue;}if(d.enableAt)continue;d.age=(d.age||0)+dt;if(b.sleepState!==2||b.position.y>.5)continue;world.removeBody(b);d.mesh.position.copy(b.position);d.mesh.quaternion.copy(b.quaternion);bakeStatic(d.mesh);debris[i]=null;removed=true;}
if(removed)debris=debris.filter(Boolean);while(debris.length>DEBRIS_MAX){const d=debris.shift();world.removeBody(d.body);clearObject(d.mesh);}}
// Sphere sweeps own all ball/shell contacts, avoiding both tunnelling and a
// duplicate impulse from the coarser rigid-body collision shapes.
const _sw0=new CANNON.Vec3(),_sw1=new CANNON.Vec3(),_swp=new THREE.Vector3();
function insideBottle(b,p,pad){if(p.y<-b.h/2-pad||p.y>b.h/2+pad)return false;const {rx,rz,power:exponent}=bottleSection(b,p.y,-pad);return Math.pow(Math.abs(p.x)/rx,exponent)+Math.pow(Math.abs(p.z)/rz,exponent)<=1;}
function glassSurfaceNormal(b,p){if(Math.abs(p.y)>=b.h/2-.026)return new THREE.Vector3(0,Math.sign(p.y),0);
 const field=(x,y,z)=>{const {rx,rz,power}=bottleSection(b,y);return Math.pow(Math.abs(x)/rx,power)+Math.pow(Math.abs(z)/rz,power);};
 const e=.001;return new THREE.Vector3(field(p.x+e,p.y,p.z)-field(p.x-e,p.y,p.z),field(p.x,p.y+e,p.z)-field(p.x,p.y-e,p.z),field(p.x,p.y,p.z+e)-field(p.x,p.y,p.z-e)).normalize();
}
function sweepBalls(dt){
 for(const shot of balls){const ball=shot.body;if(ball.velocity.length()<.5)continue;let earliest=null;
  for(const ob of bottles){const b=brands[ob.idx],body=ob.body;if(!ob.attachedCount||simTime-ob.lastHit<.06||ball.position.distanceTo(body.position)>b.h/2+.7+ball.velocity.length()*dt)continue;
   body.pointToLocalFrame(ball.position,_sw0);_sw1.set(ball.position.x+(ball.velocity.x-body.velocity.x)*dt,ball.position.y+(ball.velocity.y-body.velocity.y)*dt,ball.position.z+(ball.velocity.z-body.velocity.z)*dt);body.pointToLocalFrame(_sw1,_sw1);
   let prevIn=insideBottle(b,_swp.set(_sw0.x,_sw0.y,_sw0.z),.105);
   for(let k=1;k<=12;k++){const t=k/12;_swp.set(_sw0.x+(_sw1.x-_sw0.x)*t,_sw0.y+(_sw1.y-_sw0.y)*t,_sw0.z+(_sw1.z-_sw0.z)*t);const inside=insideBottle(b,_swp,.105);
    if(inside!==prevIn){const entry=surfaceProject(b,_swp.clone());entry.y=THREE.MathUtils.clamp(entry.y,-b.h/2+.025,b.h/2-.025);let nearest=null,best=Infinity;
     for(const p of ob.parts){const d=p.center.distanceToSquared(entry);if(d<best){best=d;nearest=p;}}
     if(nearest?.attached&&(!earliest||t<earliest.t))earliest={ob,entry,t};
    }prevIn=inside;
   }
  }
  if(earliest)ballStrike(earliest.ob,shot,earliest.entry);
 }
}
function ballStrike(ob,shot,entry){
 if(gameMode==='toss'&&toss&&toss.ob===ob&&!toss.done){toss.hit=true;resolveToss(toss);}
 const ball=shot.body,body=ob.body,point=body.pointToWorldFrame(new CANNON.Vec3(entry.x,entry.y,entry.z)),r=point.vsub(body.position);
 const localNormal=glassSurfaceNormal(brands[ob.idx],entry),n=body.quaternion.vmult(new CANNON.Vec3(localNormal.x,localNormal.y,localNormal.z));
 const contactVelocity=body.angularVelocity.cross(r).vadd(body.velocity),relative=ball.velocity.vsub(contactVelocity);
 if(relative.dot(n)>0)n.negate(n);const speed=-relative.dot(n);if(speed<.1)return;
 const cross=r.cross(n),rot=body.invInertiaWorld.vmult(cross).cross(r),inverseMass=1/ball.mass+1/body.mass+n.dot(rot),mu=1/Math.max(.0001,inverseMass);
 const energy=.5*mu*speed*speed,incoming=relative.clone(),coupling=energy>6?.62:1;
 const impulse=n.scale((1+.12)*speed*mu*coupling);ball.velocity.vadd(impulse.scale(1/ball.mass),ball.velocity);body.wakeUp();body.applyImpulse(impulse.negate(),r);
 ball.position.copy(point.vadd(n.scale(.108)));ball.aabbNeedsUpdate=true;
 damageBottle(ob,{speed,energy,point:entry.clone(),other:ball,incoming,ballistic:true});
}
function tickPhysics(dt){simTime+=dt;wakeStack();sweepBalls(dt);for(const d of debris)if(d.enableAt&&simTime>=d.enableAt){d.body.collisionFilterMask=23;d.enableAt=0;}world.step(dt);settleDamping();for(const [ob,hit]of breakQueue)damageBottle(ob,hit);breakQueue.clear();splitFallenFragments();}
function animate(now){requestAnimationFrame(animate);if(document.hidden||warming){prev=now;acc=0;return;}const realDt=Math.min((now-prev)/1000,.06);prev=now;const dt=started?realDt*(slow?.25:1):0;acc=Math.min(acc+dt,step*maxPhysicsSteps);let physicsSteps=0;const physicsStart=performance.now();while(acc>=step&&physicsSteps<maxPhysicsSteps){tickPhysics(step);acc-=step;physicsSteps++;if(performance.now()-physicsStart>PHYSICS_BUDGET_MS){acc=Math.min(acc,step);break;}}if(physicsSteps)settleDebris(physicsSteps*step);adaptQuality(now,realDt);for(const ob of bottles){updateFluid(ob,dt);syncBottleMass(ob);}for(const o of planks){o.mesh.position.copy(o.body.position);o.mesh.quaternion.copy(o.body.quaternion);}for(const o of debris){o.mesh.position.copy(o.body.position);o.mesh.quaternion.copy(o.body.quaternion);}for(let i=balls.length-1;i>=0;i--){const o=balls[i];o.age+=dt;if(o.age>12||Math.abs(o.body.position.z)>45||Math.abs(o.body.position.x)>30){scene.remove(o.mesh);world.removeBody(o.body);balls.splice(i,1);continue;}o.mesh.position.copy(o.body.position);o.mesh.quaternion.copy(o.body.quaternion);}updateDrops(dt);shake*=.88;camera.position.copy(baseCamera);camera.position.x+=rnd(-shake,shake);camera.position.y+=rnd(-shake,shake);camera.lookAt(focus);if(charging){const c=Math.min(100,+$('power').value+(performance.now()-chargeStart)/24);$('charge').style.width=c+'%';}if(shadowFrames>0||(now-lastShadowAt>1000/30&&shadowCastersMoving())){lastShadowAt=now;renderer.shadowMap.needsUpdate=true;shadowFrames--;}if(typeof updateToss==='function')updateToss();if(typeof updateGiant==='function')updateGiant();flushImpactAudio();updateLauncher();syncDebrisBatches();renderer.render(scene,camera);}
requestAnimationFrame(animate);
window.bottleLab={getState:()=>({mode:gameMode,drawCalls:renderer.info.render.calls,bodies:world.bodies.length,pixelRatio,broken,shots,fragments:debris.length,drops:drops.length,puddles:puddles.length,slow,started,audioReady:Object.keys(soundBuffers),bottles:bottles.map(b=>({name:brands[b.idx].name,height:brands[b.idx].h,damage:b.damage,perforations:b.perforations||0,parts:b.parts.filter(p=>p.attached).length,holes:b.holes.length,fluid:b.fluid,drift:b.body.position.distanceTo(b.initial)}))}),throwAt:(index,p=35)=>{camera.updateMatrixWorld();const t=new THREE.Vector3().copy(bottles[index].body.position).project(camera);aim.set(t.x,t.y);fire(p);},aimAndThrow:(x,y,p=35)=>{aim.set(x,y);fire(p);},advance:(seconds)=>{for(let i=0;i<seconds*120;i++){tickPhysics(step);for(const b of bottles){updateFluid(b,step);syncBottleMass(b);}updateDrops(step);settleDebris(step);updateToss();if(typeof updateGiant==='function')updateGiant();}},inspectHit:(index,energy,ballistic=false)=>{const b=bottles[index],brand=brands[b.idx];simTime+=.2;damageBottle(b,{energy,speed:Math.sqrt(energy*4),point:new THREE.Vector3(0,-brand.h*.20,brand.depth/2),other:null,ballistic});}};
// FPS / physics-cost overlay
(()=>{if(!new URLSearchParams(location.search).has('debug'))return;const el=document.createElement('div');el.style.cssText='position:fixed;left:8px;top:120px;z-index:9;font:12px monospace;color:#9f9;background:#0008;padding:4px 8px;pointer-events:none;white-space:pre';document.body.appendChild(el);let frames=0,last=performance.now();window.perfStat={phys:0,render:0,steps:0};
const origStep=world.step.bind(world);world.step=(...a)=>{const t=performance.now();origStep(...a);perfStat.phys+=performance.now()-t;perfStat.steps++;};
const origRender=renderer.render.bind(renderer);renderer.render=(...a)=>{const t=performance.now();origRender(...a);perfStat.render+=performance.now()-t;};
setInterval(()=>{const now=performance.now(),fps=frames*1000/(now-last);el.textContent=`FPS ${fps.toFixed(0)}\nphys ${(perfStat.phys/Math.max(1,frames)).toFixed(1)}ms/frame (${(perfStat.steps/Math.max(1,frames)).toFixed(1)} steps)\nrender ${(perfStat.render/Math.max(1,frames)).toFixed(1)}ms\nres x${pixelRatio.toFixed(2)}  calls ${renderer.info.render.calls}\nawake ${world.bodies.filter(b=>b.sleepState!==2).length}/${world.bodies.length}`;frames=0;last=now;perfStat.phys=perfStat.render=perfStat.steps=0;},500);
(function tick(){frames++;requestAnimationFrame(tick);})();})();
