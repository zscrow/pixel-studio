const $=id=>document.getElementById(id), canvas=$('canvas'),ctx=canvas.getContext('2d'),pv=$('preview'),pc=pv.getContext('2d');
let size=32,frames=[Array(1024).fill(null)],current=0,tool='pencil',color='#a78bfa',brush=1,zoom=1,grid=true,playing=false,playIndex=0,timer=null,drawing=false,last=null,undo=[],redo=[];
const palette=['#ffffff','#a6a7b5','#555568','#20212c','#121319','#ef626c','#f49c6b','#f4ce6b','#9cd77c','#5bc6aa','#60bce4','#7089e9','#a78bfa','#d88bdf','#f3a7be','#754f7b','#805e45','#ce9669'];
function toast(s){$('toast').textContent=s;$('toast').style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>$('toast').style.display='none',2400)}
function data(){return{format:'pixel-studio',version:2,name:$('projectName').value.trim()||'Sem título',size,frames,current,fps:+$('fps').value}}
function persist(){try{localStorage.setItem('pixel-studio',JSON.stringify(data()));$('saved').textContent=window.pixelDesktop?'Salvo neste computador':'Salvo neste navegador'}catch{$('saved').textContent='Use Salvar projeto para guardar seu trabalho'}}
function snapshot(){undo.push(JSON.stringify(data()));if(undo.length>60)undo.shift();redo=[]}
function load(d){if(!d||![16,32,64,128].includes(d.size)||!Array.isArray(d.frames)||!d.frames.length||d.frames.length>500||d.frames.some(f=>!Array.isArray(f)||f.length!==d.size*d.size||f.some(c=>c!==null&&!/^#[0-9a-f]{6}$/i.test(c))))throw Error('Projeto inválido');stop();$('projectName').value=typeof d.name==='string'?d.name.slice(0,80):'Sem título';size=d.size;frames=d.frames;current=Math.min(Math.max(0,d.current|0),frames.length-1);$('fps').value=Math.min(60,Math.max(1,d.fps||8));$('size').value=size;resize();render();persist()}
function resize(){canvas.width=canvas.height=pv.width=pv.height=size;$('dimensions').textContent=`${size} × ${size} px`;applyZoom()}
function paint(context,f,alpha=1){context.globalAlpha=alpha;for(let i=0;i<f.length;i++)if(f[i]){context.fillStyle=f[i];context.fillRect(i%size,Math.floor(i/size),1,1)}context.globalAlpha=1}
function renderCanvas(){ctx.clearRect(0,0,size,size);if($('onion').checked&&current>0)paint(ctx,frames[current-1],+$('opacity').value/100);paint(ctx,frames[current]);if(grid){ctx.strokeStyle='#9293ad30';ctx.lineWidth=.035;ctx.beginPath();for(let i=1;i<size;i++){ctx.moveTo(i,0);ctx.lineTo(i,size);ctx.moveTo(0,i);ctx.lineTo(size,i)}ctx.stroke()}preview()}
function preview(){pc.clearRect(0,0,size,size);paint(pc,frames[playing?playIndex:current]||frames[current])}
function render(){renderCanvas();$('frames').replaceChildren();frames.forEach((f,i)=>{let b=document.createElement('button');b.setAttribute('aria-label',`Frame ${i+1}`);b.setAttribute('aria-pressed',String(i===current));b.className='frame'+(i===current?' active':'');b.title=`Selecionar frame ${i+1}`;let c=document.createElement('canvas');c.width=c.height=size;paint(c.getContext('2d'),f);let s=document.createElement('span');s.textContent=String(i+1).padStart(2,'0');b.append(c,s);b.onclick=()=>{stop();current=i;render();persist()};$('frames').append(b)});$('count').textContent=String(frames.length).padStart(2,'0');$('duration').textContent=(frames.length/+$('fps').value).toFixed(2)+' s';$('delete').disabled=frames.length===1;$('undo').disabled=!undo.length;$('redo').disabled=!redo.length}
function setTool(t){tool=t;document.querySelectorAll('#tools button').forEach(b=>b.classList.toggle('active',b.dataset.tool===t))}
[['pencil','✎','Lápis','B'],['eraser','▱','Borracha','E'],['fill','◈','Preencher','G'],['pick','⌖','Conta-gotas','I']].forEach(([id,icon,name,key])=>{let b=document.createElement('button');b.dataset.tool=id;b.innerHTML=`<span>${icon}</span>${name}`;b.title=`${name} (${key})`;b.onclick=()=>setTool(id);$('tools').append(b)});setTool('pencil');
function setColor(c){color=c;$('color').value=c;$('hex').textContent=c.toUpperCase()}
palette.forEach(c=>{let b=document.createElement('button');b.style.background=c;b.title=c;b.setAttribute('aria-label','Selecionar cor '+c);b.onclick=()=>setColor(c);$('palette').append(b)});
$('color').oninput=e=>setColor(e.target.value);$('brush').oninput=e=>{brush=+e.target.value;$('brushLabel').textContent=brush+' px'};
function point(e){let r=canvas.getBoundingClientRect();return[Math.min(size-1,Math.max(0,Math.floor((e.clientX-r.left)/r.width*size))),Math.min(size-1,Math.max(0,Math.floor((e.clientY-r.top)/r.height*size)))]}
function dot(x,y){for(let j=0;j<brush;j++)for(let i=0;i<brush;i++){let a=x+i-Math.floor((brush-1)/2),b=y+j-Math.floor((brush-1)/2);if(a>=0&&b>=0&&a<size&&b<size)frames[current][b*size+a]=tool==='eraser'?null:color}}
function line(a,b){let[x,y]=a,[tx,ty]=b,dx=Math.abs(tx-x),dy=-Math.abs(ty-y),sx=x<tx?1:-1,sy=y<ty?1:-1,err=dx+dy;for(;;){dot(x,y);if(x===tx&&y===ty)break;let e=2*err;if(e>=dy){err+=dy;x+=sx}if(e<=dx){err+=dx;y+=sy}}}
function fill(x,y){let f=frames[current],old=f[y*size+x];if(old===color)return;let q=[y*size+x];f[q[0]]=color;while(q.length){let i=q.pop(),xx=i%size,yy=Math.floor(i/size);for(let n of [xx>0?i-1:-1,xx<size-1?i+1:-1,yy>0?i-size:-1,yy<size-1?i+size:-1])if(n>=0&&f[n]===old){f[n]=color;q.push(n)}}}
canvas.onpointerdown=e=>{if(e.button!==0)return;stop();let p=point(e);if(tool==='pick'){let c=frames[current][p[1]*size+p[0]];if(c)setColor(c);return}snapshot();canvas.setPointerCapture(e.pointerId);drawing=true;last=p;if(tool==='fill')fill(...p);else dot(...p);renderCanvas();e.preventDefault()};
canvas.onpointermove=e=>{let p=point(e);$('coords').textContent=`X: ${p[0]}   Y: ${p[1]}`;if(drawing&&tool!=='fill'){line(last,p);last=p;renderCanvas()}};
function end(){if(drawing){drawing=false;last=null;render();persist()}}canvas.onpointerup=end;canvas.onpointercancel=end;
function history(from,to){if(!from.length)return;to.push(JSON.stringify(data()));load(JSON.parse(from.pop()));render()}
$('undo').onclick=()=>history(undo,redo);$('redo').onclick=()=>history(redo,undo);
$('add').onclick=()=>{stop();snapshot();if(frames.length>=500){toast('Limite de 500 frames atingido');return}frames.splice(current+1,0,Array(size*size).fill(null));current++;render();persist();$('frames').lastElementChild?.scrollIntoView({block:'nearest',inline:'nearest'})};
$('duplicate').onclick=()=>{stop();snapshot();if(frames.length>=500){toast('Limite de 500 frames atingido');return}frames.splice(current+1,0,[...frames[current]]);current++;render();persist()};
$('delete').onclick=()=>{if(frames.length<2)return;stop();snapshot();frames.splice(current,1);current=Math.min(current,frames.length-1);render();persist()};
$('clear').onclick=()=>{snapshot();frames[current].fill(null);render();persist()};
function stop(){playing=false;clearInterval(timer);$('play').textContent='▶ Reproduzir';preview()}
function play(){if(playing){stop();return}playing=true;playIndex=current;$('play').textContent='Ⅱ Pausar';preview();timer=setInterval(()=>{playIndex=(playIndex+1)%frames.length;preview()},1000/+$('fps').value)}
$('play').onclick=play;$('prev').onclick=()=>{stop();current=(current+frames.length-1)%frames.length;render();persist()};$('next').onclick=()=>{stop();current=(current+1)%frames.length;render();persist()};
$('fps').onchange=()=>{let running=playing;stop();$('fps').value=Math.min(60,Math.max(1,Math.round(+$('fps').value||8)));if(running)play();render();persist()};
$('onion').onchange=renderCanvas;$('opacity').oninput=()=>{$('opacityLabel').textContent=$('opacity').value+'%';renderCanvas()};$('grid').onclick=()=>{grid=!grid;$('grid').classList.toggle('active',grid);renderCanvas()};
function applyZoom(){let base=window.innerWidth<760?256:384;canvas.style.width=canvas.style.height=base*zoom+'px';$('zoomLabel').textContent=Math.round(zoom*100)+'%'}$('zoomIn').onclick=()=>{zoom=Math.min(4,zoom+.25);applyZoom()};$('zoomOut').onclick=()=>{zoom=Math.max(.5,zoom-.25);applyZoom()};
$('size').onchange=()=>{let n=+$('size').value;if(!confirm('Alterar o tamanho recorta ou amplia a área de todos os frames. Continuar?')){$('size').value=size;return}stop();snapshot();frames=frames.map(f=>{let a=Array(n*n).fill(null);for(let y=0;y<Math.min(n,size);y++)for(let x=0;x<Math.min(n,size);x++)a[y*n+x]=f[y*size+x];return a});size=n;resize();render();persist()};
function download(blob,name){let a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}
function exportPng(sheet){let c=document.createElement('canvas');c.width=size*(sheet?frames.length:1);c.height=size;let context=c.getContext('2d');(sheet?frames:[frames[current]]).forEach((f,i)=>{context.save();context.translate(i*size,0);paint(context,f);context.restore()});const scale=+$('exportScale').value,output=document.createElement('canvas');output.width=c.width*scale;output.height=c.height*scale;if(output.width>32767||output.width*output.height>67108864){toast('Spritesheet muito grande. Reduza a escala de exportação.');return}const out=output.getContext('2d');out.imageSmoothingEnabled=false;out.drawImage(c,0,0,output.width,output.height);output.toBlob(b=>{if(b){download(b,sheet?'pixel-studio-spritesheet.png':`pixel-studio-frame-${current+1}.png`);toast('PNG exportado com fundo transparente')}})}
$('export').onclick=()=>exportPng(false);$('sheet').onclick=()=>exportPng(true);$('save').onclick=()=>{download(new Blob([JSON.stringify(data())],{type:'application/json'}),'pixel-studio.json');toast('Projeto salvo com todos os frames')};$('open').onclick=()=>$('file').click();$('file').onchange=async e=>{let f=e.target.files[0];if(!f)return;try{let d=JSON.parse(await f.text());snapshot();load(d);render();if(!d.name)$('projectName').value=f.name.replace(/\.json$/i,'');persist();toast('Projeto aberto')}catch{toast('Não foi possível abrir. Escolha um projeto Pixel Studio válido.')}e.target.value=''};
document.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.ctrlKey||e.metaKey){if(e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?history(redo,undo):history(undo,redo)}if(e.key.toLowerCase()==='y'){e.preventDefault();history(redo,undo)}if(e.key.toLowerCase()==='s'){e.preventDefault();$('save').click()}return}let t={b:'pencil',e:'eraser',g:'fill',i:'pick'}[e.key.toLowerCase()];if(t)setTool(t);if(e.code==='Space'){e.preventDefault();play()}});
try{let saved=localStorage.getItem('pixel-studio');if(saved)load(JSON.parse(saved))}catch{toast('Começando um novo projeto')}
resize();render();

$('projectName').onchange=persist;
function transformFrame(kind){stop();snapshot();const source=frames[current];frames[current]=Array(size*size).fill(null);for(let y=0;y<size;y++)for(let x=0;x<size;x++){let nx=kind==='x'?size-1-x:kind==='rotate'?size-1-y:x,ny=kind==='y'?size-1-y:kind==='rotate'?x:y;frames[current][ny*size+nx]=source[y*size+x]}render();persist()}
$('flipX').onclick=()=>transformFrame('x');$('flipY').onclick=()=>transformFrame('y');$('rotate').onclick=()=>transformFrame('rotate');
function moveFrame(direction){let next=current+direction;if(next<0||next>=frames.length)return;stop();snapshot();[frames[current],frames[next]]=[frames[next],frames[current]];current=next;render();persist()}
$('moveLeft').onclick=()=>moveFrame(-1);$('moveRight').onclick=()=>moveFrame(1);
$('newProject').onclick=()=>{if(!confirm('Criar um novo projeto? Salve o atual para manter uma cópia. Você também pode desfazer essa ação.'))return;snapshot();load({size:32,frames:[Array(1024).fill(null)],current:0,fps:8,name:'Sem título'});render()};
document.querySelectorAll('button').forEach(b=>{if(!b.getAttribute('aria-label')&&!b.title)b.setAttribute('aria-label',b.textContent.trim())});

if(window.pixelDesktop){
  $('open').onclick=async()=>{
    try{
      const project=await window.pixelDesktop.openProject();
      if(!project)return;
      const value=JSON.parse(project.text);
      snapshot();load(value);
      if(!value.name)$('projectName').value=project.name;
      render();persist();toast('Projeto aberto');
    }catch{toast('Não foi possível abrir. Escolha um projeto Pixel Studio válido.');}
  };
}
