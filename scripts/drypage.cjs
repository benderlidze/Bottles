const assert=require('node:assert/strict');
const {createServer}=require('./serve.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
(async()=>{
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--enable-webgl','--ignore-gpu-blocklist']});
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.setDefaultTimeout(8000);page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const links=await page.locator('a[href="https://drypage.app/app"]').evaluateAll(nodes=>nodes.map(link=>({target:link.target,rel:link.rel})));
  assert.deepEqual(links,Array(5).fill({target:'_blank',rel:'noopener noreferrer'}));
  await page.locator('#start').click();
  const pyramid=await page.evaluate(()=>{broken=bottles.length-1;countBroken({counted:false});return drypagePromo.classList.contains('show');});
  assert.equal(pyramid,true);await page.mouse.click(8,8);assert.equal(await page.locator('#drypagePromo.show').count(),1);await page.keyboard.press('Escape');assert.equal(await page.locator('#drypagePromo.show').count(),1);await page.locator('#drypageContinue').click();
  const toss=await page.evaluate(()=>{selectMode('toss');tossOverShown=true;updateToss();return drypagePromo.classList.contains('show');});
  assert.equal(toss,true);await page.keyboard.press('Escape');
  const giant=await page.evaluate(()=>{selectMode('giant');giantSmashed=5;updateGiant();return drypagePromo.classList.contains('show');});
  assert.equal(giant,true);await page.locator('#drypageContinue').click();await page.locator('[data-mode=pyramid]').click();
  assert.equal(await page.locator('#drypagePromo.show').count(),0);
  assert.deepEqual(errors,[]);console.log('PASS: DryPage CTA links, Pyramid/Toss/Giant round prompts, dismiss and reset.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
