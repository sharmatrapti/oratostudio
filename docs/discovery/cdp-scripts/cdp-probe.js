const WebSocket = require(process.argv[2]);
const http = require('http');
http.get('http://127.0.0.1:9222/json', res => { let b=''; res.on('data', d=>b+=d); res.on('end', () => {
  const page = JSON.parse(b).find(p => p.type==='page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const pending = {};
  const send = (method, params={}) => new Promise(r => { const i=++id; pending[i]=r; ws.send(JSON.stringify({id:i,method,params})); });
  ws.on('message', m => { const j = JSON.parse(m); if (pending[j.id]) pending[j.id](j.result); });
  ws.on('open', async () => {
    const ev = async expr => (await send('Runtime.evaluate', {expression: expr, returnByValue: true})).result.value;
    console.log('TITLE:', await ev('document.title'));
    console.log('FRAMEWORK:', await ev('JSON.stringify({react: !!document.querySelector("[data-reactroot], #root, #app"), vue: !!window.Vue || !!document.querySelector("[data-v-app]"), angular: !!window.ng, root: document.body.firstElementChild && document.body.firstElementChild.outerHTML.slice(0,200)})'));
    console.log('VISIBLE TEXT (first 1500 chars):');
    console.log(await ev('document.body.innerText.replace(/\n{2,}/g,"\n").slice(0,1500)'));
    console.log('BUTTONS:', await ev('JSON.stringify([...document.querySelectorAll("button,[role=button],a")].map(b=>b.innerText.trim()).filter(Boolean).slice(0,60))'));
    console.log('INPUTS:', await ev('JSON.stringify([...document.querySelectorAll("input,textarea")].map(i=>({type:i.type,ph:i.placeholder,name:i.name})).slice(0,20))'));
    console.log('GLOBALS OF INTEREST:', await ev('JSON.stringify(Object.keys(window).filter(k=>/store|app|editor|project|render|export|ipc|electron|gsap|require/i.test(k)).slice(0,40))'));
    const shot = (await send('Page.captureScreenshot', {format:'png'})).data;
    require('fs').writeFileSync(process.argv[3], Buffer.from(shot,'base64'));
    console.log('SCREENSHOT SAVED');
    ws.close(); process.exit(0);
  });
});});
setTimeout(()=>{console.log('TIMEOUT');process.exit(1)}, 20000);
