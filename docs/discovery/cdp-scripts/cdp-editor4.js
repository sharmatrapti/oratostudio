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
    const text = () => ev(`document.body.innerText.split(String.fromCharCode(10)).map(s=>s.trim()).filter(Boolean).join(' | ').slice(0,500)`);
    const click = async (x,y) => { await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y}); for (const type of ['mousePressed','mouseReleased']) await send('Input.dispatchMouseEvent',{type,x,y,button:'left',clickCount:1}); };
    console.log('VIEWPORT:', await ev(`JSON.stringify({w:innerWidth,h:innerHeight,dpr:devicePixelRatio})`));
    console.log('MODAL DOM:', await ev(`(()=>{const a=[...document.querySelectorAll('*')].find(x=>x.children.length===0&&x.innerText&&x.innerText.trim()==='Start from scratch'); if(!a) return 'nf'; const chain=[]; let e=a; for(let i=0;i<5&&e;i++){chain.push(e.tagName+'.'+[...e.classList].join('.')); e=e.parentElement;} const card=a.parentElement; const r=card.getBoundingClientRect(); return JSON.stringify({chain, cardRect:[r.left,r.top,r.width,r.height], siblings:[...card.children].map(c=>c.tagName+'.'+[...c.classList].join('.'))})})()`));
    // Vue tree via container _vnode
    await ev(`window.__root = () => { const el=document.querySelector('#app'); return (el._vnode&&el._vnode.component) || (el.__vue_app__&&el.__vue_app__._container&&el.__vue_app__._container._vnode&&el.__vue_app__._container._vnode.component) || null; }; window.__tree = (maxD=8) => { const out=[]; const walk=(c,d)=>{ if(!c||d>maxD) return; const n=(c.type&&(c.type.name||c.type.__name))||'anon'; const ks=[...Object.keys(c.data||{}),...Object.keys(c.setupState||{})]; out.push({n,d,ks:ks.slice(0,40),inst:c}); const kids=[]; const collect=v=>{ if(!v) return; if(v.component) kids.push(v.component); if(Array.isArray(v.children)) v.children.forEach(collect); if(v.dynamicChildren) v.dynamicChildren.forEach(collect); if(v.ssContent) collect(v.ssContent); }; collect(c.subTree); kids.forEach(k=>walk(k,d+1)); }; walk(window.__root(),0); return out; }; 'ok'`);
    console.log('ROOT?:', await ev(`!!window.__root()`));
    console.log('TREE:', await ev(`window.__tree().filter(x=>x.ks.length).map(x=>' '.repeat(x.d)+x.n+': '+x.ks.join(',')).join(String.fromCharCode(10)).slice(0,2500)`));
    // click the card (parent of label) center
    const rect = await ev(`(()=>{const a=[...document.querySelectorAll('*')].find(x=>x.children.length===0&&x.innerText&&x.innerText.trim()==='Start from scratch'); const r=a.parentElement.getBoundingClientRect(); return JSON.stringify([r.left+r.width/2, r.top+r.height/2-60])})()`);
    const [cx,cy]=JSON.parse(rect); console.log('CLICK CARD @', cx, cy); await click(cx,cy); await sleep(2500);
    console.log('TEXT:', await text()); await shot('after-card.png');
    console.log('ROUTE:', await ev(`document.querySelector('#app').__vue_app__.config.globalProperties.$route.fullPath`));
    ws.close(); process.exit(0);
  });
});});
setTimeout(()=>{console.log('TIMEOUT');process.exit(1)}, 60000);
