'use strict';
const $ = id => document.getElementById(id), C = PixelCore;
const canvas=$('canvas'),ctx=canvas.getContext('2d'),pv=$('preview'),pc=pv.getContext('2d'),stage=$('stage');
const DEFAULT_PALETTE=['#ffffff','#bac2d4','#6f7893','#30364b','#161b29','#ef626c','#f49c6b','#f4ce6b','#9cd77c','#5bc6aa','#60bce4','#7089e9','#a78bfa','#d88bdf','#f3a7be','#805e45'];
let size=32,frames=[Array(1024).fill(null)],current=0,tool='pencil',color='#a78bfa',brush=1;
let palette=[...DEFAULT_PALETTE],savedPalettes={},paletteName='Padrão',grid=true,selection=null,clipboard=null;
let view={scale:8,x:0,y:0},playing=false,playIndex=0,timer=null,gesture=null,spaceDown=false,spaceUsed=false;
let undo=[],redo=[],saveTimer=null,preferencesTimer=null,observer=null,dragDepth=0,restoring=true;
const thumbnails=new Map(),ZOOMS=[.25,.5,1,2,3,4,6,8,12,16,24,32,48,64];
function toast(message){$('toast').textContent=message;$('toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').style.display='none',3300);}
function data(){return{format:'pixel-studio',version:2,name:$('projectName').value.trim()||'Sem título',size,frames,current,fps:+$('fps').value,palette:[...palette]};}
function persistNow(){clearTimeout(saveTimer);try{localStorage.setItem('pixel-studio',JSON.stringify(data()));$('saved').textContent='Salvo neste computador';}catch{$('saved').textContent='Salve uma cópia .pxp';}}
function persist(){if(restoring)return;$('saved').textContent='Salvando…';clearTimeout(saveTimer);saveTimer=setTimeout(persistNow,400);}
function preferences(){clearTimeout(preferencesTimer);preferencesTimer=setTimeout(()=>{try{localStorage.setItem('pixel-studio-preferences',JSON.stringify({grid,onion:$('onion').checked,onionNext:$('onionNext').checked,onionTint:$('onionTint').checked,onionRange:$('onionRange').value,opacity:$('opacity').value,loop:$('loop').checked,brush,mirrorX:$('mirrorX').checked,mirrorY:$('mirrorY').checked}));}catch{}},200);}
function snapshot(){return JSON.stringify(data());}
function pushUndo(before){if(before===snapshot())return;undo.push(before);redo=[];let total=0;undo=undo.reverse().filter((entry,index)=>{total+=entry.length*2;return index<40&&total<=32*1024*1024;}).reverse();updateControls();}
function commit(before){pushUndo(before);invalidate(current);render();persist();}
function change(fn){cancelGesture();stop();const before=snapshot();fn();commit(before);}
function load(project,{resetView=true}={}){
  C.validate(project);let nextPalette=project.palette===undefined?null:C.palette(project.palette);
  cancelGesture();stop(false);size=project.size;frames=project.frames.map(frame=>frame.map(pixel=>pixel===null?null:pixel.toLowerCase()));current=Math.max(0,Math.min(frames.length-1,Math.trunc(project.current)||0));
  $('projectName').value=typeof project.name==='string'?project.name.slice(0,80):'Sem título';$('fps').value=Math.round(project.fps||8);$('size').value=String(size);selection=null;
  if(nextPalette){palette=nextPalette;renderPalette();}thumbnails.clear();canvas.width=canvas.height=pv.width=pv.height=size;
  $('dimensions').textContent=`${size} × ${size}`;if(resetView)fitCanvas();render();persist();
}
function history(from,to){if(!from.length)return;cancelGesture();stop();const entry=from.pop();to.push(snapshot());load(JSON.parse(entry),{resetView:false});updateControls();}
function paint(context,frame,alpha=1,tint=null){context.globalAlpha=alpha;for(let i=0;i<frame.length;i++)if(frame[i]){context.fillStyle=tint||frame[i];context.fillRect(i%size,Math.floor(i/size),1,1);}context.globalAlpha=1;}
function displayedIndex(){return playing?playIndex:current;}
function renderCanvas(){
  ctx.clearRect(0,0,size,size);const index=displayedIndex();
  if(!playing&&$('onion').checked){const alpha=+$('opacity').value/100,tinted=$('onionTint').checked;for(let distance=+$('onionRange').value;distance>=1;distance--)if(current-distance>=0)paint(ctx,frames[current-distance],alpha/distance,tinted?'#b098ff':null);if($('onionNext').checked&&current+1<frames.length)paint(ctx,frames[current+1],alpha,tinted?'#70e4bd':null);}
  paint(ctx,frames[index]);
  if(grid&&!playing&&view.scale>=4){ctx.beginPath();ctx.lineWidth=.04;ctx.strokeStyle='#adb7d235';for(let n=1;n<size;n++){ctx.moveTo(n,0);ctx.lineTo(n,size);ctx.moveTo(0,n);ctx.lineTo(size,n);}ctx.stroke();}
  pc.clearRect(0,0,size,size);paint(pc,frames[index]);$('activeFrame').textContent=`Frame ${index+1} / ${frames.length}`;
  $('playBadge').hidden=!playing;drawSelection();
}
function drawSelection(){const overlay=$('selection');overlay.hidden=!selection||playing;if(selection){overlay.style.left=selection.x/size*100+'%';overlay.style.top=selection.y/size*100+'%';overlay.style.width=selection.w/size*100+'%';overlay.style.height=selection.h/size*100+'%';}}
function invalidate(index){thumbnails.delete(index);}
function paintThumbnail(index,element){const context=element.getContext('2d');context.clearRect(0,0,size,size);paint(context,frames[index]);thumbnails.set(index,{frame:frames[index],canvas:element});}
function renderFrames(){
  const list=$('frames'),previousScroll=list.scrollLeft;observer?.disconnect();list.replaceChildren();
  if(typeof IntersectionObserver==='function')observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting&&entry.target.isConnected){const button=entry.target,index=+button.dataset.index;if(index<frames.length)paintThumbnail(index,button.querySelector('canvas'));observer?.unobserve(button);}},{root:list,rootMargin:'150px'});
  frames.forEach((frame,index)=>{const button=document.createElement('button');button.className='frame'+(index===current?' active':'');button.dataset.index=String(index);button.setAttribute('aria-label',`Selecionar frame ${index+1}`);button.setAttribute('aria-pressed',String(index===current));button.draggable=true;
    const cached=thumbnails.get(index),reused=cached&&cached.frame===frame,thumb=reused?cached.canvas:document.createElement('canvas');if(!reused)thumb.width=thumb.height=size;const number=document.createElement('span');number.textContent=String(index+1).padStart(2,'0');button.append(thumb,number);list.append(button);
    if(!reused){if(observer)observer.observe(button);else if(index<12||index===current)paintThumbnail(index,thumb);}
    button.onclick=()=>{cancelGesture();stop(false);current=index;selection=null;renderCanvas();updateFrameHighlight();persist();};
    button.ondragstart=event=>{event.dataTransfer.setData('application/x-pixel-frame',String(index));event.dataTransfer.effectAllowed='move';};
    button.ondragover=event=>{if([...event.dataTransfer.types].includes('application/x-pixel-frame')){event.preventDefault();button.classList.add('drag-target');}};
    button.ondragleave=()=>button.classList.remove('drag-target');
    button.ondrop=event=>{button.classList.remove('drag-target');const value=event.dataTransfer.getData('application/x-pixel-frame');if(!/^\d+$/.test(value))return;event.preventDefault();event.stopPropagation();reorderFrame(+value,index);};
  });list.scrollLeft=previousScroll;updateFrameHighlight();
}
function updateFrameHighlight(){for(const button of $('frames').children){const index=+button.dataset.index;button.classList.toggle('active',index===current);button.classList.toggle('playing',playing&&index===playIndex);button.setAttribute('aria-pressed',String(index===current));}updateControls();}
function updateControls(){$('count').textContent=String(frames.length).padStart(2,'0');$('duration').textContent=(frames.length/+$('fps').value).toFixed(2)+' s';$('delete').disabled=frames.length===1;$('moveLeft').disabled=current===0;$('moveRight').disabled=current===frames.length-1;$('undo').disabled=!undo.length;$('redo').disabled=!redo.length;$('pastePixels').disabled=!clipboard;}
function render(){renderCanvas();renderFrames();updateControls();}
function stageCenter(){const r=stage.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};}
function applyView(){const wrapper=$('canvaswrap');const edge=size*view.scale;canvas.style.width=canvas.style.height=edge+'px';wrapper.style.width=wrapper.style.height=edge+'px';wrapper.style.transform=`translate(-50%, -50%) translate(${view.x}px, ${view.y}px)`;$('zoomLabel').textContent=Math.round(view.scale*100)+'%';renderCanvas();}
function fitCanvas(){const r=stage.getBoundingClientRect(),scale=Math.max(.25,Math.min(32,Math.floor(Math.min((r.width-90)/size,(r.height-85)/size))||1));view={scale,x:0,y:0};applyView();}
function zoomTo(scale,point=stageCenter()){view=C.zoomAt(view,Math.max(.25,Math.min(64,scale)),point,stageCenter());applyView();}
function stepZoom(direction,point){const next=direction>0?ZOOMS.find(n=>n>view.scale+.001):[...ZOOMS].reverse().find(n=>n<view.scale-.001);if(next)zoomTo(next,point);}
function point(event,clamp=true){const r=canvas.getBoundingClientRect(),p=[Math.floor((event.clientX-r.left)/r.width*size),Math.floor((event.clientY-r.top)/r.height*size)];return clamp?p.map(n=>Math.min(size-1,Math.max(0,n))):p;}
function inside(p){return p.every(n=>n>=0&&n<size);}
function put(target,x,y,paintColor=color){C.plot(target,size,x,y,paintColor,brush,$('mirrorX').checked,$('mirrorY').checked);}
function constrained(start,end,kind){let[x,y]=end,dx=x-start[0],dy=y-start[1];if(kind==='line'){if(Math.abs(dx)>Math.abs(dy)*2)y=start[1];else if(Math.abs(dy)>Math.abs(dx)*2)x=start[0];else{const distance=Math.max(Math.abs(dx),Math.abs(dy));x=start[0]+Math.sign(dx)*distance;y=start[1]+Math.sign(dy)*distance;}}else{const distance=Math.max(Math.abs(dx),Math.abs(dy));x=start[0]+(dx<0?-distance:distance);y=start[1]+(dy<0?-distance:distance);}return[x,y];}
function pick(p){const pixel=frames[current][p[1]*size+p[0]];if(pixel)setColor(pixel);}
function startGesture(event){
  if(event.button!==0&&event.button!==1&&event.button!==2)return;
  if(gesture)return;
  const p=point(event,false),pan=event.button===1||tool==='hand'||(spaceDown&&event.button===0);
  if(!pan&&!inside(p))return;
  event.preventDefault();stage.focus({preventScroll:true});stage.setPointerCapture(event.pointerId);
  if(pan){gesture={kind:'pan',client:[event.clientX,event.clientY],view:{...view}};stage.style.cursor='grabbing';return;}
  if(playing)stop();
  if(event.altKey||tool==='pick'){pick(p);return;}
  const usedTool=event.button===2?'eraser':tool;
  if(usedTool==='fill'){const before=snapshot();C.fill(frames[current],size,...p,color);commit(before);return;}
  if(usedTool==='select'){selection=C.selection(p,p);gesture={kind:'select',start:p};drawSelection();return;}
  gesture={kind:usedTool,start:p,last:p,before:snapshot(),source:[...frames[current]],region:selection?{...selection}:null};
  if(usedTool==='pencil'||usedTool==='eraser'){put(frames[current],...p,usedTool==='eraser'?null:color);renderCanvas();}
}
function moveGesture(event){
  const p=point(event);$('coords').textContent=`X ${p[0]} · Y ${p[1]} · ${toolNames[tool]}`;
  if(!gesture)return;event.preventDefault();const g=gesture;
  if(g.kind==='pan'){const dx=event.clientX-g.client[0],dy=event.clientY-g.client[1];if(Math.abs(dx)+Math.abs(dy)>2)spaceUsed=true;view={...g.view,x:g.view.x+dx,y:g.view.y+dy};applyView();return;}
  if(g.kind==='select'){selection=C.selection(g.start,p);drawSelection();return;}
  if(g.kind==='move'){const dx=p[0]-g.start[0],dy=p[1]-g.start[1];frames[current]=C.move(g.source,size,g.region,dx,dy,event.ctrlKey||event.metaKey);if(g.region){const left=g.region.x+dx,top=g.region.y+dy,x=Math.max(0,left),y=Math.max(0,top),w=Math.min(size,left+g.region.w)-x,h=Math.min(size,top+g.region.h)-y;selection=w>0&&h>0?{x,y,w,h}:null;}renderCanvas();return;}
  if(['line','rect','rectFilled','ellipse','ellipseFilled'].includes(g.kind)||event.shiftKey){frames[current]=[...g.source];const kind=['pencil','eraser'].includes(g.kind)?'line':g.kind,end=event.shiftKey?constrained(g.start,p,kind):p;C.shape(kind,g.start,end,(x,y)=>put(frames[current],x,y,g.kind==='eraser'?null:color));}
  else C.line(g.last,p,(x,y)=>put(frames[current],x,y,g.kind==='eraser'?null:color));
  g.last=p;renderCanvas();
}
function finishGesture(event){if(!gesture)return;if(event)moveGesture(event);const finished=gesture;gesture=null;stage.style.cursor='';if(finished.before)commit(finished.before);else drawSelection();}
function cancelGesture(){if(!gesture)return;if(gesture.source)frames[current]=gesture.source;if(gesture.kind==='move')selection=gesture.region;gesture=null;stage.style.cursor='';renderCanvas();}
const toolNames={pencil:'Lápis',eraser:'Borracha',line:'Linha',rect:'Retângulo',rectFilled:'Retângulo preenchido',ellipse:'Elipse',ellipseFilled:'Elipse preenchida',fill:'Preencher',pick:'Conta-gotas',select:'Seleção',move:'Mover pixels',hand:'Navegar'};
const toolIcons={pencil:'<path d="m4 16 12-12 4 4L8 20H4v-4Z"/><path d="m14 6 4 4"/>',eraser:'<path d="m3 14 10-10 8 8-9 9H9l-6-7Z"/><path d="m8 9 8 8M12 21h9"/>',line:'<path d="m4 20 16-16"/><rect x="2" y="18" width="4" height="4"/><rect x="18" y="2" width="4" height="4"/>',rect:'<rect x="4" y="5" width="16" height="14"/>',rectFilled:'<rect x="4" y="5" width="16" height="14" fill="currentColor" opacity=".65"/>',ellipse:'<ellipse cx="12" cy="12" rx="9" ry="7"/>',ellipseFilled:'<ellipse cx="12" cy="12" rx="9" ry="7" fill="currentColor" opacity=".65"/>',fill:'<path d="m12 3 8 8-9 9-8-8 9-9ZM3 12h17M7 2l8 8M21 15v5"/>',pick:'<path d="m4 20 3-7L17 3l4 4-10 10-7 3ZM13 5l6 6"/>',select:'<path stroke-dasharray="3 3" d="M4 4h16v16H4Z"/>',move:'<path d="M12 2v20M2 12h20m-10-10-3 3m3-3 3 3m7 7-3-3m3 3-3 3M12 22l-3-3m3 3 3-3M2 12l3-3m-3 3 3 3"/>',hand:'<path d="M7 12V6a2 2 0 0 1 4 0v6-8a2 2 0 0 1 4 0v8-6a2 2 0 0 1 4 0v7-3a2 2 0 0 1 4 0v6c0 5-3 7-8 7-3 0-5-1-7-4l-4-6a2 2 0 0 1 3-2l3 3" transform="translate(-1 -1) scale(.92)"/>'};
const toolKeys={b:'pencil',e:'eraser',l:'line',r:'rect',u:'rectFilled',o:'ellipse',q:'ellipseFilled',g:'fill',i:'pick',v:'select',m:'move',h:'hand'};
function setTool(next){cancelGesture();tool=next;for(const button of $('tools').children)button.classList.toggle('active',button.dataset.tool===tool);$('toolHelp').textContent=`${toolNames[tool]} · ${Object.keys(toolKeys).find(key=>toolKeys[key]===tool).toUpperCase()}`;canvas.style.cursor=tool==='hand'?'grab':tool==='move'?'move':tool==='pick'?'crosshair':'crosshair';}
for(const [id,label] of Object.entries(toolNames)){const button=document.createElement('button');button.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true">${toolIcons[id]}</svg>`;button.dataset.tool=id;const key=Object.keys(toolKeys).find(key=>toolKeys[key]===id);button.title=`${label} (${key.toUpperCase()})`;button.setAttribute('aria-label',button.title);button.onclick=()=>setTool(id);$('tools').append(button);}
function setColor(next){if(!C.validColor(next))return;color=next.toLowerCase();$('color').value=color;$('hex').value=color;for(const button of $('palette').children)button.classList.toggle('selected',button.dataset.color===color);}
function renderPalette(){const box=$('palette');box.replaceChildren();for(const swatch of palette){const button=document.createElement('button');button.dataset.color=swatch;button.style.background=swatch;button.title=swatch;button.setAttribute('aria-label',`Usar cor ${swatch}`);button.classList.toggle('selected',swatch===color);button.onclick=()=>setColor(swatch);button.oncontextmenu=event=>{event.preventDefault();if(palette.length===1)return;palette=palette.filter(c=>c!==swatch);renderPalette();persist();};box.append(button);}}
function renderPaletteOptions(){const select=$('paletteSelect');select.replaceChildren();for(const name of ['Padrão',...Object.keys(savedPalettes).sort()]){const option=document.createElement('option');option.value=option.textContent=name;select.append(option);}select.value=Object.hasOwn(savedPalettes,paletteName)?paletteName:'Padrão';}
function storePalettes(){try{localStorage.setItem('pixel-studio-palettes-v1',JSON.stringify({palettes:savedPalettes,selected:paletteName}));return true;}catch{toast('Não foi possível guardar a paleta. Exporte uma cópia.');return false;}}
function savePalette(){let name=$('paletteName').value.trim().slice(0,48);if(!name||name==='Padrão'){toast('Dê um nome à sua paleta.');$('paletteName').focus();return;}if(!Object.hasOwn(savedPalettes,name)&&Object.keys(savedPalettes).length>=64){toast('Limite de 64 paletas salvas.');return;}savedPalettes={...savedPalettes,[name]:[...palette]};paletteName=name;if(storePalettes()){renderPaletteOptions();toast('Paleta salva neste computador.');}}
function importPalette(project){if(!project||project.format!=='pixel-studio-palette')throw Error('Escolha um arquivo de paleta Pixel Studio.');palette=C.palette(project.colors);$('paletteName').value=String(project.name||'Paleta importada').slice(0,48);renderPalette();persist();toast('Paleta carregada. Clique em Salvar para guardá-la.');}
function stop(atPlayhead=true){if(playing&&atPlayhead)current=playIndex;playing=false;clearInterval(timer);timer=null;$('play').textContent='▶ Reproduzir';renderCanvas();updateFrameHighlight();}
function advancePlayback(){if(playIndex===frames.length-1&&!$('loop').checked){stop();persist();return;}playIndex=(playIndex+1)%frames.length;renderCanvas();updateFrameHighlight();}
function play(){if(playing){stop();persist();return;}cancelGesture();playing=true;playIndex=current;$('play').textContent='Ⅱ Pausar';renderCanvas();updateFrameHighlight();timer=setInterval(advancePlayback,1000/+$('fps').value);}
function reorderFrame(from,to){if(!Number.isInteger(from)||from<0||from>=frames.length||to<0||to>=frames.length||from===to)return;change(()=>{const frame=frames.splice(from,1)[0];frames.splice(to,0,frame);current=to;thumbnails.clear();});}
function transformFrame(kind){change(()=>{const source=frames[current],target=Array(size*size).fill(null);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const nx=kind==='x'?size-1-x:kind==='rotate'?size-1-y:x,ny=kind==='y'?size-1-y:kind==='rotate'?x:y;target[ny*size+nx]=source[y*size+x];}frames[current]=target;selection=null;});}
function copyPixels(cut=false){const r=selection||{x:0,y:0,w:size,h:size};clipboard={w:r.w,h:r.h,pixels:[]};for(let y=0;y<r.h;y++)for(let x=0;x<r.w;x++)clipboard.pixels.push(frames[current][(r.y+y)*size+r.x+x]);if(cut)eraseSelection();updateControls();toast(cut?'Pixels recortados.':'Pixels copiados.');}
function eraseSelection(){change(()=>{const r=selection||{x:0,y:0,w:size,h:size};for(let y=0;y<r.h;y++)for(let x=0;x<r.w;x++)if(r.x+x<size&&r.y+y<size)frames[current][(r.y+y)*size+r.x+x]=null;});}
function pastePixels(){if(!clipboard)return;change(()=>{const start=selection||{x:Math.floor((size-Math.min(size,clipboard.w))/2),y:Math.floor((size-Math.min(size,clipboard.h))/2)};for(let y=0;y<clipboard.h;y++)for(let x=0;x<clipboard.w;x++)if(start.x+x<size&&start.y+y<size)frames[current][(start.y+y)*size+start.x+x]=clipboard.pixels[y*clipboard.w+x];selection={x:start.x,y:start.y,w:Math.min(size-start.x,clipboard.w),h:Math.min(size-start.y,clipboard.h)};});setTool('move');}
function download(blob,name){const anchor=document.createElement('a'),url=URL.createObjectURL(blob);anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function exportPng(sheet){const scale=+$('exportScale').value,width=size*(sheet?frames.length:1)*scale,height=size*scale;if(width>32767||width*height>64*1024*1024){toast('Exportação muito grande. Reduza a escala.');return;}const output=document.createElement('canvas');output.width=width;output.height=height;const context=output.getContext('2d');context.imageSmoothingEnabled=false;(sheet?frames:[frames[current]]).forEach((frame,index)=>{frame.forEach((pixel,i)=>{if(pixel){context.fillStyle=pixel;context.fillRect((index*size+i%size)*scale,Math.floor(i/size)*scale,scale,scale);}});});output.toBlob(blob=>{if(blob){download(blob,sheet?'pixel-studio-spritesheet.png':`pixel-studio-frame-${current+1}.png`);toast('PNG preparado para salvar.');}else toast('Não foi possível gerar o PNG.');});}
async function openText(text,name){const project=JSON.parse(text);C.validate(project);if(project.palette!==undefined)C.palette(project.palette);if(!project.name)project.name=String(name).replace(/\.(pxp|json)$/i,'');const before=snapshot();load(project);pushUndo(before);toast('Projeto aberto.');}
async function openFile(file){if(!file)return;try{if(!/\.(pxp|json)$/i.test(file.name))throw Error('Solte um projeto .pxp ou .json.');if(file.size>100*1024*1024)throw Error('Projeto maior que 100 MB.');await openText(await file.text(),file.name);}catch(error){toast(error.message||'Não foi possível abrir o projeto.');}}
async function handleDrop(event){if(!event.dataTransfer?.files?.length)return;event.preventDefault();dragDepth=0;$('dropOverlay').hidden=true;await openFile(event.dataTransfer.files[0]);}

stage.addEventListener('pointerdown',startGesture);stage.addEventListener('pointermove',moveGesture);stage.addEventListener('pointerup',finishGesture);stage.addEventListener('pointercancel',cancelGesture);stage.addEventListener('lostpointercapture',()=>{if(gesture)cancelGesture();});stage.addEventListener('contextmenu',event=>event.preventDefault());
document.addEventListener('wheel',event=>{if(event.ctrlKey||event.metaKey){event.preventDefault();if(event.deltaY)stepZoom(event.deltaY<0?1:-1,stage.contains(event.target)?{x:event.clientX,y:event.clientY}:stageCenter());}else if(stage.contains(event.target)){event.preventDefault();view.x-=event.shiftKey?event.deltaY:event.deltaX;view.y-=event.shiftKey?0:event.deltaY;applyView();}},{passive:false});
document.addEventListener('dragenter',event=>{if([...event.dataTransfer.types].includes('Files')){event.preventDefault();dragDepth++;$('dropOverlay').hidden=false;}});
document.addEventListener('dragover',event=>{if([...event.dataTransfer.types].includes('Files')){event.preventDefault();event.dataTransfer.dropEffect='copy';}});
document.addEventListener('dragleave',event=>{if([...event.dataTransfer.types].includes('Files')){dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)$('dropOverlay').hidden=true;}});document.addEventListener('drop',handleDrop);
$('color').oninput=event=>setColor(event.target.value);$('hex').onchange=event=>{let value=event.target.value;if(!value.startsWith('#'))value='#'+value;if(C.validColor(value))setColor(value);else{event.target.value=color;toast('Use uma cor no formato #RRGGBB.');}};
$('brush').oninput=event=>{brush=+event.target.value;$('brushLabel').textContent=brush+' px';preferences();};
$('paletteSelect').onchange=event=>{paletteName=event.target.value;palette=Object.hasOwn(savedPalettes,paletteName)?[...savedPalettes[paletteName]]:[...DEFAULT_PALETTE];$('paletteName').value=paletteName==='Padrão'?'':paletteName;renderPalette();storePalettes();persist();};
$('addColor').onclick=()=>{if(!palette.includes(color)){if(palette.length>=256){toast('Limite de 256 cores por paleta.');return;}palette.push(color);renderPalette();persist();}};$('savePalette').onclick=savePalette;
$('exportPalette').onclick=()=>download(new Blob([JSON.stringify({format:'pixel-studio-palette',version:1,name:$('paletteName').value.trim()||paletteName,colors:palette},null,2)],{type:'application/json'}),'pixel-studio.palette.json');
$('importPalette').onclick=()=>$('paletteFile').click();$('paletteFile').onchange=async event=>{const file=event.target.files[0];if(file)try{if(file.size>1024*1024)throw Error('Arquivo de paleta muito grande.');importPalette(JSON.parse(await file.text()));}catch(error){toast(error.message);}event.target.value='';};
$('extractPalette').onclick=()=>{const found=[...new Set(frames[current].filter(Boolean))];if(!found.length){toast('O frame está vazio.');return;}if(found.length>256){toast('Este frame tem mais de 256 cores.');return;}palette=found;$('paletteName').value=$('projectName').value.slice(0,48);renderPalette();persist();toast('Cores do frame carregadas na paleta.');};
$('undo').onclick=()=>history(undo,redo);$('redo').onclick=()=>history(redo,undo);$('play').onclick=play;
$('prev').onclick=()=>{cancelGesture();stop(false);current=(current+frames.length-1)%frames.length;selection=null;renderCanvas();updateFrameHighlight();persist();};$('next').onclick=()=>{cancelGesture();stop(false);current=(current+1)%frames.length;selection=null;renderCanvas();updateFrameHighlight();persist();};
$('add').onclick=()=>{if(frames.length>=500){toast('Limite de 500 frames.');return;}change(()=>{frames.splice(current+1,0,Array(size*size).fill(null));current++;selection=null;});$('frames').children[current]?.scrollIntoView({block:'nearest',inline:'nearest'});};
$('duplicate').onclick=()=>{if(frames.length>=500){toast('Limite de 500 frames.');return;}change(()=>{frames.splice(current+1,0,[...frames[current]]);current++;});};$('delete').onclick=()=>{if(frames.length>1)change(()=>{frames.splice(current,1);current=Math.min(current,frames.length-1);selection=null;});};
$('moveLeft').onclick=()=>reorderFrame(current,current-1);$('moveRight').onclick=()=>reorderFrame(current,current+1);
$('fps').onchange=()=>{const wasPlaying=playing;stop();$('fps').value=Math.min(60,Math.max(1,Math.round(+$('fps').value)||8));updateControls();persist();if(wasPlaying)play();};
for(const id of ['onion','onionNext','onionTint','onionRange','opacity','loop','mirrorX','mirrorY'])$(id).onchange=()=>{preferences();renderCanvas();};$('opacity').oninput=()=>{$('opacityLabel').textContent=$('opacity').value+'%';renderCanvas();preferences();};
$('grid').onclick=()=>{grid=!grid;$('grid').classList.toggle('active',grid);$('grid').setAttribute('aria-pressed',String(grid));renderCanvas();preferences();};$('fit').onclick=fitCanvas;$('zoomIn').onclick=()=>stepZoom(1);$('zoomOut').onclick=()=>stepZoom(-1);$('zoomReset').onclick=()=>zoomTo(1);
$('copyPixels').onclick=()=>copyPixels();$('cutPixels').onclick=()=>copyPixels(true);$('pastePixels').onclick=pastePixels;$('deselect').onclick=()=>{selection=null;drawSelection();};
$('flipX').onclick=()=>transformFrame('x');$('flipY').onclick=()=>transformFrame('y');$('rotate').onclick=()=>transformFrame('rotate');$('clear').onclick=()=>change(()=>frames[current].fill(null));
$('size').onchange=()=>{const next=+$('size').value;if(next===size)return;if(!confirm('Alterar o canvas mantém os pixels na posição original e recorta o que não couber. Continuar?')){$('size').value=String(size);return;}change(()=>{const old=size;frames=frames.map(frame=>{const target=Array(next*next).fill(null);for(let y=0;y<Math.min(old,next);y++)for(let x=0;x<Math.min(old,next);x++)target[y*next+x]=frame[y*old+x];return target;});size=next;canvas.width=canvas.height=pv.width=pv.height=size;$('dimensions').textContent=`${size} × ${size}`;selection=null;fitCanvas();});};
$('export').onclick=()=>exportPng(false);$('sheet').onclick=()=>exportPng(true);$('save').onclick=()=>{cancelGesture();download(new Blob([JSON.stringify(data())],{type:'application/x-pixel-studio-project'}),C.filename($('projectName').value));toast('Projeto .pxp preparado para salvar.');};
$('open').onclick=async()=>{if(window.pixelDesktop){try{const file=await window.pixelDesktop.openProject();if(file)await openText(file.text,file.name);}catch(error){toast(error.message||'Não foi possível abrir.');}}else $('file').click();};$('file').onchange=async event=>{await openFile(event.target.files[0]);event.target.value='';};
$('newProject').onclick=()=>{if(!confirm('Criar um novo projeto? Salve uma cópia .pxp para manter o atual. É possível desfazer esta ação.'))return;const before=snapshot();load({format:'pixel-studio',version:2,name:'Sem título',size:32,frames:[Array(1024).fill(null)],current:0,fps:8});pushUndo(before);};$('projectName').onchange=persist;
for(const button of document.querySelectorAll('[data-tab]'))button.onclick=()=>{for(const tab of document.querySelectorAll('[data-tab]'))tab.classList.toggle('active',tab===button);for(const panel of document.querySelectorAll('[data-panel]'))panel.hidden=panel.dataset.panel!==button.dataset.tab;};
function keyboard(event){if(/INPUT|SELECT|TEXTAREA/.test(event.target.tagName)||event.target.isContentEditable)return;const key=event.key.toLowerCase(),command=event.ctrlKey||event.metaKey;
  if(command){const actions={z:()=>event.shiftKey?history(redo,undo):history(undo,redo),y:()=>history(redo,undo),s:()=>$('save').click(),o:()=>$('open').click(),n:()=>(event.shiftKey?$('add'):$('newProject')).click(),d:()=>$('duplicate').click(),c:()=>copyPixels(),x:()=>copyPixels(true),v:pastePixels,a:()=>{selection={x:0,y:0,w:size,h:size};drawSelection();},g:()=>$('grid').click(),'+':()=>stepZoom(1),'=':()=>stepZoom(1),'-':()=>stepZoom(-1)};if(actions[key]){event.preventDefault();actions[key]();}return;}
  if(event.code==='Space'){event.preventDefault();if(!event.repeat){spaceDown=true;spaceUsed=false;}return;}if(key==='escape'){event.preventDefault();cancelGesture();stop();selection=null;drawSelection();return;}if(key==='delete'||key==='backspace'){event.preventDefault();eraseSelection();return;}if(toolKeys[key])setTool(toolKeys[key]);if(key==='f')fitCanvas();if(key==='1')zoomTo(1);if(key==='arrowleft'){event.preventDefault();$('prev').click();}if(key==='arrowright'){event.preventDefault();$('next').click();}
}
document.addEventListener('keydown',keyboard);document.addEventListener('keyup',event=>{if(event.code==='Space'&&spaceDown){event.preventDefault();spaceDown=false;if(!spaceUsed)play();}});
window.addEventListener('blur',()=>{spaceDown=false;spaceUsed=true;cancelGesture();persistNow();});window.addEventListener('beforeunload',persistNow);
function restore(){
  try{const saved=JSON.parse(localStorage.getItem('pixel-studio-palettes-v1')||'null');if(saved&&saved.palettes&&typeof saved.palettes==='object'){for(const [name,colors]of Object.entries(saved.palettes).slice(0,64)){try{savedPalettes={...savedPalettes,[name.slice(0,48)]:C.palette(colors)};}catch{}}if(Object.hasOwn(savedPalettes,saved.selected)){paletteName=saved.selected;palette=[...savedPalettes[paletteName]];}}}catch{}
  renderPaletteOptions();renderPalette();
  try{const p=JSON.parse(localStorage.getItem('pixel-studio-preferences')||'null');if(p){for(const id of ['onion','onionNext','onionTint','loop','mirrorX','mirrorY'])if(typeof p[id]==='boolean')$(id).checked=p[id];if(Number(p.onionRange)>=1&&Number(p.onionRange)<=3)$('onionRange').value=String(p.onionRange);if(Number(p.opacity)>=5&&Number(p.opacity)<=80)$('opacity').value=String(p.opacity);if(typeof p.grid==='boolean')grid=p.grid;brush=Math.max(1,Math.min(16,Math.round(Number(p.brush)||1)));$('brush').value=String(brush);$('brushLabel').textContent=brush+' px';$('opacityLabel').textContent=$('opacity').value+'%';}}catch{}
  $('grid').classList.toggle('active',grid);$('grid').setAttribute('aria-pressed',String(grid));
  try{const saved=localStorage.getItem('pixel-studio');if(saved)load(JSON.parse(saved));}catch{toast('O salvamento automático não pôde ser aberto. Use sua cópia .pxp.');}
  restoring=false;renderCanvas();updateControls();window.pixelDesktop?.ready?.();
}
setTool('pencil');renderPaletteOptions();renderPalette();render();fitCanvas();
requestAnimationFrame(()=>requestAnimationFrame(restore));
