'use strict';
const $=id=>document.getElementById(id), rnd=(a,b)=>a+Math.random()*(b-a);
const scene=new THREE.Scene();scene.background=new THREE.Color('#18221e');scene.fog=new THREE.FogExp2('#18221e',.014);
const camera=new THREE.PerspectiveCamera(39,innerWidth/innerHeight,.1,100);let baseCamera=new THREE.Vector3(0,6.7,24);let zoom=1;const focus=new THREE.Vector3(0,5.1,0);
camera.position.copy(baseCamera);camera.lookAt(focus);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.localClippingEnabled=true;renderer.transmissionResolutionScale=1;$('stage').appendChild(renderer.domElement);
const ambient=new THREE.HemisphereLight(0xdbe7e3,0x3d2a1c,.60);scene.add(ambient);
const key=new THREE.DirectionalLight(0xffe5bc,2.0);key.position.set(-5,9,6);scene.add(key);
const fill=new THREE.DirectionalLight(0xd6edff,.65);fill.position.set(5,6,8);scene.add(fill);
const rim=new THREE.SpotLight(0xfbe1b3,170,35,.64,.9,1.3);rim.position.set(3,11,-3);rim.target.position.set(0,5,0);scene.add(rim,rim.target);
const spot=new THREE.SpotLight(0xffe6c8,170,40,.60,.88,1.5);spot.position.set(-5,12,8);spot.target.position.set(0,3,0);spot.castShadow=true;spot.shadow.mapSize.set(1024,1024);spot.shadow.bias=-.0004;spot.shadow.normalBias=.015;spot.shadow.radius=4;scene.add(spot,spot.target);
const envScene=new THREE.Scene();envScene.background=new THREE.Color('#101817');
function envPanel(x,y,z,sx,sy,c){const m=new THREE.Mesh(new THREE.PlaneGeometry(sx,sy),new THREE.MeshBasicMaterial({color:c}));m.position.set(x,y,z);m.lookAt(0,0,0);envScene.add(m);}
envPanel(-7,3,4,2.5,17,'#fff6df');envPanel(6,3,1,1.2,16,'#d7edff');envPanel(0,10,1,9,3,'#d5dfd8');envPanel(0,0,-8,2,12,'#4d695c');envPanel(-1,0,8,2,12,'#182521');const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(envScene,.035).texture;pmrem.dispose();
function woodTexture(){const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d'),img=x.createImageData(c.width,c.height);for(let y=0;y<c.height;y++)for(let xx=0;xx<c.width;xx++){let grain=Math.sin(y*.9+Math.sin(xx*.008)*2)*1.4+Math.sin(y*.27+Math.sin(xx*.003)*5)*2.6+Math.random()*2;let offset=(y*c.width+xx)*4;img.data[offset]=43+grain;img.data[offset+1]=30+grain*.66;img.data[offset+2]=22+grain*.45;img.data[offset+3]=255;}x.putImageData(img,0,0);x.fillStyle='#1c140e';for(let y=0;y<512;y+=128)x.fillRect(0,y,1024,1);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,1);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}

const wood=new THREE.MeshStandardMaterial({map:woodTexture(),roughness:.48,metalness:0});
const table=new THREE.Mesh(new THREE.BoxGeometry(23,.4,12),wood);table.position.set(0,-.22,0);table.receiveShadow=true;scene.add(table);
const trim=new THREE.Mesh(new THREE.BoxGeometry(23,.035,.06),new THREE.MeshStandardMaterial({color:0x9d7842,metalness:.75,roughness:.27}));trim.position.set(0,-.07,6);scene.add(trim);
const back=new THREE.Mesh(new THREE.PlaneGeometry(60,35),new THREE.MeshStandardMaterial({color:0x1b261e,roughness:.87}));back.position.set(0,10,-6);scene.add(back);
for(let x=-18;x<=18;x+=2){const slat=new THREE.Mesh(new THREE.BoxGeometry(.018,22,.06),new THREE.MeshStandardMaterial({color:0x2b3830,roughness:.7}));slat.position.set(x,8,-5.94);scene.add(slat);}
// Warm vertical lamps behind the still life.
for(const x of [-7.5,7.5]){let lamp=new THREE.Mesh(new THREE.BoxGeometry(.04,8,.05),new THREE.MeshBasicMaterial({color:0xe8bd77}));lamp.position.set(x,4,-5.7);scene.add(lamp);let glow=new THREE.PointLight(0xf9b35b,14,12);glow.position.set(x,4,-4);scene.add(glow);}
