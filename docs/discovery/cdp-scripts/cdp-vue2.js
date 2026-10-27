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
    const GP = `document.querySelector('#app').__vue_app__.config.globalProperties`;
    const keysOf = (o) => `(()=>{const o=${o}; if(!o) return 'undefined'; const ks=new Set(); let p=o; while(p&&p!==Object.prototype){Object.getOwnPropertyNames(p).forEach(k=>ks.add(k)); p=Object.getPrototypeOf(p);} return JSON.stringify([...ks].filter(k=>k!=='constructor').slice(0,300))})()`;
    console.log('$ipc keys:', await ev(keysOf(`${GP}.$ipc`)));
    console.log('$helpers keys:', await ev(keysOf(`${GP}.$helpers`)));
    console.log('$settings keys:', await ev(keysOf(`${GP}.$settings`)));
    console.log('$userSettings keys:', await ev(keysOf(`${GP}.$userSettings`)));
    console.log('$eventBus keys:', await ev(keysOf(`${GP}.$eventBus`)));
    console.log('$eventBus registered events:', await ev(`(()=>{const e=${GP}.$eventBus; const cand=e.all||e._events||e.events||e.listeners||e.callbacks||e.e; if(!cand) return 'n/a keys='+Object.keys(e); return JSON.stringify(cand instanceof Map?[...cand.keys()]:Object.keys(cand))})()`));
    console.log('IPC channels with listeners (renderer):', await ev(`(()=>{const ipc=window.require('electron').ipcRenderer; return JSON.stringify(ipc.eventNames().slice(0,200))})()`));
    console.log('Current route:', await ev(`${GP}.$route.fullPath`));
    console.log('Root component data keys:', await ev(`(()=>{const inst=document.querySelector('#app').__vue_app__._instance; const ks=[]; const walk=(c,d)=>{if(!c||d>3)return; ks.push({name:c.type&&(c.type.name||c.type.__name||(c.type.__file||'').split(/[\\/]/).pop()), data:Object.keys(c.data||{}).slice(0,25), setup:Object.keys(c.setupState||{}).slice(0,25)}); const sub=c.subTree; const kids=[]; const collect=(v)=>{if(!v)return; if(v.component) kids.push(v.component); if(Array.isArray(v.children)) v.children.forEach(collect);}; collect(sub); kids.forEach(k=>walk(k,d+1));}; walk(inst,0); return JSON.stringify(ks.filter(k=>k.data.length||k.setup.length).slice(0,20))})()`));
    console.log('Process info:', await ev(`(()=>{const p=window.process; return JSON.stringify({versions:{electron:p.versions.electron,node:p.versions.node,chrome:p.versions.chrome}, resourcesPath:p.resourcesPath, argv:p.argv})})()`));
    console.log('Main process modules via remote:', await ev(`(()=>{try{const r=window.require('electron').remote; const app=r.app; return JSON.stringify({appPath:app.getAppPath(), userData:app.getPath('userData'), remoteGlobalKeys:Object.keys(r.getGlobal('process').env).filter(k=>/CS|CREATE|API|KEY|URL/i.test(k)).slice(0,20)})}catch(e){return 'remote err: '+e.message}})()`));
    ws.close(); process.exit(0);
  });
});});
setTimeout(()=>{console.log('TIMEOUT');process.exit(1)}, 30000);
