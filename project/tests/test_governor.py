import math,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"src"))
from governor import Model,Governor,admissible,intersect_reading,propagate

class ThermalTests(unittest.TestCase):
    def test_clipping_preserves_upper(self):
        self.assertEqual(intersect_reading(60,78,95,Model()),(69.7,78))
    def test_missing_is_prediction_only(self):
        self.assertEqual(intersect_reading(30,75,None,Model()),(30,75))
    def test_empty_intersection_rejects(self):
        with self.assertRaises(ValueError): intersect_reading(75,78,50,Model())
    def test_clipped_unknown_start_rejected(self):
        with self.assertRaises(ValueError): Governor("interval_queue",Model(),(70,math.inf))
    def test_invalid_model(self):
        with self.assertRaises(ValueError): Model(amax=1.0)
        with self.assertRaises(ValueError): Model(wmax=1.0)
    def test_queue_changes_admissibility(self):
        m=Model()
        self.assertGreater(admissible(79,[],1,m)[0],0)
        self.assertFalse(admissible(79,[1]*8,1,m)[2])
    def test_invalid_queue_latches(self):
        g=Governor("interval_queue",Model(),(40,60))
        self.assertFalse(g.decide(None,[math.nan],1)["valid"])
        self.assertFalse(g.decide(None,[],1)["valid"])
    def test_queue_overflow(self):
        g=Governor("interval_queue",Model(),(40,60))
        self.assertFalse(g.decide(None,[0.0]*121,1)["valid"])
    def test_requested_grid_quantization(self):
        self.assertAlmostEqual(admissible(40,[],0.67,Model())[0],0.65)
    def test_nondefault_nominal_parameters(self):
        g=Governor("nominal_queue",Model(ambient=10,clip=80,limit=90,step=0.1),(70,79))
        self.assertLess(g.decide(None,[],1)["peak"],80.000001)
    def test_invalid_demand(self):
        g=Governor("interval_queue",Model(),(40,60))
        with self.assertRaises(ValueError): g.decide(None,[],math.nan)
    def test_corners_contained(self):
        m=Model()
        for a in (m.amin,m.amax):
            for b in (m.bmin,m.bmax):
                for w in (m.wmin,m.wmax):
                    for x in (30,75):
                        for u in (0,0.5,1):
                            lo,hi=propagate(30,75,u,m)
                            self.assertLessEqual(lo,a*x+b*u*u+w+1e-10)
                            self.assertGreaterEqual(hi,a*x+b*u*u+w-1e-10)
    def test_zero_terminal_invariant(self):
        m=Model()
        lo,hi=propagate(80,80,0,m)
        self.assertLessEqual(hi,80)
        self.assertLessEqual(m.wmax/(1-m.amax),80)
    def test_upper_corner_closed_loop(self):
        m=Model(); g=Governor("interval_queue",m,(30,75)); x=75; q=[0.]*20
        for k in range(600):
            d=g.decide(min(25+x,95),q,1)
            self.assertTrue(d["valid"])
            self.assertLessEqual(d["lo"],x+1e-8); self.assertGreaterEqual(d["hi"],x-1e-8)
            u=q.pop(0); q.append(d["action"])
            x=m.amax*x+m.bmax*u*u+m.wmax; g.advance(u)
            self.assertLessEqual(x,80+1e-8)
    def test_inconsistent_packet_no_rebase(self):
        g=Governor("interval_queue",Model(),(70,75))
        r=g.decide(40,[],1)
        self.assertFalse(r["valid"]); self.assertEqual(r["action"],0)
if __name__=="__main__": unittest.main(verbosity=2)
