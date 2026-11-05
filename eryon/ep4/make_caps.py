# Legendas a partir da transcrição (tempos de cada palavra). Corrige "Erião" → Eryon e o @ do rei.
import json, re
T = json.load(open('transcript.json'))
words = [w for s in T for w in s['words']]
fix, i = [], 0
while i < len(words):
    w = dict(words[i]); t = w['w']
    if t.lower().startswith('erião'): w['w'] = 'Eryon' + t[5:]
    if t == 'a' and i + 3 < len(words) and words[i + 1]['w'] == 'rouba':
        fix.append({'w': '@emanuel01.f,', 's': words[i]['s'], 'e': words[i + 3]['e']}); i += 4; continue
    fix.append(w); i += 1
caps, cur = [], []
def flush():
    if not cur: return
    txt = ' '.join(x['w'] for x in cur)
    caps.append({'s': cur[0]['s'], 'e': cur[-1]['e'], 'text': txt, 'html': re.sub(r'(@[\w.]+)', r'<span class="u">\1</span>', txt)}); cur.clear()
for w in fix:
    if cur and cur[-1]['w'][-1:] in '.!?': flush()
    cur.append(w); L = len(' '.join(x['w'] for x in cur))
    if (w['w'][-1:] in ',' and L > 12) or L > 26: flush()
flush()
for k in range(len(caps) - 1): caps[k]['e'] = min(caps[k + 1]['s'], caps[k]['e'] + .45)
caps[-1]['e'] += .5
json.dump(caps, open('captions.json', 'w'), ensure_ascii=False, indent=1)
for c in caps: print(f"{c['s']:6.2f}-{c['e']:6.2f} {c['text']}")
