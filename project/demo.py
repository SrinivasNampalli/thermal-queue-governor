"""One-command deterministic worked example. No network/hardware calls."""
import json
from src.governor import Model,Governor
g=Governor("interval_queue",Model(),(60,78))
decision=g.decide(95,[1,1,1],1)
print(json.dumps(decision,indent=2))
assert abs(decision["action"]-0.75)<1e-10
assert decision["valid"]
print("PASS: clipped reading retains upper bound; three pending unit commands admit effort 0.75.")
