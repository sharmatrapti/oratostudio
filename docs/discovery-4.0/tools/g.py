import sys, re, io
# usage: g.py file pattern [before] [after] [max]
f=sys.argv[1]; pat=sys.argv[2]; b=int(sys.argv[3]) if len(sys.argv)>3 else 150; a=int(sys.argv[4]) if len(sys.argv)>4 else 300; mx=int(sys.argv[5]) if len(sys.argv)>5 else 10
data=open(f,encoding='utf-8',errors='replace').read()
n=0
for m in re.finditer(pat,data):
    s=max(0,m.start()-b); e=min(len(data),m.end()+a)
    print(f"--- @{m.start()} ---"); print(data[s:e].replace('\n','\n')); n+=1
    if n>=mx: break
print(f"[{n} shown; total {len(re.findall(pat,data))}]")
