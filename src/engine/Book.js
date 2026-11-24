import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

function makePaperTexture(seed = 4) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d'); context.fillStyle = '#f3e6c4'; context.fillRect(0, 0, 512, 512);
  let value = seed >>> 0; const random = () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
  for (let i = 0; i < 14500; i++) { const alpha = random() * .055; context.fillStyle = random() > .5 ? `rgba(118,91,52,${alpha})` : `rgba(255,255,244,${alpha})`; const size = random() > .94 ? 2 : 1; context.fillRect(random() * 512, random() * 512, size, size); }
  for (let i = 0; i < 140; i++) { context.strokeStyle = `rgba(122,98,61,${random() * .035})`; context.lineWidth = .5; context.beginPath(); const x = random() * 512, y = random() * 512; context.moveTo(x,y); context.lineTo(x + random()*18,y + random()*2 - 1); context.stroke(); }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(2,2); return texture;
}
function makeMapTexture(region, plate, side='right') {
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=768;const c=canvas.getContext('2d');c.fillStyle='#f3e6c4';c.fillRect(0,0,1024,768);
  c.strokeStyle='rgba(128,103,65,.27)';c.lineWidth=3;c.strokeRect(27,27,970,714);c.strokeStyle='rgba(128,103,65,.14)';c.lineWidth=1;c.strokeRect(38,38,948,692);
  const blobs=side==='right'?[[140,155,205,118,'#c5cf9a'],[395,120,210,150,'#b7c5a0'],[665,175,210,135,'#d5c28c'],[270,410,220,125,'#a9bd9c'],[630,450,260,145,'#c8c99a']]:[[150,220,240,150,'#d0c89c'],[470,160,225,145,'#b8c6a1'],[740,310,185,140,'#c8cfaa'],[330,505,245,115,'#c9bb8e']];
  blobs.forEach(([x,y,w,h,color],i)=>{c.save();c.translate(x,y);c.rotate((i%2?-1:1)*.035);c.fillStyle=color;c.beginPath();c.roundRect(-w/2,-h/2,w,h,[28,42,36,31]);c.fill();c.strokeStyle='rgba(116,111,75,.16)';c.lineWidth=2;c.stroke();c.restore();});
  c.save();c.strokeStyle='#a85b43';c.lineWidth=5;c.setLineDash([10,13]);c.lineCap='round';c.beginPath();c.moveTo(65,555);c.bezierCurveTo(220,445,320,590,470,440);c.bezierCurveTo(610,300,710,500,940,285);c.stroke();c.restore();
  c.fillStyle='#7a6749';c.font='italic 38px Georgia,serif';c.fillText(region.toUpperCase(),side==='right'?490:70,665);c.fillStyle='#8d7650';c.font='700 17px Arial,sans-serif';c.fillText(plate,840,700);c.font='italic 17px Georgia,serif';c.fillText('N  ✦  E',865,82);
  for(let i=0;i<13000;i++){c.fillStyle=Math.random()>.5?'rgba(116,91,55,.035)':'rgba(255,255,244,.08)';c.fillRect(Math.random()*1024,Math.random()*768,1.4,1.4);}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture;
}
function createPageGeometry(width,depth,segmentsX=48,segmentsZ=32,direction=1){
  const positions=[],uvs=[],indices=[];
  for(let iz=0;iz<=segmentsZ;iz++){const v=iz/segmentsZ;for(let ix=0;ix<=segmentsX;ix++){const u=ix/segmentsX;positions.push(direction*u*width,.105,(v-.5)*depth);uvs.push(u,1-v);}}
  for(let iz=0;iz<segmentsZ;iz++)for(let ix=0;ix<segmentsX;ix++){const a=iz*(segmentsX+1)+ix,b=a+1,d=a+segmentsX+1,cc=d+1;if(direction>0)indices.push(a,d,b,b,d,cc);else indices.push(a,b,d,b,cc,d);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.userData={width,depth,segmentsX,segmentsZ,direction};return geometry;
}
export class Book {
  constructor(scene){this.group=new THREE.Group();this.group.name='storybook-book';scene.add(this.group);this.pageWidth=6.55;this.pageDepth=8.05;this.turnProgress=0;this.turnDirection=1;this.turning=false;this.paperTexture=makePaperTexture(19);this.currentMap=makeMapTexture('Lantern Valley','PLATE 01','right');this.nextMap=makeMapTexture('Ribbon River','PLATE 02','left');this.#buildCover();this.#buildStaticPages();this.#buildTurningPage();this.#buildRibbon();}
  #buildCover(){
    const cover=new THREE.Mesh(new RoundedBoxGeometry(13.72,.34,8.55,5,.16),new THREE.MeshStandardMaterial({color:'#783d32',roughness:.88,metalness:.02}));cover.position.set(0,-.26,0);cover.castShadow=true;cover.receiveShadow=true;this.group.add(cover);
    const block=new THREE.Mesh(new RoundedBoxGeometry(13.38,.22,8.24,4,.12),new THREE.MeshStandardMaterial({map:this.paperTexture,color:'#f4e7c8',roughness:1}));block.position.set(0,-.035,0);block.castShadow=true;block.receiveShadow=true;this.group.add(block);
    const spine=new THREE.Mesh(new RoundedBoxGeometry(.38,.3,8.4,4,.14),new THREE.MeshStandardMaterial({color:'#5f332c',roughness:.92}));spine.position.set(0,-.17,0);this.group.add(spine);
    for(let i=0;i<8;i++){const line=new THREE.Mesh(new THREE.BoxGeometry(.018,.012,7.98),new THREE.MeshStandardMaterial({color:i%2?'#d0bf9e':'#fff0d0',roughness:1}));line.position.set(6.57-i*.012,.085-i*.018,0);this.group.add(line);}
  }
  #buildStaticPages(){
    const mat=new THREE.MeshStandardMaterial({map:this.currentMap,roughness:.96,metalness:0,side:THREE.DoubleSide});
    const left=new THREE.Mesh(new THREE.PlaneGeometry(this.pageWidth,this.pageDepth),mat);left.rotation.x=-Math.PI/2;left.position.set(-this.pageWidth/2,.105,0);left.castShadow=false;left.receiveShadow=true;this.group.add(left);this.leftPage=left;
    const right=new THREE.Mesh(new THREE.PlaneGeometry(this.pageWidth,this.pageDepth),mat.clone());right.rotation.x=-Math.PI/2;right.position.set(this.pageWidth/2,.105,0);right.castShadow=false;right.receiveShadow=true;this.group.add(right);this.rightPage=right;
    const crease=new THREE.Mesh(new THREE.BoxGeometry(.055,.012,8.02),new THREE.MeshStandardMaterial({color:'#b7a17d',roughness:1}));crease.position.set(0,.11,0);this.group.add(crease);
    const borderMat=new THREE.LineBasicMaterial({color:'#a78c62',transparent:true,opacity:.38});for(const side of [-1,1]){const points=[new THREE.Vector3(side*6.35,.116,-3.9),new THREE.Vector3(side*.2,.116,-3.9),new THREE.Vector3(side*.2,.116,3.9),new THREE.Vector3(side*6.35,.116,3.9)];this.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),borderMat));}
  }
  #buildTurningPage(){
    const geometry=createPageGeometry(this.pageWidth,this.pageDepth,56,36,1);const front=new THREE.MeshStandardMaterial({map:this.currentMap,roughness:.96,side:THREE.FrontSide});const back=new THREE.MeshStandardMaterial({map:this.nextMap,roughness:.96,side:THREE.BackSide});
    this.turnFront=new THREE.Mesh(geometry,front);this.turnBack=new THREE.Mesh(geometry,back);this.turnFront.castShadow=this.turnBack.castShadow=true;this.turnFront.receiveShadow=this.turnBack.receiveShadow=true;this.turnFront.visible=this.turnBack.visible=false;this.turnFront.renderOrder=this.turnBack.renderOrder=3;this.group.add(this.turnFront,this.turnBack);
  }
  #buildRibbon(){const shape=new THREE.Shape();shape.moveTo(-.13,.24);shape.lineTo(.13,.24);shape.lineTo(.18,-.58);shape.lineTo(.04,-.45);shape.lineTo(0,-.64);shape.lineTo(-.04,-.45);shape.lineTo(-.18,-.58);shape.closePath();const ribbon=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({color:'#b84d3d',roughness:.8,side:THREE.DoubleSide}));ribbon.position.set(.03,-.01,4.06);ribbon.rotation.x=-.12;ribbon.castShadow=true;this.group.add(ribbon);}
  setTurn(progress,direction=1){
    this.turnProgress=THREE.MathUtils.clamp(progress,0,1);this.turnDirection=direction;this.turning=this.turnProgress>.001;this.turnFront.visible=this.turnBack.visible=this.turning;
    if(!this.turning){this.rightPage.visible=this.leftPage.visible=true;return;}if(direction>0)this.rightPage.visible=false;else this.leftPage.visible=false;
    const geometry=this.turnFront.geometry,positions=geometry.attributes.position,{width,depth,segmentsX,segmentsZ}=geometry.userData,angle=this.turnProgress*Math.PI,s=Math.sin(angle),c=Math.cos(angle);
    for(let iz=0;iz<=segmentsZ;iz++){const v=iz/segmentsZ;for(let ix=0;ix<=segmentsX;ix++){const u=ix/segmentsX,index=iz*(segmentsX+1)+ix,x=u*width,bend=Math.sin(Math.PI*u)*Math.sin(Math.PI*this.turnProgress),curl=bend*.26*Math.cos((v-.5)*Math.PI),lift=s*x*.78+curl,xWorld=(direction>0?1:-1)*x*c,z=(v-.5)*depth+bend*.11*Math.sin(v*Math.PI*2);positions.setXYZ(index,xWorld,.105+lift,z);}}
    positions.needsUpdate=true;geometry.computeVertexNormals();this.turnBack.material.map=direction>0?this.nextMap:this.currentMap;this.turnBack.material.needsUpdate=true;
  }
  settleTurn(){this.setTurn(0,this.turnDirection);}reset(){this.setTurn(0,1);this.group.rotation.y=0;}
  dispose(){this.group.traverse(o=>{if(!o.isMesh)return;o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();});this.paperTexture.dispose();this.currentMap.dispose();this.nextMap.dispose();}
}
