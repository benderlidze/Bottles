'use strict';
function labelTexture(b){const c=document.createElement('canvas');c.width=1024;c.height=1400;const x=c.getContext('2d');const W=1024,H=1400;
function text(t,y,size,font='Georgia',color=b.ink,weight='normal',max=910){x.fillStyle=color;x.textAlign='center';x.font=`${weight} ${size}px ${font}`;x.fillText(t,W/2,y,max);}
function border(color,inset=24,w=3){x.strokeStyle=color;x.lineWidth=w;x.strokeRect(inset,inset,W-inset*2,H-inset*2);}
function line(y,color=b.ink,left=85,right=939){x.strokeStyle=color;x.lineWidth=2;x.beginPath();x.moveTo(left,y);x.lineTo(right,y);x.stroke();}
function seal(y,r,color,ink,letters){x.fillStyle=color;x.beginPath();for(let j=0;j<80;j++){let a=j/80*Math.PI*2,rr=r*(j%2?.95:1.04);x.lineTo(W/2+Math.sin(a)*rr,y+Math.cos(a)*rr);}x.closePath();x.fill();x.strokeStyle=ink;x.lineWidth=3;for(const f of [.79,.9]){x.beginPath();x.arc(W/2,y,r*f,0,Math.PI*2);x.stroke();}text(letters,y+r*.23,r*.72,'Georgia',ink,'bold');}
if(b.name.includes('JACK')){x.fillStyle='#11130f';x.fillRect(0,0,W,H);border('#ece9d9',22,5);border('#ece9d9',39,1.5);x.strokeStyle='#ece9d9';x.lineWidth=3;for(const y of [80,1315]){x.beginPath();x.moveTo(75,y);x.bezierCurveTo(210,y-35,300,y+40,425,y);x.bezierCurveTo(480,y-24,525,y-24,580,y);x.bezierCurveTo(700,y+35,815,y-35,949,y);x.stroke();}text('JACK DANIEL’S',240,144,'Georgia','#f5f0dd','bold');text('DISTILLERY',304,30,'Arial','#eee7d2','bold');x.strokeStyle='#eee7d2';x.lineWidth=5;x.beginPath();x.ellipse(512,545,250,170,0,0,Math.PI*2);x.stroke();x.lineWidth=1;x.beginPath();x.ellipse(512,545,267,184,0,0,Math.PI*2);x.stroke();text('Old',465,66,'Georgia','#f4eedc');text('No. 7',587,142,'Georgia','#f4eedc','bold');text('BRAND',650,37,'Georgia','#f4eedc');text('Tennessee',840,132,'Georgia','#f4eedc','italic');text('SOUR MASH',908,35,'Arial','#f4eedc','bold');text('WHISKEY',1040,123,'Georgia','#f4eedc','bold');line(1090,'#f4eedc');text('DISTILLED AND BOTTLED BY',1150,30,'Georgia','#f4eedc');text('JACK DANIEL DISTILLERY',1205,42,'Georgia','#f4eedc','bold');text('LYNCHBURG, TENNESSEE',1251,31,'Georgia','#f4eedc');text('700 ml                         40% Vol.',1349,31,'Georgia','#f4eedc');}
else if(b.name==='JIM BEAM'){x.fillStyle='#f4edd4';x.fillRect(0,0,W,H);border('#33281c',23,5);border('#b79149',40,3);text('THE WORLD’S No.1 BOURBON',99,33,'Arial','#963124','bold');line(127,'#ba9658',43,981);text('JIM BEAM',365,183,'Georgia','#211c16','bold');text('Since 1795',442,41,'Georgia','#76562b','italic');seal(655,153,'#a9221f','#f7e4b8','B');text('BOURBON',963,126,'Georgia','#211c16','bold');text('KENTUCKY STRAIGHT',1046,38,'Arial','#211c16','bold');text('BOURBON WHISKEY',1100,41,'Arial','#211c16','bold');text('James B. Beam',1220,80,'Georgia','#9a2f21','italic');line(1260,'#b79149');text('700 ml                         40% Vol.',1336,34,'Georgia','#30261c');}
else if(b.name==='JAMESON'){x.fillStyle='#e7ddbc';x.fillRect(0,0,W,H);border('#6d7751',18,3);border('#a79565',39,1);seal(230,128,'#a03023','#e5d4a0','J J S');text('JAMESON',550,215,'Georgia','#133c24','bold');text('IRISH WHISKEY',690,88,'Georgia','#173d25','bold');line(737,'#927b46');text('TRIPLE DISTILLED',860,72,'Georgia','#153923','bold');text('Exceptionally Smooth',975,65,'Georgia','#153923','italic');text('John Jameson & Son',1140,78,'Georgia','#153923','italic');text('ESTABLISHED 1780',1230,35,'Arial','#153923');text('700 ml                           40% Vol.',1340,35,'Georgia','#173d25');}
else if(b.name.includes('Maker')){x.fillStyle='#eee0b4';x.fillRect(0,0,W,H);for(let k=0;k<13000;k++){x.fillStyle=`rgba(103,77,32,${Math.random()*.07})`;x.fillRect(Math.random()*W,Math.random()*H,1.5,1.5);}text('Maker’s',290,207,'Georgia','#302315','bold');text('Mark',516,238,'Georgia','#302315','bold');seal(740,100,'#e9d9a5','#4b3520','S IV');text('KENTUCKY STRAIGHT',948,45,'Georgia','#302315','bold');text('BOURBON WHISKY',1050,75,'Georgia','#302315','bold');text('HANDMADE',1148,41,'Arial','#302315','bold');line(1210,'#5d4326');text('70 cl.                   45% Vol.',1332,40,'Georgia','#302315');}
else if(b.name.includes('JOHNNIE')){x.clearRect(0,0,W,H);x.save();x.translate(512,700);x.rotate(-.26);x.fillStyle='#92251c';x.fillRect(-640,-270,1280,540);x.strokeStyle='#eacb7c';x.lineWidth=14;x.strokeRect(-625,-255,1250,510);x.lineWidth=3;x.strokeRect(-608,-237,1216,474);x.textAlign='center';x.fillStyle='#ffe2a0';x.font='bold 58px Georgia';x.fillText('JOHNNIE WALKER',0,-140,980);x.font='bold 162px Georgia';x.fillText('Red Label',0,62,1100);x.font='38px Georgia';x.fillText('BLENDED SCOTCH WHISKY',0,166,960);x.restore();}

else if(b.name==='MOËT & CHANDON'){
 x.fillStyle='#e7d9af';x.fillRect(0,0,W,H);border('#a48b4c',22,7);border('#302b21',44,2);
 text('CHAMPAGNE',205,96,'Georgia','#353124');
 x.strokeStyle='#88713d';x.lineWidth=6;x.beginPath();x.moveTo(432,348);x.lineTo(445,278);x.lineTo(480,315);x.lineTo(512,258);x.lineTo(546,315);x.lineTo(580,278);x.lineTo(592,348);x.closePath();x.stroke();
 text('MOËT & CHANDON',650,210,'Georgia','#29271f','bold');line(727,'#a48b4c');
 text('IMPÉRIAL',970,170,'Georgia','#29271f');text('BRUT',1140,96,'Georgia','#29271f');
 text('ÉPERNAY · FRANCE',1310,44,'Georgia','#51432a');
}
else if(b.name==='BACARDÍ'){
 x.fillStyle='#f4eddc';x.fillRect(0,0,W,H);border('#a4987a',24,5);border('#a4987a',43,1);
 text('ESTABLISHED IN 1862',132,35,'Georgia','#534936');
 x.fillStyle='#ba2225';x.beginPath();x.arc(512,370,165,0,Math.PI*2);x.fill();
 // Bat seal drawn as a silhouette, kept crisp at every zoom.
 x.fillStyle='#26211d';x.beginPath();x.moveTo(512,330);x.bezierCurveTo(450,302,413,266,365,274);x.quadraticCurveTo(391,312,379,382);x.quadraticCurveTo(433,357,448,420);x.quadraticCurveTo(483,384,512,457);x.quadraticCurveTo(541,384,576,420);x.quadraticCurveTo(591,357,645,382);x.quadraticCurveTo(633,312,659,274);x.bezierCurveTo(611,266,574,302,512,330);x.fill();
 text('BACARDÍ',750,230,'Georgia','#211f1c','bold');text('CARTA BLANCA',920,100,'Georgia','#3b3226','bold');
 line(992,'#a4987a');text('SUPERIOR WHITE RUM',1090,42,'Georgia','#40382a');text('ORIGINAL RECIPE',1190,38,'Georgia','#40382a');text('700 ml                         37.5% Vol.',1330,32,'Arial','#40382a');
}
else if(b.name==='BOMBAY SAPPHIRE'){
 x.fillStyle='#e6daba';x.fillRect(0,0,W,H);border('#284f68',18,12);border('#ad9154',42,5);border('#284f68',61,2);
 text('BOMBAY',227,180,'Georgia','#173d57','bold');text('SAPPHIRE',420,180,'Georgia','#173d57','bold');
 x.fillStyle='#5d9db8';x.strokeStyle='#9d803e';x.lineWidth=14;x.beginPath();x.ellipse(512,700,156,203,0,0,Math.PI*2);x.fill();x.stroke();
 // Cameo medallion and botanical stems.
 x.fillStyle='#e9d9ae';x.beginPath();x.ellipse(512,659,67,87,-.12,0,Math.PI*2);x.fill();x.beginPath();x.moveTo(478,718);x.lineTo(467,775);x.quadraticCurveTo(405,786,410,836);x.lineTo(606,836);x.quadraticCurveTo(610,784,541,769);x.lineTo(542,716);x.fill();
 x.strokeStyle='#7e8151';x.lineWidth=5;for(const side of [-1,1]){x.beginPath();x.moveTo(512+side*245,850);x.quadraticCurveTo(512+side*300,690,512+side*225,527);x.stroke();for(let j=0;j<5;j++){x.beginPath();x.ellipse(512+side*(253+j*4),590+j*44,15,29,side*.7,0,Math.PI*2);x.stroke();}}
 text('DISTILLED',1010,43,'Georgia','#21495b');text('LONDON DRY GIN',1120,66,'Georgia','#21495b','bold');text('VAPOUR INFUSED',1235,35,'Arial','#21495b');text('700 ml                         40% Vol.',1333,32,'Arial','#21495b');
}
else if(b.name==='JÄGERMEISTER'){
 x.fillStyle='#e8d9b4';x.fillRect(0,0,W,H);border('#a34e24',18,18);border('#25472e',43,10);
 x.fillStyle='#24432b';x.beginPath();x.arc(512,338,221,0,Math.PI*2);x.fill();x.strokeStyle='#c2a35f';x.lineWidth=6;x.stroke();
 x.strokeStyle='#eee2b8';x.lineWidth=12;x.lineCap='round';
 for(const side of [-1,1]){x.beginPath();x.moveTo(512+side*30,369);x.lineTo(512+side*79,288);x.lineTo(512+side*115,216);x.lineTo(512+side*111,161);x.moveTo(512+side*79,288);x.lineTo(512+side*149,269);x.lineTo(512+side*172,219);x.moveTo(512+side*115,216);x.lineTo(512+side*66,199);x.lineTo(512+side*57,164);x.stroke();}
 x.fillStyle='#eee2b8';x.beginPath();x.moveTo(472,340);x.lineTo(482,443);x.lineTo(512,483);x.lineTo(542,443);x.lineTo(552,340);x.quadraticCurveTo(512,320,472,340);x.fill();
 x.lineWidth=7;x.beginPath();x.moveTo(512,153);x.lineTo(512,265);x.moveTo(475,194);x.lineTo(549,194);x.stroke();
 x.fillStyle='#c65824';x.fillRect(61,591,902,217);text('Jägermeister',760,210,'Georgia','#f9ebc8','bold');
 text('56 BOTANICALS',964,72,'Georgia','#294530','bold');text('HERBAL LIQUEUR',1085,65,'Georgia','#294530');text('WOLFENBÜTTEL · GERMANY',1200,33,'Georgia','#294530');text('700 ml                         35% Vol.',1320,34,'Arial','#294530');
}
else if(b.name==='HEINEKEN'){
 x.clearRect(0,0,W,H);x.fillStyle='#e8e6cc';x.beginPath();x.ellipse(512,700,500,685,0,0,Math.PI*2);x.fill();x.strokeStyle='#1b623c';x.lineWidth=22;x.beginPath();x.ellipse(512,700,469,649,0,0,Math.PI*2);x.stroke();
 x.fillStyle='#c52728';x.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?79:183;x.lineTo(512+Math.cos(a)*r,355+Math.sin(a)*r);}x.closePath();x.fill();
 text('PREMIUM QUALITY',115,31,'Arial','#215e39','bold');text('Heineken',800,250,'Georgia','#185c38','bold');
 line(872,'#235e39',160,864);text('ORIGINAL',1017,72,'Georgia','#1a5735','bold');text('PURE MALT LAGER',1128,37,'Arial','#235e39');text('330 ml     5% Vol.',1252,33,'Arial','#235e39');
}
else if(b.name==='COCA-COLA'){
 x.fillStyle='#bd2027';x.fillRect(0,0,W,H);text('ORIGINAL TASTE',220,50,'Arial','#fff4df','bold');
 text('Coca-Cola',900,350,'Georgia','#fff8eb','italic');
 x.strokeStyle='#fff8eb';x.lineWidth=14;x.beginPath();x.moveTo(130,1000);x.bezierCurveTo(370,850,620,1190,900,947);x.stroke();
 text('CLASSIC · 250 ml',1270,45,'Arial','#fff4df');
}
else{c.width=1024;c.height=1400;x.clearRect(0,0,W,H);text('ABSOLUT',270,215,'Arial','#124489','bold');text('VODKA',495,232,'Arial','#124489','bold');for(const [i,t]of ['One source. One community.','One superb vodka.','Crafted in the village','of Åhus, Sweden.','Absolut. Since 1879.'].entries())text(t,680+i*98,52,'Georgia','#344548','italic');text('COUNTRY OF SWEDEN',1260,38,'Arial','#124489','bold');text('700 ml             40% Vol.',1360,38,'Arial','#344548');}
const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;return t;}

const labels=brands.map(b=>new THREE.MeshStandardMaterial({map:labelTexture(b),roughness:.88,metalness:0,alphaTest:.2,side:THREE.DoubleSide}));
