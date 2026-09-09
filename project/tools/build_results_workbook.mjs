import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {Workbook, SpreadsheetFile} from '@oai/artifact-tool';

// Supporting workbook for completed synthetic runs. No simulation is rerun here.
const root=path.resolve(process.argv[2] || '..');
const out=path.join(root,'outputs');
const project=path.join(out,'project');
const qaDir=path.join(root,'work','workbook_qa');
await fs.mkdir(qaDir,{recursive:true});
function parseCSV(text){
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}
    else if(c==='"')quoted=true;
    else if(c===','){row.push(field);field='';}
    else if(c==='\n'){row.push(field.replace(/\r$/,''));if(row.some(v=>v!==''))rows.push(row);row=[];field='';}
    else field+=c;
  }
  if(field!==''||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
  const headers=rows.shift();return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]])));
}
const defs=[['Main','FINAL_EVALUATION.txt',900],['ACK follow-up','ACK_FOLLOWUP.txt',100],['Clipping ablation','CLIPPING_ABLATION.txt',120]];
const runs=[];
for(const [name,pointer,count] of defs){
 const rel=(await fs.readFile(path.join(project,'results',pointer),'utf8')).trim();
 const dir=path.join(project,rel);
 const csv=await fs.readFile(path.join(dir,'episodes.csv'),'utf8');
 const meta=JSON.parse(await fs.readFile(path.join(dir,'run_metadata.json'),'utf8'));
 const records=parseCSV(csv).map(x=>({...x,in_contract:x.in_contract==='True',seed:+x.seed,max_T_C:+x.max_T_C,breach_steps:+x.breach_steps,interval_misses:+x.interval_misses,invalid_steps:+x.invalid_steps,effort_fraction:+x.effort_fraction,clipped_steps:+x.clipped_steps,missing_steps:+x.missing_steps}));
 const summaries=parseCSV(await fs.readFile(path.join(dir,'summary.csv'),'utf8'));
 if(records.length!==count||meta.episodes!==count)throw Error('Episode count mismatch '+name);
 runs.push({name,rel,dir,meta,records,summaries,sha256:crypto.createHash('sha256').update(csv).digest('hex')});
}
const ackSteps=parseCSV(zlib.gunzipSync(await fs.readFile(path.join(runs[1].dir,'raw_steps.csv.gz'))).toString('utf8'));
const validMisses=new Map();
for(const r of ackSteps) if(+r.valid===1&&+r.interval_miss===1){const key=r.seed+'|'+r.policy;validMisses.set(key,(validMisses.get(key)||0)+1);}
const ackFullValidMisses=[...validMisses.entries()].filter(([k])=>k.endsWith('|interval_queue')).reduce((a,[,v])=>a+v,0);
if(ackFullValidMisses!==113)throw Error('ACK valid-miss diagnostic changed: '+ackFullValidMisses);
const all=[];
for(const run of runs) for(const r of run.records){
 const scope=run.name==='Main'?(r.in_contract?'Primary valid-model':'Main fault probe'):(run.name==='ACK follow-up'?'ACK fault probe':'Clipping ablation');
 all.push({run:run.name,scope,...r,steps:run.meta.config.steps,ack_valid_misses:run.name==='ACK follow-up'?(validMisses.get(r.seed+'|'+r.policy)||0):null,source:'project/'+run.rel+'/episodes.csv'});
}
if(new Set(all.map(r=>[r.run,r.scenario,r.seed,r.policy].join('|'))).size!==1120)throw Error('Duplicate episode key');
const wb=Workbook.create();const summary=wb.worksheets.add('Summary');const data=wb.worksheets.add('Data');
summary.tabColor='#243B53';summary.showGridLines=false;data.showGridLines=false;
const last=all.length+1;
const dataHeaders=['Run','Scope','Scenario','Seed','Policy','In-contract scenario','Maximum temperature (°C)','Breach steps (count)','Interval misses (steps)','Invalid steps (count)','Applied/requested effort (ratio)','Clipped readings (steps)','Missing readings (steps)','Sampled transitions (count)','ACK misses while valid (steps)'];
const dataMatrix=all.map(r=>[r.run,r.scope,r.scenario,r.seed,r.policy,r.in_contract,r.max_T_C,r.breach_steps,r.interval_misses,r.invalid_steps,r.effort_fraction,r.clipped_steps,r.missing_steps,r.steps,r.ack_valid_misses]);
data.getRange('A1:O1').values=[dataHeaders];data.getRange('A2:O'+last).values=dataMatrix;
data.tables.add('A1:O'+last,true,'EpisodeData');
data.getRange('Q1').values=[['Source episode CSV (relative to this workbook)']];
data.getRange('Q2:Q'+last).values=all.map(r=>[r.source]);
const sources=[
 ['Provenance','Synthetic simulation. No physical measurements.'],
 ['Steps per episode',900],
 ['Temperature units','Degrees Celsius; limit 105 °C; clipping threshold 95 °C.'],
 ['Effort ratio','Sum of applied effort divided by sum of requested effort. Not delivered throughput.'],
 ['In-contract scenario','Source scenario classification only. It does not validate a policy or prove safety.'],
 ['Interval misses','Count includes valid and invalid estimator steps. Baseline zeros are not certificates.'],
 ['ACK valid misses','Column O is derived from ACK raw_steps.csv.gz where valid=1 and interval_miss=1.'],
 ['Other O cells','Blank means not computed for that run. It is not a numerical zero.'],
 ['Fault coverage','Main fault probes are excluded from primary aggregate. ACK is a separate out-of-contract probe.'],
 ['Clipping coverage','Clipping run retains deliberately unsafe exact-clipping and no-queue comparators.'],
 ['Population','1120 episodes: main 900; ACK 100; clipping 120. Each has 900 transitions.'],
 ['Primary population','Main, six valid-model scenarios, 20 seeds per policy/scenario = 120 episodes per policy.'],
 ['Statistics','Arithmetic mean of episode effort ratios, max over episode maxima, additive event counts.'],
 ['Use limitation','Finite synthetic sample. No hardware validation or unconditional safety guarantee.'],
 ['Refresh','Rebuild from the three pointer files and completed CSV/metadata. No forecasts or random cells.'],
];
let registryRow=1;
for(const pair of sources){data.getRangeByIndexes(registryRow-1,19,1,2).values=[pair];registryRow++;}
registryRow+=2;
for(const run of runs){
 const rows=[
 ['Run',run.name],
 ['Directory relative to workbook','project/'+run.rel],
 ['Seeds',run.meta.config.seeds.join(', ')],
 ['Run completed (UTC)',run.meta.utc],
 ['Episode CSV SHA-256',run.sha256],
 ['Config SHA-256',run.meta.config_sha256],
 ['Metadata','project/'+run.rel+'/run_metadata.json'],
 ['Summary control','project/'+run.rel+'/summary.csv'],
 ['Trace source','project/'+run.rel+'/raw_steps.csv.gz'],
 ['Example traces','project/'+run.rel+'/example_traces.csv'],
 ['Simulator source snapshot','project/'+run.rel+'/source/'],
 ];
 data.getRangeByIndexes(registryRow-1,19,rows.length,2).values=rows;registryRow+=rows.length+2;
}
data.getRange('A1:U'+Math.max(last,registryRow)).format.font={name:'Arial',size:10,color:'#172B4D'};
data.getRange('A1:O'+last).format.rowHeight=21;
data.getRange('A1:O1').format={fill:'#243B53',font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},wrapText:true,horizontalAlignment:'center',verticalAlignment:'center',rowHeight:46};
data.getRange('A2:F'+last).format.horizontalAlignment='left';
data.getRange('G2:O'+last).format.horizontalAlignment='right';
data.getRange('G2:G'+last).setNumberFormat('0.00');
data.getRange('K2:K'+last).setNumberFormat('0.0000');
for(const c of ['D','H','I','J','L','M','N','O'])data.getRange(c+'2:'+c+last).setNumberFormat('#,##0');
const widths={A:20,B:23,C:21,D:10,E:25,F:16,G:17,H:14,I:16,J:14,K:21,L:17,M:17,N:18,O:21,P:3,Q:80,R:3,S:3,T:25,U:112};
for(const [col,width]of Object.entries(widths))data.getRange(col+'1:'+col+last).format.columnWidth=width;
data.getRange('Q1').format.font={name:'Arial',size:10,bold:true,color:'#243B53'};
data.getRange('T1:U'+registryRow).format.rowHeight=24;
data.getRange('T1:T'+registryRow).format.font={name:'Arial',size:10,bold:true,color:'#243B53'};
data.getRange('U1:U'+registryRow).format.wrapText=false;
data.freezePanes.freezeRows(1);data.freezePanes.freezeColumns(3);

summary.getRange('A1:K88').format.font={name:'Arial',size:10,color:'#172B4D'};
summary.getRange('A1:K88').format.rowHeight=23;
summary.getRange('A2').values=[['Simulation results supporting the manuscript']];
summary.getRange('A2').format.font={name:'Arial',size:16,bold:true,color:'#172B4D'};
summary.getRange('A2:K2').format.rowHeight=30;
summary.getRange('A3').values=[['Synthetic simulation. 1,120 episodes. Finite sampled evidence; no hardware validation.']];
summary.getRange('A3:K3').format.borders={bottom:{style:'thin',color:'#BCCCDC'}};
summary.getRange('A4').values=[['Primary comparison: six valid-model scenarios, 20 seeds each, 900 transitions per episode.']];
const headers=['Scenario / scope','Policy','Episodes (n)','Breach episodes (n)','Breach rate (%)','Maximum T (°C)','Mean effort ratio','Interval misses (steps)','Invalid steps (n)','Clipped steps (n)','Transitions (n)'];
const groupSpecs=[];
function section(title,titleRow,headerRow,specs){
 summary.getRange('A'+titleRow+':K'+titleRow).format.fill='#E7EDF3';
 summary.getRange('A'+titleRow).values=[[title]];
 summary.getRange('A'+titleRow).format.font={name:'Arial',size:10,bold:true,color:'#243B53'};
 summary.getRange('A'+headerRow+':K'+headerRow).values=[headers];
 summary.getRange('A'+headerRow+':K'+headerRow).format={fill:'#243B53',font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},horizontalAlignment:'center',verticalAlignment:'center',wrapText:true,rowHeight:38};
 let r=headerRow+1;
 for(const spec of specs){groupSpecs.push({...spec,row:r});r++;}
}
section('Primary valid-model aggregate',6,7,runs[0].meta.config.policies.map(policy=>({run:'Main',label:'Primary valid-model',scope:'Primary valid-model',policy})));
section('Main run by scenario',16,17,runs[0].summaries.map(x=>({run:'Main',label:x.scenario,scenario:x.scenario,policy:x.policy})));
summary.getRange('A14').values=[['Effort is applied/requested input, not throughput. Interval misses include invalid estimator steps.']];
section('ACK follow-up: applied-input mismatch',64,67,runs[1].summaries.map(x=>({run:'ACK follow-up',label:x.scenario,scenario:x.scenario,policy:x.policy})));
summary.getRange('A65').values=[['Out-of-contract test. Full policy: 113 interval misses while valid, 317 total misses, 2,350 invalid steps.']];
section('Clipping ablation',74,76,runs[2].summaries.map(x=>({run:'Clipping ablation',label:x.scenario,scenario:x.scenario,policy:x.policy})));
summary.getRange('A75').values=[['Exact clipping treats a saturated reading as an equality. Both ablation comparators can breach the limit.']];
summary.getRange('A84').values=[['Primary aggregate excludes model_violation, stuck_low and queue_mismatch.']];
summary.getRange('A85').values=[['in_contract is a scenario label. It is not a certificate that every comparator satisfies the model assumptions.']];
summary.getRange('A86').values=[['The full policy has no sampled primary breaches. This does not establish an unconditional safety guarantee.']];
summary.getRange('A87').values=[['Sources, seeds, model limits and definitions are recorded alongside the episode data.']];
const refs=c=>"'Data'!$"+c+"$2:$"+c+"$"+last;
const expected=[];
function aggregate(rows){return [rows.length,rows.filter(x=>x.breach_steps>0).length,rows.filter(x=>x.breach_steps>0).length/rows.length,Math.max(...rows.map(x=>x.max_T_C)),rows.reduce((a,x)=>a+x.effort_fraction,0)/rows.length,rows.reduce((a,x)=>a+x.interval_misses,0),rows.reduce((a,x)=>a+x.invalid_steps,0),rows.reduce((a,x)=>a+x.clipped_steps,0),rows.reduce((a,x)=>a+x.steps,0)];}
for(const g of groupSpecs){
 const r=g.row;summary.getRange('A'+r+':B'+r).values=[[g.label,g.policy]];
 const criteria=refs('A')+',"'+g.run+'",'+refs(g.scope?'B':'C')+',$A'+r+','+refs('E')+',$B'+r;
 const formulas=['=COUNTIFS('+criteria+')','=COUNTIFS('+criteria+','+refs('H')+',">0")','=D'+r+'/C'+r,
 '=_xlfn.MAXIFS('+refs('G')+','+criteria+')','=AVERAGEIFS('+refs('K')+','+criteria+')',
 '=SUMIFS('+refs('I')+','+criteria+')','=SUMIFS('+refs('J')+','+criteria+')','=SUMIFS('+refs('L')+','+criteria+')','=SUMIFS('+refs('N')+','+criteria+')'];
 summary.getRange('C'+r+':K'+r).formulas=[formulas];
 const records=all.filter(x=>x.run===g.run&&x.policy===g.policy&&(g.scope?x.scope===g.scope:x.scenario===g.scenario));
 expected.push({row:r,run:g.run,policy:g.policy,scenario:g.label,values:aggregate(records)});
}
summary.getRange('A8:B82').format.horizontalAlignment='left';summary.getRange('C8:K82').format.horizontalAlignment='right';
for(const col of ['C','D','H','I','J','K'])summary.getRange(col+'8:'+col+'82').setNumberFormat('#,##0');
summary.getRange('E8:E82').setNumberFormat('0.0%');summary.getRange('F8:F82').setNumberFormat('0.000000');summary.getRange('G8:G82').setNumberFormat('0.0000');
for(const [col,width]of Object.entries({A:23,B:25,C:12,D:14,E:12,F:15,G:15,H:16,I:15,J:15,K:16}))summary.getRange(col+'1:'+col+'88').format.columnWidth=width;
for(const g of groupSpecs) summary.getRange('D'+g.row).conditionalFormats.add('cellIs',{operator:'greaterThan',formula:0,format:{fill:'#FDE9E7',font:{color:'#9B1C1C',bold:true}}});
summary.getRange('A3:K4').format.font={name:'Arial',size:10,italic:true,color:'#526579'};
summary.getRange('A14').format.font={name:'Arial',size:10,italic:true,color:'#526579'};
summary.getRange('A65').format.font={name:'Arial',size:10,color:'#9B1C1C'};
summary.getRange('A75').format.font={name:'Arial',size:10,italic:true,color:'#526579'};
summary.getRange('A84:A87').format.font={name:'Arial',size:10,italic:true,color:'#526579'};
for(const hr of [7,17,67,76])summary.getRange('A'+hr+':K'+hr).format.horizontalAlignment='center';
data.getRange('D2:D'+last).setNumberFormat('0');
wb.recalculate();
let maxDiff=0;
for(const e of expected){const got=summary.getRange('C'+e.row+':K'+e.row).values[0];for(let i=0;i<got.length;i++){if(typeof got[i]!=='number')throw Error('Non-numeric summary '+e.row+' '+i+': '+got[i]);const diff=Math.abs(got[i]-e.values[i]);maxDiff=Math.max(maxDiff,diff);if(diff>1e-8)throw Error('Summary mismatch '+e.row+' '+i+': '+got[i]+' vs '+e.values[i]);}}
const sourceControl=[];
for(const run of runs)for(const s of run.summaries){const rows=all.filter(r=>r.run===run.name&&r.policy===s.policy&&r.scenario===s.scenario);const a=aggregate(rows);for(const [idx,key]of [[0,'episodes'],[1,'breach_episodes'],[3,'max_T_C'],[4,'mean_effort_fraction'],[5,'interval_misses'],[6,'invalid_steps'],[7,'clipped_steps']])if(Math.abs(a[idx]-Number(s[key]))>1e-8)throw Error('Source summary mismatch '+run.name+' '+s.scenario+' '+key);sourceControl.push([run.name,s.scenario,s.policy]);}
const original=data.getRange('K2').values[0][0];const before=summary.getRange('G8').values[0][0];
data.getRange('K2').values=[[original+0.06]];wb.recalculate();
const changed=summary.getRange('G8').values[0][0];if(Math.abs(changed-before-0.06/120)>1e-9)throw Error('Recalculation did not update primary mean');
data.getRange('K2').values=[[original]];wb.recalculate();
if(Math.abs(summary.getRange('G8').values[0][0]-before)>1e-10)throw Error('Restoration failed');
const errorScan=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:50},summary:'Final formula error scan',maxChars:3000});
const keyInspect=await wb.inspect({kind:'table',range:'Summary!A7:K12',include:'values,formulas',tableMaxRows:6,tableMaxCols:11,maxChars:10000});
await fs.writeFile(path.join(qaDir,'key_ranges.ndjson'),keyInspect.ndjson);
await fs.writeFile(path.join(qaDir,'formula_errors.ndjson'),errorScan.ndjson);
for(const [name,sheetName,range] of [['summary_primary','Summary','A1:K14'],['summary_followups','Summary','A64:K87'],['data_sample','Data','A1:O12'],['data_provenance','Data','T1:U15']]){
 const img=await wb.render({sheetName,range,scale:1.3,format:'png'});
 await fs.writeFile(path.join(qaDir,name+'.png'),new Uint8Array(await img.arrayBuffer()));
}
const output=await SpreadsheetFile.exportXlsx(wb);await output.save(path.join(out,'RESULTS_DATA.xlsx'));
await fs.rename(path.join(out,'RESULTS_DATA.xlsx.inspect.ndjson'),path.join(qaDir,'export_inspect.ndjson')).catch(e=>{if(e.code!=='ENOENT')throw e;});
const qa={created_utc:new Date().toISOString(),record_count:all.length,run_counts:runs.map(r=>({run:r.name,episodes:r.records.length,seeds:r.meta.config.seeds})),primary_episodes:all.filter(r=>r.scope==='Primary valid-model').length,summary_groups:expected.length,source_summary_groups_checked:sourceControl.length,max_formula_absolute_difference:maxDiff,ack_full_policy_misses_while_valid:ackFullValidMisses,recalculation_probe:{input:'Data!K2',output:'Summary!G8',delta:0.06,expected_change:0.0005,observed_change:changed-before,restored:true},formula_error_scan:errorScan.ndjson,engine:'Artifact Tool. Excel desktop recalculation not tested.',limitations:'Finite synthetic simulations; supporting completed-run data. No measurements, forecasts or patentability inference.',xlsx_bytes:(await fs.stat(path.join(out,'RESULTS_DATA.xlsx'))).size};
await fs.writeFile(path.join(qaDir,'qa.json'),JSON.stringify(qa,null,2));
console.log(JSON.stringify({output:path.join(out,'RESULTS_DATA.xlsx'),qaDir,records:all.length,groups:expected.length,ackValidMisses:ackFullValidMisses,maxDiff},null,2));
