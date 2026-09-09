"""Scalar thermal demonstrator. All temperatures are Celsius or Celsius rise.
No networking or hardware access. Standard library only.
"""
from dataclasses import dataclass, replace
import math

@dataclass(frozen=True)
class Model:
    ambient: float = 25.0
    clip: float = 95.0
    limit: float = 105.0
    eps: float = 0.3
    amin: float = 0.985
    amax: float = 0.995
    bmin: float = 0.55
    bmax: float = 0.95
    wmin: float = 0.0
    wmax: float = 0.04
    step: float = 0.05

    def __post_init__(self):
        if not all(math.isfinite(v) for v in self.__dict__.values()):
            raise ValueError("nonfinite model")
        if not (0 <= self.amin <= self.amax < 1 and 0 <= self.bmin <= self.bmax
                and self.bmax > 0 and 0 <= self.wmin <= self.wmax
                and self.ambient < self.clip < self.limit
                and self.eps >= 0 and 0 < self.step <= 1):
            raise ValueError("invalid thermal model")
        if self.wmax / (1-self.amax) > self.limit-self.ambient:
            raise ValueError("zero-input terminal set not invariant")

def propagate(lo, hi, u, m):
    """Exact bounding-box step for nonnegative rise and applied effort."""
    return (m.amin*lo + m.bmin*u*u + m.wmin,
            m.amax*hi + m.bmax*u*u + m.wmax)

def intersect_reading(lo, hi, reading, m):
    """Sensor law: y=min(ambient+x+v, clip), |v|<=eps. None is missing."""
    if reading is None:
        return lo, hi
    if not math.isfinite(reading) or reading > m.clip + 1e-9:
        raise ValueError("invalid sensor packet")
    lower = reading - m.ambient - m.eps
    upper = math.inf if reading >= m.clip-1e-9 else reading-m.ambient+m.eps
    nlo, nhi = max(lo, 0.0, lower), min(hi, upper)
    if nlo > nhi + 1e-9:
        raise ValueError("empty measurement intersection")
    return nlo, max(nlo, nhi)

def admissible(hi, pending, demand, m):
    """Prove all queued steps + one candidate + infinite zero fallback.
    pending is the exact accepted FIFO, including the next applied command.
    This returns a per-step feasibility calculation, not a network lease.
    """
    limit = m.limit-m.ambient
    peak = hi
    for u in pending:
        hi = m.amax*hi + m.bmax*u*u + m.wmax
        peak = max(peak, hi)
    if peak > limit + 1e-9:
        return 0.0, peak, False
    room = (limit-m.amax*hi-m.wmax)/m.bmax
    cap = math.sqrt(max(0.0,room))
    action = math.floor((min(demand, cap, 1.0)+1e-12)/m.step)*m.step
    action = max(0.0, action)
    end = m.amax*hi + m.bmax*action*action + m.wmax
    peak = max(peak,end)
    # Zero-input invariant is validated in Model; no assumption that zero cancels FIFO.
    return action,peak,peak <= limit+1e-9

class Governor:
    def __init__(self, policy, model, initial_interval):
        self.policy,self.m = policy,model
        self.lo,self.hi = initial_interval
        if not (0 <= self.lo <= self.hi and math.isfinite(self.hi)):
            raise ValueError("finite commissioning bound required")
        self.valid = True
        self.reason = ""
        self.last_reading = None
        self.stopped = False
        self.nominal = (self.lo+self.hi)/2
        self.decision_id = 0

    def decide(self, reading, pending, demand):
        self.decision_id += 1
        if not math.isfinite(demand) or not 0 <= demand <= 1:
            raise ValueError("invalid requested effort")
        if len(pending)>120 or any(not math.isfinite(x) or not 0<=x<=1 for x in pending):
            self.valid=False; self.reason="invalid queue contract"
        if not self.valid:
            return {"action":0.0,"valid":False,"reason":self.reason,"peak":self.hi,
                    "lo":self.lo,"hi":self.hi,"decision_id":self.decision_id}
        try:
            self.lo,self.hi=intersect_reading(self.lo,self.hi,reading,self.m)
        except ValueError as exc:
            self.valid=False; self.reason=str(exc)
            return {"action":0.0,"valid":False,"reason":self.reason,"peak":self.hi,
                    "lo":self.lo,"hi":self.hi,"decision_id":self.decision_id}
        if reading is not None:
            self.last_reading=reading
            self.nominal=(max(self.nominal, reading-self.m.ambient) if reading>=self.m.clip-1e-9
                          else max(0.0,reading-self.m.ambient))
        if self.policy=="fixed_cap":
            # Robust steady-state cap with same model box.
            cap=math.sqrt(((1-self.m.amax)*(self.m.limit-self.m.ambient)-self.m.wmax)/self.m.bmax)
            action=min(demand,math.floor(cap/self.m.step)*self.m.step)
            peak=self.hi
        elif self.policy=="threshold":
            if reading is None:
                self.stopped=True
            elif reading >= 93:
                self.stopped=True
            elif reading <= 88:
                self.stopped=False
            action=0.0 if self.stopped else demand
            peak=self.hi
        elif self.policy=="nominal_queue":
            midpoint=replace(self.m,amin=(self.m.amin+self.m.amax)/2,amax=(self.m.amin+self.m.amax)/2,
                bmin=(self.m.bmin+self.m.bmax)/2,bmax=(self.m.bmin+self.m.bmax)/2,
                wmin=(self.m.wmin+self.m.wmax)/2,wmax=(self.m.wmin+self.m.wmax)/2)
            action,peak,_=admissible(self.nominal,pending,demand,midpoint)
        elif self.policy in ("interval_no_queue","interval_queue"):
            q=pending if self.policy=="interval_queue" else []
            action,peak,ok=admissible(self.hi,q,demand,self.m)
            if not ok:
                self.valid=False; self.reason="no queued fallback certificate"
                action=0.0
        else:
            raise ValueError("unknown policy")
        return {"action":action,"valid":self.valid,"reason":self.reason,"peak":peak,
                "lo":self.lo,"hi":self.hi,"decision_id":self.decision_id}

    def advance(self, acknowledged_applied):
        if not math.isfinite(acknowledged_applied) or not 0<=acknowledged_applied<=1:
            self.valid=False; self.reason="invalid acknowledgment"; return
        self.lo,self.hi=propagate(self.lo,self.hi,acknowledged_applied,self.m)
        self.nominal=(self.m.amin+self.m.amax)/2*self.nominal+(self.m.bmin+self.m.bmax)/2*acknowledged_applied**2+(self.m.wmin+self.m.wmax)/2
