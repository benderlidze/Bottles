'use strict';
// Level goals use simulation time, so slow motion and a hidden tab cannot consume a round.
const LEVELS=[
 {name:'01 · Первая трещина',hint:'Повредите 4 бутылки за 6 бросков. Удерживайте, чтобы увидеть траекторию.',layout:'range',goal:4,ammo:6,focus:2.3,distance:18},
 {name:'02 · Каскад',hint:'Повредите 8 из 10 бутылок за 4 броска. Начните с нижних опор.',layout:'cascade',goal:8,ammo:4,focus:4.4,distance:23},
 {name:'03 · Домино',hint:'Опрокиньте или разбейте 5 из 9 бутылок за 4 броска. Цельтесь в плечо крайней.',layout:'domino',goal:5,ammo:4,focus:2.2,distance:20},
 {name:'04 · Не тронь синюю',hint:'Повредите 4 цели за 5 бросков. Бутылка над синим кольцом должна уцелеть.',layout:'precision',goal:4,ammo:5,focus:2.7,distance:21},
 {name:'05 · Хрупкий мост',hint:'Снесите все 5 бутылок за 4 броска: разбейте, опрокиньте или сбросьте с моста.',layout:'bridge',goal:5,ammo:4,focus:3,distance:20}
];
let levelIndex=0,round=null,levelDecor=[],bestResults={};
try{bestResults=JSON.parse(localStorage.getItem('last-call-best-v1')||'{}')||{};}catch{}
function clearLevelDecor(){for(const o of levelDecor)clearObject(o);levelDecor=[];}
function marker(ob,color){const mesh=new THREE.Mesh(new THREE.RingGeometry(.45,.51,48),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.85,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(ob.body.position.x,.012,0);scene.add(mesh);levelDecor.push(mesh);}
function buildPyramid(rows=5){let floor=-.02;for(let row=0;row<rows;row++){const count=rows-row,ids=Array.from({length:count},(_,j)=>(j+row*2)%6),height=Math.max(...ids.map(i=>brands[i].h));for(let j=0;j<count;j++){const idx=ids[j],b=brands[idx],riser=height-b.h,x=(j-(count-1)/2)*1.27;if(riser>.015)addPlank(b.w*.96,floor+riser/2,riser,x,b.depth*.96);addBottle(x,floor+riser,idx);}if(row<rows-1)addPlank((count-1)*1.27+.52,floor+height+.0275);floor+=height+.055;}}
function buildChallenge(){
 const level=LEVELS[levelIndex];round={score:0,combo:0,bestCombo:0,lastBreak:-10,lastShot:-10,progress:0,status:'playing',stars:0};
 if(level.layout==='range')for(let i=0;i<5;i++){const base=i%2?.65:0;if(base)addPlank(.95,base/2,base,(i-2)*1.65,1);addBottle((i-2)*1.65,base,i);}
 if(level.layout==='cascade')buildPyramid(4);
 if(level.layout==='domino')for(let i=0;i<9;i++){const ob=addBottle((i-4)*.38,0,2);ob.body.position.z=ob.initial.z=ob.group.position.z=(4-i)*.62;ob.body.aabbNeedsUpdate=true;ob.fluid=ob.capacity*.28;syncBottleMass(ob,true);}
 if(level.layout==='precision')for(let i=0;i<5;i++){const ob=addBottle((i-2)*1.8,0,i===2?5:i);ob.protected=i===2;marker(ob,ob.protected?0x63cfff:0xeac383);}
 if(level.layout==='bridge'){addBottle(-2,0,2);addBottle(2,0,2);addPlank(5,brands[2].h+.07,.14,0,1.1);for(let i=0;i<3;i++)addBottle((i-1)*1.35,brands[2].h+.14,i);}
 focus.set(0,level.focus,0);zoom=1;resize();refreshRoundHUD();showToast(level.hint);
}
function levelProgress(){if(gameMode!=='challenge'||!round)return broken;const level=LEVELS[levelIndex];return bottles.filter(ob=>{if(ob.protected)return false;if(ob.counted)return true;if(level.layout==='bridge'&&ob.body.position.y<ob.initial.y-.75)return true;return (level.layout==='domino'||level.layout==='bridge')&&new THREE.Vector3(0,1,0).applyQuaternion(ob.group.quaternion).y<.55;}).length;}
function scoreBreak(ob){if(gameMode!=='challenge'||!round||round.status!=='playing'||ob.protected)return;round.combo=simTime-round.lastBreak<1.4?Math.min(5,round.combo+1):1;round.lastBreak=simTime;round.bestCombo=Math.max(round.bestCombo,round.combo);round.score+=100*round.combo+(ob.perforations?75:0);refreshRoundHUD();}
function canThrow(){return gameMode!=='challenge'||(round?.status==='playing'&&shots<LEVELS[levelIndex].ammo);}
function recordThrow(){if(round&&gameMode==='challenge')round.lastShot=simTime;refreshRoundHUD();}
function refreshRoundHUD(){
 const challenge=gameMode==='challenge',level=LEVELS[levelIndex];
 if(gameMode!=='toss'){$('broken').textContent=String(challenge?levelProgress():broken).padStart(2,'0')+' / '+(challenge?level.goal:bottles.length);$('broken').nextElementSibling.textContent=challenge&&['domino','bridge'].includes(level.layout)?'СНЕСЕНО':'ПОВРЕЖДЕНО';}
 $('shots').textContent=String(shots).padStart(2,'0')+(challenge?' / '+level.ammo:'');
 $('score').textContent=String(challenge&&round?round.score:0).padStart(4,'0');
 $('combo').textContent=challenge&&round?.combo>1&&simTime-round.lastBreak<1.4?'ЦЕПОЧКА ×'+round.combo:'ОЧКИ';
 $('objective').textContent=challenge?level.hint:gameMode==='toss'?'10 подбросов. Попадите в бутылку до её приземления. Берите упреждение.':'Свободная игра. 15 бутылок, неограниченные броски.';
 const best=bestResults[levelIndex];$('personalBest').textContent=challenge&&best?'РЕКОРД '+best.score+' · '+'★'.repeat(best.stars):challenge?'НОВОЕ ИСПЫТАНИЕ':'БЕЗ ЛИМИТА БРОСКОВ';
}
function finishRound(won,reason){
 if(!round||round.status!=='playing')return;round.status=won?'won':'lost';round.combo=0;
 if(won){round.stars=shots<=Math.ceil(LEVELS[levelIndex].ammo/2)?3:shots<LEVELS[levelIndex].ammo?2:1;round.score+=(LEVELS[levelIndex].ammo-shots)*150;const old=bestResults[levelIndex]||{score:0,stars:0};bestResults[levelIndex]={score:Math.max(old.score,round.score),stars:Math.max(old.stars,round.stars)};try{localStorage.setItem('last-call-best-v1',JSON.stringify(bestResults));}catch{}}
 charging=false;$('charge').style.width='0';$('resultTitle').textContent=won?'Уровень пройден':'Ещё одна попытка';$('resultDetail').textContent=won?'★'.repeat(round.stars)+' · '+round.score+' очков · цепочка ×'+round.bestCombo:reason;
 $('nextLevel').hidden=!won||levelIndex===LEVELS.length-1;$('result').hidden=false;levelChime(won);refreshRoundHUD();
}
function updateChallenges(){if(!started||gameMode!=='challenge'||!round||round.status!=='playing')return;
 if(bottles.some(ob=>ob.protected&&(ob.damage>0||ob.body.position.distanceTo(ob.initial)>.4))){finishRound(false,'Синяя бутылка пострадала. Попробуйте более точный бросок.');return;}
 const progress=levelProgress();if(progress!==round.progress){if(LEVELS[levelIndex].layout==='domino')round.score+=Math.max(0,progress-round.progress)*100;round.progress=progress;refreshRoundHUD();}
 // Let the final ball and the collapse finish; a direct hit must not end the round mid-flight.
 if(progress>=LEVELS[levelIndex].goal&&simTime-round.lastShot>2&&simTime-round.lastBreak>1.4){finishRound(true);return;}
 if(shots>=LEVELS[levelIndex].ammo&&simTime-round.lastShot>8&&simTime-round.lastBreak>2)finishRound(false,'Броски закончились. Ищите слабые места и запускайте цепную реакцию.');
 if(round.combo&&simTime-round.lastBreak>1.4){round.combo=0;$('combo').textContent='ОЧКИ';}
}
function selectMode(value){
 charging=false;$('charge').style.width='0';$('result').hidden=true;round=null;
 if(value==='toss'||value==='pyramid')gameMode=value;else{gameMode='challenge';levelIndex=THREE.MathUtils.clamp(Number(value)||0,0,LEVELS.length-1);}
 $('levelSelect').value=gameMode==='challenge'?String(levelIndex):gameMode;
 $('mode').textContent=gameMode==='toss'?'К уровням':'В воздух';$('mode').classList.toggle('on',gameMode==='toss');
 if(gameMode!=='challenge'){focus.set(0,5.1,0);zoom=1;resize();}rebuild();refreshRoundHUD();shadowFrames=3;
}
const levelSelect=$('levelSelect');for(let i=0;i<LEVELS.length;i++){const option=document.createElement('option');option.value=i;option.textContent=LEVELS[i].name;levelSelect.appendChild(option);}for(const [value,text]of [['pyramid','Песочница · Пирамида'],['toss','Аркада · В воздухе']]){const option=document.createElement('option');option.value=value;option.textContent=text;levelSelect.appendChild(option);}
levelSelect.onchange=()=>selectMode(levelSelect.value);$('nextLevel').onclick=()=>selectMode(String(levelIndex+1));$('retryLevel').onclick=()=>selectMode(String(levelIndex));



