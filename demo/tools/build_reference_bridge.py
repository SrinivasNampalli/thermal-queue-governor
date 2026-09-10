"""Build the offline reference-excitation evidence viewer from saved reports."""
from pathlib import Path
import hashlib
import json
import shutil

DEMO=Path(__file__).resolve().parents[1]
ROOT=DEMO.parent
SOURCE=ROOT/"project/reference_bridge"
report=json.loads((SOURCE/"results.json").read_text(encoding="utf-8"))
dynamic_path=SOURCE/"dynamic_results.json"
dynamic=json.loads(dynamic_path.read_text(encoding="utf-8")) if dynamic_path.exists() else None
payload={"report":report,"dynamic":dynamic,"report_sha256":hashlib.sha256((SOURCE/"results.json").read_bytes()).hexdigest()}
encoded=json.dumps(payload,ensure_ascii=False,separators=(",", ":")).replace("<", "\\u003c")
template=(DEMO/"src/reference-bridge.template.html").read_text(encoding="utf-8")
marker="/* REFERENCE_BRIDGE_DATA */"
if template.count(marker)!=1:
    raise ValueError("Missing or duplicate reference-bridge data marker")
page=template.replace(marker,encoded)
output=ROOT/"reference-bridge.html"
output.write_text(page,encoding="utf-8",newline="\n")
(ROOT/"docs").mkdir(exist_ok=True)
shutil.copyfile(output,ROOT/"docs/reference-bridge.html")
print(f"Built reference-bridge.html: {len(report['cases'])} synthetic cases; physical measurements: 0.")
