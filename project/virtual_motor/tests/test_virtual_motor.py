"""Synthetic code-verification fixtures only; not motor calibration or held-out data."""
from dataclasses import replace
import json
import math
from pathlib import Path
import sys
import tempfile
import unittest

PROJECT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT.parent))
from project.virtual_motor.plant import Parameters, State, VirtualMotor, current_solution, current_squared_integral
from project.virtual_motor import run_virtual_motor as runner


class PlantAnalyticalTests(unittest.TestCase):
    def test_current_step_matches_exponential_and_rms_integral(self):
        p = Parameters()
        motor = VirtualMotor(p, State(0, 25, 25, 25))
        result = motor.advance(0.5, 25)
        target = p.rated_current_A * 0.5
        self.assertAlmostEqual(result.end.current_A, target * (1 - math.exp(-1 / p.current_time_constant_s)), places=12)
        expected_i2 = target ** 2 * (1 - 2 * p.current_time_constant_s * (1 - math.exp(-1 / p.current_time_constant_s))
                                   + p.current_time_constant_s / 2 * (1 - math.exp(-2 / p.current_time_constant_s)))
        self.assertAlmostEqual(result.rms_current_A ** 2, expected_i2, places=11)

    def test_zero_input_ambient_equilibrium_is_unchanged(self):
        initial = State(0, 25, 25, 25)
        result = VirtualMotor(Parameters(), initial).advance(0, 25, duration_s=5)
        self.assertEqual(result.end, initial)
        self.assertEqual(result.joule_energy_J, 0)

    def test_two_thermal_masses_match_closed_form_without_heat_loss(self):
        p = replace(Parameters(), housing_to_ambient_W_per_K=0, copper_alpha_per_K=0)
        cw, ch, g = p.winding_capacity_J_per_K, p.housing_capacity_J_per_K, p.winding_to_housing_W_per_K
        initial = State(0, 90, 30, 90)
        result = VirtualMotor(p, initial).advance(0, 25, duration_s=4)
        weighted = (cw * 90 + ch * 30) / (cw + ch)
        difference = 60 * math.exp(-g * (1 / cw + 1 / ch) * 4)
        self.assertAlmostEqual(result.end.winding_C, weighted + ch / (cw + ch) * difference, places=9)
        self.assertAlmostEqual(result.end.housing_C, weighted - cw / (cw + ch) * difference, places=9)

    def test_constant_current_thermal_equilibrium(self):
        p = replace(Parameters(), copper_alpha_per_K=0)
        current, ambient = 7.0, 25.0
        power = current ** 2 * p.resistance_at_20C_ohm
        housing = ambient + power / p.housing_to_ambient_W_per_K
        winding = housing + power / p.winding_to_housing_W_per_K
        initial = State(current, winding, housing, winding)
        result = VirtualMotor(p, initial).advance(current / p.rated_current_A, ambient, duration_s=2)
        self.assertAlmostEqual(result.end.winding_C, winding, places=11)
        self.assertAlmostEqual(result.end.housing_C, housing, places=11)
        self.assertAlmostEqual(result.joule_energy_J, power * 2, places=10)

    def test_sensor_lag_matches_closed_form_with_constant_winding(self):
        p = replace(Parameters(), winding_to_housing_W_per_K=0, housing_to_ambient_W_per_K=0)
        result = VirtualMotor(p, State(0, 70, 25, 25)).advance(0, 25)
        self.assertAlmostEqual(result.end.sensor_C, 70 - 45 * math.exp(-1 / p.sensor_time_constant_s), delta=1e-6)
        self.assertEqual(result.end.winding_C, 70)

    def test_current_tail_adds_heat_after_zero_command(self):
        p = replace(Parameters(), copper_alpha_per_K=0, winding_to_housing_W_per_K=0, housing_to_ambient_W_per_K=0)
        initial = State(p.rated_current_A, 25, 25, 25)
        result = VirtualMotor(p, initial).advance(0, 25)
        exact_heat = p.resistance_at_20C_ohm * p.rated_current_A ** 2 * p.current_time_constant_s / 2 * (1 - math.exp(-2 / p.current_time_constant_s))
        self.assertGreater(result.rms_current_A, 0)
        self.assertGreater(result.end.winding_C, 25)
        self.assertAlmostEqual(result.end.winding_C, 25 + exact_heat / p.winding_capacity_J_per_K, delta=3e-6)

    def test_step_halving_improves_tail_heating_quadrature(self):
        p = replace(Parameters(), copper_alpha_per_K=0, winding_to_housing_W_per_K=0, housing_to_ambient_W_per_K=0)
        initial = State(p.rated_current_A, 25, 25, 25)
        exact = 25 + p.resistance_at_20C_ohm * current_squared_integral(p.rated_current_A, 0, 1, p.current_time_constant_s) / p.winding_capacity_J_per_K
        coarse = VirtualMotor(p, initial, 0.008).advance(0, 25)
        fine = VirtualMotor(p, initial, 0.004).advance(0, 25)
        self.assertLess(abs(fine.end.winding_C - exact), abs(coarse.end.winding_C - exact) / 10)

    def test_fast_current_tail_uses_resolved_heat_quadrature(self):
        p = replace(Parameters(), current_time_constant_s=0.0001, copper_alpha_per_K=0,
                    winding_to_housing_W_per_K=0, housing_to_ambient_W_per_K=0)
        result = VirtualMotor(p, State(14, 20, 20, 20)).advance(0, 20, duration_s=0.025)
        exact_heat = 0.8 * current_squared_integral(14, 0, 0.025, 0.0001)
        self.assertAlmostEqual(result.joule_energy_J, exact_heat, delta=2e-8)
        self.assertGreaterEqual(result.integration_substeps, 2000)
        self.assertLessEqual(result.actual_dt_s, p.current_time_constant_s / 8)

    def test_fast_sensor_lag_is_stable_and_matches_analytic_solution(self):
        p = replace(Parameters(), sensor_time_constant_s=0.0001,
                    winding_to_housing_W_per_K=0, housing_to_ambient_W_per_K=0)
        result = VirtualMotor(p, State(0, 70, 25, 25)).advance(0, 25, duration_s=0.001)
        self.assertAlmostEqual(result.end.sensor_C, 70 - 45 * math.exp(-10), delta=1e-6)
        self.assertLessEqual(result.actual_dt_s, p.sensor_time_constant_s / 4)

    def test_resolved_peak_can_exceed_both_one_second_endpoints(self):
        p = Parameters()
        initial = State(p.rated_current_A, 25, 25, 25)
        result = VirtualMotor(p, initial).advance(0, 25)
        self.assertGreater(result.peak_winding_C, max(initial.winding_C, result.end.winding_C) + 1e-5)
        self.assertGreater(result.peak_offset_s, 0)
        self.assertLess(result.peak_offset_s, 1)

    def test_hot_housing_can_heat_winding_with_zero_current(self):
        result = VirtualMotor(Parameters(), State(0, 30, 80, 30)).advance(0, 25)
        self.assertGreater(result.end.winding_C, 30)
        self.assertLess(result.end.housing_C, 80)
        self.assertEqual(result.joule_energy_J, 0)

    def test_energy_accounting_closes_for_nonsteady_thermal_states(self):
        motor = VirtualMotor(Parameters(), State(3, 85, 45, 80))
        for command in [1, 0, 0.25, 0.8, 0]:
            result = motor.advance(command, 30)
            self.assertLess(abs(result.energy_balance_error_J), 1e-7)

    def test_invalid_parameters_and_inputs_are_rejected(self):
        with self.assertRaises(ValueError):
            Parameters(winding_capacity_J_per_K=0)
        with self.assertRaises(ValueError):
            VirtualMotor(Parameters(), State(0, 25, 25, 25), dt_s=0)
        motor = VirtualMotor(Parameters(), State(0, 25, 25, 25))
        with self.assertRaises(ValueError):
            motor.advance(float("nan"), 25)
        with self.assertRaises(ValueError):
            motor.advance(-1, 25)


class Rows:
    def __init__(self):
        self.rows = []

    def writerow(self, row):
        self.rows.append(row)


class AdapterAndProtocolTests(unittest.TestCase):
    def setUp(self):
        self.config = runner.load_config(PROJECT / "virtual_motor/protocol.json")
        # Artificial short fixture; these are not the proposed calibration/held-out seeds.
        self.config["duration_steps"] = 12
        self.model = dict(ambient=25, clip=95, eps=5, amin=0.97, amax=0.995, bmin=0, bmax=1, wmin=0, wmax=0.05, step=0.05)

    def test_accepted_fifo_delays_execution_eight_samples(self):
        rows = Rows()
        metrics, _ = runner.episode(self.config, self.model, "normal", 9999, "interval_queue", 105, writer=rows)
        self.assertTrue(all(row["reported_effort"] == 0 for row in rows.rows[:8]))
        self.assertGreater(rows.rows[0]["accepted"], 0)
        self.assertEqual(rows.rows[8]["reported_effort"], rows.rows[0]["accepted"])
        self.assertTrue(all(len(json.loads(row["pending_json"])) == 8 for row in rows.rows))
        self.assertGreater(metrics["scheduled_command_fraction"], 0)

    def test_false_ack_and_rms_tail_are_logged_separately(self):
        self.config["mismatch_window_steps"] = [2, 5]
        rows = Rows()
        metrics, _ = runner.episode(self.config, self.model, "ack_mismatch", 9999, "interval_queue", 105, writer=rows)
        self.assertEqual(rows.rows[2]["reported_effort"], 0)
        self.assertEqual(rows.rows[2]["drive_effort"], 1)
        self.assertGreater(rows.rows[2]["actual_rms_effort"], 0)
        self.assertEqual(rows.rows[5]["drive_effort"], 0)
        self.assertGreater(rows.rows[5]["actual_rms_effort"], 0)
        self.assertEqual(metrics["reported_drive_mismatch_samples"], 3)

    def test_observation_clips_without_clamping_winding_state(self):
        self.config["duration_steps"] = 1
        rows = Rows()
        runner.episode(self.config, self.model, "clipped", 9999, "interval_queue", 105, writer=rows)
        self.assertEqual(rows.rows[0]["reading_C"], 95)
        self.assertGreater(rows.rows[0]["winding_C"], 95)
        self.assertGreater(rows.rows[0]["next_winding_C"], 95)

    def test_missing_sensor_is_none_not_a_fabricated_temperature(self):
        self.config["dropout_window_steps"] = [2, 5]
        rows = Rows()
        metrics, _ = runner.episode(self.config, self.model, "dropout", 9999, "interval_queue", 105, writer=rows)
        self.assertTrue(all(row["reading_C"] == "" for row in rows.rows[2:5]))
        self.assertEqual(metrics["missing_samples"], 3)

    def test_infeasible_initial_operating_ceiling_is_separate_from_physical_limit(self):
        self.config["duration_steps"] = 1
        self.config["hot_initial_winding_C"] = 100
        metrics, _ = runner.episode(self.config, self.model, "clipped", 9999, "interval_queue", 98)
        self.assertEqual(metrics["resolved_operating_breaches"], 1)
        self.assertEqual(metrics["resolved_physical_breaches"], 0)
        self.assertEqual(metrics["invalid_samples"], 1)

    def test_paired_synthetic_fixture_is_deterministic(self):
        a, ah = runner.episode(self.config, self.model, "normal", 9999, "fixed_cap", 105)
        b, bh = runner.episode(self.config, self.model, "normal", 9999, "fixed_cap", 105)
        self.assertEqual(a, b)
        self.assertEqual(ah, bh)

    def test_empirical_allowance_uses_fixed_padding_on_calibration_fixture(self):
        fixture = [{"winding_C": 75, "next_winding_C": 74.7, "sensor_C": 74.9, "drive_effort": 0}]
        result = runner.fit_allowances(self.config, fixture)
        self.assertAlmostEqual(result["model"]["eps"], 0.4)
        self.assertAlmostEqual(result["model"]["wmax"], max(0, result["max_upper_residual_C"]) + 0.05)
        self.assertEqual(result["calibration_interval_failures"], 0)

    def test_draft_protocol_blocks_experiment_before_creating_results(self):
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory) / "must-not-exist"
            with self.assertRaisesRegex(ValueError, "DRAFT protocol"):
                runner.calibrate(PROJECT / "virtual_motor/protocol.json", out)
            self.assertFalse(out.exists())

    def test_seed_overlap_and_infeasible_commissioning_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            config_path = Path(directory) / "protocol.json"
            self.config["validation_seeds"] = self.config["calibration_seeds"][:]
            config_path.write_text(json.dumps(self.config))
            with self.assertRaisesRegex(ValueError, "disjoint"):
                runner.load_config(config_path)
            self.config["validation_seeds"] = [9999]
            self.config["hot_initial_winding_C"] = 100
            config_path.write_text(json.dumps(self.config))
            with self.assertRaisesRegex(ValueError, "commissioning"):
                runner.load_config(config_path)

    def test_freeze_hashes_detect_snapshot_changes(self):
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory) / "audit-fixture"
            runner.freeze_run(PROJECT / "virtual_motor/protocol.json", out)
            runner.verify_frozen(out)
            snapshot = out / "source/virtual_motor/plant.py"
            snapshot.write_text(snapshot.read_text() + "\n# altered test fixture\n")
            with self.assertRaisesRegex(ValueError, "source changed"):
                runner.verify_frozen(out)

    def test_draft_snapshot_cannot_enter_held_out_phase(self):
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory) / "audit-fixture"
            runner.freeze_run(PROJECT / "virtual_motor/protocol.json", out)
            with self.assertRaisesRegex(ValueError, "DRAFT protocol"):
                runner.validate(out, "0" * 40)
            self.assertFalse((out / "calibration.json").exists())
            self.assertFalse((out / "held_out_start.json").exists())


if __name__ == "__main__":
    unittest.main()
