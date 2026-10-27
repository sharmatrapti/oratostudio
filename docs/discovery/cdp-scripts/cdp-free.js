const WebSocket = require('D:/workspaces/OMD_dash/dash.ohmydog.rocks/node_modules/ws');
const http = require('http');
http.get('http://127.0.0.1:9222/json', res => { let b=''; res.on('data', d=>b+=d); res.on('end', () => {
  const page = JSON.parse(b).find(p => p.type==='page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const pending = {};
  const send = (method, params={}) => new Promise(r => { const i=++id; pending[i]=r; ws.send(JSON.stringify({id:i,method,params})); });
  ws.on('message', m => { const j = JSON.parse(m); if (pending[j.id]) pending[j.id](j.result); });
  ws.on('open', async () => {
    const ev = async expr => { const r = await send('Runtime.evaluate', {expression: expr, returnByValue: true, awaitPromise: true}); if(!r||!r.result) return JSON.stringify(r); if(r.exceptionDetails) return 'EXC: '+(r.exceptionDetails.exception&&r.exceptionDetails.exception.description||'').slice(0,300); return r.result.value ?? r.result.description; };
    const R = `window.__tree(2)[0].inst`;
    console.log(await ev(`(()=>{const r=${R}.data.resources; const all=r.all; const out={}; all.forEach(i=>{const t=i.type; out[t]=out[t]||{free:0,paid:0,unset:0}; out[t][i.free===true?'free':i.free===false?'paid':'unset']++}); const main={}; r.mainCategories.forEach(m=>{const cats=r.categories.filter(c=>c.parentCode===m.code); let f=0,p=0,u=0; cats.forEach(c=>(c.items||[]).forEach(id=>{const it=r.byId[id]; if(!it){u++;return;} it.free===true?f++:it.free===false?p++:u++;})); main[m.code]={free:f,paid:p,unset:u}}); const u=${R}.data.user.userInfo||{}; const lic={expireAt:u.expireAt, monthlyExpireAt:u.monthlyExpireAt, plan:u.plan||u.planName||u.idProduct, aap:u.aap||u.allAccess||u.hasAAP, keys:Object.keys(u)}; return JSON.stringify({byType:out, byMainCategory:main, license:lic}, null, 1)})()`));
    console.log('TAG SAMPLE (characters):', await ev(`(()=>{const r=${R}.data.resources; const cat=r.categories.find(c=>c.parentCode==='characters'&&c.name==='Supreme'); const it=r.byId[cat.items[0]]; return JSON.stringify(it).slice(0,900)})()`));
    console.log('SCENE SAMPLE (video-builder-standard):', await ev(`(()=>{const r=${R}.data.resources; const cat=r.categories.find(c=>c.parentCode==='video-builder-standard'); const it=r.byId[cat.items[0]]; return cat.name+' :: '+JSON.stringify(it).slice(0,700)})()`));
    ws.close(); process.exit(0);
  });
});});
setTimeout(()=>{console.log('TIMEOUT');process.exit(1)}, 60000);
