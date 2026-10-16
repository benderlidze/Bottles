'use strict';
// Embedded CC0 recordings: Bottle Shattering by spookymodem (Freesound 202093),
// and Impact Sounds by Kenney. Sources and licenses are included at the end of this file.
let ac,master,compressor,noiseBuffer,muted=false,lastClink=0,reverb,wetBus;
const audioVoices=new Set(),MAX_AUDIO_VOICES=24;let lastCrash=-1;
function initAudio(){if(ac){if(ac.state==='suspended')ac.resume().catch(()=>{});return audioLoading;}ac=new(window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=muted?0:+$('volume').value*.6;compressor=ac.createDynamicsCompressor();compressor.threshold.value=-12;compressor.knee.value=12;compressor.ratio.value=4;compressor.attack.value=.004;compressor.release.value=.16;master.connect(compressor);compressor.connect(ac.destination);noiseBuffer=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
reverb=ac.createConvolver();const ir=ac.createBuffer(2,Math.floor(ac.sampleRate*.28),ac.sampleRate);for(let c=0;c<2;c++){let a=ir.getChannelData(c);for(let i=0;i<a.length;i++){const t=i/ac.sampleRate;a[i]=(Math.random()*2-1)*Math.exp(-t*27)*.09;if(i<ac.sampleRate*.015)a[i]=0;}}reverb.buffer=ir;wetBus=ac.createGain();wetBus.gain.value=.10;reverb.connect(wetBus);wetBus.connect(master);audioLoading=Promise.all(Object.entries(embeddedAudio).map(async([key,b64])=>{const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));try{soundBuffers[key]=await ac.decodeAudioData(bytes.buffer);}catch{}}));return audioLoading;}
function channel(x){const pan=ac.createStereoPanner();pan.pan.value=THREE.MathUtils.clamp((x-camera.position.x)/7,-.85,.85);pan.connect(master);pan.connect(reverb);return pan;}
function playSample(key,x,gain=1,rate=1,delay=0,offset=0,duration){if(!ac||muted||!soundBuffers[key]||audioVoices.size>=MAX_AUDIO_VOICES)return;const source=ac.createBufferSource(),level=ac.createGain(),pan=channel(x);audioVoices.add(source);source.buffer=soundBuffers[key];source.playbackRate.value=rate*(slow?.72:1);level.gain.value=gain;source.connect(level);level.connect(pan);const t=ac.currentTime+delay;if(duration)source.start(t,offset,duration);else source.start(t,offset);source.onended=()=>{audioVoices.delete(source);source.disconnect();level.disconnect();pan.disconnect();};}
function tone(dest,freq,t,dur,amp,type='sine'){const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(freq*.76,t+dur);g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(amp,t+.003);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(dest);o.start(t);o.stop(t+dur+.01);o.onended=()=>{o.disconnect();g.disconnect();};}
function noise(dest,t,dur,freq,amp,kind='highpass'){const s=ac.createBufferSource();s.buffer=noiseBuffer;const f=ac.createBiquadFilter(),g=ac.createGain();f.type=kind;f.frequency.value=freq;f.Q.value=.6;g.gain.setValueAtTime(amp,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(dest);s.start(t,rnd(0,.5),dur);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};}
function crash(x,speed){if(!ac||muted||ac.currentTime-lastCrash<.075)return;lastCrash=ac.currentTime;playSample('shatter',x,.60+Math.min(.24,speed*.012),rnd(.92,1.07));playSample('heavy'+(Math.random()*3|0),x,.16,rnd(.94,1.03));}
function clink(x,speed){if(!ac||muted||ac.currentTime-lastClink<.055)return;lastClink=ac.currentTime;playSample('light'+(Math.random()*3|0),x,Math.min(.28,.055+speed*.025),rnd(.87,1.18));}
function smallCrack(x){if(!ac||muted)return;playSample('shatter',x,.30,rnd(1.08,1.3),0,0,.12);playSample('light'+(Math.random()*3|0),x,.13,1.1,.025);}
function whoosh(power=35){if(!ac||muted)return;const p=channel(0);noise(p,ac.currentTime,.08+power*.0008,450+power*9,.045+power*.0005,'bandpass');setTimeout(()=>p.disconnect(),350);}
function impactSound(x,speed,kind='glass',fill=.5){
 if(!ac||muted||speed<.6)return;
 if(kind==='glass'){clink(x,speed);return;}
 playSample('heavy'+(Math.random()*3|0),x,Math.min(.4,speed*.035),rnd(.7,.85));
}
function glassRing(ob,speed){
 if(!ac||muted||ac.currentTime-(ob.lastRing||-1)<.15||audioVoices.size>18)return;ob.lastRing=ac.currentTime;
 const p=channel(ob.body.position.x),t=ac.currentTime,fill=ob.fluid/ob.capacity,f=1100+900*(1-fill),gain=Math.min(.035,speed*.003);
 tone(p,f,t,.22,gain);tone(p,f*2.71,t,.10,gain*.28);setTimeout(()=>p.disconnect(),400);
}
function levelChime(success){if(!ac||muted)return;const p=channel(0),t=ac.currentTime;for(let i=0;i<3;i++)tone(p,(success?[523,659,784]:[330,294,220])[i],t+i*.10,.28,.045);setTimeout(()=>p.disconnect(),800);}
function stopAudioVoices(){for(const source of audioVoices){try{source.stop();}catch{}}audioVoices.clear();}
document.addEventListener('visibilitychange',()=>{if(!ac)return;if(document.hidden){stopAudioVoices();ac.suspend().catch(()=>{});}else if(started)ac.resume().catch(()=>{});});
