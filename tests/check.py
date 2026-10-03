import json, os, sys, subprocess, time
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE=ROOT; VENDOR=os.path.join(ROOT,'tests','vendor')  # optional local copy of sql.js; otherwise loads from cdnjs
SHOTS=os.path.join(ROOT,'tests','screenshots'); os.makedirs(SHOTS, exist_ok=True)
srv=subprocess.Popen(['python3','-m','http.server','8765','--directory',SITE],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
BASE='http://localhost:8765/index.html'
errs=[]; calls=[]
# Mock of the Anthropic Messages API so live mode can be tested without a key.
def mock_api(route):
    req=route.request; url=req.url
    if url.endswith('/v1/models?limit=100'):
        return route.fulfill(status=200, content_type='application/json', body=json.dumps({"data":[{"id":"claude-test-1","display_name":"Test Model"}]}), headers={"access-control-allow-origin":"*"})
    if req.method=='OPTIONS':
        return route.fulfill(status=200, headers={"access-control-allow-origin":"*","access-control-allow-headers":"*","access-control-allow-methods":"*"})
    b=json.loads(req.post_data or '{}'); calls.append(b)
    usage={"input_tokens":120,"output_tokens":40}
    def tool(name, inp, stop="tool_use"): return {"id":"msg","type":"message","role":"assistant","content":[{"type":"tool_use","id":"tu_%d"%len(calls),"name":name,"input":inp}],"stop_reason":stop,"usage":usage}
    def text(t): return {"id":"msg","type":"message","role":"assistant","content":[{"type":"text","text":t}],"stop_reason":"end_turn","usage":usage}
    tc=b.get('tool_choice')
    if tc and tc.get('type')=='tool':
        n=tc['name']; props=(b['tools'][0]['input_schema'].get('properties') or {})
        if n=='record':
            if 'line_items' in props: out={"vendor":"Brightline Facilities","invoice_number":"BL-5520","invoice_date":"2026-09-28","due_date":"2026-10-28","po_number":None,"line_items":[{"description":"Crew cleaning","quantity":6,"unit_price":450,"amount":2700},{"description":"Supplies","quantity":1,"unit_price":185,"amount":185}],"subtotal":None,"tax":None,"total":2985,"notes":"No PO"}
            elif 'leave_type' in props: out={"employee_name":"Raj","manager":"Kim","start_date":"2026-10-01","end_date":"2026-10-02","hours":16,"leave_type":"bereavement","notes":None}
            elif 'access_level' in props: out={"requester":"Grace Chen","system":"PayRun","access_level":"admin","justification":"fix tax tables","approver":"Jordan","end_date":"2026-10-31","temporary":True,"notes":None}
            else: out={"employee_name":"Dana W.","employee_id":None,"change_type":"multiple","effective_date":"2026-10-19","old_value":None,"new_value":"Senior CS Specialist; $28.50/hr","approver":"Luis","notes":None}
            return route.fulfill(status=200, content_type='application/json', body=json.dumps(tool(n,out)), headers={"access-control-allow-origin":"*"})
        if n=='grade': return route.fulfill(status=200, content_type='application/json', body=json.dumps(tool(n,{"grade":"correct","missed_facts":[],"unsupported_claims":[],"reason":"Has the required facts."})), headers={"access-control-allow-origin":"*"})
        if n=='query':
            bad = sum(1 for c in calls if c.get('tool_choice',{}).get('name')=='query')==1
            sql = "SELECT dept, COUNT(*) AS n FROM employes GROUP BY dept" if bad else "SELECT dept, COUNT(*) AS n FROM employees GROUP BY dept ORDER BY n DESC"
            return route.fulfill(status=200, content_type='application/json', body=json.dumps(tool(n,{"sql":sql,"explanation":"Counts employees by department."})), headers={"access-control-allow-origin":"*"})
        if n=='themes': return route.fulfill(status=200, content_type='application/json', body=json.dumps(tool(n,{"themes":[{"name":"Clock-in failures after the July update","description":"Location and punch problems.","comment_ids":["c01","c02"],"sentiment":"negative","quote":"The new app version broke clock-in for our whole night crew."},{"name":"Fast support","description":"Support got faster.","comment_ids":["c38"],"sentiment":"positive","quote":"Chat support is much faster than it used to be."}]})), headers={"access-control-allow-origin":"*"})
        if n=='workflow_map': return route.fulfill(status=200, content_type='application/json', body=json.dumps(tool(n,{"steps":[{"actor":"Jenna","action":"Export new hires to Excel","systems":["HRIS","Excel"],"manual":True,"re_keying":False,"waiting":False,"rework":False,"handoff_to":"IT"},{"actor":"Jenna","action":"Retype each hire into the IT form","systems":["Request form"],"manual":True,"re_keying":True,"waiting":False,"rework":False}],"candidates":[{"title":"HRIS to IT form flow","what":"Create IT requests automatically.","steps":[1,2],"tools":["Power Automate"],"experiment":"Run on last week's hires.","opportunity":"Retyping new hires"}],"open_questions":["Who owns the IT form?"]})), headers={"access-control-allow-origin":"*"})
    if b.get('tools'):
        n_results=sum(1 for m in b['messages'] if m['role']=='user' and isinstance(m['content'],list))
        if n_results==0: return route.fulfill(status=200, content_type='application/json', body=json.dumps(tool("get_employee",{"name_or_id":"Raj Patel"})), headers={"access-control-allow-origin":"*"})
        if n_results==1: return route.fulfill(status=200, content_type='application/json', body=json.dumps(tool("create_ticket",{"queue":"Payroll","summary":"Raj short $110","details":"x","priority":"high"})), headers={"access-control-allow-origin":"*"})
        return route.fulfill(status=200, content_type='application/json', body=json.dumps(text("Raj is short $110 because of a pending punch [H9][H8].")), headers={"access-control-allow-origin":"*"})
    return route.fulfill(status=200, content_type='application/json', body=json.dumps(text("Overtime is paid whether or not it was approved [H8].")), headers={"access-control-allow-origin":"*"})

def setup(page, tag, live=False):
    page.on('console', lambda m: errs.append(f'{tag} {m.type}: {m.text}') if m.type in ('error',) and 'fonts.g' not in m.text else None)
    page.on('pageerror', lambda e: errs.append(f'{tag} PAGEERROR {e}'))
    if os.path.exists(VENDOR+'/sql-wasm.js'):
        page.route('https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js', lambda r: r.fulfill(path=VENDOR+'/sql-wasm.js', content_type='application/javascript'))
        page.route('https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.wasm', lambda r: r.fulfill(path=VENDOR+'/sql-wasm.wasm', content_type='application/wasm'))
    page.route('https://fonts.googleapis.com/**', lambda r: r.abort()); page.route('https://fonts.gstatic.com/**', lambda r: r.abort())
    page.route('https://api.anthropic.com/**', mock_api)
    if live: page.add_init_script("try{sessionStorage.setItem('bb.ai.key',JSON.stringify('sk-test'));localStorage.setItem('bb.ai.model',JSON.stringify('claude-test-1'))}catch(e){}")
ROUTES=['home','workflows','lab','cases','experience','systems','notes','note-testing-ai-assistants','about','agent','rag','evals','extract','data','voc','release','flows','spec','prioritize','redact','prompts']
mode=sys.argv[1] if len(sys.argv)>1 else 'offline'
if mode=='live' and 'const LIVE_AI = false' in open(os.path.join(ROOT,'assets','js','01-ai.js')).read():
    print('Live mode is switched off (LIVE_AI = false in assets/js/01-ai.js). Set it to true to run the live tests.'); srv.terminate(); sys.exit(0)
with sync_playwright() as p:
    b=p.chromium.launch()
    if mode=='offline':
        for scheme,vw,tag in [('light',1280,'d'),('dark',390,'m')]:
            pg=b.new_page(viewport={'width':vw,'height':900}, color_scheme=scheme); setup(pg, tag)
            pg.goto(BASE+'#home'); pg.wait_for_timeout(600)
            for r in ROUTES:
                pg.evaluate(f"location.hash='{r}'"); pg.wait_for_timeout(1500 if r in ('agent','data','flows','home') else 500)
                sw=pg.evaluate('document.documentElement.scrollWidth')
                if sw>vw+1: errs.append(f'{tag} {r} overflow {sw}')
                txt=pg.evaluate("document.querySelector('.view:not([hidden])') ? document.querySelector('.view:not([hidden])').innerText : ''")
                if 'error' in txt.lower() and ('couldn' in txt.lower() or 'hit an error' in txt.lower()): errs.append(f'{tag} {r} shows error text')
                if tag=='d' or r in ('home','agent','release'):
                    pg.screenshot(path=f'{SHOTS}/{tag}-{r}.png', full_page=True)
            pg.close()
    else:
        pg=b.new_page(viewport={'width':1280,'height':900}); setup(pg,'live',live=True)
        pg.goto(BASE+'#agent'); pg.wait_for_timeout(800)
        pg.click('#agentTool .seg button:nth-child(2)'); pg.click('#agentTool .btn:has-text("Run agent")'); pg.wait_for_timeout(1200)
        pg.click('#agentTool .t-approve button:has-text("Approve")'); pg.wait_for_timeout(1200)
        t=pg.inner_text('#agentTool .trace'); print('AGENT LIVE:', 'answer' in t.lower(), 'executed (approved)' in t.lower(), t[-200:].replace('\n',' | '))
        pg.evaluate("location.hash='rag'"); pg.wait_for_timeout(500); pg.click('#ragTool .seg button:nth-child(2)'); pg.wait_for_timeout(1000); print('RAG LIVE:', pg.inner_text('#ragTool .answer')[:120])
        pg.evaluate("location.hash='extract'"); pg.wait_for_timeout(500); pg.click('#extractTool .seg button:nth-child(2)'); pg.wait_for_timeout(1200); print('EXTRACT LIVE:', pg.inner_text('#extractTool .decision')[:300].replace('\n',' | '))
        pg.evaluate("location.hash='data'"); pg.wait_for_timeout(2500); pg.click('#dataTool .seg button:nth-child(2)'); pg.click('#dataTool .btn:has-text("Ask")'); pg.wait_for_timeout(2000); print('DATA LIVE:', pg.inner_text('#dataTool .tool-split')[:400].replace('\n',' | '))
        pg.evaluate("location.hash='voc'"); pg.wait_for_timeout(500); pg.click('#vocTool .seg button:nth-child(2)'); pg.wait_for_timeout(300); pg.click('#vocTool button:has-text("Find themes")'); pg.wait_for_timeout(1200); print('VOC LIVE:', 'Clock-in failures' in pg.inner_text('#vocTool'))
        pg.evaluate("location.hash='spec'"); pg.wait_for_timeout(500); pg.click('#specTool .seg button:nth-child(2)'); pg.click('#specTool .btn:has-text("Translate")'); pg.wait_for_timeout(1200); print('SPEC LIVE:', 'Retype each hire' in pg.inner_text('#specTool'))
        pg.evaluate("location.hash='evals'"); pg.wait_for_timeout(500); pg.click('#evalsTool .btn:has-text("Run live eval")'); pg.wait_for_timeout(6000); print('EVALS LIVE:', pg.inner_text('#evalsTool .callout')[:100], pg.inner_text('#evalsTool .kpis')[:120].replace('\n',' '))
        pg.evaluate("location.hash='release'"); pg.wait_for_timeout(500); pg.click('#releaseTool .btn:has-text("Write with")'); pg.wait_for_timeout(1000); print('RELEASE LIVE:', pg.inner_text('#releaseTool pre.json')[:80])
        pg.evaluate("location.hash='prompts'"); pg.wait_for_timeout(500); pg.click('#promptsTool .btn:has-text("Test")'); pg.wait_for_timeout(1000); print('PROMPTS LIVE:', pg.inner_text('#promptsTool .answer')[:80])
        print('API calls made to the mock:', len(calls))
    b.close()
srv.terminate()
errs=[e for e in errs if 'net::ERR_FAILED' not in e]  # blocked font requests
print('\n'.join(errs) or 'NO ERRORS')
sys.exit(1 if errs else 0)
