'use strict';
// Preserve the recorded smash and its decay; physics contacts add quiet detail.
let ac,master,detailBus,compressor,noiseBuffer,reverb,wetBus,muted=false;
const audioVoices=new Set(),MAX_AUDIO_VOICES=32,pendingTinkles=new Map();
let bottleFractures=new WeakMap();
let lastTinkleAt=-1,lastFractureAt=-1;
function initAudio(){
 if(ac){if(ac.state==='suspended')ac.resume().catch(()=>{});return audioLoading;}
 ac=new(window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=muted?0:+$('volume').value*.6;
 detailBus=ac.createGain();detailBus.connect(master);
 compressor=ac.createDynamicsCompressor();compressor.threshold.value=-14;compressor.knee.value=14;compressor.ratio.value=3;compressor.attack.value=.002;compressor.release.value=.12;master.connect(compressor);compressor.connect(ac.destination);
 noiseBuffer=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
 reverb=ac.createConvolver();const ir=ac.createBuffer(2,Math.floor(ac.sampleRate*.22),ac.sampleRate);
 for(let ch=0;ch<2;ch++){const a=ir.getChannelData(ch);for(let i=0;i<a.length;i++){const t=i/ac.sampleRate;a[i]=t>.012?(Math.random()*2-1)*Math.exp(-t*34)*.16:0;}}
 reverb.buffer=ir;wetBus=ac.createGain();wetBus.gain.value=.075;reverb.connect(wetBus);wetBus.connect(master);
 audioLoading=Promise.all(Object.entries(embeddedAudio).map(async([key,b64])=>{try{soundBuffers[key]=await ac.decodeAudioData(Uint8Array.from(atob(b64),c=>c.charCodeAt(0)).buffer);}catch{}}));return audioLoading;
}
function audioPosition(position){return typeof position==='number'?{x:position,y:1,z:0}:position;}
function voiceOutput(position,priority){
 if(!ac||muted||ac.state!=='running')return null;
 // Leave room for complete fracture recordings even during a rain of shards.
 if(priority<3&&audioVoices.size>=MAX_AUDIO_VOICES-8)return null;
 if(audioVoices.size>=MAX_AUDIO_VOICES){const disposable=[...audioVoices].find(v=>v.priority<priority);if(!disposable)return null;disposable.cleanup();}
 const point=audioPosition(position),pan=ac.createStereoPanner(),level=ac.createGain();
 const depth=Math.abs(camera.position.z-point.z),distance=Math.hypot(camera.position.x-point.x,camera.position.y-point.y,depth);
 pan.pan.value=THREE.MathUtils.clamp((point.x-camera.position.x)/(3+depth*.18),-.92,.92);level.gain.value=1/(1+distance*.025);
 pan.connect(level);level.connect(priority>=3?master:detailBus);level.connect(reverb);return {pan,level,priority};
}
function registerVoice(source,output,nodes){
 let done=false;const voice={priority:output.priority,cleanup:()=>{if(done)return;done=true;try{source.stop();}catch{}for(const n of [source,...nodes,output.pan,output.level])n.disconnect();audioVoices.delete(voice);}};
 audioVoices.add(voice);source.onended=voice.cleanup;return voice;
}
function playBuffer(buffer,position,gain,rate=1,offset=0,duration,priority=1,delay=0,highpass=0){
 if(!buffer)return;const output=voiceOutput(position,priority);if(!output)return;
 const source=ac.createBufferSource(),envelope=ac.createGain(),nodes=[envelope];source.buffer=buffer;source.playbackRate.value=rate*(slow?.62:1);
 offset=Math.min(Math.max(0,offset),Math.max(0,buffer.duration-.01));const length=Math.min(duration||buffer.duration,buffer.duration-offset),time=ac.currentTime+delay,seconds=length/source.playbackRate.value;
 // Full recordings already contain their decay. Only soften the last 15 ms;
 // deliberately cropped effects need a longer fade to avoid a hard splice.
 const fade=duration===undefined?Math.min(.015,seconds*.2):seconds*.35;
 envelope.gain.setValueAtTime(0,time);envelope.gain.linearRampToValueAtTime(gain,time+.001);envelope.gain.setValueAtTime(gain,time+Math.max(.002,seconds-fade));envelope.gain.exponentialRampToValueAtTime(.0001,time+Math.max(.004,seconds));
 source.connect(envelope);if(highpass){const filter=ac.createBiquadFilter();filter.type='highpass';filter.frequency.value=highpass;envelope.connect(filter);filter.connect(output.pan);nodes.push(filter);}else envelope.connect(output.pan);
 registerVoice(source,output,nodes);source.start(time,offset,length);
}
function playSample(key,x,gain=1,rate=1,delay=0,offset=0,duration,priority=1,highpass=0){if(!ac)return;playBuffer(soundBuffers[key],x,gain,rate,offset,duration,priority,delay,highpass);}
function resonantTone(position,frequency,duration,gain,priority=1){
 const output=voiceOutput(position,priority);if(!output)return;
 const source=ac.createOscillator(),envelope=ac.createGain(),time=ac.currentTime;source.type='sine';source.frequency.value=frequency*(slow?.62:1);
 const seconds=duration/(slow?.62:1);envelope.gain.setValueAtTime(0,time);envelope.gain.linearRampToValueAtTime(gain,time+.001);envelope.gain.exponentialRampToValueAtTime(.0001,time+seconds);
 source.connect(envelope);envelope.connect(output.pan);registerVoice(source,output,[envelope]);source.start(time);source.stop(time+seconds+.01);
}
function glassRing(ob,speed){
 if(!ac||muted||ac.currentTime-(ob.lastRing??-1)<.10)return;ob.lastRing=ac.currentTime;
 const fill=ob.fluid/ob.capacity,integrity=ob.remainingArea/ob.shellArea,frequency=(1250+(1-fill)*1000)*(2/brands[ob.idx].h);
 const gain=Math.min(.065,.008+speed*.009)*integrity,duration=(.12+(1-fill)*.18)*Math.max(.2,integrity);
 resonantTone(ob.body.position,frequency,duration,gain,2);resonantTone(ob.body.position,frequency*2.67,duration*.4,gain*.3,1);
}
function glassImpact(ob,hit,bonds){
 glassRing(ob,hit.speed||Math.sqrt(hit.energy));
 if(bonds>0){playSample('shatter',ob.body.position,.12,1.22,0,.018,.065,2,1700);return;}
 if(hit.energy>1)playSample('light'+(Math.random()*3|0),ob.body.position,.08,1,0,0,.08,2);
}
function fractureSound(ob,hit,fragments,spent){
 if(!ac||muted||ac.state!=='running'||!soundBuffers.shatter)return;
 const time=ac.currentTime;
 // Consecutive physics steps can describe the same fracture. Let it ring out.
 if(time-(bottleFractures.get(ob)??-1)<.18)return;
 bottleFractures.set(ob,time);
 const mass=fragments.reduce((s,f)=>s+f.body.mass,0),strength=THREE.MathUtils.clamp(Math.sqrt(Math.max(0,spent)/8),.15,1);
 const size=THREE.MathUtils.clamp(Math.sqrt(mass/.18),.35,1);
 const gain=(.24+strength*.30)*size*(time-lastFractureAt<.04?.65:1);lastFractureAt=time;
 playSample('shatter',ob.body.position,gain,rnd(.96,1.04),0,0,undefined,3,80);
 // Keep impacts underneath the attack, then restore them smoothly for the tail.
 detailBus.gain.cancelAndHoldAtTime(time);detailBus.gain.setTargetAtTime(.28,time,.008);detailBus.gain.setTargetAtTime(1,time+.18,.18);
}
function shardSound(position,speed,mass){
 if(!ac||muted)return;const energy=.5*mass*speed*speed;if(energy<.0015)return;
 const key=Math.round(position.x*2)+':'+Math.round(position.z*2)+':'+(mass>.035?1:0),old=pendingTinkles.get(key);
 if(!old||old.energy<energy)pendingTinkles.set(key,{position:{x:position.x,y:position.y,z:position.z},energy,mass,speed});
}
function flushImpactAudio(){
 if(!ac||!pendingTinkles.size||ac.currentTime-lastTinkleAt<.06)return;lastTinkleAt=ac.currentTime;
 const impacts=[...pendingTinkles.values()].sort((a,b)=>b.energy-a.energy).slice(0,3);pendingTinkles.clear();
 for(const impact of impacts){const pitch=THREE.MathUtils.clamp(Math.pow(.028/impact.mass,.22),.8,1.5),gain=Math.min(.085,.012+Math.sqrt(impact.energy)*.045);
  playSample('light'+(Math.random()*3|0),impact.position,gain,pitch*rnd(.97,1.03),0,0,undefined,0,650);
 }
}
function impactSound(x,speed,kind='wood'){
 if(!ac||muted||speed<.7||kind==='glass')return;
 playSample('heavy'+(Math.random()*3|0),x,Math.min(.3,speed*.024),rnd(.75,.9),0,0,.12,2,0);
 resonantTone(x,105,.055,Math.min(.12,speed*.009),2);
}
function whoosh(power=35){if(ac&&!muted)playBuffer(noiseBuffer,0,.018+power*.00035,.9,0,.05+power*.0007,1,0,750);}
function champagnePop(ob,strength){
 if(!ac||muted)return;
 resonantTone(ob.body.position,165,.09,.12*strength,3);
 playBuffer(noiseBuffer,ob.body.position,.10*strength,1,0,.075,3,0,400);
}
function champagneHiss(ob,intensity){
 if(!ac||muted||ac.state!=='running'||intensity<.01){ob.foamVoice?.cleanup();ob.foamVoice=null;ob.foamAudio=null;return;}
 if(!ob.foamVoice||!audioVoices.has(ob.foamVoice)){
  const output=voiceOutput(ob.body.position,1);if(!output)return;
  const source=ac.createBufferSource(),filter=ac.createBiquadFilter(),gain=ac.createGain();source.buffer=noiseBuffer;source.loop=true;
  filter.type='bandpass';filter.Q.value=.45;gain.gain.value=0;source.connect(filter);filter.connect(gain);gain.connect(output.pan);
  ob.foamVoice=registerVoice(source,output,[filter,gain]);ob.foamAudio={source,filter,gain,pan:output.pan};source.start();
 }
 const {source,filter,gain,pan}=ob.foamAudio,time=ac.currentTime;
 source.playbackRate.setTargetAtTime(slow?.62:1,time,.05);
 filter.frequency.setTargetAtTime(2200+ob.pressure*3000,time,.05);gain.gain.setTargetAtTime(Math.min(.16,intensity*.22),time,.035);
 pan.pan.setTargetAtTime(THREE.MathUtils.clamp((ob.body.position.x-camera.position.x)/(3+Math.abs(camera.position.z-ob.body.position.z)*.18),-.92,.92),time,.06);
}
function stopAudioVoices(){for(const voice of [...audioVoices])voice.cleanup();pendingTinkles.clear();bottleFractures=new WeakMap();lastFractureAt=lastTinkleAt=-1;if(detailBus){detailBus.gain.cancelScheduledValues(0);detailBus.gain.value=1;detailBus.gain.setValueAtTime(1,ac.currentTime);}}
document.addEventListener('visibilitychange',()=>{if(!ac)return;if(document.hidden){stopAudioVoices();ac.suspend().catch(()=>{});}else if(started)ac.resume().catch(()=>{});});
