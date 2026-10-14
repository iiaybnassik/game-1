/* global chrome, TPTStudio */
const $ = id => document.getElementById(id);
let project = TPTStudio.initial(), active = 0, runState = null, saveTimer, loading = true, uploading = false;
function notice(message) { $('notice').textContent = message; $('notice').hidden = !message; }
function busy() { return uploading || runState?.status === 'running'; }
function save() {
  $('saved').textContent = 'Saving…'; clearTimeout(saveTimer);
  saveTimer = setTimeout(() => chrome.storage.local.set({ tptProject: project }).then(() => $('saved').textContent = 'Saved in this Chrome profile').catch(() => $('saved').textContent = 'Save failed — export a backup').finally(() => { saveTimer = null; }), 200);
}
function element(tag, text, className) { const e = document.createElement(tag); if (text) e.textContent = text; if (className) e.className = className; return e; }
function assetTile(asset, selectable) {
  const box = element(selectable ? 'label' : 'div', '', 'asset');
  const image = element('img'); image.src = asset.data; image.alt = asset.name; box.append(image, element('span', asset.name));
  if (selectable) {
    const checkbox = element('input'); checkbox.type = 'checkbox'; checkbox.checked = project.thumbnails[active].pages.includes(asset.id); checkbox.disabled = busy();
    box.classList.toggle('selected', checkbox.checked);box.prepend(checkbox);
    checkbox.addEventListener('change', () => { const t=project.thumbnails[active];t.pages=checkbox.checked?[...t.pages,asset.id]:t.pages.filter(id=>id!==asset.id);save();renderAssets(); });
  } else {
    const remove = element('button', '×');remove.setAttribute('aria-label', `Remove ${asset.name}`);remove.disabled=busy();box.append(remove);
    remove.onclick = () => { project.resources=project.resources.filter(a=>a.id!==asset.id);project.thumbnails.forEach(t=>t.pages=t.pages.filter(id=>id!==asset.id));save();renderAssets(); };
  }
  return box;
}
function renderAssets() {
  $('reference-preview').replaceChildren();
  if (project.reference) { const image=element('img','','reference-image');image.src=project.reference.data;image.alt='Style reference';const remove=element('button','Remove reference');remove.disabled=busy();remove.onclick=()=>{project.reference=null;project.analysis='';project.locked=false;runState=null;void chrome.storage.local.remove('tptRun');save();render();};$('reference-preview').append(image,element('span',project.reference.name),remove); }
  $('resources-preview').replaceChildren(...project.resources.map(a=>assetTile(a,false)));
  $('pages').replaceChildren(...project.resources.map(a=>assetTile(a,true)));$('empty-pages').hidden=!!project.resources.length;
}
function renderRun() {
  const running=runState?.status==='running';document.body.classList.toggle('running',running);
  ['name','reference','resources','title','subtitle','badge','details','refinement','import','lock','analyze','run','continue','refine','consent'].forEach(id=>$(id).disabled=running||uploading||loading);
  $('stop').disabled=!running;$('analysis').disabled=running||project.locked||loading;
  $('progress').textContent=runState ? `${runState.status.toUpperCase()}\n${runState.message}\n${runState.completed || 0} / 3 thumbnails completed` : 'Ready when you are.';
  $('conversation').hidden=!runState?.url;if(runState?.url) $('conversation').href=runState.url;
}
function renderText() {const t=project.thumbnails[active];['title','subtitle','badge','details'].forEach(k=>$(k).value=t[k]);$('role').textContent=TPTStudio.roles[active];document.querySelectorAll('#tabs button').forEach((b,i)=>b.classList.toggle('selected',i===active));renderAssets();}
function render() {$('name').value=project.name;$('analysis').value=project.analysis;$('refinement').value=project.refinement;$('lock').textContent=project.locked?'Style locked':'Lock style';$('lock').setAttribute('aria-pressed',String(project.locked));renderText();renderRun();}
TPTStudio.roles.forEach((_,i)=>{const b=element('button',String(i+1));b.setAttribute('aria-label',`Thumbnail ${i+1}`);b.onclick=()=>{active=i;renderText();};$('tabs').append(b);});
$('name').oninput=e=>{project.name=e.target.value;save();};
['title','subtitle','badge','details'].forEach(k=>$(k).oninput=e=>{project.thumbnails[active][k]=e.target.value;save();});
$('analysis').oninput=e=>{project.analysis=e.target.value;save();};$('refinement').oninput=e=>{project.refinement=e.target.value;save();};
$('lock').onclick=()=>{project.locked=!project.locked;save();render();};
async function readImages(files) {
  return Promise.all(Array.from(files).map(async f=>{
    if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>8*1024*1024)throw Error('Use PNG, JPG, or WebP files of 8 MB or less.');
    const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Image could not be read.'));r.readAsDataURL(f);});
    await new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=()=>reject(Error('Image is damaged or unsupported.'));image.src=data;});
    return {id:crypto.randomUUID(),name:f.name,data};
  }));
}
async function upload(e,reference) {
  const files=Array.from(e.target.files);e.target.value='';if(!files.length)return;
  if(busy())return notice('Wait for the current action to finish.');
  if(!reference&&project.resources.length+files.length>20)return notice('A project supports up to 20 resource images.');
  if(reference&&project.reference&&!confirm('Replace the reference? This clears the old Style DNA so it cannot be reused by mistake.'))return;
  uploading=true;renderRun();
  try {const assets=await readImages(files);const all=reference?[...assets,...project.resources]:[...(project.reference?[project.reference]:[]),...project.resources,...assets];if(all.reduce((total,a)=>total+a.data.length,0)>32*1024*1024)throw Error('This project exceeds the 32 MB local image budget. Use smaller screenshots or remove some pages.');if(reference){project.reference=assets[0];project.analysis='';project.locked=false;runState=null;await chrome.storage.local.remove('tptRun');}else project.resources.push(...assets);save();render();notice('Images added. Select product pages for each thumbnail.');}catch(e){notice(e.message);}finally{uploading=false;render();}
}
$('reference').onchange=e=>upload(e,true);$('resources').onchange=e=>upload(e,false);
async function chatTab(requiredId) {
  if(requiredId){const tab=await chrome.tabs.get(requiredId).catch(()=>null);if(!tab?.url?.startsWith('https://chatgpt.com/'))throw Error('The original ChatGPT tab is closed. Open it again before continuing.');return tab;}
  const tabs=await chrome.tabs.query({url:'https://chatgpt.com/*',currentWindow:true});
  const tab=tabs.find(t=>t.active)||(tabs.length===1?tabs[0]:null);
  if(!tab)throw Error(tabs.length?'Select the ChatGPT tab you want to use, then open this side panel there.':'Open https://chatgpt.com in this window, sign in, and open the extension there.');
  return tab;
}
async function start(mode) {
  if(busy())return;
  if(!$('consent').checked)return notice('Check the permission box before sending images or messages to ChatGPT.');
  let problem=TPTStudio.validate(project,mode);
  if(mode==='refine'){problem=!project.refinement.trim()?'Describe the refinement first.':!runState?.completed?'Generate a thumbnail in this conversation first.':'';}
  if(problem)return notice(problem);
  try {
    const tab=await chatTab(mode==='refine'||mode==='continue'?runState?.tabId:null);
    const handshake=await chrome.tabs.sendMessage(tab.id,{type:'TPT_PING'}).catch(()=>null);
    if(!handshake?.ok)throw Error('Refresh the ChatGPT page, wait for it to load, and try again.');
    if(!handshake.ready)throw Error(handshake.reason);
    if(mode==='refine'&&runState?.url&&runState.url!==tab.url)throw Error('Return to the original generated conversation before refining.');
    if(mode==='continue'&&!handshake.hasAnalysis&&!confirm('This conversation does not have the previous analysis. The reference will be uploaded again with your saved Style DNA. Continue?'))return;
    const runId=crypto.randomUUID();const previousCompleted=runState?.completed||0;
    const state={id:runId,status:'running',message:'Preparing the conversation…',completed:mode==='refine'?previousCompleted:0,tabId:tab.id,url:tab.url,updated:Date.now()};
    runState=state;renderRun();notice('');await chrome.storage.local.set({tptRun:state,tptProject:project});
    const response=await chrome.tabs.sendMessage(tab.id,{type:'TPT_START',runId,mode,project,index:Math.max(0,previousCompleted-1),state});
    if(!response?.ok)throw Error(response?.error||'ChatGPT could not start.');
  } catch(e){if(runState?.status==='running'){runState={...runState,status:'error',message:e.message,updated:Date.now()};await chrome.storage.local.set({tptRun:runState});renderRun();}notice(e.message);}
}
$('run').onclick=()=>start('all');$('analyze').onclick=()=>start('analyze');$('continue').onclick=()=>start('continue');$('refine').onclick=()=>start('refine');
$('stop').onclick=async()=>{
  if(!runState)return;try{await chrome.tabs.sendMessage(runState.tabId,{type:'TPT_STOP'});}catch{};
  runState={...runState,status:'stopped',message:'Automation stopped. Any message already sent may still finish in ChatGPT. No next prompt will be sent.',updated:Date.now()};await chrome.storage.local.set({tptRun:runState});render();
};
$('copy').onclick=async()=>{if(!project.reference||!project.analysis.trim())return notice('Add a reference and analyze its style first.');try{await navigator.clipboard.writeText(TPTStudio.prompt(project,active));notice('Prompt copied.');}catch{notice('Clipboard access failed. Try again while the side panel is focused.');}};
$('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}));const a=element('a');a.href=url;a.download='tpt-extension-project.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);};
function validProject(p) {
 const asset=a=>a&&typeof a.id==='string'&&typeof a.name==='string'&&typeof a.data==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(a.data);
 return p&&typeof p.name==='string'&&typeof p.analysis==='string'&&typeof p.locked==='boolean'&&typeof p.refinement==='string'&&(p.reference===null||asset(p.reference))&&Array.isArray(p.resources)&&p.resources.length<=20&&p.resources.every(asset)&&Array.isArray(p.thumbnails)&&p.thumbnails.length===3&&p.thumbnails.every(t=>t&&['title','subtitle','badge','details'].every(k=>typeof t[k]==='string')&&Array.isArray(t.pages)&&t.pages.every(id=>typeof id==='string'));
}
$('import').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file||busy())return;try{if(file.size>240*1024*1024)throw Error('Backup is too large.');const p=JSON.parse(await file.text());if(!validProject(p))throw Error('This is not a valid extension project backup.');if(!confirm('Replace this project with the imported backup?'))return;project=p;runState=null;await chrome.storage.local.remove('tptRun');save();render();notice('Backup restored.');}catch(e){notice(e.message);}};
chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;if(changes.tptRun){runState=changes.tptRun.newValue||null;renderRun();renderAssets();}if(changes.tptProject&&!saveTimer){if(validProject(changes.tptProject.newValue)){project=changes.tptProject.newValue;render();}}});
(async()=>{try{const v=await chrome.storage.local.get(['tptProject','tptRun']);if(validProject(v.tptProject))project=v.tptProject;runState=v.tptRun||null;if(runState?.status==='running'){const ping=await chrome.tabs.sendMessage(runState.tabId,{type:'TPT_PING'}).catch(()=>null);if(!ping?.running){runState={...runState,status:'error',message:'The previous run was interrupted by navigation or a browser restart. Inspect the conversation before starting again.'};await chrome.storage.local.set({tptRun:runState});}}$('saved').textContent='Saved in this Chrome profile';}catch{notice('Could not open local storage. Export a backup before closing.');}finally{loading=false;render();}})();
