# PhyloTreeMiner — Biblioteca da Auditoria Técnica

> **Este diretório diz *o que* está errado e *por quê*.** Quem executa, em que ordem, com que prova e sob quais limites está em [`../automation/`](../automation/README.md) (plano em ondas, diretrizes, rigor científico, governança LGPD) e [`../agents/`](../agents/README.md) (um contrato por subagente). Comece por [`../automation/README.md`](../automation/README.md) se o seu objetivo é *executar*.

Auditoria ponta a ponta (infraestrutura, backend, frontend, domínio científico) conduzida em 2026-07 como base de engenharia para evoluir o PhyloTreeMiner rumo a uma publicação de maior impacto (submissão Nature — "computação para o bem da saúde pública").

Metodologia: diagnóstico → hipóteses → solução com trade-offs → passos → validação → riscos, para cada achado, sempre com `arquivo:linha`. Dividida em 3 fases (Infra, Backend, Frontend) e depois aprofundada em 4 eixos transversais (Segurança, Performance, Bugs, Arquitetura) + 1 aspecto de melhorias/features futuras.

## Índice

| Documento | Conteúdo |
|---|---|
| [00-temas-transversais-e-roadmap.md](00-temas-transversais-e-roadmap.md) | As 4 causas-raiz do projeto + roadmap priorizado P0→P4 |
| [01-fase1-infraestrutura.md](01-fase1-infraestrutura.md) | Fase 1 — itens P1-1 a P1-9 (config, Docker, deps, scripts) |
| [02-fase2-backend.md](02-fase2-backend.md) | Fase 2 — itens B-1 a B-12 (FastAPI, Neo4j, serviços) |
| [03-fase3-frontend.md](03-fase3-frontend.md) | Fase 3 — itens F-1 a F-10 (React, D3, vis-network, Leaflet) |
| [04-eixo-seguranca.md](04-eixo-seguranca.md) | Aprofundamento S-0 a S-5 — modelo de ameaça e ordem de mitigação |
| [05-eixo-performance.md](05-eixo-performance.md) | Aprofundamento P-0 a P-5 — event loop, complexidade, caches |
| [06-eixo-bugs.md](06-eixo-bugs.md) | Aprofundamento C-1 a C-5 — no-ops, bugs de contrato, bugs de domínio |
| [07-eixo-arquitetura.md](07-eixo-arquitetura.md) | Aprofundamento estrutural A/B/C — Docker full-stack, camadas backend, frontend modular |
| [08-aspecto4-melhorias-futuras.md](08-aspecto4-melhorias-futuras.md) | Aspecto 4 — M-1 a M-3: resiliência, cache/async, features científicas |
| [09-regras-refatoracao.md](09-regras-refatoracao.md) | Regras que guiam toda a execução (strangler-fig, golden tests, domínio sagrado) |
| [10-progresso-execucao.md](10-progresso-execucao.md) | **Log vivo** — o que já foi aplicado, revisado e validado, por prioridade |
| [99-futuro-infra-agnostica.md](99-futuro-infra-agnostica.md) | Fase futura (fora do roadmap P0-P4): Ports & Adapters, `fsspec`/`parsl`, BYO-infra |

## Como usar

0. **Se o seu objetivo é executar**, o ponto de entrada é [`../automation/README.md`](../automation/README.md) — as ondas W0→W7, os gates e os contratos dos subagentes. Este diretório é o diagnóstico que aquele plano consome.
1. **Antes de qualquer mudança de refatoração**, consulte o eixo/fase relevante para reconstituir diagnóstico, trade-offs e riscos já mapeados — não é para redescobrir o que já foi analisado.
2. A ordem de execução vive em [00-temas-transversais-e-roadmap.md](00-temas-transversais-e-roadmap.md) — **P0 → P1 → P2 → P3 → P4 → (depois) M-3**.
3. [10-progresso-execucao.md](10-progresso-execucao.md) é o único documento que muda com frequência; os demais são o registro estável da auditoria original.
4. Itens marcados **C-5** (domínio científico: quartet distance, extração de organismo, tabelas de país/região, `only_first`) mudam **resultados** — nunca alterar sem validar contra o artigo publicado / dados de referência. Ver [09-regras-refatoracao.md](09-regras-refatoracao.md).
5. Modelo de execução preferido para escrever código da refatoração: **fable**. Orquestração e revisão: **opus**. Validação do stack rodando: usuário, em WSL/Linux.

## Numeração dos itens

- **P1-x** — Fase 1 (Infraestrutura)
- **B-x** — Fase 2 (Backend)
- **F-x** — Fase 3 (Frontend)
- **S-x** — Eixo Segurança
- **P-x** — Eixo Performance (não confundir com P1-x da Fase 1; `P-x` sempre aparece no contexto "Performance")
- **C-x** — Eixo Bugs (Correctness)
- **A / B / C** (seção Arquitetura) — Infra reprodutível / Backend em camadas / Frontend modular
- **M-x** — Aspecto 4 (Melhorias/Otimizações/Features)

Muitos itens são referenciados por mais de um eixo (ex.: path traversal é `P1-3`≈`B-2`=`S-2`) — os documentos linkam a equivalência sempre que existe.
