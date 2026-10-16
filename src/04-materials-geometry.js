'use strict';
const glassMats=brands.map(b=>new THREE.MeshPhysicalMaterial({color:b.tint??(b.name==='JAMESON'?0x93c59a:0xffffff),roughness:.075,transmission:1,thickness:.085,ior:1.52,opacity:1,clearcoat:.18,clearcoatRoughness:.08,envMapIntensity:1.15,side:THREE.FrontSide,attenuationColor:new THREE.Color(b.glass),attenuationDistance:.55}));
const fragmentMats=brands.map(b=>new THREE.MeshPhysicalMaterial({color:b.tint??0xffffff,metalness:0,roughness:.075,transmission:.94,thickness:.018,ior:1.52,attenuationColor:new THREE.Color(b.glass),attenuationDistance:.45,opacity:1,side:THREE.FrontSide,envMapIntensity:.85}));
const geometries=[];let bottles=[],planks=[],debris=[],balls=[],puddles=[],ripples=[],breakQueue=new Map(),broken=0,shots=0,started=false,slow=false,shake=0,simTime=0,resetAt=0;
const N=8,R=4,TAU=Math.PI*2;let gameMode='pyramid';
function countBroken(ob){if(ob.counted)return;ob.counted=true;broken++;refreshRoundHUD();}
const bottleProfiles=[
[[0,.90],[.025,.98],[.055,1],[.575,1],[.61,.98],[.65,.88],[.70,.63],[.75,.40],[.78,.37],[.91,.37],[.93,.40],[.96,.38],[1,.383]],
[[0,.89],[.022,.98],[.065,1],[.57,1],[.62,.98],[.655,.91],[.70,.70],[.75,.45],[.79,.31],[.83,.31],[.845,.36],[.875,.36],[.9,.31],[1,.31]],
[[0,.83],[.025,.96],[.065,1],[.565,1],[.61,.97],[.655,.85],[.70,.64],[.75,.39],[.79,.30],[.89,.30],[.915,.33],[.94,.31],[1,.31]],
[[0,.90],[.035,.98],[.08,1],[.51,1],[.57,.99],[.64,.91],[.70,.72],[.75,.48],[.78,.32],[.94,.31],[1,.32]],
[[0,.90],[.018,.96],[.045,1],[.625,1],[.65,.99],[.69,.91],[.735,.69],[.79,.37],[.82,.32],[.97,.32],[1,.34]],
[[0,.81],[.018,.94],[.05,1],[.61,1],[.655,.985],[.70,.92],[.75,.76],[.79,.52],[.815,.40],[.86,.39],[.88,.42],[1,.40]],
// Champagne: broad heel, gently sloping shoulders and a long foiled neck.
[[0,.83],[.025,.95],[.065,1],[.38,1],[.44,.98],[.51,.92],[.58,.79],[.65,.59],[.70,.44],[.77,.34],[.88,.33],[.90,.36],[.94,.35],[.985,.34],[1,.32]],
// Carta Blanca: cylindrical body with a slender, extended neck.
[[0,.86],[.025,.97],[.065,1],[.60,1],[.65,.97],[.70,.81],[.755,.54],[.81,.32],[.9,.31],[.92,.34],[.95,.32],[1,.32]],
// Sapphire: rounded rectangular flask, high shoulders, short round neck.
[[0,.90],[.025,.97],[.065,1],[.64,1],[.69,.96],[.74,.82],[.80,.54],[.855,.35],[.91,.33],[.94,.35],[1,.34]],
// Jägermeister: wide, flattened body and compact sloping shoulders.
[[0,.87],[.025,.97],[.065,1],[.71,1],[.75,.96],[.79,.82],[.84,.52],[.88,.34],[.94,.33],[.97,.35],[1,.34]],
// Long-neck beer bottle with a rolled lip for a crown closure.
[[0,.84],[.025,.97],[.065,1],[.49,1],[.55,.96],[.61,.82],[.68,.61],[.76,.45],[.85,.38],[.94,.38],[.96,.43],[1,.42]],
// Contour glass: rounded heel, pinched waist, fuller shoulder, narrow mouth.
[[0,.80],[.025,.94],[.10,.98],[.20,.96],[.32,.85],[.42,.83],[.53,.94],[.60,1],[.65,.96],[.71,.79],[.78,.53],[.85,.40],[.94,.38],[.97,.42],[1,.40]]
];
brands.forEach((b,i)=>{b.profile=bottleProfiles[i];b.strength??=[1.12,1,1.02,1.2,1.08,1.1][i]??1;});
function radiusAt(b,y){const t=THREE.MathUtils.clamp((y+b.h/2)/b.h,0,1),ps=b.profile;for(let i=1;i<ps.length;i++)if(t<=ps[i][0]){const p=ps[i-1],q=ps[i],f=(t-p[0])/(q[0]-p[0]);const slope=(q[1]-p[1])/(q[0]-p[0]),before=i>1?(p[1]-ps[i-2][1])/(p[0]-ps[i-2][0]):slope,after=i<ps.length-1?(ps[i+1][1]-q[1])/(ps[i+1][0]-q[0]):slope,m0=before*slope>0?2*before*slope/(before+slope):0,m1=after*slope>0?2*after*slope/(after+slope):0,d=q[0]-p[0];return (2*f*f*f-3*f*f+1)*p[1]+(f*f*f-2*f*f+f)*d*m0+(-2*f*f*f+3*f*f)*q[1]+(f*f*f-f*f)*d*m1;}return ps.at(-1)[1];}
// One cross-section for rendering, liquid, ray sweeps and fracture surfaces.
// Rectangular bodies become circular at their own shoulder/neck heights.
function bottleSection(b,y,inset=0){const f=radiusAt(b,y),blend=THREE.MathUtils.smoothstep((y+b.h/2)/b.h,b.shoulder,b.neck);return {rx:Math.max(.001,b.w*f/2-inset),rz:Math.max(.001,THREE.MathUtils.lerp(b.depth,b.w,blend)*f/2-inset),power:THREE.MathUtils.lerp(b.power,2,blend)};}
function surfPoint(b,a,y,inset=0){const {rx,rz,power}=bottleSection(b,y,inset),sx=Math.sin(a),sz=Math.cos(a),pow=2/power;return new THREE.Vector3(Math.sign(sx)*Math.pow(Math.abs(sx),pow)*rx,y,Math.sign(sz)*Math.pow(Math.abs(sz),pow)*rz);}
// A closed band following the actual glass outline, also used for the heel.
function profileBand(b,lo,hi,outset=0,segments=40){const positions=[],indices=[],rings=12;
 for(let j=0;j<=rings;j++)for(let k=0;k<segments;k++){const p=surfPoint(b,k/segments*TAU,(lo+(hi-lo)*j/rings-.5)*b.h,-outset);positions.push(p.x,p.y,p.z);}
 for(let j=0;j<rings;j++)for(let k=0;k<segments;k++){const a=j*segments+k,c=j*segments+(k+1)%segments;indices.push(a,c,c+segments,a,c+segments,a+segments);}
 const bottom=positions.length/3;positions.push(0,(lo-.5)*b.h,0,0,(hi-.5)*b.h,0);
 for(let k=0;k<segments;k++){const next=(k+1)%segments;indices.push(bottom,next,k,bottom+1,rings*segments+k,rings*segments+next);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function surfaceNormal(b,a,y){const da=surfPoint(b,a+.0001,y).sub(surfPoint(b,a-.0001,y)),dy=surfPoint(b,a,y+.0001).sub(surfPoint(b,a,y-.0001));return da.cross(dy).normalize();}
function mergeGeometry(gs){let p=[],n=[];for(let g of gs){const arr=Array.from(g.attributes.position.array);for(let i=g.userData.surfaceCount*3;i<arr.length;i++)arr[i]=0;p.push(...arr);n.push(...g.attributes.normal.array);}let g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));return g;}
function makeLiquid(ob){const b=brands[ob.idx],points=[],rings=[.035,...b.profile.filter(p=>p[0]>.035&&p[0]<.97).map(p=>p[0]),.97];const vertices=[],triangles=[],edges=[];
for(let j=0;j<rings.length;j++)for(let k=0;k<24;k++){let p=surfPoint(b,k/24*TAU,-b.h/2+rings[j]*b.h,.045);vertices.push(p);if(j){edges.push([vertices.length-1,vertices.length-25]);}if(k)edges.push([vertices.length-1,vertices.length-2]);if(k===23)edges.push([vertices.length-1,vertices.length-24]);}
for(let j=0;j<rings.length-1;j++)for(let k=0;k<24;k++){let a=j*24+k,c=j*24+(k+1)%24;triangles.push(a,c,c+24,a,c+24,a+24);}for(let k=1;k<23;k++)triangles.push(0,k+1,k,(rings.length-1)*24,(rings.length-1)*24+k,(rings.length-1)*24+k+1);
const geo=new THREE.BufferGeometry();geo.setFromPoints(vertices);geo.setIndex(triangles);geo.computeVertexNormals();ob.liqPlane=new THREE.Plane(new THREE.Vector3(0,-1,0));const mat=new THREE.MeshPhysicalMaterial({color:b.liquid,roughness:.20,metalness:0,transparent:false,opacity:b.clearLiquid?.10:.44,blending:THREE.CustomBlending,blendSrc:THREE.SrcAlphaFactor,blendDst:THREE.OneMinusSrcAlphaFactor,blendEquation:THREE.AddEquation,side:THREE.DoubleSide,clippingPlanes:[ob.liqPlane],depthWrite:false});ob.liq=new THREE.Mesh(geo,mat);ob.liq.renderOrder=1;ob.group.add(ob.liq);const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(1800),3));sg.setDrawRange(0,0);ob.surf=new THREE.Mesh(sg,new THREE.MeshPhysicalMaterial({color:b.liquid,metalness:.03,roughness:.045,transparent:false,opacity:b.clearLiquid?.18:.5,blending:THREE.CustomBlending,blendSrc:THREE.SrcAlphaFactor,blendDst:THREE.OneMinusSrcAlphaFactor,blendEquation:THREE.AddEquation,side:THREE.DoubleSide,depthWrite:false}));ob.surf.renderOrder=2;ob.group.add(ob.surf);ob.liquidVerts=vertices;ob.liquidEdges=edges;ob.samples=[];
for(let y=-b.h/2+.09;y<b.h/2-.05;y+=b.h/12)for(let x=-b.w*.44;x<b.w*.45;x+=b.w/6)for(let z=-b.depth*.44;z<b.depth*.45;z+=b.depth/6){const {rx,rz,power}=bottleSection(b,y,.045);if(Math.pow(Math.abs(x)/rx,power)+Math.pow(Math.abs(z)/rz,power)<1)ob.samples.push(new THREE.Vector3(x,y,z));}ob.capacity=b.w*b.depth*b.h*.65;ob.fluid=ob.capacity*rnd(...(b.fill||[.58,.78]));ob.pressure=b.sparkling?1:0;ob.vented=false;ob.slosh=new THREE.Vector2();ob.sloshV=new THREE.Vector2();ob.prevV=new THREE.Vector3();ob.fluidN=new THREE.Vector3(0,1,0);ob.fluidH=0;}

// --- Performance helpers ---------------------------------------------------
// Shape-level collision groups. Bottles touch each other and planks only through 4 cheap row proxies,
// while the 32 breakable patches collide with the table, balls, base boxes and debris.
const SG={DEF:1,PATCH:16,PROXY:32,DEBRIS:64,PLANK:256,BASE:512};
const SG_MASK={[SG.PATCH]:~(SG.PATCH|SG.PROXY|SG.PLANK|SG.BASE),[SG.PROXY]:SG.PROXY|SG.PLANK|SG.BASE|SG.PATCH,[SG.DEBRIS]:SG.DEF|SG.PATCH|SG.PLANK|SG.BASE,[SG.PLANK]:~SG.PATCH,[SG.BASE]:~SG.PATCH};
function setShapeGroup(shape,g){shape.collisionFilterGroup=g;shape.collisionFilterMask=SG_MASK[g]??-1;return shape;}
// Octagonal prism (or frustum when taper) around the bottle axis for one row. Prisms pass their 5 unique axes so SAT stays cheap.
function proxyShape(b,y0,y1,taper){const M=8,unit=[],ref=y0+(y1-y0)*.5,fr=radiusAt(b,ref);for(let k=0;k<M;k++){const p=surfPoint(b,(k+.5)*TAU/M-Math.PI,ref);unit.push([p.x/fr,p.z/fr]);}
let s0,s1;if(taper){s0=radiusAt(b,y0);s1=radiusAt(b,y1);}else{s0=0;for(let i=0;i<=6;i++)s0=Math.max(s0,radiusAt(b,y0+(y1-y0)*i/6));s1=s0;}
const cy=(y0+y1)/2,verts=[];for(const [y,s]of [[y0,s0],[y1,s1]])for(const [x,z]of unit)verts.push(new CANNON.Vec3(x*s,y-cy,z*s));
const faces=[[...Array(M).keys()],[...Array(M).keys()].map(k=>M+k)];for(let k=0;k<M;k++){const k1=(k+1)%M;faces.push([k,k1,M+k1,M+k]);}
for(const f of faces){const a=verts[f[0]],n=verts[f[1]].vsub(a).cross(verts[f[2]].vsub(a)),c=new CANNON.Vec3();for(const i of f)c.vadd(verts[i],c);c.scale(1/f.length,c);if(n.dot(c)<0)f.reverse();}
let axes;if(!taper){axes=[new CANNON.Vec3(0,1,0)];for(let k=0;k<M/2;k++){const a=verts[k],c=verts[(k+1)%M],n=new CANNON.Vec3(c.z-a.z,0,a.x-c.x);n.normalize();axes.push(n);}}
return {shape:setShapeGroup(new CANNON.ConvexPolyhedron({vertices:verts,faces,axes}),SG.PROXY),offset:new CANNON.Vec3(0,cy,0)};}
// Drop the proxy of a row once half of its glass is gone, so other bottles can fall into the broken section.
function refreshProxies(ob){for(let row=0;row<R;row++){if(!ob.proxies[row])continue;const inRow=ob.parts.filter(p=>p.row===row);if(inRow.some(p=>!p.attached)){ob.body.removeShape(ob.proxies[row]);ob.proxies[row]=null;for(const part of inRow)if(part.attached)part.shape.collisionFilterMask=SG.DEF|SG.PLANK|SG.BASE|SG.PROXY|SG.DEBRIS;}}}
function pushAll(dst,src){for(let i=0;i<src.length;i++)dst.push(src[i]);}
// Bake meshes (with their local transforms) into one non-indexed geometry: one draw call instead of many.
function mergeMeshes(meshes){const pos=[],nor=[],uv=[];for(const m of meshes){m.updateMatrix();const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrix);if(!g.attributes.normal)g.computeVertexNormals();pushAll(pos,g.attributes.position.array);pushAll(nor,g.attributes.normal.array);if(g.attributes.uv)pushAll(uv,g.attributes.uv.array);else for(let i=0;i<g.attributes.position.count;i++)uv.push(0,0);g.dispose();}
const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));out.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));out.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return out;}
// Settled debris is baked into a few big static buffers (one draw call per material) and its physics body is removed.
const edgeMat=new THREE.LineBasicMaterial({color:0xcce0d3,transparent:true,opacity:.12});
let staticBatches=new Map(),staticObjects=[];
function batchFor(material,isLine,need){let list=staticBatches.get(material);if(!list)staticBatches.set(material,list=[]);let batch=list.at(-1);if(!batch||batch.used+need>batch.max){if(list.length>=2){const oldest=list.shift();scene.remove(oldest.mesh);oldest.mesh.geometry.dispose();}const max=Math.max(need,isLine?32768:49152),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(max*3),3).setUsage(THREE.DynamicDrawUsage));if(!isLine){g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(max*3),3).setUsage(THREE.DynamicDrawUsage));g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(max*2),2).setUsage(THREE.DynamicDrawUsage));}g.setDrawRange(0,0);const mesh=isLine?new THREE.LineSegments(g,material):new THREE.Mesh(g,material);mesh.frustumCulled=false;mesh.renderOrder=material===edgeMat?0:1;scene.add(mesh);batch={mesh,used:0,max};list.push(batch);}return batch;}
const _nm=new THREE.Matrix3(),_v=new THREE.Vector3();
function bakeStatic(obj){obj.updateMatrixWorld(true);const caps=[];obj.traverse(o=>{if(!(o.isMesh||o.isLineSegments))return;if(o.isMesh&&!fragmentMats.includes(o.material)&&!labels.includes(o.material)){caps.push(o);return;}
const g0=o.geometry,g=g0.index?g0.toNonIndexed():g0,count=g.attributes.position.count,batch=batchFor(o.material,o.isLineSegments,count),ga=batch.mesh.geometry.attributes,at=batch.used;_nm.getNormalMatrix(o.matrixWorld);
for(let i=0;i<count;i++){_v.fromBufferAttribute(g.attributes.position,i).applyMatrix4(o.matrixWorld);ga.position.setXYZ(at+i,_v.x,_v.y,_v.z);if(ga.normal){if(g.attributes.normal)_v.fromBufferAttribute(g.attributes.normal,i).applyMatrix3(_nm).normalize();else _v.set(0,1,0);ga.normal.setXYZ(at+i,_v.x,_v.y,_v.z);ga.uv.setXY(at+i,g.attributes.uv?g.attributes.uv.getX(i):0,g.attributes.uv?g.attributes.uv.getY(i):0);}}
for(const k in ga){ga[k].addUpdateRange(at*ga[k].itemSize,count*ga[k].itemSize);ga[k].needsUpdate=true;}batch.used+=count;batch.mesh.geometry.setDrawRange(0,batch.used);if(g!==g0)g.dispose();});
for(const c of caps){c.matrixWorld.decompose(c.position,c.quaternion,c.scale);scene.add(c);staticObjects.push(c);while(staticObjects.length>32)clearObject(staticObjects.shift());}obj.removeFromParent();obj.traverse(o=>{if(o.geometry&&!caps.includes(o))o.geometry.dispose();});}
function clearStatic(){for(const list of staticBatches.values())for(const b of list){scene.remove(b.mesh);b.mesh.geometry.dispose();}staticBatches.clear();for(const o of staticObjects)clearObject(o);staticObjects=[];}
// Light rim along the broken edge, so an opening reads as an opening (the back wall seen through it is green glass too).
const rimMat=new THREE.LineBasicMaterial({color:0xe6f2ea,transparent:true,opacity:.55,depthWrite:false});
function updateRim(ob){if(ob.rim){ob.group.remove(ob.rim);ob.rim.geometry.dispose();ob.rim=null;}const pos=[];
for(const p of ob.parts){if(p.attached)continue;for(const s of p.rimSegs){if(s.other===-2||s.other>=0&&!ob.parts[s.other].attached)continue;for(const [A,B]of [s.o,s.i])pos.push(A.x,A.y,A.z,B.x,B.y,B.z);}}
if(pos.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));ob.rim=new THREE.LineSegments(g,rimMat);ob.rim.renderOrder=4;ob.group.add(ob.rim);}}
