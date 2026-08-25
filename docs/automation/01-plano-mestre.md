# Plano mestre — de protótipo a artefato publicável

[← Automação](README.md)

## 1. Objetivo

Transformar o PhyloTreeMiner em uma ferramenta que **(a)** roda de forma reprodutível na máquina de terceiros, **(b)** produz resultados filogenéticos verificáveis e defensáveis, **(c)** trata dados de vigilância genômica com governança adequada, e **(d)** possa ser citada como artefato de software em uma submissão de alto impacto.

Não é um objetivo estético. Cada uma das quatro condições corresponde a um motivo real de rejeição de artigo ou de artefato:

| Condição | Se falhar |
|---|---|
| Reprodutibilidade | Revisor não consegue rodar → *code availability* insuficiente |
| Correção científica | Números do artigo derivam de bug (ex.: quartet retornando `-1` silencioso, `C-5a`) → retratação |
| Governança de dados | Demo público aceitando upload sem base legal nem retenção → problema ético/jurídico, não só técnico |
| Engenharia | Ferramenta insegura/lenta não é adotada; sem adoção não há relevância |

## 2. Definição de sucesso (verificável)

Um observador externo, com acesso apenas ao repositório, deve conseguir:

1. `git clone --recursive` + **um comando** → stack completo de pé (`docker compose up`), sem editar código.
2. `pytest` + `npm test` → verde, cobrindo os endpoints de análise e o núcleo científico.
3. Rodar um **dataset de referência versionado** e obter exatamente os números publicados (tolerância declarada).
4. Ler quais dados a ferramenta trata, com que base legal e por quanto tempo os retém.
5. Reproduzir cada figura/tabela do artigo a partir de um script + hash de dados + commit.

Estado hoje: **0 de 5**. `docker-compose.yml` só sobe o Neo4j; não há testes; não há dataset de referência; não há política de dados; não há manifesto de análise.

## 3. Ondas de execução

Cada onda é: **um escopo fechado → um conjunto de agentes → um gate verificável → um PR**. Não se inicia a onda N+1 antes do gate de N (as exceções estão marcadas).

### W0 — Bootstrap de verificação  🔒 *pré-requisito de W2+*

**Por que primeiro:** as regras `golden test antes de mover` e `medir antes/depois` (ver [09-regras-refatoracao](../audit/09-regras-refatoracao.md)) hoje são inexequíveis — não há harness. Refatorar `app.py` (82 KB, 2100+ linhas) sem caracterização é aposta, não engenharia.

| Agentes | Escopo |
|---|---|
| [A7 Qualidade & Testes](../agents/07-qualidade-e-testes.md) (líder) | `pytest` + `httpx.AsyncClient` no backend; `vitest` no frontend; golden snapshots de `compare`, `pattern-analysis`, `gen_plot`, `metadata`, `paginated`; **testes de regressão retroativos** para o que P0/P1-batch1 já mudou (`resolve_within`, sanitização de upload, flag de cancelamento, `set_ncbi_email`) |
| [A1 Infra & DevEx](../agents/01-infra-devex.md) | CI mínima (GitHub Actions: lint + pytest + build do front); `Makefile`/scripts de verificação; fixture de Neo4j efêmero |
| [A4 Performance](../agents/04-performance.md) | Baseline P-0 registrado (latência de `/projects` sob carga pesada, perfis de CPU dos blocos quentes) |
| [A8 Dados & Governança](../agents/08-dados-e-governanca.md) | **Mapa de dados** inicial (que dado pessoal existe, onde) — gate para snapshots de teste não conterem dado real identificável |
| [A11 Bioinformática](../agents/11-bioinformatica-inferencia.md) | **Quadro de decisões metodológicas** do pipeline (ferramenta, versão, parâmetros, alternativas) — define o conteúdo biológico do dataset de referência |
| [A12 Neo4j](../agents/12-neo4j-grafo.md) | Introspecção e documentação do **modelo de dados real** do grafo (labels, relacionamentos, constraints, índices) |

**Gate de saída:** `pytest` roda em CI e passa; ≥1 golden snapshot por endpoint pesado comitado; baseline P-0 em [07-log-de-execucao](07-log-de-execucao.md); mapa de dados escrito; nenhum snapshot contém dado pessoal.

### W1 — Fechar o P1 crítico (segurança)

| Agentes | Escopo |
|---|---|
| [A2 Segurança](../agents/02-seguranca.md) (líder) | Batch 2: resiliência Neo4j → `503` (`C-3c`/`B-9`); resíduo de `resolve_within` em `rerun_workflow`/`can_rerun_project`; `S-4` (logging estruturado, parar de vazar `str(e)`); `S-5` na forma decidida (§abaixo): limites rígidos + token só nas rotas administrativas + checagem de `origin` no WebSocket |
| [A12 Neo4j](../agents/12-neo4j-grafo.md) | Separação de credenciais leitura/escrita; `$user_id` parametrizado; restrição de APOC — é o que fecha `S-1` |
| [A3 Backend Core](../agents/03-backend-core.md) | Mapear `ConnectionError` → HTTP nos routers; padrão `except HTTPException: raise` onde toca |
| [A5 Frontend](../agents/05-frontend.md) | Tratar `503` na UI (mudança de contrato: Neo4j fora do ar deixa de ser `200 []`); remover `injectUidFilter` quando o filtro server-side existir (`F-3`) |

### Modelo de acesso do demo — resolvido ([DEC-004](07-log-de-execucao.md))

**Não haverá login.** O demo em `phylotreeminer.ic.uff.br` roda numa máquina da universidade para avaliação por bancas durante a submissão do artigo; o `X-User-ID` serve para particionar sessões, não para autenticar. Um avaliador precisa conseguir **rodar** o pipeline, não só navegar em resultados prontos — logo fechar as rotas de escrita atrás de credencial destruiria o propósito do demo.

Postura de segurança que decorre disso:

| Camada | Decisão |
|---|---|
| Escrita de usuário (upload, run, ingest) | **Permanece anônima**, com limites rígidos: tamanho e tipo de upload, `resolve_within` em todo caminho, rate limiting, lock de concorrência, TTL + purga |
| Rotas administrativas (`/api/neo4j/connect` e afins) | **Token de operador** (`ADMIN_TOKEN` por env) — ou simplesmente removidas |
| Cypher de consulta | Sessão `READ_ACCESS` com credencial **somente leitura**; `user_id` como parâmetro `$user_id` |
| Ingest em lote | Credencial de escrita **server-side**, usada só pelo endpoint de ingest, que consome CQL **gerado pelo pipeline a partir de caminho no servidor** — não texto arbitrário do cliente |

Isso destrava `S-1` e `F-3` **sem autenticação de usuário**: a separação de credenciais e a parametrização resolvem o que se pensava depender de login ([DEC-002](07-log-de-execucao.md) fica superada). Ver [A12](../agents/12-neo4j-grafo.md) §5.

**Gate:** bateria [`security-probe`](../skills/security-probe/SKILL.md) verde; Cypher destrutivo recusado na rota de consulta; ingest legítimo continua funcionando (teste); rotas administrativas rejeitam requisição sem token; teste automatizado para cada vetor fechado (traversal, upload, injeção em `<<USER_UID>>`, origem WS).

### W2 — Performance (P2)

| Agentes | Escopo |
|---|---|
| [A4 Performance](../agents/04-performance.md) (líder) | `asyncio.to_thread` em NCBI (`B-4`) e bioinformática pesada (`B-5`); `psutil interval=None`; reescrita de `stream_workflow_output` com duas tasks + EOF; `treePlot` recebendo `dict` em vez de lista |
| [A5 Frontend](../agents/05-frontend.md) | Índice memoizado (`F-4`), leak de zoom D3 e split estrutura/estilo (`F-5`), update incremental do vis-network |
| [A12 Neo4j](../agents/12-neo4j-grafo.md) (líder de `P-3`) | Índices em `uid`/`q.key` justificados por `PROFILE`; `LIMIT` obrigatório no servidor; ingest em transação por lote |

**Gate:** medição antes/depois anexada para cada item (latência de endpoint trivial sob carga volta ao normal); nenhum golden snapshot de W0 mudou; sem regressão de listeners (`getEventListeners(svg)` estável entre cliques).

### W3 — Correção (P3) — inclui o núcleo científico

| Agentes | Escopo |
|---|---|
| [A6 Domínio Científico](../agents/06-dominio-cientifico.md) (líder dos itens C-5) | `C-5a` quartet `-1`→`None` e `check_consistency`; `C-5b` fallback de organismo; `C-5c` `only_first` (confirmar intenção); `C-5d` **fonte única** para tabelas país/região; `C-5e` tokenizador de blocos CQL |
| [A11 Bioinformática](../agents/11-bioinformatica-inferencia.md) (líder da auditoria de métodos) | Revisão das escolhas de inferência do pipeline: alinhamento, seleção de modelo, método, valores de suporte, enraizamento, QC e amostragem. Promover **escolha silenciosa** (default que ninguém decidiu) a decisão documentada |
| [A3 Backend Core](../agents/03-backend-core.md) | `C-2` (`404`→`500`), `P-2` (paginação O(N²)) |

**Gate especial:** cada item `C-5` traz *diff de resultado* sobre o dataset de referência e um parecer explícito: "o número publicado muda / não muda". Se muda, o usuário decide antes do merge. Ver [04-rigor-cientifico](04-rigor-cientifico.md).

### W4 — Estrutural (P4)

| Agentes | Escopo |
|---|---|
| [A1](../agents/01-infra-devex.md) | Arq-A: `Dockerfile` de backend (micromamba, `QT_QPA_PLATFORM=offscreen`) e frontend (build → nginx com fallback SPA + proxy `/api`, `/ws`); compose full-stack; `conda-lock` |
| [A3](../agents/03-backend-core.md) | Arq-B: quebrar `app.py` em `config`/`logging_conf`/`routers/*`/`services/*`; DI em vez de singleton Neo4j |
| [A5](../agents/05-frontend.md) | Arq-C: `services/http.js` + módulos por domínio; decompor `PhylogeneticTreeViewer`; React Query |
| [A12](../agents/12-neo4j-grafo.md) | Esquema versionado com migrações idempotentes (e o inverso de cada uma); catálogo de consultas predefinidas |

**Gate:** golden snapshots idênticos byte a byte (é refatoração, não mudança de comportamento); `docker compose up` sobe tudo; `grep -rl "localhost:8000" Frontend/` retorna vazio.

### W5 — Resiliência e cache (M-1/M-2)

`CircuitBreaker`/`with_retry`; NCBI com *history server* (`usehistory=y`) e respeito a ~3 req/s; geocoding **server-side** com `User-Agent` e cache persistente (a política do Nominatim é violada hoje); cache de análise por `sha256(entrada+params)`; `ETag`/`Cache-Control`. Agentes: [A4](../agents/04-performance.md) + [A2](../agents/02-seguranca.md).

**Gate:** teste de falha injetada (NCBI 429/timeout) não derruba o endpoint; cache de análise com invalidação por `mtime`/hash provada em teste.

### W6 — Features científicas (M-3)

Só depois de W0-W3. Ordem por alavancagem científica: **comparação de N árvores** (matriz RF/Quartet + heatmap) → **filogeografia funcional** (hoje stub: `extractAllSequences()` retorna `[]`) → cache/persistência de análises → árvore de consenso → busca sobre padrões minerados. Agentes: [A6](../agents/06-dominio-cientifico.md) + [A11](../agents/11-bioinformatica-inferencia.md) + [A5](../agents/05-frontend.md).

**Gate:** cada feature nasce com teste, com definição formal da métrica no doc científico e com validação contra ferramenta de referência (DendroPy/ETE3/tqDist). **Além disso**, [A11](../agents/11-bioinformatica-inferencia.md) precisa aprovar a validade da interpretação — a filogeografia é o caso mais delicado: amostragem oportunista do NCBI descreve padrão, não demonstra origem nem transmissão, e isso tem de estar visível na própria UI, não só no artigo.

### W7 — Empacotamento para publicação

| Agentes | Escopo |
|---|---|
| [A13 Escrita Científica](../agents/13-escrita-cientifica.md) (líder do manuscrito) | Enquadramento e veículo, mapa afirmação→evidência→limitação, manuscrito, figuras de publicação, carta, pacote de submissão |
| [A9 Documentação & Publicação](../agents/09-documentacao-e-publicacao.md) (líder do artefato) | `CITATION.cff`, *code/data availability statements*, README de reprodução em um comando, manifesto de análise ligando cada figura a script+commit+hash, benchmark de escalabilidade |
| [A11 Bioinformática](../agents/11-bioinformatica-inferencia.md) + [A6 Domínio](../agents/06-dominio-cientifico.md) | Métodos (inferência e métricas) e Limitações; conferência técnica do que A13 redigiu |
| [A8 Dados & Governança](../agents/08-dados-e-governanca.md) | Declaração de ética/LGPD, política de retenção do demo, checagem Nagoya/SisGen se houver material biológico brasileiro, licença e compatibilidade de dependências |

**Gate:** um terceiro reproduz o resultado principal a partir do zero seguindo só o README; e nenhuma afirmação do manuscrito está sem evidência rastreável no [log de execução](07-log-de-execucao.md).

**Aviso de enquadramento, dado cedo de propósito:** uma ferramenta, por si só, raramente entra na Nature principal — o que entra é uma **descoberta** que só foi possível por causa dela. A escada realista e o que falta para cada degrau estão em [A13 §5](../agents/13-escrita-cientifica.md). A recomendação é preparar o manuscrito para o degrau que a evidência atual sustenta, construindo desde já o que o degrau seguinte exige: comparação sistemática contra o estado da arte, benchmark de escalabilidade, dataset de referência e um caso de uso com resultado interpretável.

## 4. Mapeamento onda × itens da auditoria

| Onda | Itens |
|---|---|
| W0 | *(novo)* harness, CI, golden snapshots, baseline `P-0`, mapa de dados |
| W1 | `B-9`/`C-3c`, `B-2` residual, `S-4`, `S-5`, depois `S-1`+`F-3`, `B-1`, `B-3`(feito) |
| W2 | `B-4`, `B-5`, `B-11`, `P-1`, `P-4`, `F-4`, `F-5` |
| W3 | `C-2`/`B-6`, `C-5a-e`, `P-2`, `P-3`, `B-10`, `C-4a-e`, `F-7`, `F-8` |
| W4 | Arq-`A`, Arq-`B`, Arq-`C`, `P1-4`, `P1-5`, `P1-7`, `B-12`, `F-10` |
| W5 | `M-1`, `M-2`, `P-5`, `F-9` (geocoding server-side) |
| W6 | `M-3` |
| W7 | *(novo)* artefato de publicação |
| Depois | [99-futuro-infra-agnostica](../audit/99-futuro-infra-agnostica.md) — fora do escopo atual por decisão do usuário |

## 5. O que este plano deliberadamente não faz

- **Não reescreve o pipeline bioinformático** (`BioComp_UFF` é submódulo, com ciclo próprio). [A11](../agents/11-bioinformatica-inferencia.md) audita, especifica e documenta as escolhas metodológicas; mudanças no pipeline são propostas ao usuário.
- **Não adota Ports & Adapters / BYO-infra** agora — excluído por decisão do usuário. Essa é a direção futura confirmada (usuário conecta serviços de nuvem para o pipeline e o armazenamento de resultados, ou clona o repositório e roda na infra local), e ela **retoma depois de fechadas todas as fases da auditoria** — ver [`../audit/99-futuro-infra-agnostica.md`](../audit/99-futuro-infra-agnostica.md). O trabalho de W4 (containerização, camadas, configuração por env) é justamente o que torna essa fase possível.
- **Não migra para TypeScript** nem troca de framework: risco alto, ganho científico nulo no horizonte da publicação.
- **Não persegue cobertura de teste por métrica.** A meta é caracterizar o comportamento dos caminhos que produzem resultados científicos, não atingir um número.
