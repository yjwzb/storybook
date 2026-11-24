import * as THREE from 'three';
import { Book } from './engine/Book.js';
import { AudioEngine } from './engine/AudioEngine.js';
import { LanternGateScene } from './scene/LanternGateScene.js';
import { lanternGateStory } from './data/story.js';
import './styles.css';

const canvas = document.querySelector('#storybook-canvas');
const app = document.querySelector('#app');
const $ = (selector) => document.querySelector(selector);
const audio = new AudioEngine();
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer, scene, camera, tableGroup, book, diorama;
let width = window.innerWidth, height = window.innerHeight, elapsed = 0;
let pointerState = null, turnAnimation = null, teaserOpen = false, soundEnabled = false, disposed = false, lastToast = 0, teaserElement;
const view = { tableRotation: 0, tableTarget: 0, turnProgress: 0, turnDirection: 1, isTurning: false };

function showToast(message) {
  const toast = $('#toast'); if (!toast) return;
  toast.textContent = message; toast.classList.add('show');
  window.clearTimeout(lastToast); lastToast = window.setTimeout(() => toast.classList.remove('show'), 2300);
}
function createTableTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d'); x.fillStyle = '#21473a'; x.fillRect(0, 0, 512, 512);
  let seed = 1729; const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 22000; i++) { const a = random() * .08; x.fillStyle = random() > .5 ? `rgba(232,211,163,${a})` : `rgba(3,19,14,${a})`; x.fillRect(random() * 512, random() * 512, 1 + random() * 5, 1); }
  for (let i = 0; i < 28; i++) { x.strokeStyle = `rgba(5,25,18,${random() * .09})`; x.lineWidth = 1 + random() * 2; x.beginPath(); const y = random() * 512; x.moveTo(0,y); x.bezierCurveTo(160,y-3,340,y+5,512,y+1); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8,8); return t;
}
function createWorld() {
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (error) { console.error('WebGL renderer could not be created', error); app.classList.add('webgl-error'); $('#loading-note')?.classList.add('hidden'); return false; }
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7)); renderer.setSize(width,height,false); renderer.setClearColor(0x193b31,0);
  scene = new THREE.Scene(); scene.fog = new THREE.Fog('#193b31',27,55);
  camera = new THREE.PerspectiveCamera(24,width/height,.1,100); camera.position.set(0,9.4,16.3); camera.lookAt(0,.8,0);
  scene.add(new THREE.HemisphereLight('#f8edce','#263d30',2.15));
  const key = new THREE.DirectionalLight('#ffe2a4',3.1); key.position.set(-7,12,8); key.castShadow = true; key.shadow.mapSize.set(2048,2048); key.shadow.camera.left=-12; key.shadow.camera.right=12; key.shadow.camera.top=12; key.shadow.camera.bottom=-12; key.shadow.camera.near=1; key.shadow.camera.far=35; key.shadow.bias=-.00022; key.shadow.normalBias=.025; scene.add(key);
  const fill = new THREE.DirectionalLight('#b8d0b9',.72); fill.position.set(8,7,-6); scene.add(fill);
  const bounce = new THREE.PointLight('#f4c875',.5,16,2); bounce.position.set(-2.5,4,3); scene.add(bounce);
  const table = new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({map:createTableTexture(),roughness:.98})); table.rotation.x=-Math.PI/2; table.position.y=-.44; table.receiveShadow=true; scene.add(table);
  tableGroup = new THREE.Group(); tableGroup.name='reader-table-pivot'; scene.add(tableGroup);
  book = new Book(tableGroup); diorama = new LanternGateScene(book.group,showToast); return true;
}
function resize() {
  width=innerWidth; height=innerHeight; if(!renderer||!camera)return;
  const portrait=width<760&&height>width; renderer.setPixelRatio(Math.min(devicePixelRatio||1,width<760?1.25:1.7)); renderer.setSize(width,height,false); camera.aspect=width/height; camera.fov=portrait?37:24;
  if(portrait){camera.position.set(0,15.2,22.2);camera.lookAt(0,.5,0);book.group.scale.setScalar(.84);}else{camera.position.set(0,9.4,16.3);camera.lookAt(0,.8,0);book.group.scale.setScalar(1);} camera.updateProjectionMatrix();
}
function setMapOpen(open){$('#map-overlay').classList.toggle('open',open);$('#map-overlay').setAttribute('aria-hidden',String(!open));}
function setReadingOpen(open){$('#reading-card').classList.toggle('open',open);$('#reading-card').setAttribute('aria-hidden',String(!open));}
function startTurn(direction) {
  if(turnAnimation||(direction>0&&teaserOpen)||(direction<0&&!teaserOpen))return;
  const from=direction>0?view.turnProgress:1,to=direction>0?1:0; view.turnDirection=1;view.turnProgress=from;view.isTurning=true;diorama.setFolded(direction>0);audio.paper();
  turnAnimation={from,to,direction:1,started:performance.now(),duration:reducedMotion?260:920,commit:true};
}
function settleTurn(){
  if(turnAnimation)return; const back=teaserOpen,complete=back?view.turnProgress<=.5:view.turnProgress>=.5,target=complete?(back?0:1):(back?1:0);
  turnAnimation={from:view.turnProgress,to:target,direction:1,started:performance.now(),duration:reducedMotion?240:900,commit:complete};
}
function showTeaser(open){
  if(!teaserElement){teaserElement=document.createElement('aside');teaserElement.className='next-chapter-card';teaserElement.innerHTML='<span class="card-kicker">CHAPTER 02 / 05 · NEXT FOLD</span><h2>The Ribbon Bridge</h2><p>Beyond Lantern Valley, a red ribbon waits above the river. This chapter is being crafted.</p><button type="button" class="gold-button" id="return-to-gate">Return to Lantern Gate <span>↶</span></button>';app.appendChild(teaserElement);$('#return-to-gate').addEventListener('click',()=>startTurn(-1));}
  teaserElement.classList.toggle('open',open);teaserElement.setAttribute('aria-hidden',String(!open));
}
function updatePageControls(){$('#previous-page').disabled=!teaserOpen;$('#next-page').disabled=teaserOpen;}
function finishTurn(a){
  view.isTurning=false;view.turnProgress=a.to;
  if(a.commit&&a.to===1){teaserOpen=true;history.pushState({chapter:'bridge'},'','#bridge');$('#page-scrub').value='100';$('.controls-heading strong').textContent='02 / 05';$('.chapter-kicker').innerHTML='<span></span><b>CHAPTER 02 / 05</b><i>·</i><b>NEXT FOLD</b>';showTeaser(true);diorama.setFolded(true);showToast('A new fold is waiting beyond Lantern Valley.');}
  else if(a.commit&&a.to===0){teaserOpen=false;history.pushState({chapter:'gate'},'','#gate');$('#page-scrub').value='0';$('.controls-heading strong').textContent='01 / 05';$('.chapter-kicker').innerHTML='<span></span><b>CHAPTER 01 / 05</b><i>·</i><b>INTENT</b>';showTeaser(false);diorama.setFolded(false);}
  else if(teaserOpen){view.turnProgress=1;diorama.setFolded(true);}else{view.turnProgress=0;diorama.setFolded(false);}
  book.setTurn(view.turnProgress,1);updatePageControls();
}
function updateTurn(now){if(!turnAnimation)return;const a=turnAnimation,u=THREE.MathUtils.clamp((now-a.started)/a.duration,0,1),e=u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2;view.turnProgress=THREE.MathUtils.lerp(a.from,a.to,e);book.setTurn(view.turnProgress,a.direction);if(u>=1){turnAnimation=null;finishTurn(a);}}
function handlePointerDown(e){
  if(e.button!==0||$('#map-overlay').classList.contains('open')||$('#reading-card').classList.contains('open'))return;
  const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;pointerState={id:e.pointerId,startX:x,startY:y,lastX:x,lastY:y,mode:'table',moved:false};
  pointerNdc.set(x/width*2-1,-(y/height)*2+1);raycaster.setFromCamera(pointerNdc,camera);
  const hits=raycaster.intersectObjects(diorama.interactive,true);if(hits.length){pointerState.mode='bell';canvas.setPointerCapture(e.pointerId);return;}
  if(!teaserOpen&&y>height*.36&&x>width*.48){pointerState.mode='page';view.turnProgress=0;book.setTurn(0,1);}
  else if(teaserOpen&&y>height*.36&&x<width*.52){pointerState.mode='page-back';view.turnProgress=1;book.setTurn(1,1);}
  canvas.setPointerCapture(e.pointerId);
}
function handlePointerMove(e){
  if(!pointerState||pointerState.id!==e.pointerId)return;const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,dx=x-pointerState.lastX;
  if(Math.hypot(x-pointerState.startX,y-pointerState.startY)>5)pointerState.moved=true;
  if(pointerState.mode==='page'){view.turnProgress=THREE.MathUtils.clamp((pointerState.startX-x)/(width*.42),0,.985);book.setTurn(view.turnProgress,1);if(view.turnProgress>.08)diorama.setFolded(true);}
  else if(pointerState.mode==='page-back'){view.turnProgress=1-THREE.MathUtils.clamp((x-pointerState.startX)/(width*.42),0,.985);book.setTurn(view.turnProgress,1);}
  else if(pointerState.mode==='table'){view.tableRotation=THREE.MathUtils.clamp(view.tableRotation+dx*.004,-.38,.38);view.tableTarget=view.tableRotation;}
  pointerState.lastX=x;pointerState.lastY=y;
}
function handlePointerUp(e){
  if(!pointerState||pointerState.id!==e.pointerId)return;const p=pointerState;pointerState=null;
  if(p.mode==='bell'){if(!p.moved){diorama.ringBell();audio.bell();}}
  else if(p.mode==='page'||p.mode==='page-back'){if(p.moved)settleTurn();else{view.turnProgress=p.mode==='page-back'?1:0;book.setTurn(view.turnProgress,1);}}
  else if(p.mode==='table')view.tableTarget=0;
}
function handleSoundToggle(){soundEnabled=!soundEnabled;audio.setEnabled(soundEnabled);$('#sound-toggle').setAttribute('aria-pressed',String(soundEnabled));$('#sound-toggle').setAttribute('aria-label',soundEnabled?'Turn sound off':'Turn sound on');$('#sound-glyph').textContent=soundEnabled?'♫':'♪';showToast(soundEnabled?'Soft paper and meadow sounds are on.':'Sound is off.');}
function handleNarration(){
  const glyph=$('#narration-glyph'),label=$('#narration-label'),state=audio.narrationState;
  if(state==='speaking'){audio.pauseNarration();glyph.textContent='▶';label.textContent='Resume narration';}
  else if(state==='paused'){audio.resumeNarration();glyph.textContent='Ⅱ';label.textContent='Pause narration';}
  else{const started=audio.speak(lanternGateStory.narration.text,lanternGateStory.narration.language,lanternGateStory.narration.audioUrl);if(!started){showToast('Narration is not available in this browser.');return;}glyph.textContent='Ⅱ';label.textContent='Pause narration';if(audio.utterance)audio.utterance.onend=()=>{glyph.textContent='▶';label.textContent='Listen to the story';};}
}
function handleKeyboard(e){if(e.key==='Escape'){setMapOpen(false);setReadingOpen(false);return;}if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();if(!teaserOpen)startTurn(1);}if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();if(teaserOpen)startTurn(-1);}if(e.key.toLowerCase()==='b'){diorama.ringBell();audio.bell();}}
function bindUI(){
  $('#reset-view').addEventListener('click',()=>{view.tableTarget=0;view.tableRotation=0;tableGroup.rotation.y=0;showToast('Back to the reader’s seat.');});
  $('#sound-toggle').addEventListener('click',handleSoundToggle);$('#map-open').addEventListener('click',()=>setMapOpen(true));$('#map-close').addEventListener('click',()=>setMapOpen(false));$('#map-overlay').addEventListener('click',e=>{if(e.target===$('#map-overlay'))setMapOpen(false);});\n  $('#map-overlay').querySelectorAll('.map-pin').forEach((pin,index)=>pin.addEventListener('click',()=>{if(index===0)setMapOpen(false);else showToast('That chapter is still being folded.');}));
  $('#read-open').addEventListener('click',()=>setReadingOpen(true));$('#read-close').addEventListener('click',()=>setReadingOpen(false));$('#play-narration').addEventListener('click',handleNarration);$('#next-page').addEventListener('click',()=>startTurn(1));$('#previous-page').addEventListener('click',()=>startTurn(-1));
  const scrub=$('#page-scrub');scrub.addEventListener('pointerdown',()=>{if(!teaserOpen)view.turnDirection=1;});scrub.addEventListener('input',()=>{if(teaserOpen)return;view.turnProgress=Number(scrub.value)/100;book.setTurn(view.turnProgress,1);diorama.setFolded(view.turnProgress>.08);});scrub.addEventListener('change',()=>{if(!teaserOpen&&view.turnProgress>.001)settleTurn();});
  canvas.addEventListener('pointerdown',handlePointerDown);canvas.addEventListener('pointermove',handlePointerMove);canvas.addEventListener('pointerup',handlePointerUp);canvas.addEventListener('pointercancel',handlePointerUp);canvas.addEventListener('contextmenu',e=>e.preventDefault());window.addEventListener('keydown',handleKeyboard);window.addEventListener('resize',resize,{passive:true});
  window.addEventListener('pointerup',()=>{const scrub=$('#page-scrub');if(document.activeElement===scrub&&view.turnProgress>.001&&!turnAnimation)settleTurn();});window.addEventListener('popstate',()=>{if(location.hash==='#gate'&&teaserOpen)startTurn(-1);else if(location.hash==='#bridge'&&!teaserOpen)startTurn(1);});
}
function animate(){if(disposed||!renderer)return;const delta=Math.min(clock.getDelta(),.04);elapsed+=delta;updateTurn(performance.now());view.tableRotation=THREE.MathUtils.damp(view.tableRotation,view.tableTarget,4.5,delta);tableGroup.rotation.y=view.tableRotation;diorama.update(elapsed,delta);renderer.render(scene,camera);requestAnimationFrame(animate);}
function init(){if(!createWorld())return;bindUI();resize();$('#loading-note')?.classList.add('hidden');setTimeout(()=>$('#loading-note')?.remove(),650);updatePageControls();if('serviceWorker'in navigator&&import.meta.env.PROD)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('Offline cache registration failed',e)));requestAnimationFrame(animate);}
window.addEventListener('pagehide',()=>{disposed=true;audio.dispose();diorama?.dispose();book?.dispose();renderer?.dispose();},{once:true});
init();
