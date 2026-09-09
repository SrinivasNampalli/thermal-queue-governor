# Censored-update ablation

2026-09-09T05:19:01.244Z

After the main comparison, isolate the clipping update from model choice. Hold the robust box and queue-aware governor fixed but deliberately replace the clipped upper state bound by ceiling+epsilon. Use fresh seeds4000-4019 for delay20 and upper_corner, 20 episodes each per policy, comparing full, no-queue, and exact-clip. This additional mechanism test is disclosed as post-main, not prespecified in the initial protocol. Candidate implementation unchanged. A falsely truncated interval is expected to lose containment; report actual breaches, effort and containment without claiming generality.
