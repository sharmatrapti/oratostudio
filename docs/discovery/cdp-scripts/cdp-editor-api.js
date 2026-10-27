const WebSocket = require('D:/workspaces/OMD_dash/dash.ohmydog.rocks/node_modules/ws');
const http = require('http'); const fs=require('fs');
http.get('http://127.0.0.1:9222/json', res => { let b=''; res.on('data', d=>b+=d); res.on('end', () => {
  const page = JSON.parse(b).find(p => p.type==='page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const pending = {};
  const send = (method, params={}) => new Promise(r => { const i=++id; pending[i]=r; ws.send(JSON.stringify({id:i,method,params})); });
  ws.on('message', m => { const j = JSON.parse(m); if (pending[j.id]) pending[j.id](j.result); });
  ws.on('open', async () => {
    const ev = async expr => { const r = await send('Runtime.evaluate', {expression: expr, returnByValue: true, awaitPromise: true}); if(!r||!r.result) return JSON.stringify(r); if(r.exceptionDetails) return 'EXC: '+(r.exceptionDetails.exception&&r.exceptionDetails.exception.description||r.exceptionDetails.text||'').slice(0,300); return r.result.value ?? r.result.description; };
    const ED = `window.__tree(12).find(x=>x.ks.includes('project')&&x.ks.includes('media')).inst`;
    const allMethods = await ev(`JSON.stringify(Object.keys(${ED}.type.methods))`);
    fs.writeFileSync(process.argv[2]+'/editor-methods.json', allMethods);
    const ms = JSON.parse(allMethods);
    console.log('EDITOR METHOD COUNT:', ms.length);
    console.log('ADD/CREATE/INSERT:', ms.filter(m=>/^(add|create|insert|import|append|new)/i.test(m)).join(', '));
    console.log('PUBLISH/RENDER/EXPORT/SAVE:', ms.filter(m=>/publish|render|export|save|queue|ffmpeg|encode|snapshot/i.test(m)).join(', '));
    console.log('TEXT/FONT:', ms.filter(m=>/text|font/i.test(m)).slice(0,40).join(', '));
    console.log('AUDIO/VOICE:', ms.filter(m=>/audio|voice|sound|music|volume/i.test(m)).join(', '));
    console.log('SCENE/TRACK/ELEMENT:', ms.filter(m=>/scene|track|element|container|group/i.test(m)).slice(0,60).join(', '));
    console.log('ANIMATION/TRANSITION/EFFECT:', ms.filter(m=>/anim|transition|effect|preset/i.test(m)).slice(0,40).join(', '));
    console.log('TOPBAR METHODS (saveProject comp):', await ev(`JSON.stringify(Object.keys(window.__tree(12).find(x=>x.ks.includes('saving')&&x.ks.includes('shapes')).inst.type.methods))`));
    console.log('PUBLISH SRC:', await ev(`(()=>{const m=${ED}.type.methods; const k=Object.keys(m).find(x=>/^publish/i.test(x))||Object.keys(m).find(x=>/publish/i.test(x)); return k? k+' => '+m[k].toString().slice(0,1200) : 'no publish method on editor; search others: '+JSON.stringify(window.__tree(12).filter(x=>Object.keys(x.inst.type.methods||{}).some(mm=>/publish/i.test(mm))).map(x=>({n:x.n,ks:x.ks.slice(0,8),ms:Object.keys(x.inst.type.methods).filter(mm=>/publish|render|export|start|queue/i.test(mm))})))})()`));
    console.log('PROJECT NOW:', await ev(`(()=>{const p=${ED}.data.project; const sum=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,Array.isArray(v)?'array['+v.length+']':typeof v==='object'&&v?'object{'+Object.keys(v).slice(0,14).join(',')+'}':JSON.stringify(v)])); return JSON.stringify({project:sum(p), settings:p.settings, ui:Object.keys(${ED}.data.ui||{}), tracks:p.tracks.map(t=>({id:t.id,n:(t.elements||[]).length}))})})()`));
    console.log('ADD-TEXT-LIKE SRC:', await ev(`(()=>{const m=${ED}.type.methods; const k=Object.keys(m).find(x=>/^addText$|^addTextElement|^addElement$|^addObject$|^addToCanvas/i.test(x)); return k? k+' => '+m[k].toString().slice(0,900) : 'none of addText/addElement found'})()`));
    ws.close(); process.exit(0);
  });
});});
setTimeout(()=>{console.log('TIMEOUT');process.exit(1)}, 60000);
