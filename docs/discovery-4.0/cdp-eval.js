// usage: node cdp-eval.js <ws-module> <port> "<js expression>"  -> prints returnByValue result
const WebSocket = require(process.argv[2]); const http = require('http');
const port = process.argv[3]; const expr = process.argv[4];
http.get(`http://127.0.0.1:${port}/json`, res => { let b=''; res.on('data', d=>b+=d); res.on('end', () => {
  const page = (JSON.parse(b).find(p => p.type==='page' && /CreateStudio/.test(p.title) && !/render-tray|devtools/.test(p.url)) || JSON.parse(b).find(p => p.type==='page' && !/render-tray|devtools/.test(p.url)));
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  ws.on('open', () => ws.send(JSON.stringify({id:1, method:'Runtime.evaluate', params:{expression: expr, returnByValue:true, awaitPromise:true}})));
  ws.on('message', m => { const j = JSON.parse(m); if (j.id===1) { const r=j.result; if (r.exceptionDetails) console.log('EXC', JSON.stringify(r.exceptionDetails).slice(0,800)); else console.log(typeof r.result.value==='string'?r.result.value:JSON.stringify(r.result.value)); ws.close(); process.exit(0);} });
});});
setTimeout(()=>{console.log('TIMEOUT');process.exit(1)}, 30000);
