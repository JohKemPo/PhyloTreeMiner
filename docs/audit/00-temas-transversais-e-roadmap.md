# 0. Temas transversais e roadmap

[← Índice](README.md)

## As 4 causas-raiz

Todos os achados da auditoria (fases 1-3, eixos S/P/C/A) derivam de quatro problemas estruturais:

1. **Fronteira de configuração inexistente** — segredos/URLs hardcoded nos dois lados (`.env` ausente no backend; `http://localhost:8000` em 12 arquivos no frontend). Causa nº1 de "não roda fora da máquina do autor".
2. **Segurança tratada no cliente sobre backend anônimo** — isolamento por regex de Cypher e validações de path comentadas, sobre CORS `*` + Cypher arbitrário + conexão Neo4j global compartilhada.
3. **Trabalho pesado no lugar errado** — bioinformática síncrona no event loop; lookups quadráticos no render D3.
4. **Higiene** — deps ausentes/fantasma, artefatos versionados, código morto/stub, componentes monolíticos.

## Roadmap priorizado (ordem de execução)

| Prioridade | Itens | Objetivo |
|---|---|---|
| **P0 — agora** | C-1 (deps), P1-2 (submódulo HTTPS), S-3 (CORS + bind loopback) | Torna seguro e executável |
| **P1 — crítico** | S-1 (Cypher read-only + remover connect/UID), S-2 (path traversal + upload), C-3 (no-ops) | Fecha destruição/SSRF/traversal |
| **P2 — alto impacto** | P-1 (to_thread + psutil + stream), P-4 (índice memoizado + leak D3) | Torna rápido/responsivo |
| **P3 — correção** | C-2 (404→500), C-5a/b (quartet/organismo), P-2 (O(N²)), P-3 (LIMIT Neo4j) | Torna correto |
| **P4 — estrutural** | A (Docker full-stack), B (camadas backend), C (frontend modular) | Torna manutenível |
| **Depois** | M-1 (resiliência NCBI), M-3 (features: cache → compare-N → filogeografia) | Agrega valor científico |

Sequência sugerida de PRs:
1. **"hardening + boot"** = P0 + P1
2. **"performance + correção"** = P2 + P3 (anexar medições de P-0)
3. **épico estrutural P4** guiado por golden tests

> Escopo excluído do roadmap por decisão do usuário (2026-07): a fase futura "aplicação agnóstica de infra" (Ports & Adapters, `fsspec`, `parsl`, BYO-infra). Blueprint publicado como artifact; ver [99-futuro-infra-agnostica.md](99-futuro-infra-agnostica.md). Retomar depois do P4.

## Ver também

- Progresso real de execução: [10-progresso-execucao.md](10-progresso-execucao.md)
- Regras que regem toda mudança: [09-regras-refatoracao.md](09-regras-refatoracao.md)
