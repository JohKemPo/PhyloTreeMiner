"""
Sonda de caracterização de D22 — o que a API responde sobre estado e duração.

Replica a lógica de `/projects` (duração), `/projects/status` (estado) e
`/projects/details` (etapa e progresso) sobre os projetos em disco, e põe ao
lado o que o `manifest.json` já sabe. Serve para duas coisas:

1. **Caracterizar antes de corrigir** — é o "antes" da tabela de diff exigida
   por `04-rigor-cientifico §3`.
2. **Reprovar depois** — quando M4.O entregar, nenhuma linha deve mostrar
   `idle` para projeto com log de execução, nem duração divergente da do
   manifesto, nem progresso 0% em toda a coluna.

Uso:  python Backend/scripts/sonda_status_execucao.py
      (da raiz do repositório)
"""
import datetime, glob, json, os, re, sys

RAIZ = "BioComp_UFF/projects"
ts = re.compile(r"^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3})")
step_re = re.compile(r"STEP:\s*(.*)")
prog_re = re.compile(r"(\d+)\s*%\s*\|")
agora = datetime.datetime.now()

print(f"{'projeto':44s} {'status':10s} {'duração':>10s}  {'progr':>6s}  step / manifesto")
print("-" * 130)
for nome in sorted(os.listdir(RAIZ)):
    p = os.path.join(RAIZ, nome)
    if not os.path.isdir(p):
        continue
    out = os.path.join(p, "out", "outputs")
    status, dur, prog, step = "idle", None, 0, "Not started"
    logs = glob.glob(os.path.join(out, "*.log")) if os.path.exists(out) else []
    if logs:
        ultimo = max(logs, key=os.path.getmtime)
        conteudo = open(ultimo, encoding="utf-8", errors="ignore").read()
        if "Completed successfully!" in conteudo:
            status = "completed"
        elif "ERROR" in conteudo:
            status = "failed"
        linhas = [l for l in conteudo.splitlines() if l.strip()]
        if linhas:
            m1 = ts.match(linhas[0])
            m2 = ts.match(linhas[-1])
            if m1 and m2:
                a = datetime.datetime.strptime(m1.group(1), "%Y-%m-%d %H:%M:%S,%f")
                b = datetime.datetime.strptime(m2.group(1), "%Y-%m-%d %H:%M:%S,%f")
                dur = int((b - a).total_seconds())
            elif m1:
                dur = "None (última linha sem timestamp)"
        for l in reversed(linhas):
            m = step_re.search(l)
            if m:
                step = m.group(1).strip(); break
        for l in reversed(linhas):
            m = prog_re.search(l)
            if m:
                prog = int(m.group(1)); break
    # o que o manifesto sabe
    mf = os.path.join(out, "manifest.json")
    manif = "—"
    if os.path.exists(mf):
        try:
            d = json.load(open(mf, encoding="utf-8"))
            i, f = d.get("started_at_utc"), d.get("finished_at_utc")
            if i and f:
                di = datetime.datetime.fromisoformat(i); df = datetime.datetime.fromisoformat(f)
                manif = f"manifesto: {int((df-di).total_seconds())}s"
            else:
                manif = "manifesto: incompleto"
        except Exception as e:
            manif = f"manifesto: ilegível"
    print(f"{nome:44s} {status:10s} {str(dur):>10s}  {prog:5d}%  {step[:34]:34s} {manif}")
