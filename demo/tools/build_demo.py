"""Rebuild the self-contained demo with only the Python standard library."""
from pathlib import Path
import html
import shutil

DEMO=Path(__file__).resolve().parents[1]
fragment=(DEMO/'src/interface.html').read_text(encoding='utf-8')
for marker,filename,identifier in [('THERMAL_ENGINE','thermal-engine.js','tq-engine'),
                                  ('COMPONENT_CATALOG','components.js','tq-components'),
                                  ('MOTOR_SCENE','motor-scene.js','tq-scene')]:
    token=f'<!-- {marker} -->'
    if fragment.count(token)!=1:raise ValueError('Missing or duplicate source marker: '+marker)
    code=(DEMO/'src'/filename).read_text(encoding='utf-8')
    fragment=fragment.replace(token,f'<script id="{identifier}">\n'+code+'\n</script>')
if len(fragment.encode('utf-8'))>=1_000_000:raise ValueError('Fragment exceeds size limit')
template=(DEMO/'tools/standalone-template.html').read_text(encoding='utf-8')
if template.count('__THERMAL_FRAGMENT__')!=1:raise ValueError('Invalid standalone template')
(DEMO/'thermal-queue-governor.fragment.html').write_text(fragment,encoding='utf-8',newline='\n')
(DEMO/'index.html').write_text(template.replace('__THERMAL_FRAGMENT__',html.escape(fragment)),encoding='utf-8',newline='\n')
site=DEMO.parent/'docs'
(site/'media').mkdir(parents=True,exist_ok=True)
for name in ('index.html','watch.html'):
    shutil.copyfile(DEMO/name,site/name)
for source in sorted((DEMO/'media').iterdir()):
    if source.is_file():shutil.copyfile(source,site/'media'/source.name)
(site/'.nojekyll').write_text('',encoding='utf-8')
print('Built demo/index.html and refreshed the docs/ GitHub Pages export.')
