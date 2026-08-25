# Aprofundamento — Eixo Performance (P-x)

[← Índice](README.md)

> Nota de nomenclatura: `P-x` aqui refere-se ao eixo Performance, distinto de `P1-x` da Fase 1 (Infraestrutura) e de `P0`/`P1`/`P2`.../`P4` do roadmap de prioridades.

- **P-0 — Método de medição** (obrigatório antes/depois de qualquer mudança deste eixo): latência de endpoint trivial (`/projects`) durante operação pesada (NCBI/compare) prova bloqueio de loop; `cProfile`/`perf_counter` nos blocos CPU; React DevTools Profiler + `performance.mark` no `renderTree`; `getEventListeners(svg)` p/ leak; `PROFILE`/`EXPLAIN` no Neo4j.

- **P-1 [causa-raiz A]** Bloqueio de event loop: [B-4](02-fase2-backend.md) (NCBI), [B-5](02-fase2-backend.md) (compare/plot/pattern), `psutil interval=1` (`app.py:2039`), `stream_workflow_output` busy-wait (`app.py:198`).
  **Fix:** `to_thread` (CPU médio/I/O), `ProcessPoolExecutor` só se medição exigir; `psutil interval=None` + sleep; stream com 2 tasks + EOF.
  **Status:** próximo grande item — P2 do roadmap.

- **P-2 [causa-raiz B]** Complexidade: `get_paginated_json` re-parseia do início a cada request O(index)→O(N²) (`app.py:914-955`, usar offset index/cursor); `_is_duplicate` O(N²) ([B-10](02-fase2-backend.md)); `exact_quartet_distance` O(n⁴) (cutoff n≤25 ok, mover p/ thread); `treePlot` O(folhas²) ([B-5](02-fase2-backend.md)).

- **P-3 [médio-alto]** Neo4j: `get_graph_data` sem enforcement de `LIMIT` → OOM em query aberta (`neo4j_services.py:77`); batch sequencial sessão-por-bloco (`cql_batch_service.py:153`); faltam índices (`uid`,`q.key`) — checar com `PROFILE`; heap sem `mem_limit`.
  **Fix:** exigir `LIMIT` explícito no grafo; transação por lote; índices.
  **Status:** `mem_limit` do heap já resolvido no P0 (docker-compose); enforcement de `LIMIT` e índices pendentes.

- **P-4 [alto/UX]** Frontend: índice memoizado ([F-4](03-fase3-frontend.md)); D3 split estrutura/estilo + leak zoom ([F-5](03-fase3-frontend.md)); vis-network destrói/recria `Network` a cada `graphData` com stabilization 100 iters (`GraphVisualization.jsx:200-312`) → update incremental + `physics:false` pós-estabilização; React Query p/ dados compartilhados (elimina refetch dos 62 useEffect).
  **Status:** próximo grande item — P2 do roadmap, junto com P-1.

- **P-5 [médio]** Caches sem teto ([B-11](02-fase2-backend.md)); `/api/gen_plot` cacheia PNG mas não invalida por `mtime` (`app.py:781`); geocoding server-side persistente; HTTP caching (`ETag`/`Cache-Control`) em `/projects`, `/dataFolders`, `/predefined-queries`.

## Ordem de mitigação

P-1 → P-4.1/4.2 → P-2 → P-3 → P-5
