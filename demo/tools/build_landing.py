"""Assemble a single-file, offline landing page from the existing simulator.

No npm build or network is needed. Run build_demo.py to rebuild all public pages.
"""
from pathlib import Path
import json
import hashlib

DEMO=Path(__file__).resolve().parents[1]
REPO=DEMO.parent
vendor=DEMO/'vendor'
for asset in json.loads((vendor/'provenance.json').read_text(encoding='utf-8'))['assets']:
    for item in asset['files']:
        if hashlib.sha256((vendor/item['localPath']).read_bytes()).hexdigest()!=item['sha256']:
            raise ValueError('Vendor asset checksum changed: '+item['localPath'])
page=(DEMO/'src/landing.html').read_text(encoding='utf-8')
fragment=(DEMO/'thermal-queue-governor.fragment.html').read_text(encoding='utf-8')
three_import="const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js');"
if fragment.count(three_import)!=1:raise ValueError('Three.js loader changed; review offline integration')
fragment=fragment.replace(three_import,'const THREE = window.THREE;')
start=fragment.index("  const chartScript=document.createElement('script');")
end=fragment.index('  root.thermalDemo=',start)
fragment=fragment[:start]+'  installChart(window.d3);\n'+fragment[end:]
dependencies=[]
for folder,filename in [('three-0.160.1','three.min.js'),('d3-7.9.0','d3.min.js')]:
    code=(vendor/folder/filename).read_text(encoding='utf-8')
    license_text=(vendor/folder/'LICENSE').read_text(encoding='utf-8')
    # Preserve upstream code and include licenses in the single downloadable file.
    if '</script' in code.lower():raise ValueError('Unexpected HTML script terminator in dependency')
    dependencies.append('<script>\n/* '+folder+'\n'+license_text.replace('*/','* /')+'\n*/\n'+code+'\n</script>')
for marker,content in [('<!-- BUNDLED_DEPENDENCIES -->','\n'.join(dependencies)),('<!-- THERMAL_DEMO -->',fragment)]:
    if page.count(marker)!=1:raise ValueError('Missing or duplicate landing marker: '+marker)
    page=page.replace(marker,content)
for target in [REPO/'index.html',REPO/'docs/index.html']:
    target.write_text(page,encoding='utf-8',newline='\n')
print(f'Built offline landing page: {len(page.encode("utf-8")):,} bytes; no external runtime resources.')
