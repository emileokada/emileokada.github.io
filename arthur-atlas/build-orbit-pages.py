#!/usr/bin/env python3
"""Build individual orbit pages from preserved page.html.gz source exports.

Run from any directory. Every compact case is round-trip checked before writing.
The original exports remain unchanged and are the authoritative source inputs.
"""
from pathlib import Path
import copy
import gzip
import html
import json
import re

ROOT = Path(__file__).resolve().parent
DATA = re.compile(r'<script id="atlas-data" type="application/json">(.*?)</script>', re.S)
SCRIPTS = re.compile(r'<script([^>]*)>(.*?)</script>', re.S)
STYLES = re.compile(r'<style[^>]*>(.*?)</style>', re.S)


def pack(value):
    raw = json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()
    return gzip.compress(raw, mtime=0)


def compact(case):
    result = copy.deepcopy(case)
    aliases = {}
    # Only deduplicate known semantic aliases, never coincidentally equal values.
    for alias, canonical in [('orbit_key', 'orbits'), ('orbit_table', 'orbits'),
                              ('packets', 'arthur_packets')]:
        if alias in result and canonical in result and result[alias] == result[canonical]:
            aliases[alias] = canonical
            del result[alias]
    domains = {p['domain'] for b in result['kl'] for row in b['q_matrix'] for p in row}
    assert len(domains) == 1, 'Expected a common polynomial domain'
    domain = next(iter(domains))
    for block in result['kl']:
        for row in block['q_matrix']:
            for polynomial in row:
                assert set(polynomial) == {'domain', 'terms'}, 'Unexpected polynomial metadata'
        block['q_matrix'] = [[p['terms'] for p in row] for row in block['q_matrix']]
    payload = {'format': 'arthur-atlas.compact.v1', 'polynomial_domain': domain,
               'aliases': aliases, 'case_data': result}
    restored = copy.deepcopy(result)
    for block in restored['kl']:
        block['q_matrix'] = [[{'domain': domain, 'terms': p} for p in row]
                            for row in block['q_matrix']]
    for alias, canonical in aliases.items():
        restored[alias] = restored[canonical]
    assert restored == case, 'Compact export does not reconstruct the original case'
    return payload


BOOTSTRAP = '''
(async function () {
  const status = document.getElementById('loading');
  try {
    async function readData(url) {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Unable to download ' + url);
      const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
      return JSON.parse(await new Response(stream).text());
    }
    const index = Number(document.body.dataset.orbitIndex);
    const [group, payload] = await Promise.all([
      readData('group.json.gz'), readData('orbit-' + index + '.json.gz')
    ]);
    if (payload.format !== 'arthur-atlas.compact.v1') throw new Error('Unsupported orbit format');
    const current = payload.case_data;
    for (const [alias, canonical] of Object.entries(payload.aliases)) current[alias] = current[canonical];
    const data = {...group, cases: [current], orbit_index: index};
'''
ENDING = '''
    status.remove();
    // Section bookmarks can arrive before the asynchronous content exists.
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  } catch (error) {
    status.textContent = 'Unable to load this orbit. Please reload using a current browser. ' + error.message;
  }
})();
'''
NAVIGATION = '''
document.getElementById('grading').addEventListener('change',function(event){
  event.stopImmediatePropagation();
  location.assign('orbit-'+this.value+'.html'+location.hash);
},true);
'''


def main():
    common_js = common_css = None
    count = before = after = 0
    for source in sorted(ROOT.glob('*/page.html.gz')):
        text = gzip.decompress(source.read_bytes()).decode()
        match = DATA.search(text)
        data = json.loads(match[1])
        cases = data.pop('cases')
        data['orbit_navigation'] = [{'ambient_orbit': c['ambient_orbit']} for c in cases]
        js = '\n'.join(body for attrs, body in SCRIPTS.findall(text) if 'application/json' not in attrs)
        js = js.replace("const data=JSON.parse(document.getElementById('atlas-data').textContent);", '')
        js = js.replace("data.cases[Number(document.getElementById('grading').value)]", 'data.cases[0]')
        js = js.replace('data.cases.map((c,i)=>', 'data.orbit_navigation.map((c,i)=>')
        js = js.replace("document.getElementById('grading').value='0'", "document.getElementById('grading').value=String(data.orbit_index)")
        js = '\n'.join(line for line in js.split('\n') if not line.startswith('const requestedCase='))
        assert 'function polynomial(p){return p.terms' in js
        js = js.replace('function polynomial(p){return p.terms', 'function polynomial(p){return p')
        js = js.replace('p.terms.slice()', 'p.slice()')
        css = '\n'.join(STYLES.findall(text))
        if common_js is None:
            common_js, common_css = js, css
            # Shared assets are maintained source files, not regenerated from
            # historical exports, which would discard newer UI features.
            assert (ROOT / 'atlas.js').exists() and (ROOT / 'atlas.css').exists(), 'Shared assets missing'
        else:
            assert js == common_js and css == common_css, 'Unexpected renderer variation'
        group_bytes = pack(data)
        (source.parent / 'group.json.gz').write_bytes(group_bytes)
        after += len(group_bytes)
        shell = SCRIPTS.sub('', text)
        shell = STYLES.sub('<link rel="stylesheet" href="../atlas.css">', shell)
        shell = shell.replace('</head>', '<script src="../atlas.js" defer></script><script src="../analytics.js" defer></script></head>')
        shell = shell.replace('<article id="results">', '<article id="results"><p id="loading" role="status">Loading orbit data…</p><noscript>JavaScript is required to display the interactive orbit data.</noscript>')
        for index, case in enumerate(cases):
            payload = pack(compact(case))
            page = re.sub(r'<title>.*?</title>', lambda m: '<title>' + html.escape(source.parent.name + ' · ' + case['ambient_orbit'] + ' · Graded Kazhdan–Lusztig Atlas') + '</title>', shell, count=1)
            page = page.replace('<body ', f'<body data-orbit-index="{index}" ', 1)
            path = source.parent / f'orbit-{index}.html'
            old = source.parent / f'orbit-{index}.html.gz'
            before += (old.stat().st_size if old.exists() else 0) + (path.stat().st_size if path.exists() else 0)
            path.with_suffix('.json.gz').write_bytes(payload)
            path.write_text(page)
            # A validated JSON payload and shell now replace this generated file.
            if old.exists():
                old.unlink()
            after += len(payload) + len(page.encode())
            count += 1
        print(f'{source.parent.name}: validated {len(cases)} orbits', flush=True)
    after += (ROOT / 'atlas.js').stat().st_size + (ROOT / 'atlas.css').stat().st_size
    print(f'{count} orbits validated. Orbit delivery files: {before:,} -> {after:,} bytes.')


if __name__ == '__main__':
    main()
