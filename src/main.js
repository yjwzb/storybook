/* The Paper Island — a dependency-free 3D paper theatre. */
const canvas = document.querySelector('#world');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
const $ = (s) => document.querySelector(s);
const chapters = [
  { id:'gate', title:'The Bell Gate', region:'Meadow of Morrow', hint:'A little light can open a very old door.', line:'Pip found a bell that had forgotten how to ring.', story:'At the edge of Morrow Meadow stood a gatehouse with a bell no one had heard for a hundred years. Pip had promised to carry a little light to the lighthouse, but the road began here. The old owl keeper watched as Pip reached for the bell. One clear note, Pip thought, might be enough to wake the island.', note:'A door is only a wall that has learned to listen.', action:'Ring the old bell', plate:'PLATE 01', companion:'owl' },
  { id:'bridge', title:'The Rope Bridge', region:'River of Ribbons', hint:'Some gaps are crossed one small step at a time.', line:'A frog knew the river, but the bridge had lost its middle.', story:'The river ran bright and quick between two timber towers. A few planks had slipped away, leaving a gap above the water. Pip held the lantern high while a green frog tied the loose ropes. The missing boards were not lost at all; they had drifted downstream and were waiting to be called home.', note:'A bridge is made of many little yeses.', action:'Mend the missing planks', plate:'PLATE 02', companion:'frog' },
  { id:'library', title:'The Book House', region:'Saffronwood Library', hint:'Every good story leaves a door open.', line:'A mouse librarian kept the island’s oldest map beneath a roof of pages.', story:'In a sandy wood, Pip met a mouse who lived in a house shaped like an open book. Its paper roof rustled whenever a new story was told. The mouse unfastened a tiny brass clasp and showed Pip a map: the lighthouse stood beyond the wheat fields, where the sea met the moon.', note:'Maps remember the places our feet have not reached yet.', action:'Turn the roof pages', plate:'PLATE 03', companion:'mouse' },
  { id:'mill', title:'The Windmill', region:'Golden Wheat Downs', hint:'A little wind can carry a long way.', line:'A hedgehog miller showed Pip how to borrow the wind.', story:'The wheat bent in long golden waves around an old stone mill. Its sails had stopped turning, and the hedgehog miller could not grind the last flour for the village. Pip climbed the low hill, caught the breeze in the red scarf, and gave one sail a careful push. The mill remembered its work.', note:'Do not fight the wind. Give it something kind to move.', action:'Give the sail a turn', plate:'PLATE 04', companion:'hedgehog' },
  { id:'lighthouse', title:'The Lighthouse', region:'The Far Lantern Shore', hint:'The smallest light can guide the longest journey.', line:'At last, Pip’s lantern found the lighthouse waiting in the dark.', story:'The sea was ink-blue and the moon laid a silver road across it. Pip climbed the lighthouse steps with the little light from the beginning of the journey. A sailor penguin pulled the red lever. The lamp flashed twice, and far out on the water a red sail answered twice. Pip had carried the light all the way home.', note:'A light is not smaller because it is shared.', action:'Wake the lighthouse', plate:'PLATE 05', companion:'penguin' }
];
const slugToIndex = Object.fromEntries(chapters.map((c,i)=>[c.id,i]));
const state = { chapter:0, turn:0, turnDir:1, turnAnim:null, popIn:1, popElapsed:1, tableYaw:0, tableYawTarget:0, pointer:null, sailDrag:false, windmillAngle:0, windmillVelocity:0, gateBell:0, gateDoor:0, gateDoorTarget:0, bridgePlanks:0, bridgePlanksTarget:0, bookFlutter:0, lampFlash:0, boatAnswer:0, sound:false, audio:null, lastTime:0, t:0, toastTimer:0 };
let width=innerWidth, height=innerHeight, dpr=1, atlas=null, atlasMeta=null, atlasReady=false;
let commands=[];
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,t)=>{const x=clamp((t-a)/(b-a),0,1);return x*x*(3-2*x)};
const easeOut=(t)=>1-Math.pow(1-t,3);
const vec=(x,y,z)=>[x,y,z];
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=(a)=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
const camera={pos:[0,-23,13.8],target:[0,2.1,.12],fov:18.5};
state.currentPop=1; state.lampClock=0; state.lampSequence=0;
let camBasis;
function resize(){width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,(innerWidth<760?1.35:1.65));canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=width+'px';canvas.style.height=height+'px';ctx.setTransform(dpr,0,0,dpr,0,0);}
addEventListener('resize',resize,{passive:true});resize();
function updateCamera(){const dir=norm(sub(camera.target,camera.pos));const right=norm(cross(dir,[0,0,1]));const up=norm(cross(right,dir));camBasis={dir,right,up};const depth=24;const focal=Math.min(width*.95/12.35*depth,height*.97/7.45*depth);camera.fov=2*Math.atan(height/(2*focal))*180/Math.PI;}
function rotateWorld(p){const a=state.tableYaw+(state.chapter===4?-.035:0),c=Math.cos(a),s=Math.sin(a);return [p[0]*c-p[1]*s,p[0]*s+p[1]*c,p[2]];}
function project(p){const pp=[p[0],p[1],p[2]>.12?.12+(p[2]-.12)*state.currentPop:p[2]];const q=rotateWorld(pp),r=sub(q,camera.pos),z=dot(r,camBasis.dir);if(z<=.08)return {x:-10000,y:-10000,z};const f=height/(2*Math.tan(camera.fov*Math.PI/360));return {x:width*.5+dot(r,camBasis.right)*f/z,y:height*.5-dot(r,camBasis.up)*f/z,z};}
function pushPoly(points,color,stroke=null,lineWidth=1,shadow=0){const ps=points.map(project);if(ps.some(p=>!Number.isFinite(p.x)||p.x<-3000))return;commands.push({z:ps.reduce((s,p)=>s+p.z,0)/ps.length,draw(){ctx.beginPath();ctx.moveTo(ps[0].x,ps[0].y);for(let i=1;i<ps.length;i++)ctx.lineTo(ps[i].x,ps[i].y);ctx.closePath();if(shadow){ctx.shadowColor='rgba(22,20,12,.22)';ctx.shadowBlur=shadow;ctx.shadowOffsetY=shadow*.35;}ctx.fillStyle=color;ctx.fill();ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.lineJoin='round';ctx.stroke();}}});}
function pushLine(points,color,width=1,dash=[]){const ps=points.map(project);commands.push({z:ps.reduce((s,p)=>s+p.z,0)/ps.length,draw(){ctx.beginPath();ctx.moveTo(ps[0].x,ps[0].y);for(let i=1;i<ps.length;i++)ctx.lineTo(ps[i].x,ps[i].y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);}});}
function pushText(text,pos,size,color,italic=false,align='center',weight='normal'){const p=project(pos);commands.push({z:p.z-.002,draw(){ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.font=`${italic?'italic ':''}${weight} ${size}px Georgia,serif`;ctx.shadowColor='rgba(60,42,20,.12)';ctx.shadowBlur=2;ctx.fillText(text,0,0);ctx.restore();}});}
function addBox(x,y,z,w,d,h,color,sideColor=null){const x0=x-w/2,x1=x+w/2,y0=y-d/2,y1=y+d/2,z0=z,z1=z+h;const c=sideColor||shade(color,.78);pushPoly([[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],color,'rgba(105,75,43,.28)',.7,4);pushPoly([[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[x1,y0,z0]],c);pushPoly([[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]],shade(color,.72));pushPoly([[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]],shade(color,.86));pushPoly([[x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0]],shade(color,.68));pushPoly([[x0,y0,z0],[x0,y1,z0],[x0,y1,z1],[x0,y0,z1]],shade(color,.82));}
function shade(hex,k){const h=hex.replace('#','');const n=parseInt(h,16);let r=(n>>16)&255,g=(n>>8)&255,b=n&255;r=clamp(Math.round(r*k),0,255);g=clamp(Math.round(g*k),0,255);b=clamp(Math.round(b*k),0,255);return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');}
function addPrism(x,y,z,r,h,color,sides=7,topColor=null){const pts=[];for(let i=0;i<sides;i++){const a=TAU*i/sides+.18;pts.push([x+Math.cos(a)*r,y+Math.sin(a)*r,z]);}const top=pts.map(p=>[p[0],p[1],z+h]);for(let i=0;i<sides;i++){const j=(i+1)%sides;pushPoly([pts[i],pts[j],top[j],top[i]],shade(color,.72+.22*(i%3)/2));}pushPoly(top,topColor||shade(color,1.12),'rgba(92,70,43,.2)',.6,3);}
function addCone(x,y,z,r,h,color,sides=7){const top=[x,y,z+h],pts=[];for(let i=0;i<sides;i++){const a=TAU*i/sides+.15;pts.push([x+Math.cos(a)*r,y+Math.sin(a)*r,z]);}for(let i=0;i<sides;i++){const j=(i+1)%sides;pushPoly([pts[i],pts[j],top],shade(color,.72+.28*(i%3)/2));}pushPoly(pts,shade(color,.82));}
function addCylinder(x,y,z,r,h,color,sides=10){addPrism(x,y,z,r,h,color,sides,shade(color,1.15));}
function addTree(x,y,z,s=1,kind='round'){addBox(x,y,z,.12*s,.13*s,.58*s,'#896447');if(kind==='pine'){addCone(x,y,z+.32*s,.48*s,.72*s,'#385e49',7);addCone(x,y,z+.72*s,.37*s,.62*s,'#315543',7);addCone(x,y,z+1.05*s,.25*s,.52*s,'#294a3b',7);}else{addPrism(x,y,z+.48*s,.53*s,.72*s,'#718b55',7,'#91a56c');addPrism(x-.18*s,y-.02*s,z+.74*s,.37*s,.48*s,'#8b9a5c',6,'#a4ad6c');addPrism(x+.18*s,y+.02*s,z+.77*s,.34*s,.44*s,'#667f4d',6,'#91a56c');}}
function addMountain(x,y,z,w,h,color){const a=[x-w/2,y,z],b=[x+w/2,y,z],c=[x-w*.16,y,z+h],d=[x+w*.08,y-.12,z+h*.68];pushPoly([a,b,c],color,'rgba(82,80,61,.22)',.6);pushPoly([a,c,d],shade(color,1.12));pushPoly([d,c,b],shade(color,.78));pushPoly([[x-w*.16,y,z+h],[x-w*.05,y,z+h*.78],[x+.05*w,y,z+h*.83]],'#f0e4c8');}
function addRock(x,y,z,s=1,color='#9d9b83'){const p=[[x-s*.38,y-s*.24,z],[x-s*.2,y-s*.38,z+s*.18],[x+s*.22,y-s*.3,z+s*.24],[x+s*.42,y+s*.08,z+s*.05],[x+s*.12,y+s*.32,z],[x-s*.28,y+s*.24,z]];const top=p.map((v,i)=>[v[0],v[1],v[2]+(i%2?.12*s:.02*s)]);for(let i=0;i<p.length;i++){const j=(i+1)%p.length;pushPoly([p[i],p[j],top[j],top[i]],shade(color,.78+.15*(i%3)/2));}pushPoly(top,shade(color,1.08),'rgba(91,77,55,.18)',.5,2);}
function addGrass(x,y,z,s=1,color='#82945b'){const n=3;for(let i=0;i<n;i++){const dx=(i-1)*.075*s;pushPoly([[x+dx-.04*s,y,z],[x+dx+.04*s,y,z],[x+dx+(i-1)*.03*s,y,z+.28*s*(.8+(i%2)*.2)]],i===1?shade(color,1.18):color);}}
function addFlower(x,y,z,s=1,color='#e5a6a0'){pushLine([[x,y,z],[x,y,z+.24*s]],'#61764d',1.6);for(let i=0;i<5;i++){const a=TAU*i/5;const cx=x+Math.cos(a)*.09*s,cy=y+Math.sin(a)*.09*s;pushPoly([[cx-.045*s,cy,z+.22*s],[cx,cy-.06*s,z+.25*s],[cx+.045*s,cy,z+.22*s],[cx,cy+.06*s,z+.22*s]],color);}pushPoly([[x-.045*s,y,z+.24*s],[x,y-.045*s,z+.24*s],[x+.045*s,y,z+.24*s],[x,y+.045*s,z+.24*s]],'#e9b03f');}
function addFence(x1,x2,y,z,segments=5){for(let i=0;i<=segments;i++){const x=lerp(x1,x2,i/segments);addBox(x,y,z,.07,.08,.48,'#936844');}addBox((x1+x2)/2,y,z+.25,x2-x1,.08,.08,'#a77b50');addBox((x1+x2)/2,y,z+.47,x2-x1,.08,.08,'#a77b50');}
function addHouse(x,y,z,s=1){addBox(x,y,z,.92*s,.72*s,.72*s,'#cbbd9d');addPolyRoof(x,y,z+.68*s,1.12*s,.94*s,.54*s,'#b75d47');addBox(x+.02*s,y-.37*s,z+.03*s,.2*s,.035*s,.42*s,'#75503a');addBox(x-.27*s,y-.367*s,z+.32*s,.16*s,.025*s,.18*s,'#7c9b96');addBox(x+.28*s,y-.367*s,z+.32*s,.16*s,.025*s,.18*s,'#7c9b96');}
function addPolyRoof(x,y,z,w,d,h,color){const a=[x-w/2,y-d/2,z],b=[x+w/2,y-d/2,z],c=[x+w/2,y+d/2,z],e=[x-w/2,y+d/2,z],top=[x,y,z+h];pushPoly([a,b,top],shade(color,.88));pushPoly([b,c,top],shade(color,.72));pushPoly([c,e,top],shade(color,.84));pushPoly([e,a,top],color);}

function pagePoint(side,u,v,turn=0){const W=5.72,D=3.35;let x,z=.11,y=-D+v*D*2;if(side==='left'){const a=turn*Math.PI,curve=Math.sin(Math.PI*u)*Math.sin(Math.PI*turn)*.12;x=-W*u*Math.cos(a+curve);z+=W*u*Math.sin(a+curve)*.54+Math.sin(Math.PI*u)*Math.sin(Math.PI*turn)*.12;}else if(side==='right'){const a=turn*Math.PI,curve=Math.sin(Math.PI*u)*Math.sin(Math.PI*turn)*.12;x=W*u*Math.cos(a+curve);z+=W*u*Math.sin(a+curve)*.54+Math.sin(Math.PI*u)*Math.sin(Math.PI*turn)*.12;}else{x=W*u;}
return [x,y,z];}
function addPage(side,turn=0,back=false){const nu=14,nv=8;for(let i=0;i<nu;i++){for(let j=0;j<nv;j++){const u0=i/nu,u1=(i+1)/nu,v0=j/nv,v1=(j+1)/nv;const p=[pagePoint(side,u0,v0,turn),pagePoint(side,u1,v0,turn),pagePoint(side,u1,v1,turn),pagePoint(side,u0,v1,turn)];const tone=((i+j)%5===0)?'#f1e4c1':'#f6ebd0';pushPoly(p,back?(tone==='#f1e4c1'?'#efe0b9':'#f4e8c9'):tone,'rgba(153,119,72,.07)',.3,turn>0?Math.sin(turn*Math.PI)*5:0);}}const edge=[];for(let i=0;i<=24;i++)edge.push(pagePoint(side,i/24,0,turn));pushLine(edge,'rgba(152,113,66,.38)',1.2);const edge2=[];for(let i=0;i<=24;i++)edge2.push(pagePoint(side,i/24,1,turn));pushLine(edge2,'rgba(152,113,66,.38)',1.2);}
function addMapPrint(chapterIndex,side,turn=0){const c=chapters[chapterIndex];const point=(u,v)=>pagePoint(side,u,v,turn);const base=side==='left'?-1:1;const regionColor=['#c9d09c','#a9c2ad','#d7c28b','#c6bc82','#91b7b1'][chapterIndex];for(let k=0;k<3;k++){const u=.12+k*.24,v=.22+(k%2)*.18;const pts=[[u-.1,v-.06],[u-.04,v-.12],[u+.08,v-.09],[u+.12,v+.01],[u+.03,v+.1],[u-.09,v+.07]].map(q=>point(q[0],q[1]));pushPoly(pts,regionColor,'rgba(118,112,78,.12)',.5);}
const route=[[.07,.56],[.19,.49],[.31,.6],[.44,.44],[.56,.51],[.68,.35],[.82,.47],[.94,.33]];for(let i=0;i<route.length-1;i++){const a=route[i],b=route[i+1];for(let k=0;k<6;k+=2){const t0=k/6,t1=(k+1)/6;pushLine([point(lerp(a[0],b[0],t0),lerp(a[1],b[1],t0)),point(lerp(a[0],b[0],t1),lerp(a[1],b[1],t1))],'#a85b42',1.8);}}
for(let i=0;i<route.length;i++){const p=point(route[i][0],route[i][1]);const r=.045;pushPoly([[p[0]-r,p[1],p[2]+.01],[p[0],p[1]-r,p[2]+.01],[p[0]+r,p[1],p[2]+.01],[p[0],p[1]+r,p[2]+.01]],'#a85b42');}
if(side==='right'){pushText(c.region,point(.57,.72),Math.max(12,Math.min(18,width/90)),'#766346',true);pushText(c.plate,point(.85,.9),9,'#806f4f',false);pushText('N  ✦  E',point(.88,.18),9,'#897752',false);}
else{pushText('THE PAPER ISLAND',point(.2,.15),9,'#a18b63',false);}
// little map border and corner leaf marks
const border=[[.035,.05],[.965,.05],[.965,.95],[.035,.95],[.035,.05]].map(q=>point(q[0],q[1]));pushLine(border,'rgba(153,119,72,.28)',.8);
}
function addSprite(name,cx,cy,bottomZ,w,h,angle=0,alpha=1){if(!atlasReady)return;const m=atlasMeta.sprites[name];if(!m)return;const c=Math.cos(angle),s=Math.sin(angle);const local=(lx,lz)=>[cx+lx*c-lz*s,cy,bottomZ+lz*c+lx*s];const tl=local(-w/2,h),tr=local(w/2,h),bl=local(-w/2,0),br=local(w/2,0);const pts=[tl,tr,br,bl].map(project);const depth=pts.reduce((a,p)=>a+p.z,0)/4;commands.push({z:depth-.001,draw(){const sw=m.w,sh=m.h,p0=pts[0],p1=pts[1],p2=pts[3];const a=(p1.x-p0.x)/sw,b=(p1.y-p0.y)/sw,cxv=(p2.x-p0.x)/sh,dy=(p2.y-p0.y)/sh;ctx.save();ctx.globalAlpha=alpha;ctx.setTransform(dpr*a,dpr*b,dpr*cxv,dpr*dy,dpr*p0.x,dpr*p0.y);ctx.drawImage(atlas,m.x,m.y,m.w,m.h,0,0,sw,sh);ctx.restore();ctx.setTransform(dpr,0,0,dpr,0,0);}});}
function addPuppet(character,x,y,baseZ,pop=1,phase=0,scale=1){const bob=Math.sin(state.t*2.7+phase)*.045*pop;const z=baseZ+bob;const f=state.t*2.4+phase;const h=1.05*scale*pop;const bodyH=.72*scale*pop;const charY=y-.025;
if(character==='pip'||character==='mouse')addSprite(`${character}-tail`,x-.38*scale,charY+.015,z,.68*scale,.62*scale,Math.sin(f*1.1)*.28*pop);
if(character==='owl')addSprite(`${character}-tail`,x-.02*scale,charY+.04,z+.12*scale,.82*scale,.56*scale,Math.sin(f*1.1)*.06*pop);
addSprite(`${character}-body`,x,charY,z,.68*scale,bodyH,Math.sin(f)*.035*pop);
addSprite(`${character}-leftarm`,x-.34*scale,charY-.012,z+.12*scale,.34*scale,.62*scale,Math.sin(f+1)*.18*pop);
addSprite(`${character}-rightarm`,x+.34*scale,charY-.016,z+.12*scale,.34*scale,.62*scale,Math.sin(f+2)*.18*pop);
addSprite(`${character}-feet`,x,charY-.03,z-.015,.72*scale,.34*scale,Math.sin(f*1.5)*.08*pop);
addSprite(`${character}-head`,x,charY-.04,z+bodyH-.12*scale,.78*scale,.72*scale,Math.sin(f*.8)*.08*pop);
addSprite(`${character}-eyes`,x,charY-.043,z+bodyH-.12*scale,.78*scale,.72*scale,Math.sin(f*.8)*.08*pop);
// Props are independent paper cards, attached to the outside paw so they can be animated later.
if(character==='pip')addSprite('pip-prop',x+.42*scale,charY-.06,z+.22*scale,.34*scale,.48*scale,Math.sin(f+2)*.06*pop);
else addSprite(`${character}-prop`,x+.42*scale,charY-.06,z+.18*scale,.34*scale,.45*scale,Math.sin(f+2)*.05*pop);
}
function addSkyBits(ch,pop){const sunX=-3.55,sunY=2.5,z=.12;if(ch===4){addPrism(-3.7,2.55,z, .42,.05,'#d7c4a0',12,'#f2e3bf');for(let i=0;i<12;i++){const a=TAU*i/12;pushLine([[sunX+Math.cos(a)*.48,sunY+Math.sin(a)*.48,z+.08],[sunX+Math.cos(a)*.65,sunY+Math.sin(a)*.65,z+.08]],'#e7d4a7',2);}return;}
addBox(sunX,2.48,.14,.035,.035,.96,'#9e7950');addPrism(sunX,2.48,1.08,.42,.04,'#e9b03f',10,'#f4c55e');for(let i=0;i<10;i++){const a=TAU*i/10;const x1=sunX+Math.cos(a)*.48,y1=2.48+Math.sin(a)*.48;const x2=sunX+Math.cos(a)*.64,y2=2.48+Math.sin(a)*.64;pushPoly([[x1-.04,y1,1.08],[x1+.04,y1,1.08],[x2,y2,1.08]],'#e9b03f');}addBox(1.5,2.35,.1,.035,.035,1.02,'#9e7950');addPrism(1.5,2.35,1.12,.44,.22,'#f0e4c8',7,'#f7edda');addPrism(1.78,2.36,1.1,.3,.2,'#f0e4c8',7,'#f7edda');}
function addBackground(ch,pop){const mountainColors=ch===4?['#536c68','#647c78','#81928a']:['#84937a','#a3a88b','#c0b99b'];for(let i=0;i<6;i++){const x=-5.0+i*1.95;const y=2.4+(i%2)*.18;addMountain(x,y,.1,.95+(i%3)*.2,.9+(i%3)*.23,mountainColors[i%mountainColors.length]);}
for(let i=0;i<8;i++){const x=-4.7+i*1.28;const y=1.8+(i%3)*.24;addTree(x,y,.12,.65+(i%3)*.12,i%3===0?'pine':'round');}
addSkyBits(ch,pop);
}
function addCommonGround(ch,pop){const ground=ch===4?'#506f69':ch===1?'#9bb58e':ch===2?'#c9b58b':ch===3?'#c4b66e':'#a8b77e';pushPoly([[-5.5,-2.7,.12],[5.5,-2.7,.12],[5.5,2.25,.12],[-5.5,2.25,.12]],ground,'rgba(98,88,56,.12)',.6);
for(let i=0;i<18;i++){const x=-5.0+(i*1.73%9.8),y=-2.2+(i*1.13%4.0);addGrass(x,y,.14,.65+(i%4)*.18,i%3===0?'#6c8b59':i%3===1?'#91a06a':'#b2b477');}
for(let i=0;i<10;i++){const x=-4.8+(i*1.91%9.4),y=-2.05+(i*1.27%3.7);addFlower(x,y,.16,.65+(i%3)*.2,i%3===0?'#f1d7ad':i%3===1?'#d98f85':'#f0e7d0');}
for(let i=0;i<9;i++){const x=-5.0+(i*1.31%9.8),y=-2.45+(i%3)*.44;addRock(x,y,.13,.25+(i%3)*.1,ch===4?'#73817a':'#aaa58c');}
}
function addGate(pop){const x=2.55,y=.85,z=.14,h=2.35*pop;addBox(x,y,z,1.5,.72,h,'#c9b99a');addBox(x-.49,y-.38,z+.2,.42,.12,1.35*pop,'#b7a582');addBox(x+.49,y-.38,z+.2,.42,.12,1.35*pop,'#b7a582');addPolyRoof(x,y,z+h-.05,1.9,.94,.68*pop,'#ad4f3e');addBox(x,y-.39,z+.04,.64,.08,1.12*pop,'#674b39');const door=state.gateDoor*pop;const dx=.92*Math.sin(door*Math.PI/2);addBox(x-.16-dx,y-.46,z+.05,.3,.06,1.02*pop,'#8c5d40');addBox(x+.16+dx,y-.46,z+.05,.3,.06,1.02*pop,'#8c5d40');addBox(x,y-.53,z+1.05*pop,.07,.05,.1,'#e9b03f');addBox(x,y-.4,z+h+.62*pop,.035,.035,.62*pop,'#916c45');pushPoly([[x,y-.4,z+h+.9*pop],[x+.55,y-.4,z+h+.78*pop],[x+.43,y-.4,z+h+.48*pop],[x,y-.4,z+h+.57*pop]],'#e9b03f');const bellA=state.gateBell*pop;const bx=x-.95+Math.sin(state.t*13)*bellA*.16;pushLine([[bx,y-.48,z+h+.05*pop],[bx+Math.sin(bellA)*.1,y-.48,z+h-.2*pop]],'#8b633f',2);addPrism(bx+Math.sin(bellA)*.1,y-.49,z+h-.42*pop,.16,.22*pop,'#d9a43f',9,'#edc45e');addPrism(bx+Math.sin(bellA)*.1,y-.49,z+h-.47*pop,.055,.04,'#8e6337',8);}
function addBridge(pop){const x=2.55,y=.8,z=.14;for(const sx of [-1,1]){addBox(x+sx*1.25,y,z,.24,.35,2.35*pop,'#936a49');addBox(x+sx*1.25,y,z+2.25*pop,.48,.44,.18,'#ad8056');}for(let i=0;i<11;i++){const t=i/10,px=x-1.15+t*2.3,py=y-.32+Math.sin(t*Math.PI)*.32;const missing=i>=4&&i<=6;const slideX=missing?(1-state.bridgePlanks)*(i===4?-1.2:i===6?1.2:0):0;const slideY=missing&&i===5?(1-state.bridgePlanks)*-.9:0;addBox(px+slideX,py+slideY,z+.12*pop,.19,.55,.11*pop,'#a8754d');}
for(let side of [-1,1]){const pts=[];for(let i=0;i<=16;i++){const t=i/16;pts.push([x-1.2+t*2.4,y+side*.26+Math.sin(t*Math.PI)*.36,z+2.1*pop-Math.sin(t*Math.PI)*.52*pop]);}pushLine(pts,'#8c684a',3);for(let i=0;i<9;i++){const t=i/8,px=x-1.2+t*2.4,py=y+side*.26+Math.sin(t*Math.PI)*.36;pushLine([[px,py,z+.3*pop],[px,py,z+2.12*pop]],'#9d7953',1.3);}}
for(let i=0;i<5;i++){const x0=x-.9+i*.45;pushLine([[x0,y-.5,z+1.48*pop],[x0+.2,y-.5,z+1.32*pop]],i%2?'#d8a94a':'#bd5c48',3);}}
function addBookHouse(pop){const x=2.45,y=.9,z=.14;addBox(x,y,z,.9,.72,1.1*pop,'#bca982');addBox(x,y-.4,z+.06,.25,.08,.78*pop,'#6d523a');const roofZ=z+1.45*pop;const left=[[x,y,roofZ+1.05*pop],[x-1.15,y-.15,roofZ],[x-.05,y-.58,roofZ-.04*pop]];const right=[[x,y,roofZ+1.05*pop],[x+1.15,y-.15,roofZ],[x+.05,y-.58,roofZ-.04*pop]];pushPoly(left,'#9f4d3e','#f0d9ae',2,3);pushPoly(right,'#e2c98f','#f8edcf',2,3);for(let i=0;i<5;i++){const t=i/5;pushLine([[x-t*1.0,y-.18,roofZ+.9*pop*(1-t)],[x-t*.05,y-.56,roofZ+.05*pop]],'#b28b59',1);pushLine([[x+t*1.0,y-.18,roofZ+.9*pop*(1-t)],[x+t*.05,y-.56,roofZ+.05*pop]],'#b28b59',1);}
if(state.bookFlutter>0){const a=Math.sin(state.t*17)*.22*state.bookFlutter;pushPoly([[x-.05,y-.6,roofZ],[x-.6,y-.7,roofZ+.7*pop+a],[x-.04,y-.62,roofZ+.9*pop]],'#f7e8c8');}}
function addWindmill(pop){const x=2.45,y=.88,z=.14;addCylinder(x,y,z,.62,2.0*pop,'#b8ad91',9);for(let i=0;i<7;i++){const yy=y-.34+i*.11;pushLine([[x-.52,yy,z+.2*pop],[x+.52,yy,z+.2*pop]],'#a3977c',1.4);}addCone(x,y,z+1.95*pop,.76,1.0*pop,'#a94e3f',8);const hub=[x,y-.55,z+2.45*pop];addPrism(hub[0],hub[1],hub[2],.13,.12,'#d5a34b',8,'#efc86d');const a=state.windmillAngle;for(let i=0;i<4;i++){const ang=a+i*Math.PI/2;const len=1.15*pop,half=.22*pop;const ex=hub[0]+Math.cos(ang)*len,ez=hub[2]+Math.sin(ang)*len;const px=-Math.sin(ang)*half,pz=Math.cos(ang)*half;const p1=[hub[0]+px,hub[1],hub[2]+pz],p2=[ex+px,hub[1],ez+pz],p3=[ex-px,hub[1],ez-pz],p4=[hub[0]-px,hub[1],hub[2]-pz];pushPoly([p1,p2,p3,p4],'#ead9b5','#9d7954',2,2);for(let k=1;k<4;k++){const t=k/4;pushLine([[lerp(p1[0],p4[0],t),hub[1]-.015,lerp(p1[2],p4[2],t)],[lerp(p2[0],p3[0],t),hub[1]-.015,lerp(p2[2],p3[2],t)]],'#a57b50',1.2);}pushLine([p1,p3],'#a57b50',1);pushLine([p4,p2],'#a57b50',1);} }
function addLighthouse(pop){const x=2.55,y=.82,z=.14;addCylinder(x,y,z,.55,2.65*pop,'#e7dfc7',10);for(let i=0;i<4;i++){const zz=z+.2*pop+i*.56*pop;addPrism(x,y-.02,zz,.555,.19*pop,i%2?'#b65b49':'#f0e5ca',10,i%2?'#c86a53':'#fbf1d9');}addCylinder(x,y,z+2.63*pop,.48,.34*pop,'#6c6657',10);addBox(x,y,z+2.95*pop,.88,.76,.48*pop,'#4c5d58');addCone(x,y,z+3.4*pop,.58,.55*pop,'#a94e3e',8);addPrism(x,y-.45,z+3.06*pop,.23,.05,'#e9b03f',8,'#fff0b4');if(state.lampFlash){pushPoly([[x-.05,y-.12,z+3.1*pop],[x-3.2,y-.15,z+1.15*pop],[x-3.4,y-.15,z+2.1*pop]],'rgba(250,231,170,.26)');}
// star field
for(let i=0;i<16;i++){const sx=-4.8+(i*1.43%9.2),sy=1.4+(i*1.17%2.0);pushPoly([[sx,sy,.19],[sx+.045,sy+.12,.19],[sx+.09,sy,.19],[sx+.045,sy-.12,.19]],'#e9dfc0');}
// little gulls cut from cream paper
for(let i=0;i<3;i++){const gx=-1.2+i*1.35,gy=2.1+(i%2)*.34;pushLine([[gx-.18,gy,.2],[gx,gy+.1,.2],[gx+.18,gy,.2]],'#f3e6c4',2.2);}
// dark sea strip and paper waves
pushPoly([[-5.5,-2.8,.14],[5.5,-2.8,.14],[5.5,-1.9,.14],[-5.5,-1.9,.14]],'#355f68');for(let i=0;i<12;i++){const xx=-5+i*.9;pushLine([[xx,-2.35,.18],[xx+.3,-2.28,.18],[xx+.6,-2.35,.18]],'#a6c0b5',1.4);}
// red sailboat
const bx=.65+(state.boatAnswer?Math.sin(state.lampClock*5)*.18:0),by=-2.1;pushPoly([[bx-.65,by,.22],[bx+.7,by,.22],[bx+.4,by-.26,.22],[bx-.38,by-.26,.22]],'#a64d3e','#f0d7ae',1.4,2);pushLine([[bx,by-.08,.25],[bx,by-.08,.95]],'#8d6747',2);pushPoly([[bx-.02,by-.08,.91],[bx+.48,by-.08,.5],[bx-.02,by-.08,.48]],'#c35b45','#f1d9b4',1.5);pushPoly([[bx-.03,by-.08,.87],[bx-.42,by-.08,.56],[bx-.03,by-.08,.5]],'#ead9b5');
// lever on near edge
addBox(4.2,-2.4,.15,.48,.28,.24,'#797d75');pushLine([[4.2,-2.4,.32],[4.2,-2.4,.94]],'#b1a48a',4);addPrism(4.2,-2.4,.88,.17,.15,'#b34d3f',8,'#dc6a51');}
function addLandmark(ch,pop){if(ch===0)addGate(pop);if(ch===1)addBridge(pop);if(ch===2)addBookHouse(pop);if(ch===3)addWindmill(pop);if(ch===4)addLighthouse(pop);}
function addChapterDecor(ch,pop){addBackground(ch,pop);addCommonGround(ch,pop);addHouse(-2.65,1.1,.14,.85);addFence(-3.4,-1.8,.65,.14,4);if(ch===1){for(let i=0;i<6;i++)addRock(-.6+i*.45,1.0,.15,.24,'#9c9b83');pushPoly([[-1.6,.6,.16],[.4,.6,.16],[1.0,-.15,.16],[-1.2,-.15,.16]],'#6b9b9a');for(let i=0;i<6;i++)pushLine([[-1.4+i*.38,.25,.18],[-1.1+i*.38,.05,.18]],'#c0d6c4',1.5);}if(ch===2){for(let i=0;i<6;i++){const x=-4.3+i*.65;addTree(x,1.4,.14,.55,'round');}}if(ch===3){for(let i=0;i<7;i++){const x=-4.7+i*.8;pushLine([[x,-1.8,.16],[x+.1,-1.8,.42]],'#c4a95e',2);for(let k=0;k<3;k++)pushPoly([[x+.1+k*.02,-1.8,.38+k*.03],[x-.08+k*.02,-1.8,.52+k*.03],[x+.08+k*.02,-1.8,.49+k*.03]],'#d5b66b');}}if(ch===4){for(let i=0;i<8;i++)addRock(-4.8+i*1.35,-1.6,.16,.36,'#667d79');}}
function addBookAndTable(){// background table plane
pushPoly([[-12,-5,-.62],[12,-5,-.62],[12,24,-.62],[-12,24,-.62]],state.chapter===4?'#1d3437':'#27483f');
// leather cover and page stack
addBox(0,0,-.48,12.35,7.45,.25,'#7d3d34');for(let i=0;i<7;i++){const z=-.2+i*.035;addBox(0,0,z,11.9-i*.025,7.02-i*.025,.035,'#d9c9a8');}
addBox(0,0,-.12,.22,7.15,.23,'#65372f');
// red ribbon at bottom centre
pushPoly([[-.25,-3.3,.17],[.25,-3.3,.17],[.3,-4.15,-.18],[.08,-3.98,-.18],[0,-4.18,-.18],[-.08,-3.98,-.18],[-.3,-4.15,-.18]],'#b34c3e','#8e3e35',.7,2);
}
function addBookPages(){const leftTurn=state.turnDir===-1?state.turn:0,rightTurn=state.turnDir===1?state.turn:0;addPage('left',leftTurn,leftTurn>.5);addPage('right',rightTurn,rightTurn>.5);const target=state.turnTarget??clamp(state.chapter+state.turnDir,0,4);const leftMap=state.turnDir===-1&&state.turn>.5?target:state.chapter;const rightMap=state.turnDir===1&&state.turn>.5?target:state.chapter;addMapPrint(leftMap,'left',leftTurn);addMapPrint(rightMap,'right',rightTurn);
// center crease and small book ornaments
pushLine([[0,-3.28,.19],[0,3.28,.19]],'rgba(130,97,62,.32)',1.3);pushPoly([[-.16,-3.3,.2],[0,-3.43,.2],[.16,-3.3,.2]],'#9b5b46');}
function addCharacterPair(ch,pop){const companion=chapters[ch].companion;addPuppet('pip',-2.8,-1.45,.17,pop,0,1.0);addPuppet(companion,-1.38,-1.48,.17,pop,1.6,.98);}
function addDiorama(ch,pop){if(pop<=.01)return;const old=state.currentPop;state.currentPop=pop;addChapterDecor(ch,1);addLandmark(ch,1);addCharacterPair(ch,1);state.currentPop=old;}
function render(){commands=[];addBookAndTable();addBookPages();const scenePop=state.turn>0?Math.max(0,1-smooth(0,1,state.turn)):state.popIn;addDiorama(state.chapter,scenePop);if(state.turn>0&&state.turn>.72){const target=state.turnTarget??clamp(state.chapter+state.turnDir,0,4);const preview=smooth(.72,1,state.turn)*.72;addDiorama(target,preview);}
commands.sort((a,b)=>b.z-a.z);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);const bg=ctx.createRadialGradient(width*.18,height*.08,0,width*.5,height*.45,Math.max(width,height)*.9);bg.addColorStop(0,'#52614a');bg.addColorStop(.45,state.chapter===4?'#1d3437':'#27483f');bg.addColorStop(1,'#101f1c');ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);for(const c of commands)c.draw();}


function loadAtlas(){
  const img=new Image();
  const imageReady=new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;});
  img.src='./assets/puppet-atlas.svg';
  Promise.all([imageReady,fetch('./assets/puppet-atlas.json').then(r=>{if(!r.ok)throw new Error('atlas manifest');return r.json();})]).then(([_,meta])=>{atlas=img;atlasMeta=meta;atlasReady=true;}).catch(err=>{console.warn('Puppet atlas unavailable; the paper scenery remains interactive.',err);});
}
function showToast(message){
  const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>el.classList.remove('show'),2200);
}
function updateUI(){
  const c=chapters[state.chapter];
  $('#chapter-kicker').textContent=`CHAPTER ${String(state.chapter+1).padStart(2,'0')} / 05`;
  $('#chapter-title').textContent=c.title;
  $('#region-name').textContent=c.region;
  $('#chapter-hint').textContent=c.hint;
  $('#story-line').textContent=c.line;
  $('#page-count').textContent=`${String(state.chapter+1).padStart(2,'0')} / 05`;
  $('#page-slider').value=String(state.chapter);
  $('#read-title').textContent=c.title;
  $('#read-body').textContent=c.story;
  $('#pip-note').textContent=c.note;
  $('#prop-action').innerHTML=`${c.action} <span>↗</span>`;
  $('#chapter-dots').querySelectorAll('button').forEach((b,i)=>b.classList.toggle('active',i===state.chapter));
  document.querySelectorAll('.map-pin').forEach(b=>b.classList.toggle('active',Number(b.dataset.chapter)===state.chapter));
  document.title=`${c.title} — The Paper Island`;
}
function setHash(index,replace=false){
  const hash='#'+chapters[index].id;
  if(location.hash===hash)return;
  if(replace)history.replaceState({chapter:index},'',hash);else history.pushState({chapter:index},'',hash);
}
function commitTurn(){
  const target=clamp(state.turnTarget??state.chapter+state.turnDir,0,4);
  state.chapter=target;state.turn=0;state.turnAnim=null;state.turnTarget=undefined;
  state.popElapsed=0;state.popIn=0;state.turnDir=1;
  updateUI();setHash(state.chapter);playSfx('paper');
}
function startTurn(dir,target){
  if(state.turnAnim)return;
  const next=target??state.chapter+dir;
  if(next<0||next>4||next===state.chapter)return;
  state.turnDir=dir;state.turnTarget=next;
  state.turn=0;state.turnAnim={from:0,to:1,start:performance.now(),duration:900,commit:true};
  playSfx('paper');
}
function settleTurn(){
  if(state.turnAnim)return;
  const finish=state.turn>=.5;
  state.turnAnim={from:state.turn,to:finish?1:0,start:performance.now(),duration:900,commit:finish};
}
function jumpTo(index){
  index=clamp(Number(index),0,4);
  if(index===state.chapter){$('#map-overlay').classList.remove('open');$('#map-overlay').setAttribute('aria-hidden','true');return;}
  state.turnDir=index>state.chapter?1:-1;
  state.turnTarget=index;
  state.turn=0;
  state.turnAnim={from:0,to:1,start:performance.now(),duration:950,commit:true};
  $('#map-overlay').classList.remove('open');$('#map-overlay').setAttribute('aria-hidden','true');
  $('#reading-card').classList.remove('open');$('#reading-card').setAttribute('aria-hidden','true');
  playSfx('paper');
}
function openReading(open=true){
  $('#reading-card').classList.toggle('open',open);
  $('#reading-card').setAttribute('aria-hidden',String(!open));
}
function openMap(open=true){
  $('#map-overlay').classList.toggle('open',open);
  $('#map-overlay').setAttribute('aria-hidden',String(!open));
}
function getAudio(){
  if(state.audio)return state.audio;
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return null;
  state.audio=new AC();return state.audio;
}
function playSfx(kind='paper'){
  if(!state.sound)return;
  const ac=getAudio();if(!ac)return;
  if(ac.state==='suspended')ac.resume();
  const now=ac.currentTime;
  const gain=ac.createGain();gain.connect(ac.destination);
  if(kind==='bell'){
    const osc=ac.createOscillator();const overtone=ac.createOscillator();
    osc.type='sine';overtone.type='triangle';osc.frequency.setValueAtTime(650,now);osc.frequency.exponentialRampToValueAtTime(430,now+.9);
    overtone.frequency.setValueAtTime(980,now);overtone.frequency.exponentialRampToValueAtTime(710,now+.75);
    const g2=ac.createGain();g2.gain.setValueAtTime(.0001,now);g2.gain.exponentialRampToValueAtTime(.16,now+.02);g2.gain.exponentialRampToValueAtTime(.0001,now+1.05);
    gain.gain.value=.22;osc.connect(gain);overtone.connect(g2);g2.connect(ac.destination);osc.start(now);overtone.start(now);osc.stop(now+1.1);overtone.stop(now+1.1);gain.gain.setTargetAtTime(.0001,now+.75,.12);
  }else{
    const length=Math.floor(ac.sampleRate*.22),buffer=ac.createBuffer(1,length,ac.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
    const source=ac.createBufferSource();source.buffer=buffer;
    const filter=ac.createBiquadFilter();filter.type='lowpass';filter.frequency.value=kind==='paper'?1500:850;
    const g=ac.createGain();g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(kind==='paper'?.11:.055,now+.025);g.gain.exponentialRampToValueAtTime(.0001,now+.23);
    source.connect(filter);filter.connect(g);g.connect(ac.destination);source.start(now);source.stop(now+.24);
  }
}
function triggerProp(){
  const ch=state.chapter;
  if(ch===0){state.gateBell=1;state.gateDoorTarget=1;playSfx('bell');showToast('The old gate wakes with a bright clear note.');}
  if(ch===1){state.bridgePlanksTarget=1;playSfx('paper');showToast('The missing planks slide safely into place.');}
  if(ch===2){state.bookFlutter=1;playSfx('paper');showToast('The pages flutter open to the island map.');}
  if(ch===3){state.windmillVelocity+=3.2;playSfx('paper');showToast('The wind catches the sails.');}
  if(ch===4){state.lampSequence=1;state.lampClock=0;state.lampFlash=0;state.boatAnswer=0;playSfx('bell');showToast('Two flashes. Two answers from the sea.');}
}
function screenOf(world){return project(world);}
function hitLandmark(p){
  const targets=[
    [1.6,.37,2.05],
    [2.55,.8,1.65],
    [2.45,.9,2.2],
    [2.45,.33,2.7],
    [4.2,-2.4,.9]
  ];
  const q=screenOf(targets[state.chapter]);
  return Math.hypot(p.x-q.x,p.y-q.y)<Math.max(70,Math.min(145,width*.13));
}
function sailHub(){return screenOf([2.45,.33,2.6]);}
function updateTurn(now){
  if(!state.turnAnim)return;
  const a=state.turnAnim,u=clamp((now-a.start)/a.duration,0,1),e=easeOut(u);
  state.turn=lerp(a.from,a.to,e);
  if(u>=1){
    const commit=a.commit&&a.to===1;
    state.turnAnim=null;
    if(commit)commitTurn();else{state.turn=0;state.turnTarget=undefined;state.turnDir=1;}
  }
}
function update(dt,now){
  state.t+=dt;
  updateTurn(now);
  if(state.popElapsed<1){
    state.popElapsed=Math.min(1,state.popElapsed+dt/0.92);
    const t=state.popElapsed;
    state.popIn=clamp(1-Math.exp(-6.5*t)*Math.cos(10.5*t),0,1.12);
  }else state.popIn=1;
  state.tableYaw=lerp(state.tableYaw,state.tableYawTarget,1-Math.exp(-dt*5));
  state.gateBell*=Math.exp(-dt*2.8);
  state.gateDoor=lerp(state.gateDoor,state.gateDoorTarget,1-Math.exp(-dt*3.1));
  state.bridgePlanks=lerp(state.bridgePlanks,state.bridgePlanksTarget,1-Math.exp(-dt*3.5));
  state.bookFlutter*=Math.exp(-dt*2.2);
  if(state.windmillVelocity!==0){
    state.windmillAngle+=state.windmillVelocity*dt;
    state.windmillVelocity*=Math.exp(-dt*1.25);
    if(Math.abs(state.windmillVelocity)<.035)state.windmillVelocity=0;
  }
  if(state.lampSequence){
    state.lampClock+=dt;const t=state.lampClock;
    state.lampFlash=((t>.08&&t<.38)||(t>1.05&&t<1.35))?1:0;
    state.boatAnswer=((t>.42&&t<.83)||(t>1.39&&t<1.82))?1:0;
    if(t>2.1){state.lampSequence=0;state.lampFlash=0;state.boatAnswer=0;}
  }
}
function isPageArea(x,y){
  return y>height*.36&&y<height*.91&&x>width*.08&&x<width*.92;
}
function onPointerDown(e){
  if(e.target!==canvas)return;
  const p={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,startX:e.clientX,startY:e.clientY,mode:'',moved:false,lastAngle:0,lastTime:performance.now()};
  if(state.chapter===3){
    const hub=sailHub();
    if(Math.hypot(p.x-hub.x,p.y-hub.y)<Math.min(180,width*.24)){
      p.mode='sail';p.lastAngle=Math.atan2(p.y-hub.y,p.x-hub.x);state.sailDrag=true;
    }
  }
  if(!p.mode&&isPageArea(p.x,p.y)){
    p.mode='page';state.turnDir=p.x>width*.5?1:-1;state.turnTarget=state.chapter+state.turnDir;
  }
  if(!p.mode)p.mode='table';
  state.pointer=p;canvas.setPointerCapture?.(e.pointerId);canvas.classList.add('dragging');
}
function onPointerMove(e){
  const p=state.pointer;if(!p)return;
  const dx=e.clientX-p.lastX,dy=e.clientY-p.lastY;
  if(Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>5)p.moved=true;
  if(p.mode==='page'){
    const delta=p.startX>width*.5?(p.startX-e.clientX):(e.clientX-p.startX);
    state.turn=clamp(delta/(width*.42),0,.985);
    state.turnDir=p.startX>width*.5?1:-1;
    state.turnTarget=clamp(state.chapter+state.turnDir,0,4);
  }else if(p.mode==='table'){
    state.tableYaw=clamp(state.tableYaw+dx*.004,-.44,.44);
    state.tableYawTarget=state.tableYaw;
  }else if(p.mode==='sail'){
    const hub=sailHub(),angle=Math.atan2(e.clientY-hub.y,e.clientX-hub.x),now=performance.now(),dt=Math.max(.008,(now-p.lastTime)/1000);
    let diff=angle-p.lastAngle;if(diff>Math.PI)diff-=TAU;if(diff<-Math.PI)diff+=TAU;
    state.windmillAngle+=diff;state.windmillVelocity=diff/dt;
    p.lastAngle=angle;
  }
  p.lastX=e.clientX;p.lastY=e.clientY;p.lastTime=performance.now();
}
function onPointerUp(e){
  const p=state.pointer;if(!p)return;
  const moved=p.moved;
  if(p.mode==='page'){
    if(!moved||Math.abs(p.startX-e.clientX)<9){
      state.turn=0;state.turnTarget=undefined;
      if(hitLandmark({x:e.clientX,y:e.clientY}))triggerProp();
    }else if(state.turnTarget!==undefined&&state.turnTarget>=0&&state.turnTarget<=4)settleTurn();
    else state.turn=0;
  }else if(p.mode==='sail'){
    state.sailDrag=false;
    if(Math.abs(state.windmillVelocity)<.3)state.windmillVelocity=1.2;
  }else if(p.mode==='table'){state.tableYawTarget=0;}
  state.pointer=null;canvas.classList.remove('dragging');
}
canvas.addEventListener('pointerdown',onPointerDown);
canvas.addEventListener('pointermove',onPointerMove);
canvas.addEventListener('pointerup',onPointerUp);
canvas.addEventListener('pointercancel',onPointerUp);
canvas.addEventListener('contextmenu',e=>e.preventDefault());
$('#prev-page').addEventListener('click',()=>startTurn(-1));
$('#next-page').addEventListener('click',()=>startTurn(1));
$('#chapter-dots').addEventListener('click',e=>{const b=e.target.closest('[data-chapter]');if(b)jumpTo(b.dataset.chapter);});
document.querySelectorAll('.map-pin').forEach(b=>b.addEventListener('click',()=>jumpTo(b.dataset.chapter)));
$('#map-open').addEventListener('click',()=>openMap(true));
$('#map-close').addEventListener('click',()=>openMap(false));
$('#map-overlay').addEventListener('click',e=>{if(e.target===$('#map-overlay'))openMap(false);});
$('#read-open').addEventListener('click',()=>openReading(true));
$('#read-close').addEventListener('click',()=>openReading(false));
$('#prop-action').addEventListener('click',triggerProp);
$('#reset-view').addEventListener('click',()=>{state.tableYawTarget=0;state.tableYaw=0;state.windmillVelocity=0;showToast('Back to the reader’s seat.');});
$('#sound-toggle').addEventListener('click',async()=>{
  state.sound=!state.sound;$('#sound-toggle').setAttribute('aria-pressed',String(state.sound));
  $('#sound-label').textContent=state.sound?'Sound on':'Sound off';$('#sound-icon').textContent=state.sound?'♫':'♪';
  if(state.sound){const ac=getAudio();if(ac?.state==='suspended')await ac.resume();playSfx('paper');}
});
let sliderActive=false;
$('#page-slider').addEventListener('pointerdown',()=>{sliderActive=true;state.turnAnim=null;});
$('#page-slider').addEventListener('input',e=>{
  const value=clamp(Number(e.target.value),0,4),base=Math.min(3,Math.floor(value)),fraction=value===4?0:value-base;
  state.chapter=base;state.turnDir=1;state.turnTarget=base+1;state.turn=fraction;state.popIn=1;state.popElapsed=1;updateUI();
  $('#page-slider').value=String(value);
});
$('#page-slider').addEventListener('change',e=>{
  if(!sliderActive)return;sliderActive=false;
  const value=clamp(Number(e.target.value),0,4),base=Math.min(3,Math.floor(value)),fraction=value===4?0:value-base;
  if(value===4){state.chapter=4;state.turn=0;state.turnTarget=undefined;updateUI();setHash(4);}
  else{state.chapter=base;state.turn=fraction;state.turnTarget=base+1;settleTurn();}
});
addEventListener('pointerup',()=>{if(sliderActive){$('#page-slider').dispatchEvent(new Event('change'));}});
addEventListener('keydown',e=>{
  if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();startTurn(1);}
  if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();startTurn(-1);}
  if(e.key==='Escape'){openMap(false);openReading(false);}
});
function syncFromHash(){
  const id=location.hash.replace('#',''),index=slugToIndex[id];
  if(index!==undefined&&index!==state.chapter)jumpTo(index);
}
addEventListener('popstate',syncFromHash);
addEventListener('hashchange',syncFromHash);
if(location.hash&&slugToIndex[location.hash.slice(1)]!==undefined)state.chapter=slugToIndex[location.hash.slice(1)];
updateUI();
function frame(now){
  const dt=Math.min(.04,(now-(state.lastTime||now))/1000||.016);state.lastTime=now;
  update(dt,now);updateCamera();render();requestAnimationFrame(frame);
}
loadAtlas();
if('serviceWorker' in navigator&&location.protocol!=='file:')addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Offline cache registration failed',err)));
requestAnimationFrame(frame);
