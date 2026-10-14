/* global chrome, TPTStudio */
(() => {
  let current = null;
  const visible = e => !!e && !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
  const editor = () => [...document.querySelectorAll('#prompt-textarea, [contenteditable="true"][data-placeholder], textarea[placeholder]')].find(visible);
  const scope = () => editor()?.closest('form') || editor()?.closest('[data-testid="composer"]') || editor()?.parentElement?.parentElement?.parentElement;
  const stopButton = () => [...document.querySelectorAll('button')].find(e => visible(e) && (e.dataset.testid === 'stop-button' || /stop (generating|streaming|response)/i.test(e.getAttribute('aria-label') || '')));
  const sendButton = () => [...(scope() || document).querySelectorAll('button')].find(e => visible(e) && (e.dataset.testid === 'send-button' || /^(send prompt|send message|send)$/i.test(e.getAttribute('aria-label') || '')));
  function ready() {
    if (!editor()) return 'ChatGPT composer was not found. Sign in, open a conversation, and wait for the page to load. If this continues, the interface adapter needs an update.';
    if (stopButton()) return 'ChatGPT is already generating. Wait for it to finish before starting.';
    if ((editor().value || editor().innerText || '').trim()) return 'The ChatGPT composer already has a draft. Send or clear it before starting; the extension will not overwrite your text.';
    return '';
  }
  function check(token) {
    if (current !== token || token.cancelled) throw Error('Automation stopped. Any already-sent message may still finish in ChatGPT.');
    if (location.pathname !== token.path && !(token.path === '/' && /^\/c\//.test(location.pathname))) throw Error('The conversation changed. Automation stopped to avoid sending to the wrong chat.');
    if (token.path === '/' && /^\/c\//.test(location.pathname)) token.path = location.pathname;
  }
  function delay(ms, token) { return new Promise(resolve => setTimeout(resolve, ms)).then(() => check(token)); }
  async function waitFor(fn, timeout, token, error) {const end=Date.now()+timeout;while(Date.now()<end){check(token);const value=fn();if(value)return value;await delay(350,token);}throw Error(error);}
  async function progress(token, message, status = 'running') {
    check(token);token.state={...token.state,status,message,url:location.href,updated:Date.now()};await chrome.storage.local.set({tptRun:token.state});
  }
  function composerImages() { return [...(scope()?.querySelectorAll('img') || [])].filter(img => visible(img) && (img.src.startsWith('blob:') || img.src.startsWith('data:') || /attachment|upload|preview/i.test(`${img.alt} ${img.getAttribute('data-testid') || ''}`))); }
  async function upload(assets, token) {
    if(!assets.length)return;
    if(composerImages().length)throw Error('The composer already has image attachments. Remove them before starting; the extension will not replace your draft attachments.');
    let input = [...document.querySelectorAll('input[type="file"]')].find(e=>!e.disabled && (!e.accept || /image|png|jpg|jpeg|webp/i.test(e.accept)));
    if(!input){
      const button=[...(scope()||document).querySelectorAll('button')].find(e=>visible(e)&&(e.dataset.testid==='composer-plus-btn'||/add (photos|files|attachments)|attach (files|images)/i.test(e.getAttribute('aria-label')||'')));
      if(!button)throw Error('ChatGPT upload control was not found. No message was sent. The interface adapter needs an update.');
      button.click();await delay(500,token);
      const menu=[...document.querySelectorAll('[role="menuitem"], button')].find(e=>visible(e)&&/upload from computer|add photos.*files|upload files/i.test(e.textContent||''));
      // Prefer an existing hidden file input; do not open a native chooser.
      input=[...document.querySelectorAll('input[type="file"]')].find(e=>!e.disabled);
      if(!input&&menu){menu.click();await delay(500,token);input=[...document.querySelectorAll('input[type="file"]')].find(e=>!e.disabled);}
    }
    if(!input)throw Error('No file upload input found. No prompt was sent.');
    if(assets.length>1&&!input.multiple)throw Error('This ChatGPT upload input accepts only one file. Select fewer pages or update the interface adapter.');
    const transfer=new DataTransfer();
    for(const a of assets){const parts=a.data.split(',');const mime=/^data:(image\/(?:png|jpeg|webp));base64$/.exec(parts[0]);if(!mime)throw Error('Unsupported image format.');const binary=atob(parts[1]);const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));transfer.items.add(new File([bytes],a.name,{type:mime[1]}));}
    input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
    const namesVisible=()=>assets.every(a=>{
      const s=scope();if(!s)return false;
      return s.textContent.includes(a.name)||[...s.querySelectorAll('[title], [aria-label], img')].some(e=>[e.getAttribute('title'),e.getAttribute('aria-label'),e.getAttribute('alt')].some(v=>v?.includes(a.name)));
    });
    await waitFor(()=>namesVisible()||composerImages().length>=assets.length,45000,token,'Could not confirm all images were attached. Inspect ChatGPT and remove any partial uploads before retrying. No prompt was sent.');
    await waitFor(()=>!scope()?.querySelector('[role="progressbar"], [aria-busy="true"]') && ![...(scope()?.querySelectorAll('button')||[])].some(b=>/cancel upload/i.test(b.getAttribute('aria-label')||'')),45000,token,'Image upload is still pending. No prompt was sent.');
    // Give the native app time to commit completed attachments before typing.
    await delay(1200,token);
  }
  function assistantMessages() {
    return [...document.querySelectorAll('[data-message-author-role="assistant"]')].map(node=>{
      const container=node.closest('[data-testid^="conversation-turn-"], article')||node;
      const images=[...container.querySelectorAll('img')].filter(img=>visible(img)&&img.complete&&img.naturalWidth>=128&&img.naturalHeight>=128);
      return {node,key:node.getAttribute('data-message-id')||container.getAttribute('data-testid')||'',text:(node.innerText||node.textContent||'').trim(),images};
    });
  }
  function snapshot() {return assistantMessages().map(m=>({node:m.node,key:m.key,text:m.text,images:m.images.map(i=>i.src).join('|')}));}
  function freshResponse(before) {
    const all=assistantMessages();const latest=all.at(-1);if(!latest)return null;
    if(all.length>before.length)return latest;
    const old=before.find(b=>(latest.key&&b.key===latest.key)||b.node===latest.node);
    if(old)return old.text!==latest.text||old.images!==latest.images.map(i=>i.src).join('|')?latest:null;
    // A remounted historical answer must not count as a new generation.
    const identical=before.some(b=>b.text===latest.text&&b.images===latest.images.map(i=>i.src).join('|'));
    return identical?null:latest;
  }

  async function response(before, requireImage, token) {
    let signature='',stableSince=0;
    const result=await waitFor(()=>{
      const m=freshResponse(before);if(!m)return false;
      const meaningful=requireImage ? m.images.length>0 : m.text.length>=150;
      if(!meaningful||stopButton()){signature='';stableSince=0;return false;}
      const next=`${m.text}|${m.images.map(i=>i.src).join('|')}`;
      if(next!==signature){signature=next;stableSince=Date.now();return false;}
      return Date.now()-stableSince>=5000?m:false;
    },requireImage?240000:180000,token,requireImage?'ChatGPT did not return a completed image in time. It may have reached a usage limit, asked a question, or returned text only. Inspect the conversation. Automation will not continue.':'ChatGPT did not return a completed style analysis in time. Inspect the conversation for limits or questions.');
    return result;
  }
  async function send(text, assets, requireImage, token) {
    check(token);const reason=ready();if(reason)throw Error(reason);
    await upload(assets,token);check(token);
    const before=snapshot();const e=editor();if(!e)throw Error('ChatGPT composer disappeared. No prompt was sent.');
    e.focus();
    if(e instanceof HTMLTextAreaElement){Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,text);e.dispatchEvent(new Event('input',{bubbles:true}));}
    else {
      // Native editing keeps contenteditable editor frameworks in sync.
      const selection=window.getSelection();const range=document.createRange();range.selectNodeContents(e);selection.removeAllRanges();selection.addRange(range);
      if(!document.execCommand('insertText',false,text))throw Error('ChatGPT editor could not accept the prompt. No message was sent.');
    }
    await delay(350,token);
    if((e.value||e.innerText||'').trim()!==text.trim())throw Error('Could not verify the full prompt in the composer. Inspect the draft; it was not sent.');
    const button=await waitFor(()=>{const b=sendButton();return b&&!b.disabled&&b.getAttribute('aria-disabled')!=='true'?b:false;},30000,token,'ChatGPT send button stayed unavailable. Inspect any upload errors or account limits. The draft was not sent.');
    check(token);button.click();
    await waitFor(()=>!(editor()?.value||editor()?.innerText||'').trim()||!!stopButton()||!!freshResponse(before),15000,token,'Could not confirm that ChatGPT accepted the message. Inspect the conversation before retrying; the extension will not send a duplicate.');
    return response(before,requireImage,token);
  }
  async function execute(token, project, mode, index) {
    try {
      let p=structuredClone(project);
      if(mode==='all'||mode==='analyze') {
        await progress(token,'1. Uploading the style reference and waiting for deep analysis…');
        const result=await send(TPTStudio.analysisPrompt(p),[p.reference],false,token);
        if(/(?:unable to|cannot|can't) (?:view|see|analy[sz]e)|usage limit|try again later/i.test(result.text))throw Error('ChatGPT reported it could not analyze the image. Inspect its reply before continuing.');
        p.analysis=result.text;p.locked=true;
        await chrome.storage.local.set({tptProject:p});
        if(mode==='analyze'){await progress(token,'Deep style analysis saved and locked. Review it in the side panel before generating.', 'done');return;}
      }
      if(mode==='refine'){
        await progress(token,`Refining thumbnail ${index+1} in this conversation…`);
        await send(TPTStudio.refine(p,index),[],true,token);
        await progress(token,'Refinement image completed. View it in ChatGPT.','done');return;
      }
      for(let i=0;i<3;i++){
        const selected=p.resources.filter(a=>p.thumbnails[i].pages.includes(a.id));
        const assets=mode==='continue'&&i===0?[p.reference,...selected]:selected;
        await progress(token,`Generating thumbnail ${i+1}: ${TPTStudio.roles[i]}… Waiting for a completed image before the next prompt.`);
        await send(TPTStudio.prompt(p,i),assets,true,token);
        token.state.completed=i+1;
        await progress(token,`Thumbnail ${i+1} completed.`);
        if(i<2)await delay(1800,token);
      }
      await progress(token,'All three thumbnail images completed. Open the conversation to review and download them.','done');
    } catch(e) {
      if(current===token&&!token.cancelled){token.state={...token.state,status:'error',message:e.message,url:location.href,updated:Date.now()};await chrome.storage.local.set({tptRun:token.state});}
    } finally {if(current===token)current=null;}
  }
  chrome.runtime.onMessage.addListener((message,sender,reply)=>{
    if(sender.id!==chrome.runtime.id)return;
    if(message.type==='TPT_PING'){const reason=ready();reply({ok:true,ready:!reason,reason,running:!!current,hasAnalysis:assistantMessages().some(m=>/STYLE DNA|palette.*typography/is.test(m.text))});return;}
    if(message.type==='TPT_STOP'){if(current)current.cancelled=true;reply({ok:true});return;}
    if(message.type==='TPT_START'){
      if(current){reply({ok:false,error:'A run is already active. Stop it or wait for completion.'});return;}
      const reason=ready();if(reason){reply({ok:false,error:reason});return;}
      if(!['all','analyze','continue','refine'].includes(message.mode)){reply({ok:false,error:'Unknown workflow.'});return;}
      const token={id:message.runId,path:location.pathname,cancelled:false,state:message.state};current=token;
      reply({ok:true});void execute(token,message.project,message.mode,message.index);return;
    }
  });
})();
