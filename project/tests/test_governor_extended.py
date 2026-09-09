"""Deterministic contract and property checks for the full scalar governor.

These checks use synthetic states, not hardware data. The exhaustive grid oracle
uses a closed-form trajectory independently of governor.admissible/propagate.
The final negative control explicitly exercises an assumption violation; its
passing result is evidence of a limitation, not of safety under that violation.
"""
import math
from pathlib import Path
import random
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from governor import Governor, Model, admissible, intersect_reading, propagate


def closed_form_prefixes(initial, efforts, model):
    """Independent constant-upper-corner solution at every FIFO prefix."""
    values = [initial]
    for n in range(1, len(efforts) + 1):
        value = model.amax ** n * initial
        value += sum(
            model.amax ** (n - 1 - j) * (model.bmax * effort ** 2 + model.wmax)
            for j, effort in enumerate(efforts[:n])
        )
        values.append(value)
    return values


class ExtendedThermalTests(unittest.TestCase):
    def test_model_rejects_nonfinite_fields_and_invalid_boxes(self):
        for field in Model().__dict__:
            for value in (math.nan, math.inf, -math.inf):
                with self.subTest(field=field, value=value):
                    with self.assertRaises(ValueError):
                        Model(**{field: value})
        bad_boxes = (
            {"amin": -0.01}, {"amin": 0.999}, {"amax": 1.0},
            {"bmin": -0.1}, {"bmin": 1.0}, {"bmin": 0, "bmax": 0},
            {"wmin": -0.01}, {"wmin": 0.05}, {"wmax": 1.0},
            {"ambient": 95}, {"clip": 105}, {"eps": -0.1},
            {"step": 0}, {"step": 1.01},
        )
        for changes in bad_boxes:
            with self.subTest(changes=changes):
                with self.assertRaises(ValueError):
                    Model(**changes)

    def test_commissioning_requires_ordered_finite_nonnegative_interval(self):
        for interval in ((-1, 5), (5, 4), (0, math.inf),
                         (math.nan, 5), (0, math.nan), (-math.inf, 5)):
            with self.subTest(interval=interval):
                with self.assertRaises(ValueError):
                    Governor("interval_queue", Model(), interval)
        Governor("interval_queue", Model(), (0, 0))

    def test_sensor_law_contains_truth_at_noise_and_clipping_boundaries(self):
        model = Model()
        for truth in (0, 0.1, 69.6, 69.7, 70, 70.3, 79):
            prior = (max(0, truth - 5), truth + 4)
            for noise in (-model.eps, 0, model.eps):
                reading = min(model.ambient + truth + noise, model.clip)
                with self.subTest(truth=truth, noise=noise, reading=reading):
                    lo, hi = intersect_reading(*prior, reading, model)
                    self.assertLessEqual(lo, truth + 1e-9)
                    self.assertGreaterEqual(hi, truth - 1e-9)
                    self.assertGreaterEqual(lo, prior[0] - 1e-9)
                    self.assertLessEqual(hi, prior[1] + 1e-9)
                    if reading == model.clip:
                        self.assertEqual(hi, prior[1])

    def test_sensor_below_ambient_can_describe_zero_rise(self):
        lo, hi = intersect_reading(0, 5, 24.7, Model())
        self.assertEqual(lo, 0)
        self.assertAlmostEqual(hi, 0)

    def test_unsaturated_reading_near_ceiling_retains_finite_error_bar(self):
        model = Model()
        reading = model.clip - 0.001  # Deliberately outside numerical tolerance.
        lo, hi = intersect_reading(60, 79, reading, model)
        self.assertAlmostEqual(lo, reading - model.ambient - model.eps)
        self.assertAlmostEqual(hi, reading - model.ambient + model.eps)
        self.assertLess(hi, 79)

    def test_sensor_nonfinite_and_above_ceiling_packets_are_rejected(self):
        for reading in (math.nan, math.inf, -math.inf, 95.01):
            with self.subTest(reading=reading):
                with self.assertRaises(ValueError):
                    intersect_reading(0, 80, reading, Model())

    def test_missing_sensor_preserves_the_full_prediction_interval(self):
        model = Model()
        lo, hi, truth = 20.0, 79.0, 55.0
        for k in range(150):
            effort = (k % 7) / 6
            lo, hi = propagate(lo, hi, effort, model)
            truth = 0.99 * truth + 0.8 * effort ** 2 + 0.02
            before_reading = (lo, hi)
            lo, hi = intersect_reading(lo, hi, None, model)
            self.assertEqual((lo, hi), before_reading)
            self.assertLessEqual(lo, truth)
            self.assertGreaterEqual(hi, truth)

    def test_queue_length_boundary_accepts_120_and_rejects_121(self):
        for count, expected in ((120, True), (121, False)):
            governor = Governor("interval_queue", Model(), (20, 40))
            result = governor.decide(None, [0.0] * count, 1)
            with self.subTest(count=count):
                self.assertEqual(result["valid"], expected)
                if not expected:
                    self.assertEqual(result["action"], 0)
                    self.assertEqual(result["reason"], "invalid queue contract")

    def test_out_of_range_and_nonfinite_queue_entries_latch_invalid(self):
        for effort in (-0.01, 1.01, math.nan, math.inf, -math.inf):
            governor = Governor("interval_queue", Model(), (20, 40))
            with self.subTest(effort=effort):
                first = governor.decide(None, [0, effort, 1], 1)
                second = governor.decide(None, [], 1)
                self.assertFalse(first["valid"])
                self.assertFalse(second["valid"])
                self.assertEqual(second["action"], 0)
        governor = Governor("interval_queue", Model(), (20, 40))
        self.assertTrue(governor.decide(None, [0, 1], 1)["valid"])

    def test_bad_measurement_cannot_be_cleared_by_later_plausible_data(self):
        governor = Governor("interval_queue", Model(), (70, 75))
        first = governor.decide(40, [], 1)
        governor.advance(0)
        second = governor.decide(95, [], 1)
        self.assertFalse(first["valid"])
        self.assertFalse(second["valid"])
        self.assertEqual(second["reason"], "empty measurement intersection")
        self.assertEqual(second["action"], 0)
        self.assertEqual(second["decision_id"], first["decision_id"] + 1)

    def test_invalid_acknowledgment_preserves_bounds_and_latches(self):
        for acknowledgment in (-0.01, 1.01, math.nan, math.inf, -math.inf):
            governor = Governor("interval_queue", Model(), (20, 40))
            with self.subTest(acknowledgment=acknowledgment):
                governor.advance(acknowledgment)
                self.assertEqual((governor.lo, governor.hi), (20, 40))
                governor.advance(0)
                decision = governor.decide(None, [], 1)
                self.assertFalse(decision["valid"])
                self.assertEqual(decision["reason"], "invalid acknowledgment")
                self.assertEqual(decision["action"], 0)

    def test_invalid_demand_raises_without_authorizing_an_action(self):
        governor = Governor("interval_queue", Model(), (20, 40))
        for demand in (-0.01, 1.01, math.nan, math.inf, -math.inf):
            with self.subTest(demand=demand):
                with self.assertRaises(ValueError):
                    governor.decide(None, [], demand)
        # Bad requested effort is a caller error; it does not reset an interval.
        self.assertEqual((governor.lo, governor.hi), (20, 40))
        self.assertTrue(governor.decide(None, [], 0)["valid"])

    def test_no_fallback_latches_even_after_queue_is_reported_empty(self):
        governor = Governor("interval_queue", Model(), (79, 79))
        first = governor.decide(None, [1] * 8, 0)
        second = governor.decide(None, [], 0)
        self.assertFalse(first["valid"])
        self.assertEqual(first["reason"], "no queued fallback certificate")
        self.assertEqual(first["action"], 0)
        self.assertFalse(second["valid"])
        self.assertGreater(first["peak"], 80)

    def test_over_limit_current_state_is_not_hidden_by_future_cooling(self):
        action, peak, valid = admissible(80.1, [0] * 120, 0, Model())
        self.assertFalse(valid)
        self.assertEqual(action, 0)
        self.assertGreaterEqual(peak, 80.1)

    def test_unsafe_prefix_is_rejected_even_when_queue_end_is_safe(self):
        model = Model(ambient=0, clip=1, limit=1.5, amin=0.5, amax=0.5,
                      bmin=1, bmax=1, wmin=0, wmax=0, step=0.1)
        queue = [1, 0]
        path = closed_form_prefixes(1.4, queue, model)
        self.assertGreater(path[1], model.limit)
        self.assertLess(path[-1], model.limit)
        action, peak, valid = admissible(1.4, queue, 1, model)
        self.assertFalse(valid)
        self.assertEqual(action, 0)
        self.assertAlmostEqual(peak, 1.7)

    def test_fifo_order_is_material_even_for_same_effort_multiset(self):
        model = Model(ambient=0, clip=1, limit=1.5, amin=0.5, amax=0.5,
                      bmin=1, bmax=1, wmin=0, wmax=0, step=0.1)
        early_heat = admissible(1.4, [1, 0], 1, model)
        late_heat = admissible(1.4, [0, 1], 1, model)
        self.assertFalse(early_heat[2])
        self.assertTrue(late_heat[2])
        self.assertAlmostEqual(late_heat[0], 0.9)

    def test_action_is_maximal_against_independent_exhaustive_grid_oracle(self):
        rng = random.Random(602918)
        for step in (0.03, 0.05, 0.2):
            model = Model(step=step)
            limit = model.limit - model.ambient
            for case in range(160):
                initial = rng.uniform(0, limit * 1.01)
                queue = [rng.choice((0.0, 0.25, 0.7, 1.0))
                         for _ in range(rng.randrange(21))]
                demand = rng.random()
                queue_peak = max(closed_form_prefixes(initial, queue, model))
                with self.subTest(step=step, case=case):
                    action, peak, valid = admissible(initial, queue, demand, model)
                    if queue_peak > limit + 1e-9:
                        self.assertFalse(valid)
                        self.assertEqual(action, 0)
                        self.assertAlmostEqual(peak, queue_peak, places=9)
                        continue
                    candidates = [index * step
                                  for index in range(math.floor(1 / step) + 1)
                                  if index * step <= demand + 1e-12]
                    safe = [candidate for candidate in candidates
                            if max(closed_form_prefixes(initial, queue + [candidate], model))
                            <= limit + 1e-9]
                    self.assertTrue(valid)
                    self.assertTrue(safe)
                    self.assertAlmostEqual(action, max(safe), places=10)
                    self.assertLessEqual(action, demand + 1e-12)
                    self.assertAlmostEqual(peak, max(closed_form_prefixes(
                        initial, queue + [action], model)), places=9)

    def test_admitted_candidate_has_bounded_infinite_zero_input_tail(self):
        model = Model()
        limit = model.limit - model.ambient
        equilibrium = model.wmax / (1 - model.amax)
        for initial in (0, 8, 40, 70, 79, 80):
            for queue in ([], [0] * 120, [1] * 3, [0.25, 1, 0.5]):
                action, _, valid = admissible(initial, queue, 1, model)
                if not valid:
                    continue
                end = closed_form_prefixes(initial, queue + [action], model)[-1]
                self.assertLessEqual(max(end, equilibrium), limit + 1e-9)
                for k in (1, 10, 100, 10000):
                    tail = equilibrium + model.amax ** k * (end - equilibrium)
                    self.assertLessEqual(tail, limit + 1e-9)

    def test_higher_upper_bound_never_increases_admitted_effort(self):
        model = Model()
        for queue in ([], [0] * 12, [0.7] * 12, [1] * 12):
            previous = 1.0
            for upper in range(81):
                action, _, _ = admissible(upper, queue, 1, model)
                self.assertLessEqual(action, previous + 1e-12)
                previous = action

    def test_greater_request_cannot_reduce_admitted_effort(self):
        model = Model(step=0.03)
        for upper, queue in ((30, []), (79, []), (75, [0.5] * 8)):
            previous = 0.0
            for index in range(101):
                demand = index / 100
                action, _, valid = admissible(upper, queue, demand, model)
                self.assertTrue(valid)
                self.assertGreaterEqual(action, previous - 1e-12)
                self.assertLessEqual(action, demand + 1e-12)
                previous = action

    def test_delayed_closed_loops_contain_time_varying_in_box_plants(self):
        model = Model()
        for delay in (0, 1, 7, 60, 120):
            rng = random.Random(703000 + delay)
            governor = Governor("interval_queue", model, (70, 79))
            truth = 79.0
            queue = [0.0] * delay
            for k in range(360):
                noise = rng.choice((-model.eps, 0, model.eps))
                reading = (None if k % 11 < 3 else
                           min(model.ambient + truth + noise, model.clip))
                demand = (0.0, 0.35, 1.0, 0.7, 1.0)[(k // 17) % 5]
                decision = governor.decide(reading, queue, demand)
                with self.subTest(delay=delay, sample=k):
                    self.assertTrue(decision["valid"])
                    self.assertLessEqual(decision["lo"], truth + 1e-8)
                    self.assertGreaterEqual(decision["hi"], truth - 1e-8)
                    self.assertLessEqual(decision["action"], demand + 1e-12)
                    if delay:
                        applied = queue.pop(0)
                        queue.append(decision["action"])
                    else:
                        applied = decision["action"]
                    a = rng.choice((model.amin, model.amax,
                                    (model.amin + model.amax) / 2))
                    b = rng.choice((model.bmin, model.bmax,
                                    (model.bmin + model.bmax) / 2))
                    w = rng.choice((model.wmin, model.wmax))
                    truth = a * truth + b * applied ** 2 + w
                    governor.advance(applied)
                    self.assertLessEqual(truth, model.limit - model.ambient + 1e-8)
                    self.assertLessEqual(governor.lo, truth + 1e-8)
                    self.assertGreaterEqual(governor.hi, truth - 1e-8)

    def test_false_in_range_ack_can_lose_containment_without_invalid_flag(self):
        """Negative control: caller-reported effort is not physical validation."""
        model = Model()
        governor = Governor("interval_queue", model, (80, 80))
        first = governor.decide(model.clip, [], 0)
        self.assertTrue(first["valid"])
        self.assertEqual(first["action"], 0)
        actual_effort, reported_effort = 1.0, 0.0
        truth = model.amax * 80 + model.bmax * actual_effort ** 2 + model.wmax
        governor.advance(reported_effort)
        second = governor.decide(None, [], 0)
        self.assertTrue(second["valid"])
        self.assertGreater(truth, second["hi"])
        self.assertGreater(truth, model.limit - model.ambient)


if __name__ == "__main__":
    unittest.main(verbosity=2)
