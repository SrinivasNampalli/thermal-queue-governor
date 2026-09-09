/* Pure scalar simulation. Accepted FIFO is never reordered or cancelled. */
(function (host) {
  'use strict';
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function model(options = {}) {
    const m = {ambient:25, clip:95, limit:105, eps:0.3, amin:0.985, amax:0.995,
      bmin:0.55, bmax:0.95, wmin:0, wmax:0.04, step:0.05, width:3, cap:1, ...options};
    if (!Object.values(m).every(Number.isFinite) || m.ambient >= m.clip || m.clip >= m.limit ||
        m.amin < 0 || m.amin > m.amax || m.amax >= 1 || m.bmin < 0 || m.bmin > m.bmax ||
        m.bmax <= 0 || m.wmin < 0 || m.wmin > m.wmax || m.eps < 0 || m.step <= 0 || m.step > 1 ||
        m.width <= 0 || m.cap < 0 || m.cap > 1 || m.wmax/(1-m.amax) > m.limit-m.ambient)
      throw new Error('Invalid thermal settings.');
    return m;
  }
  function propagate(lo, hi, effort, m) {
    return [m.amin*lo + m.bmin*effort*effort + m.wmin,
      m.amax*hi + m.bmax*effort*effort + m.wmax];
  }
  function intersect(lo, hi, reading, m) {
    if (reading === null) return [lo, hi];
    if (!Number.isFinite(reading) || reading > m.clip+1e-9) throw new Error('Invalid sensor reading');
    const lower=reading-m.ambient-m.eps;
    const upper=reading>=m.clip-1e-9 ? Infinity : reading-m.ambient+m.eps;
    const a=Math.max(lo,0,lower), b=Math.min(hi,upper);
    if(a>b+1e-9) throw new Error('Reading and estimated interval disagree');
    return [a,Math.max(a,b)];
  }
  function admissible(hi, pending, demand, m) {
    let peak=hi;
    for(const u of pending) { hi=m.amax*hi+m.bmax*u*u+m.wmax; peak=Math.max(peak,hi); }
    const ceiling=m.limit-m.ambient;
    if(peak>ceiling+1e-9) return {action:0,peak,valid:false};
    const cap=Math.sqrt(Math.max(0,(ceiling-m.amax*hi-m.wmax)/m.bmax));
    const action=Math.max(0,Math.floor((Math.min(demand,cap,1)+1e-12)/m.step)*m.step);
    peak=Math.max(peak,m.amax*hi+m.bmax*action*action+m.wmax);
    return {action,peak,valid:peak<=ceiling+1e-9};
  }
  function observe(s) {
    s.reading=Math.min(s.m.ambient+s.x+s.m.eps*Math.sin(s.time*0.71),s.m.clip);
    try { [s.lo,s.hi]=intersect(s.lo,s.hi,s.reading,s.m); }
    catch(e) {s.valid=false; s.reason=e.message;}
  }
  function request(s, effort, source='Manual') {
    if(!Number.isFinite(effort) || effort<0 || effort>1) throw new Error('Effort must be between 0 and 100%.');
    const q={id:++s.sequence,requested:effort,source,submitted:s.time,lastWait:''};
    if(s.requests.length>=24) {
      s.stats.rejected++; s.recent.unshift({...q,status:'Rejected',reason:'Request buffer full (24 requests)'});
      s.recent.length=Math.min(s.recent.length,4); return false;
    }
    s.requests.push(q); return true;
  }
  function create(options={}) {
    const m=model(options);
    const temperature=Math.min(99.5,m.limit-m.width/2-0.8);
    const s={m,time:0,x:temperature-m.ambient,lo:temperature-m.ambient-m.width/2,
      hi:temperature-m.ambient+m.width/2,valid:true,reason:'',sequence:0,queue:[],requests:[],recent:[],history:[],
      handling:'reduce',automatic:true,workload:1,executing:null,decision:{kind:'Ready',reason:'Eight accepted commands are already in the delay line.'},
      stats:{breaches:0,complete:0,rejected:0,scaled:0,delivered:0,requestedCompleted:0}};
    for(let k=0;k<8;k++) {
      const a=admissible(s.hi,s.queue.map(q=>q.effort),m.cap,m);
      s.queue.push({id:++s.sequence,requested:1,effort:a.action,source:'Primed FIFO',submitted:0,accepted:0});
    }
    for(let k=0;k<3;k++) request(s,1,'Demo workload');
    observe(s); record(s); return s;
  }
  function reject(s,q,reason) {
    s.stats.rejected++; s.recent.unshift({...q,status:'Rejected',reason});
    s.recent.length=Math.min(s.recent.length,4);
    s.decision={kind:'Rejected',reason:`#${q.id}: ${reason}`};
  }
  function tick(s) {
    observe(s);
    let expired=0;
    if(s.handling==='wait') {
      s.requests=s.requests.filter(q=>{
        if(s.time-q.submitted<20) return true;
        reject(s,q,q.lastWait ? `20 s timeout. ${q.lastWait}` : '20 s timeout behind earlier requests.'); expired++; return false;
      });
    }
    if(s.automatic && !s.requests.length) request(s,s.workload,'Demo workload');
    let appended={id:null,effort:0,requested:0,source:'Idle'};
    const q=s.requests[0];
    if(!s.valid) {
      s.decision={kind:'Invalid',reason:s.reason};
      if(q) {s.requests.shift();reject(s,q,'Interval or queued fallback is invalid.');s.decision.kind='Invalid';}
    } else if(q) {
      const result=admissible(s.hi,s.queue.map(v=>v.effort),Math.min(q.requested,s.m.cap),s.m);
      if(!result.valid) {
        s.valid=false;s.reason='Accepted FIFO has no thermal fallback certificate.';
        s.requests.shift();reject(s,q,s.reason);s.decision.kind='Invalid';
      } else if(s.handling==='wait' && result.action<q.requested-1e-9) {
        q.lastWait=s.m.cap<q.requested-1e-9 ? `Effort ceiling permits ${Math.round(s.m.cap*100)}%; request needs ${Math.round(q.requested*100)}%.` :
          `Queued heat permits ${Math.round(result.action*100)}%; request needs ${Math.round(q.requested*100)}%.`;
        s.decision={kind:'Waiting',reason:`#${q.id}: ${q.lastWait}`};
      } else if(result.action===0 && q.requested>0) {
        s.requests.shift();reject(s,q,'No positive effort fits the current thermal or effort ceiling.');
      } else {
        s.requests.shift();appended={...q,effort:result.action,accepted:s.time};
        const limited=result.action<q.requested-1e-9;
        if(limited) s.stats.scaled++;
        const reason=limited ? `#${q.id}: ${Math.round(q.requested*100)}% requested; ${Math.round(result.action*100)}% admitted after queued heat and effort ceiling.` :
          `#${q.id}: full ${Math.round(q.requested*100)}% effort fits after the accepted queue.`;
        s.decision={kind:limited?'Limited':'Admitted',reason};
        s.recent.unshift({...appended,status:limited?'Reduced':'Admitted',reason});s.recent.length=Math.min(s.recent.length,4);
      }
    } else if(!expired) s.decision={kind:'Cooling',reason:'No waiting request. An idle packet enters the accepted FIFO.'};
    const applied=s.queue.shift();s.queue.push(appended);s.executing=applied;
    s.x=s.m.amax*s.x+s.m.bmax*applied.effort**2+s.m.wmax;
    [s.lo,s.hi]=propagate(s.lo,s.hi,applied.effort,s.m);
    s.time++;
    if(s.x+s.m.ambient>s.m.limit+1e-7) s.stats.breaches++;
    if(applied.id!==null) {
      s.stats.complete++;s.stats.delivered+=applied.effort;s.stats.requestedCompleted+=applied.requested;
    }
    observe(s); record(s); return s;
  }
  function record(s) {
    s.history.push({time:s.time,actual:s.x+s.m.ambient,lo:s.lo+s.m.ambient,hi:s.hi+s.m.ambient,reading:s.reading,limit:s.m.limit,clip:s.m.clip});
    if(s.history.length>241) s.history.shift();
  }
  function snapshot(s) {
    const a=admissible(s.hi,s.queue.map(q=>q.effort),s.m.cap,s.m);
    const reserved=admissible(s.hi,s.queue.map(q=>q.effort),0,s.m);
    return {temperature:s.x+s.m.ambient,lower:s.lo+s.m.ambient,upper:s.hi+s.m.ambient,limit:s.m.limit,
      reading:s.reading,effort:s.executing?.effort||0,time:s.time,inside:s.lo-1e-7<=s.x && s.x<=s.hi+1e-7,
      clipped:s.reading>=s.m.clip-1e-9,remaining:s.m.limit-s.m.ambient-reserved.peak,capacity:a.action,
      predictedPeak:reserved.peak+s.m.ambient,valid:s.valid&&reserved.valid,
      effortPercent:s.stats.requestedCompleted?100*s.stats.delivered/s.stats.requestedCompleted:0,
      breachRate:s.time?100*s.stats.breaches/s.time:0,throughput:s.time?s.stats.complete/s.time:0};
  }
  host.ThermalQueueCore={model,propagate,intersect,admissible,create,request,tick,snapshot,clamp};
})(typeof window==='undefined'?globalThis:window);
