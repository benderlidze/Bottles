const assert=require('node:assert/strict'),fs=require('node:fs/promises');
const {createServer}=require('./serve.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--enable-webgl','--ignore-gpu-blocklist']});
  const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;let seed=912;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};});
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('#start').click();
  await page.evaluate(()=>{window.champIndex=brands.findIndex(b=>b.sparkling);window.fixture=(idx=champIndex)=>{selectMode('toss');gameMode='pyramid';let seed=281;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};const ob=addBottle(0,0,idx);focus.set(0,1.3,0);zoom=2.6;resize();return ob;};});
  const weak=await page.evaluate(()=>{const ob=fixture();bottleLab.advance(.5);bottleLab.inspectHit(0,1);bottleLab.advance(.2);return {foam:foamParticles.length,pressure:ob.pressure,vented:ob.vented,holes:ob.holes.length};});
  assert.deepEqual(weak,{foam:0,pressure:1,vented:false,holes:0});
  const puncture=await page.evaluate(()=>{
   const ob=fixture();bottleLab.inspectHit(0,30);const initial=ob.pressure,firstFoam=foamParticles.length,initialFluid=ob.fluid;
   bottleLab.advance(.35);const later=ob.pressure,foam=foamParticles.length,fluid=ob.fluid,voice=ob.foamVoice,jet=ob.foamJet;
   bottleLab.inspectHit(0,40);const repeated=ob.pressure,pops=ob.pressurePops;
   bottleLab.advance(7);return {initial,later,repeated,pops,firstFoam,foam,initialFluid,fluid,finalFoam:foamParticles.length,finalPressure:ob.pressure,voiceStopped:!audioVoices.has(voice),jetRemoved:!jet.parent,finite:world.bodies.every(b=>Number.isFinite(b.velocity.length())&&Number.isFinite(b.angularVelocity.length()))};
  });
  assert.ok(puncture.firstFoam>0&&puncture.foam>0);assert.ok(puncture.later>0&&puncture.later<puncture.initial);
  assert.ok(puncture.repeated<=puncture.later&&puncture.pops===1);assert.ok(puncture.fluid>=0&&puncture.fluid<puncture.initialFluid);
  assert.equal(puncture.finalFoam,0);assert.equal(puncture.finalPressure,0);assert.ok(puncture.voiceStopped&&puncture.jetRemoved&&puncture.finite);
  const ordinary=await page.evaluate(()=>{const ob=fixture(0);bottleLab.inspectHit(0,65);bottleLab.advance(.3);return {foam:foamParticles.length,vented:ob.vented};});
  assert.deepEqual(ordinary,{foam:0,vented:false});
  const dry=await page.evaluate(()=>{const ob=fixture();ob.fluid=0;syncBottleMass(ob,true);bottleLab.inspectHit(0,65);return {foam:foamParticles.length,vented:ob.vented};});
  assert.deepEqual(dry,{foam:0,vented:false});
  const rotated=await page.evaluate(()=>{const ob=fixture();ob.body.quaternion.setFromEuler(0,Math.PI/2,0);bottleLab.inspectHit(0,30);const jet=champagneJet(ob),mean=new THREE.Vector3();for(const f of foamParticles)mean.add(f.v);mean.divideScalar(foamParticles.length).sub(ob.body.velocity);return {outward:mean.dot(jet.dir),rotatedX:Math.abs(jet.dir.x)};});
  assert.ok(rotated.outward>1&&rotated.rotatedX>.7,JSON.stringify(rotated));
  const reset=await page.evaluate(()=>{const old=bottles[0],mesh=old.foamJet;fixture();const bodies=world.bodies.length;for(let i=0;i<FOAM_MAX+120;i++)emitFoam(new THREE.Vector3(0,1,0),new THREE.Vector3(),champIndex);updateFoam(0);const max=foamParticles.length,instances=foamMesh.count,extraBodies=world.bodies.length-bodies;fixture();return {max,limit:FOAM_MAX,instances,extraBodies,afterReset:foamParticles.length,jetRemoved:!mesh.parent,voiceStopped:!audioVoices.has(old.foamVoice)};});
  assert.equal(reset.max,reset.limit);assert.equal(reset.instances,reset.limit);assert.equal(reset.extraBodies,0);assert.equal(reset.afterReset,0);assert.ok(reset.jetRemoved&&reset.voiceStopped);
  const actual=await page.evaluate(()=>{const ob=fixture();bottleLab.throwAt(0,35);bottleLab.advance(1.2);return {pops:ob.pressurePops,fluid:ob.fluid,removed:ob.parts.length-ob.attachedCount};});
  assert.equal(actual.pops,1);assert.ok(actual.fluid>=0&&actual.removed>0);
  const sound=await page.evaluate(()=>{const ob=fixture();bottleLab.inspectHit(0,30);bottleLab.advance(.1);const voice=ob.foamVoice,playing=audioVoices.has(voice);muted=true;updateChampagne(ob,.01);const stopped=!audioVoices.has(voice);muted=false;updateChampagne(ob,.01);const resumed=audioVoices.has(ob.foamVoice),jet=ob.foamJet;removeBottle(ob);return {playing,stopped,resumed,removed:!jet.parent&&!audioVoices.has(ob.foamVoice)};});
  assert.ok(sound.playing&&sound.stopped&&sound.resumed&&sound.removed,JSON.stringify(sound));
  const cleanup=await page.evaluate(()=>{let min=Infinity,max=0;for(let i=0;i<3;i++){fixture();bottleLab.inspectHit(0,30);bottleLab.advance(.1);renderer.render(scene,camera);fixture();renderer.render(scene,camera);min=Math.min(min,renderer.info.memory.geometries);max=Math.max(max,renderer.info.memory.geometries);}return max-min;});
  assert.ok(cleanup<=3);
  await fs.mkdir('artifacts',{recursive:true});
  await page.evaluate(()=>{fixture();clearTimeout(toastTimer);$('toast').style.display='none';bottleLab.advance(.01);renderer.render(scene,camera);});await page.screenshot({path:'artifacts/champagne-bottle.png'});
  await page.evaluate(()=>{bottles[0].body.quaternion.setFromEuler(0,-.65,0);bottleLab.inspectHit(0,30);bottleLab.advance(.2);renderer.render(scene,camera);});await page.screenshot({path:'artifacts/champagne-foam.png'});
  assert.deepEqual(errors,[]);console.log('PASS: champagne puncture, pressure decay, single pop, foam flow, rotated vent, dry/ordinary bottles, projectile, bounded particles, audio/reset/resource cleanup.');console.log(JSON.stringify({puncture,rotated,reset,actual,sound,cleanup},null,2));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
