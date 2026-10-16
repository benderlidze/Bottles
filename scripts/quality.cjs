const assert=require('node:assert/strict');
const {createServer}=require('./serve.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--enable-webgl','--ignore-gpu-blocklist']});
  for(const dpr of [1,2]){
   const page=await browser.newPage({viewport:{width:960,height:720},deviceScaleFactor:dpr}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   // Drive frame timings deterministically instead of relying on the test GPU.
   await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
   await page.goto(`http://127.0.0.1:${server.address().port}`);
   const result=await page.evaluate(()=>{
    let now=performance.now(),firstReduction=null;
    const initial=renderer.getPixelRatio();
    for(let i=0;i<1800;i++){
     now+=50;adaptQuality(now,.05);
     if(!firstReduction&&renderer.transmissionResolutionScale<.7)firstReduction=renderer.getPixelRatio();
    }
    const low={ratio:renderer.getPixelRatio(),width:renderer.domElement.width,refraction:renderer.transmissionResolutionScale};
    for(let i=0;i<7200;i++){now+=1000/120;adaptQuality(now,1/120);}
    renderer.render(scene,camera);
    return {initial,firstReduction,low,recovered:{ratio:renderer.getPixelRatio(),width:renderer.domElement.width,refraction:renderer.transmissionResolutionScale}};
   });
   assert.equal(result.initial,dpr);
   assert.equal(result.firstReduction,dpr,'Refraction must lose resolution before printed labels');
   assert.equal(result.low.ratio,1);assert.equal(result.low.width,960);assert.equal(result.low.refraction,.5);
   assert.equal(result.recovered.ratio,dpr,'Quality must recover after a slow burst');
   assert.equal(result.recovered.width,960*dpr);assert.equal(result.recovered.refraction,.7);
   assert.deepEqual(errors,[]);console.log(`PASS: DPR ${dpr}, native label resolution floor, refraction-first adaptation and full recovery.`);
   await page.close();
  }
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
