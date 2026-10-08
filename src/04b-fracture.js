'use strict';
// Pre-fractured glass. Each bottle surface is a jittered grid (zigzag diagonals); at build time every bottle gets its own
// noisy, weighted Voronoi crack map over that grid. Cells become breakable pieces with jagged torn edges, so a hit only
// has to hide cells and spawn them as fragments - no cutting at runtime.
const FR={A:40,cell:.062,thick:.015,seeds:[26,34],minTris:10};
const fractureTemplates=new Map();
// Grid shared by all bottles of one brand: vertex positions/normals, triangles (ccw = outward), edge -> triangles.
function fractureTemplate(b){let T=fractureTemplates.get(b);if(T)return T;
const A=FR.A,yB=-b.h/2+.035,yT=b.h/2-.02,Y=Math.max(12,Math.round((yT-yB)/FR.cell)),va=[],vy=[],outer=[],inner=[],nrm=[];
for(let j=0;j<=Y;j++)for(let i=0;i<A;i++){const edge=j===0||j===Y,a=-Math.PI+(i+(edge?0:rnd(-.35,.35)))*TAU/A,y=yB+(j+(edge?0:rnd(-.3,.3)))*(yT-yB)/Y;va.push(a);vy.push(y);outer.push(surfPoint(b,a,y,0));inner.push(surfPoint(b,a,y,FR.thick));nrm.push(surfaceNormal(b,a,y));}
const id=(i,j)=>j*A+(i%A),tris=[];
for(let j=0;j<Y;j++)for(let i=0;i<A;i++){const v00=id(i,j),v10=id(i+1,j),v11=id(i+1,j+1),v01=id(i,j+1);if((i+j)%2)tris.push([v00,v10,v11],[v00,v11,v01]);else tris.push([v00,v10,v01],[v10,v11,v01]);}
const edgeTris=new Map(),key=(x,y)=>x<y?x*1e5+y:y*1e5+x;tris.forEach((t,ti)=>{for(let e=0;e<3;e++){const k=key(t[e],t[(e+1)%3]);let l=edgeTris.get(k);if(!l)edgeTris.set(k,l=[]);l.push(ti);}});
const triC=tris.map(t=>new THREE.Vector3().add(outer[t[0]]).add(outer[t[1]]).add(outer[t[2]]).multiplyScalar(1/3));
// unwrapped (a,y) per triangle for label clipping across the -PI/PI seam
const triP=tris.map(t=>{let as=t.map(v=>va[v]);if(Math.max(...as)-Math.min(...as)>Math.PI)as=as.map(a=>a<0?a+TAU:a);return t.map((v,n)=>[as[n],vy[v]]);});
const rowOf=v=>Math.floor(v/A);
T={A,Y,outer,inner,nrm,tris,edgeTris,key,triC,triP,rowOf};fractureTemplates.set(b,T);return T;}

// Sutherland-Hodgman clip of a polygon in (a,y) against an axis-aligned rectangle.
function clipRect(poly,x0,x1,y0,y1){for(const [axis,lim,keepGreater]of [[0,x0,true],[0,x1,false],[1,y0,true],[1,y1,false]]){const out=[];for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],ip=keepGreater?p[axis]>=lim:p[axis]<=lim,iq=keepGreater?q[axis]>=lim:q[axis]<=lim;if(ip)out.push(p);if(ip!==iq){const t=(lim-p[axis])/(q[axis]-p[axis]);out.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}}poly=out;if(!poly.length)break;}return poly;}

function fractureBottle(b,idx){const T=fractureTemplate(b),nT=T.tris.length,seeds=[],want=Math.round(rnd(FR.seeds[0],FR.seeds[1]));
for(let tries=0;seeds.length<want&&tries<want*40;tries++){const p=T.triC[(Math.random()*nT)|0];if(seeds.some(s=>s.p.distanceTo(p)<.17))continue;seeds.push({p,w:rnd(.75,1.3),ph:[rnd(0,TAU),rnd(0,TAU),rnd(0,TAU)]});}
// noisy multiplicatively-weighted Voronoi: curved, wavy boundaries; the zigzag grid adds the small-scale tearing
const cell=new Int32Array(nT);for(let t=0;t<nT;t++){const c=T.triC[t];let best=1e9,bi=0;for(let s=0;s<seeds.length;s++){const S=seeds[s],d=(c.distanceTo(S.p)+.035*(Math.sin(c.x*9+S.ph[0])+Math.sin(c.y*11+S.ph[1])+Math.sin(c.z*10+S.ph[2])))/S.w;if(d<best){best=d;bi=s;}}cell[t]=bi;}
const nb=t=>{const tr=T.tris[t],out=[];for(let e=0;e<3;e++)for(const o of T.edgeTris.get(T.key(tr[e],tr[(e+1)%3])))if(o!==t)out.push(o);return out;};
// every cell must be one connected piece of reasonable size: merge stray islands and slivers into a neighbour
for(let pass=0;pass<4;pass++){let changed=false;const seen=new Uint8Array(nT),comps=new Map();for(let t=0;t<nT;t++){if(seen[t])continue;const comp=[t];seen[t]=1;for(let i=0;i<comp.length;i++)for(const o of nb(comp[i]))if(!seen[o]&&cell[o]===cell[t]){seen[o]=1;comp.push(o);}let l=comps.get(cell[t]);if(!l)comps.set(cell[t],l=[]);l.push(comp);}
for(const list of comps.values()){list.sort((x,y)=>y.length-x.length);for(let i=0;i<list.length;i++){const comp=list[i];if(i===0&&comp.length>=FR.minTris)continue;const votes=new Map();for(const t of comp)for(const o of nb(t))if(cell[o]!==cell[t])votes.set(cell[o],(votes.get(cell[o])||0)+1);if(!votes.size)continue;const to=[...votes].sort((x,y)=>y[1]-x[1])[0][0];for(const t of comp)cell[t]=to;changed=true;}}if(!changed)break;}
const ids=[...new Set(cell)],remap=new Map(ids.map((c,i)=>[c,i])),byCell=ids.map(()=>[]);for(let t=0;t<nT;t++){cell[t]=remap.get(cell[t]);byCell[cell[t]].push(t);}
const minY=-b.h/2+b.h*b.label[0],maxY=-b.h/2+b.h*b.label[1],extent=b.power>3?.72:.83,maxX=surfPoint(b,extent,(minY+maxY)/2).x;
const ys=[-b.h/2+.035,-b.h/2+b.h*.29,-b.h/2+b.h*.57,-b.h/2+b.h*b.neck,b.h/2-.02],{outer,inner,nrm}=T;
return byCell.map((tris,ci)=>{const pos=[],nor=[],uv=[],lpos=[],luv=[],lnor=[],neighbors=new Set(),rimSegs=[],uniq=new Set();let touchesBottom=false,touchesTop=false;
for(const t of tris){const tr=T.tris[t];for(const v of tr){pos.push(outer[v].x,outer[v].y,outer[v].z);nor.push(nrm[v].x,nrm[v].y,nrm[v].z);uv.push(0,0);uniq.add(v);}}
for(const t of tris){const tr=T.tris[t];for(const v of [tr[0],tr[2],tr[1]]){pos.push(inner[v].x,inner[v].y,inner[v].z);nor.push(-nrm[v].x,-nrm[v].y,-nrm[v].z);uv.push(0,0);}}
const surfaceCount=pos.length/3,_e=new THREE.Vector3(),_f=new THREE.Vector3();
for(const t of tris){const tr=T.tris[t];for(let e=0;e<3;e++){const A0=tr[e],B0=tr[(e+1)%3],others=T.edgeTris.get(T.key(A0,B0)).filter(o=>o!==t);let other;if(others.length)other=cell[others[0]];else other=T.rowOf(A0)===0?-1:-2;if(other===ci)continue;
const oA=outer[A0],oB=outer[B0],iA=inner[A0],iB=inner[B0],n=_e.subVectors(oA,oB).cross(_f.subVectors(iA,oB)).normalize();for(const v of [oB,oA,iA,oB,iA,iB]){pos.push(v.x,v.y,v.z);nor.push(n.x,n.y,n.z);uv.push(0,0);}
rimSegs.push({other,o:[oA,oB],i:[iA,iB]});if(other>=0)neighbors.add(other);else if(other===-1)touchesBottom=true;else touchesTop=true;}}
const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.userData.surfaceCount=surfaceCount;
// label: clip each cell triangle against the label rectangle in (a,y) so the paper tears along the same cracks
for(const t of tris){const P=T.triP[t];if(Math.max(P[0][0],P[1][0],P[2][0])<-extent||Math.min(P[0][0],P[1][0],P[2][0])>extent||Math.max(P[0][1],P[1][1],P[2][1])<minY||Math.min(P[0][1],P[1][1],P[2][1])>maxY)continue;const poly=clipRect(P,-extent,extent,minY,maxY);for(let k=1;k+1<poly.length;k++)for(const [a,y]of [poly[0],poly[k],poly[k+1]]){const p=surfPoint(b,a,y,-.007),nn=surfaceNormal(b,a,y);lpos.push(p.x,p.y,p.z);lnor.push(nn.x,nn.y,nn.z);luv.push(p.x/(2*maxX)+.5,(y-minY)/(maxY-minY));}}
let label=null;if(lpos.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(lpos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(luv,2));g.setAttribute('normal',new THREE.Float32BufferAttribute(lnor,3));label=new THREE.Mesh(g,labels[idx]);}
// collider: box oriented along the piece (outward normal, horizontal tangent, vertical)
const c=new THREE.Vector3(),n=new THREE.Vector3();for(const v of uniq){c.add(outer[v]);n.add(nrm[v]);}c.multiplyScalar(1/uniq.size);if(n.length()<.3*uniq.size)n.set(c.x,0,c.z);if(n.lengthSq()<1e-6)n.set(0,0,1);n.normalize();
const t1=new THREE.Vector3(0,1,0).cross(n);if(t1.lengthSq()<1e-6)t1.set(1,0,0);t1.normalize();const t2=n.clone().cross(t1).normalize(),lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];
let y0=1e9,y1=-1e9;for(const v of uniq)for(const p of [outer[v],inner[v]]){const d=[p.dot(t1),p.dot(t2),p.dot(n)];for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],d[k]);hi[k]=Math.max(hi[k],d[k]);}y0=Math.min(y0,p.y);y1=Math.max(y1,p.y);}
const half=[0,1,2].map(k=>Math.max(.01,(hi[k]-lo[k])/2)),mid=[0,1,2].map(k=>(hi[k]+lo[k])/2),axes=[t1,t2,n],center=new THREE.Vector3().addScaledVector(t1,mid[0]).addScaledVector(t2,mid[1]).addScaledVector(n,mid[2]);
const q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(t1,t2,n)),hull=[];for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1])hull.push(center.clone().addScaledVector(t1,sx*half[0]).addScaledVector(t2,sy*half[1]).addScaledVector(n,sz*half[2]));
const shape=setShapeGroup(new CANNON.Box(new CANNON.Vec3(half[0],half[1],half[2])),SG.PATCH);
// spill points for the liquid: a sample of the piece outline
const outline=rimSegs.map(s=>s.i[0]),step=Math.max(1,Math.ceil(outline.length/16)),corners=outline.filter((_,i)=>i%step===0);
let row=0;while(row<R-1&&center.y>ys[row+1])row++;const ang=Math.atan2(center.x,center.z),k=((Math.floor(ang/(TAU/N))+4)%N+N)%N;
return {geo,label,shape,shapeOffset:new CANNON.Vec3(center.x,center.y,center.z),shapeQuat:new CANNON.Quaternion(q.x,q.y,q.z,q.w),center,hull,y0,y1,row,k,neighbors:[...neighbors],touchesBottom,touchesTop,rimSegs,corners};});}
