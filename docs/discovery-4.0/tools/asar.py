import json, struct, sys, os
A = r"D:/apps/CreateStudio4/resources/app.asar"
def header():
    with open(A,'rb') as fh:
        fh.seek(8); hs = struct.unpack('<I', fh.read(4))[0]; fh.read(4)
        raw = fh.read(hs)
    j = json.loads(raw[:raw.rfind(b'}')+1])
    return j, hs
def walk(node, path, out):
    for k, v in node.get('files', {}).items():
        p = path + '/' + k
        if 'files' in v: walk(v, p, out)
        else: out.append((p, v))
def read(entry):
    j, hs = header()
    if entry.get('unpacked'):
        return open(r"D:/apps/CreateStudio4/resources/app.asar.unpacked" + entry['_p'], 'rb').read()
    with open(A,'rb') as fh:
        fh.seek(8 + hs + 4 + int(entry['offset']))
        return fh.read(entry['size'])
if __name__ == '__main__':
    j, hs = header()
    out = []; walk(j, '', out)
    cmd = sys.argv[1]
    if cmd == 'ls':
        pre = sys.argv[2]
        for p, v in out:
            if p.startswith(pre): print(p, v.get('size'), 'U' if v.get('unpacked') else '')
    elif cmd == 'cat':
        p = sys.argv[2]
        for pp, v in out:
            if pp == p:
                v['_p'] = pp
                sys.stdout.buffer.write(read(v)[:int(sys.argv[3]) if len(sys.argv)>3 else 20000])
    elif cmd == 'grep':
        import re
        for p, v in out:
            if re.search(sys.argv[2], p, re.I): print(p, v.get('size'))
