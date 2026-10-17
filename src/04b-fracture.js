'use strict';
// Pre-fractured glass. Each bottle surface is a jittered grid (zigzag diagonals); at build time every bottle gets its own
// noisy, weighted Voronoi crack map over that grid. Cells become breakable pieces with jagged torn edges, so a hit only
// has to hide cells and spawn them as fragments - no cutting at runtime.
const FR={A:40,cell:.062,thick:.015,seeds:[68,86],minTris:5};
const fractureTemplates=new Map();
// Grid shared by all bottles of one brand: vertex positions/normals, triangles (ccw = outward), edge -> triangles.
function fractureTemplate(b){let T=fractureTemplates.get(b);if(T)return T;
const A=b.giant?Math.round(FR.A*1.5):FR.A,yB=-b.h/2+.035,yT=b.h/2-.02,Y=Math.max(12,Math.round((yT-yB)/FR.cell)),va=[],vy=[],outer=[],inner=[],nrm=[];
for(let j=0;j<=Y;j++)for(let i=0;i<A;i++){const edge=j===0||j===Y,a=-Math.PI+(i+(edge?0:rnd(-.35,.35)))*TAU/A,y=yB+(j+(edge?0:rnd(-.3,.3)))*(yT-yB)/Y;va.push(a);vy.push(y);outer.push(surfPoint(b,a,y,0));inner.push(surfPoint(b,a,y,FR.thick));nrm.push(surfaceNormal(b,a,y));}
const id=(i,j)=>j*A+(i%A),tris=[];
for(let j=0;j<Y;j++)for(let i=0;i<A;i++){const v00=id(i,j),v10=id(i+1,j),v11=id(i+1,j+1),v01=id(i,j+1);if((i+j)%2)tris.push([v00,v10,v11],[v00,v11,v01]);else tris.push([v00,v10,v01],[v10,v11,v01]);}
const edgeTris=new Map(),key=(x,y)=>x<y?x*1e5+y:y*1e5+x;tris.forEach((t,ti)=>{for(let e=0;e<3;e++){const k=key(t[e],t[(e+1)%3]);let l=edgeTris.get(k);if(!l)edgeTris.set(k,l=[]);l.push(ti);}});
const triC=tris.map(t=>new THREE.Vector3().add(outer[t[0]]).add(outer[t[1]]).add(outer[t[2]]).multiplyScalar(1/3));
// unwrapped (a,y) per triangle for label clipping across the -PI/PI seam
const triP=tris.map(t=>{let as=t.map(v=>va[v]);if(Math.max(...as)-Math.min(...as)>Math.PI)as=as.map(a=>a<0?a+TAU:a);return t.map((v,n)=>[as[n],vy[v]]);});
const rowOf=v=>Math.floor(v/A);
// nbr[3t+e]: the triangle across edge e of t (-1 on the rim), in the order the edge lists hold them.
const nbr=new Int32Array(tris.length*3).fill(-1);tris.forEach((t,ti)=>{for(let e=0;e<3;e++)for(const o of edgeTris.get(key(t[e],t[(e+1)%3])))if(o!==ti){nbr[ti*3+e]=o;break;}});
T={A,Y,va,vy,dA:TAU/A,dY:(yT-yB)/Y,outer,inner,nrm,tris,edgeTris,key,triC,triP,rowOf,nbr};fractureTemplates.set(b,T);return T;}

// Sutherland-Hodgman clip of a polygon in (a,y) against an axis-aligned rectangle.
function clipRect(poly,x0,x1,y0,y1){for(const [axis,lim,keepGreater]of [[0,x0,true],[0,x1,false],[1,y0,true],[1,y1,false]]){const out=[];for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],ip=keepGreater?p[axis]>=lim:p[axis]<=lim,iq=keepGreater?q[axis]>=lim:q[axis]<=lim;if(ip)out.push(p);if(ip!==iq){const t=(lim-p[axis])/(q[axis]-p[axis]);out.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}}poly=out;if(!poly.length)break;}return poly;}

function fractureBottle(b,idx){const T=fractureTemplate(b),nT=T.tris.length,seeds=[],want=Math.round(rnd(FR.seeds[0],FR.seeds[1])*(b.giant?1.6:1)),gap=b.giant?.13:.095;
for(let tries=0;seeds.length<want&&tries<want*40;tries++){const p=T.triC[(Math.random()*nT)|0];if(seeds.some(s=>s.p.distanceTo(p)<gap))continue;seeds.push({p,w:rnd(.7,1.35),ph:[rnd(0,TAU),rnd(0,TAU),rnd(0,TAU)]});}
// slightly noisy, slightly weighted Voronoi: mostly straight crack lines between junctions, shards of varied size
// The noise term is at most .054, so a seed whose (distance-.0541)/weight exceeds both the best so far and the exact
// score of the previous triangle's seed (usually the winner here too) cannot win and is skipped - by comparing
// squared distances, before any square root or sine. Same formula and the same winner, a fraction of the work.
const nS=seeds.length,sx=new Float64Array(nS),sy=new Float64Array(nS),sz=new Float64Array(nS),sw=new Float64Array(nS);seeds.forEach((S,s)=>{sx[s]=S.p.x;sy[s]=S.p.y;sz[s]=S.p.z;sw[s]=S.w;});
const score=(cx,cy,cz,s)=>{const dx=cx-sx[s],dy=cy-sy[s],dz=cz-sz[s],S=seeds[s];return (Math.sqrt(dx*dx+dy*dy+dz*dz)+.018*(Math.sin(cx*9+S.ph[0])+Math.sin(cy*11+S.ph[1])+Math.sin(cz*10+S.ph[2])))/S.w;};
const cell=new Int32Array(nT);let guess=-1;for(let t=0;t<nT;t++){const c=T.triC[t],cx=c.x,cy=c.y,cz=c.z,bound=guess<0?1e9:score(cx,cy,cz,guess);let best=1e9,bi=0;for(let s=0;s<nS;s++){const dx=cx-sx[s],dy=cy-sy[s],dz=cz-sz[s],d2=dx*dx+dy*dy+dz*dz,r=(best<bound?best:bound)*sw[s]+.0541;if(r<0||d2>r*r)continue;const d=score(cx,cy,cz,s);if(d<best){best=d;bi=s;}}cell[t]=bi;guess=bi;}
const NB=T.nbr;
// every cell must be one connected piece of reasonable size: merge stray islands and slivers into a neighbour
for(let pass=0;pass<4;pass++){let changed=false;const seen=new Uint8Array(nT),comps=new Map();for(let t=0;t<nT;t++){if(seen[t])continue;const comp=[t];seen[t]=1;for(let i=0;i<comp.length;i++)for(let e=0;e<3;e++){const o=NB[comp[i]*3+e];if(o>=0&&!seen[o]&&cell[o]===cell[t]){seen[o]=1;comp.push(o);}}let l=comps.get(cell[t]);if(!l)comps.set(cell[t],l=[]);l.push(comp);}
for(const list of comps.values()){list.sort((x,y)=>y.length-x.length);for(let i=0;i<list.length;i++){const comp=list[i];if(i===0&&comp.length>=FR.minTris)continue;const votes=new Map();for(const t of comp)for(let e=0;e<3;e++){const o=NB[t*3+e];if(o>=0&&cell[o]!==cell[t])votes.set(cell[o],(votes.get(cell[o])||0)+1);}if(!votes.size)continue;const to=[...votes].sort((x,y)=>y[1]-x[1])[0][0];for(const t of comp)cell[t]=to;changed=true;}}if(!changed)break;}
const ids=[...new Set(cell)],remap=new Map(ids.map((c,i)=>[c,i])),byCell=ids.map(()=>[]);for(let t=0;t<nT;t++){cell[t]=remap.get(cell[t]);byCell[cell[t]].push(t);}
const regions=(b.labelRegions||[{range:b.label,extent:b.power>3?.72:.83,uv:[0,0,1,1]}]).map(r=>{const minY=(r.range[0]-.5)*b.h,maxY=(r.range[1]-.5)*b.h;return {...r,minY,maxY,maxX:surfPoint(b,r.extent,(minY+maxY)/2).x};});
// Straighten crack lines: on the raw grid a crack is a staircase of triangle edges (fence-like teeth). Relax every crack
// vertex towards its two neighbours along the same crack; junctions and the top/bottom rim stay fixed.
const va=T.va.slice(),vy=T.vy.slice(),crackNb=new Map(),vCells=new Map();
for(let t=0;t<nT;t++)for(const v of T.tris[t]){let s=vCells.get(v);if(!s)vCells.set(v,s=new Set());s.add(cell[t]);}
for(const [key,ts]of T.edgeTris){if(ts.length!==2||cell[ts[0]]===cell[ts[1]])continue;const x=Math.floor(key/1e5),y=key-x*1e5;for(const [p,q]of [[x,y],[y,x]]){let l=crackNb.get(p);if(!l)crackNb.set(p,l=[]);l.push(q);}}
const free=[...crackNb].filter(([v,l])=>l.length===2&&vCells.get(v).size===2&&T.rowOf(v)>0&&T.rowOf(v)<T.Y),clamp=THREE.MathUtils.clamp;
for(let it=0;it<8;it++)for(const [v,[n1,n2]]of free){let a1=va[n1]-va[v],a2=va[n2]-va[v];a1-=TAU*Math.round(a1/TAU);a2-=TAU*Math.round(a2/TAU);va[v]=clamp(va[v]+(a1+a2)*.3,T.va[v]-.55*T.dA,T.va[v]+.55*T.dA);vy[v]=clamp(vy[v]+((vy[n1]+vy[n2])/2-vy[v])*.6,T.vy[v]-.55*T.dY,T.vy[v]+.55*T.dY);}
const outer=T.outer.slice(),inner=T.inner.slice(),nrm=T.nrm.slice();for(const [v]of free){outer[v]=surfPoint(b,va[v],vy[v],0);inner[v]=surfPoint(b,va[v],vy[v],FR.thick);nrm[v]=surfaceNormal(b,va[v],vy[v]);}
// (a,y) corners per triangle for label clipping, built only for triangles that reach a label's height band.
const triPs=new Array(nT),triPOf=t=>triPs[t]||(triPs[t]=(()=>{const tr=T.tris[t];let as=tr.map(v=>va[v]);if(Math.max(...as)-Math.min(...as)>Math.PI)as=as.map(a=>a<0?a+TAU:a);return tr.map((v,n)=>[as[n],vy[v]]);})());
const ys=[-b.h/2+.035,-b.h/2+b.h*.29,-b.h/2+b.h*.57,-b.h/2+b.h*b.neck,b.h/2-.02];
// What lies across edge e of triangle t: another cell, the bottom rim (-1) or the top rim (-2).
const sideOf=(t,e)=>{const across=NB[t*3+e];return across>=0?cell[across]:T.rowOf(T.tris[t][e])===0?-1:-2;};
return byCell.map((tris,ci)=>{const lpos=[],luv=[],lnor=[],neighbors=new Set(),rimSegs=[],uniq=new Set();let touchesBottom=false,touchesTop=false;
// Sizes are known up front (outer and inner faces, plus one quad per edge on the piece outline), so the vertex data
// is written straight into typed arrays.
let rimEdges=0;for(const t of tris)for(let e=0;e<3;e++)if(sideOf(t,e)!==ci)rimEdges++;
const surfaceCount=tris.length*6,total=surfaceCount+rimEdges*6,pos=new Float32Array(total*3),nor=new Float32Array(total*3);let w=0;
const put=(p,nx,ny,nz)=>{pos[w]=p.x;pos[w+1]=p.y;pos[w+2]=p.z;nor[w]=nx;nor[w+1]=ny;nor[w+2]=nz;w+=3;};
for(const t of tris){const tr=T.tris[t];for(const v of tr){put(outer[v],nrm[v].x,nrm[v].y,nrm[v].z);uniq.add(v);}}
for(const t of tris){const tr=T.tris[t];for(const v of [tr[0],tr[2],tr[1]])put(inner[v],-nrm[v].x,-nrm[v].y,-nrm[v].z);}
const _e=new THREE.Vector3(),_f=new THREE.Vector3();
for(const t of tris){const tr=T.tris[t];for(let e=0;e<3;e++){const A0=tr[e],B0=tr[(e+1)%3],other=sideOf(t,e);if(other===ci)continue;
const oA=outer[A0],oB=outer[B0],iA=inner[A0],iB=inner[B0],n=_e.subVectors(oA,oB).cross(_f.subVectors(iA,oB)).normalize();for(const v of [oB,oA,iA,oB,iA,iB])put(v,n.x,n.y,n.z);
rimSegs.push({other,o:[oA,oB],i:[iA,iB]});if(other>=0)neighbors.add(other);else if(other===-1)touchesBottom=true;else touchesTop=true;}}
const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));geo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(total*2),2));geo.userData.surfaceCount=surfaceCount;
// label: clip each cell triangle against the label rectangle in (a,y) so the paper tears along the same cracks
for(const {minY,maxY,extent,maxX,uv} of regions)for(const t of tris){const tr=T.tris[t],y0=vy[tr[0]],y1=vy[tr[1]],y2=vy[tr[2]];if(Math.max(y0,y1,y2)<minY||Math.min(y0,y1,y2)>maxY)continue;const P=triPOf(t);if(Math.max(P[0][0],P[1][0],P[2][0])<-extent||Math.min(P[0][0],P[1][0],P[2][0])>extent)continue;const poly=clipRect(P,-extent,extent,minY,maxY);for(let k=1;k+1<poly.length;k++)for(const [a,y]of [poly[0],poly[k],poly[k+1]]){const p=surfPoint(b,a,y,-.007),nn=surfaceNormal(b,a,y);lpos.push(p.x,p.y,p.z);lnor.push(nn.x,nn.y,nn.z);luv.push(uv[0]+THREE.MathUtils.clamp(p.x/(2*maxX)+.5,0,1)*(uv[2]-uv[0]),uv[1]+(y-minY)/(maxY-minY)*(uv[3]-uv[1]));}}

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
let area=0;for(const t of tris){const tr=T.tris[t];area+=new THREE.Vector3().subVectors(outer[tr[1]],outer[tr[0]]).cross(new THREE.Vector3().subVectors(outer[tr[2]],outer[tr[0]])).length()*.5;}
return {area,geo,label,shape,shapeOffset:new CANNON.Vec3(center.x,center.y,center.z),shapeQuat:new CANNON.Quaternion(q.x,q.y,q.z,q.w),center,hull,y0,y1,row,k,neighbors:[...neighbors],touchesBottom,touchesTop,rimSegs,corners};});}
