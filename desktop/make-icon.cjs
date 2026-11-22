const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const dir = path.join(__dirname, 'assets'); fs.mkdirSync(dir, { recursive: true });
function crc32(buffer) { let crc=0xffffffff;for(const byte of buffer){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return (crc^0xffffffff)>>>0; }
function chunk(type, data) { const name=Buffer.from(type), length=Buffer.alloc(4), crc=Buffer.alloc(4);length.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([length,name,data,crc]); }
const n=256, raw=Buffer.alloc((n*4+1)*n);
for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const i=y*(n*4+1)+1+x*4;let color=[23,28,40,255];
  if((x<18||x>237)&&(y<18||y>237))color=[0,0,0,0];
  const gx=Math.floor((x-48)/32),gy=Math.floor((y-48)/32),inside=x>=48&&x<208&&y>=48&&y<208;
  if(inside&&x%32>=5&&y%32>=5){let lit=['11110','10001','11110','10000','10000'][gy][gx]==='1';color=lit?[181,160,255,255]:[45,52,72,255];}
  if(x>=184&&x<216&&y>=184&&y<216)color=[104,231,196,255];
  raw.set(color,i);
}
const header=Buffer.alloc(13);header.writeUInt32BE(n,0);header.writeUInt32BE(n,4);header[8]=8;header[9]=6;
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
fs.writeFileSync(path.join(dir,'icon.png'),png);
const ico=Buffer.alloc(22);ico.writeUInt16LE(1,2);ico.writeUInt16LE(1,4);ico.writeUInt16LE(1,10);ico.writeUInt16LE(32,12);ico.writeUInt32LE(png.length,14);ico.writeUInt32LE(22,18);fs.writeFileSync(path.join(dir,'icon.ico'),Buffer.concat([ico,png]));
