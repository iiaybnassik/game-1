import './style.css';
import {jsPDF} from 'jspdf';
import {geometry,unitMm} from './geometry.js';
import {openPdf, renderPdfPage} from './pdf-import.js';
const app=document.querySelector('#app');
app.innerHTML=`<header><a class="brand" href="."><span class="brand-icon">▦</span> poster<span>club</span></a><span class="header-note">BIG IDEAS. MADE TOGETHER.</span><span class="privacy">◉ &nbsp; Private by design</span></header>
<main><div class="intro"><div class="eyebrow">THE CLASSROOM CREATIVE TOOLKIT</div><h1>One poster. <em>Many hands.</em></h1><p>Turn any image into a shared classroom masterpiece.</p></div><div class="workspace"><aside><div class="section-heading"><span class="step">01</span><h2>Your poster</h2></div><label class="upload" id="drop"><span class="upload-icon">↥</span><strong>Drop your poster here</strong><span>or <u>browse files</u></span><small>PNG, JPG or PDF · up to 30 MB</small><input id="file" type="file" accept="image/png,image/jpeg,application/pdf,.png,.jpg,.jpeg,.pdf"></label><div id="file-info" class="file-info" hidden></div><label id="pdf-page-field" class="field-label" hidden>Poster page<select id="pdf-page" aria-label="PDF poster page"></select><small class="hint">Choose one PDF page to split into student pieces.</small></label>
<div class="section-heading"><span class="step">02</span><h2>Make it a team effort</h2></div><label class="field-label">Final poster size<select id="size-mode"><option value="grid">From grid size</option><option value="custom">Custom dimensions</option></select></label><div id="poster-size-fields" hidden><div class="pair"><label>Width<input id="poster-width" type="number" min="0.1" step="any" value="57"></label><label>Height<input id="poster-height" type="number" min="0.1" step="any" value="83.1"></label></div><label class="field-label">Units<select id="size-unit"><option value="cm">cm</option><option value="mm">mm</option><option value="inch">inch</option></select></label><p class="hint">Final assembled size. The grid adjusts automatically to fit your printing paper.</p><p id="size-error" role="alert" hidden></p></div><div id="grid-settings"><label class="field-label">Grid size <span>ROWS × COLUMNS</span></label><div class="presets">${['2×2','3×3','4×4','5×5','5×6','6×6'].map(v=>`<button data-grid="${v}" class="${v==='3×3'?'active':''}">${v}</button>`).join('')}<button data-grid="custom">Custom</button></div><div class="custom" hidden><label>Rows<input id="rows" type="number" min="1" max="20" value="3"></label><span>×</span><label>Columns<input id="cols" type="number" min="1" max="20" value="3"></label></div>
</div><div class="section-heading"><span class="step">03</span><h2>Print your way</h2></div><div class="pair"><label>Paper size<select id="paper"><option value="a4">A4</option><option value="letter">US Letter</option></select></label><label>Orientation<select id="orientation"><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label></div><label class="field-label">Image placement</label><div class="segments"><button data-mode="fit" class="active">▣ &nbsp; Fit image</button><button data-mode="fill">▧ &nbsp; Fill poster</button></div><p class="hint" id="mode-hint">Keep the whole image. Some white space may remain.</p><div class="pair overlap-row"><label>Page overlap<select id="overlap"><option value="0">0 mm · None</option><option value="5">5 mm</option><option value="6">6 mm</option><option value="10">10 mm</option></select></label><label class="toggle-label">Cut marks<input id="marks" type="checkbox" checked><span class="switch"></span></label></div><div class="export-wrap"><button id="export" disabled>↓ &nbsp; Export print-ready PDF</button><p>Reference + assembly guide + all student pieces</p><div id="status" role="status" aria-live="polite"></div></div></aside>
<section class="preview-panel"><div class="preview-toolbar"><div><span class="live-dot"></span><strong>Live poster preview</strong></div><span id="preview-tag">3 × 3 GRID</span></div><div class="canvas-area"><div id="empty"><div class="empty-grid">▦</div><h3>Your big idea starts here</h3><p>Upload a poster to see every piece fall into place.</p><button id="try-example">Try an example poster ↗</button></div><div id="poster" hidden><canvas id="preview"></canvas></div></div><div class="preview-footer"><span>▦ &nbsp; Each labeled piece becomes one student page</span><span>Print at 100% scale</span></div><div class="stats"><div><span>STUDENT PAGES</span><strong id="pages">9 <small>pieces</small></strong></div><div><span>ASSEMBLED POSTER</span><strong id="dimensions">57 × 83.1 <small>cm</small></strong></div><div><span>MADE FOR</span><strong>Teamwork <span class="spark">✳</span></strong></div></div><div class="tip"><span>✦</span><p><strong>A little piece. A big contribution.</strong><br>Give each student a section, then bring everyone’s work together.</p></div></section></div><footer>Designed for shared creativity. &nbsp; No accounts. No uploads to a server.</footer></main>`;
const $=s=>document.querySelector(s);const state={rows:3,cols:3,paper:'a4',orientation:'portrait',overlap:0,mode:'fit',posterSize:null};let img=null, exporting=false, loading=false, pdfSource=null, sourceName='', selectedPage=1;let sizeError=false;
function getGeometry(){return geometry(state,img?.naturalWidth||1,img?.naturalHeight||1);}
function paint(ctx,g,x=0,y=0,w=g.width,h=g.height,pixels=1){ctx.setTransform(pixels,0,0,pixels,-x*pixels,-y*pixels);ctx.fillStyle='white';ctx.fillRect(x,y,w,h);ctx.drawImage(img,g.image.x,g.image.y,g.image.w,g.image.h);}
function update(){let g;try{g=getGeometry();}catch(error){sizeError=true;$('#size-error').hidden=false;$('#size-error').textContent=error.message;$('#export').disabled=true;return;}sizeError=false;$('#size-error').hidden=true;$('#pages').innerHTML=`${g.tiles.length} <small>pieces</small>`;$('#dimensions').innerHTML=`${(g.width/10).toFixed(1)} × ${(g.height/10).toFixed(1)} <small>cm</small>`;$('#preview-tag').textContent=`${g.rows} × ${g.cols} GRID`;if(!img)return;
$('#empty').hidden=true;$('#poster').hidden=false;const cv=$('#preview'),p=Math.min(1400/g.width,1400/g.height);cv.width=Math.round(g.width*p);cv.height=Math.round(g.height*p);const ctx=cv.getContext('2d');paint(ctx,g,0,0,g.width,g.height,p);
ctx.strokeStyle='#000';ctx.lineWidth=1.2/p;ctx.setLineDash([]);for(const t of g.tiles){ctx.strokeRect(t.x,t.y,t.w,t.h);ctx.fillStyle='rgba(255,255,255,.9)';ctx.fillRect(t.x+5/p,t.y+5/p,32/p,22/p);ctx.fillStyle='#236b56';ctx.font=`bold ${13/p}px sans-serif`;ctx.fillText(t.label,t.x+10/p,t.y+21/p);}
$('#export').disabled=exporting||loading||sizeError;}
function setLoading(value) {
 loading=value;
 $('#file').disabled=value;
 $('#pdf-page').disabled=value;
 $('#export').disabled=value||exporting||!img||sizeError;
}
function showSourceInfo() {
 $('#file-info').hidden=false;
 $('#file-info').textContent=`✓ ${sourceName}${pdfSource?` · Page ${selectedPage} of ${pdfSource.numPages}`:''} · ${img.naturalWidth} × ${img.naturalHeight}`;
}
async function loadFile(file){
 if(!file||loading||exporting)return;
 const isPdf=file.type==='application/pdf'||/\.pdf$/i.test(file.name);
 if((!isPdf&&!['image/png','image/jpeg'].includes(file.type))||file.size>30*1024*1024){$('#status').textContent='Choose a PNG, JPG or PDF under 30 MB.';return;}
 setLoading(true);$('#status').textContent=isPdf?'Opening PDF page 1…':'Opening image…';
 let document=null,url=null;
 try {
  let next;
  if(isPdf){document=await openPdf(file);next=await renderPdfPage(document,1);}
  else{url=URL.createObjectURL(file);next=new Image();next.src=url;await next.decode();}
  const previous=pdfSource;
  pdfSource=document;img=next;sourceName=file.name;selectedPage=1;
  $('#pdf-page').replaceChildren();
  if(document)for(let i=1;i<=document.numPages;i++)$('#pdf-page').add(new Option(`Page ${i} of ${document.numPages}`,String(i)));
  $('#pdf-page-field').hidden=!document||document.numPages<2;
  showSourceInfo();$('#status').textContent='';update();
  if(previous)await previous.destroy();
 }catch(error){
  if(document&&document!==pdfSource)await document.destroy();
  $('#status').textContent=error.name==='PasswordException'?'This PDF is password-protected. Save an unlocked copy and upload it.':'This file could not be opened. Try another PNG, JPG or PDF.';
 }finally{if(url)URL.revokeObjectURL(url);setLoading(false);}
}
$('#pdf-page').onchange=async e=>{
 if(!pdfSource||loading||exporting){e.target.value=String(selectedPage);return;}
 const number=Number(e.target.value);setLoading(true);$('#status').textContent=`Opening PDF page ${number}…`;
 try{img=await renderPdfPage(pdfSource,number);selectedPage=number;showSourceInfo();$('#status').textContent='';update();}
 catch{e.target.value=String(selectedPage);$('#status').textContent='This PDF page could not be opened. Choose another page.';}
 finally{setLoading(false);}
};
$('#file').onchange=e=>loadFile(e.target.files[0]);$('#drop').ondragover=e=>{e.preventDefault();$('#drop').classList.add('drag');};$('#drop').ondragleave=()=>$('#drop').classList.remove('drag');$('#drop').ondrop=e=>{e.preventDefault();$('#drop').classList.remove('drag');loadFile(e.dataTransfer.files[0]);};
function readPosterSize(){
 if($('#size-mode').value==='custom'){
  const factor=unitMm[$('#size-unit').value];
  state.posterSize={width:Number($('#poster-width').value)*factor,height:Number($('#poster-height').value)*factor};
 }else state.posterSize=null;
 update();
}
$('#size-mode').onchange=()=>{
 const custom=$('#size-mode').value==='custom';
 $('#poster-size-fields').hidden=!custom;$('#grid-settings').hidden=custom;
 readPosterSize();
};
for(const id of ['poster-width','poster-height'])$('#'+id).oninput=readPosterSize;
let displayUnit='cm';
$('#size-unit').onchange=()=>{
 const factor=unitMm[displayUnit]/unitMm[$('#size-unit').value];
 for(const id of ['poster-width','poster-height']){
  const input=$('#'+id);if(input.value!=='')input.value=Number(input.value)*factor;
 }
 displayUnit=$('#size-unit').value;readPosterSize();
};
document.querySelectorAll('[data-grid]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-grid]').forEach(x=>x.classList.toggle('active',x===b));const custom=b.dataset.grid==='custom';$('.custom').hidden=!custom;if(!custom){[state.rows,state.cols]=b.dataset.grid.split('×').map(Number);$('#rows').value=state.rows;$('#cols').value=state.cols;}update();});
for(const key of ['rows','cols'])$('#'+key).oninput=e=>{const v=Number(e.target.value);if(Number.isInteger(v)&&v>=1&&v<=20){state[key]=v;update();}};
for(const key of ['paper','orientation','overlap'])$('#'+key).onchange=e=>{state[key]=key==='overlap'?Number(e.target.value):e.target.value;update();};
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('active',x===b));$('#mode-hint').textContent=state.mode==='fit'?'Keep the whole image. Some white space may remain.':'Cover every page. Image edges may be cropped.';update();});
$('#try-example').onclick=async()=>{const res=await fetch(new URL('./1.png',import.meta.url));await loadFile(new File([await res.blob()],'Example poster.png',{type:'image/png'}));};
function raster(g,x,y,w,h,dpi=150){const cv=document.createElement('canvas'),p=dpi/25.4;cv.width=Math.round(w*p);cv.height=Math.round(h*p);const ctx=cv.getContext('2d');ctx.setTransform(cv.width/w,0,0,cv.height/h,-x*cv.width/w,-y*cv.height/h);ctx.fillStyle='white';ctx.fillRect(x,y,w,h);ctx.drawImage(img,g.image.x,g.image.y,g.image.w,g.image.h);return cv.toDataURL('image/jpeg',.95);}
function fitted(iw,ih,x,y,w,h){const s=Math.min(w/iw,h/ih);return [x+(w-iw*s)/2,y+(h-ih*s)/2,iw*s,ih*s];}
$('#export').onclick=async()=>{if(!img||exporting||loading||sizeError)return;exporting=true;$('#pdf-page').disabled=true;$('#file').disabled=true;$('#export').disabled=true;const g=getGeometry(),marks=$('#marks').checked,config={...state};const controls=[...document.querySelectorAll('aside input, aside select, aside button')].filter(el=>!el.disabled);controls.forEach(el=>el.disabled=true);const pdf=new jsPDF({orientation:state.orientation,unit:'mm',format:[g.pw,g.ph],compress:true});const title=t=>{pdf.setTextColor(35,70,57);pdf.setFontSize(20);pdf.text(t,10,18);};try{
$('#status').textContent='Preparing your classroom pack…';await new Promise(r=>setTimeout(r,30));
const original=document.createElement('canvas');original.width=img.naturalWidth;original.height=img.naturalHeight;original.getContext('2d').fillStyle='white';original.getContext('2d').fillRect(0,0,original.width,original.height);original.getContext('2d').drawImage(img,0,0);const originalData=original.toDataURL('image/jpeg',.95);
title('Completed poster reference');pdf.setFontSize(10);pdf.text('Collaborative Poster Splitter · Poster Club',10,26);pdf.addImage(originalData,'JPEG',...fitted(img.naturalWidth,img.naturalHeight,10,34,g.pw-20,g.ph-48));
pdf.addPage();title('Teacher instructions & assembly');pdf.setFontSize(10);const instructions=[`1. Print at 100% / Actual size on ${config.paper==='a4'?'A4':'US Letter'} paper. Disable Fit to page.`,`2. Give each student one labeled piece (${g.tiles.length} pieces total).`,`3. Cut along each black border. Arrange rows A, B, C… top to bottom.`,`4. Arrange columns 1, 2, 3… from left to right.`, config.overlap?`   Match the repeated image in ${config.overlap} mm overlap areas, then tape.`:`   Join neighboring borders edge to edge, then tape the pieces together.`,`Finished size: ${(g.width/10).toFixed(1)} × ${(g.height/10).toFixed(1)} cm. White areas in Fit mode are intentional.`];pdf.text(instructions,10,31,{lineHeightFactor:1.5});const area=fitted(g.width,g.height,10,70,g.pw-20,g.ph-85);pdf.addImage(raster(g,0,0,g.width,g.height,80),'JPEG',...area);const scale=area[2]/g.width;pdf.setDrawColor(0);pdf.setLineWidth(.2);pdf.setFontSize(8);for(const t of g.tiles){pdf.rect(area[0]+t.x*scale,area[1]+t.y*scale,t.w*scale,t.h*scale);pdf.setFillColor(255,255,255);pdf.rect(area[0]+t.x*scale+1,area[1]+t.y*scale+1,9,5,'F');pdf.text(t.label,area[0]+t.x*scale+2,area[1]+t.y*scale+4.5);}
pdf.addPage();pdf.addImage(originalData,'JPEG',...fitted(img.naturalWidth,img.naturalHeight,0,0,g.pw,g.ph));
for(let i=0;i<g.tiles.length;i++){const t=g.tiles[i];$('#status').textContent=`Preparing student page ${i+1} of ${g.tiles.length}…`;await new Promise(r=>setTimeout(r,0));pdf.addPage();pdf.addImage(raster(g,t.x,t.y,t.w,t.h),'JPEG',g.margin,g.margin,t.w,t.h);pdf.setDrawColor(0);pdf.setLineWidth(.2);pdf.rect(g.margin,g.margin,t.w,t.h);pdf.setFontSize(9);pdf.setTextColor(35,70,57);pdf.text(`${t.label} · Row ${t.r+1}, column ${t.c+1}`,g.margin,6);pdf.setFontSize(7);pdf.text('Print at 100% / Actual size',g.margin,g.ph-3);if(marks){pdf.setDrawColor(40);pdf.setLineWidth(.15);for(const x of [g.margin,g.margin+t.w])for(const y of [g.margin,g.margin+t.h]){const dx=x===g.margin?-1:1,dy=y===g.margin?-1:1;pdf.line(x+dx,y,x+dx*5,y);pdf.line(x,y+dy,x,y+dy*5);}}}
pdf.save('poster-club-classroom-pack.pdf');$('#status').textContent=`Your PDF is ready: ${g.tiles.length+3} pages.`;
}catch(err){console.error(err);$('#status').textContent='Export failed. Try a smaller grid or image.';}finally{exporting=false;controls.forEach(el=>el.disabled=false);$('#pdf-page').disabled=false;$('#file').disabled=false;update();}};
update();
