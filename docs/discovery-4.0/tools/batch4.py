import re,collections
F='asar4/dist__electron__index.js.dejoined.js'
d=open(F,encoding='utf-8',errors='replace').read()
S=open('rev/settings.txt',encoding='utf-8',errors='replace').read()
out=open('rev/b4.txt','w',encoding='utf-8',errors='replace')
def W(*a): print(*a,file=out)
def ctx(pat,b,a,mx=3,src=None):
    src=src or d; n=0
    for m in re.finditer(pat,src):
        W(f'--- @{m.start()} ---'); W(src[max(0,m.start()-b):m.end()+a]); n+=1
        if n>=mx: break
    W(f'[{n} of {len(re.findall(pat,src))}]')
def match_obj(src,start):
    depth=0;i=start
    while True:
        c=src[i]
        if c in '{[':depth+=1
        elif c in '}]':
            depth-=1
            if depth==0:return src[start:i+1]
        i+=1
W('##### default.effects')
m=re.search(r"'effects':\{'overlay':\{",S); W(match_obj(S,m.end()-len("{'overlay':{")) )
W('\n##### hookTitleSettings'); m=re.search(r"'hookTitleSettings':\{",S); W(match_obj(S,m.end()-1)[:2500])
W('\n##### transitionCategories'); m=re.search(r"'transitionCategories':",S); W(S[m.start():m.start()+1200])
W('\n##### blending'); m=re.search(r"'blending':",S); W(S[m.start():m.start()+400])
W('\n##### buttonPresets/carouselPresets/progressBarPresets heads')
for k in ['buttonPresets','carouselPresets','progressBarPresets','publishingFormats','canvas','timeline']:
    m=re.search(r"'"+k+r"':",S); W(f'-- {k}:',S[m.start():m.start()+600])
W('\n##### default.chart/carouselNew/deviceComponent/textbox/video/placeholder full')
D=open('rev/settings_default.txt',encoding='utf-8',errors='replace').read()
for k in ['video','placeholder','particles','camera','carouselItem','project']:
    m=re.search(r"'"+k+r"':\{",D); W(f'-- {k}:',match_obj(D,m.end()-1)[:1700])

W('\n##### glTransition keys'); W(collections.Counter(re.findall(r"'(glTransition[A-Za-z]*)'",d)))
ctx(r"'glTransitionName'\]=|'glTransitionName':",400,500,2)
W('\n##### captions assignment'); ctx(r"\['captions'\]=\{",300,600,3); ctx(r"'captions':\{'sentences'",200,800,2)
ctx(r"'captionsPreset'|'captionPreset'|'captionsStyle'",300,500,3)
W('\n##### chart'); ctx(r"'chartType':",400,900,2); ctx(r"'datasets':\[",300,600,2)
W('\n##### carouselInfo'); ctx(r"'carouselInfo':\[",300,800,2); ctx(r"carouselInfo'\]\['push'\]\(",300,600,2)
W('\n##### deviceComponent'); ctx(r"'addDeviceComponent'\]?\s*[:(]",50,1200,1); ctx(r"'deviceName':|'deviceType':",300,500,2)
W('\n##### media imported'); ctx(r"'onMediaImported'\]?\s*[:(]",50,1500,1)
W('\n##### custom keyframe anims'); ctx(r"'type':'custom','time'",300,500,3); ctx(r"'addKeyframe'\]?\s*[:(]",50,900,1)
W('\n##### info.json'); ctx(r"'info\.json'",300,500,6)
W('\n##### sprite'); ctx(r"'spriteTimeline':\[",300,600,2); ctx(r"'loadAllSpritesFrames'\]?\s*[:(]",50,900,1)
W('\n##### typewriter sentenceArrayInfo'); m=re.search(r"'sentenceArrayInfo':\[",D); W(D[m.start():m.start()+500])
W('\n##### text element font'); m=re.search(r"'text':\{'objType'",D); W(match_obj(D,m.end()-len("{'objType'")) )
W('\n##### audioVisualizer styles'); W(collections.Counter(re.findall(r"'visualizerStyle':'([a-z-]+)'",d)))
W('\n##### api catalog-ish endpoints'); W(collections.Counter(re.findall(r"API(?:_V2)?_BASE_URL'\]\+'([a-zA-Z0-9/_-]+)",d)).most_common(40))
out.close()
