const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const {createServer} = require('./serve.cjs');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
(async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,args:['--enable-webgl','--ignore-gpu-blocklist']});
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => { let seed=4973;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}; });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator('#start').click();
    assert.equal(await page.evaluate(()=>started), true);
    const layouts = await page.evaluate(()=>{
      const result=[];
      for(let i=0;i<LEVELS.length;i++){selectMode(String(i));bottleLab.advance(.5);result.push({count:bottles.length,damage:broken,finite:bottles.every(b=>Number.isFinite(b.body.mass)&&b.body.mass>0)});}
      return result;
    });
    assert.deepEqual(layouts.map(l=>l.count),[5,10,9,5,5]);
    assert.ok(layouts.every(l=>l.damage===0&&l.finite));
    const origins = await page.evaluate(()=>{
      selectMode('0');const result=[];
      for(const z of [1,1.7,2.6]){zoom=z;resize();const p=shotPath(40).origin.project(camera);result.push([p.x,p.y]);}zoom=1;resize();return result;
    });
    assert.ok(origins.every(([x,y])=>Math.abs(x)<1e-6&&Math.abs(y+.84)<1e-6));
    const win = await page.evaluate(()=>{
      selectMode('0');for(let i=0;i<4;i++){bottleLab.throwAt(i,65);bottleLab.advance(1);}bottleLab.advance(3);
      return {status:round.status,progress:levelProgress(),saved:JSON.parse(localStorage.getItem('last-call-best-v1'))[0]};
    });
    assert.equal(win.status,'won');assert.ok(win.progress>=4&&win.saved.score>0);
    assert.equal(await page.locator('#result').isVisible(),true);
    await page.locator('#nextLevel').click();assert.equal(await page.evaluate(()=>levelIndex),1);
    const guard = await page.evaluate(()=>{selectMode('3');bottleLab.throwAt(2,55);bottleLab.advance(2);return round.status;});
    assert.equal(guard,'lost');
    const ammo = await page.evaluate(()=>{selectMode('0');for(let i=0;i<9;i++)bottleLab.aimAndThrow(.98,.98,25);const used=shots;bottleLab.advance(9);return {used,status:round.status};});
    assert.deepEqual(ammo,{used:6,status:'lost'});
    const tossHit = await page.evaluate(()=>{selectMode('toss');launchToss();const ob=toss.ob;ob.body.position.set(0,4,0);ob.body.velocity.set(0,0,0);const body=new CANNON.Body({mass:.28});body.ball=true;body.velocity.set(0,0,-35);ballStrike(ob,{body},new THREE.Vector3(0,0,brands[ob.idx].depth/2));return {hits:tossHits,done:toss.done};});
    assert.deepEqual(tossHit,{hits:1,done:true});
    const resources = await page.evaluate(()=>{
      let min=Infinity,max=0;
      for(let i=0;i<5;i++){selectMode('0');bottleLab.inspectHit(0,80);bottleLab.advance(.5);rebuild();renderer.render(scene,camera);min=Math.min(min,renderer.info.memory.geometries);max=Math.max(max,renderer.info.memory.geometries);}
      for(let i=0;i<80;i++)playSample('light0',0);return {growth:max-min,balls:balls.length,debris:debris.length,voices:audioVoices.size,maxVoices:MAX_AUDIO_VOICES};
    });
    assert.ok(resources.growth<=8,JSON.stringify(resources));assert.equal(resources.balls,0);assert.equal(resources.debris,0);assert.ok(resources.voices<=resources.maxVoices);
    await fs.mkdir('artifacts',{recursive:true});
    await page.screenshot({path:'artifacts/desktop.png'});
    await page.setViewportSize({width:390,height:844});
    await page.mouse.move(190,440);await page.mouse.down();
    await page.waitForFunction(()=>trajectory.visible);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const launcherClear = await page.evaluate(()=>{const p=shotPath(35).origin.project(camera),x=(p.x+1)*innerWidth/2,y=(1-p.y)*innerHeight/2;return document.elementFromPoint(x,y)===renderer.domElement;});
    assert.equal(launcherClear,true,'HUD must not cover the launch point');
    await page.screenshot({path:'artifacts/mobile.png'});await page.mouse.up();
    assert.deepEqual(errors,[]);
    console.log('PASS: layouts, stable physics, launch origin/zoom, actual hits, victory/save/next, guard loss, ammo loss, toss sweep, resource cleanup, audio cap, mobile aiming.');
    console.log(JSON.stringify({layouts,resources},null,2));
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
