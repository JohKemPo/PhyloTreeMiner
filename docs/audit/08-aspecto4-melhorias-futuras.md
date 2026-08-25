# Aspecto 4 — Melhorias, Otimizações e Features futuras (M-x)

[← Índice](README.md) · Só depois de P0-P3 saldados (ver [09-regras-refatoracao.md](09-regras-refatoracao.md)).

- **M-1 [resiliência]** `services/resilience.py` com `CircuitBreaker` + `with_retry` (backoff+jitter). NCBI: `Entrez.api_key` opcional; **history server** (`usehistory=y` + `efetch` paginado por WebEnv/retstart) em vez do fetch gigante (`ncbi_acquisition.py:84`); respeitar ~3 req/s. Nominatim → server-side com `User-Agent` + cache persistente.

- **M-2 [cache/async]** Cache de resultado de análise por `sha256(entrada+params)` (compare/pattern/plot determinísticos); fila de jobs p/ downloads longos via WebSocket já existente (`ProgressConnectionManager`); `ProcessPoolExecutor` p/ compare em lote; HTTP caching em endpoints quase-estáticos.

- **M-3 [features, valor×esforço]** Ordenadas por alavancagem científica:
  1. **Cache/persistência de análises** — baixo esforço, reusa M-2.
  2. **Comparação de N árvores** — matriz RF/Quartet + heatmap Recharts, reusa `tree_compare`. *Maior alavancagem científica.*
  3. **Filogeografia funcional** — mapa + timeline. Hoje é stub ([F-9](03-fase3-frontend.md)), mas `get_node_information` já extrai país/região/ano (`app.py:611`). *Maior alavancagem científica.*
  4. Árvore de consenso (DendroPy).
  5. Busca/filtro sobre padrões minerados (reusa `analyze_patterns`).
  6. Relatório exportável.
  7. Diff de execuções (rerun).
  8. Anotação colaborativa de nós.

## Ordem

Features só após P0-P3 saldados. M-1 (resiliência) também só após P0-P3. As duas de maior alavancagem científica — **comparação-N** e **filogeografia** — conectam dados já computados e são as melhores candidatas a destacar na submissão Nature.
