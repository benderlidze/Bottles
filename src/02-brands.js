'use strict';
const world=new CANNON.World({gravity:new CANNON.Vec3(0,-9.81,0),allowSleep:true});world.broadphase=new CANNON.SAPBroadphase(world);world.solver.iterations=22;world.solver.tolerance=.001;
const glassPhys=new CANNON.Material('glass'),floorPhys=new CANNON.Material('wood'),steelPhys=new CANNON.Material('steel');world.addContactMaterial(new CANNON.ContactMaterial(glassPhys,floorPhys,{friction:.55,restitution:.06}));world.addContactMaterial(new CANNON.ContactMaterial(glassPhys,glassPhys,{friction:.45,restitution:.05}));world.addContactMaterial(new CANNON.ContactMaterial(steelPhys,glassPhys,{friction:.25,restitution:.16}));world.addContactMaterial(new CANNON.ContactMaterial(steelPhys,floorPhys,{friction:.3,restitution:.35}));world.defaultContactMaterial.friction=.4;
const ground=new CANNON.Body({mass:0,material:floorPhys,collisionFilterGroup:4,collisionFilterMask:-1});ground.addShape(new CANNON.Plane());ground.quaternion.setFromEuler(-Math.PI/2,0,0);ground.position.y=-.01;world.addBody(ground);
const brands=[
{name:"JACK DANIEL’S",line:'Old No. 7',type:'TENNESSEE WHISKEY',bg:'#111511',ink:'#f4eee0',glass:'#e1e9d9',liquid:'#aa4a0a',cap:'#151712',h:1.82,w:.85,depth:.76,power:9,shoulder:.67,neck:.79,nr:.135,label:[.10,.64],photo:0,crop:[1054,630,177,323]},
{name:'JIM BEAM',line:'B',type:'KENTUCKY STRAIGHT BOURBON',bg:'#f1e5c8',ink:'#272016',glass:'#e8edde',liquid:'#c77618',cap:'#e8e5dc',h:2.04,w:.83,depth:.73,power:6,shoulder:.60,neck:.77,nr:.127,label:[.08,.58],photo:0,crop:[510,576,215,432]},
{name:'JAMESON',line:'J J S',type:'TRIPLE DISTILLED IRISH WHISKEY',bg:'#e7dfc0',ink:'#143d27',glass:'#2b6737',liquid:'#b68830',cap:'#a63121',h:2.16,w:.71,depth:.71,power:2,shoulder:.64,neck:.82,nr:.12,label:[.16,.58]},
{name:'Maker’s Mark',line:'S IV',type:'KENTUCKY STRAIGHT BOURBON WHISKY',bg:'#f0deac',ink:'#35271b',glass:'#e8e5d0',liquid:'#a84b0d',cap:'#b52113',h:1.74,w:.91,depth:.76,power:4,shoulder:.59,neck:.79,nr:.12,label:[.12,.55],photo:1,crop:[582,344,393,269]},
{name:'JOHNNIE WALKER',line:'RED LABEL',type:'BLENDED SCOTCH WHISKY',bg:'#8f1b13',ink:'#f1d384',glass:'#e8deba',liquid:'#c97511',cap:'#c69638',h:2.29,w:.70,depth:.65,power:7,shoulder:.66,neck:.84,nr:.12,label:[.28,.67],photo:0,crop:[744,487,260,340]},
{name:'ABSOLUT',line:'VODKA',type:'COUNTRY OF SWEDEN',bg:'#e0e4d9',ink:'#124491',glass:'#d9e9e8',liquid:'#9fcbd0',cap:'#c8d2d1',h:1.96,w:.83,depth:.83,power:2,shoulder:.66,neck:.84,nr:.15,label:[.19,.63]}
];
const referenceImages=[];
