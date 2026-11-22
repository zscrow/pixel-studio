(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PixelCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const validColor = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
  function validate(project) {
    if (!project || ![16,32,64,128].includes(project.size) || !Array.isArray(project.frames) || !project.frames.length || project.frames.length > 500) throw Error('Projeto inválido: tamanho ou frames incorretos.');
    if (project.format && project.format !== 'pixel-studio') throw Error('Este arquivo não é um projeto Pixel Studio.');
    if (project.version !== undefined && ![1,2].includes(project.version)) throw Error('Versão de projeto não suportada.');
    if (project.frames.some(frame => !Array.isArray(frame) || frame.length !== project.size ** 2 || frame.some(pixel => pixel !== null && !validColor(pixel)))) throw Error('Projeto inválido: dados de pixels incorretos.');
    if (project.fps !== undefined && (!Number.isFinite(project.fps) || project.fps < 1 || project.fps > 60)) throw Error('FPS inválido no projeto.');
    return project;
  }
  function plot(frame, size, x, y, color, brush = 1, mirrorX = false, mirrorY = false) {
    const offset = Math.floor((brush - 1) / 2);
    for (let j = 0; j < brush; j++) for (let i = 0; i < brush; i++) {
      const px = x + i - offset, py = y + j - offset;
      if (px < 0 || py < 0 || px >= size || py >= size) continue;
      frame[py * size + px] = color;
      if (mirrorX) frame[py * size + size - 1 - px] = color;
      if (mirrorY) frame[(size - 1 - py) * size + px] = color;
      if (mirrorX && mirrorY) frame[(size - 1 - py) * size + size - 1 - px] = color;
    }
  }
  function line(a, b, put) {
    let [x,y] = a; const [tx,ty] = b, dx = Math.abs(tx-x), dy = -Math.abs(ty-y), sx = x < tx ? 1 : -1, sy = y < ty ? 1 : -1;
    let error = dx + dy;
    for (;;) { put(x,y); if (x === tx && y === ty) break; const twice = error * 2; if (twice >= dy) { error += dy; x += sx; } if (twice <= dx) { error += dx; y += sy; } }
  }
  function shape(kind, a, b, put) {
    if (kind === 'line') { line(a,b,put); return; }
    const x0 = Math.min(a[0],b[0]), x1 = Math.max(a[0],b[0]), y0 = Math.min(a[1],b[1]), y1 = Math.max(a[1],b[1]);
    const filled = kind.endsWith('Filled');
    if (kind.startsWith('rect')) {
      for (let y=y0;y<=y1;y++) for (let x=x0;x<=x1;x++) if (filled || x===x0 || x===x1 || y===y0 || y===y1) put(x,y);
      return;
    }
    if (x0===x1 || y0===y1) { line(a,b,put); return; }
    const cx=(x0+x1)/2, cy=(y0+y1)/2, rx=(x1-x0+1)/2, ry=(y1-y0+1)/2;
    const inside=(x,y)=>((x-cx)/rx)**2+((y-cy)/ry)**2<=1;
    for (let y=y0;y<=y1;y++) for (let x=x0;x<=x1;x++) if (inside(x,y) && (filled || !inside(x-1,y) || !inside(x+1,y) || !inside(x,y-1) || !inside(x,y+1))) put(x,y);
  }
  function fill(frame,size,x,y,color) {
    const start=y*size+x, previous=frame[start]; if(previous===color)return;
    const queue=[start]; frame[start]=color;
    while(queue.length){const i=queue.pop(),px=i%size,py=Math.floor(i/size);for(const n of [px>0?i-1:-1,px<size-1?i+1:-1,py>0?i-size:-1,py<size-1?i+size:-1])if(n>=0&&frame[n]===previous){frame[n]=color;queue.push(n);}}
  }
  function selection(a,b){return {x:Math.min(a[0],b[0]),y:Math.min(a[1],b[1]),w:Math.abs(a[0]-b[0])+1,h:Math.abs(a[1]-b[1])+1};}
  function move(source,size,region,dx,dy,copy=false){
    const r=region||{x:0,y:0,w:size,h:size},target=[...source];
    if(!copy)for(let y=0;y<r.h;y++)for(let x=0;x<r.w;x++)target[(r.y+y)*size+r.x+x]=null;
    for(let y=0;y<r.h;y++)for(let x=0;x<r.w;x++){const nx=r.x+x+dx,ny=r.y+y+dy;if(nx>=0&&ny>=0&&nx<size&&ny<size)target[ny*size+nx]=source[(r.y+y)*size+r.x+x];}
    return target;
  }
  function palette(value){
    if(!Array.isArray(value)||!value.length||value.length>256||value.some(c=>!validColor(c)))throw Error('A paleta deve ter de 1 a 256 cores hexadecimais.');
    return [...new Set(value.map(c=>c.toLowerCase()))];
  }
  function zoomAt(view,next,point,center){const ratio=next/view.scale;return {scale:next,x:point.x-center.x-(point.x-center.x-view.x)*ratio,y:point.y-center.y-(point.y-center.y-view.y)*ratio};}
  function filename(name){let result=(String(name).trim()||'Sem título').replace(/\.(pxp|json)$/i,'').replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').replace(/[. ]+$/g,'').slice(0,100).replace(/[. ]+$/g,'');if(!result)result='Sem título';if(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(result))result='Projeto '+result;return result+'.pxp';}
  return {validColor,validate,plot,line,shape,fill,selection,move,palette,zoomAt,filename};
});
