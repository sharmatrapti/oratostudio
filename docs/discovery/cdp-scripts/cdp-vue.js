const WebSocket = require('D:/workspaces/OMD_dash/dash.ohmydog.rocks/node_modules/ws');
const http = require('http');
http.get('http://127.0.0.1:9222/json', res => { let b=''; res.on('data', d=>b+=d); res.on('end', () => {
  const page = JSON.parse(b).find(p => p.type==='page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const pending = {};
  const send = (method, params={}) => new Promise(r => { const i=++id; pending[i]=r; ws.send(JSON.stringify({id:i,method,params})); });
  ws.on('message', m => { const j = JSON.parse(m); if (pending[j.id]) pending[j.id](j.result); });
  ws.on('open', async () => {
    const ev = async expr => { const r = await send('Runtime.evaluate', {expression: expr, returnByValue: true, awaitPromise: true}); return r.result ? (r.result.value ?? r.result.description) : JSON.stringify(r); };
    // dismiss update modal
    console.log('DISMISS:', await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/Remind/i.test(x.innerText)); if(b){b.click();return 'clicked'} return 'no modal'})()`));
    await new Promise(r=>setTimeout(r,800));
    console.log('VUE APP:', await ev(`(()=>{const el=document.querySelector('#app'); const app=el&&el.__vue_app__; if(!app) return 'none'; const gp=app.config.globalProperties; const provides=Object.getOwnPropertySymbols(app._context.provides).map(s=>s.toString()).concat(Object.keys(app._context.provides)); return JSON.stringify({version:app.version, globalProps:Object.keys(gp), provides, hasStore:!!gp.$store, hasPinia:!!gp.$pinia, hasRouter:!!gp.$router})})()`));
    console.log('STORE MODULES / STATE KEYS:', await ev(`(()=>{const app=document.querySelector('#app').__vue_app__; const s=app.config.globalProperties.$store; if(s){return JSON.stringify({type:'vuex', stateKeys:Object.keys(s.state), modules:Object.keys(s._modulesNamespaceMap||{}), actions:Object.keys(s._actions||{}).slice(0,400), getters:Object.keys(s.getters||{}).slice(0,200)})} const p=app.config.globalProperties.$pinia; if(p){return JSON.stringify({type:'pinia', stores:Object.keys(p.state.value), perStore:Object.fromEntries(Object.entries(p._s||{}).map(([k,v])=>[k,{state:Object.keys(v.$state||{}),actions:Object.keys(v).filter(x=>typeof v[x]==='function'&&!x.startsWith('$')&&!x.startsWith('_'))}]))})} return 'no store'})()`));
    console.log('ROUTES:', await ev(`(()=>{const app=document.querySelector('#app').__vue_app__; const r=app.config.globalProperties.$router; return r? JSON.stringify(r.getRoutes().map(x=>x.path)) : 'no router'})()`));
    console.log('NAV ITEMS:', await ev(`JSON.stringify([...document.querySelectorAll('a,li,div[class*=menu] *')].map(x=>x.innerText&&x.innerText.trim()).filter(t=>t&&t.length<30).filter((v,i,a)=>a.indexOf(v)===i).slice(0,40))`));
    console.log('PRELOAD/IPC EXPOSED:', await ev(`JSON.stringify(Object.keys(window).filter(k=>!/^(webkit|on|chrome|__)/.test(k)).filter(k=>!(k in Object.getPrototypeOf(window))).slice(0,80))`));
    console.log('REQUIRE electron?:', await ev(`(()=>{try{const e=window.require('electron');return JSON.stringify(Object.keys(e))}catch(x){return 'require fail: '+x.message}})()`));
    console.log('REQUIRE fs/child_process?:', await ev(`(()=>{try{const fs=window.require('fs');const cp=window.require('child_process');return 'node integration ON: fs='+typeof fs.readFileSync+' spawn='+typeof cp.spawn}catch(x){return 'off: '+x.message}})()`));
    ws.close(); process.exit(0);
  });
});});
setTimeout(()=>{console.log('TIMEOUT');process.exit(1)}, 30000);
