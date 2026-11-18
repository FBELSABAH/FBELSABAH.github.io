import * as T from './vendor/three.module.min.js';

const stone = '#e4d5b8', ivory = '#f7ebd2', ink = '#374141', glass = '#41616b';
const brick = '#ae684d', red = '#d75032', brass = '#d5a04d', sage = '#6b8068';
const prism = new T.BoxGeometry();
const round = new T.CylinderGeometry(1, 1, 1, 20);
const globe = new T.SphereGeometry(1, 18, 12);
const cone = new T.ConeGeometry(1, 1, 10);
const hemisphere = new T.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2);
const material = new T.MeshStandardMaterial({ roughness: .89, metalness: .05 });
const up = new T.Vector3(0, 1, 0);

// Batch a whole architectural model into a few instanced draws, including its windows.
class Builder {
  constructor() { this.parts = new Map(); }
  form(shape, x, y, z, w, h, d, color, rotation) {
    const transform = new T.Object3D();
    transform.position.set(x,y,z);
    transform.scale.set(w,h,d);
    if (rotation instanceof T.Quaternion) transform.quaternion.copy(rotation);
    else if (rotation) transform.rotation.set(...rotation);
    transform.updateMatrix();
    if (!this.parts.has(shape)) this.parts.set(shape, []);
    this.parts.get(shape).push([transform.matrix, new T.Color(color)]);
  }
  box(x,y,z,w,h,d,c,r) { this.form(prism,x,y,z,w,h,d,c,r); }
  drum(x,y,z,r,h,c) { this.form(round,x,y,z,r,h,r,c); }
  beam(a,b,width,color) {
    const start = new T.Vector3(...a), end = new T.Vector3(...b);
    const delta = end.clone().sub(start), length = delta.length();
    const middle = start.addScaledVector(delta,.5);
    this.form(prism,middle.x,middle.y,middle.z,width,length,width,color,
      new T.Quaternion().setFromUnitVectors(up,delta.normalize()));
  }
  finish() {
    const group = new T.Group();
    for (const [shape,parts] of this.parts) {
      const mesh = new T.InstancedMesh(shape, material, parts.length);
      parts.forEach(([matrix,color],i) => { mesh.setMatrixAt(i,matrix); mesh.setColorAt(i,color); });
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }
}
function tower(b,x,z,w,d,levels,color,step=.43,base=.14) {
  const height = levels*step;
  b.box(x,base+height/2,z,w,height,d,glass);
  for (let i=0;i<=levels;i++) b.box(x,base+i*step,z,w+.1,.1,d+.1,color);
  for (const side of [-1,1]) {
    for(let i=0;i<=4;i++) b.box(x-w/2+i*w/4,base+height/2,z+side*d/2,.07,height,.09,color);
    for(let i=0;i<=3;i++) b.box(x+side*w/2,base+height/2,z-d/2+i*d/3,.09,height,.07,color);
  }
  b.box(x,base+height+.14,z,w*.54,.22,d*.54,stone);
}
function stairs(b,x,z,width,count,color) {
  for(let i=0;i<count;i++) b.box(x,.08+(i+1)*.08,z-i*.17,width,(i+1)*.16,.19,color);
}
function tree(b,x,z,scale=1,autumn=false) {
  b.drum(x,.32*scale,z,.075*scale,.65*scale,'#77674e');
  const crown = autumn ? '#cc9352' : sage;
  b.form(globe,x,.93*scale,z,.43*scale,.68*scale,.4*scale,crown);
  b.form(globe,x-.19*scale,.82*scale,z+.09*scale,.26*scale,.36*scale,.26*scale,crown);
}
function bench(b,x,z) { b.box(x,.22,z,.68,.11,.24,'#986748'); b.box(x,.1,z,.46,.15,.13,ink); }
function plant(b) {
  b.box(-.57,.72,.12,2.4,1.35,2.2,red);
  for(let i=0;i<7;i++) b.box(-1.55+i*.33,.8,1.23,.15,.67,.04,'#334448');
  for(let i=0;i<5;i++) b.box(-1.55+i*.45,1.49,.13,.31,.22,1.98,'#ce7555',[0,0,.19]);
  for(const [x,z,h] of [[.62,-.9,4.85],[1.37,-.7,4.05]]) {
    b.drum(x,.22,z,.36,.36,ink);
    b.drum(x,h/2,z,.24,h,ivory);
    for(let k=0;k<3;k++) b.drum(x,h-(k+.45)*.52,z,.248,.24,red);
    b.drum(x,h+.04,z,.26,.09,ink);
    b.drum(x,h+.09,z,.16,.03,'#252c29');
  }
  for(let i=0;i<3;i++) {
    b.drum(.53+i*.49,.57,.82,.22,.97,'#8eaaa4');
    b.beam([.53+i*.49,1.08,.82],[.53+i*.49,1.08,-.1],.1,brass);
  }
}
function freight(b) {
  for(let k=0;k<9;k++) {
    const row=Math.floor(k/3), x=-1.15+(k%3)*.92;
    const color=[brick,'#567e83',brass][(row+k)%3];
    b.box(x,.33,-.86+row*.78,.81,.55,.65,color);
    for(let j=0;j<4;j++) b.box(x-.29+j*.19,.34,-.525+row*.78,.035,.43,.025,stone);
    if(k%3===1) b.box(x,.87,-.86+row*.78,.81,.52,.65,red);
  }
  for(const x of [-1.5,1.5]) {
    for(const z of [-1.12,1.12]) {
      b.beam([x,.12,z],[x,2.65,z*.72],.13,brass);
      b.box(x,.18,z,.46,.18,.22,ink);
    }
    b.beam([x,.35,-1.09],[x,2.45,.82],.08,brass);
  }
  for(const z of [-.81,.81]) {
    b.box(0,2.59,z,3.4,.1,.12,brass); b.box(0,2.99,z,3.4,.12,.12,brass);
    for(let i=0;i<8;i++) b.beam([-1.64+i*.41,2.60+(i%2)*.35,z],[-1.23+i*.41,2.60+((i+1)%2)*.35,z],.065,brass);
  }
  // The trolley and suspended load are independent moving parts.
}
function library(b) {
  for(const x of [-1.28,1.28]) for(const z of [-.95,.95]) b.box(x,.45,z,.28,.8,.35,stone);
  b.box(0,.95,0,3.35,.43,2.45,brick);
  b.box(-.22,1.31,-.15,2.78,.3,2.2,glass);
  b.box(.12,1.69,-.12,3.5,.43,2.33,ivory);
  b.box(.38,2.05,-.2,2.75,.29,2.02,glass);
  b.box(.12,2.4,-.19,3.38,.43,2.16,'#577989');
  for(let i=0;i<9;i++) b.box(-1.33+i*.32,2.64,-.23,.12,.1,1.87,stone);
  stairs(b,-.4,1.63,.95,5,stone);
}
function housing(b) {
  tower(b,-.7,-.42,1.7,1.78,12,ivory);
  tower(b,.88,.55,1.38,1.64,8,brick);
  for(let i=0;i<6;i++) b.box(-.71,i*.86+.52,.58,1.86,.11,.4,stone);
  b.box(-.7,5.59,-.43,.83,.39,.74,brick);
  tree(b,-1.36,1.08,.9);
}
function observatory(b) {
  b.drum(0,.25,0,1.68,.4,stone); b.drum(0,.91,0,1.44,1,ivory);
  for(let i=0;i<20;i++) {
    const a=i*Math.PI/10;
    b.box(Math.cos(a)*1.43,.97,Math.sin(a)*1.43,.14,.52,.16,ink,[0,-a,0]);
  }
  b.drum(0,1.48,0,1.55,.19,ink);
  b.form(hemisphere,0,1.57,0,1.45,1.48,1.45,'#74959b');
  for(let i=0;i<16;i++) {
    const a=i*Math.PI/16, c=(i+1)*Math.PI/16;
    b.beam([1.46*Math.cos(a),1.57+1.49*Math.sin(a),0],[1.46*Math.cos(c),1.57+1.49*Math.sin(c),0],.095,ivory);
  }
  stairs(b,0,1.77,1.06,4,stone);
}
function server(b) {
  for(let k=0;k<5;k++) {
    const r=k*.11;
    b.box(0,k*.58+.43,0,3.14-r,.5,2.34-r,ink);
    for(let i=0;i<9;i++) b.box(-1.28+i*.32,k*.58+.46,1.18-r/2,.16,.18,.04,'#839c98');
    b.box(0,k*.58+.72,0,3.28-r,.1,2.49-r,'#b6764e');
  }
  for(const x of [-.72,.68]) {
    b.drum(x,3.2,.03,.42,.22,'#768481'); b.drum(x,3.32,.03,.31,.05,ink);
  }
}
function broadcast(b) {
  b.box(0,.46,0,2.6,.78,2.18,stone);
  for(let j=0;j<5;j++) {
    const r=.8-j*.13, s=r-.13, y=.85+j*.76;
    for(const [sx,sz] of [[1,1],[-1,1],[1,-1],[-1,-1]]) {
      b.beam([sx*r,y,sz*r],[sx*s,y+.76,sz*s],.1,brick);
      b.beam([sx*r,y,sz*r],[-sx*s,y+.76,sz*s],.052,ivory);
      b.beam([sx*r,y,sz*r],[sx*s,y+.76,-sz*s],.052,ivory);
    }
    b.box(0,y+.02,0,2*r+.15,.085,2*r+.15,ink);
  }
  b.drum(0,4.78,0,.42,.3,red); b.drum(0,5.46,0,.06,1.17,ink);
  b.form(globe,0,6.08,0,.1,.1,.1,red);
}
function clinic(b) {
  b.box(0,.67,0,3.35,1.18,1.26,ivory); b.box(0,.67,0,1.38,1.18,2.92,ivory);
  b.box(0,1.29,0,3.45,.12,1.36,'#74959b'); b.box(0,1.29,0,1.47,.12,3.02,'#74959b');
  tower(b,-.1,-.55,1.15,1.15,4,stone,.43,1.33);
  for(const x of [-1.24,-.86,.86,1.24]) b.box(x,.76,.642,.25,.55,.03,glass);
  stairs(b,0,1.83,.9,3,stone);
}
function forum(b) {
  for(const x of [-1.24,-.82,-.4,.02,.44,.86,1.28]) {
    b.drum(x,.84,1.05,.115,1.49,ivory);
    b.drum(x,1.61,1.05,.175,.12,stone);
  }
  b.box(0,.87,-.22,2.91,1.53,1.74,brick);
  b.box(0,1.74,0,3.4,.22,2.52,ivory);
  for(const sign of [-1,1]) b.box(0,2.03,sign*.65,3.5,.14,1.44,'#ac634b',[sign*.37,0,0]);
  stairs(b,0,1.75,3.2,4,stone);
}
function conservatory(b) {
  b.box(0,.19,0,3.48,.25,2.52,brick);
  for(let row=0;row<3;row++) {
    const x=(row-1)*1.09;
    b.box(x,.79,0,1.05,.98,2.27,'#83a5a0');
    for(const sign of [-1,1]) b.box(x+sign*.264,1.44,0,.65,.1,2.3,'#b8cfbc',[0,0,-sign*.52]);
    for(let j=0;j<6;j++) {
      const z=-1.14+j*.455;
      b.beam([x-.54,1.25,z],[x,1.6,z],.055,ivory);
      b.beam([x,1.6,z],[x+.54,1.25,z],.055,ivory);
      for(const sx of [-.54,.54]) b.box(x+sx,.77,z,.06,.99,.055,ivory);
    }
  }
}
// Each landmark occupies a lot in the same ten-project order as the HTML index.
const plans = [
  [-2.45,4.24,plant], [7.35,4.24,freight], [-7.35,0,library], [-7.35,-4.24,housing],
  [2.45,-4.24,observatory], [2.45,0,server], [-2.45,-4.24,broadcast],
  [7.35,0,clinic], [-7.35,4.24,forum], [2.45,4.24,conservatory]
];

export function buildCity() {
  const city = new T.Group(), fixed = new Builder(), lots=[];
  fixed.box(0,-.68,0,21.5,.78,14.7,'#414442');
  fixed.box(0,-.34,0,21.58,.09,14.78,'#ad8060');
  fixed.box(0,-.18,0,21.63,.25,14.83,'#bcb5a5');
  fixed.box(0,-.05,0,20.1,.08,12.85,'#727873');
  for(const [i,[x,z,make]] of plans.entries()) {
    fixed.box(x,.018,z,4.22,.12,3.61,'#d5cbb9');
    const lot=new Builder(); make(lot); const group=lot.finish();
    group.position.set(x,.07,z); group.userData.index=i; city.add(group); lots.push(group);
  }
  for(const [x,z] of [[-2.45,0],[7.35,-4.24]]) {
    fixed.box(x,.04,z,4.22,.14,3.61,'#b4bb99');
    fixed.box(x,.13,z,4.21,.05,.43,stone);
    for(let i=0;i<8;i++) tree(fixed,x-1.58+(i%4)*1.02,z+(i<4?-.94:.94),.76+(i%3)*.13,i%4===0);
    bench(fixed,x-.72,z+.38); bench(fixed,x+.7,z-.38);
  }
  // Lane markings, zebra crossings, parked cars and street trees.
  for(const z of [-2.12,2.12]) for(let x=-9.7;x<10;x+=.91) fixed.box(x,.012,z,.43,.018,.045,ivory);
  for(const x of [-4.9,0,4.9]) {
    for(let z=-6.2;z<6.3;z+=.88) fixed.box(x,.013,z,.045,.018,.4,ivory);
    for(const z of [-2.12,2.12]) for(let i=0;i<5;i++) fixed.box(x-.32+i*.16,.026,z+.48,.085,.021,.46,ivory);
  }
  for(const [x,z,c] of [[-.22,3.2,red],[4.68,-4.3,ivory],[-4.68,.97,brass],[.2,-.7,brass],[5.13,3.43,red],[-5.13,-3.4,glass]]) {
    fixed.box(x,.13,z,.29,.16,.65,c); fixed.box(x,.25,z,.24,.115,.36,'#53656a');
  }
  for(const [x,z] of [[-9.13,-1.38],[-5.58,1.36],[-4.22,1.4],[1.0,1.43],[4.22,1.4],[5.65,-1.42],[9.14,-1.42],[-5.63,5.65],[4.12,5.64]]) tree(fixed,x,z,.77);
  for(const [x,z] of [[-4.50,1.62],[.40,-1.62],[4.50,1.62],[-.40,5.64],[5.32,-5.64],[-8.94,-1.6]]) {
    fixed.drum(x,.58,z,.034,1.08,ink);
    fixed.box(x+.14,1.12,z,.32,.048,.055,ink);
    fixed.box(x+.26,1.09,z,.18,.065,.095,ivory);
  }
  for(const [x,z,c] of [[-.8,6.19,red],[-3.1,6.21,brass],[-4.85,6.17,glass],[-6.42,5.74,brick],
     [1.64,1.53,red],[1.85,1.54,glass],[7.9,1.49,brass],[-8.8,1.36,ink],[-8.62,1.35,red],[1.65,-5.6,brick]]) {
    fixed.drum(x,.25,z,.066,.24,c);
    fixed.form(globe,x,.421,z,.062,.072,.062,'#b99070');
  }
  // A closed elevated railway with an explicitly straight platform on the front edge.
  const railPath = new T.CurvePath();
  const v=(x,z)=>new T.Vector3(x,.68,z);
  const line=(x,z,u,w)=>railPath.add(new T.LineCurve3(v(x,z),v(u,w)));
  const bend=(x,z,cx,cz,u,w)=>railPath.add(new T.QuadraticBezierCurve3(v(x,z),v(cx,cz),v(u,w)));
  line(-8.95,6.81,8.95,6.81); bend(8.95,6.81,10.47,6.81,10.47,5.29);
  line(10.47,5.29,10.47,-5.29); bend(10.47,-5.29,10.47,-6.81,8.95,-6.81);
  line(8.95,-6.81,-8.95,-6.81); bend(-8.95,-6.81,-10.47,-6.81,-10.47,-5.29);
  line(-10.47,-5.29,-10.47,5.29); bend(-10.47,5.29,-10.47,6.81,-8.95,6.81);
  for(const curve of railPath.curves) {
    const samples=curve.getPoints(curve instanceof T.LineCurve3?1:9);
    for(let i=1;i<samples.length;i++) {
      const a=samples[i-1],b=samples[i], mid=a.clone().lerp(b,.5), d=b.clone().sub(a);
      const rot=Math.atan2(d.x,d.z);
      fixed.box(mid.x,.58,mid.z,.58,.14,d.length()+.03,ink,[0,rot,0]);
      for(const side of [-1,1]) fixed.box(mid.x+Math.cos(rot)*side*.17,.675,mid.z-Math.sin(rot)*side*.17,.045,.06,d.length()+.03,stone,[0,rot,0]);
    }
  }
  for(let i=0;i<36;i++) { const p=railPath.getPointAt(i/36);fixed.box(p.x,.22,p.z,.23,.62,.22,'#827a68'); }
  for(const x of [-5.1,-4,-2.9]) {
    fixed.box(x,.69,6.21,1.1,.12,.52,ivory); fixed.box(x,1.05,6.07,.07,.66,.07,ink);
  }
  fixed.box(-4,1.44,6.19,3.35,.12,.78,brass);
  city.add(fixed.finish());
  const train=[];
  for(let i=0;i<3;i++) {
    const car=new Builder(); car.box(0,.24,0,.43,.36,1.0,red); car.box(0,.46,0,.44,.09,.96,ivory);
    for(const side of [-1,1]) for(let j=0;j<4;j++) car.box(side*.219,.32,-.34+j*.225,.014,.135,.16,ink);
    car.box(0,.29,.507,.34,.16,.025,ink);
    const group=car.finish(); group.traverse(o=>{o.castShadow=false;}); train.push(group);city.add(group);
  }
  const trolleyBody=new Builder();
  trolleyBody.box(0,2.8,0,.54,.30,1.7,ink);
  const trolley=trolleyBody.finish(), sling=new Builder();
  sling.box(0,1.74,0,.7,.38,.57,red);
  for(const x of [-.24,.24]) sling.beam([x,1.93,0],[x,2.7,0],.033,ink);
  const load=sling.finish(); trolley.add(load);lots[1].add(trolley);
  return { city,lots,train,railPath,trolley };
}
