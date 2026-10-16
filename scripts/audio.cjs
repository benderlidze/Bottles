const assert=require('node:assert/strict');
const {createServer}=require('./serve.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--enable-webgl','--ignore-gpu-blocklist']});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Isolate the real audio graph from animation/physics and rendering stalls.
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('#start').click();
  const result=await page.evaluate(async()=>{
   await audioLoading;stopAudioVoices();
   const calls=[],create=ac.createBufferSource.bind(ac);
   ac.createBufferSource=()=>{const source=create(),start=source.start.bind(source);source.start=(...args)=>{calls.push({buffer:source.buffer,args,rate:source.playbackRate.value});return start(...args);};return source;};
   const ob=bottles[0],fragments=[{body:{mass:.3}}];
   for(let i=0;i<80;i++)playSample('light0',0,.02);
   fractureSound(ob,{energy:30},fragments,20);
   const main=[...audioVoices].find(v=>v.priority===3),before=calls.length;
   fractureSound(ob,{energy:30},fragments,20);
   const deduplicated=calls.length===before,recording=calls.find(c=>c.buffer===soundBuffers.shatter);
   for(let i=0;i<80;i++)playSample('heavy0',0,.02,1,0,0,undefined,2);
   const count=audioVoices.size;
   await new Promise(r=>setTimeout(r,550));
   const tailSurvived=audioVoices.has(main);
   await new Promise(r=>setTimeout(r,1000));
   const finished=!audioVoices.has(main);
   stopAudioVoices();slow=true;fractureSound(ob,{},fragments,20);
   const stretched=calls[calls.length-1];slow=false;
   stopAudioVoices();muted=true;fractureSound(ob,{},fragments,20);playSample('light0',0);
   const mutedCount=audioVoices.size;muted=false;
   fractureSound(ob,{},fragments,20);const afterReset=audioVoices.size;stopAudioVoices();
   await new Promise(r=>setTimeout(r,50)); // Let the audio thread apply the reset automation.
   const samples=soundBuffers.shatter.getChannelData(0),tail=samples.slice(Math.floor(.45*ac.sampleRate),Math.floor(1*ac.sampleRate));
   return {duration:recording.args[2],offset:recording.args[1],sampleDuration:soundBuffers.shatter.duration,deduplicated,count,limit:MAX_AUDIO_VOICES,tailSurvived,finished,slowDuration:stretched.args[2]/stretched.rate,mutedCount,afterReset,resetCount:audioVoices.size,resetGain:detailBus.gain.value,tailRms:Math.sqrt(tail.reduce((s,v)=>s+v*v,0)/tail.length)};
  });
  assert.equal(result.duration,result.sampleDuration);assert.equal(result.offset,0);assert.ok(result.duration>1.2);
  assert.ok(result.deduplicated&&result.tailSurvived&&result.finished,JSON.stringify(result));
  assert.ok(result.count<=result.limit&&result.slowDuration>1.8&&result.tailRms>.001,JSON.stringify(result));
  assert.equal(result.mutedCount,0);assert.equal(result.afterReset,1);assert.equal(result.resetCount,0);assert.equal(result.resetGain,1);
  assert.deepEqual(errors,[]);console.log('PASS: complete recorded tail, duplicate suppression, voice saturation, natural completion, slow motion, mute and reset.');console.log(JSON.stringify(result,null,2));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
