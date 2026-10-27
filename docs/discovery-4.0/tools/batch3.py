import re,sys,collections
F='asar4/dist__electron__index.js.dejoined.js'
d=open(F,encoding='utf-8',errors='replace').read()
out=open('rev/b3.txt','w',encoding='utf-8',errors='replace')
def W(*a): print(*a,file=out)
def ctx(pat,b,a,mx=3,flags=0):
    n=0
    for m in re.finditer(pat,d,flags):
        W(f'--- @{m.start()} ---'); W(d[max(0,m.start()-b):m.end()+a]); n+=1
        if n>=mx: break
    W(f'[{n} of {len(re.findall(pat,d,flags))}]')
def keys_depth1(blob):
    depth=0;keys=[];j=1
    while j<len(blob):
        c=blob[j]
        if c in '{[':depth+=1
        elif c in '}]':depth-=1
        elif depth==0 and c=="'":
            k=re.match(r"'([^']+)':",blob[j:])
            if k: keys.append(k.group(1)); j+=len(k.group(0))-1
        elif depth==0 and c=="'" : pass
        j+=1
    return keys
def match_obj(start):
    depth=0;i=start
    while True:
        c=d[i]
        if c=='{':depth+=1
        elif c=='}':
            depth-=1
            if depth==0:return d[start:i+1]
        i+=1
# find enclosing object of fxs
p=d.find("'fxs':{'base-particles-up'")
depth=0;i=p
while i>0:
    c=d[i]
    if c=='}':depth+=1
    elif c=='{':
        if depth==0:break
        depth-=1
    i-=1
settings=match_obj(i)
W('##### $settings start@',i,'len',len(settings)); W('prefix:',d[i-80:i])
sk=keys_depth1(settings); W('keys:',sk)
open('rev/settings.txt','w',encoding='utf-8',errors='replace').write(settings)
m=re.search(r"'default':\{",settings)
if m:
    dflt=match_obj(i+m.start()+len("'default':"))
    tk=keys_depth1(dflt); W('default types:',len(tk),tk)
    open('rev/settings_default.txt','w',encoding='utf-8',errors='replace').write(dflt)
    # per-type keys
    j=1
    for t in tk:
        mm=re.search(r"'"+re.escape(t)+r"':\{",dflt)
        if mm:
            o=match_obj(i+m.start()+len("'default':")+mm.start()+len(t)+3)
            W(f'  [{t}] ({len(o)}):',keys_depth1(o))
# other settings keys worth dumping
for k in ['easings','fonts','effects','transitions','glTransitions','captions','hookTitle','version','animationPresets','particles','chartTypes','deviceTypes','audioVisualizer','typewriter']:
    mm=re.search(r"'"+k+r"':",settings)
    if mm: W(f'-- settings.{k}:',settings[mm.start():mm.start()+700])

W('\n##### full preset def in-slide-right')
ctx(r"'id':'in-slide-right','name':'Right','cat':'position'",10,900,1)
ctx(r"'properties':\[\{'name':'",300,1200,2)
ctx(r"'id':'loop-blink'",300,1500,1)
ctx(r"'id':'in-fade'",10,600,1)

W('\n##### hookTitle / captions')
ctx(r"hookTitle",200,600,4)
ctx(r"'startTime':_0x[0-9a-f]+,'endTime'",400,400,3)
ctx(r"'words':\[",300,500,3)
ctx(r"'alternatives'\]\[0x0\]\['words'\]",300,500,2)

W('\n##### per-effect settings')
for e in ['doodle','reveal','blur','twirl','hue','overlay','glitch','turbulence','jittering','wave','green-screen','clip-speed','filters','color-correction','sharpness','color-remove','color-replace','edge-feather','inner-shadow']:
    m=re.search(r"'effect':'"+e+r"','settings':\{",d)
    if m: W(f'[{e}]', match_obj(m.end()-1)[:700])
    else:
        m=re.search(r"'effect':'"+e+"'",d); W(f'[{e}] no settings literal; ctx:', d[m.start()-150:m.end()+250] if m else None)

W('\n##### glTransitions on elements / camera / media')
ctx(r"'glTransition':\{",300,600,2)
ctx(r"'transition':\{'",300,600,2)
ctx(r"updateGlTransitionsIDs'\]?\s*[:(]",50,900,1)
ctx(r"'startingNode':!0x0",500,500,2)
ctx(r"'camera':\[\{",100,700,2)
ctx(r"'importing':!0x0",600,600,2)
ctx(r"'files':\{'",300,500,3)
ctx(r"paths'\]\['scenes'\]",300,700,4)
ctx(r"paths'\]\['basicTemplates'\]",300,700,3)
ctx(r"'addTransition'\]?\s*[:(]",50,1200,1)
ctx(r"getMissingCustomFonts'\]?\s*[:(]",50,900,1)
out.close()
