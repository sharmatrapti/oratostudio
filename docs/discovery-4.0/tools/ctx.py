import sys, re
path, pat = sys.argv[1], sys.argv[2]
before = int(sys.argv[3]) if len(sys.argv)>3 else 200
after = int(sys.argv[4]) if len(sys.argv)>4 else 600
maxn = int(sys.argv[5]) if len(sys.argv)>5 else 8
data = open(path, encoding='utf-8', errors='replace').read()
n=0
for m in re.finditer(pat, data):
    n+=1
    if n>maxn: print(f"... more matches (showing {maxn})"); break
    s=max(0,m.start()-before); e=min(len(data), m.end()+after)
    print(f"=== @{m.start()} ===")
    print(data[s:e].replace('\n',' '))
    print()
print(f"total matches: {len(re.findall(pat, data))}")
