"""Reference-excited bridge research model. No physical validation or motor permission.

The estimator accepts observations and declared error budgets only. Synthetic truth
is confined to the plant and evaluation records. Historical bridge files are unchanged.
"""
from dataclasses import dataclass, asdict
from fractions import Fraction as F
from math import exp, isfinite, nextafter, inf
from pathlib import Path
import json
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from linear_bounds import certify_polytope, solve_linear


@dataclass(frozen=True)
class Observation:
    phase: str
    pad_c: float
    guard_c: float
    reference_c: float
    shunt_w_per_k: float
    clipped: bool = False
    settled: bool = True


@dataclass(frozen=True)
class Budget:
    pad_error_c: float = 0.1
    guard_error_c: float = 0.1
    reference_error_c: float = 0.1
    shunt_relative_error: float = 0.01
    imbalance_w: float = 0.001


def rational(value):
    if not isfinite(float(value)):
        raise ValueError("Finite numeric value required")
    return value if isinstance(value, F) else F(str(value))


def plain(value):
    if isinstance(value, F):
        return str(value)
    if isinstance(value, dict):
        return {k: plain(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [plain(v) for v in value]
    return value


def constraints(observations, budget):
    """Exact rational outer constraints for h=Th, l=Gl/Gb, x=Gx/Gb, r=1/Gb.

For each row the declared temperature and shunt intervals contain the unknown
actual values. Nonnegative conductances make the endpoint extrema monotone.
Shunt-product signs are handled at both corners, including a reference hotter
than the pad. Unknown finite settling heat is bounded by imbalance_w.

Across rows this relaxes correlations, so it encloses every consistent fixed
parameter vector under the stated topology, stationarity and error assumptions.
No minimum bond is imposed in the feasible set.
"""
    A, b = [], []
    es, eg, ec, er, imbalance = map(rational, (
        budget.pad_error_c, budget.guard_error_c, budget.reference_error_c,
        budget.shunt_relative_error, budget.imbalance_w))
    for o in observations:
        s, g, c, i = map(rational, (o.pad_c, o.guard_c, o.reference_c, o.shunt_w_per_k))
        slo, shi, glo, ghi, clo, chi = s-es, s+es, g-eg, g+eg, c-ec, c+ec
        ilo, ihi = i*(1-er), i*(1+er)
        low_product = min(ilo*(clo-shi), ihi*(clo-shi))
        high_product = max(ilo*(chi-slo), ihi*(chi-slo))
        A.append([F(1), glo-shi, clo-shi, low_product-imbalance])
        b.append(shi)
        A.append([F(-1), slo-ghi, slo-chi, -high_product-imbalance])
        b.append(-slo)
    for column in (1, 2, 3):
        row = [F(0)]*4
        row[column] = F(-1)
        A.append(row)
        b.append(F(0))
    return A, b


def estimate(observations, budget=Budget(), *, clip_c=95., minimum_bond_w_per_k=.008,
             holdout_tolerance_c=.75, model_limit_c=105., maximum_interval_width_c=20.,
             minimum_boundary_excitation_c=5.):
    result = dict(status="inconclusive", reason="Five observations required.",
                  estimated_hot_c=None, estimated_bond_w_per_k=None,
                  estimated_guard_leak_w_per_k=None, estimated_reference_bypass_w_per_k=None,
                  source_interval_c=None, minimum_possible_bond_w_per_k=None,
                  interval_width_c=None, holdout_error_c=None, model_classification="unknown",
                  hardware_validated=False, motor_permission="not_authorized",
                  fit_phases=[], holdout_phase=None, certificate=None)
    if len(observations) != 5:
        return result
    values = list(asdict(budget).values()) + [
        clip_c, minimum_bond_w_per_k, holdout_tolerance_c, model_limit_c,
        maximum_interval_width_c, minimum_boundary_excitation_c]
    values += [v for o in observations for v in (o.pad_c, o.guard_c, o.reference_c, o.shunt_w_per_k)]
    try:
        finite = all(isfinite(float(v)) for v in values)
    except (TypeError, ValueError, OverflowError):
        finite = False
    if not finite:
        result["reason"] = "Invalid or nonfinite observation, uncertainty or criterion."
        return result
    if (any(v < 0 for v in asdict(budget).values()) or budget.shunt_relative_error >= 1
        or any(o.shunt_w_per_k <= 0 for o in observations)
        or min(minimum_bond_w_per_k, maximum_interval_width_c, minimum_boundary_excitation_c) <= 0
        or holdout_tolerance_c < 0):
        result["reason"] = "Invalid calibration budget or criterion."
        return result
    if any(o.clipped or o.pad_c + budget.pad_error_c >= clip_c for o in observations):
        result["reason"] = "A measurement is clipped or its uncertainty reaches the rail."
        return result
    if any(not o.settled for o in observations):
        result["reason"] = "An observation has not met the settling criterion."
        return result
    fit, holdout = observations[:4], observations[4]
    result.update(fit_phases=[o.phase for o in fit], holdout_phase=holdout.phase)
    if (max(o.reference_c for o in fit)-min(o.reference_c for o in fit) < minimum_boundary_excitation_c
        or max(o.guard_c for o in fit)-min(o.guard_c for o in fit) < minimum_boundary_excitation_c):
        result["reason"] = "Independent measured guard and reference excitation is missing."
        return result
    matrix = [[F(1), -rational(o.pad_c), rational(o.guard_c), rational(o.reference_c)] for o in fit]
    rhs = [rational(o.shunt_w_per_k)*(rational(o.pad_c)-rational(o.reference_c)) for o in fit]
    try:
        params = solve_linear(matrix, rhs)
    except (ValueError, ZeroDivisionError):
        result["reason"] = "Fit rows are rank deficient."
        return result
    if params is None:
        result["reason"] = "Fit rows are rank deficient."
        return result
    aa, bb, gg, xx = params
    bond = bb-gg-xx
    # Tiny signed roundoff from serialized synthetic floats is not a physical
    # negative leak, but no such clamp is applied to the uncertainty constraints.
    if bond <= F("1e-10") or gg < F("-1e-8") or xx < F("-1e-8"):
        result["reason"] = "The nominal fit has no physically identifiable winding bond."
        return result
    hot = aa/bond
    result.update(estimated_hot_c=float(hot), estimated_bond_w_per_k=float(bond),
                  estimated_guard_leak_w_per_k=float(gg), estimated_reference_bypass_w_per_k=float(xx))
    predicted = (aa+gg*rational(holdout.guard_c)+(xx+rational(holdout.shunt_w_per_k))*rational(holdout.reference_c))/(bb+rational(holdout.shunt_w_per_k))
    residual = abs(float(predicted)-holdout.pad_c)
    result["holdout_error_c"] = residual
    # E never enters constraints or the fitted source-temperature enclosure.
    A, b = constraints(fit, budget)
    certificate = certify_polytope(A, b, {
        "hot": [F(1),F(0),F(0),F(0)],
        "inverse_bond": [F(0),F(0),F(0),F(1)]})
    result["certificate"] = plain(certificate)
    if not certificate["feasible"]:
        result["reason"] = "No exactly verified feasible witness was found."
        return result
    hot_bounds = certificate["bounds"]["hot"]
    reciprocal = certificate["bounds"]["inverse_bond"]["upper"]
    if hot_bounds["lower"] is None or hot_bounds["upper"] is None or reciprocal is None or reciprocal <= 0:
        result["reason"] = "Finite temperature and attachment bounds were not certified."
        return result
    lo, hi = hot_bounds["lower"], hot_bounds["upper"]
    min_bond = 1/reciprocal
    result.update(source_interval_c=[nextafter(float(lo),-inf),nextafter(float(hi),inf)],
                  minimum_possible_bond_w_per_k=nextafter(float(min_bond),-inf),
                  interval_width_c=float(hi-lo))
    limit = rational(model_limit_c)
    result["model_classification"] = "above_limit" if lo > limit else "within_limit" if hi <= limit else "straddles_limit"
    if residual > holdout_tolerance_c:
        result["reason"] = "The unused fifth observation disagrees with the nominal fit."
    elif min_bond < rational(minimum_bond_w_per_k):
        result["reason"] = "The observations do not establish the required minimum bond under the declared model."
    elif hi-lo > rational(maximum_interval_width_c):
        result["reason"] = "The model-conditional temperature interval is too wide for the proposed precision criterion."
    else:
        result.update(status="model_consistent", reason="Four fit states and the unused fifth state meet the research criteria under the declared topology and error assumptions. Hardware remains unvalidated.")
    return result


def equilibrium(hot, guard, reference, bond, leak, bypass, shunt, ambient=40., ambient_leak=0.):
    total = bond+leak+bypass+shunt+ambient_leak
    if min(bond, leak, bypass, shunt, ambient_leak) < 0 or total <= 0:
        raise ValueError("Nonnegative conductances with a positive sum required.")
    return (bond*hot+leak*guard+(bypass+shunt)*reference+ambient_leak*ambient)/total


def simulate(case, protocol):
    plant = dict(protocol["plant"])
    plant.update({k:v for k,v in case["changes"].items() if k in plant})
    changes = case["changes"]
    budget = Budget(**protocol["measurement_budget"])
    if "declared_shunt_relative_error" in changes:
        budget = Budget(**{**asdict(budget), "shunt_relative_error": changes["declared_shunt_relative_error"]})
    hot, base, bond, leak, bypass, capacity = (plant[k] for k in (
        "hot_c", "reference_c", "bond_w_per_k", "guard_leak_w_per_k",
        "reference_bypass_w_per_k", "capacity_j_per_k"))
    ambient, ambient_leak = plant["ambient_c"], plant["ambient_leak_w_per_k"]
    pad = equilibrium(hot, base, base, bond, leak, bypass, .001, ambient, ambient_leak)
    observations, samples = [], []
    time, cooling_energy = 0., 0.
    dt = .1
    for phase in protocol["phases"]:
        ref = base + (0 if changes.get("reference_stuck") else phase["reference_delta_c"])
        guard = base + phase["guard_delta_c"]
        active_hot = hot + (changes.get("holdout_hot_delta_c",0.) if phase["purpose"]=="holdout" else 0.)
        shunt = phase["shunt_w_per_k"]*changes.get("shunt_scale",1.)
        if phase["purpose"]=="holdout":
            shunt *= changes.get("holdout_shunt_scale",1.)
        target = equilibrium(active_hot, guard, ref, bond, leak, bypass, shunt, ambient, ambient_leak)
        rate = (bond+leak+bypass+shunt+ambient_leak)/capacity
        plateau = []
        for step in range(round(phase["duration_s"]/dt)):
            old = pad
            decay = exp(-rate*dt)
            pad = target+(old-target)*decay
            cooling_energy += shunt*((target-ref)*dt+(old-target)*(1-decay)/rate)
            time += dt
            observed_reference = base if changes.get("reference_readout_stuck") else ref
            readout = min(pad,plant["clip_c"])
            sample = dict(time_s=round(time,6),phase=phase["name"],purpose=phase["purpose"],
                hot_c=active_hot,pad_c=pad,readout_c=readout,guard_c=guard,
                reference_c=ref,observed_reference_c=observed_reference,shunt_w_per_k=shunt,
                commanded_shunt_w_per_k=phase["shunt_w_per_k"])
            plateau.append(sample)
            if step%5==0 or step==round(phase["duration_s"]/dt)-1:
                samples.append(sample)
        recent=plateau[-20:]
        settled=abs(recent[-1]["readout_c"]-recent[0]["readout_c"])/(recent[-1]["time_s"]-recent[0]["time_s"])<.02
        # Decimal acquisition quantization is negligible relative to the declared
        # 0.1 C budget and avoids platform libm last bits changing rational evidence.
        observations.append(Observation(phase["name"],round(sum(s["readout_c"] for s in recent)/len(recent),9),
            guard,observed_reference,phase["shunt_w_per_k"],
            any(s["readout_c"]>=plant["clip_c"] for s in recent),settled))
    result=estimate(observations,budget,clip_c=plant["clip_c"],**protocol["criteria"])
    interval=result["source_interval_c"]
    return dict(id=case["id"],name=case["name"],evaluation=case["evaluation"],
        plant_truth=plant,hidden_faults=changes,measurement_budget=asdict(budget),
        observations=[asdict(o) for o in observations],samples=samples,result=result,
        evaluation_only=dict(absolute_point_error_c=None if result["estimated_hot_c"] is None else abs(result["estimated_hot_c"]-hot),
            interval_contains_initial_truth=None if interval is None else interval[0]<=hot<=interval[1],
            model_under_limit_while_true_hot=result["model_classification"]=="within_limit" and hot>protocol["criteria"]["model_limit_c"],
            shunt_heat_j=cooling_energy,guard_and_reference_actuator_energy_j=None),
        physical_validation=False)


def build_report():
    protocol=json.loads(Path(__file__).with_name("protocol.json").read_text(encoding="utf-8"))
    return dict(title="Reference-excited thermal bridge",scope=protocol["scope"],
        physical_validation=protocol["physical_validation"],protocol=protocol,
        cases=[simulate(case,protocol) for case in protocol["cases"]])


if __name__ == "__main__":
    import argparse
    import hashlib
    import time
    parser=argparse.ArgumentParser()
    parser.add_argument("--check",action="store_true")
    args=parser.parse_args()
    started=time.perf_counter()
    report=build_report()
    base=Path(__file__).resolve().parent
    report["source_hashes"]={name:hashlib.sha256((base/name).read_bytes()).hexdigest() for name in ("model.py","linear_bounds.py","protocol.json")}
    output=base/"results.json"
    if args.check:
        from report_io import compare_report
        compare_report(json.loads(output.read_text(encoding="utf-8")),report)
    else:
        output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")
    for case in report["cases"]:
        r=case["result"]
        print(case["id"],r["status"],r["estimated_hot_c"],r["source_interval_c"],r["model_classification"])
    print("Synthetic report completed in",round(time.perf_counter()-started,2),"seconds. Physical measurements: 0.")
