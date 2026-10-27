import re,sys,collections,json
F='asar4/dist__electron__index.js.dejoined.js'
d=open(F,encoding='utf-8',errors='replace').read()
out=open('rev/b2.txt','w',encoding='utf-8',errors='replace')
def W(*a): print(*a,file=out)
def ctx(pat,b,a,mx=5,flags=0):
    n=0
    for m in re.finditer(pat,d,flags):
        W(f'--- @{m.start()} ---'); W(d[max(0,m.start()-b):m.end()+a]); n+=1
        if n>=mx: break
    W(f'[{n} of {len(re.findall(pat,d,flags))}]')

W('##### A. preset catalogue entries (id,name,cat,basicSettings,ease)')
seg=d[6040000:6080000]
for m in re.finditer(r"\{'id':'([a-z0-9-]+)','name':'([^']*)','cat':'([a-z]+)','basicSettings':\[([^\]]*)\]",seg):
    W(m.group(1),'|',m.group(2),'|',m.group(3),'|',m.group(4).replace("'",''))
W('-- loop-ish presets anywhere:')
ids=collections.Counter(re.findall(r"'id':'(loop-[a-z0-9-]+)'",d)); W(dict(ids))
W('-- out presets:'); W(sorted(set(re.findall(r"'id':'(out-[a-z0-9-]+)'",d))))
W('-- in presets:'); W(sorted(set(re.findall(r"'id':'(in-[a-z0-9-]+)'",d))))
W('-- splitTextType values:',collections.Counter(re.findall(r"'splitTextType':'([a-z]+)'",d)))
W('-- splitTextDirection values:',collections.Counter(re.findall(r"'splitTextDirection':'([a-z]+)'",d)))
W('-- animation type values:',collections.Counter(re.findall(r"'type':'(in|out|loop|combo)'",d)))

W('\n##### C. distinct effect names')
W(collections.Counter(re.findall(r"'effect':'([a-zA-Z0-9_-]+)'",d)).most_common(60))
W('-- effect ids list candidates:'); ctx(r"'effects':\[\{'id':'[a-z]",200,1500,2)
W('-- glTransitions names'); ctx(r"glTransitions?'?\]?\s*[:=]\s*\[",100,1200,2)

W('\n##### D. GSAP timeline')
ctx(r"'animationsTimeline'\]?\s*[:(=]",200,1500,2)
ctx(r"'createTimeline'\]?\s*[:(]",100,1800,2)
ctx(r"'animationsValues'\]?\s*[:(=]",100,1200,2)
ctx(r"'loop'==_0x[0-9a-f]+\['type'\]",600,900,3)
ctx(r"'cameraTimeline'\]?\s*[:(=]",100,1500,2)
ctx(r"SplitText|splitText\(",100,800,3)

W('\n##### E. captions / hookTitle')
ctx(r"'hookTitle':\{",300,1200,2)
ctx(r"'sentences':\[",400,900,3)
ctx(r"'captionsStyle'|'captionStyle'|captions-presets",300,900,4)

W('\n##### F. media / scenes / fonts / group')
ctx(r"'files':\{'high'",400,700,3)
ctx(r"'copyToProject'\]?\s*[:(]",100,1500,2)
ctx(r"'createProjectFromGroup'\]?\s*[:(]",100,1500,1)
ctx(r"'saveProjectAs'\]?\s*[:(]",100,900,1)
ctx(r"'missingCustomFonts'\]?\s*=",300,700,3)
ctx(r"'saveScene'\]?\s*[:(]|'saveAsScene'\]?\s*[:(]|'exportScene'\]?\s*[:(]",100,1800,3)
ctx(r"'My Scenes'|my-scenes|'scenes'\)",300,600,4)
ctx(r"basic-templates",300,700,4)

W('\n##### G. encrypt helper')
ctx(r"_0x36827a=",0,400,3)
ctx(r"\['crypto'\]\['(encrypt|decrypt)'\]",200,300,3)

W('\n##### J. variants')
ctx(r"'currentVariant'\]?\s*[:=]",300,500,3)
ctx(r"'vertical'",300,300,4)

W('\n##### B. $settings default keys')
m=re.search(r"'default':\{'text':\{",d)
W('default@',m.start() if m else None)
if m:
    s=m.start()+len("'default':")
    # brace match
    depth=0;i=s
    while True:
        c=d[i]
        if c=='{':depth+=1
        elif c=='}':
            depth-=1
            if depth==0:break
        i+=1
    blob=d[s:i+1]
    open('rev/settings_default.txt','w',encoding='utf-8',errors='replace').write(blob)
    W('default blob len',len(blob))
    # top-level keys with their size
    depth=0;keys=[];j=1
    while j<len(blob):
        c=blob[j]
        if c=='{' or c=='[':depth+=1
        elif c=='}' or c==']':depth-=1
        elif depth==0 and c=="'":
            k=re.match(r"'([^']+)':",blob[j:])
            if k: keys.append(k.group(1))
        j+=1
    W('types:',keys)
# find $settings top-level keys: go backward from 'animationProperties' to find object start? Instead list keys at depth 1 of object containing fxs
m=re.search(r"'fxs':\{'base-particles-up'",d)
W('fxs@',m.start())
out.close()
