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
    await ev(`window.__byKeys = (...need) => window.__tree(10).find(x=>need.every(k=>x.ks.includes(k))); window.__methods = (inst) => { const m=inst.type&&inst.type.methods?Object.keys(inst.type.methods):[]; return m; }; 'ok'`);
    const R = `window.__tree(2)[0].inst`;
    console.log('ROOT user (redacted):', await ev(`(()=>{const u=${R}.data.user||{}; const red=o=>{const r={}; for(const [k,v] of Object.entries(o||{})){ r[k]= /token|email|password|key|name/i.test(k)? '<redacted>' : (typeof v==='object'? JSON.stringify(v).slice(0,200): v);} return r}; return JSON.stringify(red(u)).slice(0,1500)})()`));
    console.log('ROOT connection:', await ev(`JSON.stringify(${R}.data.connection).slice(0,300)`));
    console.log('ROOT newProjectSettings:', await ev(`JSON.stringify(${R}.data.newProjectSettings).slice(0,500)`));
    console.log('ROOT appUi:', await ev(`JSON.stringify(${R}.data.appUi).slice(0,500)`));
    console.log('ROOT resources summary:', await ev(`(()=>{const r=${R}.data.resources; if(!r) return 'none'; if(Array.isArray(r)){ const by={}; r.forEach(i=>{const c=i.type||i.category||'?'; by[c]=(by[c]||0)+1}); return JSON.stringify({count:r.length, fields:Object.keys(r[0]||{}), byType:by, sample:JSON.stringify(r[0]).slice(0,600)}); } const out={}; for(const [k,v] of Object.entries(r)){ out[k]=Array.isArray(v)?('array['+v.length+'] fields:'+Object.keys(v[0]||{}).slice(0,15).join(',')):(typeof v==='object'&&v?('object{'+Object.keys(v).slice(0,15).join(',')+'}'):String(v).slice(0,80)); } return JSON.stringify(out).slice(0,2500)})()`));
    console.log('WELCOME currentPlan:', await ev(`JSON.stringify(window.__byKeys('currentPlan').inst.data.currentPlan)`));
    console.log('WELCOME methods:', await ev(`JSON.stringify(window.__methods(window.__byKeys('currentPlan').inst))`));
    console.log('TEMPLATES:', await ev(`(()=>{const c=window.__byKeys('allItems','categories'); const d=c.inst.data; const items=d.allItems||[]; const cnt=f=>{const o={};items.forEach(i=>{const x=String(i[f]);o[x]=(o[x]||0)+1});return o}; return JSON.stringify({count:items.length, categories:(d.categories||[]).map(x=>x.name||x.label||x), fields:Object.keys(items[0]||{}), premium:cnt('premium'), free:cnt('free'), aap:cnt('aap'), resolution:cnt('resolution'), cat:cnt('cat'), category:cnt('category'), sortOptions:d.sortOptions, sample:JSON.stringify(items[0]).slice(0,800), methods:window.__methods(c.inst)}).slice(0,3000)})()`));
    console.log('NEWPROJECT MODAL:', await ev(`(()=>{const c=window.__byKeys('step','resolutionCat'); return JSON.stringify({data:c.inst.data, methods:window.__methods(c.inst)}).slice(0,1500)})()`));
    // try to drive: find a method on modal that looks like select scratch
    console.log('DRIVE MODAL:', await ev(`(()=>{const c=window.__byKeys('step','resolutionCat'); const p=c.inst.proxy; const ms=window.__methods(c.inst); const m=ms.find(x=>/scratch|selectType|chooseType|setStep|goTo|next/i.test(x)); if(!m) return 'no obvious method: '+ms.join(','); try{ const r=p[m]('scratch'); return 'called '+m+' -> '+String(r).slice(0,100)+' step='+c.inst.data.step; }catch(e){return 'err '+m+': '+e.message}})()`));
    await sleep(1500); await shot('modal-step2.png'); console.log('TEXT:', await text());
    console.log('MODAL DATA NOW:', await ev(`JSON.stringify(window.__byKeys('step','resolutionCat').inst.data).slice(0,600)`));
    ws.close(); process.exit(0);
  });
});});
setTimeout(()=>{console.log('TIMEOUT');process.exit(1)}, 60000);
