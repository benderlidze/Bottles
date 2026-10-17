'use strict';
function addBottle(x,base,idx){const b=brands[idx],y=base+b.h/2,group=new THREE.Group(),body=new CANNON.Body({mass:1.25,material:glassPhys,position:new CANNON.Vec3(x,y,0),linearDamping:.045,angularDamping:.07,sleepSpeedLimit:.1,sleepTimeLimit:1,collisionFilterGroup:1,collisionFilterMask:29});const ob={group,body,idx,dead:false,parts:[],holes:[],cracks:[],damage:0,lastHit:-2,initial:new THREE.Vector3(x,y,0),proxies:[]};const ys=[-b.h/2+.035,-b.h/2+b.h*.29,-b.h/2+b.h*.57,-b.h/2+b.h*b.neck,b.h/2-.02];let cursor=0,labelCursor=0;const all=[],labelMeshes=[];
for(const piece of fractureBottle(b,idx)){const {geo,shape,label}=piece;body.addShape(shape,piece.shapeOffset,piece.shapeQuat);let labelOffset=0,labelCount=0;if(label){labelOffset=labelCursor;labelCount=label.geometry.attributes.position.count;labelCursor+=labelCount;labelMeshes.push(label);}const count=geo.attributes.position.count;ob.parts.push({...piece,id:ob.parts.length,count,offset:cursor,labelOffset,labelCount,attached:true});cursor+=count;all.push(geo);}
buildGlassBonds(ob);
// The glass heel band shares the shell material, so it is appended to the shell: one draw call less per bottle.
ob.shell=new THREE.Mesh(mergeGeometry([...all,heelGeometry(b)]),glassMats[idx]);ob.shell.castShadow=false;ob.shell.renderOrder=3;group.add(ob.shell);if(labelMeshes.length){ob.labelMesh=new THREE.Mesh(mergeMeshes(labelMeshes),labels[idx]);ob.labelMesh.castShadow=true;group.add(ob.labelMesh);}body.addShape(setShapeGroup(new CANNON.Box(new CANNON.Vec3(b.w*.42,.036,b.depth*.42)),SG.BASE),new CANNON.Vec3(0,-b.h/2+.036,0));for(let row=0;row<R;row++){const p=proxyShape(b,ys[row],ys[row+1],row===2);body.addShape(p.shape,p.offset);ob.proxies.push(p.shape);}
ob.cap=makeBottleCap(b);ob.cap.castShadow=true;group.add(ob.cap);group.position.copy(body.position);scene.add(group);world.addBody(body);makeLiquid(ob);syncBottleMass(ob,true);body.bottle=ob;
body.addEventListener('collide',ev=>{if(ob.dead||simTime-resetAt<.08||simTime-ob.lastHit<.06)return;const speed=Math.abs(ev.contact.getImpactVelocityAlongNormal());if(speed>.55&&simTime-(ob.lastContactSound||-1)>.16){ob.lastContactSound=simTime;if(speed<1.4)glassRing(ob,speed);}if(speed<1.4)return;const contact=ev.contact;const wp=(contact.bi===body?body.position.vadd(contact.ri):body.position.vadd(contact.rj));let local=body.pointToLocalFrame(wp);const mass=ev.body.mass>0?ev.body.mass:100,mu=body.mass*mass/(body.mass+mass);const impactSpeed=speed;let energy=.5*mu*impactSpeed*impactSpeed;if(energy>1.2){const old=breakQueue.get(ob);if(!old||energy>old.energy)breakQueue.set(ob,{speed,energy,point:new THREE.Vector3(local.x,local.y,local.z),other:ev.body,incoming:ev.body.mass>0?ev.body.velocity.clone():body.velocity.negate()});}});body.sleep();bottles.push(ob);return ob;}
function addPlank(width,y,height=.055,x=0,depth=.76){const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),wood);mesh.position.set(x,y,0);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);const body=new CANNON.Body({mass:Math.max(.06,width*height*depth*.8),material:floorPhys,position:new CANNON.Vec3(x,y,0),shape:setShapeGroup(new CANNON.Box(new CANNON.Vec3(width/2,height/2,depth/2)),SG.PLANK),linearDamping:.08,angularDamping:.08,sleepSpeedLimit:.2,sleepTimeLimit:.8,collisionFilterGroup:16,collisionFilterMask:31});world.addBody(body);body.sleep();planks.push({mesh,body,width,height,depth});}
// Mass = remaining glass + liquid inside. LIQUID_DENSITY makes a bottle filled like at the start weigh ~1.25 as before;
// a full bottle is heavier, an empty one weighs only its glass, and a leaking bottle gets lighter as it drains.
const GLASS_MASS=.55,LIQUID_DENSITY=1.4;
function syncBottleMass(ob,force){if(ob.attachedCount===undefined)ob.attachedCount=ob.parts.length;const glass=.07+(ob.capDetached?0:.02)+.46*(ob.remainingArea/ob.shellArea),mass=Math.max(.07,glass+Math.max(0,ob.fluid)*LIQUID_DENSITY);if(!force&&Math.abs(mass-ob.body.mass)<.01)return;ob.body.mass=mass;ob.body.updateMassProperties();}

// Cap and heel geometry depend only on the brand, so they are built once and shared; they sit in `geometries`,
// which clearObject never disposes. Wax caps get random drips, so those are still built for every bottle.
const capGeometries=new Map(),heelGeometries=new Map();
function makeBottleCap(b){
 const mat=new THREE.MeshStandardMaterial({color:b.cap,metalness:b.capMetal??.12,roughness:.4,envMapIntensity:.55});
 if(b.closure==='wax')return new THREE.Mesh(buildCapGeometry(b),mat);
 let g=capGeometries.get(b);if(!g){g=buildCapGeometry(b);capGeometries.set(b,g);geometries.push(g);}return new THREE.Mesh(g,mat);
}
function heelGeometry(b){let g=heelGeometries.get(b);if(g)return g;const band=profileBand(b,.002,.035,-.006);g=band.toNonIndexed();band.dispose();g.userData.surfaceCount=g.attributes.position.count;heelGeometries.set(b,g);return g;}
function buildCapGeometry(b){
 const cap=new THREE.Group(),mat=null;
 const sleeve=b.sleeve??.055,lo=1-sleeve;
 if(b.closure==='crown'){
  const r=bottleSection(b,b.h/2).rx+.012,g=new THREE.CylinderGeometry(r,r*1.08,.05,84,1),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const a=Math.atan2(p.getX(i),p.getZ(i)),f=1+.035*Math.cos(a*21)*(p.getY(i)<0?1:0);p.setX(i,p.getX(i)*f);p.setZ(i,p.getZ(i)*f);}
  g.translate(0,b.h/2-.015,0);g.computeVertexNormals();return g;
 }
 const shell=new THREE.Mesh(profileBand(b,lo,1,.012),mat);cap.add(shell);
 for(let k=0;k<3;k++){const y=b.h/2-.025-k*.022,r=bottleSection(b,y).rx+.014,m=new THREE.Mesh(new THREE.TorusGeometry(r,.0035,4,32),mat);m.rotation.x=Math.PI/2;m.position.y=y;cap.add(m);}
 if(b.closure==='foil'){
  // Creases and a rolled lower foil edge, baked into the same draw call.
  for(let k=0;k<28;k++){
   const a=k/28*TAU,points=[];for(let j=0;j<=8;j++){const t=lo+.012+(sleeve-.025)*j/8;points.push(surfPoint(b,a+Math.sin(j*.8+k)*.008,(t-.5)*b.h,-.014));}
   cap.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),8,.0018,3,false),mat));
  }
  const y=(lo+.01-.5)*b.h,r=bottleSection(b,y).rx+.014,edge=new THREE.Mesh(new THREE.TorusGeometry(r,.006,5,40),mat);edge.rotation.x=Math.PI/2;edge.position.y=y;cap.add(edge);
 }
 if(b.closure==='wax'){
  cap.add(new THREE.Mesh(profileBand(b,.84,1,.02),mat));
  for(let k=0;k<11;k++){const len=rnd(.08,.23),m=new THREE.Mesh(new THREE.CapsuleGeometry(.012,len,3,5),mat),a=k/11*TAU;m.position.copy(surfPoint(b,a,b.h*.34-len/2,-.009));cap.add(m);}
 }
 const geometry=mergeMeshes(cap.children);for(const m of cap.children)m.geometry.dispose();return geometry;
}
