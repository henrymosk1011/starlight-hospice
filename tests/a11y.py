"""Accessibility checks for the Starlight Hospice site.

Runs in headless Chromium against the local files:
  axe       axe-core scan (WCAG 2.0, 2.1, 2.2 A and AA plus best practices) at 1440, 390 and 320 wide
  contrast  hero text contrast measured against the actual photo pixels at seven screen sizes
  kb        Tab and Shift+Tab through every page; flags focus that is hidden, covered or unoutlined
  layout    320px reflow, WCAG 1.4.12 text spacing, and 200% text size

Usage (from the repo root):
  npm install
  pip install playwright pillow && python -m playwright install chromium
  python tests/a11y.py                 # everything
  python tests/a11y.py axe,contrast    # pick checks
"""
import asyncio, json, io
from playwright.async_api import async_playwright
from PIL import Image
import os, sys, pathlib
ROOT=pathlib.Path(__file__).resolve().parent.parent
AXE=(ROOT/"node_modules"/"axe-core"/"axe.min.js").read_text()
BASE=ROOT.as_uri()+"/"
PAGES=["index","about","services","admissions","contact","accessibility"]
def lum(c):
    def ch(v):
        v=v/255; return v/12.92 if v<=0.03928 else ((v+0.055)/1.055)**2.4
    r,g,b=c[:3]; return 0.2126*ch(r)+0.7152*ch(g)+0.0722*ch(b)
def ratio(a,b):
    la,lb=sorted([lum(a),lum(b)],reverse=True); return (la+0.05)/(lb+0.05)
async def newpage(b, vp, rm="no-preference"):
    pg=await b.new_page(viewport=vp, reduced_motion=rm)
    await pg.route("**/fonts.g*/**", lambda r: r.abort())
    return pg

async def axe_all(b):
    out=[]
    for vp in [{"width":1440,"height":900},{"width":390,"height":844},{"width":320,"height":568}]:
        for name in PAGES:
            pg=await newpage(b,vp,"reduce"); await pg.goto(BASE+name+".html"); await pg.wait_for_timeout(500)
            await pg.add_script_tag(content=AXE)
            v=await pg.evaluate("""async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']}});return r.violations.map(v=>v.id+':'+v.nodes.length)}""")
            if v: out.append((vp["width"],name,v))
            await pg.close()
    print("AXE violations:", out or "none")

async def hero_contrast(b):
    worst=[]
    for vp in [(1920,1080),(1440,900),(1280,720),(1024,768),(768,1024),(390,844),(320,568)]:
        pg=await newpage(b,{"width":vp[0],"height":vp[1]}); await pg.goto(BASE+"index.html"); await pg.wait_for_timeout(4500)
        boxes=await pg.evaluate("""()=>{const out=[];const sel='.hero .eyebrow, .hero h1 .wd > span, .hero .lead, .hero-meta li, .scroll-cue';
          document.querySelectorAll(sel).forEach(e=>{const r=e.getBoundingClientRect(); if(r.width<2||r.bottom<0||r.top>innerHeight) return; const cs=getComputedStyle(e); const fs=parseFloat(cs.fontSize);
          out.push({t:(e.textContent||'').trim().slice(0,24),x:r.left,y:r.top,w:r.width,h:r.height,c:cs.color,large: fs>=24 || (fs>=18.66 && parseInt(cs.fontWeight)>=700)})});return out}""")
        await pg.add_style_tag(content=".hero *{color:transparent !important;text-shadow:none !important} .hero svg{visibility:hidden !important} .site-header{visibility:hidden !important}")
        await pg.wait_for_timeout(200)
        img=Image.open(io.BytesIO(await pg.screenshot())).convert("RGB")
        sx=img.width/vp[0]
        for bx in boxes:
            col=[int(float(v)) for v in bx["c"][bx["c"].find("(")+1:bx["c"].find(")")].split(",")[:3]]
            x0,y0=int(bx["x"]*sx),int(bx["y"]*sx); x1,y1=int((bx["x"]+bx["w"])*sx),int((bx["y"]+bx["h"])*sx)
            x0,y0=max(0,x0),max(0,y0); x1,y1=min(img.width,x1),min(img.height,y1)
            if x1<=x0 or y1<=y0: continue
            crop=img.crop((x0,y0,x1,y1)).resize((max(1,(x1-x0)//2),max(1,(y1-y0)//2)))
            px=sorted(list(crop.getdata()), key=lum)
            p95=px[int(len(px)*0.95)-1] if len(px)>1 else px[0]
            r=ratio(col,p95); need=3 if bx["large"] else 4.5
            worst.append((round(r,2),need,vp,bx["t"]))
        await pg.close()
    fails=[w for w in worst if w[0]<w[1]]
    worst.sort()
    print("HERO CONTRAST lowest 5:", worst[:5])
    print("HERO CONTRAST failures:", fails or "none")

async def keyboard(b):
    issues=[]
    for vp in [{"width":1440,"height":900},{"width":390,"height":844}]:
        for name in PAGES:
            pg=await newpage(b,vp); await pg.goto(BASE+name+".html"); await pg.wait_for_timeout(1200)
            seen=[]
            async def check(direction):
                info=await pg.evaluate("""()=>{const el=document.activeElement; if(!el||el===document.body) return null; const r=el.getBoundingClientRect();
                  const inView=r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;
                  const x=Math.min(innerWidth-1,Math.max(1,r.left+Math.min(r.width/2,20))), y=Math.min(innerHeight-1,Math.max(1,r.top+Math.min(r.height/2,12)));
                  const t=document.elementFromPoint(x,y); const ok=inView && t && (t===el||el.contains(t)||t.contains(el));
                  const host=el.closest('.hcard')||el; const cs=getComputedStyle(host); const outline=(cs.outlineStyle!=='none' && parseFloat(cs.outlineWidth)>0) || (cs.boxShadow && cs.boxShadow!=='none');
                  return {tag:el.tagName, txt:(el.textContent||el.getAttribute('aria-label')||'').trim().slice(0,28), ok, outline, top:t?(t.className||t.tagName)+'':'none'}}""")
                return info
            for i in range(140):
                await pg.keyboard.press("Tab"); await pg.wait_for_timeout(140)
                info=await check("fwd")
                if not info: continue
                key=info["tag"]+info["txt"]
                if seen and key==seen[0]: break
                seen.append(key)
                if not info["ok"]: issues.append(("fwd",vp["width"],name,info))
                if not info["outline"]: issues.append(("no-outline",vp["width"],name,info))
            n=len(seen)
            for i in range(n+2):
                await pg.keyboard.press("Shift+Tab"); await pg.wait_for_timeout(140)
                info=await check("back")
                if info and not info["ok"]: issues.append(("back",vp["width"],name,info))
            await pg.close()
    # dedupe
    uniq=[]
    for it in issues:
        k=(it[0],it[1],it[2],it[3]["txt"])
        if k not in [(u[0],u[1],u[2],u[3]["txt"]) for u in uniq]: uniq.append(it)
    from collections import Counter
    print("KEYBOARD issues total", len(uniq), Counter((u[0],u[1],u[2]) for u in uniq))
    for u in uniq[:12]: print("  ", u[0],u[1],u[2],u[3]["txt"],"| top:",u[3]["top"])

async def reflow_spacing_zoom(b):
    res=[]
    css_spacing="*{line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important} p{margin-bottom:2em !important}"
    probe="""()=>{const bad=[];document.querySelectorAll('body *').forEach(e=>{ if(e.closest('[aria-hidden="true"]')||e.closest('.visually-hidden')||e.closest('[hidden]')) return; const cs=getComputedStyle(e);
      if(['hidden','clip'].includes(cs.overflowX)||['hidden','clip'].includes(cs.overflowY)){ if(e.matches('.wd,.hero,.sheet,.site-footer,.cta,.bigtype,.hscroll-pin,.hero-media,.menu')) {
          if(e.matches('.hscroll-pin') && e.scrollHeight>e.clientHeight+4) bad.push('pin-clipped'); return;}
        if(e.scrollHeight>e.clientHeight+3||e.scrollWidth>e.clientWidth+3) bad.push((e.className||e.tagName)+'');}});
      return {sw:document.documentElement.scrollWidth, iw:innerWidth, bad:bad.slice(0,6), pinned:!!document.querySelector('.hscroll.is-pinned'), flat:!!document.querySelector('.stack-cards.flat')}}"""
    for label,vp,css in [("320 reflow",{"width":320,"height":568},""),("spacing 1440",{"width":1440,"height":900},css_spacing),("spacing 390",{"width":390,"height":844},css_spacing),("text 200% 1280",{"width":1280,"height":800},"html{font-size:200% !important}")]:
        for name in PAGES:
            pg=await newpage(b,vp); await pg.goto(BASE+name+".html"); await pg.wait_for_timeout(800)
            if css: await pg.add_style_tag(content=css); await pg.wait_for_timeout(700)
            r=await pg.evaluate(probe)
            if r["sw"]>r["iw"] or r["bad"]: res.append((label,name,r))
            elif name=="index": res.append((label,name,"ok",{"pinned":r["pinned"],"flat":r["flat"]}))
            await pg.close()
    for r in res: print("LAYOUT", r)

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        which=sys.argv[1] if len(sys.argv)>1 else 'axe,contrast,kb,layout'
        if 'axe' in which: await axe_all(b)
        if 'contrast' in which: await hero_contrast(b)
        if 'kb' in which: await keyboard(b)
        if 'layout' in which: await reflow_spacing_zoom(b)
        await b.close()
asyncio.run(main())
