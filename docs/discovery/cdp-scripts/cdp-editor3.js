const WebSocket = require('D:/workspaces/OMD_dash/dash.ohmydog.rocks/node_modules/ws');
const http = require('http'); const fs=require('fs');
const sleep = ms => new Promise(r=>setTimeout(r,ms));
http.get('http://127.0.0.1:9222/json', res => { let b=''; res.on('data', d=>b+=d); res.on('end', () => {
  const page = JSON.parse(b).find(p => p.type==='page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const pending = {};
  const send = (method, params={}) => new Promise(r => { const i=++id; pending[i]=r; ws.send(JSON.stringify({id:i,method,params})); });
  ws.on('message', m => { const j = JSON.parse(m); if (pending[j.id]) pending[j.id](j.result); });
  ws.on('open', async () => {
    const ev = async expr => { const r = await send('Runtime.evaluate', {expression: expr, returnByValue: true, awaitPromise: true}); if(!r||!r.result) return JSON.stringify(r); if(r.exceptionDetails) return 'EXC: '+(r.exceptionDetails.exception&&r.exceptionDetails.exception.description||r.exceptionDetails.text||'').slice(0,300); return r.result.value ?? r.result.description; };
    const shot = async name => { const d=(await send('Page.captureScreenshot',{format:'png'})).data; fs.writeFileSync(process.argv[2]+'/'+name, Buffer.from(d,'base64')); };
    const text = () => ev(`document.body.innerText.split(String.fromCharCode(10)).map(s=>s.trim()).filter(Boolean).join(' | ').slice(0,700)`);
    const click = async (x,y) => { for (const type of ['mousePressed','mouseReleased']) await send('Input.dispatchMouseEvent',{type,x,y,button:'left',clickCount:1}); };
    const clickText = async (re) => { const r = await ev(`(()=>{const a=[...document.querySelectorAll('*')].find(x=>x.children.length===0&&x.innerText&&${re}.test(x.innerText.trim())&&x.offsetParent); if(!a) return null; const b=a.getBoundingClientRect(); return JSON.stringify([b.left+b.width/2,b.top+b.height/2,a.innerText.trim()])})()`); if(!r||r==='null') return 'nf'; const [x,y,t]=JSON.parse(r); await click(x,y); return 'clicked '+t+' @'+Math.round(x)+','+Math.round(y); };
    // 1. full defaults to file
    const defaults = await ev(`JSON.stringify(document.querySelector('#app').__vue_app__.config.globalProperties.$settings.default, null, 1)`);
    fs.writeFileSync(process.argv[2]+'/settings-default.json', defaults); console.log('DEFAULTS saved, bytes:', defaults.length);
    // 2. component tree debug
    console.log('TREE:', await ev(`(()=>{const out=[]; const walk=(c,d)=>{ if(!c||d>6) return; const n=(c.type&&(c.type.name||c.type.__name))||(c.type&&c.type.__file)||(typeof c.type==='object'?'obj:'+Object.keys(c.type).slice(0,4).join('/'):String(c.type)); out.push(' '.repeat(d)+n+' data['+Object.keys(c.data||{}).length+'] setup['+Object.keys(c.setupState||{}).length+']'); const kids=[]; const collect=v=>{ if(!v) return; if(v.component) kids.push(v.component); if(Array.isArray(v.children)) v.children.forEach(collect); if(v.dynamicChildren) v.dynamicChildren.forEach(collect); }; collect(c.subTree); kids.forEach(k=>walk(k,d+1)); }; walk(document.querySelector('#app').__vue_app__._instance,0); return out.slice(0,40).join(String.fromCharCode(10))})()`));
    // 3. real click Start from scratch
    console.log('START FROM SCRATCH:', await clickText('/^Start from scratch$/'));
    await sleep(2500); await shot('scratch2.png');
    console.log('TEXT:', await text());
    console.log('PICK 1080p:', await clickText('/1080p/i')); await sleep(500);
    console.log('CREATE:', await clickText('/^(Create|Continue|Create Project|Start|Next)$/i'));
    await sleep(8000); await shot('editor.png');
    console.log('ROUTE:', await ev(`document.querySelector('#app').__vue_app__.config.globalProperties.$route.fullPath`));
    console.log('TEXT:', await text());
    console.log('TREE2:', await ev(`(()=>{const out=[]; const walk=(c,d)=>{ if(!c||d>5) return; const n=(c.type&&(c.type.name||c.type.__name))||'anon'; const ks=[...Object.keys(c.data||{}),...Object.keys(c.setupState||{})]; if(ks.length) out.push(n+': '+ks.slice(0,30).join(',')); const kids=[]; const collect=v=>{ if(!v) return; if(v.component) kids.push(v.component); if(Array.isArray(v.children)) v.children.forEach(collect); if(v.dynamicChildren) v.dynamicChildren.forEach(collect); }; collect(c.subTree); kids.forEach(k=>walk(k,d+1)); }; walk(document.querySelector('#app').__vue_app__._instance,0); return out.slice(0,30).join(String.fromCharCode(10))})()`));
    ws.close(); process.exit(0);
  });
});});
setTimeout(()=>{console.log('TIMEOUT');process.exit(1)}, 90000);
