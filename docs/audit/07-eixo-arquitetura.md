# Aprofundamento — Eixo Arquitetura (estrutural, P4)

[← Índice](README.md) · Estrutural: só depois de P0-P3 saldados. Não confundir com [99-futuro-infra-agnostica.md](99-futuro-infra-agnostica.md), que é posterior ao P4.

## A — Fase 1 infra reprodutível

- `.env.example` versionado (`.env` no gitignore): `NEO4J_PASSWORD`, `NEO4J_URI`/`USERNAME`, `NCBI_EMAIL`, `CORS_ORIGINS`, `ADMIN_TOKEN`.
  **Status:** ✅ `.env.example` criado no P0 (falta `ADMIN_TOKEN`, que só faz sentido junto de S-5).
- `Backend/environment.yml` + `conda-lock` (bioconda: clustalo, mafft, iqtree, fasttree, raxml-ng, mrbayes).
- `Backend/Dockerfile` (micromamba; `ENV QT_QPA_PLATFORM=offscreen`; sem `--reload`).
- `Frontend/Dockerfile` (node:20 build `npm ci` → nginx; `nginx.conf` com SPA fallback + proxy `/api` e `/ws`).
- `docker-compose.yml` full-stack: `depends_on: {neo4j: {condition: service_healthy}}` elimina a race; portas em loopback.
  **Status:** healthcheck + loopback já aplicados no P0 para o serviço Neo4j; falta estender o compose para backend+frontend containerizados.

## B — Backend em camadas (romper `app.py`)

- Layout: `app.py` fino; `config.py` (pydantic-settings `BaseSettings`); `logging_conf.py` (substitui 28 `print`); `routers/{projects,tree,files,neo4j,cql,ncbi}.py`; `services/{metadata_index,tree_compare,pattern_mining,ncbi_acquisition,owid,neo4j_services}.py`.
- DI em vez de singleton global Neo4j (`Depends(get_neo4j)`, `app.state.neo4j`).
- **Extração com golden test ANTES** (snapshot da saída atual de cada endpoint); mover `tree_compare` e `metadata_index` primeiro. Juntar extração + `to_thread` ([P-1](05-eixo-performance.md)) no mesmo movimento.

## C — Frontend modular

- `src/services/http.js` (cliente único com `API_URL` + headers) e módulos por domínio (`projects`, `neo4j`, `tree`, `ncbi`); migrar os 12 arquivos com `grep -rl localhost:8000`.
- Decompor `PhylogeneticTreeViewer`: `utils/newick.js` (parser puro testável), `utils/metadataIndex.js` ([P-4](05-eixo-performance.md)/[F-4](03-fase3-frontend.md)), `hooks/useD3Tree.js` (estrutura vs estilo), `panels/*`.
- Estado: React Query/SWR p/ dados de servidor; estado local p/ UI. Memoizar `metadata` no `AnalysisPage`.

## Referência cruzada

Itens de higiene e monólitos mapeados nas fases: [B-12](02-fase2-backend.md), [F-10](03-fase3-frontend.md).
