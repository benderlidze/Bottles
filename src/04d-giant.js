'use strict';
// GIANT catalogue: every brand once more, twice as large, appended after the regular bottles.
// Materials, labels and profiles are shared with the originals; only the dimensions change.
const BASE_BRANDS=brands.length,GIANT_SCALE=2;
for(let i=0;i<BASE_BRANDS;i++){const b=brands[i];
 brands.push({...b,giant:true,base:i,h:b.h*GIANT_SCALE,w:b.w*GIANT_SCALE,depth:b.depth*GIANT_SCALE,strength:b.strength*.8});
 glassMats.push(glassMats[i]);fragmentMats.push(fragmentMats[i]);labels.push(labels[i]);}
