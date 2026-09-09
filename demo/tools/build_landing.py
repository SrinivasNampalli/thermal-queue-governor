"""Build the offline download and a small, deferred-script public website.

All dependencies are pinned local assets. No package build or network is needed.
"""
from pathlib import Path
import base64
import hashlib
import html
import json
import re

DEMO=Path(__file__).resolve().parents[1]
REPO=DEMO.parent
SITE=REPO/'docs'
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
script_pattern=re.compile(r'<script(?:\s[^>]*)?>(.*?)</script>',re.S)
simulation_js='\n'.join(script_pattern.findall(fragment))
simulation_markup=script_pattern.sub('',fragment)
landing_js='\n'.join(script_pattern.findall(page))
page=script_pattern.sub('',page)
if page.count('<!-- THERMAL_DEMO -->')!=1:raise ValueError('Missing simulator marker')
page=page.replace('<!-- THERMAL_DEMO -->',simulation_markup)
dependencies=[]
assets=SITE/'assets'
assets.mkdir(parents=True,exist_ok=True)
for folder,filename in [('three-0.160.1','three.min.js'),('d3-7.9.0','d3.min.js')]:
    code=(vendor/folder/filename).read_text(encoding='utf-8')
    license_text=(vendor/folder/'LICENSE').read_text(encoding='utf-8')
    if '</script' in code.lower():raise ValueError('HTML terminator in dependency')
    dependencies.append((folder+'.min.js','/* '+folder+'\n'+license_text.replace('*/','* /')+'\n*/\n'+code))
dependencies.append(('tqg.js',simulation_js+'\n'+landing_js))
inline='\n'.join('<script>\n'+code+'\n</script>' for _,code in dependencies)
offline=page.replace('<!-- BUNDLED_DEPENDENCIES -->','').replace('</body>',inline+'\n</body>')
(REPO/'index.html').write_text(offline,encoding='utf-8',newline='\n')
external=[]
for filename,code in dependencies:
    data=code.encode('utf-8')
    (assets/filename).write_bytes(data)
    digest=base64.b64encode(hashlib.sha384(data).digest()).decode()
    version=hashlib.sha256(data).hexdigest()[:12]
    external.append(f'<script defer src="assets/{filename}?v={version}" integrity="sha384-{digest}" crossorigin="anonymous"></script>')
live=page.replace('<!-- BUNDLED_DEPENDENCIES -->','\n'.join(external))
(SITE/'index.html').write_text(live,encoding='utf-8',newline='\n')
styles=re.search(r'<style>(.*?)</style>',page,re.S).group(1)
compact_scripts='\n'.join('<script>\n'+code+'\n</script>' for _,code in dependencies[:2])+'\n<script>'+simulation_js+'</script>'
compact='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+styles+'body{padding:16px}</style></head><body>'+simulation_markup+compact_scripts+'</body></html>'
wrapper='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>Thermal Queue Governor · compact simulator</title><style>html,body{margin:0;background:#0e1622}iframe{border:0;width:100%;height:100dvh;display:block}</style></head><body><iframe title="Thermal Queue Governor interactive simulator" sandbox="allow-scripts" srcdoc="'+html.escape(compact,quote=True)+'"></iframe></body></html>'
for target in [DEMO/'index.html',SITE/'prototype.html']:
    target.write_text(wrapper,encoding='utf-8',newline='\n')
print(f'Built offline HTML: {len(offline.encode()):,} bytes; public HTML: {len(live.encode()):,} bytes with local deferred assets.')
