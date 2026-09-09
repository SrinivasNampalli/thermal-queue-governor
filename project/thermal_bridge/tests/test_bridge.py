"""Independent analytical and adversarial checks, not physical validation."""
import importlib.util
from pathlib import Path
import sys
import unittest

PATH = Path(__file__).resolve().parents[1]/'model.py'
SPEC = importlib.util.spec_from_file_location('thermal_bridge_model', PATH)
m = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = m
SPEC.loader.exec_module(m)


class ThermalBridgeTests(unittest.TestCase):
    def test_independent_equilibrium_fixture(self):
        self.assertAlmostEqual(m.equilibrium(130,40,.02,.02),85)
        self.assertAlmostEqual(m.equilibrium(130,40,.02,.05),460/7)

    def test_exact_temperature_energy_balance(self):
        start, hot, case, gb, gs, cap, dt = 120.,130.,40.,.02,.05,.04,.4
        end, heat_case = m.advance(start, hot, case, gb, gs, cap, dt)
        # Integrate the independent incoming heat analytically using energy balance
        # of the exponential response, then compare both actual flux integrals.
        from math import exp
        eq = (gb*hot+gs*case)/(gb+gs)
        integral_pad = eq*dt+(start-eq)*(1-exp(-(gb+gs)*dt/cap))*cap/(gb+gs)
        heat_in = gb*(hot*dt-integral_pad)
        self.assertAlmostEqual(heat_in-heat_case, cap*(end-start),places=12)

    def test_three_state_identification_and_holdout(self):
        obs = [m.Observation('A',70,40,.02,40),m.Observation('B',60,40,.05,40),
               m.Observation('C',212/3,40,.035,65),m.Observation('D',65,40,.04,50)]
        r=m.estimate(obs)
        self.assertEqual(r['status'],'consistent')
        self.assertAlmostEqual(r['estimated_hot_c'],130)
        self.assertAlmostEqual(r['estimated_bond_w_per_k'],.02)
        self.assertAlmostEqual(r['estimated_leak_w_per_k'],.02)

    def test_clipped_plateau_cannot_be_used_as_temperature(self):
        obs=[m.Observation('A',95,40,.02,clipped=True)]*4
        self.assertIsNone(m.estimate(obs)['estimated_hot_c'])

    def test_detached_source_is_unobservable(self):
        obs=[m.Observation('A',40,40,g,t) for g,t in ((.02,40),(.05,40),(.035,65),(.04,50))]
        self.assertIn('not identifiable',m.estimate(obs)['reason'])

    def test_unsettled_measurement_is_rejected(self):
        obs=[m.Observation('A',70,40,.02,settled=False)]*4
        self.assertIn('did not settle',m.estimate(obs)['reason'])

    def test_nonfinite_input_is_rejected(self):
        obs=[m.Observation('A',float('nan'),40,.02)]*4
        self.assertIn('Invalid',m.estimate(obs)['reason'])

    def test_recorded_adversarial_outcomes(self):
        cases={c['id']:m.simulate(c) for c in m.CASES}
        self.assertEqual(cases['nominal']['result']['status'],'consistent')
        for name in ('loose_bond','detached','hot_case','drift','shunt_fault','stuck_readout'):
            self.assertEqual(cases[name]['result']['status'],'inconclusive',name)
        blind=cases['common_gain_bias']
        self.assertEqual(blind['result']['status'],'consistent')
        self.assertLess(blind['parameters']['bond_w_per_k'],.008)
        self.assertGreater(blind['result']['estimated_bond_w_per_k'],.008)
        bypass=cases['unguarded_leak']
        self.assertEqual(bypass['result']['status'],'consistent')
        self.assertAlmostEqual(bypass['result']['estimated_hot_c'],85)
        self.assertEqual(bypass['parameters']['hot_c'],130)

    def test_nominal_recovery_does_not_use_truth_arguments(self):
        c=m.simulate(m.CASES[0]); obs=[m.Observation(**o) for o in c['observations']]
        self.assertAlmostEqual(m.estimate(obs)['estimated_hot_c'],130,places=4)
        c['parameters']['hot_c']=-999
        c['parameters']['bond_w_per_k']=99
        self.assertEqual(m.estimate(obs),c['result'])

    def test_step_refinement(self):
        for config in m.CASES:
            coarse=m.simulate(config,.1); fine=m.simulate(config,.05)
            self.assertEqual(coarse['result']['status'],fine['result']['status'])
            self.assertAlmostEqual(coarse['metrics']['shunt_energy_j'],fine['metrics']['shunt_energy_j'],places=9)

    def test_sensor_error_sweep(self):
        from itertools import product
        ideal=[70.,60.,212/3,65.]
        worst=0.
        for errors in product((-.1,0,.1),repeat=4):
            obs=[m.Observation(str(i),t+e,40,g,tg) for i,(t,e,g,tg) in enumerate(zip(ideal,errors,(.02,.05,.035,.04),(40,40,65,50)))]
            r=m.estimate(obs)
            self.assertEqual(r['status'],'consistent')
            worst=max(worst,abs(r['estimated_hot_c']-130))
        # The measured sensitivity is substantial: 0.1 C pad errors can create
        # over 5 C source error even with perfect shunt and reference calibration.
        self.assertAlmostEqual(worst,5.1845456279,places=8)

    def test_without_guard_simple_identification_is_false_cool(self):
        # An independent closed form demonstrates the rank deficiency of the
        # shunt-only comparator when the guard remains at case temperature.
        q1=.02*(70-40); q2=.05*(60-40)
        fitted=(q2-q1)/(70-60)
        self.assertAlmostEqual(70+q1/fitted,85)
        self.assertAlmostEqual(fitted,.04)

    def test_guard_excitation_is_required(self):
        obs=[m.Observation(str(i),t,40,g,40) for i,(t,g) in enumerate(zip((70,60,64,63),(.02,.05,.035,.04)))]
        self.assertIn('guard excitation',m.estimate(obs)['reason'])


if __name__ == '__main__':
    unittest.main()
