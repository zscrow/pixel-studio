const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const elements=new Map(),draws=[];
function element(id=''){return {id,value:({fps:'8',size:'32',brush:'1',opacity:'30',projectName:'Teste',exportScale:'1'})[id]||'',checked:id==='onion',style:{},dataset:{},children:[],classList:{toggle(){}},getContext(){return {clearRect(){},fillRect(...a){draws.push({alpha:this.globalAlpha,color:this.fillStyle,a})},beginPath(){},moveTo(){},lineTo(){},stroke(){},save(){},restore(){},translate(){},drawImage(){}}},append(...v){this.children.push(...v)},replaceChildren(){this.children=[]},setAttribute(){},getAttribute(){},scrollIntoView(){},click(){},getBoundingClientRect(){return {left:0,top:0,width:384,height:384}},setPointerCapture(){}}}
const sandbox={console,document:{getElementById(id){if(!elements.has(id))elements.set(id,element(id));return elements.get(id)},createElement:()=>element(),querySelectorAll:()=>[],addEventListener(){}},window:{innerWidth:1200},localStorage:{getItem(){return null},setItem(){}},setTimeout(){},clearTimeout(){},setInterval(){return 1},clearInterval(){},confirm:()=>true,Blob,URL};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/app.js','utf8'),sandbox);const run=code=>vm.runInContext(code,sandbox);
run("setColor('#ff0000');dot(2,3)");assert.equal(run('frames[0][98]'),'#ff0000');
run("$('duplicate').onclick();dot(4,5)");assert.equal(run('frames.length'),2);assert.equal(run('frames[0][164]'),null);assert.equal(run('frames[1][98]'),'#ff0000');
run("$('undo').onclick()");assert.equal(run('frames.length'),1);run("$('redo').onclick()");assert.equal(run('frames.length'),2);
run("frames[current].fill(null);frames[current][0]='#00ff00';transformFrame('x')");assert.equal(run('frames[current][31]'),'#00ff00');run("transformFrame('rotate')");assert.equal(run('frames[current][1023]'),'#00ff00');
run('moveFrame(-1)');assert.equal(run('current'),0);assert.equal(run('frames[0][1023]'),'#00ff00');
run("current=1;frames[0].fill(null);frames[0][0]='#ff0000';frames[1].fill(null)");draws.length=0;run('renderCanvas()');assert.ok(draws.some(d=>d.color==='#ff0000'&&d.alpha===.3));
run("frames=[Array(1024).fill(null)];current=0;setColor('#abcdef');fill(0,0)");assert.equal(run("frames[0].filter(c=>c==='#abcdef').length"),1024);
assert.throws(()=>run('load({size:32,frames:[[null]]})'));
run("$('projectName').value='Meu sprite'");assert.equal(run('data().name'),'Meu sprite');
console.log('OK: desenho, duplicação independente, histórico, transformações, reordenação, onion skin, preenchimento e validação de projetos.');
