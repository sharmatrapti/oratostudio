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
    const text = () => ev(`document.body.innerText.split(String.fromCharCode(10)).map(s=>s.trim()).filter(Boolean).join(' | ').slice(0,900)`);
    await ev(`window.__comps = () => { const set=new Set(); document.querySelectorAll('*').forEach(el=>{ let c=el.__vueParentComponent; while(c){ set.add(c); c=c.parent; } }); return [...set].map(c=>{ const name=(c.type&&(c.type.name||c.type.__name||(c.type.__file||'').split(/[\\/]/).pop()))||'anon'; const keys=[...Object.keys(c.data||{}),...Object.keys(c.setupState||{})]; return {name, keys, inst:c}; }); }; window.__state = (c) => ({...(c.data||{}),...(c.setupState||{})}); 'ok'`);
    console.log('COMPONENTS (templates page):', await ev(`JSON.stringify(window.__comps().filter(c=>c.keys.length).map(c=>({n:c.name,k:c.keys.slice(0,30)}))).slice(0,2500)`));
    console.log('TEMPLATE LIST STATE:', await ev(`(()=>{for(const c of window.__comps()){const st=window.__state(c); for(const [k,v] of Object.entries(st)){ const arr=Array.isArray(v)?v:null; if(arr&&arr.length>5&&arr[0]&&typeof arr[0]==='object'&&('name' in arr[0]||'title' in arr[0])){ const cnt=f=>{const o={};arr.forEach(i=>{const x=JSON.stringify(i[f]);o[x]=(o[x]||0)+1});return o}; return JSON.stringify({component:c.name,key:k,count:arr.length,fields:Object.keys(arr[0]),free:cnt('free'),premium:cnt('premium'),type:cnt('type'),category:cnt('category'),resolution:cnt('resolution')||cnt('orientation'),sample:JSON.stringify(arr[0]).slice(0,700)}).slice(0,2500);} } } return 'none'})()`));
    console.log('FREE DROPDOWN OPTIONS:', await ev(`JSON.stringify([...document.querySelectorAll('select option, [class*=dropdown] *, [class*=select] *')].map(o=>o.innerText&&o.innerText.trim()).filter(t=>t&&t.length<30).filter((v,i,a)=>a.indexOf(v)===i).slice(0,20))`));
    console.log('$settings.default:', await ev(`JSON.stringify(document.querySelector('#app').__vue_app__.config.globalProperties.$settings.default).slice(0,1500)`));
    console.log('$settings.effects names:', await ev(`JSON.stringify(document.querySelector('#app').__vue_app__.config.globalProperties.$settings.effects.map(e=>e.name))`));
    console.log('$settings.animationProperties sample:', await ev(`JSON.stringify(document.querySelector('#app').__vue_app__.config.globalProperties.$settings.animationProperties.slice(0,6))`));
    console.log('$settings.easings:', await ev(`JSON.stringify(document.querySelector('#app').__vue_app__.config.globalProperties.$settings.easings).slice(0,300)`));
    // Start from scratch
    console.log('CLICK Start from scratch:', await ev(`(()=>{const a=[...document.querySelectorAll('*')].find(x=>x.children.length===0&&x.innerText&&x.innerText.trim()==='Start from scratch'); if(!a) return 'nf'; (a.closest('[class*=item],[class*=card],[class*=option]')||a).click(); return 'clicked'})()`));
    await sleep(2500); await shot('scratch1.png');
    console.log('ROUTE:', await ev(`document.querySelector('#app').__vue_app__.config.globalProperties.$route.fullPath`));
    console.log('TEXT:', await text());
    console.log('BUTTONS:', await ev(`JSON.stringify([...document.querySelectorAll('button,[class*=btn]')].map(b=>b.innerText.trim()).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).slice(0,40))`));
    // if resolution chooser: click 1080p then create
    console.log('PICK 1080p:', await ev(`(()=>{const a=[...document.querySelectorAll('*')].find(x=>x.children.length===0&&x.innerText&&/1080p/i.test(x.innerText)); if(!a) return 'nf'; a.click(); return 'clicked'})()`));
    await sleep(600);
    console.log('CLICK Create/Continue:', await ev(`(()=>{const a=[...document.querySelectorAll('button,[class*=btn]')].find(x=>/create|continue|start|next|ok/i.test(x.innerText)&&x.offsetParent); if(!a) return 'nf'; a.click(); return 'clicked: '+a.innerText.trim()})()`));
    await sleep(6000); await shot('editor.png');
    console.log('ROUTE2:', await ev(`document.querySelector('#app').__vue_app__.config.globalProperties.$route.fullPath`));
    console.log('EDITOR COMPONENTS:', await ev(`JSON.stringify(window.__comps().filter(c=>c.keys.length).map(c=>({n:c.name,k:c.keys.slice(0,25)}))).slice(0,3000)`));
    console.log('PROJECT MODEL:', await ev(`(()=>{for(const c of window.__comps()){const st=window.__state(c); const p=st.project||st.currentProject; if(p&&typeof p==='object'){ const sum=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,Array.isArray(v)?'array['+v.length+']':typeof v==='object'&&v?'object{'+Object.keys(v).slice(0,12).join(',')+'}':JSON.stringify(v)&&JSON.stringify(v).slice(0,60)])); return JSON.stringify({component:c.name,project:sum(p)}).slice(0,3000);} } return 'no project state found'})()`));
    ws.close(); process.exit(0);
  });
});});
setTimeout(()=>{console.log('TIMEOUT');process.exit(1)}, 90000);
