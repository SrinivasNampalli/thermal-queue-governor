"""Exact arithmetic mechanism example; no motor validation or novelty claim.

The two hypothetical queue states share the same clipped reading. Exhaustive
future service schedules verify an earliest-service shortcut for the zero-
disturbance example and an idle-envelope calculation for nonzero disturbance.
"""
import argparse
from dataclasses import dataclass
from fractions import Fraction as F
import json
from pathlib import Path

A, B, LIMIT, AMBIENT, CLIP = F(99, 100), F(4), F(80), F(25), F(95)
GRID = tuple(F(k, 20) for k in range(21))
OUTPUT = Path(__file__).resolve().parents[1] / "research/JOINT_QUEUE_EXAMPLE.json"


@dataclass(frozen=True)
class Branch:
    rise: F
    remaining: tuple
    idle_count: int


def step(rise, effort):
    return A * rise + B * effort * effort


def schedules(commands, idle_count=0, max_idle=1):
    """Enumerate every schedule with at most max_idle consecutive idle steps.

    Idle means zero applied effort. An accepted zero-effort command is still
    served exactly once. No candidate or existing command may be canceled.
    """
    if not commands:
        yield ()
        return
    for waits in range(max_idle + 1 - idle_count):
        for suffix in schedules(commands[1:], 0, max_idle):
            yield (F(0),) * waits + (commands[0],) + suffix


def exhaustive_peak(branch, candidate):
    peaks = []
    for sequence in schedules(branch.remaining + (candidate,), branch.idle_count):
        value, peak = branch.rise, branch.rise
        for effort in sequence:
            value = step(value, effort)
            peak = max(peak, value)
        peaks.append(peak)
    # After the queue drains, x_next=.99*x; zero input cannot raise the state.
    return max(peaks), peaks


def earliest_service_peak(branch, candidate):
    """Special-case shortcut; not a general uncertain-actuation controller.

    Removing a zero-input idle step raises (or retains) the nonnegative state
    at every later service event. Thus immediate service maximizes this model's
    per-prefix peak. This argument does not apply to arbitrary idle heating.
    """
    value, peak = branch.rise, branch.rise
    for effort in branch.remaining + (candidate,):
        value = step(value, effort)
        peak = max(peak, value)
    return peak


def explicit_wait_peak(rise, commands, idle_count, max_idle, a, b, w):
    """Exact worst prefix for this scalar model and bounded zero-idle contract.

    Includes the zero-input infinite tail. It evaluates the monotone idle
    envelope at each service index without enumerating all timing sequences.
    """
    equilibrium = w / (1 - a)
    value, peak = rise, max(rise, equilibrium)
    for index, effort in enumerate(commands):
        waits = max_idle - idle_count if index == 0 else max_idle
        latest = equilibrium + a ** waits * (value - equilibrium)
        before = max(value, latest)
        value = a * before + b * effort * effort + w
        peak = max(peak, before, value)
    return peak


def verify_wait_envelope():
    """Compare a closed form with a separate exhaustive state evolution.

    Fixtures include x below the zero-input equilibrium, where waiting heats
    the state and the earliest-service shortcut is wrong. This is a finite
    exact-arithmetic check, not a proof over all models or a motor dataset.
    """
    cases, enumerated_paths = 0, 0
    for a in (F(1, 2), F(9, 10)):
        for w in (F(0), F(1, 4)):
            for rise in (F(0), F(2), F(5), F(10)):
                for max_idle in (0, 1, 2):
                    for already_idle in range(max_idle + 1):
                        for queue in ((), (F(1, 2),), (F(4, 5), F(1, 5))):
                            for candidate in (F(0), F(1, 2), F(1)):
                                commands = queue + (candidate,)
                                oracle = max(rise, w / (1 - a))
                                for sequence in schedules(commands, already_idle, max_idle):
                                    value = rise
                                    for effort in sequence:
                                        value = a * value + F(4) * effort * effort + w
                                        oracle = max(oracle, value)
                                    enumerated_paths += 1
                                explicit = explicit_wait_peak(rise, commands, already_idle, max_idle, a, F(4), w)
                                assert explicit == oracle, (a, w, rise, commands, max_idle, already_idle)
                                cases += 1
    assert cases == 864
    return {"finite_cases": cases, "enumerated_schedules": enumerated_paths,
            "all_exactly_equal": True, "includes_waiting_below_equilibrium": True,
            "scope": "Finite exact-arithmetic verification of the stated scalar service contract; not global proof or physical validation"}


def calculate():
    initial, old_effort = F(749, 10), F(4, 5)
    branches = (
        Branch(step(initial, old_effort), (), 0),
        Branch(step(initial, F(0)), (old_effort,), 1),
    )
    assert all(min(AMBIENT + branch.rise, CLIP) == CLIP for branch in branches)
    upper = max(branch.rise for branch in branches)
    rectangle = tuple(Branch(upper, branch.remaining, branch.idle_count) for branch in branches)
    rows = []
    for candidate in GRID:
        correlated = max(exhaustive_peak(branch, candidate)[0] for branch in branches)
        shortcut = max(earliest_service_peak(branch, candidate) for branch in branches)
        decoupled = max(exhaustive_peak(branch, candidate)[0] for branch in rectangle)
        assert correlated == shortcut, "Shortcut disagrees with full timing enumeration"
        assert correlated <= decoupled, "Cartesian enlargement must not reduce worst-case peak"
        rows.append({"candidate": float(candidate), "joint_peak_rise_C": float(correlated),
                     "rectangle_peak_rise_C": float(decoupled),
                     "joint_admits": correlated <= LIMIT, "rectangle_admits": decoupled <= LIMIT})
    joint = max(row["candidate"] for row in rows if row["joint_admits"])
    decoupled = max(row["candidate"] for row in rows if row["rectangle_admits"])
    assert joint == 1.0 and decoupled == 0.75
    futures = [value for branch in branches for value in exhaustive_peak(branch, F(1))[1]]
    assert futures == [F("79.94389"), F("79.1844511"), F("79.2097951"), F("78.457697149")]
    assert rows[-1]["rectangle_peak_rise_C"] == float(F("81.7188511"))
    return {
        "scope": "Constructed exact-arithmetic example; no motor, calibration, held-out study, or patentability evidence",
        "model": {"a": ".99", "b": "4", "w": "0", "ambient_C": 25,
                  "temperature_limit_C": 105, "clipping_C": 95, "effort_grid": ".05"},
        "contract": "Exactly-once FIFO; at most one consecutive zero-effort idle while backlogged; zero effort after drain",
        "current_hypotheses": [
            {"explanation": "Old command executed; its heat is already present", "rise_C": float(branches[0].rise), "temperature_C": float(AMBIENT + branches[0].rise), "remaining_efforts": []},
            {"explanation": "Old command did not execute; it remains an obligation", "rise_C": float(branches[1].rise), "temperature_C": float(AMBIENT + branches[1].rise), "remaining_efforts": [.8]},
        ],
        "shared_reading_C": 95,
        "candidate_levels_checked": len(GRID),
        "full_effort_future_peak_rises_C": [float(value) for value in futures],
        "joint_admitted_effort": joint,
        "rectangle_admitted_effort": decoupled,
        "joint_matches_full_history_reference_at_every_candidate": True,
        "zero_input_tail_decreases": True,
        "general_idle_envelope_check": verify_wait_envelope(),
        "interpretation": "Preserving correlation avoids a fictitious double heat obligation. A full joint-history robust reference obtains the same decision; this is not an advantage over that reference.",
        "candidates": rows,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify the checked-in arithmetic result without writing")
    args = parser.parse_args()
    result = calculate()
    if args.check:
        if json.loads(OUTPUT.read_text(encoding="utf-8")) != result:
            raise SystemExit("Stored joint-queue example differs; inspect the change.")
        print("PASS: 21 candidate levels, joint=1.00, rectangle=0.75; 864 idle-envelope cases equal exhaustive timing. Synthetic arithmetic only.")
    else:
        OUTPUT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8", newline="\n")
        print("Wrote the constructed exact-arithmetic example to " + str(OUTPUT))


if __name__ == "__main__":
    main()
