"""Build vector figures and review PDFs from editable Markdown. Requires reportlab."""
from pathlib import Path
from html import escape
import csv,json,math,re,copy
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import BaseDocTemplate,PageTemplate,Frame,Paragraph,Spacer,PageBreak,Table,TableStyle,KeepTogether
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.graphics.shapes import Drawing,Rect,Line,String,PolyLine,Polygon
from reportlab.graphics import renderSVG
BASE=Path(__file__).resolve().parent;OUT=BASE.parent
FIG=BASE/"figures";FIG.mkdir(exist_ok=True)
for n,f in [("Arial","arial.ttf"),("Arial-Bold","arialbd.ttf"),("Arial-Italic","ariali.ttf")]:
    pdfmetrics.registerFont(TTFont(n,str(Path("C:/Windows/Fonts")/f)))
pdfmetrics.registerFontFamily("Arial",normal="Arial",bold="Arial-Bold",italic="Arial-Italic",boldItalic="Arial-Bold")
def clean(s):
    for a,b in {"\u2014":" - ","\u2013":"-","\u2011":"-","\u2212":"-","\u2192":" -> ",
                "\u2264":"<=","\u2265":">=","\u221e":"infinity","\u00b2":"^2",
                "\u03b5":"epsilon","\u0394":"Delta","\u03b1":"alpha","\u2260":"!="}.items():s=s.replace(a,b)
    return s
def inline(s):
    s=escape(clean(s))
    s=re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)",r'<link href="\2" color="#1f527a">\1</link>',s)
    s=re.sub(r"\[([^\]]+)\]\(([^)]+)\)",r"\1",s)
    s=re.sub(r"\x60([^\x60]+)\x60",r'<font name="Courier" size="9">\1</font>',s)
    s=re.sub(r"\*\*([^*]+)\*\*",r"<b>\1</b>",s)
    return s
styles={
"title":ParagraphStyle("Title",fontName="Arial-Bold",fontSize=24,leading=29,spaceAfter=18),
"h1":ParagraphStyle("Heading1",fontName="Arial-Bold",fontSize=16,leading=20,spaceBefore=15,spaceAfter=9,keepWithNext=True),
"h2":ParagraphStyle("Heading2",fontName="Arial-Bold",fontSize=12,leading=16,spaceBefore=11,spaceAfter=6,keepWithNext=True),
"body":ParagraphStyle("Body",fontName="Arial",fontSize=10.7,leading=15.4,spaceAfter=8),
"small":ParagraphStyle("Small",fontName="Arial",fontSize=8.5,leading=11.8,spaceAfter=5),
"cell":ParagraphStyle("Cell",fontName="Arial",fontSize=9,leading=12)}
for _s in styles.values():
    _s.allowWidows=0
    _s.allowOrphans=0
styles["record"]=ParagraphStyle("Record",parent=styles["body"],keepWithNext=True)
def label(d,x,y,s,size=9,bold=False,anchor="middle",color=colors.black):
    d.add(String(x,y,clean(s),fontName="Arial-Bold" if bold else "Arial",fontSize=size,textAnchor=anchor,fillColor=color))
def box(d,x,y,w,h,lines):
    d.add(Rect(x,y,w,h,fillColor=colors.white,strokeColor=colors.black,strokeWidth=.8))
    for i,s in enumerate(lines):label(d,x+w/2,y+h-16-i*13,s,9,i==0)
def arrow(d,points):
    d.add(PolyLine([z for xy in points for z in xy],strokeColor=colors.black,strokeWidth=.8,fillColor=None))
    (x0,y0),(x1,y1)=points[-2:];ang=math.atan2(y1-y0,x1-x0);a=5
    d.add(Polygon([x1,y1,x1-a*math.cos(ang-.45),y1-a*math.sin(ang-.45),x1-a*math.cos(ang+.45),y1-a*math.sin(ang+.45)],fillColor=colors.black,strokeColor=colors.black))
def architecture():
    d=Drawing(504,340);label(d,252,324,"FIG. 1. Scalar thermal governor and explicit interfaces",11,True)
    box(d,8,240,135,55,["100 Sensor","Noise then upper clipping","Reading / missing marker"])
    box(d,184,240,135,55,["110 Interval observer","Finite commissioning bound","Intersect and propagate"])
    box(d,360,240,135,55,["130 Governor","Queue + candidate bound","Zero-input terminal set"])
    box(d,8,65,135,55,["150 Scalar plant","Applied effort -> heat","Synthetic embodiment"])
    box(d,184,65,135,55,["120 Accepted FIFO","All pending commands","Exact external contract"])
    box(d,360,65,135,55,["140 Adapter","Apply FIFO order","Assert applied effort"])
    arrow(d,[(75,120),(75,240)]);label(d,80,177,"Temperature",8,anchor="start")
    arrow(d,[(143,268),(184,268)]);arrow(d,[(319,268),(360,268)])
    arrow(d,[(428,240),(428,120)]);label(d,432,204,"Selected",8,anchor="start");label(d,432,191,"effort",8,anchor="start")
    arrow(d,[(360,94),(319,94)]);label(d,339,103,"Queue",7)
    arrow(d,[(251,120),(251,155),(399,155),(399,240)]);label(d,316,161,"Pending efforts",8)
    arrow(d,[(373,120),(373,212),(251,212),(251,240)]);label(d,309,218,"Asserted applied effort",8)
    arrow(d,[(427,65),(427,36),(75,36),(75,65)]);label(d,251,42,"Actual applied effort",8)
    label(d,252,9,"100, 120, 140 and 150 are simulated or externally assumed interfaces.",8)
    return d
def flow():
    d=Drawing(504,465);label(d,252,450,"FIG. 2. Decision and state-advancement sequence",11,True)
    steps=[("Commission model and finite interval","Check invariant zero-input condition"),
      ("Validate demand and accepted FIFO","Invalid demand raises; other listed faults latch"),
      ("Intersect observed temperature set","Missing: retain. Clipped: lower constraint only."),
      ("Propagate every queued upper state","Reject any prefix beyond the limit"),
      ("Compute candidate and round downward","Recheck endpoint; retain zero-input continuation"),
      ("Return action, interval and status","Adapter applies existing FIFO ordering"),
      ("Advance with asserted applied effort","Update both bounds for the next sample")]
    ys=[]
    for i,ls in enumerate(steps):
        y=390-i*55;ys.append(y);box(d,20,y,340,42,ls)
        if i:arrow(d,[(190,ys[i-1]),(190,y+42)])
    box(d,382,187,110,72,["Invalid latch","Return zero","FIFO persists","No safety reset"])
    for i in (1,2,3,4,6):
        y=ys[i]+20;arrow(d,[(360,y),(372,y),(372,220),(382,220)])
    label(d,386,281,"Fault paths",8,anchor="start")
    label(d,252,8,"Internal status does not authenticate model bounds or reported actuation.",8)
    return d
def run_data(pointer):
    rel=(BASE/"results"/pointer).read_text().strip().replace("\\","/");folder=BASE/rel
    return folder,json.loads((folder/"run_metadata.json").read_text())
mainfolder,main=run_data("FINAL_EVALUATION.txt");ackfolder,ack=run_data("ACK_FOLLOWUP.txt");abfolder,ab=run_data("CLIPPING_ABLATION.txt")
valid_names={"no_delay","delay_8","delay_20","dropout_60","hot_start","upper_corner"}
names={"fixed_cap":"Robust constant cap","threshold":"Threshold hysteresis","nominal_queue":"Nominal + queue",
"interval_no_queue":"Interval, queue omitted","interval_queue":"Full interval + queue","interval_exact_clip":"Ceiling treated as exact"}
policies=["fixed_cap","threshold","nominal_queue","interval_no_queue","interval_queue"];primary=[]
for p in policies:
    rows=[r for r in main["aggregation"] if r["policy"]==p and r["scenario"] in valid_names]
    primary.append({"policy":p,"episodes":sum(r["episodes"] for r in rows),"breaches":sum(r["breach_episodes"] for r in rows),
    "effort":sum(r["mean_effort_fraction"] for r in rows)/len(rows),"maxT":max(r["max_T_C"] for r in rows)})
def results_chart():
    d=Drawing(504,263);label(d,252,247,"Primary valid-model results: 120 episodes per controller",11,True)
    label(d,309,225,"Applied / requested effort (%)",9)
    for v in (0,25,50,75,100):
        x=190+v*2.45;d.add(Line(x,40,x,211,strokeColor=colors.HexColor("#dddddd"),strokeWidth=.5));label(d,x,28,str(v),8)
    for i,r in enumerate(primary):
        y=190-i*34;label(d,181,y+1,names[r["policy"]],8,anchor="end")
        col=colors.HexColor("#245d7d") if r["policy"]=="interval_queue" else colors.HexColor("#8b949c")
        d.add(Rect(190,y-6,r["effort"]*245,18,strokeColor=None,fillColor=col))
        label(d,190+r["effort"]*245+4,y-1,f'{r["effort"]*100:.1f}',8,anchor="start")
        label(d,479,y-1,f'{r["breaches"]}/120',8)
    label(d,478,225,"Breaches",8);label(d,252,4,"Higher effort is useful only when the stated thermal constraint also holds.",8)
    return d
def ablation_chart():
    d=Drawing(504,263);label(d,252,247,"Clipping ablation: upper-corner trace, seed 4000",11,True)
    rows=list(csv.DictReader((abfolder/"example_traces.csv").open()))
    ps=["interval_queue","interval_no_queue","interval_exact_clip"]
    cols=[colors.HexColor("#215b7b"),colors.HexColor("#777777"),colors.HexColor("#ab463d")]
    x0,y0,w,hh=47,51,440,152
    for t in (40,80,105,140,180):
        yy=y0+(t-30)/160*hh;d.add(Line(x0,yy,x0+w,yy,strokeColor=colors.HexColor("#dddddd"),strokeWidth=.5))
        label(d,x0-7,yy-3,str(t),8,anchor="end")
    for k in (0,300,600,900):label(d,x0+k/900*w,y0-14,str(k),8)
    yy=y0+(105-30)/160*hh;d.add(Line(x0,yy,x0+w,yy,strokeColor=colors.black,strokeWidth=1,strokeDashArray=[4,3]))
    label(d,478,yy+5,"105 C limit",8,anchor="end")
    for p,c in zip(ps,cols):
        pts=[(x0+float(r["k"])/900*w,y0+(float(r["true_T_C"])-30)/160*hh) for r in rows if r["scenario"]=="upper_corner" and r["policy"]==p]
        if pts:d.add(PolyLine([v for xy in pts for v in xy],strokeColor=c,strokeWidth=1.2,fillColor=None))
    for i,(p,c) in enumerate(zip(ps,cols)):
        x=40+i*163;d.add(Line(x,224,x+14,224,strokeColor=c,strokeWidth=2))
        label(d,x+18,220,{"interval_queue":"Full","interval_no_queue":"Queue omitted","interval_exact_clip":"Ceiling as exact"}[p],8,anchor="start")
    label(d,265,13,"Time (one-second samples)",9);label(d,47,210,"Temperature (C)",8,anchor="start")
    return d
FIGURES={"architecture":architecture(),"flow":flow(),"primary_results":results_chart(),"ablation":ablation_chart()}
def write_figures():
    """Export the original study figures only during an explicit full build."""
    for name,d in FIGURES.items():renderSVG.drawToFile(d,str(FIG/(name+".svg")))
    with (FIG/"primary_chart_data.csv").open("w",newline="") as f:
        wr=csv.DictWriter(f,fieldnames=list(primary[0]));wr.writeheader();wr.writerows(primary)
    for docname in ("TECHNICAL_DISCLOSURE.md","CLAIMS_DISCUSSION_DRAFT.md"):
        pp=BASE/"docs"/docname;s=pp.read_text(encoding="utf8")
        s=s.replace("planned block diagram","block diagram").replace("planned decision flow","decision flow")
        s=s.replace("identifies a planned figure and its disclosure paragraph, not an already rendered drawing","identifies an authored vector figure in figures/architecture.svg or figures/flow.svg and its disclosure paragraph")
        pp.write_text(s,encoding="utf8")
class Doc(BaseDocTemplate):
    def __init__(self,p,author="Unassigned; AI-assisted preparation"):
        super().__init__(str(p),pagesize=(612,792),leftMargin=51,rightMargin=51,topMargin=49,bottomMargin=49,
          title=p.stem.replace("_"," "),author=author)
        self.addPageTemplates(PageTemplate(id="normal",frames=[Frame(51,49,510,694,leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)],onPage=self.footer))
    def footer(self,c,doc):c.setFont("Arial",8);c.drawRightString(561,28,str(doc.page))
    def afterFlowable(self,f):
        if isinstance(f,Paragraph) and getattr(f,"_toc",False):
            txt=f.getPlainText();key=f._key;self.canv.bookmarkPage(key);self.canv.addOutlineEntry(txt,key,level=0,closed=False)
            self.notify("TOCEntry",(0,txt,self.page,key))
counter=0
def h(text,kind="h1",toc=True):
    global counter
    p=Paragraph(inline(text),styles[kind])
    if toc and kind=="h1":counter+=1;p._toc=True;p._key=f"section{counter}"
    return p
def tab(rows):
    n=len(rows[0]);widths=[510/n]*n
    if n==4:widths=[180,96,108,126]
    if n==3:widths=[242,132,136]
    if n==3 and rows[0][0]=="ID":widths=[42,220,248]
    if n==3 and rows[0][0]=="Item":widths=[160,95,255]
    t=Table([[Paragraph(inline(str(v)),styles["cell"]) for v in row] for row in rows],colWidths=widths,repeatRows=1,hAlign="LEFT")
    t.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("BACKGROUND",(0,0),(-1,0),colors.HexColor("#eeeeee")),
    ("LINEBELOW",(0,0),(-1,0),.8,colors.black),("LINEBELOW",(0,1),(-1,-1),.3,colors.HexColor("#cccccc")),
    ("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),7)]))
    return t
def special_table(name):
    if name=="primary":return tab([["Controller","Breach episodes","Mean effort","Maximum T (C)"]]+[
      [names[r["policy"]],f'{r["breaches"]}/{r["episodes"]}',f'{100*r["effort"]:.1f}%',f'{r["maxT"]:.6f}'] for r in primary])
    if name=="primary_short":return tab([["Controller","Breach episodes","Requested effort delivered"]]+[
      [names[r["policy"]],f'{r["breaches"]}/120',f'{100*r["effort"]:.1f}%'] for r in primary if r["policy"] in ("fixed_cap","interval_queue")])
    return tab([["Post-main experiment","Full controller","Comparison / limitation"],
      ["Clipping ablation (40 episodes per policy)","0 breaches; 0 interval misses","Exact-clip: 28 breaches; queue omitted: 25"],
      ["Actual ACK mismatch (20 episodes per policy)","0 breaches; 317 interval misses","113 interval misses while status still valid"]])
def markdown(text,include_first_title=True):
    lines=text.splitlines();story=[];i=0;first=True
    while i<len(lines):
        s=lines[i].strip()
        if not s:i+=1;continue
        if s=="[[PAGEBREAK]]":story.append(PageBreak());i+=1;continue
        if s.startswith("[[FIGURE:"):
            story.extend([Spacer(1,8),copy.deepcopy(FIGURES[s[9:-2]]),Spacer(1,10)]);i+=1;continue
        if s.startswith("[[TABLE:"):story.extend([special_table(s[8:-2]),Spacer(1,10)]);i+=1;continue
        if s.startswith("#"):
            lev=len(s)-len(s.lstrip("#"));txt=s[lev:].strip()
            if lev==1 and first:
                first=False
                if include_first_title:story.append(h(txt,"title",False))
            else:story.append(h(txt,"h1" if lev<=2 else "h2",toc=include_first_title))
            i+=1;continue
        if s.startswith("|"):
            block=[]
            while i<len(lines) and lines[i].strip().startswith("|"):
                row=[x.strip() for x in lines[i].strip().strip("|").split("|")]
                if not all(re.fullmatch(r"[: -]+",v or "-") for v in row):block.append(row)
                i+=1
            if not block:continue
            if len(block[0])>4 or max(sum(len(x) for x in row) for row in block)>520:
                hdr=block[0]
                for row in block[1:]:
                    story.append(Paragraph("<b>"+inline(row[0])+"</b>",styles["record"]))
                    body="<br/>".join("<b>"+inline(hdr[j])+":</b> "+inline(row[j]) for j in range(1,min(len(hdr),len(row))))
                    story.append(Paragraph(body,styles["small"]))
                story.append(Spacer(1,5))
            else:story.extend([tab(block),Spacer(1,10)])
            continue
        if s.startswith(chr(96)*3):
            i+=1
            while i<len(lines) and not lines[i].strip().startswith(chr(96)*3):
                story.append(Paragraph('<font name="Courier" size="9">'+escape(clean(lines[i]))+"</font>",styles["body"]));i+=1
            i+=1;continue
        if s.startswith("- ") or re.match(r"^\d+\. ",s):story.append(Paragraph(inline(s),styles["body"]));i+=1;continue
        parts=[s];i+=1
        while i<len(lines) and lines[i].strip() and not re.match(r"^(#|\||\[\[|- )",lines[i].strip()) and not lines[i].strip().startswith(chr(96)*3):
            parts.append(lines[i].strip());i+=1
        paragraph=Paragraph(inline(" ".join(parts)),styles["small"] if re.match(r"^\[\d{1,2}\] ",parts[0]) else styles["body"])
        story.append(KeepTogether([paragraph]) if re.match(r"^\*\*\d+\.\*\*",parts[0]) else paragraph)
    return story
def writepdf(name,text,drawings=False,author="Unassigned; AI-assisted preparation"):
    # Keep the expanded manuscript's references together without shrinking type.
    body=styles["body"];spacing=(body.leading,body.spaceAfter)
    if name=="RESEARCH_MANUSCRIPT.pdf":body.leading=14.7;body.spaceAfter=6
    try:
        story=markdown(text)
        if drawings:story.extend([PageBreak(),h("Drawings"),copy.deepcopy(FIGURES["architecture"]),PageBreak(),copy.deepcopy(FIGURES["flow"])])
        Doc(OUT/name,author=author).multiBuild(story)
    finally:body.leading,body.spaceAfter=spacing
def build():
    write_figures()
    writepdf("START_HERE.pdf",(BASE/"docs/START_HERE.md").read_text(encoding="utf8"))
    writepdf("RESEARCH_MANUSCRIPT.pdf",(BASE/"docs/RESEARCH_MANUSCRIPT.md").read_text(encoding="utf8"))
    writepdf("TECHNICAL_DISCLOSURE.pdf",(BASE/"docs/TECHNICAL_DISCLOSURE.md").read_text(encoding="utf8").replace("## Field, purpose, and status","[[PAGEBREAK]]\n\n## Field, purpose, and status"),True)
    intro="""# Full engineering and patent review dossier

## Outcome and release status
The scalar interval thermal governor is implemented and tested. In the primary valid-model suite it has zero sampled-limit breaches in 120 episodes and delivers 90.4% of requested normalized effort, versus 67.1% for a robust constant cap that also has zero breaches. Fifteen boundary tests pass. These are synthetic model results.

The proposed broad invention framing has substantial prior-art overlap. Narrow patentability, actual human conception and ownership are unresolved. No application has been submitted. A false applied-action report can invalidate containment while the local validity flag remains true; the flag is not evidence that external assumptions hold.

Editable originals, source/config snapshots, completed raw data and reproducibility instructions are in PROJECT.zip. The study, numbered embodiment and plain-language guide are also available as separate PDFs.

## Document inventory
Application-style discussion components: numbered technical disclosure, 148-word abstract, 11 discussion claims, and two explanatory vector figures. Each requires practitioner and inventor review before any filing decision.

Internal records: source-paper audit, screening, prior-art challenge/search log, experiments and amendments, requirements, evidence/contribution/disclosure ledgers, independent AI reviews, and filing-readiness notes. Internal materials are not automatically proposed patent-office submissions.
"""
    story=markdown(intro);story.extend([PageBreak(),h("Contents","h1",False)])
    toc=TableOfContents();toc.levelStyles=[ParagraphStyle("TOC",fontName="Arial",fontSize=10,leading=14,spaceBefore=4)]
    story.extend([toc])
    sections=[("1. Research study","docs/RESEARCH_MANUSCRIPT.md"),("2. Technical disclosure","docs/TECHNICAL_DISCLOSURE.md"),
    ("3. Discussion claims and support","docs/CLAIMS_DISCUSSION_DRAFT.md"),("4. Source-paper audit","research/SOURCE_PAPER_AUDIT.md"),
    ("5. Problem discovery and alternatives","research/problem_screening.md"),("6. Prior-art challenge","research/prior_art_challenge.md"),
    ("7. Requirements and bench-validation plan","research/REQUIREMENTS_AND_TEST_MATRIX.md"),("8. Evidence records","research/EVIDENCE_LEDGER.md"),
    ("9. Independent engineering review","research/engineering_review.md"),("10. Independent result audit","research/final_results_review.md"),
    ("11. Inventorship and contribution facts","research/CONTRIBUTION_RECORD.md"),("12. Disclosure records","research/DISCLOSURE_LEDGER.md"),
    ("13. Filing readiness and official links","research/FILING_READINESS.md"),("14. Reproducibility","REPRODUCIBILITY.md")]
    combined=[intro]
    for title,rel in sections:
        story.extend([PageBreak(),h(title)]);text=(BASE/rel).read_text(encoding="utf8");story.extend(markdown(text,False));combined.append("\n# "+title+"\n"+text)
    Doc(OUT/"FULL_REVIEW_DOSSIER.pdf").multiBuild(story)
    (BASE/"docs/FULL_REVIEW_DOSSIER.md").write_text("\n\n".join(combined),encoding="utf8")
    print(json.dumps({"pdfs":[p.name for p in OUT.glob("*.pdf")],"figures":list(FIGURES)}))
if __name__=="__main__":build()
