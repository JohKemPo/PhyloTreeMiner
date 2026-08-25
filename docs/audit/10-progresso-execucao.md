# Progresso da execução

[← Índice](README.md) · **Documento vivo** — atualizar a cada lote aplicado/validado. Branch: **`main`**.

Modo de trabalho: [hierarquia de cinco papéis](../automation/09-arquitetura-de-agentes.md) — o Validador **executa** (o ambiente roda o stack completo, [DEC-008](../automation/07-log-de-execucao.md)).

> ⚠️ **Correção de registro (2026-08-19).** As seções P0 e P1 abaixo descrevem trabalho que **nunca chegou a `main`**. Ele existia apenas em `.claude/worktrees/phylotreeminer-audit-ef6b53/`, um diretório órfão que `git worktree list` não conhece. Descoberto pela regra "verificar o portão no código, não no log". O patch foi **portado em 2026-08-19** com teste que o prova ([DEC-012](../automation/07-log-de-execucao.md)); as tabelas abaixo passam a valer para `main` a partir dessa data — antes dela, não valiam.

## M0 — Fundação verificável — ✅ CONCLUÍDO (2026-08-19)

Primeiro marco da [arquitetura de marcos](../automation/10-marcos-e-metas.md). Equivale a W0.

| Lote | Entrega | Evidência |
|---|---|---|
| M0.1 | 5 papéis em `.claude/agents/` + 7 skills, incluindo `oracle-check` | `ls .claude/agents/ptm-*.md` → 5 |
| M0.2 | `pytest` + `httpx.ASGITransport` (sem lifespan, sem Neo4j nos testes); `vitest` + jsdom + RTL; `Makefile` com 12 alvos | `make test` |
| M0.3 | 6 golden snapshots (~17 KB), estáveis entre sementes de hash | `pytest tests/golden` |
| M0.4 | 78 testes de backend, 8 de frontend | ver abaixo |
| M0.5 | CI GitHub Actions: backend + frontend, catraca de lint, build | `.github/workflows/ci.yml` |
| M0.6 | Baseline P-0 medido, incluindo bloqueio do event loop | [log §Medições](../automation/07-log-de-execucao.md) |
| M0.7 | Mapa de dados LGPD | [`../governanca/mapa-de-dados.md`](../governanca/mapa-de-dados.md) |
| M0.8 | Quadro de decisões metodológicas (DM-1..DM-12) | [`../science/06-decisoes-metodologicas.md`](../science/06-decisoes-metodologicas.md) |
| M0.9 | Modelo real do grafo, por introspecção | [`../data-model/neo4j.md`](../data-model/neo4j.md) |

**Portão de M0 — todos verdes:**

```
pytest Backend/tests            78 passed, 5 xfailed
vitest --run                     8 passed
npm run lint:ratchet             erros 69/69  avisos 27/27
npm run build                    ✓ built
```

Os `xfail(strict=True)` rastreiam defeitos conhecidos: quando forem corrigidos, os testes **passam a falhar** e forçam a atualização. Em 2026-08-21 resta **1** (D15) — os 4 de D12a-d caíram com M1.7 ([DEC-018](../automation/07-log-de-execucao.md)).

### Correções aplicadas em M0 (além do harness)

| Item | Mudança | Arquivo |
|---|---|---|
| `S-2` | `resolve_within` com guarda de `ValueError`; 5 pontos de `startswith` fraco eliminados | `app.py` |
| `S-2` / `B-2` | `run_workflow`: regex + `resolve_within` + `isdir` + **lock de concorrência reativado** (estava comentado) | `app.py:313` |
| `S-2` | Filtro ZIP sem o `''` que casava qualquer nome; upload com `basename` + regex | `app.py` |
| `S-2` residual (era M4) | `rerun_workflow` e `can_rerun_project` migrados | `app.py:378,423` |
| `S-3` | CORS por `CORS_ORIGINS`, sem wildcard com credenciais | `app.py` |
| `C-2` | **17 blocos** `try/except` deixaram de converter `400`/`403`/`404` em `500` | `app.py` |
| `C-3a` | `set_ncbi_email` sem o `try/except` que engolia o `400`; atributo morto removido | `app.py:1895` |
| `P1-3` | Bind `127.0.0.1`, `NEO4J_PASSWORD` obrigatória, healthcheck, `mem_limit` | `docker-compose.yml` |
| `S-1` parcial | **APOC removido** — não usado por nenhuma consulta; dava leitura/escrita no host | `docker-compose.yml` |
| `P1-1` | `python-dotenv` e `psutil` declarados (eram importados sem estar em requirements) | `requirements.txt` |
| `C-1` / `F-1` | `uuid` (dependência fantasma) → `crypto.randomUUID()`; import morto `@mui/system` removido | `UserContext.jsx`, `projectsTableView.jsx` |
| `A` | `.env.example` criado | raiz |

### Defeitos novos descobertos pelo harness

| # | O quê | Severidade |
|---|---|---|
| [D13](../science/02-defeitos-que-alteram-resultado.md#d13) | `TaxLabels` truncados em 10 caracteres: **24 de 45 pares de árvores não comparam**; 11 terminais sem metadado, incluindo `NC_001611` | Alta |
| [D14](../science/02-defeitos-que-alteram-resultado.md#d14) | Saída da API não é reprodutível entre execuções | Alta |
| [D15](../science/02-defeitos-que-alteram-resultado.md#d15) | API devolve caminho absoluto e nome de usuário de terceiro | Média |
| [D16](../science/02-defeitos-que-alteram-resultado.md#d16) | `REGION_MAPPING` cobre 14 países de Zika; **97% dos táxons de VARV-49 → `Unknown`** | Alta |

---

## M1 — Verdade dos números — ✅ **CONCLUÍDO** (2026-08-24, 8 de 8 lotes)

Trilha T2 (`Backend/`) mais, desde [DEC-020](../automation/07-log-de-execucao.md), a trilha T1 (`BioComp_UFF/**`), com write-lock e histórico separados. Detalhe completo e tabelas de diff: [DEC-016](../automation/07-log-de-execucao.md), [DEC-017](../automation/07-log-de-execucao.md), [DEC-018](../automation/07-log-de-execucao.md) e [DEC-019](../automation/07-log-de-execucao.md).

| Item | Mudança | Estado |
|---|---|---|
| [D7](../science/02-defeitos-que-alteram-resultado.md#d7) | Payload declara `discarded_by_size`/`discarded_sizes`/`patterns_in_source`; UI avisa | ✅ concluído |
| [D8](../science/02-defeitos-que-alteram-resultado.md#d8) | `tree_coverage` um-para-muitos (`merge_hash_to_subtree`); VARV-6 de 5→10 árvores | ✅ concluído |
| [D9](../science/02-defeitos-que-alteram-resultado.md#d9) | `unique_signatures_count`/`quasi_invariant_count` (falsos/duplicados) removidos | ✅ concluído |
| [D12](../science/02-defeitos-que-alteram-resultado.md#d12) a-d | Ano/país deixam de ser fabricados do `strain`; fallback `organism`→`source` corrigido; hospedeiro normalizado | ✅ concluído (DEC-018) — revelou que 5 de 6 registros de VARV-6 **não têm** `geo_loc_name`: os países que apareciam eram do regex |
| [D16](../science/02-defeitos-que-alteram-resultado.md#d16) | Fonte única país→região (`Backend/src/data/regions.json`, **136 países + 52 aliases** históricos) substitui `REGION_MAPPING` (14 países, Zika) | ✅ concluído (DEC-018) — **0 não mapeados** nos 68 países dos 18 projetos; cobertura 0→100% (VARV-49), 40→100% (ZIKV-21), 66,8→100% (ZIKV-480) |
| [D13](../science/02-defeitos-que-alteram-resultado.md#d13) metade backend | `iter_metadata_nodes` lia só a primeira árvore do `metadata.json` e descartava o registro íntegro do GenBank; `/api/tree/compare` impunha o namespace da primeira árvore à segunda | ✅ concluído (DEC-019) — 45/45 pares de VARV-6 comparam (era 21/45); 6/6 táxons com organismo (era 3/6); `NC_008030` recupera `Zimbabwe`/`2001`/*Nile crocodile* |
| [D4](../science/02-defeitos-que-alteram-resultado.md#d4) | `result_fpmax['support'] = support` sobrescrevia o suporte real com o limiar da varredura; CSV passa a ter `support` (real), `min_support_threshold`, `max_support_threshold` e `n_trees`, uma linha por itemset | ✅ concluído (DEC-021) — Δ = 0 contra `audit_variola.py` em **37/37 itemsets**; itemsets exibidos como frágeis **e** robustos: 2 → 0 (VARV-49, VARV-52, VARV-121), 1 → 0 (VARV-6). **Primeiro lote no submódulo**, sob DEC-020 |
| [D5](../science/02-defeitos-que-alteram-resultado.md#d5) | Identidade de clado de 16 bits e dependente da ordem de travessia substituída pela canônica (`canonical_item_id`, 52 bits, invariante); rótulos normalizados; valor legado preservado em `List_terminals_hash_legacy` | ✅ concluído (DEC-022) — itens distintos 155→101 (VARV-49), 194→120, 405→270, 20→11, batendo com o oráculo; maior padrão suportado vai de **1 clado a 6/8** para **16 a 8/8** |
| [D3](../science/02-defeitos-que-alteram-resultado.md#d3) | `clade_sets` guarda bipartição canônica; denominador `2(n−3)`; RF indefinida devolve `None`; `bipartition_counts()` reporta `\|B(T)\|` | ✅ concluído (DEC-023) — **137 pares, 0 divergências** contra dendropy; VARV-6 de 0 para 1 clado universal; discordância entre três métodos de topologia idêntica de 75% para 0% |

**Evidência:** `pytest Backend/tests` → **180 passed, 1 xfailed** (2026-08-24, com M1.4–M1.8; era 153 passed em 2026-08-21). No submódulo: `python -m unittest workflow.tests.test_subtree_mining` → 10 OK; `workflow.tests.test_stability` → 16 OK. O único `xfail` restante é D15 (vazamento de caminho absoluto); os 4 de D12 e os de D16 deixaram de ser defeitos conhecidos e viraram testes comuns.

**Achado aberto por M1.7 e fechado em M1.8:** [D13](../science/02-defeitos-que-alteram-resultado.md#d13) descartava metadado real. A causa não era a deduplicação por `newick`, e sim `only_first=True`: lia-se **uma árvore só**, e em VARV-6 a primeira é de RAxML, com 3 dos 6 rótulos truncados e sem `features`. Corrigido em [DEC-019](../automation/07-log-de-execucao.md). A metade do pipeline — que grava o rótulo truncado — continua bloqueada pela decisão 6.

## M2 — Baseline replicado — em andamento (6 de 7 ✅ · falta M2.1 e a reexecução)

Trilha T1 (`BioComp_UFF/**`) e T3. Destravado por [DEC-024](../automation/07-log-de-execucao.md); nenhuma decisão pendente bloqueia.

| Item | Mudança | Estado |
|---|---|---|
| M2.5 · [D11](../science/02-defeitos-que-alteram-resultado.md#d11) + [D17](../science/02-defeitos-que-alteram-resultado.md#d17) | Manifesto de execução: commit dos dois repositórios, versões, ambiente, semente e paralelização fixas, SHA-256 de entradas e saídas | ✅ concluído (DEC-027) e **validado por execução real** (DEC-030): 274 saídas com hash |
| M2.3 · [D3](../science/02-defeitos-que-alteram-resultado.md#d3) | `rooting.py`: enraizamento explícito por grupo externo declarado, recusa quando não monofilético, relatório de todas as árvores | ✅ concluído (DEC-034) — VARV-49: 6/8; VARV-6: 6/10. As recusas são os UPGMA, e em VARV-6 também os IQ-TREE |
| M2.2 · [D6](../science/02-defeitos-que-alteram-resultado.md#d6) | `taxonomy.py`: filtro declarado na consulta e verificação pós-download offline, com três estados (dentro / fora / sem linhagem) | ✅ concluído (DEC-035) — VARV-49 limpo 49/49; VARV-52, VARV-121 e VARV-6 com 1, 4 e 1 táxons fora do gênero |
| M2.4 · [D1](../science/02-defeitos-que-alteram-resultado.md#d1) | Substituição de alinhador nunca silenciosa; a saída leva o nome do que rodou | ✅ concluído (DEC-037) |
| M2.6 | Dataset de referência versionado — VARV-49, com proveniência e manifesto | ✅ concluído (DEC-042) |
| M2.7 | Portão científico em dois níveis, com três códigos de saída | ✅ concluído (DEC-042) — devolve **2**: invariante 3/3, falta `mafft_raxml` |
| M2.1 | aquisição parametrizada | ○ aberto |

**Evidência:** `pytest Backend/tests` → **194 passed, 1 xfailed**; submódulo → **96 tests, OK**; oráculo dendropy no conjunto de validação → 91 pares, 0 divergências.

## M7 — Heurísticas de inferência auditadas — não iniciado

Aberto em 2026-08-25 ([DEC-033](../automation/07-log-de-execucao.md)). Sete lotes: ficha de chamada por método, suporte de ramo simétrico, modelo declarado, MrBayes correto, parcimônia viável ou declarada inviável, falha nunca silenciosa, curva de custo medida. Paralelo ao caminho crítico.

## P0 — Hardening + boot — ✅ portado para `main` em 2026-08-19

| Item | Mudança | Arquivo |
|---|---|---|
| [C-1](06-eixo-bugs.md) / [P1-1](01-fase1-infraestrutura.md) | `python-dotenv==1.0.1`, `psutil==5.9.8` adicionados | `requirements.txt` |
| [C-1](06-eixo-bugs.md) / [F-1](03-fase3-frontend.md) | `uuid` → `crypto.randomUUID()` | `Frontend/phylotreeminer/src/contexts/UserContext.jsx` |
| [P1-2](01-fase1-infraestrutura.md) | URL do submódulo: SSH → HTTPS | `.gitmodules` |
| [S-3](04-eixo-seguranca.md) / [B-3](02-fase2-backend.md) | CORS via `CORS_ORIGINS` (env), remove wildcard | `Backend/src/app.py` |
| [P1-3](01-fase1-infraestrutura.md) / [S-3](04-eixo-seguranca.md) | Bind loopback (`127.0.0.1:7474/7687`), `NEO4J_AUTH` obrigatório, healthcheck cypher-shell, `mem_limit: 7g`, `restart: unless-stopped`, `NEO4J_PLUGINS`, remove `version`/`apparmor` | `docker-compose.yml` (reescrita completa) |
| [P1-6](01-fase1-infraestrutura.md) | Ignorar artefatos temporários | `.gitignore` (+`Backend/src/temp_ncbi/`) |
| [A](07-eixo-arquitetura.md) | Template de env criado | `.env.example` (novo) |

## P1 — Crítico (fecha destruição/SSRF/traversal) — em andamento

### Batch 1 — ✅ aplicado e revisado (syntax OK, 5 call sites conferidos)

| Item | Mudança | Arquivo |
|---|---|---|
| [S-2](04-eixo-seguranca.md) | Helper `resolve_within(base, *parts)` com `os.path.commonpath`, levanta 403 se sair da base | `Backend/src/app.py:39` |
| [S-2](04-eixo-seguranca.md) / [B-2](02-fase2-backend.md) | `run_workflow`: validação regex `^[A-Za-z0-9_-]+$` (400), `resolve_within` (403), isdir (404), lock de concorrência (409) reativados | `app.py:~322` |
| [S-2](04-eixo-seguranca.md) | `browse_path`, `get_paginated_json`, `get_file_content`: `startswith` fraco → `resolve_within` | `app.py:846,929,982` |
| [S-2](04-eixo-seguranca.md) | Upload: removida stray `''` que casava qualquer filename no filtro ZIP; `os.path.basename` + regex + `resolve_within(target_dir, safe_name)` | `app.py:1951-1954` |
| [C-3a](06-eixo-bugs.md) / [B-7](02-fase2-backend.md) | `set_ncbi_email`: removido shadow local, agora atualiza `Entrez.email` de fato | `app.py` |
| [C-3b](06-eixo-bugs.md) / [B-8](02-fase2-backend.md) | `process_block` aborta cedo se `cql_batch_status[...].status == "cancelled"` | `Backend/src/services/cql_batch_service.py:98` |

**Validação sugerida (WSL, com o backend de pé):**
```bash
cd Backend && python -c "import src.app"
curl -s -o /dev/null -w "%{http_code}\n" "localhost:8000/browse?path=../../etc"          # esperado: 403
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:8000/projects/..%2F..%2Fx/run \
  -H "Content-Type: application/json" -d '{"configs":{}}'                                 # esperado: 400
```
Teste unitário sugerido para `resolve_within`: caminho dentro (ok) / fora (403) / irmão com prefixo (`projects_x` vs `projects`, deve dar 403).

**Residual conhecido (não bloqueador, endereçar na batch 2):** `rerun_workflow` e `can_rerun_project` ainda usam o `startswith` fraco (`app.py:~367,412`). `rerun_workflow` executa subprocess → é caminho de execução, prioridade alta. `can_rerun_project` só retorna bool → baixo risco.

**Nota de portabilidade:** `os.path.commonpath` pode levantar `ValueError` em caminhos cross-drive no Windows — irrelevante no deploy Linux/WSL alvo, mas caberia um `try/except` se algum dia rodar em Windows nativo.

### Batch 2 — pendente (próximo passo)

- **[C-3c](06-eixo-bugs.md) / [B-9](02-fase2-backend.md)** — Resiliência de conexão Neo4j: retry+backoff em `connect()` (`neo4j_services.py`); `execute_query`/`get_graph_data` levantam `ConnectionError` em vez de retornar `[]`/`{}` silenciosamente quando desconectado; mapear `ConnectionError` → HTTP `503` em `cql_router.py`/`neo4j_router.py`.
- Fechar o residual de `rerun_workflow`/`can_rerun_project` com `resolve_within` (ver acima).

⚠️ **Mudança de contrato:** Neo4j fora do ar passa a devolver `503` em vez de `200 []`. Frontend hoje trata `!response.ok` como erro — confirmar que a UX de "Neo4j desconectado" continua boa após a mudança.

## P2 — Alto impacto — não iniciado

- [P-1](05-eixo-performance.md): `to_thread` em NCBI/compare/plot/pattern, `psutil interval=None`, reescrita de `stream_workflow_output`.
- [P-4](05-eixo-performance.md): índice memoizado em `PhylogeneticTreeViewer` ([F-4](03-fase3-frontend.md)), fix do leak de zoom D3 ([F-5](03-fase3-frontend.md)).

## P3 — Correção — não iniciado

- ~~[C-2](06-eixo-bugs.md) (padrão `except HTTPException: raise`)~~ **✅ concluído em M0** (DEC-013 — 17 blocos corrigidos). [C-5b](06-eixo-bugs.md) (fallback organismo) e [C-5d](06-eixo-bugs.md) (tabelas país/região divergentes) **✅ concluídos em M1.7** (DEC-018). Restam: [P-2](05-eixo-performance.md) (O(N²) em `get_paginated_json`), [P-3](05-eixo-performance.md) (enforcement de `LIMIT` no Neo4j).

## P4 — Estrutural — não iniciado

- [A](07-eixo-arquitetura.md) (Docker full-stack backend+frontend), [B](07-eixo-arquitetura.md) (backend em camadas), [C](07-eixo-arquitetura.md) (frontend modular).

## Decisões registradas

- **S-1 (Cypher read-only) e F-3 (remoção de `injectUidFilter`/`connect`) adiados até S-5 (autenticação) existir** — decisão do usuário. Motivo: tornar todo Cypher read-only quebraria o ingest em lote (`/api/cql-batch` executa `CREATE`/`MERGE` vindo do pipeline).
- **Fase "infra agnóstica" excluída do roadmap P0-P4** — ver [99-futuro-infra-agnostica.md](99-futuro-infra-agnostica.md), retomar depois do P4.
- Nenhum commit foi feito até agora — política: só commitar quando o usuário pedir explicitamente.
