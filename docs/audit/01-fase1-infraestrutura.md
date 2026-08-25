# Fase 1 — Infraestrutura e Configuração (P1-x)

[← Índice](README.md) · Ver também: [10-progresso-execucao.md](10-progresso-execucao.md)

- **P1-1 [P0/bug]** `requirements.txt` sem `python-dotenv` (usado em `neo4j_services.py:3`) nem `psutil` (`app.py:8`) → backend não sobe em ambiente limpo.
  **Fix:** adicionar `python-dotenv==1.0.1`, `psutil==5.9.8`. (= [C-1](06-eixo-bugs.md))

- **P1-2 [P0/bug]** `.gitmodules` usa URL SSH (`git@github.com:JohKemPo/BioComp_UFF.git`) mas o README manda clonar via HTTPS `--recursive` → falha para quem não tem chave SSH; e o backend depende do submódulo (`app.py:39-43`).
  **Fix:** `url = https://github.com/JohKemPo/BioComp_UFF.git` + `git submodule sync`.

- **P1-3 [alto/seg]** `docker-compose.yml`: sem `healthcheck` (race com `neo4j_service.connect()` no lifespan); portas `7474/7687` em `0.0.0.0`; sem `restart`; sem `mem_limit` (heap 4G + pagecache 2G); `version:'3.8'` obsoleto; `NEO4JLABS_PLUGINS` legado (usar `NEO4J_PLUGINS`); `${NEO4J_PASSWORD}` sem `.env` vira senha vazia; `apparmor:unconfined`. Sem `.env.example`.
  **Fix:** healthcheck cypher-shell + `depends_on: service_healthy`, bind `127.0.0.1`, `NEO4J_AUTH: neo4j/${NEO4J_PASSWORD:?...}`, `mem_limit: 7g`, remover apparmor/version.

- **P1-4 [médio/robustez]** `application_ui.sh:294` faz `rm -rf node_modules package-lock.json` (destrói lockfile → usar `npm ci`); `uvicorn --reload --host 0.0.0.0` (dev+exposto); porta 5179 vs Vite 5173; `nc -z 7687` em loop sem timeout (trava); `cleanup() exit 1` mesmo em Ctrl+C limpo; `pkill -f` amplo; `RED` duplicado (`start.sh:9-10`); sem `set -euo pipefail`.

- **P1-5 [médio/reprod]** `requirements.txt` pinagem mista; escopos misturados (`dash`, `dash-bio`, `parsl`, `mlxtend`, `seaborn`, `matplotlib` não usados em `Backend/src` — são do workflow); `PyQt5`+`ete3` exigem Qt headless (`QT_QPA_PLATFORM=offscreen`).
  **Fix:** fixar versões, separar back/workflow, exportar env Qt.

- **P1-6 [baixo/higiene]** Artefatos versionados: `Backend/src/__pycache__/*.pyc`, `Backend/src/temp_ncbi/temp_unknown_species.gb`.
  **Fix:** `git rm -r --cached`, ignorar `Backend/src/temp_ncbi/`.

- **P1-7 [médio/arq]** Back/front fora de container (só Neo4j dockerizado).
  **Fix estrutural:** ver [07-eixo-arquitetura.md § A](07-eixo-arquitetura.md).

- **P1-8** → vira [F-2](03-fase3-frontend.md) (API URL hardcoded no front).

- **P1-9** → vira [B-3](02-fase2-backend.md) (CORS wildcard).
