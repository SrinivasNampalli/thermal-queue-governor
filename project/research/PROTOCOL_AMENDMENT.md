# Protocol amendment before final evaluation

2026-09-09T05:12:06.113Z

The first run is retained as a pilot, not the final evaluation. Independent code review required propagating nondefault parameters into the nominal comparator, quantizing requested effort correctly, and recording the pre-decision FIFO plus cumulative effort and decision counter. Inspection of pilot results exposed an unnecessarily weak nominal baseline: resetting a clipped point estimate to 95 C discarded its own prediction. The final baseline preserves its propagated nominal estimate at clipping and applies the clipped reading as a lower bound. Candidate model/grid/thresholds are unchanged; final evaluation uses fresh seeds 2000-2019 and the same predeclared scenarios. This amendment was recorded before that run. The counter is diagnostic only; replay rejection, stale timestamp handling and network expiration are not implemented or claimed as tested.
