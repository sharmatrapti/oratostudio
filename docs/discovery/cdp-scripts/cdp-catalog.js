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
    const R = `window.__tree(2)[0].inst`;
    const cat = await ev(`(()=>{const r=${R}.data.resources; const all=r.all; const byType={}; all.forEach(i=>{byType[i.type]=(byType[i.type]||0)+1}); const flags={}; all.forEach(i=>Object.keys(i).forEach(k=>flags[k]=(flags[k]||0)+1)); const main=r.mainCategories.map(m=>{const cats=r.categories.filter(c=>c.parentCode===m.code||c.parentId===m.id); const n=cats.reduce((s,c)=>s+((c.items&&c.items.length)||0),0); return {code:m.code,name:m.name,isStudio:m.isStudio,subcats:cats.length,items:n}}); const sub=r.subSubCategories.map(s=>s.name); const dl=Object.keys(r.downloaded).length; const themes={}; all.forEach(i=>(i.themes||[]).forEach(t=>themes[t]=(themes[t]||0)+1)); const premiumish=Object.keys(flags).filter(k=>/prem|aap|free|price|plan|lock|pro/i.test(k)); const sample=all.find(i=>i.type==='character'||/char/i.test(i.type))||all[100]; return JSON.stringify({total:all.length, byType, allFields:Object.keys(flags), premiumFields:premiumish, mainCategories:main, subSubCategories:sub, downloaded:dl, topThemes:Object.entries(themes).sort((a,b)=>b[1]-a[1]).slice(0,15), sample:JSON.stringify(sample).slice(0,700)}, null, 1)})()`);
    fs.writeFileSync(process.argv[2]+'/catalog-summary.json', cat); console.log('CATALOG:', cat.slice(0,3500));
    // categories detail for the biggest main cats
    const cats = await ev(`(()=>{const r=${R}.data.resources; return JSON.stringify(r.categories.map(c=>({parent:c.parentCode, name:c.name, n:(c.items||[]).length})).filter(c=>c.n>0))})()`);
    fs.writeFileSync(process.argv[2]+'/catalog-categories.json', cats);
    console.log('TEMPLATES COMP:', await ev(`(()=>{const c=window.__tree(10).find(x=>x.ks.includes('allItems')); if(!c) return 'nf'; const d=c.inst.data; const items=d.allItems||[]; const cnt=f=>{const o={};items.forEach(i=>{const x=String(i[f]);o[x]=(o[x]||0)+1});return o}; return JSON.stringify({count:items.length, categories:(d.categories||[]).map(x=>x.name||x.label||x).slice(0,20), fields:Object.keys(items[0]||{}), premium:cnt('premium'), isPremium:cnt('isPremium'), aap:cnt('aap'), resolution:cnt('resolution'), sortOptions:d.sortOptions, methods:window.__methods(c.inst)}).slice(0,1800)})()`));
    // Create blank project via method
    console.log('CREATE PROJECT:', await ev(`(()=>{const c=window.__tree(10).find(x=>x.ks.includes('step')&&x.ks.includes('resolutionCat')); try{ const r=c.inst.proxy.clickCreateProject(); return 'called -> '+String(r).slice(0,80)}catch(e){return 'err '+e.message}})()`));
    await sleep(9000); await shot('editor.png');
    console.log('ROUTE:', await ev(`document.querySelector('#app').__vue_app__.config.globalProperties.$route.fullPath`));
    console.log('TEXT:', await text());
    const tree = await ev(`window.__tree(12).filter(x=>x.ks.length||window.__methods(x.inst).length).map(x=>' '.repeat(x.d)+x.n+' | data: '+x.ks.slice(0,30).join(',')+' | methods: '+window.__methods(x.inst).slice(0,60).join(',')).join(String.fromCharCode(10))`);
    fs.writeFileSync(process.argv[2]+'/editor-tree.txt', tree); console.log('EDITOR TREE (first 3500):', tree.slice(0,3500));
    ws.close(); process.exit(0);
  });
});});
setTimeout(()=>{console.log('TIMEOUT');process.exit(1)}, 90000);
