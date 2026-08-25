# Aprofundamento — Eixo Segurança (S-x)

[← Índice](README.md) · Atacado primeiro entre os 4 eixos, por decisão do usuário.

- **S-0 — Modelo de ameaça.** Atacante = visitante web anônimo (demo público); sem auth em nenhuma rota (`X-User-ID` é auto-declarado); ativos = Neo4j, filesystem `projects`/`data`, execução de subprocess, rede interna (via `/connect`). Amplificador: CORS `*`.

- **S-1 [CRÍTICO]** Cypher arbitrário ([B-1](02-fase2-backend.md)) + isolamento fantasma (`<<USER_UID>>`/`injectUidFilter`) + `/api/neo4j/connect` reconfigura driver global (SSRF, `neo4j_services.py:150`).
  **Fix:** read-only + parâmetro + remover/proteger connect (token admin).
  **Status:** adiado até autenticação existir ([S-5](#s-5-defesa-em-profundidade)) — decisão do usuário, pois tornar todo Cypher read-only quebraria o ingest em lote (`/api/cql-batch` escreve `CREATE`/`MERGE` do pipeline). Junto com [F-3](03-fase3-frontend.md).

- **S-2 [ALTO]** Path traversal ([B-2](02-fase2-backend.md)) + upload com filename do cliente sem sanitizar (`app.py:1958-1962`, `filename="../.."` sobrescreve fora de `data/`) + bug `.endswith((...,''))` casa qualquer nome (`app.py:1943`).
  **Fix:** `resolve_within` + `os.path.basename` + regex no filename.
  **Status:** ✅ **aplicado e revisado** (P1 batch 1) — ver [progresso](10-progresso-execucao.md).

- **S-3 [ALTO/amplificador]** CORS `*` + credentials ([B-3](02-fase2-backend.md)) + Neo4j em `0.0.0.0` + uvicorn `--host 0.0.0.0 --reload` + WebSockets sem checagem de origem (`app.py:2003,2059`).
  **Fix:** origens explícitas; bind loopback + proxy; validar `origin` no WS.
  **Status:** ✅ **aplicado no P0** (CORS via env + docker-compose loopback) — checagem de origem no WS ainda pendente.

- **S-4 [MÉDIO]** Info disclosure: `detail=str(e)` vaza paths/stack (dezenas de handlers); `/api/neo4j/status` expõe uri/username sem auth; `print` como logging.
  **Fix:** mensagens genéricas + logging estruturado.

- **S-5 [defesa em profundidade]** Ausentes: autenticação (rotas de escrita: run/upload/connect), rate limiting (`slowapi`), limite de tamanho de upload (`file.read()` em memória), checagem de origem WS, `.env.example`, APOC restrito, lock/timeout de workflow.
  **Maior alavancagem: autenticação nas rotas de escrita** — destrava S-1 e F-3.

## Ordem de mitigação

S-3 → S-1 → S-2 → S-4 → S-5

> Nota de execução real: S-3 e parte de S-2 foram resolvidos no P0/P1 antes de S-1, pois S-1 depende de S-5 (auth) para não quebrar o ingest em lote. Ver [progresso](10-progresso-execucao.md) para o estado atual item a item.
