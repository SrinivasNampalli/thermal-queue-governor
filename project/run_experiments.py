"""Run paired synthetic experiments; no real motor data or hardware."""
import argparse,csv,gzip,hashlib,json,math,platform,random,sys,time
from datetime import datetime,timezone
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent/"src"))
from governor import Model,Governor

BASE=Path(__file__).resolve().parent
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
    p=argparse.ArgumentParser()
    p.add_argument("--config",type=Path,default=BASE/"config/experiment.json")
    p.add_argument("--out",type=Path)
    args=p.parse_args()
    config=json.loads(args.config.read_text())
    stamp=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S_%fZ")
    out=(args.out or BASE/"results"/stamp).resolve()
    out.mkdir(parents=True,exist_ok=False)
    m=Model(ambient=config["ambient_C"],clip=config["clip_C"],limit=config["limit_C"],
        eps=config["noise_bound_C"],amin=config["a_min"],amax=config["a_max"],
        bmin=config["b_min"],bmax=config["b_max"],wmin=config["w_min"],
        wmax=config["w_max"],step=config["action_step"])
    start=time.perf_counter()
    metrics=[]; traces=[]
    fields=["scenario","seed","policy","k","true_T_C","reading_C","requested",
        "accepted","applied","acknowledged","decision_id","cumulative_effort","lo_C","hi_C","valid","reason",
        "predicted_peak_C","pending_json","next_T_C","interval_miss","breach"]
    with gzip.open(out/"raw_steps.csv.gz","wt",newline="",encoding="utf8") as stream:
        writer=csv.DictWriter(stream,fieldnames=fields);writer.writeheader()
        for scenario in config["scenarios"]:
            for seed in config["seeds"]:
                rng=random.Random(seed)
                n=config["steps"]
                # Generated before any controller runs; no future data passed to policy.
                a=rng.uniform(m.amin,m.amax);b=rng.uniform(m.bmin,m.bmax)
                w=[rng.uniform(m.wmin,m.wmax) for _ in range(n)]
                noise=[rng.uniform(-m.eps,m.eps) for _ in range(n)]
                demand=[0.65 if (k//120)%3==1 else 1.0 for k in range(n)]
                missing=[False]*n
                delay=0 if scenario=="no_delay" else 20 if scenario in ("delay_20","upper_corner") else 8
                initial=rng.uniform(40,60);initial_interval=tuple(config["initial_interval_rise_C"])
                if scenario=="hot_start":
                    initial=rng.uniform(73,74.5);initial_interval=(68,75)
                if scenario=="upper_corner":
                    a,b=m.amax,m.bmax;w=[m.wmax]*n
                if scenario in ("dropout_60","upper_corner"):
                    missing=[(300<=k<360 or rng.random()<0.02) for k in range(n)]
                for policy in config["policies"]:
                    g=Governor(policy,m,initial_interval);x=initial;q=[0.0]*delay
                    total=0.0;breaches=misses=invalid=clipped=lost=0;maximum=m.ambient+x
                    for k in range(n):
                        reading=None if missing[k] else min(m.ambient+x+noise[k],m.clip)
                        if scenario=="stuck_low" and k>=250:reading=60.0
                        pending_before=list(q)
                        result=g.decide(reading,pending_before,demand[k])
                        expected=q.pop(0) if delay else result["action"]
                        if delay:q.append(result["action"])
                        actual=1.0 if scenario=="queue_mismatch" and config.get("mismatch_window",[250,275])[0]<=k<config.get("mismatch_window",[250,275])[1] else expected
                        aa,bb=(0.998,1.45) if scenario=="model_violation" and k>=250 else (a,b)
                        nx=aa*x+bb*actual*actual+w[k]
                        interval_miss=int(not (result["lo"]-1e-7<=x<=result["hi"]+1e-7))
                        breach=int(m.ambient+nx>m.limit+1e-7)
                        row=dict(scenario=scenario,seed=seed,policy=policy,k=k,true_T_C=m.ambient+x,
                            reading_C="" if reading is None else reading,requested=demand[k],accepted=result["action"],
                            applied=actual,acknowledged=expected,decision_id=result["decision_id"],cumulative_effort=total+actual,lo_C=m.ambient+result["lo"],hi_C=m.ambient+result["hi"],
                            valid=int(result["valid"]),reason=result["reason"],predicted_peak_C=m.ambient+result["peak"],
                            pending_json=json.dumps(pending_before,separators=(",",":")),next_T_C=m.ambient+nx,
                            interval_miss=interval_miss,breach=breach)
                        writer.writerow(row)
                        if seed==config["seeds"][0] and scenario in ("delay_20","upper_corner","model_violation"):
                            traces.append(row)
                        total+=actual;breaches+=breach;misses+=interval_miss
                        invalid+=int(not result["valid"]);clipped+=int(reading==m.clip)
                        lost+=int(reading is None);maximum=max(maximum,m.ambient+nx)
                        # Execution acknowledgment is assumed accurate except deliberate mismatch scenario.
                        g.advance(expected);x=nx
                    metrics.append(dict(scenario=scenario,seed=seed,policy=policy,
                        in_contract=scenario not in ("model_violation","stuck_low","queue_mismatch"),
                        max_T_C=maximum,breach_steps=breaches,interval_misses=misses,invalid_steps=invalid,
                        effort_fraction=total/sum(demand),clipped_steps=clipped,missing_steps=lost))
    with (out/"episodes.csv").open("w",newline="") as f:
        wr=csv.DictWriter(f,fieldnames=list(metrics[0]));wr.writeheader();wr.writerows(metrics)
    with (out/"example_traces.csv").open("w",newline="") as f:
        wr=csv.DictWriter(f,fieldnames=fields);wr.writeheader();wr.writerows(traces)
    aggregate=[]
    for scenario in config["scenarios"]:
        for policy in config["policies"]:
            rows=[r for r in metrics if r["scenario"]==scenario and r["policy"]==policy]
            aggregate.append(dict(scenario=scenario,policy=policy,episodes=len(rows),
                breach_episodes=sum(r["breach_steps"]>0 for r in rows),
                max_T_C=max(r["max_T_C"] for r in rows),
                mean_effort_fraction=sum(r["effort_fraction"] for r in rows)/len(rows),
                interval_misses=sum(r["interval_misses"] for r in rows),
                invalid_steps=sum(r["invalid_steps"] for r in rows),
                clipped_steps=sum(r["clipped_steps"] for r in rows)))
    with (out/"summary.csv").open("w",newline="") as f:
        wr=csv.DictWriter(f,fieldnames=list(aggregate[0]));wr.writeheader();wr.writerows(aggregate)
    meta=dict(utc=datetime.now(timezone.utc).isoformat(),python=sys.version,platform=platform.platform(),
        duration_seconds=time.perf_counter()-start,episodes=len(metrics),
        sampled_transitions=len(metrics)*config["steps"],config_sha256=sha(args.config),
        source_sha256={z.relative_to(BASE).as_posix():sha(z) for z in [BASE/"run_experiments.py",BASE/"src/governor.py"]},
        config=config,aggregation=aggregate)
    (out/"run_metadata.json").write_text(json.dumps(meta,indent=2))
    latest=out.relative_to(BASE) if out.is_relative_to(BASE) else out
    (BASE/"results"/"LATEST.txt").write_text(latest.as_posix())
    print(json.dumps({"out":str(out),"duration_seconds":meta["duration_seconds"],"episodes":len(metrics)},indent=2))
    for r in aggregate:print(json.dumps(r))
if __name__=="__main__":main()
