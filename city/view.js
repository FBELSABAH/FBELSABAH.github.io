const entries = [...document.querySelectorAll('.directory li')].map(row => ({
  id: row.dataset.id, title: row.querySelector('strong').textContent,
  subject: row.querySelector('.subject').textContent, url: row.querySelector('.entry').href,
  action: row.dataset.action
}));
const el = id => document.getElementById(id);
const stage = el('stage'), tag = stage.querySelector('.city-tag');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const tourButton = el('tour'), motionButton = el('motion');
let selected = 0, paused = preference.matches, touring = false, sceneControls;

const captions = {
  grid: 'I tested a day-ahead electricity forecast against 8,400 hours of PEI demand. Its average error was 11.98 MW.',
  delivery: 'Of 96,470 eligible deliveries, 6,534 arrived late. Explore where delays were concentrated in Brazil.',
  coursewell: 'Two sources disagree about a deadline. Try the file comparison and review the evidence inside Coursewell.',
  housing: 'Explore how population, new homes and rents changed across Prince Edward Island.',
  immune: 'Two different qubit errors can leave the same clues. See when the correction helps and when it fails.',
  cedar: 'Write a value, restart the server and read it back. Follow the actual commands from a recorded run.',
  activation: 'Four activation functions reach similar scores through different learning dynamics. Compare their gradients across ten seeds.',
  thresholds: 'Explore how changing the cost assumptions shifts the treatment cutoff across 95 simulated scenarios.',
  change: 'Explore six wellness modules built around short lessons and participant check-ins.',
  iris: 'Our five-person team tested how well petal length predicts sepal length across three iris species.'
};
const heading=el('title'), introCopy=document.querySelector('.intro p');
const originalTitle=heading.innerHTML, originalCopy=introCopy.textContent;
function showCaption(index) {
  const inShot=index!==null;
  document.querySelector('.exhibit').classList.toggle('in-shot',inShot);
  if(inShot) {heading.textContent=entries[index].title;introCopy.textContent=captions[entries[index].id];}
  else {heading.innerHTML=originalTitle;introCopy.textContent=originalCopy;}
  if(!paused && heading.animate) {
    for(const node of [heading,introCopy])node.animate([
      {opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}
    ],{duration:460,easing:'cubic-bezier(.2,.7,.3,1)'});
  }
}
function select(index, moveCamera = true) {
  selected = (index + entries.length) % entries.length;
  const item = entries[selected];
  el('selected-name').textContent = item.title;
  el('selected-subject').textContent = item.subject;
  el('counter').textContent = String(selected + 1).padStart(2, '0') + ' / ' + entries.length;
  el('open').textContent = item.action + ' ↗';
  el('open').href = item.url;
  el('film').hidden = item.id !== 'grid';
  if (moveCamera) sceneControls?.focus(selected);
}
function setTour(on) {
  touring = on;
  tourButton.innerHTML = on ? '<span aria-hidden="true">■</span> Stop tour' : '<span aria-hidden="true">▶</span> Play tour';
  tourButton.setAttribute('aria-pressed', String(on));
  sceneControls?.resetTourClock();
}
function setMotion(on) {
  paused = !on;
  if (paused) setTour(false);
  motionButton.textContent = paused ? '▷' : 'Ⅱ';
  const label = paused ? 'Resume city motion' : 'Pause city motion';
  motionButton.setAttribute('aria-label', label);
  motionButton.title = label;
  sceneControls?.wake();
}
el('prev').onclick = () => { setTour(false); select(selected-1); };
el('next').onclick = () => { setTour(false); select(selected+1); };
document.querySelector('.pager').hidden = false;
tourButton.onclick = () => {
  const start = !touring;
  if (start) setMotion(true);
  setTour(start);
  if (start) select(selected);
};
motionButton.onclick = () => setMotion(paused);
el('overview').onclick = () => { setTour(false); sceneControls?.overview(); };
preference.addEventListener('change', () => setMotion(!preference.matches));

// The poster, project picker and HTML index work independently of the renderer.
try {
  const [T,{buildCity}] = await Promise.all([import('./vendor/three.module.min.js'),import('./model.js')]);
  startScene(T,buildCity);
} catch (error) {
  console.warn('Showing the architectural model as a still image.',error);
}

function startScene(T,buildCity) {
  const renderer = new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(-16,16,10,-10,.1,180);
  const {city,lots,train,railPath,trolley} = buildCity();
  scene.add(city);
  scene.add(new T.HemisphereLight(0xfff8e9,0xc5b9a9,1.85));
  const sun = new T.DirectionalLight(0xfff1da,2.45);
  sun.position.set(-12,22,11); sun.castShadow = true;
  Object.assign(sun.shadow.camera,{left:-17,right:17,top:16,bottom:-16,far:64});
  sun.shadow.mapSize.set(2048,2048); sun.shadow.normalBias=.027;
  scene.add(sun);
  const floor = new T.Mesh(new T.PlaneGeometry(160,160),new T.ShadowMaterial({opacity:.18}));
  floor.rotation.x=-Math.PI/2; floor.position.y=-1.09; floor.receiveShadow=true; scene.add(floor);
  const canvas = renderer.domElement;
  canvas.tabIndex=0; canvas.setAttribute('role','group');
  canvas.setAttribute('aria-label','3D project city. Left and right arrows select a project. Enter opens it. Home restores the city view.');
  stage.append(canvas);
  const restingAngle=.57, target=new T.Vector3(0,1.53,0), center=target.clone();
  let goalAngle=restingAngle, angle=restingAngle, tilt=.57, goalTilt=.57, zoom=1, goalZoom=1;
  let elapsed=paused?4:0, railTime=.10, tourTime=0, frame=0, previous=0;
  let onscreen=true, dragging=null, hover=-1, focused=false, needsDraw=true, handOrbit=false;
  const ray = new T.Raycaster(), pointer = new T.Vector2(), projection = new T.Vector3();
  const bounds=lots.map(lot=>new T.Box3().setFromObject(lot));
  const anchors=bounds.map(box=>new T.Vector3((box.min.x+box.max.x)/2,box.max.y+.16,(box.min.z+box.max.z)/2));
  const hits=lots.flatMap((lot,index)=>{
    const meshes=[];
    lot.traverse(obj=>{if(obj.isMesh){obj.userData.lot=index;meshes.push(obj);}});
    return meshes;
  });
  const travelAngles=[.4,.75,-.65,-.79,.76,1.04,-.3,1.2,-.55,.68];
  const animationEnd=2.15;
  let width=0,height=0;
  function wake() {
    needsDraw=true;
    if (!frame && onscreen && !document.hidden) frame=requestAnimationFrame(render);
  }
  function overview() {
    focused=false; hover=-1; showCaption(null); handOrbit=false; target.set(0,1.53,0);
    goalAngle=angle+Math.atan2(Math.sin(restingAngle-angle),Math.cos(restingAngle-angle));
    goalTilt=.57; goalZoom=1; wake();
  }
  function focus(i) {
    const p=lots[i].position;showCaption(i);
    focused=true; hover=-1; elapsed=Math.max(elapsed,animationEnd);
    target.set(p.x*.84,Math.max(1.1,anchors[i].y*.40),p.z*.84);
    const wanted=travelAngles[i];
    goalAngle=angle+Math.atan2(Math.sin(wanted-angle),Math.cos(wanted-angle));
    goalZoom=1.62; goalTilt=.51; wake();
  }
  function resize() {
    width=stage.clientWidth; height=stage.clientHeight;
    if (!width || !height) return;
    const aspect=width/height;
    const span=Math.max(19.25,29.6/aspect);
    camera.left=-span*aspect/2; camera.right=span*aspect/2;
    camera.top=span/2; camera.bottom=-span/2;
    renderer.setSize(width,height,false); wake();
  }
  function updateTag() {
    const index=hover>=0?hover:focused?selected:-1;
    if (index<0 || dragging) { tag.hidden=true; return; }
    projection.copy(anchors[index]).project(camera);
    const x=(projection.x*.5+.5)*width, y=(-projection.y*.5+.5)*height;
    const linked=focused && index===selected;
    const label=entries[index].title+(linked?' ↗':'');
    if(tag.textContent!==label)tag.textContent=label;
    if(linked) { tag.href=entries[index].url;tag.classList.add('linked'); }
    else {tag.removeAttribute('href');tag.classList.remove('linked');}
    tag.hidden=false;
    const tagWidth=tag.offsetWidth;
    tag.style.transform='translate('+Math.max(3,Math.min(width-tagWidth-3,x-tagWidth/2))+'px,'+Math.max(4,y-31)+'px)';
  }
  function render(time) {
    frame=0;
    if(!onscreen || document.hidden) { previous=0;return; }
    if(previous && time-previous<30 && !needsDraw) {frame=requestAnimationFrame(render);return;}
    const dt=previous?Math.min(.2,(time-previous)/1000):1/30;
    previous=time; needsDraw=false;
    const introWasActive=elapsed<=animationEnd+.01;
    elapsed=paused?Math.max(elapsed,animationEnd+.1):elapsed+dt;
    if(touring) {
      tourTime+=dt;
      if(tourTime>5.6) {tourTime=0;select(selected+1);}
    }
    if(!paused && !focused && !dragging && !handOrbit && elapsed>animationEnd) goalAngle+=dt*.066;
    const mix=paused?1:1-Math.exp(-dt*(touring?1.95:3.6));
    center.lerp(target,mix); angle+=(goalAngle-angle)*mix; tilt+=(goalTilt-tilt)*mix; zoom+=(goalZoom-zoom)*mix;
    const reveal=Math.max(0,1-elapsed/animationEnd);
    const camAngle=angle-reveal*reveal*1.48+(touring ? .15*Math.sin(Math.PI*tourTime/5.6) : 0);
    const elevation=tilt-reveal*reveal*.19;
    camera.position.set(center.x+38*Math.sin(camAngle)*Math.cos(elevation),center.y+38*Math.sin(elevation),center.z+38*Math.cos(camAngle)*Math.cos(elevation));
    camera.lookAt(center); camera.zoom=zoom+reveal*reveal*.28-Math.min(.32,center.distanceTo(target)*.044); camera.updateProjectionMatrix();
    if(introWasActive || elapsed<animationEnd) {
      lots.forEach((lot,i)=>{
        const progress=Math.min(1,Math.max(0,(elapsed-(i%4)*.11)/1.35));
        const lift=(1-progress)**3;
        lot.position.y=.07+lift*(2.6+(i%3)*.5);
        lot.rotation.y=lift*((i%2)?-.36:.36);
      });
      renderer.shadowMap.needsUpdate=true;
    }
    if(!paused) railTime=(railTime+dt*.022)%1;
    trolley.position.x=Math.sin(railTime*Math.PI*8)*1.04;
    train.forEach((car,i)=>{
      const t=(railTime-i*.017+1)%1, p=railPath.getPointAt(t), dir=railPath.getTangentAt(t);
      car.position.copy(p);car.rotation.y=Math.atan2(dir.x,dir.z);
    });
    renderer.render(scene,camera); updateTag();
    if (!paused) frame=requestAnimationFrame(render);
  }
  function pick(e) {
    const box=canvas.getBoundingClientRect();
    pointer.set((e.clientX-box.left)/box.width*2-1,1-(e.clientY-box.top)/box.height*2);
    ray.setFromCamera(pointer,camera);
    // First test each lot's bounding box, then only its visible architecture.
    const candidates=hits.filter(mesh=>ray.ray.intersectsBox(bounds[mesh.userData.lot]));
    return ray.intersectObjects(candidates,false)[0]?.object.userData.lot ?? -1;
  }
  canvas.addEventListener('pointerdown',e=>{
    if(!e.isPrimary || e.button!==0)return;
    dragging={x:e.clientX,y:e.clientY,startAngle:goalAngle,startTilt:goalTilt,moved:false};
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!e.isPrimary)return;
    if(!dragging) {
      if(e.pointerType==='touch')return;
      const id=pick(e); if(id!==hover) {hover=id;wake();}
      canvas.style.cursor=id>=0?'pointer':'grab';return;
    }
    const dx=e.clientX-dragging.x,dy=e.clientY-dragging.y;
    if(Math.hypot(dx,dy)>5) dragging.moved=true;
    if(!dragging.moved)return;
    setTour(false);handOrbit=true;elapsed=Math.max(elapsed,animationEnd);
    goalAngle=dragging.startAngle-dx*.008;goalTilt=Math.max(.25,Math.min(.97,dragging.startTilt+dy*.003));
    canvas.style.cursor='grabbing';wake();
  });
  canvas.addEventListener('pointerup',e=>{
    if(!dragging || !e.isPrimary)return;
    const click=!dragging.moved;dragging=null;
    if(click) { const id=pick(e);if(id>=0){setTour(false);if(focused && selected===id)location.assign(entries[id].url);else select(id);} }
    canvas.style.cursor='grab';wake();
  });
  canvas.addEventListener('pointercancel',()=>{dragging=null;wake();});
  canvas.addEventListener('pointerleave',()=>{hover=-1;wake();});
  canvas.addEventListener('keydown',e=>{
    if(!['ArrowRight','ArrowLeft','Home','Enter'].includes(e.key))return;
    e.preventDefault();setTour(false);
    if(e.key==='Home')overview();
    else if(e.key==='Enter')location.assign(entries[selected].url);
    else select(selected+(e.key==='ArrowRight'?1:-1));
  });
  sceneControls={focus,overview,wake,resetTourClock:()=>{tourTime=0;}};
  const ro=new ResizeObserver(resize);ro.observe(stage);
  const io=new IntersectionObserver(([entry])=>{onscreen=entry.isIntersecting;previous=0;if(onscreen)wake();});
  io.observe(stage);
  document.addEventListener('visibilitychange',()=>{previous=0;if(!document.hidden)wake();});
  canvas.addEventListener('webglcontextlost',e=>{
    e.preventDefault();cancelAnimationFrame(frame);frame=0;onscreen=false;sceneControls=null;
    ro.disconnect();io.disconnect();setTour(false);
    canvas.hidden=true;stage.querySelector('.poster').hidden=false;tag.hidden=true;
    tourButton.hidden=true;document.querySelector('.tools').hidden=true;document.querySelector('.gesture').hidden=true;
  });
  resize();
  cancelAnimationFrame(frame);
  render(performance.now());
  stage.querySelector('.poster').hidden=true;
  document.querySelector('.tools').hidden=false;document.querySelector('.gesture').hidden=false;tourButton.hidden=false;
  setMotion(!paused);
}
