'use strict';
// Shader warm-up behind the loading screen. ANGLE/D3D compiles WebGL shaders slowly (0.1-0.8 s each), and before
// this every new kind of object - the first shards, label scraps, foam, drops, puddles, streams, crack lines, the
// ball, the aiming trail - froze the game the first time it appeared. One broken bottle shows them all at once;
// its per-bottle materials (liquid, surface, cap, stream) are kept alive so their compiled programs stay cached
// for every bottle created later, instead of being released and recompiled after each reset.
async function warmUpShaders(){
 const idx=Math.max(0,brands.findIndex(b=>b.sparkling)),b=brands[idx],ob=addBottle(0,0,idx);
 damageBottle(ob,{energy:120,speed:20,point:new THREE.Vector3(0,-b.h*.2,b.depth/2),other:null,incoming:new THREE.Vector3(0,0,-20),ballistic:true});
 for(let i=0;i<3;i++){updateFluid(ob,1/30);updateDrops(1/30);}
 deposit(new THREE.Vector3(0,0,1),idx,.01);ripples.push({pos:new THREE.Vector3(0,.011,1),age:0});updateDrops(1/60);
 const ball=new THREE.Mesh(ballGeo,ballMaterial);ball.castShadow=true;ball.position.set(.6,1,1);scene.add(ball);trajectory.visible=true;
 // Shards are drawn through the shared shard batches (06c); their own meshes are still compiled for baking.
 syncDebrisBatches();renderer.shadowMap.needsUpdate=true;
 // Parallel compile where the browser supports it; never let a stuck compile hold the start button.
 try{await Promise.race([renderer.compileAsync(scene,camera),new Promise(r=>setTimeout(r,8000))]);}catch(e){}
 // Variants that only a real frame creates (e.g. opaque objects drawn into the refraction buffer).
 renderer.render(scene,camera);
 const keep=[ob.liq.material,ob.surf.material,ob.cap.material,...ob.holes.map(h=>h.stream.material)];
 for(const m of keep)m.userData.keep=true;
 scene.remove(ball);trajectory.visible=false;
}
warmUpShaders().catch(e=>console.warn('shader warm-up failed',e)).finally(()=>{
 rebuild();shake=0;shadowFrames=3;warming=false;$('start').disabled=false;$('start').textContent='FIRST THROW';
});
