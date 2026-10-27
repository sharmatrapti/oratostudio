// CreateStudio 4 discovery probe over CDP.
// usage: node cdp-probe4.js <path-to-ws-module> <port> <out-dir>
// Dumps: app metadata, Vue global properties, routes, component tree (names + data keys + methods),
// resources/catalog summary, user/plan keys (values redacted), AI/voice/caption-related method names.
const WebSocket = require(process.argv[2]);
const port = process.argv[3] || '9223';
const outDir = process.argv[4] || '.';
const fs = require('fs');
const path = require('path');
const http = require('http');

http.get(`http://127.0.0.1:${port}/json`, res => {
  let b = '';
  res.on('data', d => b += d);
  res.on('end', async () => {
    const targets = JSON.parse(b);
    fs.writeFileSync(path.join(outDir, 'targets.json'), JSON.stringify(targets, null, 1));
    const page = targets.find(p => p.type === 'page' && /CreateStudio/.test(p.title) && !/render-tray|devtools/.test(p.url)) || targets.find(p => p.type === 'page' && !/render-tray|devtools/.test(p.url)) || targets[0];
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    let id = 0; const pending = {};
    const send = (method, params = {}) => new Promise(r => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
    ws.on('message', m => { const j = JSON.parse(m); if (pending[j.id]) pending[j.id](j.result); });
    ws.on('open', async () => {
      const ev = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        if (r && r.exceptionDetails) return { __error: r.exceptionDetails.text, detail: r.exceptionDetails.exception && r.exceptionDetails.exception.description };
        return r && r.result ? r.result.value : r;
      };
      const out = {};
      out.title = await ev('document.title');
      out.url = await ev('location.href');
      out.versions = await ev('JSON.stringify((window.process && window.process.versions) || (window.require ? window.require("process").versions : null))');
      out.nodeIntegration = await ev('typeof window.require === "function"');
      out.appVersion = await ev('(function(){try{return window.require("electron").remote.app.getVersion()}catch(e){try{return window.require("@electron/remote").app.getVersion()}catch(e2){return "n/a: "+e2.message}}})()');
      out.rootSelectors = await ev('JSON.stringify([...document.body.children].map(e=>e.tagName+"#"+e.id+"."+e.className).slice(0,10))');
      out.vueApp = await ev('(function(){const el=document.querySelector("#app")||document.body.firstElementChild;const a=el&&el.__vue_app__;if(!a)return "no __vue_app__";return JSON.stringify({version:a.version,globals:Object.keys(a.config.globalProperties||{})})})()');
      out.routes = await ev('(function(){try{const a=document.querySelector("#app").__vue_app__;const r=a.config.globalProperties.$router;return JSON.stringify(r.getRoutes().map(x=>({path:x.path,name:x.name})))}catch(e){return "err "+e.message}})()');
      out.pinia = await ev('(function(){try{const a=document.querySelector("#app").__vue_app__;const p=a.config.globalProperties.$pinia;return p?JSON.stringify(Object.keys(p.state.value)):"no pinia";}catch(e){return "err "+e.message}})()');
      out.settingsKeys = await ev('(function(){try{const s=document.querySelector("#app").__vue_app__.config.globalProperties.$settings;return JSON.stringify({keys:Object.keys(s),defaultTypes:s.default?Object.keys(s.default):null,publishingFormats:s.publishingFormats})}catch(e){return "err "+e.message}})()');
      out.helpersKeys = await ev('(function(){try{const h=document.querySelector("#app").__vue_app__.config.globalProperties.$helpers;return JSON.stringify(Object.fromEntries(Object.entries(h).map(([k,v])=>[k,typeof v==="object"&&v?Object.keys(v):typeof v])))}catch(e){return "err "+e.message}})()');
      // Component tree walk
      out.tree = await ev(`(function(){
        const root=document.querySelector("#app")._vnode.component; const lines=[]; const aiHits=[];
        const AI=/ai|tts|speech|voice|narrat|caption|subtitle|lip|sync|credit|eleven|openai|script|story|short|explainer|vsl|hook|avatar|magic|whisper|transcri|generate/i;
        function walk(c,depth){ if(!c||depth>40)return; const name=(c.type&&(c.type.name||c.type.__name))||'anon';
          const data=c.data&&typeof c.data==='object'?Object.keys(c.data):[]; const methods=c.type&&c.type.methods?Object.keys(c.type.methods):[];
          const setup=c.setupState&&typeof c.setupState==='object'?Object.keys(c.setupState):[];
          lines.push(' '.repeat(depth)+name+' | data: '+data.join(',')+' | setup: '+setup.join(',')+' | methods: '+methods.join(','));
          for(const m of [...methods,...data,...setup]) if(AI.test(m)) aiHits.push(name+'.'+m);
          const sub=c.subTree; function walkVnode(v){ if(!v)return; if(v.component){walk(v.component,depth+1);return;} if(Array.isArray(v.children)) v.children.forEach(walkVnode); if(v.suspense) walkVnode(v.suspense.activeBranch); }
          walkVnode(sub);
        }
        walk(root,0); return JSON.stringify({count:lines.length,lines,aiHits:[...new Set(aiHits)]});
      })()`);
      out.resources = await ev(`(function(){try{const root=document.querySelector("#app")._vnode.component; const d=root.data||{}; const keys=Object.keys(d);
        let res=d.resources; let summary=null; if(res){ const all=res.all||res.items||res; if(Array.isArray(all)){ const byType={}; for(const it of all){byType[it.type]=(byType[it.type]||0)+1;} summary={total:all.length,byType,fields:Object.keys(all[0]||{})}; } else summary={keys:Object.keys(res)}; }
        const user=d.user?JSON.stringify(d.user,(k,v)=>/token|password|secret|email|session|key/i.test(k)?'<redacted>':v).slice(0,3000):null;
        return JSON.stringify({rootDataKeys:keys,resources:summary,user});}catch(e){return "err "+e.message}})()`);
      out.bodyText = await ev('document.body.innerText.replace(/\\n{2,}/g,"\\n").slice(0,2500)');
      out.buttons = await ev('JSON.stringify([...document.querySelectorAll("button,[role=button],a,.btn")].map(b=>b.innerText.trim()).filter(Boolean).slice(0,120))');
      const shot = (await send('Page.captureScreenshot', { format: 'png' })).data;
      fs.writeFileSync(path.join(outDir, 'screen.png'), Buffer.from(shot, 'base64'));
      fs.writeFileSync(path.join(outDir, 'probe.json'), JSON.stringify(out, null, 1));
      // Human-readable summary
      for (const [k, v] of Object.entries(out)) {
        if (k === 'tree') { const t = JSON.parse(v); console.log('TREE components:', t.count); console.log('AI HITS:', JSON.stringify(t.aiHits)); fs.writeFileSync(path.join(outDir, 'component-tree.txt'), t.lines.join('\n')); continue; }
        console.log(k.toUpperCase() + ':', typeof v === 'string' ? v.slice(0, 1500) : JSON.stringify(v).slice(0, 1500));
      }
      ws.close(); process.exit(0);
    });
  });
}).on('error', e => { console.log('HTTP ERROR', e.message); process.exit(2); });
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 40000);
