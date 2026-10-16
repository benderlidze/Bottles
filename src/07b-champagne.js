'use strict';
// Stylised pressure and CO2 foam, in game units. Only a real opening vents it.
// All bubbles share one bounded instanced draw, without additional rigid bodies.
const FOAM_MAX=900,foamParticles=[],foamDummy=new THREE.Object3D();
const foamMesh=new THREE.InstancedMesh(new THREE.SphereGeometry(1,7,5),new THREE.MeshStandardMaterial({color:0xfff7dc,roughness:.72,metalness:0,transparent:true,opacity:.91,depthWrite:false}),FOAM_MAX);
foamMesh.count=0;foamMesh.frustumCulled=false;foamMesh.renderOrder=4;foamMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(foamMesh);let foamCursor=0;
const foamJetMaterial=new THREE.MeshStandardMaterial({color:0xfff4d4,roughness:.8,side:THREE.DoubleSide});
function emitFoam(p,v,idx,volume=0,size=.028){
 const particle={p:p.clone(),v:v.clone(),idx,volume,size,age:0,life:rnd(1.3,2.4),landed:false,stretch:rnd(.8,1.3)};
 if(foamParticles.length<FOAM_MAX)foamParticles.push(particle);else foamParticles[foamCursor++%FOAM_MAX]=particle;
}
function clearFoam(){foamParticles.length=0;foamMesh.count=0;foamCursor=0;}
function clearChampagne(ob){ob.foamVoice?.cleanup();ob.foamVoice=null;ob.foamAudio=null;if(ob.foamJet){ob.foamJet.removeFromParent();ob.foamJet.geometry.dispose();ob.foamJet=null;}}
function makeFoamJet(ob){
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(13*8*3),3).setUsage(THREE.DynamicDrawUsage));
 const indices=[];for(let j=0;j<12;j++)for(let k=0;k<8;k++){const a=j*8+k,c=j*8+(k+1)%8;indices.push(a,c,c+8,a,c+8,a+8);}g.setIndex(indices);
 ob.foamJet=new THREE.Mesh(g,foamJetMaterial);ob.foamJet.frustumCulled=false;ob.foamJet.visible=false;scene.add(ob.foamJet);
}
function drawFoamJet(ob,p,dir,speed,activity,dt){
 const mesh=ob.foamJet;if(!mesh)return;mesh.visible=activity>.08&&ob.fluid>.002;if(!mesh.visible)return;
 ob.foamJetElapsed=(ob.foamJetElapsed||0)+dt;if(ob.foamJetElapsed<1/30)return;ob.foamJetElapsed=0;
 const side=new THREE.Vector3(Math.abs(dir.y)>.9?1:0,Math.abs(dir.y)>.9?0:1,0).cross(dir).normalize(),up=dir.clone().cross(side),v=dir.clone().multiplyScalar(speed).add(ob.body.velocity),positions=mesh.geometry.attributes.position;
 for(let j=0;j<=12;j++){
  const t=j/12*Math.min(ob.foamAge,.14+ob.pressure*.20),center=p.clone().addScaledVector(v,t);center.y-=3.6*t*t;
  const radius=(.025+.065*Math.sqrt(ob.pressure))*Math.sqrt(activity)*Math.pow(1-j/12,.65);
  for(let k=0;k<8;k++){const a=k/8*TAU,r=radius*(1+.25*Math.sin(k*3+j*2+simTime*34)),point=center.clone().addScaledVector(side,Math.cos(a)*r).addScaledVector(up,Math.sin(a)*r);positions.setXYZ(j*8+k,point.x,Math.max(.025,point.y),point.z);}
 }
 positions.needsUpdate=true;mesh.geometry.computeVertexNormals();
}
function champagneJet(ob){
 const p=ob.ventLocal.clone().applyQuaternion(ob.body.quaternion).add(ob.body.position),dir=ob.ventNormal.clone().applyQuaternion(ob.body.quaternion).normalize();
 return {p,dir};
}
function releaseChampagne(ob,fragments,hit){
 if(!brands[ob.idx].sparkling||ob.vented||ob.pressure<=0||ob.fluid<.005||!fragments.length)return false;
 let patch=null,best=Infinity;for(const f of fragments)for(const p of f.parts){const d=p.center.distanceToSquared(hit.point);if(d<best){best=d;patch=p;}}
 if(!patch)return false;
 const b=brands[ob.idx];ob.vented=true;ob.pressurePops=(ob.pressurePops||0)+1;makeFoamJet(ob);
 ob.ventLocal=surfaceProject(b,patch.center);ob.ventNormal=glassSurfaceNormal(b,ob.ventLocal);ob.foamTime=3.6;ob.foamAge=0;ob.foamCarry=0;
 ob.pressure*=Math.min(1,ob.fluid/ob.capacity*1.4);
 // Stored gas adds a small radial kick; the shared scatter solver balances
 // both translation and rotation against the remnant, with a bounded budget.
 const strength=ob.pressure;scatterFragments(ob,fragments,{point:ob.ventLocal,energy:strength*.85,pressure:true});
 const {p,dir}=champagneJet(ob),amount=Math.min(ob.fluid*.08,.055),n=180;ob.fluid-=amount;
 for(let i=0;i<n;i++){
  const v=dir.clone().multiplyScalar(rnd(6,11)*strength).add(new THREE.Vector3(rnd(-2.1,2.1),rnd(-.9,2.2),rnd(-2.1,2.1))).add(ob.body.velocity);
  emitFoam(p.clone().addScaledVector(dir,.025),v,ob.idx,amount/n,rnd(.016,.040));
 }
 champagnePop(ob,strength);shake=Math.min(.05,shake+.012*strength);return true;
}
function updateChampagne(ob,dt){
 if(!ob.vented||dt<=0)return;
 ob.foamAge+=dt;
 const open=THREE.MathUtils.clamp(1-ob.remainingArea/ob.shellArea,0,1);
 ob.pressure*=Math.exp(-dt*(.65+4*Math.sqrt(open)));if(ob.pressure<.004)ob.pressure=0;
 ob.foamTime=Math.max(0,ob.foamTime-dt);
 if(ob.fluid<.002||ob.foamTime<=0){ob.pressure=0;clearChampagne(ob);return;}
 // A missing shell releases one cloud and rapidly loses pressure. A small
 // puncture keeps a directed jet; dissolved gas leaves a softer foamy tail.
 const containment=Math.max(0,1-open*1.5),activity=Math.min(1,ob.foamTime/.9)*(ob.pressure*.95+containment*.5);
 const {p,dir}=champagneJet(ob),speed=1+9.5*Math.sqrt(ob.pressure);
 drawFoamJet(ob,p,dir,speed,activity,dt);
 ob.foamCarry+=dt*(260+600*ob.pressure)*activity;
 const n=Math.min(64,Math.floor(ob.foamCarry));ob.foamCarry-=n;
 if(n){
  // More expanded foam per unit of liquid, rather than draining the bottle
  // immediately just because the visible spray contains more bubbles.
  const amount=Math.min(ob.fluid,n*.00035);ob.fluid-=amount;
  for(let i=0;i<n;i++){
   const v=dir.clone().multiplyScalar(speed*rnd(.8,1.1)).add(new THREE.Vector3(rnd(-.65,.65),rnd(-.2,.7),rnd(-.65,.65))).add(ob.body.velocity);
   emitFoam(p.clone().addScaledVector(dir,rnd(.02,.07)),v,ob.idx,amount/n,rnd(.018,.038));
  }
 }
 champagneHiss(ob,activity);
}
function updateFoam(dt){
 let write=0;for(const f of foamParticles){
  f.age+=dt;if(f.age>=f.life)continue;
  if(!f.landed){
   f.v.multiplyScalar(Math.exp(-dt*1.35));f.v.y-=7.2*dt;f.p.addScaledVector(f.v,dt);
   if(f.p.y<.025){f.p.y=.025;f.landed=true;deposit(f.p,f.idx,f.volume);f.v.set(0,0,0);f.life=f.age+rnd(.65,1.3);}
  }
  const growth=1+Math.min(.8,f.age*1.1),fade=Math.min(1,(f.life-f.age)/.45),radius=f.size*growth*Math.sqrt(Math.max(0,fade));
  foamDummy.position.copy(f.p);foamDummy.quaternion.identity();foamDummy.scale.set(radius*f.stretch,radius*(f.landed?.3:1),radius*(f.landed?1.4:1));foamDummy.updateMatrix();foamMesh.setMatrixAt(write,foamDummy.matrix);foamParticles[write++]=f;
 }
 foamParticles.length=write;foamMesh.count=write;if(write)foamMesh.instanceMatrix.needsUpdate=true;
}
