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
    const ev = async expr => { const r = await send('Runtime.evaluate', {expression: expr, returnByValue: true, awaitPromise: true}); if(!r||!r.result) return JSON.stringify(r); if(r.exceptionDetails) return 'EXC: '+(r.exceptionDetails.exception&&r.exceptionDetails.exception.description||'').slice(0,300); return r.result.value ?? r.result.description; };
    const shot = async name => { const d=(await send('Page.captureScreenshot',{format:'png'})).data; fs.writeFileSync(process.argv[2]+'/'+name, Buffer.from(d,'base64')); };
    // helper installed in page: walk component tree
    await ev(`window.__walk = (pred, maxDepth=12) => { const out=[]; const seen=new Set(); const walk=(c,d)=>{ if(!c||d>maxDepth||seen.has(c)) return; seen.add(c); const name=c.type&&(c.type.name||c.type.__name||(c.type.__file||'').split(/[\\/]/).pop()||'anon'); const data=c.data||{}; const setup=c.setupState||{}; const keys=[...Object.keys(data),...Object.keys(setup)]; if(pred(name,keys,c)) out.push({name, depth:d, keys:keys.slice(0,40)}); const kids=[]; const collect=v=>{ if(!v) return; if(v.component) kids.push(v.component); if(Array.isArray(v.children)) v.children.forEach(collect); if(v.suspense&&v.suspense.activeBranch) collect(v.suspense.activeBranch); }; collect(c.subTree); kids.forEach(k=>walk(k,d+1)); }; walk(document.querySelector('#app').__vue_app__._instance,0); return out; }; window.__find = (name) => { let found=null; const seen=new Set(); const walk=c=>{ if(!c||found||seen.has(c)) return; seen.add(c); const n=c.type&&(c.type.name||c.type.__name||(c.type.__file||'').split(/[\\/]/).pop()); if(n===name){found=c;return;} const kids=[]; const collect=v=>{ if(!v) return; if(v.component) kids.push(v.component); if(Array.isArray(v.children)) v.children.forEach(collect); }; collect(c.subTree); kids.forEach(walk); }; walk(document.querySelector('#app').__vue_app__._instance); return found; }; 'ok'`);
    console.log('DASHBOARD COMPONENTS WITH STATE:', await ev(`JSON.stringify(window.__walk((n,k)=>k.length>0))`));
    // go to templates page
    console.log('GO TEMPLATES:', await ev(`(()=>{const a=[...document.querySelectorAll('a,div,span,li')].find(x=>x.children.length===0&&x.innerText&&x.innerText.trim()==='Templates'); if(!a) return 'not found'; a.click(); return 'clicked'})()`));
    await sleep(3500); await shot('templates.png');
    console.log('TEMPLATES PAGE COMPONENTS:', await ev(`JSON.stringify(window.__walk((n,k)=>/templ|resour|categ|filter|search/i.test(n+k.join(','))))`));
    console.log('TEMPLATES TEXT:', await ev(`document.body.innerText.replace(/\n{2,}/g,'\n').slice(0,1200)`));
    // try to read template list from any component state
    console.log('TEMPLATE DATA SAMPLE:', await ev(`(()=>{const comps=window.__walk((n,k)=>/templ|resour/i.test(n+k.join(',')),12); for(const c of comps){ const inst=window.__find(c.name); if(!inst) continue; const st={...(inst.data||{}),...(inst.setupState||{})}; for(const [k,v] of Object.entries(st)){ const arr=Array.isArray(v)?v:(v&&typeof v==='object'&&Array.isArray(v.items)?v.items:null); if(arr&&arr.length>3&&typeof arr[0]==='object'){ const cats={}; arr.forEach(i=>{const c=i.category||i.cat||i.type||i.section||'?'; cats[c]=(cats[c]||0)+1}); return JSON.stringify({component:c.name,key:k,count:arr.length,sampleKeys:Object.keys(arr[0]).slice(0,25),sample:JSON.stringify(arr[0]).slice(0,500),byCategory:cats}).slice(0,2500);} } } return 'none found'})()`));
    // New project
    console.log('GO NEW PROJECT:', await ev(`(()=>{const a=[...document.querySelectorAll('a,div,span,li')].find(x=>x.children.length===0&&x.innerText&&x.innerText.trim()==='New Project'); if(!a) return 'not found'; a.click(); return 'clicked'})()`));
    await sleep(3000); await shot('newproject.png');
    console.log('ROUTE:', await ev(`document.querySelector('#app').__vue_app__.config.globalProperties.$route.fullPath`));
    console.log('NEW PROJECT TEXT:', await ev(`document.body.innerText.replace(/\n{2,}/g,'\n').slice(0,800)`));
    console.log('NEW PROJECT BUTTONS:', await ev(`JSON.stringify([...document.querySelectorAll('button,[class*=btn],[class*=button]')].map(b=>b.innerText.trim()).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).slice(0,40))`));
    ws.close(); process.exit(0);
  });
});});
setTimeout(()=>{console.log('TIMEOUT');process.exit(1)}, 60000);
