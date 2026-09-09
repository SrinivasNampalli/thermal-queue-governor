"""Bundle the recorded guarded-bridge experiment into one offline HTML page."""
import json
from pathlib import Path
import shutil

REPO = Path(__file__).resolve().parents[2]
template = (REPO/'demo/src/thermal-bridge.template.html').read_text(encoding='utf-8')
marker = '/* BRIDGE_DATA */'
if template.count(marker) != 1:
    raise ValueError('Missing or duplicate thermal bridge data marker')
data = json.loads((REPO/'project/thermal_bridge/results.json').read_text(encoding='utf-8'))
encoded = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
output = REPO/'thermal-bridge.html'
output.write_text(template.replace(marker, encoded), encoding='utf-8', newline='\n')
(REPO/'docs').mkdir(exist_ok=True)
shutil.copyfile(output, REPO/'docs/thermal-bridge.html')
print(f'Built guarded thermal bridge: {len(data["cases"])} recorded synthetic cases.')
