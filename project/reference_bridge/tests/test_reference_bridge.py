"""Independent mathematical and adversarial checks; no hardware measurements.

The known failure cases are assertions to preserve, not fixtures to relabel as
successful validation. Finite error sweeps supplement the exact certificates;
they are not themselves an uncertainty proof.
"""
from dataclasses import fields, replace
from fractions import Fraction as F
import importlib.util
import inspect
from itertools import product
from math import isfinite
from pathlib import Path
import sys
import unittest


BASE = Path(__file__).resolve().parents[1]


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


m = load_module("reference_bridge_independent_tests", BASE / "model.py")
legacy = load_module("legacy_bridge_independent_tests", BASE.parent / "thermal_bridge" / "model.py")

# Exact rational, independently chosen excitation settings and heat balance.
SETTINGS = (
    (F(".020"), F(40), F(40)),
    (F(".050"), F(40), F(40)),
    (F(".035"), F(65), F(40)),
    (F(".035"), F(40), F(55)),
    (F(".040"), F(50), F(48)),
)


def analytical_observations(hot=F(130), bond=F(".020"),
                            leak=F(".005"), bypass=F(".020")):
    observations = []
    for index, (shunt, guard, reference) in enumerate(SETTINGS):
        pad = (bond * hot + leak * guard + (bypass + shunt) * reference) / (
            bond + leak + bypass + shunt)
        observations.append(m.Observation(chr(65 + index), pad, guard, reference, shunt))
    return observations


def dot(a, b):
    return sum((F(x) * F(y) for x, y in zip(a, b)), F(0))


def verify_certificates(test, A, b, objectives, result):
    """Reconstruct proofs from input inequalities, without invoking LP helpers."""
    if result["feasible"]:
        test.assertIsNotNone(result["witness"])
        for row, limit in zip(A, b):
            test.assertLessEqual(dot(row, result["witness"]), F(limit))
    for name, objective in objectives.items():
        for side, sign, bound_key in (("upper", 1, "upper_bound"),
                                      ("lower", -1, "upper_for_negative")):
            certificate = result["bounds"][name][side + "_certificate"]
            if certificate is None:
                test.assertIsNone(result["bounds"][name][side])
                continue
            indices, weights = certificate["indices"], certificate["weights"]
            test.assertEqual(len(indices), len(weights))
            test.assertTrue(all(F(weight) >= 0 for weight in weights))
            for column in range(4):
                weighted = sum((F(weight) * F(A[index][column])
                                for index, weight in zip(indices, weights)), F(0))
                test.assertEqual(weighted, sign * F(objective[column]))
            bound = sum((F(weight) * F(b[index])
                         for index, weight in zip(indices, weights)), F(0))
            test.assertEqual(bound, F(certificate[bound_key]))
            test.assertEqual(sign * bound, F(result["bounds"][name][side]))


class ExactLinearCertificateTests(unittest.TestCase):
    def test_bounded_box_has_known_mixed_sign_extrema_and_valid_proofs(self):
        endpoints = ((-2, 3), (F(1, 7), F(4, 7)), (-5, -1), (0, 9))
        A, b = [], []
        for column, (lo, hi) in enumerate(endpoints):
            row = [0] * 4
            row[column] = 1
            A.extend((row, [-value for value in row]))
            b.extend((hi, -lo))
        objectives = {"mixed": [1, -2, 3, F(-1, 3)], "zero": [0, 0, 0, 0]}
        result = m.certify_polytope(A, b, objectives)
        verify_certificates(self, A, b, objectives, result)
        extrema = [dot(objectives["mixed"], corner) for corner in product(*endpoints)]
        self.assertEqual(result["status"], "certified")
        self.assertEqual(result["bounds"]["mixed"]["lower"], min(extrema))
        self.assertEqual(result["bounds"]["mixed"]["upper"], max(extrema))
        self.assertEqual(result["bounds"]["zero"]["lower"], 0)
        self.assertEqual(result["bounds"]["zero"]["upper"], 0)

    def test_ray_does_not_fabricate_a_finite_upper_bound(self):
        A = [[-int(i == j) for j in range(4)] for i in range(4)]
        result = m.certify_polytope(A, [0] * 4, {"x": [1, 0, 0, 0]})
        verify_certificates(self, A, [0] * 4, {"x": [1, 0, 0, 0]}, result)
        self.assertTrue(result["feasible"])
        self.assertEqual(result["status"], "inconclusive")
        self.assertEqual(result["bounds"]["x"]["lower"], 0)
        self.assertIsNone(result["bounds"]["x"]["upper"])

    def test_contradictory_constraints_never_claim_a_feasible_witness(self):
        A = [[-int(i == j) for j in range(4)] for i in range(4)] + [[1, 0, 0, 0]]
        b = [0, 0, 0, 0, -1]
        result = m.certify_polytope(A, b, {"x": [1, 0, 0, 0]})
        verify_certificates(self, A, b, {"x": [1, 0, 0, 0]}, result)
        self.assertFalse(result["feasible"])
        self.assertIsNone(result["witness"])
        self.assertEqual(result["status"], "inconclusive")

    def test_feasible_slab_without_vertices_is_inconclusive(self):
        result = m.certify_polytope([[1, 0, 0, 0], [-1, 0, 0, 0]],
                                    [1, 0], {"x": [1, 0, 0, 0]})
        self.assertEqual(result["status"], "inconclusive")
        self.assertIsNone(result["witness"])

    def test_exact_solve_pivots_and_rejects_singular_or_invalid_inputs(self):
        self.assertEqual(m.solve_linear([[0, 2], [3, 4]], [6, 15]), [F(1), F(3)])
        for matrix, rhs in (([[1, 2], [2, 4]], [1, 2]), ([[1, 2]], [1]),
                            ([[float("nan")]], [1]), ([[float("inf")]], [1])):
            with self.subTest(matrix=matrix), self.assertRaises(ValueError):
                m.solve_linear(matrix, rhs)
        for bad in (float("nan"), float("inf"), float("-inf")):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                m.certify_polytope([[bad, 0, 0, 0]], [1], {"x": [1, 0, 0, 0]})


class ReferenceBridgeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.report = m.build_report()
        cls.cases = {case["id"]: case for case in cls.report["cases"]}

    def test_independent_rational_fixture_recovers_130_and_all_conductances(self):
        observations = analytical_observations()
        self.assertEqual([o.pad_c for o in observations],
                         [F(880, 13), F(1120, 19), F(1025, 16), F(1165, 16), F(1146, 17)])
        result = m.estimate(observations, m.Budget(0, 0, 0, 0, 0))
        self.assertEqual(result["estimated_hot_c"], 130)
        self.assertEqual(result["estimated_bond_w_per_k"], .020)
        self.assertEqual(result["estimated_guard_leak_w_per_k"], .005)
        self.assertEqual(result["estimated_reference_bypass_w_per_k"], .020)
        self.assertEqual(F(result["certificate"]["bounds"]["hot"]["lower"]), 130)
        self.assertEqual(F(result["certificate"]["bounds"]["hot"]["upper"]), 130)
        self.assertLessEqual(result["source_interval_c"][0], 130)
        self.assertGreaterEqual(result["source_interval_c"][1], 130)
        self.assertLess(result["source_interval_c"][1] - result["source_interval_c"][0], 1e-12)
        self.assertEqual(result["holdout_error_c"], 0)
        self.assertEqual(result["status"], "model_consistent")
        self.assertEqual(result["motor_permission"], "not_authorized")
        self.assertFalse(result["hardware_validated"])

    def test_original_model_still_exhibits_the_false_85_case(self):
        settings = ((F(".020"), F(40)), (F(".050"), F(40)),
                    (F(".035"), F(65)), (F(".040"), F(50)))
        observations = []
        for index, (shunt, guard) in enumerate(settings):
            pad = (F(".020") * 130 + F(".005") * guard + (F(".020") + shunt) * 40) / (
                F(".045") + shunt)
            observations.append(legacy.Observation(str(index), float(pad), 40.,
                                                    float(shunt), float(guard)))
        result = legacy.estimate(observations)
        self.assertEqual(result["status"], "consistent")
        self.assertAlmostEqual(result["estimated_hot_c"], 85, places=10)
        self.assertAlmostEqual(result["estimated_bond_w_per_k"], .040, places=12)

    def test_thermal_dual_and_primal_certificates_reconstruct_exactly(self):
        observations = analytical_observations()
        budget = m.Budget(imbalance_w=0)
        A, b = m.constraints(observations[:4], budget)
        result = m.certify_polytope(A, b, {"hot": [1, 0, 0, 0], "inverse_bond": [0, 0, 0, 1]})
        verify_certificates(self, A, b, {"hot": [1, 0, 0, 0], "inverse_bond": [0, 0, 0, 1]}, result)
        self.assertEqual(result["status"], "certified")
        self.assertAlmostEqual(float(result["bounds"]["hot"]["lower"]), 114.3041285909292, places=9)
        self.assertAlmostEqual(float(result["bounds"]["hot"]["upper"]), 156.6332472780967, places=9)

    def test_fifth_observation_cannot_change_fit_or_temperature_bounds(self):
        observations = analytical_observations()
        initial = m.estimate(observations)
        altered = observations[:4] + [replace(observations[4], pad_c=observations[4].pad_c + 2)]
        challenged = m.estimate(altered)
        for key in ("estimated_hot_c", "estimated_bond_w_per_k", "source_interval_c",
                    "minimum_possible_bond_w_per_k", "certificate"):
            self.assertEqual(initial[key], challenged[key], key)
        self.assertGreater(challenged["holdout_error_c"], .75)
        self.assertEqual(challenged["status"], "inconclusive")
        self.assertIn("unused fifth", challenged["reason"])

    def test_missing_clipped_unsettled_and_nonfinite_observations_reject(self):
        original = analytical_observations()
        invalid = (
            (original[:4], "Five observations"),
            ([replace(original[0], clipped=True)] + original[1:], "clipped"),
            ([replace(original[0], pad_c=94.9)] + original[1:], "rail"),
            ([replace(original[0], settled=False)] + original[1:], "settling"),
            ([replace(original[0], pad_c=float("nan"))] + original[1:], "Nonfinite"),
            ([replace(original[0], shunt_w_per_k=float("inf"))] + original[1:], "Nonfinite"),
            ([replace(original[0], shunt_w_per_k=0)] + original[1:], "Invalid"),
        )
        for observations, reason in invalid:
            with self.subTest(reason=reason):
                result = m.estimate(observations)
                self.assertEqual(result["status"], "inconclusive")
                self.assertIsNone(result["source_interval_c"])
                self.assertIn(reason.lower(), result["reason"].lower())

    def test_invalid_error_budgets_reject(self):
        for budget in (m.Budget(pad_error_c=-.1), m.Budget(shunt_relative_error=1),
                       m.Budget(imbalance_w=float("nan"))):
            result = m.estimate(analytical_observations(), budget)
            self.assertEqual(result["status"], "inconclusive")
            self.assertIsNone(result["certificate"])

    def test_guard_reference_excitation_and_rank_are_required(self):
        original = analytical_observations()
        for field in ("guard_c", "reference_c"):
            observations = [replace(o, **{field: F(40)}) for o in original]
            result = m.estimate(observations)
            self.assertEqual(result["status"], "inconclusive")
            self.assertIn("excitation", result["reason"])
        dependent = [replace(o, guard_c=o.reference_c) for o in original]
        result = m.estimate(dependent)
        self.assertEqual(result["status"], "inconclusive")
        self.assertIn("rank deficient", result["reason"])

    def test_estimator_interface_has_no_hidden_source_or_case_identifier(self):
        self.assertEqual({field.name for field in fields(m.Observation)},
                         {"phase", "pad_c", "guard_c", "reference_c", "shunt_w_per_k", "clipped", "settled"})
        self.assertFalse({"hot_c", "hot", "truth", "case_id", "plant", "hidden_faults"} &
                         set(inspect.signature(m.estimate).parameters))
        record = self.cases["reference_bypass_130"]
        observations = [m.Observation(**row) for row in record["observations"]]
        result = m.estimate(observations, m.Budget(**record["measurement_budget"]))
        self.assertEqual(result, record["result"])
        renamed = [replace(o, phase=f"anonymous_{i}") for i, o in enumerate(observations)]
        renamed_result = m.estimate(renamed, m.Budget(**record["measurement_budget"]))
        for key in ("estimated_hot_c", "source_interval_c", "status", "certificate"):
            self.assertEqual(result[key], renamed_result[key])

    def test_deterministic_sensor_and_shunt_errors_remain_inside_certified_boxes(self):
        budget = m.Budget(imbalance_w=0)
        truth = [F(130), F(1, 4), F(1), F(50)]
        checked = 0
        for signs in product((-1, 1), repeat=3):
            for alternate in (False, True):
                observations = []
                for index, (nominal, guard, reference) in enumerate(SETTINGS):
                    direction = -1 if alternate and index % 2 else 1
                    actual_shunt = nominal * (1 + F(direction, 100))
                    pad = (F(".020") * 130 + F(".005") * guard +
                           (F(".020") + actual_shunt) * reference) / (F(".045") + actual_shunt)
                    observations.append(m.Observation(str(index), pad + F(signs[0] * direction, 10),
                        guard + F(signs[1] * direction, 10), reference + F(signs[2] * direction, 10), nominal))
                A, b = m.constraints(observations[:4], budget)
                self.assertTrue(all(dot(row, truth) <= limit for row, limit in zip(A, b)))
                result = m.estimate(observations, budget)
                self.assertIsNotNone(result["source_interval_c"])
                lo, hi = result["source_interval_c"]
                self.assertLessEqual(lo, 130)
                self.assertGreaterEqual(hi, 130)
                checked += 1
        self.assertEqual(checked, 16)

    def test_error_constraints_cover_hot_reference_and_product_sign_crossing(self):
        for observations, truth in (
            (analytical_observations(hot=F(20)), [F(20), F(1, 4), F(1), F(50)]),
            ([m.Observation("equal", F(40), F(40), F(40), F(".02"))],
             [F(40), F(1, 4), F(1), F(50)]),
        ):
            A, b = m.constraints(observations, m.Budget(imbalance_w=0))
            self.assertTrue(all(dot(row, truth) <= limit for row, limit in zip(A, b)))

    def test_minimum_bond_is_not_assumed_to_construct_the_feasible_set(self):
        bond = F(".003")
        observations = analytical_observations(bond=bond)
        truth = [F(130), F(".005") / bond, F(".020") / bond, 1 / bond]
        A, b = m.constraints(observations[:4], m.Budget(imbalance_w=0))
        self.assertTrue(all(dot(row, truth) <= limit for row, limit in zip(A, b)))
        self.assertGreater(truth[3], 1 / F(".008"))
        self.assertEqual(m.estimate(observations)["status"], "inconclusive")

    def test_one_percent_is_bounded_but_ten_percent_has_no_upper_certificate(self):
        observations = analytical_observations()
        narrow = m.estimate(observations, m.Budget(imbalance_w=0))
        wide = m.estimate(observations, m.Budget(shunt_relative_error=.1, imbalance_w=0))
        self.assertIsNotNone(narrow["source_interval_c"])
        self.assertEqual(narrow["status"], "inconclusive")
        self.assertGreater(narrow["interval_width_c"], 20)
        self.assertEqual(wide["status"], "inconclusive")
        self.assertIsNone(wide["source_interval_c"])
        self.assertIsNone(wide["certificate"]["bounds"]["hot"]["upper"])

    def test_frozen_default_case_preserves_the_precision_failure(self):
        result = self.cases["reference_bypass_130"]["result"]
        self.assertAlmostEqual(result["estimated_hot_c"], 130, places=8)
        self.assertAlmostEqual(result["source_interval_c"][0], 113.7243133690785, places=7)
        self.assertAlmostEqual(result["source_interval_c"][1], 158.2817087476227, places=7)
        self.assertGreater(result["interval_width_c"], 20)
        self.assertEqual(result["status"], "inconclusive")
        self.assertEqual(result["model_classification"], "above_limit")
        self.assertIn("too wide", result["reason"])

    def test_exact_fixed_ambient_alias_survives_arbitrary_boundary_equilibria(self):
        for shunt, guard, reference in product((F(".003"), F(".035"), F(".090")),
                                               (F(25), F(65), F(80)),
                                               (F(30), F(55), F(90))):
            actual = m.equilibrium(F(130), guard, reference, F(".020"), F(".005"),
                                   F(".020"), shunt, F(40), F(".020"))
            alias = m.equilibrium(F(85), guard, reference, F(".040"), F(".005"),
                                  F(".020"), shunt, F(40), F(0))
            # The two numerator constants are 0.02*130 + 0.02*40 = 0.04*85.
            # Both total conductances are 0.065 + shunt, so the alias is exact.
            expected = (F("3.4") + F(".005") * guard +
                        (F(".020") + shunt) * reference) / (F(".065") + shunt)
            self.assertEqual(actual, expected)
            self.assertEqual(alias, expected)

    def test_fixed_ambient_alias_preserves_transients_and_cannot_be_rejected_by_id(self):
        protocol = self.report["protocol"]
        hidden = {"id": "anonymous_actual", "name": "A", "evaluation": "adversarial",
                  "changes": {"ambient_leak_w_per_k": .020}}
        cool_alias = {"id": "anonymous_alias", "name": "B", "evaluation": "adversarial",
                      "changes": {"hot_c": 85., "bond_w_per_k": .040}}
        actual = m.simulate(hidden, protocol)
        alias = m.simulate(cool_alias, protocol)
        self.assertEqual(len(actual["samples"]), len(alias["samples"]))
        for a, b in zip(actual["samples"], alias["samples"]):
            self.assertAlmostEqual(a["pad_c"], b["pad_c"], places=11)
            self.assertAlmostEqual(a["readout_c"], b["readout_c"], places=11)
            self.assertEqual(a["time_s"], b["time_s"])
        self.assertAlmostEqual(actual["evaluation_only"]["shunt_heat_j"],
                               alias["evaluation_only"]["shunt_heat_j"], places=10)
        self.assertEqual(actual["result"]["status"], "model_consistent")
        self.assertEqual(actual["result"]["model_classification"], "within_limit")
        # The replay rounds synthetic observations to nine decimal places; the
        # exact equilibrium alias is established separately above.
        self.assertAlmostEqual(actual["result"]["estimated_hot_c"], 85, delta=1e-7)
        self.assertTrue(actual["evaluation_only"]["model_under_limit_while_true_hot"])
        self.assertFalse(actual["evaluation_only"]["interval_contains_initial_truth"])
        renamed = m.simulate({**hidden, "id": "unexcited_ambient_leak"}, protocol)
        self.assertEqual(actual["result"], renamed["result"])

    def test_recorded_fault_outcomes_and_absence_of_physical_validation(self):
        self.assertEqual(len(self.cases), 14)
        for case_id in ("weak_bond", "detached", "no_reference_excitation", "reference_readout_stuck",
                        "hot_reference", "source_drift_at_holdout", "holdout_shunt_fault",
                        "five_percent_shunt_uncertainty", "ten_percent_shunt_uncertainty"):
            self.assertEqual(self.cases[case_id]["result"]["status"], "inconclusive", case_id)
        for case_id in ("source_drift_at_holdout", "holdout_shunt_fault"):
            self.assertIn("unused fifth", self.cases[case_id]["result"]["reason"])
        self.assertEqual(self.cases["cool_source_80"]["result"]["status"], "model_consistent")
        self.assertTrue(self.cases["unexcited_ambient_leak"]["evaluation_only"]["model_under_limit_while_true_hot"])
        for case in self.cases.values():
            self.assertFalse(case["physical_validation"])
            self.assertFalse(case["result"]["hardware_validated"])
            self.assertEqual(case["result"]["motor_permission"], "not_authorized")
        self.assertEqual(self.report["physical_validation"]["measurements_collected"], 0)
        self.assertEqual(self.report["physical_validation"]["status"], "not_run")


class IndependentDynamicChallengeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        module = load_module("reference_bridge_dynamic_independent_tests", BASE / "dynamic_challenge.py")
        cls.report = module.build_report()

    def test_finite_rate_challenges_converge_without_claiming_hardware_validation(self):
        self.assertEqual(len(self.report["cases"]), 3)
        self.assertTrue(self.report["all_numerical_checks_pass"])
        self.assertFalse(self.report["physical_validation"])
        self.assertEqual(self.report["motor_permission"], "not_authorized")
        for case in self.report["cases"]:
            with self.subTest(case=case["id"]):
                refinement = case["step_refinement"]
                self.assertTrue(refinement["numerical_checks_pass"])
                self.assertGreater(refinement["coarse_dt_s"], refinement["fine_dt_s"])
                self.assertLess(refinement["maximum_phase_endpoint_temperature_difference_c"], 1e-4)
                self.assertLess(refinement["maximum_matched_transient_temperature_difference_c"], 1e-4)
                self.assertLess(case["plant"]["numerics"]["maximum_energy_balance_residual_j"], 1e-7)
                self.assertEqual(case["result"]["status"], "inconclusive")
                self.assertFalse(case["result"]["hardware_validated"])
                self.assertEqual(case["result"]["motor_permission"], "not_authorized")
                self.assertIsNone(case["plant"]["energy"]["electrical_actuator_energy_j"])

    def test_settling_uses_measured_channels_and_slow_plant_withholds_a_result(self):
        for case in self.report["cases"]:
            self.assertEqual(len(case["plant"]["observations"]), 5)
            for phase, observation in zip(case["plant"]["phase_records"], case["plant"]["observations"]):
                slopes = phase["observed_slopes_c_per_s"]
                self.assertEqual(set(slopes), {"pad", "guard", "reference"})
                self.assertTrue(all(isfinite(value) for value in slopes.values()))
                settled = all(abs(value) < .02 for value in slopes.values())
                self.assertEqual(phase["settled_by_observable_rule"], settled)
                self.assertEqual(observation["settled"], settled)
        slow = next(case for case in self.report["cases"] if case["id"] == "slow_pad_and_actuators")
        self.assertTrue(any(not row["settled"] for row in slow["plant"]["observations"]))
        self.assertIsNone(slow["result"]["source_interval_c"])
        self.assertIn("settling", slow["result"]["reason"])


if __name__ == "__main__":
    unittest.main()
