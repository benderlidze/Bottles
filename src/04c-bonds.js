'use strict';
// A calibrated brittle-shell approximation, not a continuum/FEM glass solver.
// Each edge has finite fracture work. Impacts spend a bounded energy budget
// along the surface graph; disconnected components become actual rigid bodies.
function buildGlassBonds(ob) {
  ob.shellArea=ob.parts.reduce((sum,p)=>sum+p.area,0);
  ob.remainingArea=ob.shellArea;
  ob.bonds=[];ob.links=ob.parts.map(()=>[]);
  for(const p of ob.parts){
    p.mass=.46*p.area/ob.shellArea;
    const lengths=new Map();
    for(const edge of p.rimSegs)if(edge.other>=0)lengths.set(edge.other,(lengths.get(edge.other)||0)+edge.o[0].distanceTo(edge.o[1]));
    for(const [other,length] of lengths){
      if(other<p.id)continue;
      const midpoint=p.center.clone().add(ob.parts[other].center).multiplyScalar(.5);
      const heel=midpoint.y< -brands[ob.idx].h*.38?1.65:1;
      const capacity=(.045+length*.48)*brands[ob.idx].strength*heel*rnd(.8,1.2);
      const bond={a:p.id,b:other,capacity,health:capacity,midpoint,length};
      const id=ob.bonds.push(bond)-1;ob.links[p.id].push(id);ob.links[other].push(id);
    }
  }
}

function fractureDistances(ob,point,eligible){
  const n=ob.parts.length,dist=new Float64Array(n).fill(Infinity),used=new Uint8Array(n);
  let nearest=-1,best=Infinity;
  for(const p of ob.parts)if(eligible?eligible.has(p.id):p.attached){const d=p.center.distanceToSquared(point);if(d<best){best=d;nearest=p.id;}}
  if(nearest<0)return dist;dist[nearest]=Math.sqrt(best)*.35;
  for(let k=0;k<n;k++){
    let at=-1,d=Infinity;for(let i=0;i<n;i++)if(!used[i]&&dist[i]<d){d=dist[i];at=i;}
    if(at<0)break;used[at]=1;
    for(const id of ob.links[at]){const bond=ob.bonds[id],next=bond.a===at?bond.b:bond.a;
      if(eligible?!eligible.has(next):!ob.parts[next].attached)continue;
      const step=ob.parts[at].center.distanceTo(ob.parts[next].center);
      dist[next]=Math.min(dist[next],d+step);
    }
  }
  return dist;
}

function breakGlassBonds(ob,hit,eligible){
  const energy=Math.max(0,hit.energy),dist=fractureDistances(ob,hit.point,eligible);
  // Below the onset of fracture: elastic impact and a ring, no decorative crack.
  if(energy<2.2*brands[ob.idx].strength)return {broken:0,spent:0};
  let budget=Math.min(energy*.38,energy-1.5),spent=0,broken=0;
  const spread=.10+Math.sqrt(energy)*.035,weighted=[];
  for(const bond of ob.bonds){if(bond.health<=0||(eligible?(!eligible.has(bond.a)||!eligible.has(bond.b)):(!ob.parts[bond.a].attached||!ob.parts[bond.b].attached)))continue;
    const d=(dist[bond.a]+dist[bond.b])*.5;
    const weight=Math.exp(-d/spread)*(1+.65*(1-bond.health/bond.capacity));
    if(weight>.0001)weighted.push({bond,weight});
  }
  // Redistribute unused work after a bond has opened. This lets an energetic
  // impact propagate while small impacts weaken only a local neighbourhood.
  for(let pass=0;pass<5&&budget>.001;pass++){
    let weightSum=0;for(const item of weighted)if(item.bond.health>0)weightSum+=item.weight;
    if(!weightSum)break;let consumed=0;
    for(const {bond,weight} of weighted){if(bond.health<=0)continue;
      const work=Math.min(bond.health,budget*weight/weightSum);bond.health-=work;consumed+=work;
      if(bond.health<.00001){bond.health=0;broken++;}
    }
    spent+=consumed;budget-=consumed;
  }
  return {broken,spent};
}

function glassComponents(ob,eligible){
  const seen=new Uint8Array(ob.parts.length),groups=[];
  for(const start of ob.parts){if((eligible?!eligible.has(start.id):!start.attached)||seen[start.id])continue;
    const component=[start];seen[start.id]=1;
    for(let i=0;i<component.length;i++)for(const id of ob.links[component[i].id]){
      const bond=ob.bonds[id];if(bond.health<=0)continue;
      const next=ob.parts[bond.a===component[i].id?bond.b:bond.a];
      if((eligible?eligible.has(next.id):next.attached)&&!seen[next.id]){seen[next.id]=1;component.push(next);}
    }
    groups.push(component);
  }
  return groups;
}

function drawBondCracks(ob){
  if(ob.bondCracks){ob.group.remove(ob.bondCracks);ob.bondCracks.geometry.dispose();ob.bondCracks=null;}
  const lines=[];
  for(const p of ob.parts){if(!p.attached)continue;
    for(const edge of p.rimSegs){if(edge.other<p.id||edge.other<0||!ob.parts[edge.other].attached)continue;
      const bond=ob.links[p.id].map(id=>ob.bonds[id]).find(b=>b.a===edge.other||b.b===edge.other);
      if(!bond||bond.health>bond.capacity*.35)continue;
      for(const point of edge.o){const n=new THREE.Vector3(point.x,0,point.z).normalize();lines.push(point.x+n.x*.003,point.y,point.z+n.z*.003);}
    }
  }
  if(lines.length){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));ob.bondCracks=new THREE.LineSegments(geometry,rimMat);ob.bondCracks.renderOrder=5;ob.group.add(ob.bondCracks);}
}

function scatterFragments(ob,fragments,hit){
  if(!fragments.length)return;
  const direction=new CANNON.Vec3(hit.incoming?.x||0,hit.incoming?.y||0,hit.incoming?.z||-1);direction.normalize();
  const bodies=fragments.map(f=>f.body),weights=[];let totalMass=ob.body.mass,mean=new CANNON.Vec3();
  for(const f of fragments){
    const d=f.localCenter.distanceTo(hit.point),w=Math.exp(-d/.55);
    const outward=new CANNON.Vec3(f.localCenter.x,0,f.localCenter.z);outward.normalize();ob.body.quaternion.vmult(outward,outward);
    const kick=direction.scale(w*2).vadd(outward.scale(.4+w*.4));weights.push(kick);mean.vadd(kick.scale(f.body.mass),mean);totalMass+=f.body.mass;
  }
  mean.scale(1/totalMass,mean);let rawEnergy=.5*ob.body.mass*mean.lengthSquared();
  for(let i=0;i<bodies.length;i++){weights[i].vsub(mean,weights[i]);rawEnergy+=.5*bodies[i].mass*weights[i].lengthSquared();}
  // The scatter budget comes from dissipated impact energy, never an arbitrary explosion.
  const scale=Math.sqrt(Math.min(hit.energy*.045,2.4)/Math.max(rawEnergy,.0001));
  ob.body.velocity.vsub(mean.scale(scale),ob.body.velocity);
  for(let i=0;i<bodies.length;i++)bodies[i].velocity.vadd(weights[i].scale(scale),bodies[i].velocity);
  // Off-centre stress gives every shard its own rotation. Balance the angular
  // impulses on the remnant and cap their total energy instead of random spin.
  const torques=[],spin=[],sumTorque=new CANNON.Vec3();let spinEnergy=0;
  for(let i=0;i<fragments.length;i++){
    const local=hit.point.clone().sub(fragments[i].localCenter),arm=ob.body.quaternion.vmult(new CANNON.Vec3(local.x,local.y,local.z));
    const torque=arm.cross(weights[i].scale(bodies[i].mass)),omega=bodies[i].invInertiaWorld.vmult(torque);
    torques.push(torque);spin.push(omega);sumTorque.vadd(torque,sumTorque);spinEnergy+=.5*torque.dot(omega);
  }
  const reaction=ob.body.invInertiaWorld.vmult(sumTorque);spinEnergy+=.5*sumTorque.dot(reaction);
  const spinScale=Math.sqrt(Math.min(hit.energy*.018,.8)/Math.max(.00001,spinEnergy));
  ob.body.angularVelocity.vsub(reaction.scale(spinScale),ob.body.angularVelocity);
  for(let i=0;i<bodies.length;i++)bodies[i].angularVelocity.vadd(spin[i].scale(spinScale),bodies[i].angularVelocity);
}
