# Fase 2 — Backend (B-x)

[← Índice](README.md) · Ver também: [04-eixo-seguranca.md](04-eixo-seguranca.md) · [05-eixo-performance.md](05-eixo-performance.md) · [06-eixo-bugs.md](06-eixo-bugs.md)

- **B-1 [P1/CRÍTICO seg]** Execução de Cypher arbitrário anônimo: `/api/cql/execute` (`cql_router.py:8`), `/api/neo4j/query` e `/graph` (`neo4j_router.py:51-73`), `/api/cql-batch/execute-batch`. `MATCH (n) DETACH DELETE n` apaga o grafo; APOC irrestrito amplia. `<<USER_UID>>` interpolado como texto (`cql_router.py:24`) = injeção.
  **Fix:** sessão `READ_ACCESS` + credencial read-only; `user_id` só como parâmetro `$user_id`; guard regex de verbos de escrita. (= [S-1](04-eixo-seguranca.md))

- **B-2 [P1/CRÍTICO seg]** Path traversal: `run_workflow` com validação e lock **comentados** (`app.py:311-317`); `startswith(PROJECTS_ROOT)` fraco em `browse`/`file`/`paginated` (`app.py:838,924,979`) — irmão `projectsX` passa.
  **Fix:** helper `resolve_within(base,*parts)` com `os.path.commonpath`; reativar validação/lock; regex no `project_name`. (= [S-2](04-eixo-seguranca.md))

- **B-3 [alto/seg]** CORS `allow_origins=["*"]` + `allow_credentials=True` (`app.py:66-72`) — inválido e permissivo.
  **Fix:** `ALLOWED_ORIGINS` via env. (= [S-3](04-eixo-seguranca.md))

- **B-4 [alto/perf]** Chamadas NCBI síncronas bloqueiam event loop: `ncbi_download_sequences/…accessions/…search-species` (`app.py:1809,1835,1863`). `/api/ncbi/info` já faz certo com `to_thread` (`ncbi_router.py:52`).
  **Fix:** `await asyncio.to_thread(...)`. (parte de [P-1](05-eixo-performance.md))

- **B-5 [alto/perf]** Bioinformática pesada síncrona no loop: `/api/tree/compare` (`app.py:1440`, `exact_quartet_distance` O(n⁴) `app.py:1251`), `/api/gen_plot` (`app.py:746`, ETE3-Qt), `/api/tree/pattern-analysis` (`app.py:1554`). `treePlot.render_annotated_tree` faz lookup O(folhas²) (`treePlot.py:78`) apesar do comentário "O(1)" (passa lista, não dict).
  **Fix:** `to_thread` nos três + passar `cache["node_index"]` (dict) e `metadata_index.get(name)`. (parte de [P-1](05-eixo-performance.md)/[P-2](05-eixo-performance.md))

- **B-6 [alto/bug]** `except Exception` largo converte `404/403` interno em `500`: `get_node_details` (`app.py:694-705`), `get_paginated_json` (`app.py:929-955`), `search_tree_nodes`, `get_tree_insights`, `get_tree_metadata`.
  **Fix:** `except HTTPException: raise` antes do genérico + logar sem expor. (= [C-2](06-eixo-bugs.md))

- **B-7 [médio/bug]** `set_ncbi_email` cria var local (sem `global`) → serviço nunca atualiza (`app.py:1890-1909`). Dois emails placeholder divergentes (`app.py:61`, `ncbi_router.py:8`).
  **Fix:** `global ncbi_service` + `Entrez.email`; email via `NCBI_EMAIL`. (= [C-3a](06-eixo-bugs.md)) — ✅ **aplicado**, ver [progresso](10-progresso-execucao.md)

- **B-8 [médio/bug]** `cancel_batch` é no-op — `process_cql_batch` nunca lê o flag `cancelled` (`cql_batch_service.py:210,81`); `cql_batch_status` cresce sem limpeza.
  **Fix:** checar flag em `process_block`. (= [C-3b](06-eixo-bugs.md)) — ✅ **aplicado**, ver [progresso](10-progresso-execucao.md)

- **B-9 [médio/bug]** `connect()` engole exceção (`neo4j_services.py:22-31`); `execute_query`/`get_graph_data` retornam `[]`/`{}` quando desconectado (`:40,86`) → 200 OK vazio indistinguível de "sem resultados".
  **Fix:** retry+backoff no connect; `ConnectionError` → `503` nas rotas. (= [C-3c](06-eixo-bugs.md)) — pendente, é o próximo item do P1

- **B-10 [médio/perf+bug]** `_is_duplicate` O(N²·L) e semanticamente errado (compara posições com `zip`, `ncbi_acquisition.py:278-287`).
  **Fix:** dedup exata por hash O(N); similaridade real pertence ao pipeline (CD-HIT/mmseqs).

- **B-11 [médio/perf+mem]** Caches globais sem teto (`metadata_cache`, `json_count_cache` `app.py:55-58`); `cql_batch_status` idem; `psutil.cpu_percent(interval=1)` bloqueia o loop 1s/tick (`app.py:2039`).
  **Fix:** teto LRU; `interval=None` + `asyncio.sleep(1)`.

- **B-12 [médio/arq]** `app.py` monolito 2123 linhas (regras de negócio nas rotas); `download_sequences`/`download_from_accessions` quase idênticas (`ncbi_acquisition.py:41,148`); endpoints de query redundantes (`/api/neo4j/query` vs `/api/cql/execute`).
  **Fix:** ver [07-eixo-arquitetura.md § B](07-eixo-arquitetura.md).

- **Extra:** `stream_workflow_output` busy-wait sem tratar EOF (`app.py:198-273`) → reescrever com 2 tasks concorrentes drenando stdout/stderr. `PatternAnalysisResult` (`app.py:150`) declarado e desalinhado do payload real — nunca usado.
