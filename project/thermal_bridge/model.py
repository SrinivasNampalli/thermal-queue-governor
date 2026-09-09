"""Synthetic, lumped thermal-bridge concept; no motor model or safety certification.

The estimator receives sensor observations only. Hidden source/bond values belong
exclusively to the synthetic plant and the evaluation report.
"""
from dataclasses import dataclass
from math import exp, isfinite


@dataclass(frozen=True)
class Observation:
    phase: str
    pad_c: float
    case_c: float
    shunt_w_per_k: float
    guard_c: float = 40.0
    clipped: bool = False
    settled: bool = True


def equilibrium(hot_c, case_c, bond, shunt, leak=0., guard_c=None):
    if guard_c is None:
        guard_c = case_c
    if bond < 0 or shunt < 0 or leak < 0 or bond + shunt + leak <= 0:
        raise ValueError("Conductances must be nonnegative with a positive sum")
    return (bond * hot_c + shunt * case_c + leak * guard_c) / (bond + shunt + leak)


def advance(pad_c, hot_c, case_c, bond, shunt, capacity, dt, leak=0., guard_c=None):
    """Exact constant-boundary step and integral of heat to the case."""
    if capacity <= 0 or dt < 0:
        raise ValueError("Positive capacity and nonnegative step required")
    target = equilibrium(hot_c, case_c, bond, shunt, leak, guard_c)
    rate = (bond + shunt + leak) / capacity
    decay = exp(-rate * dt)
    new_pad = target + (pad_c - target) * decay
    integral = (target - case_c) * dt + (pad_c - target) * (1-decay) / rate
    return new_pad, shunt * integral


def estimate(observations, *, clip_c=95.0, min_bond=0.008,
             minimum_separation_c=2.0, holdout_tolerance_c=0.75):
    """Three fit plateaus, one unused challenge plateau. Point estimate, not a bound.

Thresholds are illustrative, fixed before the fixture run. Consistency is not
attachment certification: common conductance calibration bias is unobservable.
"""
    result = dict(status="inconclusive", reason="Four observations required.",
                  estimated_hot_c=None, estimated_bond_w_per_k=None,
                  estimated_leak_w_per_k=None,
                  holdout_error_c=None)
    if len(observations) != 4:
        return result
    if any(not all(isfinite(v) for v in (o.pad_c, o.case_c, o.shunt_w_per_k, o.guard_c))
           or o.shunt_w_per_k <= 0 for o in observations):
        result['reason'] = "Invalid observation or shunt calibration."
        return result
    if any(o.clipped or o.pad_c >= clip_c-0.2 for o in observations):
        result['reason'] = "At least one measurement remains clipped or too close to the clip limit."
        return result
    if any(not o.settled for o in observations):
        result['reason'] = "A measurement did not settle within the observation window."
        return result
    a, b, probe, challenge = observations
    if abs(a.guard_c-b.guard_c) > 1e-6 or abs(probe.guard_c-a.guard_c) < 5.:
        result['reason'] = "The guard excitation does not meet the independent measurement protocol."
        return result
    if abs(a.pad_c-b.pad_c) < minimum_separation_c:
        result['reason'] = "Insufficient temperature separation: attachment and source temperature are not identifiable."
        return result
    qa = a.shunt_w_per_k * (a.pad_c-a.case_c)
    qb = b.shunt_w_per_k * (b.pad_c-b.case_c)
    total = (qa-qb)/(b.pad_c-a.pad_c)
    qp = probe.shunt_w_per_k * (probe.pad_c-probe.case_c)
    leak = (qp-qa+total*(probe.pad_c-a.pad_c))/(probe.guard_c-a.guard_c)
    bond = total-leak
    if bond <= 0 or leak < -1e-5:
        result['reason'] = "The fitted attachment conductance is nonphysical."
        return result
    leak = max(0.,leak)
    hot = (qa+total*a.pad_c-leak*a.guard_c)/bond
    result.update(estimated_hot_c=hot, estimated_bond_w_per_k=bond,
                  estimated_leak_w_per_k=leak)
    predicted = equilibrium(hot, challenge.case_c, bond, challenge.shunt_w_per_k, leak, challenge.guard_c)
    residual = abs(predicted-challenge.pad_c)
    result['holdout_error_c'] = residual
    if bond < min_bond:
        result['reason'] = "The fitted thermal attachment is below the illustrative qualification threshold."
    elif residual > holdout_tolerance_c:
        result['reason'] = "The independent fourth state disagrees with the three-state fit."
    else:
        result.update(status="consistent", reason="Four thermal states are consistent with the assumed guarded model. This is not permission to energize a motor or proof that every heat path was modeled.")
    return result


CASES = [
    dict(id="nominal", name="Above-range winding", hot=130., case=40., bond=.020,
         description="A 130 °C source saturates the resting pad readout at 95 °C. Controlled cooling returns the pad to range; independent guard excitation separates wire leakage and recovers the source temperature in this ideal model."),
    dict(id="wire_leak", name="Separate winding heat from wire loss", hot=130., case=40., bond=.020, leak=.020,
         description="With substantial heat escape through the wires, a simple cooled probe estimates 85 °C for a 130 °C source. The independent guard probe recovers 130 °C and distinguishes the two heat paths."),
    dict(id="loose_bond", name="Loose thermal attachment", hot=130., case=40., bond=.003,
         description="The pad cools readily, but the recovered attachment conductance is too small for the illustrative qualification threshold."),
    dict(id="detached", name="Detached pad", hot=130., case=40., bond=0.,
         description="A pad disconnected from the hot source sits near the case temperature. The two readings cannot identify the hidden source."),
    dict(id="hot_case", name="Cooling reference too hot", hot=150., case=100., bond=.020,
         description="A 100 °C case cannot passively pull the pad below a 95 °C readout limit. The result remains inconclusive."),
    dict(id="drift", name="Source changes after the fit", hot=130., case=40., bond=.020,
         description="The source increases by 10 °C before the fourth state. The independent challenge rejects the earlier estimate."),
    dict(id="shunt_fault", name="Challenge shunt miscalibrated", hot=130., case=40., bond=.020,
         description="The fourth cooling path provides only 70% of its calibrated conductance. Its temperature disagrees with the fitted model."),
    dict(id="common_gain_bias", name="Failure the check cannot detect", hot=130., case=40., bond=.006,
         description="All shunts provide half their stated conductance. The check passes and overestimates attachment by 2×; a real weak bond looks qualified. Independent calibration is essential."),
    dict(id="unguarded_leak", name="Bypass the guard: false cool result", hot=130., case=40., bond=.020,
         description="An extra unmodeled path connects the pad directly to the case. Even the guard check passes while reporting 85 °C for a 130 °C source. Every significant parasitic path must be constrained."),
    dict(id="stuck_readout", name="Readout stuck at 75 °C", hot=130., case=40., bond=.020,
         description="A plausible but unchanging readout supplies no separation across the cooling challenges, so the estimator withholds a result."),
]


def simulate(config, dt=.1):
    from dataclasses import asdict
    hot, case, bond = config['hot'], config['case'], config['bond']
    capacity = .04
    leak = config.get('leak',.005)
    phases = [('Rest', 3., .001, case), ('A · fit', 20., .02, case),
              ('B · fit', 20., .05, case), ('C · guard probe', 20., .035, case+25),
              ('D · challenge', 20., .04, case+10)]
    if dt <= 0 or any(abs(duration/dt-round(duration/dt))>1e-8 for _,duration,_,_ in phases):
        raise ValueError("Step must divide each phase duration")
    bypass = .02 if config['id']=='unguarded_leak' else 0.
    pad = equilibrium(hot, case, bond, .001+bypass, leak, case)
    time, energy, peak = 0., 0., 0.
    samples, observations = [], []
    for phase_index, (phase, duration, nominal, guard) in enumerate(phases):
        active_hot = hot+(10 if config['id']=='drift' and phase_index==4 else 0)
        shunt = nominal
        if config['id']=='common_gain_bias' and phase_index:
            shunt *= .5
        if config['id']=='shunt_fault' and phase_index==4:
            shunt *= .7
        plateau = []
        for step_index in range(round(duration/dt)):
            peak = max(peak, shunt*(pad-case))
            pad, combined_heat = advance(pad, active_hot, case, bond, shunt+bypass, capacity, dt, leak, guard)
            heat = combined_heat*shunt/(shunt+bypass)
            time += dt
            energy += heat
            readout = 75. if config['id']=='stuck_readout' else min(pad,95.)
            sample = dict(time_s=round(time,6), phase=phase, pad_c=pad,
                          readout_c=readout, hot_c=active_hot, case_c=case, guard_c=guard,
                          direct_readout_c=min(active_hot,95.),
                          shunt_w_per_k=shunt)
            if step_index % max(1,round(.4/dt)) == 0 or step_index == round(duration/dt)-1:
                samples.append(sample)
            plateau.append(sample)
        if phase_index:
            recent = plateau[-round(2/dt):]
            # Only observable readouts enter settling and clipping decisions.
            settled = abs(recent[-1]['readout_c']-recent[0]['readout_c'])/(
                recent[-1]['time_s']-recent[0]['time_s']) < .02
            observations.append(Observation(phase, sum(s['readout_c'] for s in recent)/len(recent),
                case, nominal, guard, any(s['readout_c'] >= 95. for s in recent), settled))
    result = estimate(observations)
    return dict(id=config['id'], name=config['name'], description=config['description'],
                parameters=dict(hot_c=hot, case_c=case, bond_w_per_k=bond, clip_c=95.,
                                pad_capacity_j_per_k=capacity, leak_w_per_k=leak,
                                unguarded_leak_w_per_k=bypass),
                samples=samples, observations=[asdict(o) for o in observations], result=result,
                metrics=dict(duration_s=round(time,6), shunt_energy_j=energy, peak_shunt_w=peak))


def build_report():
    return dict(title="Guarded Thermal Bridge Interrogator", description="A sensor-module concept with independent cooling and guard excitation.",
                scope="Ten constructed lumped-model experiments. No physical motor, calibrated device, patentability finding, or controller safety bound.",
                cases=[simulate(c) for c in CASES])


def compare_report(stored, actual, location='report'):
    """Allow last-bit libm differences across Windows/Linux; preserve decisions."""
    from math import isclose
    if isinstance(actual, dict):
        assert isinstance(stored,dict) and stored.keys()==actual.keys(), location
        for key,value in actual.items():
            compare_report(stored[key],value,location+'.'+key)
    elif isinstance(actual,list):
        assert isinstance(stored,list) and len(stored)==len(actual), location
        for i,(a,b) in enumerate(zip(stored,actual)):
            compare_report(a,b,f'{location}[{i}]')
    elif isinstance(actual,float):
        assert isinstance(stored,(int,float)) and isclose(stored,actual,rel_tol=1e-10,abs_tol=1e-8),location
    else:
        assert stored==actual,location


if __name__ == '__main__':
    import argparse
    import json
    from pathlib import Path
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    path = Path(__file__).with_name('results.json')
    report = build_report()
    serialized = json.dumps(report, ensure_ascii=False, indent=2)+'\n'
    if args.check:
        compare_report(json.loads(path.read_text(encoding='utf-8')),report)
    else:
        path.write_text(serialized, encoding='utf-8', newline='\n')
    for case in report['cases']:
        r = case['result']
        print(case['id'], r['status'], r['estimated_hot_c'], r['estimated_bond_w_per_k'], r['holdout_error_c'])
