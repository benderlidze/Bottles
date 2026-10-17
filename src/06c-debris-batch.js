'use strict';
// Shards that still have physics are drawn through shared buffers: one draw call per material for all their glass,
// label scraps and outlines, instead of two or three per shard (a collapse leaves ~230 shards, ~700 draw calls).
// A shard's geometry is copied into the shared buffer once, in its own space; every frame only its pose (a 4x4
// matrix in a small float texture) is updated and the vertex shader applies it, as THREE.BatchedMesh does. Every
// shard keeps its own meshes, hidden, so baking into the static batches and cleanup work exactly as before.
const SHARD_TEX=64,SHARD_SLOTS=SHARD_TEX*SHARD_TEX/4,shardPoses=new Float32Array(SHARD_TEX*SHARD_TEX*4);
const shardPoseTexture=new THREE.DataTexture(shardPoses,SHARD_TEX,SHARD_TEX,THREE.RGBAFormat,THREE.FloatType);
shardPoseTexture.minFilter=shardPoseTexture.magFilter=THREE.NearestFilter;shardPoseTexture.generateMipmaps=false;shardPoseTexture.needsUpdate=true;
const shardFreeSlots=[];for(let i=SHARD_SLOTS-1;i>=0;i--)shardFreeSlots.push(i);
const shardRecords=new Map(),debrisBatches=new Map(),_shardM=new THREE.Matrix4(),_shardOne=new THREE.Vector3(1,1,1);
const SHARD_PARS='\nattribute float shardSlot;\nuniform highp sampler2D shardPoses;\nmat4 shardPose(){int i=int(shardSlot+.5)*4;return mat4(texelFetch(shardPoses,ivec2(i%64,i/64),0),texelFetch(shardPoses,ivec2((i+1)%64,(i+1)/64),0),texelFetch(shardPoses,ivec2((i+2)%64,(i+2)/64),0),texelFetch(shardPoses,ivec2((i+3)%64,(i+3)/64),0));}\n';
function shardMaterial(source,isLine){
 const m=source.clone();
 m.onBeforeCompile=shader=>{shader.uniforms.shardPoses={value:shardPoseTexture};
  let v=shader.vertexShader.replace('#include <common>','#include <common>'+SHARD_PARS);
  v=isLine?v.replace('#include <begin_vertex>','#include <begin_vertex>\nmat4 shardM=shardPose();transformed=(shardM*vec4(transformed,1.)).xyz;')
   :v.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nmat4 shardM=shardPose();objectNormal=mat3(shardM)*objectNormal;').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed=(shardM*vec4(transformed,1.)).xyz;');
  shader.vertexShader=v;};
 m.customProgramCacheKey=()=>'shard-pose';return m;
}
function debrisBatchFor(material){
 let b=debrisBatches.get(material);if(b)return b;
 const isLine=material===edgeMat;
 b={source:material,material:shardMaterial(material,isLine),isLine,hasUV:labels.includes(material),mesh:null,capacity:0,used:0,dead:0,items:[]};
 debrisBatches.set(material,b);return b;
}
function debrisBatchable(child){return child.material===edgeMat||fragmentMats.includes(child.material)||labels.includes(child.material);}
function debrisBatchAllocate(b,need){
 b.capacity=Math.max(need,Math.ceil(b.capacity*1.5),8192);
 const geo=new THREE.BufferGeometry(),attr=(name,size)=>geo.setAttribute(name,new THREE.BufferAttribute(new Float32Array(b.capacity*size),size));
 attr('position',3);if(!b.isLine)attr('normal',3);if(b.hasUV)attr('uv',2);attr('shardSlot',1);geo.setDrawRange(0,0);
 if(b.mesh){b.mesh.geometry.dispose();b.mesh.geometry=geo;}
 else{b.mesh=b.isLine?new THREE.LineSegments(geo,b.material):new THREE.Mesh(geo,b.material);b.mesh.frustumCulled=false;b.mesh.matrixAutoUpdate=false;b.mesh.visible=false;scene.add(b.mesh);}
}
// Copies one shard part, untransformed, plus its slot index into the batch.
function debrisBatchCopy(b,item,slot){
 const g=b.mesh.geometry.attributes,src=item.source.geometry.attributes,n=item.count,o=item.offset;
 g.position.array.set(src.position.array.subarray(0,n*3),o*3);
 if(g.normal)g.normal.array.set(src.normal.array.subarray(0,n*3),o*3);
 if(g.uv)g.uv.array.set(src.uv.array.subarray(0,n*2),o*2);
 g.shardSlot.array.fill(slot,o,o+n);
}
function debrisBatchUpload(b,from,to){
 const g=b.mesh.geometry;g.setDrawRange(0,b.used);b.mesh.visible=b.used>b.dead;if(to<=from)return;
 for(const name in g.attributes){const a=g.attributes[name];a.addUpdateRange(from*a.itemSize,(to-from)*a.itemSize);a.needsUpdate=true;}
}
// Rebuilds a batch from its live parts (after it filled up, or once dead parts outweigh live ones).
function debrisBatchCompact(b,extra){
 const live=b.items.filter(item=>!item.dead),need=live.reduce((s,item)=>s+item.count,0)+extra;
 if(need>b.capacity)debrisBatchAllocate(b,need);
 b.items=[];b.used=0;b.dead=0;
 for(const item of live){item.offset=b.used;b.used+=item.count;b.items.push(item);debrisBatchCopy(b,item,item.record.slot);}
 const g=b.mesh.geometry;for(const name in g.attributes){g.attributes[name].clearUpdateRanges();g.attributes[name].needsUpdate=true;}
}
function writeShardPose(d,slot){_shardM.compose(d.mesh.position,d.mesh.quaternion,_shardOne);shardPoses.set(_shardM.elements,slot*16);}
function syncDebrisBatches(){
 let posesChanged=false;const ranges=new Map();
 const touch=(b,from,to)=>{const r=ranges.get(b);if(r){r[0]=Math.min(r[0],from);r[1]=Math.max(r[1],to);}else ranges.set(b,[from,to]);};
 // Shards that were baked, split or removed since the last frame free their slot; their vertices collapse to a point.
 for(const [d,record] of shardRecords){if(d.mesh.parent===scene)continue;
  shardPoses.fill(0,record.slot*16,record.slot*16+16);shardFreeSlots.push(record.slot);posesChanged=true;
  for(const item of record.items){item.dead=true;item.batch.dead+=item.count;}shardRecords.delete(d);}
 for(const b of debrisBatches.values())if(b.dead>20000&&b.dead>b.used-b.dead){debrisBatchCompact(b,0);ranges.delete(b);touch(b,0,b.used);}
 for(const d of debris){
  let record=shardRecords.get(d);
  if(!record){
   if(d.mesh.parent!==scene||!shardFreeSlots.length)continue; // no free slot: the shard simply draws itself
   record={slot:shardFreeSlots.pop(),items:[]};shardRecords.set(d,record);
   for(const child of d.mesh.children){if(!debrisBatchable(child))continue;
    const b=debrisBatchFor(child.material),count=child.geometry.attributes.position.count;
    if(!b.mesh||b.used+count>b.capacity){if(b.mesh)debrisBatchCompact(b,count);else debrisBatchAllocate(b,count);touch(b,0,b.used);}
    const item={record,batch:b,source:child,offset:b.used,count,dead:false};b.used+=count;b.items.push(item);record.items.push(item);
    debrisBatchCopy(b,item,record.slot);touch(b,item.offset,b.used);child.visible=false;}
   writeShardPose(d,record.slot);posesChanged=true;continue;}
  // Sleeping shards keep their last pose.
  if(d.body.sleepState!==2){writeShardPose(d,record.slot);posesChanged=true;}
 }
 for(const b of debrisBatches.values()){const r=ranges.get(b);if(b.mesh)debrisBatchUpload(b,r?r[0]:0,r?r[1]:0);}
 if(posesChanged)shardPoseTexture.needsUpdate=true;
}
