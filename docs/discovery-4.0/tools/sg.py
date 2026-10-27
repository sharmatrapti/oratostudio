import re, sys
# usage: sg.py file pattern [n] [before] [after]
base = r"C:/Users/incre/AppData/Local/Temp/claude/D--workspaces-createstudio/6a0129f7-da4c-4539-ad78-a9792d86699d/scratchpad/asar4/"
f = sys.argv[1]
if f == 'idx': f = base + 'dist__electron__index.js.dejoined.js'
elif f == 'rw': f = base + 'dist__electron__rendering-worker.js.dejoined.js'
elif f == 'main': f = base + 'dist__electron__main.js.dejoined.js'
elif f == 'ew': f = base + 'dist__electron__editor-worker.js.dejoined.js'
pat = sys.argv[2]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 3
before = int(sys.argv[4]) if len(sys.argv) > 4 else 300
after = int(sys.argv[5]) if len(sys.argv) > 5 else 1200
s = open(f, 'rb').read().decode('utf-8', 'ignore')
ms = list(re.finditer(pat, s))
print(f'##### {pat}: {len(ms)} hits')
for m in ms[:n]:
    print(f'--- @{m.start()}')
    print(s[max(0, m.start()-before):m.end()+after].replace('\n', ' '))
    print()
