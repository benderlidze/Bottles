const assert=require('node:assert/strict'),fs=require('node:fs/promises');
const {createServer}=require('./serve.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--enable-webgl','--ignore-gpu-blocklist']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('#start').click();
  assert.equal(await page.locator('#levelSelect').count(),0);
  assert.deepEqual(await page.evaluate(()=>({mode:gameMode,count:bottles.length})),{mode:'pyramid',count:15});
  assert.deepEqual(await page.evaluate(()=>({brands:BASE_BRANDS,giants:brands.length-BASE_BRANDS,visible:new Set(bottles.map(b=>b.idx)).size})),{brands:12,giants:12,visible:12});
  await page.evaluate(()=>{
   window.singleBottle=(idx=0)=>{selectMode('toss');gameMode='pyramid';let seed=281;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};const ob=addBottle(0,0,idx);focus.set(0,1.1,0);zoom=2.2;resize();return ob;};
  });
  const fracture=await page.evaluate(()=>{
   const result=[];
   for(const energy of [1,8,30,65,120]){const ob=singleBottle();ob.fluid=0;syncBottleMass(ob,true);const mass=ob.body.mass;bottleLab.inspectHit(0,energy);const momentum=ob.body.velocity.scale(ob.body.mass);for(const d of debris)momentum.vadd(d.body.velocity.scale(d.body.mass),momentum);
    const angular=new CANNON.Vec3();let kinetic=0;
    for(const body of [ob.body,...debris.map(d=>d.body)]){const local=body.quaternion.conjugate().vmult(body.angularVelocity),L=body.quaternion.vmult(new CANNON.Vec3(local.x*body.inertia.x,local.y*body.inertia.y,local.z*body.inertia.z));angular.vadd(L,angular);angular.vadd(body.position.vsub(ob.body.position).cross(body.velocity.scale(body.mass)),angular);kinetic+=.5*body.mass*body.velocity.lengthSquared()+.5*L.dot(body.angularVelocity);}
    result.push({energy,removed:ob.parts.length-ob.attachedCount,fragments:debris.length,brokenBonds:ob.bonds.filter(b=>!b.health).length,massError:Math.abs(ob.body.mass+debris.reduce((s,d)=>s+d.body.mass,0)-mass),momentumError:momentum.length(),angularError:angular.length(),scatterEnergy:kinetic});
   }return result;
  });
  assert.equal(fracture[0].removed,0);assert.equal(fracture[0].brokenBonds,0);
  assert.ok(fracture[2].removed>0);assert.ok(fracture[4].removed>fracture[3].removed&&fracture[3].removed>fracture[2].removed);
  assert.ok(fracture.every(r=>r.massError<1e-8&&r.momentumError<1e-8),JSON.stringify(fracture));
  assert.ok(fracture.every(r=>r.angularError<1e-7&&r.scatterEnergy<=Math.min(r.energy*.06,2.4)+1e-7),JSON.stringify(fracture));
  const shots=await page.evaluate(()=>{
   const out=[];for(const power of [8,35,65,100]){const ob=singleBottle();bottleLab.throwAt(0,power);bottleLab.advance(1.2);out.push({power,damage:ob.damage,removed:ob.parts.length-ob.attachedCount,finite:world.bodies.every(b=>Number.isFinite(b.velocity.length()))});}return out;
  });
  assert.ok(shots.every(s=>s.finite));assert.equal(shots[0].removed,0);assert.ok(shots[2].removed>shots[1].removed&&shots[3].removed>=shots[2].removed,JSON.stringify(shots));
  const origins=await page.evaluate(()=>{singleBottle();const result=[];for(const z of [1,1.7,2.6]){zoom=z;resize();const p=shotPath(50).origin.project(camera);result.push([p.x,p.y]);}return result;});
  assert.ok(origins.every(([x,y])=>Math.abs(x)<1e-6&&Math.abs(y+.84)<1e-6));
  const cleanup=await page.evaluate(()=>{
   let min=Infinity,max=0;for(let i=0;i<3;i++){singleBottle();bottleLab.inspectHit(0,100);bottleLab.advance(1);singleBottle();renderer.render(scene,camera);min=Math.min(min,renderer.info.memory.geometries);max=Math.max(max,renderer.info.memory.geometries);}return {growth:max-min,fragments:debris.length,secondary:secondaryBreaks.size};
  });
  assert.ok(cleanup.growth<=4,JSON.stringify(cleanup));assert.equal(cleanup.fragments,0);assert.equal(cleanup.secondary,0);
  const catalogue=await page.evaluate(()=>brands.slice(0,BASE_BRANDS).map((b,idx)=>{
   const ob=singleBottle(idx);let profileMatches=true;
   for(const t of [.05,.25,.43,.58,.71,.88,.98])for(let a=0;a<TAU;a+=Math.PI/7){
    const p=surfPoint(b,a,(t-.5)*b.h),inner=new THREE.Vector3(p.x*.999,p.y,p.z*.999),outer=new THREE.Vector3(p.x*1.001,p.y,p.z*1.001);
    profileMatches&&=insideBottle(b,inner,0)&&!insideBottle(b,outer,0);
    profileMatches&&=surfaceProject(b,outer).distanceTo(p)<1e-6;
   }
   const liquidInside=ob.liquidVerts.every(p=>insideBottle(b,p,0))&&ob.samples.every(p=>insideBottle(b,p,0)),neck=bottleSection(b,b.h*.48);
   const labelVertices=ob.labelMesh.geometry.attributes.position.count;
   bottleLab.throwAt(0,65);bottleLab.advance(1.2);
   return {name:b.name,profileMatches,liquidInside,roundNeck:Math.abs(neck.rx-neck.rz)<1e-9,labelVertices,removed:ob.parts.length-ob.attachedCount,finite:world.bodies.every(b=>Number.isFinite(b.velocity.length())&&Number.isFinite(b.angularVelocity.length()))};
  }));
  assert.ok(catalogue.every(b=>b.profileMatches&&b.liquidInside&&b.roundNeck&&b.labelVertices>0&&b.removed>0&&b.finite),JSON.stringify(catalogue));
  const audio=await page.evaluate(()=>{for(let i=0;i<100;i++){playSample('light0',0);resonantTone(0,1200,.1,.02);}const count=audioVoices.size;stopAudioVoices();muted=true;playSample('shatter',0);const mutedVoices=audioVoices.size;muted=false;return {count,limit:MAX_AUDIO_VOICES,mutedVoices,samples:Object.keys(soundBuffers).length};});
  assert.ok(audio.count<=audio.limit&&audio.samples===7);assert.equal(audio.mutedVoices,0);
  await page.evaluate(()=>{selectMode('toss');launchToss();const ob=toss.ob;ob.body.position.set(0,4,0);ob.body.velocity.set(0,0,0);const ball=new CANNON.Body({mass:.28});ball.ball=true;ball.velocity.set(0,0,-30);ballStrike(ob,{body:ball},new THREE.Vector3(0,0,brands[ob.idx].depth/2));});
  assert.equal(await page.evaluate(()=>tossHits),1);
  // giant mode: one bottle twice the size; smashing it brings the next one right away
  const giantRun=await page.evaluate(()=>{selectMode('giant');const first=giant.ob,size=brands[first.idx].h/brands[brands[first.idx].base].h,standing=bottles.length;let throws=0;
   while(giant.phase==='standing'&&throws<40){const ob=giant.ob;camera.updateMatrixWorld();const t=new THREE.Vector3(0,ob.body.position.y,0).project(camera);bottleLab.aimAndThrow(t.x,t.y,60);bottleLab.advance(.8);throws++;}
   bottleLab.advance(2);return {size,standing,throws,smashed:giantSmashed,count:bottles.length,replaced:giant.ob!==first&&giant.phase==='standing'};});
  assert.equal(giantRun.size,2);assert.ok(giantRun.standing===1&&giantRun.smashed===1&&giantRun.count===1&&giantRun.replaced,JSON.stringify(giantRun));
  await page.evaluate(()=>{singleBottle();bottleLab.throwAt(0,65);bottleLab.advance(.45);slow=true;});
  await fs.mkdir('artifacts',{recursive:true});await page.screenshot({path:'artifacts/fracture.png'});
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>selectMode('pyramid'));await page.mouse.move(190,440);await page.mouse.down();await page.waitForFunction(()=>trajectory.visible);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'artifacts/mobile.png'});await page.mouse.up();
  assert.deepEqual(errors,[]);console.log('PASS: free sandbox, 12 bottle profiles/liquid/labels/projectile hits, bond fracture, glass mass, fragment momentum, impact energy, reset cleanup, sound polyphony/mute, toss, giant mode and mobile aiming.');console.log(JSON.stringify({fracture,shots,cleanup,catalogue,audio,giantRun},null,2));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
