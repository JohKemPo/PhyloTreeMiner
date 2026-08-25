# Aprofundamento — Eixo Bugs / Correctness (C-x)

[← Índice](README.md)

- **C-1 [bloqueador]** Deps: `python-dotenv`+`psutil` (`requirements.txt`), `uuid`→`crypto.randomUUID()`.
  **Status:** ✅ **aplicado e validado (WSL)** — P0. Ver [progresso](10-progresso-execucao.md).

- **C-2 [alto/contrato]** `except Exception` engole status (404→500). Padrão: `except HTTPException: raise` + log. (= [B-6](02-fase2-backend.md))
  **Status:** pendente — P3 do roadmap.

- **C-3 [alto/enganoso]** No-ops:
  - **3a** `set_ncbi_email` não atualiza o serviço global (= [B-7](02-fase2-backend.md)) — ✅ **aplicado**
  - **3b** `cancel_batch` não cancela nada (= [B-8](02-fase2-backend.md)) — ✅ **aplicado**
  - **3c** conexão Neo4j silenciosa retorna 200 vazio (= [B-9](02-fase2-backend.md)) — pendente, próximo item do P1 (retry+backoff no `connect()`, `ConnectionError`→503)

- **C-4 [médio/front]**
  - **4a** `heme`→`theme` (`App.jsx:79`)
  - **4b** `errorElement: <NotFoundPage/>` (`main.jsx`)
  - **4c** header `X-User-ID` em `executeGraphQuery` (= [F-8](03-fase3-frontend.md))
  - **4d** notificação duplicada/leak (= [F-6](03-fase3-frontend.md))
  - **4e** `colorMap` recriado por render + `c.index` sempre `undefined` (dedup nunca funciona) → `useRef` + guardar `{color,index}` (`PhylogeneticTreeViewer.jsx:779-808`)

- **C-5 [médio/domínio — resultados errados]** ⚠️ **Rigor científico é inegociável neste grupo** — validar contra o artigo publicado / dados de referência antes de alterar qualquer item.
  - **5a** quartet retorna `-1` silencioso p/ árvores não-binárias → `check_consistency` sempre "Inconsistent" (`app.py:1240,1428`); retornar `None`.
  - **5b** `lineage = annotations.get("organism",'Unknown') or annotations.get("source",'Unknown')` — fallback morto (default truthy) → `get("organism") or get("source") or 'Unknown'` (`app.py:628`).
  - **5c** `iter_metadata_nodes(only_first=True)` default + `break` processa só a 1ª árvore (`app.py:573-595`) — **confirmar intenção com o usuário antes de mudar**.
  - **5d** 3 tabelas país/região divergentes: front `COUNTRY_DICTIONARY` ~44 (`useGeocoding.jsx:3`), back `REGION_MAPPING` ~14 (`treePlot.py:4`), `color_map` 6 regiões (`treePlot.py:58`) → fonte única.
  - **5e** `parse_cql_blocks` quebra em `;` dentro de dados (`cql_batch_service.py:164`) → tokenizer que respeita aspas.

- **Menores:** `else` de `progress_match` duplica broadcast (`app.py:248`); `label.length`/`substring` assume string (`GraphVisualization.jsx:260`); `search_tree_nodes` docstring x retorno; typo `heigh` (`GraphVisualization.jsx:566`).
