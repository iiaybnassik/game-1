import {test,expect,chromium,BrowserContext} from '@playwright/test';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {mkdtemp} from 'node:fs/promises';
import os from 'node:os';
declare const chrome: any;
let context:BrowserContext;
const sent:{text:string,files:string[]}[]=[];
const storage:Record<string,any>={};
let chatPage:any;
test.beforeAll(async()=>{
 context=await chromium.launchPersistentContext(await mkdtemp(path.join(os.tmpdir(),'tpt-adapter-')),{headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH,args:['--no-sandbox']});
 await context.exposeFunction('tptRead',async(keys:string[])=>Object.fromEntries(keys.map(k=>[k,storage[k]])));
 await context.exposeFunction('tptWrite',async(values:Record<string,any>)=>{const changes:Record<string,any>={};for(const [key,value] of Object.entries(values)){changes[key]={oldValue:storage[key],newValue:value};storage[key]=value;}await Promise.all(context.pages().map(p=>p.evaluate(changes=>(window as any).__tptStorageEvent?.(changes),changes).catch(()=>{})));});
 await context.exposeFunction('tptClear',async()=>{for(const key of Object.keys(storage))delete storage[key];});
 await context.exposeFunction('tptRemove',async(key:string)=>{delete storage[key];});
 await context.exposeFunction('tptTabs',async()=>[{id:1,url:chatPage.url(),active:true}]);
 await context.exposeFunction('tptSend',async(message:any)=>chatPage.evaluate((message:any)=>new Promise(resolve=>(window as any).__tptReceive(message,resolve)),message));
 await context.addInitScript(()=>{
  const w=window as any;const changes:any[]=[];const messages:any[]=[];
  w.__tptStorageEvent=(c:any)=>changes.forEach(fn=>fn(c,'local'));
  w.__tptReceive=(m:any,reply:any)=>messages.forEach(fn=>fn(m,{id:'test-extension'},reply));
  w.chrome={runtime:{id:'test-extension',onMessage:{addListener:(fn:any)=>messages.push(fn)}},storage:{local:{get:(keys:any)=>w.tptRead(keys),set:(values:any)=>w.tptWrite(values),clear:()=>w.tptClear(),remove:(key:any)=>w.tptRemove(key)},onChanged:{addListener:(fn:any)=>changes.push(fn)}},tabs:{query:()=>w.tptTabs(),get:async()=> (await w.tptTabs())[0],sendMessage:(_:any,m:any)=>w.tptSend(m)}};
 });
 await context.route('https://studio.test/**',async route=>{const name=new URL(route.request().url()).pathname.slice(1);const allowed=['panel.html','panel.js','panel.css','shared.js'];if(!allowed.includes(name))return route.fulfill({status:404});await route.fulfill({contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html',body:await readFile(path.join('extension',name),'utf8')});});
 await context.route('https://chatgpt.com/**',async route=>{
 const image=(await readFile('1.png')).toString('base64');const editable=new URL(route.request().url()).searchParams.has('editable');
 await route.fulfill({contentType:'text/html',body:`<!doctype html><html><body><h1>Controlled ChatGPT test fixture</h1><div id="messages"></div><form><div id="attachments"></div><input type="file" multiple accept="image/*" id="file">${editable?'<div id="prompt-textarea" contenteditable="true" style="width:400px;min-height:50px" data-placeholder="Ask anything"></div>':'<textarea id="prompt-textarea" placeholder="Ask anything"></textarea>'}<button data-testid="send-button" aria-label="Send prompt" type="button">Send</button></form><script>
 const files=document.querySelector('#file'),editor=document.querySelector('#prompt-textarea'),attachments=document.querySelector('#attachments'),send=document.querySelector('button');
 files.onchange=()=>{attachments.replaceChildren();for(const f of files.files){const img=document.createElement('img');img.src=URL.createObjectURL(f);img.alt=f.name;img.width=100;img.height=100;attachments.append(img);}};
 send.onclick=async()=>{const text=editor.value??editor.innerText;const uploaded=[...files.files].map(f=>f.name);await window.recordSend({text,files:uploaded});if('value' in editor)editor.value='';else editor.replaceChildren();attachments.replaceChildren();files.value='';if(window.fixtureBehavior==='silent')return;const article=document.createElement('article');const message=document.createElement('div');message.dataset.messageAuthorRole='assistant';if(text.startsWith('Analyze'))message.textContent='STYLE DNA: Palette: deep navy #183348, cream #FFFBEF, coral #EE7766. Typography: rounded bold headline with crisp supporting type. Layout: top centered headline, generous 5% margins, resource previews framed along the lower half. Background: soft cream with restrained decoration. This analysis is visual guidance only, with no copied product or reference text.';else{message.textContent='Here is your generated image.';const img=document.createElement('img');img.src='data:image/png;base64,${image}';img.alt='Generated thumbnail';img.width=200;img.height=200;message.append(img);}article.append(message);document.querySelector('#messages').append(article);};
 </script></body></html>`});
 });
});
test.afterAll(async()=>{await context?.close();});
async function setup(editable=false){
 sent.length=0;
 const chat=await context.newPage();chatPage=chat;await chat.exposeFunction('recordSend',(data:any)=>sent.push(data));await chat.goto(editable?'https://chatgpt.com/?editable=1':'https://chatgpt.com/');await chat.addScriptTag({path:'extension/shared.js'});await chat.addScriptTag({path:'extension/content.js'});await chat.evaluate(()=>{(window as any).fixtureBehavior='normal';});
 const panel=await context.newPage();await panel.goto('https://studio.test/panel.html');await panel.evaluate(()=>chrome.storage.local.clear());await panel.reload();
 await expect(panel.locator('#saved')).toHaveText('Saved in this Chrome profile');
 await panel.locator('#reference').setInputFiles('1.png');await expect(panel.locator('.reference-image')).toBeVisible();
 const buffer=await readFile('1.png');await panel.locator('#resources').setInputFiles([{name:'product-page.png',mimeType:'image/png',buffer}]);await expect(panel.locator('#resources-preview .asset')).toHaveCount(1);
 for(let i=0;i<3;i++){await panel.getByRole('button',{name:`Thumbnail ${i+1}`,exact:true}).click();await panel.locator('#title').fill(`EXACT TITLE ${i+1}!`);await panel.locator('#pages input').check();}
 await panel.locator('#consent').check();
 return {chat,panel};
}
test('extension DOM adapter analyzes then generates three images in order and retains analysis',async()=>{
 const {chat,panel}=await setup();await panel.locator('#run').click();await expect(panel.locator('#progress')).toContainText('All three thumbnail images completed',{timeout:60000});
 expect(sent).toHaveLength(4);expect(sent[0].files).toEqual(['1.png']);expect(sent[0].text).toContain('Do not create an image yet');
 for(let i=1;i<4;i++){expect(sent[i].files).toEqual(['product-page.png']);expect(sent[i].text).toContain(`EXACT TITLE ${i}!`);expect(sent[i].text).toContain('STYLE DNA: Palette');}
 await expect(panel.locator('#analysis')).toBeDisabled();await expect(panel.locator('#analysis')).toHaveValue(/STYLE DNA: Palette/);
 await panel.reload();await expect(panel.locator('#analysis')).toHaveValue(/STYLE DNA: Palette/);await expect(panel.locator('#consent')).not.toBeChecked();
 await panel.locator('#consent').check();await panel.locator('#refinement').fill('Make the headline bigger');await panel.locator('#refine').click();await expect(panel.locator('#progress')).toContainText('Refinement image completed',{timeout:20000});expect(sent[4].text).toContain('Make the headline bigger');expect(sent[4].files).toEqual([]);
 await panel.setViewportSize({width:400,height:800});expect(await panel.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await panel.evaluate(()=>window.scrollTo(0,0));await panel.screenshot({path:'/tmp/tpt-extension.png',fullPage:true});await chat.close();await panel.close();
});
test('stop prevents generation after an unfinished analysis',async()=>{
 const {chat,panel}=await setup();await chat.evaluate(()=>{(window as any).fixtureBehavior='silent';});await panel.locator('#run').click();await expect.poll(()=>sent.length).toBe(1);await panel.locator('#stop').click();await expect(panel.locator('#progress')).toContainText('Automation stopped');await panel.waitForTimeout(1500);expect(sent).toHaveLength(1);await chat.close();await panel.close();
});
test('missing upload adapter stops without sending; user drafts are preserved',async()=>{
 const {chat,panel}=await setup();await chat.locator('input[type=file]').evaluate(e=>e.remove());await panel.locator('#run').click();await expect(panel.locator('#progress')).toContainText('upload control was not found');expect(sent).toHaveLength(0);
 await chat.locator('textarea').fill('MY UNSENT DRAFT');await panel.locator('#run').click();await expect(panel.locator('#notice')).toContainText('already has a draft');await expect(chat.locator('textarea')).toHaveValue('MY UNSENT DRAFT');expect(sent).toHaveLength(0);await chat.close();await panel.close();
});

test('native contenteditable composer receives full reference-analysis prompt',async()=>{const {chat,panel}=await setup(true);await panel.locator('#analyze').click();await expect(panel.locator('#progress')).toContainText('Deep style analysis saved and locked',{timeout:25000});expect(sent).toHaveLength(1);expect(sent[0].text).toContain('positions in percentages');expect(sent[0].files).toEqual(['1.png']);await chat.close();await panel.close();});
