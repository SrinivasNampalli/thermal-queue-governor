"""Bundle the recorded guarded-bridge experiment into one offline HTML page."""
import json
import hashlib
from pathlib import Path
import shutil

REPO = Path(__file__).resolve().parents[2]
template = (REPO/'demo/src/thermal-bridge.template.html').read_text(encoding='utf-8')
marker = '/* BRIDGE_DATA */'
if template.count(marker) != 1:
    raise ValueError('Missing or duplicate thermal bridge data marker')
data = json.loads((REPO/'project/thermal_bridge/results.json').read_text(encoding='utf-8'))
encoded = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
vendor = REPO/'demo/vendor'
for asset in json.loads((vendor/'provenance.json').read_text(encoding='utf-8'))['assets']:
    for entry in asset['files']:
        if hashlib.sha256((vendor/entry['localPath']).read_bytes()).hexdigest() != entry['sha256']:
            raise ValueError('Dependency checksum changed: '+entry['localPath'])
three = (vendor/'three-0.160.1/three.min.js').read_text(encoding='utf-8')
license_text = (vendor/'three-0.160.1/LICENSE').read_text(encoding='utf-8')
scene = (REPO/'demo/src/thermal-bridge-scene.js').read_text(encoding='utf-8')
for code in (three, scene):
    if '</script' in code.lower():
        raise ValueError('Unexpected HTML terminator in bundled script')
scripts = '<script>\n/* Three.js 0.160.1\n'+license_text.replace('*/','* /')+'\n*/\n'+three+'\n</script>\n<script>\n'+scene+'\n</script>'
if template.count('<!-- BRIDGE_3D_DEPENDENCIES -->') != 1:
    raise ValueError('Missing or duplicate 3D dependency marker')
template = template.replace('<!-- BRIDGE_3D_DEPENDENCIES -->', scripts)
output = REPO/'thermal-bridge.html'
output.write_text(template.replace(marker, encoded), encoding='utf-8', newline='\n')
(REPO/'docs').mkdir(exist_ok=True)
shutil.copyfile(output, REPO/'docs/thermal-bridge.html')
watch = (REPO/'demo/bridge-watch.html').read_text(encoding='utf-8')
(REPO/'docs/bridge-watch.html').write_text(watch.replace('href="../thermal-bridge.html', 'href="thermal-bridge.html'), encoding='utf-8', newline='\n')
print(f'Built guarded thermal bridge: {len(data["cases"])} recorded synthetic cases.')
