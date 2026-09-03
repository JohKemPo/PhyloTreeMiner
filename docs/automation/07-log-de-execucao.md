# Log de execução — decisões, evidências e handoffs

[← Automação](README.md) · **Documento vivo.** Dono: [orquestrador](../agents/00-orquestrador.md). Grave aqui **antes** de responder ao usuário.

Este é o arquivo que a próxima janela de contexto lê para saber o que já aconteceu e por quê. Complementa [`../audit/10-progresso-execucao.md`](../audit/10-progresso-execucao.md), que registra *o que mudou no código*; aqui ficam **decisões, medições e pareceres**.

## Estado

| Campo | Valor |
|---|---|
| Marco corrente | Caminho crítico M0→M1→M2→M3→M6: **M0 ✅, M1 ✅ (2026-08-24), M2 ✅ FECHADO em código 0 (DEC-063, 2026-09-02)**. **M3 — resultado principal do artigo — em 1,5 de 4**: M3.2 fechado (DEC-064), M3.1 só a metade `BioComp_UFF/`, M3.3 (UI) e M3.4 (`make main-result`, que ainda não existe) **abertos** — é o item que decide se o argumento do artigo (bootstrap × robustez metodológica) é demonstrável hoje. **M6 (manuscrito) não iniciado** — não existe `docs/paper/` no repositório. Paralelos: **M7** 8 lotes (7 fechados). **M4 — T2 fecha em 12 de 12** (DEC-065), mas a correção de 4 bloqueadores da revisão (DEC-066) foi revisada de novo e **reprovada com 3 novos bloqueadores** (DEC-067, 2026-09-03) — R1/R2/R3 pendentes, não corrigidos |
| Última atualização | 2026-09-03 — **Segunda rodada do Revisor reprova de novo a correção de M4/T2** (DEC-067): B2 fecha por ZIP, não pelo upload inteiro (até ~10 GB acumulados passam com `200 OK` nos valores de produção); B3 troca bypass por `500` não capturado em token com byte não-ASCII; a guarda de regressão de B4 não pegaria a forma real do `SIGSEGV` histórico (indireção via wrapper). Não corrigido ainda — foco mudou para avaliar prontidão de apresentação em congresso. Antes, no mesmo dia — **Revisão do lote M4/T2 reprova 4 bloqueadores, 3 corrigidos e 1 revertido com evidência** (DEC-066): upload materializava o arquivo inteiro antes de checar o teto (B1); zip bomb confiava em campo do cabeçalho forjável pelo atacante (B2); token de admin comparado com `!=` em vez de tempo constante (B3) — os três corrigidos. `render_annotated_tree` (ete3/PyQt) movido para thread em M4.10 causava **`SIGSEGV` real, reproduzido**, porque Qt não tolera rodar fora da main thread (B4) — revertido para síncrono, únicos os caminhos sem Qt continuam em thread. `pytest`: 294→299 passed (+5: 4 testes novos de B1/B2, 1 guarda de regressão de B4). Commitado em `e7321ee` (código original), `bf5fb04` (doc original) — a correção de B1-B4 é commit à parte. Antes, no mesmo dia — **M4, T2 fecha em 10 de 10** (DEC-065): `str(e)` vazando ao cliente cai de 25 para 0 ocorrências em `detail=` (M4.2/M4.3), `ADMIN_TOKEN` nas rotas administrativas (M4.4), `Origin` dos WebSockets (M4.5), limites de upload/ZIP/`retmax` (M4.6), rate limiting anônimo em 4 rotas (M4.7), `psutil.cpu_percent` e 3 rotas NCBI e 4 operações de CPU saem do event loop (M4.8–M4.10), `stream_workflow_output` reescrito sem busy-poll (M4.11). `pytest`: 257→294 passed. Antes, no mesmo dia: **M3.2/M7.2 fecha** — RAxML-NG passa a produzir suporte de ramo (FBP), `--all --bs-trees 1000` (DEC-064). Antes: **VARV-121 validado, E4 ganha segunda réplica** (DEC-062) e **M2 fecha em 7 de 7** com `expected.json` regenerado (DEC-063). Antes, 2026-09-01 — **C-5e fechado**: `parse_cql_blocks` cortava em todo `;`, mesmo dentro de string (DEC-052). Pente-fino nos `.cql` dos projetos Zika achou dois defeitos distintos: o tokenizer (código vivo, zona sagrada) e aspas simples não escapadas em 4 artefatos legados (`Zika_Virus_Singapura_{Small_6seq,Medium_11seq,Advanced_21seq,Large_21seq}`), gerados por uma versão anterior ao `neo4jProcessing.py` atual. **Achado fora de escopo:** credencial Neo4j Aura em texto puro em `BioComp_UFF/workflow/utils/neo4jUploader.py` desde jun/2025 — reportado ao usuário, não mexido (rotação é decisão do usuário). Antes: **visores de log e tabela, e o painel de comparação** (DEC-051), com **[D24](../science/02-defeitos-que-alteram-resultado.md#d24)** achado no caminho: o backend afirmava discordância entre métricas quando uma delas não fora medida. Antes, no mesmo dia: **[D1](../science/02-defeitos-que-alteram-resultado.md#d1) fecha e M2 chega a 7 de 7** (DEC-050): o fator alinhador passa a ser duas estratégias do MAFFT, e os dois braços produzem alinhamentos **de md5 diferente** onde antes eram cópias byte a byte. As três decisões pendentes foram tomadas. Antes: **[D22](../science/02-defeitos-que-alteram-resultado.md#d22) fecha em 8 de 8**: um arquivo de log por execução, com o `run_id` no nome, e o manifesto registrando qual é o seu (DEC-049). Antes, no mesmo dia: backend e frontend passam a ler o manifesto e `idle` deixa de existir (DEC-048); a caracterização de D22 (DEC-047); `tools_invoked` populado e **[D21](../science/02-defeitos-que-alteram-resultado.md#d21)** achado (DEC-046); pré-voo §4.0 (DEC-045); versões **pinadas** (DEC-044) |
| Lotes em andamento | nenhum. ✅ **M2 em 7 de 7** e **D1 fechado**; o portão segue em **código 2** e o que falta é a **reexecução** de §4.1, agora destravada — [D21](../science/02-defeitos-que-alteram-resultado.md#d21) (o que a bloqueava) fechou junto com D1 em DEC-050, com a decisão do usuário por `-nt 1`. ✅ **M4.O em 8 de 8** — o gate passa nos 5 critérios. ✅ **`tools_invoked` populado** (DEC-046). ✅ **Migração concluída**: ambiente registrado em [`11-handoff §2.3`](11-handoff-maquina-de-validacao.md) |
| Write-locks ativos | nenhum |
| Aguardando o usuário | **as seis decisões estão tomadas**, e a política de alinhador foi decidida em 2026-08-25 ([DEC-039](#dec-039--2026-08-25--política-de-alinhador-avisar-não-bloquear--endpoint-e-seletor)): **avisar, não bloquear**. Novo, de DEC-052: **credencial Neo4j Aura em texto puro** em `BioComp_UFF/workflow/utils/neo4jUploader.py` (URI + senha, desde jun/2025) — decidir se rotaciona a credencial na instância e se convém reescrever o histórico do submódulo |

## Decisões (ADR-lite)

Formato: `DEC-nnn · data · decisão · motivo · consequência · reversível?`

### DEC-001 · 2026-07 · Fase "infra agnóstica" fora do roadmap P0-P4
**Motivo:** custo alto, ganho nulo no horizonte da publicação. **Consequência:** blueprint preservado em [`../audit/99-futuro-infra-agnostica.md`](../audit/99-futuro-infra-agnostica.md); retomar após W4. **Reversível:** sim.

### DEC-002 · 2026-07 · ~~`S-1` e `F-3` adiados até existir autenticação~~ — **SUPERADA por DEC-004**
**Motivo original:** tornar todo Cypher read-only quebraria o ingest em lote (`/api/cql-batch` executa `CREATE`/`MERGE`). **Situação atual:** a premissa de que a solução exigia autenticação estava errada. `S-1` se resolve por **separação de credenciais** + `$user_id` parametrizado, sem login. Ver DEC-004 e [A12 §5](../agents/12-neo4j-grafo.md).

### DEC-003 · 2026-07 · Nenhum commit sem pedido explícito do usuário
**Motivo:** controle do autor sobre o histórico do repositório da sua pesquisa. **Consequência:** mudanças ficam no worktree; agentes nunca fazem `git add`/`commit`/`push` por iniciativa própria. **Reversível:** sim.

### DEC-004 · 2026-07-29 · **Não haverá login.** Demo anônimo com limites rígidos; token só nas rotas administrativas
**Decisão do usuário.** O demo em `phylotreeminer.ic.uff.br` roda numa máquina da universidade para **avaliação por bancas** durante a submissão do artigo; o `X-User-ID` particiona sessões, não autentica. Um avaliador precisa conseguir *rodar* o pipeline — fechar a escrita atrás de credencial destruiria o propósito do demo.

**Consequências:**
- Escrita de usuário (upload, run, ingest) permanece **anônima**, defendida por limites: tamanho/tipo de upload, `resolve_within`, rate limiting, lock de concorrência, TTL + purga.
- Rotas **administrativas** (reconfigurar conexão e afins) exigem `ADMIN_TOKEN`, ou são removidas.
- `S-1` **destravado sem autenticação**: credencial somente-leitura + sessão `READ_ACCESS` + `$user_id` como parâmetro; credencial de escrita server-side usada só pelo ingest, que consome CQL gerado pelo pipeline a partir de caminho no servidor (não texto do cliente). Supera DEC-002.
- Governança se desloca de "quem entra" para "o que se aceita, por quanto tempo, com que aviso" — `G6` (aviso operante antes do upload) passa a ser o controle central. O README já declara que a ferramenta é só para demonstração; o trabalho é tornar isso operante.
- **Dado sensível real não deve ser processado no demo, por decisão de projeto.**

**Reversível:** sim — se um dia houver necessidade de login, nada aqui impede.

### DEC-005 · 2026-07-29 · W0 (bootstrap de verificação) precede P2 em diante
**Motivo:** o repositório não tem nenhum teste automatizado; as regras "golden test antes de mover" e "medir antes/depois" da própria auditoria são inexequíveis sem harness. **Consequência:** atraso de uma onda antes das mudanças de performance/estrutura, em troca de refatoração verificável. Inclui escrever testes retroativos para o que P0/P1-batch1 já alterou. **Reversível:** não faz sentido reverter.

### DEC-006 · 2026-07-29 · Infra plugável (nuvem do usuário ou execução local) é a direção futura confirmada
**Contexto do usuário:** a ferramenta evoluirá para que o usuário conecte serviços de nuvem que forneçam ao pipeline a arquitetura de execução e o armazenamento de resultados, ou clone o repositório e rode na infra local. **Consequência:** [`../audit/99-futuro-infra-agnostica.md`](../audit/99-futuro-infra-agnostica.md) deixa de ser hipótese e passa a ser roteiro pós-auditoria (atualiza DEC-001); W4 — containerização, camadas, configuração por env — é o pré-requisito. **Retomar:** só depois de fechadas todas as fases previstas na auditoria. **Reversível:** sim.

### DEC-007 · 2026-07-29 · Três agentes especializados adicionados (A11, A12, A13)
**Motivo:** o elenco original cobria engenharia e correção, mas não a **validade da inferência filogenética**, a **modelagem de grafo** nem a **produção do manuscrito** — três competências centrais para o objetivo de publicação. **Consequência:** [A11](../agents/11-bioinformatica-inferencia.md) (veto sobre escolhas de inferência e interpretação; audita o submódulo `BioComp_UFF` sem editá-lo), [A12](../agents/12-neo4j-grafo.md) (assume o *write-lock* de `neo4j_services.py`, esquema e consultas; A3 mantém driver/DI), [A13](../agents/13-escrita-cientifica.md) (só `docs/paper/**`, paralelizável com qualquer onda). Fronteiras registradas em [`../agents/README.md`](../agents/README.md). **Reversível:** sim.

### DEC-008 · 2026-08-19 · **O ambiente de desenvolvimento executa o stack completo** — premissa antiga invalidada
**Contexto.** Todo o protocolo de orquestração foi escrito supondo uma máquina Windows sem conda, node, npm ou Docker; daí as regras "agentes não podem afirmar que funciona" e "gate que exige executar o stack → escalar ao humano".

**Fato verificado** (comandos e versões em [`08-ficha-de-fatos.md §1`](08-ficha-de-fatos.md)): a máquina Linux atual tem conda com o ambiente `Phylotreeminer` completo (biopython 1.81, pandas 2.2.2, mlxtend 0.23.1, fastapi 0.121.0, neo4j 5.20.0), Node v22.22.3, Docker 28.3.3 com `phylotree_neo4j` **de pé**, e a cadeia bioinformática inteira (MAFFT 7.490, Clustal Omega 1.2.4, IQ-TREE 2.2.2.6, FastTree 2.1.11, RAxML-NG, MUSCLE 3.8.1551). Mais: **dendropy 4.6.1 e ete3 3.1.3**, que são os oráculos independentes exigidos por [`04-rigor-cientifico §3`](04-rigor-cientifico.md#3-protocolo-de-mudança-na-zona-sagrada). O script `docs/science/scripts/audit_variola.py` **executa** e reproduz a seção 1 exatamente como documentado.

**Consequências:** (a) nasce o papel **Validador**, que executa e prova — ver DEC-009; (b) "o gate exige executar o stack" **deixa de ser motivo de escalonamento** ao humano; (c) o protocolo de mudança na zona sagrada passa a ser executável hoje, sem instalar nada; (d) `../agents/10-revisor.md §5` e `02-protocolo §1` ficam desatualizados nesse ponto e são substituídos por [`09-arquitetura-de-agentes.md`](09-arquitetura-de-agentes.md).

**Achado colateral:** os logs de VARV registram **FastTree 2.2.0**; a máquina tem **2.1.11**. Reexecutar hoje não reproduz as árvores FastTree em disco — instância concreta de [D11](../science/02-defeitos-que-alteram-resultado.md#d11). Resolver antes de M2. **Reversível:** não é uma escolha, é um fato.

### DEC-009 · 2026-08-19 · Hierarquia de cinco papéis com validação cruzada
**Decisão.** Separar os papéis fundidos: A0 vira **Planejador** (marcos, gates) + **Gerenciador** (lotes, locks, ledger); A10 vira **Revisor de Código** (diff, escopo, diretrizes) + **Validador** (executa e prova). O **Desenvolvedor** escreve dentro do lock.

**Motivo.** Quem planeja não é adversário do próprio plano; e "aprovado estaticamente" não é "funciona". Com DEC-008, a validação por execução deixa de ser gargalo humano.

**Consequência.** Os treze agentes de [`../agents/`](../agents/README.md) **não são descartados**: viram *perfis* que os papéis assumem, preservando todos os contratos já escritos. Vetos de A6/A8/A11 inalterados. Matriz de validação cruzada fechada (ninguém se autoaprova) em [`09-arquitetura-de-agentes.md §3`](09-arquitetura-de-agentes.md#3-validação-cruzada--quem-valida-quem), com regra explícita de resolução quando R e V divergem. **Reversível:** sim.

### DEC-010 · 2026-08-19 · O baseline de Li *et al.* (2007) é o teste de regressão da refatoração
**Decisão.** O invariante científico — monofilia de VARV e clado P-II a **4/4** métodos, mais a bipartição aninhada de 10 táxons — vira **gate executável** (`make reference-check`) exigido em todo marco a partir de M2.

**Motivo.** Golden snapshot congela o comportamento atual, bugs inclusive: detecta regressão de *implementação*, não de *significado*. O invariante do baseline é externamente validado pela literatura (Li *et al.* 2007 PNAS 104:15787-92; Esposito *et al.* 2006 Science 313:807-812) e não pode mudar — se a monofilia de VARV cair, a refatoração quebrou a ciência. Os dois gates são complementares e ambos ficam.

**Ponto de partida:** a replicação já existe, comentada, em `BioComp_UFF/workflow/workflow_dataAcquisition.py:798-884`, com as 48 accessions explícitas (`DQ437580`–`DQ437594`, `DQ441416`–`DQ441448`) e o grupo externo Taterapox+Camelpox. Falta filtro `txid10242`, enraizamento explícito e manifesto — é o marco M2.

**Consequência.** M2 produz `Backend/tests/data/reference/` e institui o gate. **Risco aceito e declarado:** entre M0 e M2 a única rede é o golden snapshot. **Reversível:** não é desejável.

### DEC-011 · 2026-08-19 · ~~**PENDENTE**~~ — conflito de protocolo sobre o submódulo `BioComp_UFF` — **RESOLVIDO por [DEC-020](#dec-020--2026-08-24--decisão-6-tomada-escrita-liberada-no-submódulo-biocomp_uff-com-lock-próprio-e-histórico-separado)**
**Situação.** [`02-protocolo §3`](02-protocolo-de-orquestracao.md#3-write-lock-por-arquivo) determina que ninguém edita `BioComp_UFF/**`. Mas as correções **D3** (`stability.py`), **D4** (`miner.py`), **D5** (`treeUtils.py`) e **D10** (propagação de UFBoot) vivem **todas** dentro do submódulo. Sob a regra atual, metade das correções científicas é inexecutável.

**Recomendação:** liberar a escrita com write-lock próprio e commit separado no repositório do submódulo. A alternativa de replicar a lógica científica no `Backend/` institucionalizaria exatamente o defeito D5 (dois universos de identidade paralelos).

**Aguardando decisão do usuário.** Bloqueia M1.1-M1.3, M2 inteiro e M3.1-M3.2.

### DEC-012 · 2026-08-19 · Patch de P0/P1 portado para `main`, com teste que o prova
**Contexto.** A verificação de portão descobriu que P0/P1 nunca chegou a `main` — ver [`08-ficha-de-fatos.md §2`](08-ficha-de-fatos.md). O patch existia só num diretório órfão.

**Decisão.** Escrever primeiro os testes que falham em `main`, depois portar. 13 testes falhavam; após o porte, todos passam.

**Aplicado:** `resolve_within` com guarda de `ValueError` (caminho cross-drive); CORS por `CORS_ORIGINS`; `run_workflow` com regex + `resolve_within` + `isdir` + **lock de concorrência reativado** (estava comentado); `browse_path`, `get_paginated_json`, `get_file_content` migrados; **o residual de `rerun_workflow`/`can_rerun_project`** que estava em fila para M4 foi fechado junto porque o teste exige zero `startswith`; `set_ncbi_email` sem o `try/except` que convertia `400` em `500`; filtro ZIP sem o `''` que casava qualquer nome; upload com `basename` + regex + `resolve_within`.

**Fora do patch original, aplicado no mesmo lote:** `docker-compose.yml` com bind em `127.0.0.1`, `NEO4J_PASSWORD` obrigatória, healthcheck, `mem_limit`, e **remoção do APOC** — `apoc.*` não é usado por nenhuma consulta do projeto (`grep -rn "apoc\." Backend/ Frontend/` vazio) e `procedures_unrestricted` + import/export de arquivo davam leitura e escrita no host. `.env.example` criado. `python-dotenv` e `psutil` declarados em `requirements.txt` (eram importados sem estar lá).

**Evidência de execução, no servidor de desenvolvimento do usuário (porta 8000, `--reload`):**
```
GET  /browse?path=../../etc          -> 403
POST /api/ncbi/set-email email=xyz   -> 400
GET  /api/system/health              -> 200
```
**Reversível:** sim — nada foi commitado; `git diff` mostra tudo.

### DEC-013 · 2026-08-19 · `except HTTPException: raise` aplicado aos 17 blocos que engoliam o status
**Motivo.** 17 blocos `try/except Exception` em `app.py` levantavam `HTTPException` dentro do `try` e a capturavam no handler genérico, convertendo `400`/`403`/`404` em `500`. Detectado por varredura AST, não por leitura.

**Mudança de contrato:** endpoints que devolviam `500` para recurso ausente passam a devolver `404`. O frontend trata `!response.ok` como erro nos dois casos, então a UX não regride — melhora.

**Evidência:** `tests/api/test_contrato_erros.py` — varredura AST assere zero blocos ofensores, e quatro rotas devolvem `404` para projeto inexistente. **Reversível:** sim.

### DEC-014 · 2026-08-19 · Catraca de lint em vez de correção em massa
**Contexto.** O frontend tem **69 erros e 27 avisos** de eslint pré-existentes. Corrigi-los é lote de M5/T4, não de M0.

**Decisão.** `.eslint-baseline.json` fixa o débito atual; `npm run lint:ratchet` falha se o número **crescer** e avisa quando cai. A CI roda a catraca, não o lint cru.

**Motivo:** mascarar com `continue-on-error` seria desonesto; corrigir 96 problemas agora estouraria o escopo de M0 e misturaria refatoração com mudança de comportamento. A catraca impede regressão sem fingir que o débito não existe. **Reversível:** sim.

### DEC-015 · 2026-08-19 · Golden snapshots normalizam ordem; a instabilidade é defeito separado
**Contexto.** Os snapshots divergiam entre execuções ([D14](../science/02-defeitos-que-alteram-resultado.md#d14)): a ordem de várias respostas vem de iteração sobre `set` de strings, cujo hash é aleatorizado por processo.

**Decisão.** `_normalizar` em `Backend/tests/conftest.py` ordena antes de comparar, para que o snapshot detecte mudança de **conteúdo** enquanto D14 não é corrigido. Fixar `PYTHONHASHSEED` foi **recusado**: mascara o defeito e não sobrevive a um deploy que não controle a variável. **Reversível:** sim — some quando D14 for corrigido.

### DEC-016 · 2026-08-19 · M1.4–M1.6 aplicados (D7, D8, D9) — trilha T2, sem tocar o submódulo
**Contexto.** Três defeitos de apresentação em `analyze_patterns`/`analyze_tree_coverage` (`Backend/src/app.py`), todos fora do submódulo, portanto não bloqueados pela decisão 6.

**D7 — truncamento silencioso.** `max_pattern_size=100` descartava padrões sem avisar. Agora o payload traz `patterns_in_source`, `discarded_by_size`, `discarded_sizes`, `unreadable_rows`, `size_filter`. Medido: VARV-6 não descarta nada (12/12); **VARV-121 descartava 8 de 20** — os tamanhos 118–120, exatamente os de maior conteúdo filogenético. Frontend (`TreePatternAnalysis.jsx`) ganhou um `Alert` que aparece só quando `discarded_by_size > 0`.

**D8 — cobertura por árvore.** `get_hash_to_subtree` fazia `dict.update`, e a última árvore a escrever um hash vencia; um clado conservado (mesmo hash em várias árvores) ficava atribuído a uma só. Trocado por `merge_hash_to_subtree` (um-para-muitos: `entrada["trees"] = {tree_name: subtree_name, ...}`). Medido: VARV-6 foi de **5 para 10** árvores listadas (existem 10 em disco); VARV-121 foi a **8/8**.

**D9 — números falsos e duplicados.** `unique_signatures` nunca recebia `.append` (contagem sempre 0); `quasi_invariant` recomputava exatamente `topologically_robust` com outro nome. Removidos os dois; a API agora expõe `method_sensitive_count`/`topologically_robust_count`, iguais ao `len()` das listas que já vinham no payload. Os dois `BaseModel` mortos que documentavam o contrato antigo (`TreeAnalysisRequest`, `PatternAnalysisResult` — nenhum dos dois usado em endpoint) foram removidos junto.

**Tabela de diff (protocolo `04-rigor-cientifico §3`):**

| Métrica | Antes | Depois | Δ | Afeta número publicado? |
|---|---|---|---|---|
| `total_patterns` (VARV-6) | 12 | 12 | 0 | não |
| `avg_pattern_size`, `avg_support` | — | — | 0 | não |
| `method_sensitive_signatures` / `topologically_robust` (conteúdo) | 11 / 0 | 11 / 0 | 0 | não |
| `tree_coverage` (nº árvores, VARV-6) | 5 | 10 | **+5** | sim — mas é a correção; o "antes" já era o bug D8 |
| `unique_signatures_count` | 0 (sempre) | campo removido | — | não — nunca foi um número real |

Nenhum número científico publicável mudou; o que mudou foi a **apresentação** deixar de mentir sobre truncamento e cobertura. **Evidência de execução:** `pytest Backend/tests -q` → 77 passed, 5 xfailed (antes: 74 passed). Snapshots regravados com `UPDATE_SNAPSHOTS=1` e parecer aqui registrado, conforme exigido mesmo quando o snapshot muda por correção esperada.

**Write-lock:** `Backend/src/app.py`, `Backend/tests/golden/**`, `Frontend/.../TreePatternAnalysis.jsx` — trilha T2/T4, sem tocar `BioComp_UFF/**`. **Reversível:** sim.

### DEC-017 · 2026-08-19 · M1.7 (D12+D16) — **LOTE ABERTO, não commitado.** Estado exato para retomar

**Por que os dois juntos.** [D16](../science/02-defeitos-que-alteram-resultado.md#d16) documenta que corrigir D12 (país deixa de ser fabricado do `strain`) sem corrigir D16 (a tabela região só cobre 14 países de Zika) não muda nada visível — o país correto simplesmente passa a cair em `Unknown` do mesmo jeito. Um lote, não dois.

**Reverificação de escopo feita nesta sessão** (a regra "confirme antes de mandar corrigir" pegou uma imprecisão do parecer científico original): o C-5d fala em "três tabelas país/região divergentes". No código **atual** só existem **duas**, as duas em `Backend/src/utils/treePlot.py` — `REGION_MAPPING` (dict módulo) e o `color_map` local dentro de `render_annotated_tree` (região→cor, só 6 chaves). A suposta terceira tabela do frontend (`COUNTRY_DICTIONARY` em `useGeocoding.jsx`) é **geocodificação** (país→lat/lng para o mapa), não classificação região — é um problema *diferente*, já rastreado (política do Nominatim violada, item M5/W5/M-2), e **fora do escopo deste lote**.

**Feito até agora:**
- `Backend/src/data/regions.json` criado — fonte única, ~120 países em esquema UN M49 (sub-regiões), **com tabela de aliases** para nomenclatura histórica (`Dahomey`→Benin, `Zaire`→RDC, `USSR`→Rússia, `Sumatra`→Indonésia, `Ceylon`→Sri Lanka, `Negev`→Israel, ~40 entradas) — indispensável porque os isolados de *Variola* são de 1944-1977 e trazem o nome do país da época.
- Confirmado por `grep`: `app.py:660` chama `map_country_to_region(country)`, importado de `treePlot.py` — é o único ponto de consumo no backend.
- Testes de caracterização já existem e vão virar critério de aceite: `Backend/tests/unit/test_metadados_cientificos.py` (`defeito_conhecido` = `xfail(strict=True)` em 4 casos D12 + 2 casos D16).

**NÃO feito — exatamente onde retomar:**

1. Escrever `Backend/src/utils/regions.py` (ou função equivalente dentro de `treePlot.py`): carrega `regions.json` uma vez no import, resolve alias → nome canônico → região, cache em memória. Substituir `REGION_MAPPING`/`map_country_to_region` em `treePlot.py:4-42` para usar essa fonte. **Manter o nome público `map_country_to_region` e a assinatura** — é o que `app.py` e os testes importam.
2. Corrigir o `color_map` local em `render_annotated_tree` (`treePlot.py`, dentro da função, hoje só 6 chaves) para cobrir as sub-regiões novas do `regions.json` — senão a árvore renderizada mostra quase tudo cinza (`Unknown`) depois da troca.
3. `get_node_information` (`app.py:624-679`) — quatro edições independentes, mesmo bloco:
   - **D12a (ano):** remover o fallback `raw_date = coll_date if coll_date else strain_info` — usar só `collection_date`; ausente = `"Unknown Date"`.
   - **D12b (país):** remover o `re.search` sobre `strain_info` — usar só `geo_loc_name`; ausente = `"Unknown"`.
   - **D12c (organismo):** `annotations.get("organism", 'Unknown') or annotations.get("source", 'Unknown')` → `annotations.get("organism") or annotations.get("source") or "Unknown"` (o bug é que o default `'Unknown'` do primeiro `.get` é truthy e o `or` nunca cai pro `source`; `source` **é** legítimo como alternativa — vem do mesmo tipo de informação, ao contrário de `strain`).
   - **D12d (hospedeiro):** truncar em `;` — normaliza `"Camelus dromedarius; sex: male"` para `"Camelus dromedarius"` sem inventar sinonímia (`"camel"` continua distinto de `"Camelus dromedarius"`: unificar isso exigeria conhecimento taxonômico que não está no dado).
4. Rodar `pytest Backend/tests/unit/test_metadados_cientificos.py -v` — os 6 casos com o decorador `defeito_conhecido` (`xfail(strict=True)`) devem virar `XPASS` (porque a correção os faz passar) → **remover o decorador** desses 6 testes específicos, não o arquivo inteiro (há outros `defeito_conhecido` fora do escopo deste lote — checar `test_paises_do_baseline_de_variola_nao_mapeiam` e `test_tabela_e_pequena_demais_para_o_dominio`, que são D16 puro e também devem cair).
5. Medir D16 de verdade: rodar a introspecção de país→região sobre VARV-49 (48 táxons) antes/depois e produzir a tabela de diff (`% Unknown` deve cair de 97% para próximo de 0%).
6. Golden snapshots: `pattern_analysis_varv6` não deve mudar (não usa metadados de país/região). `metadata_estrutura_varv6` pode precisar de `UPDATE_SNAPSHOTS=1` se a estrutura mudar — conferir que o `xfail` de D15 (vazamento de path) continua sendo o único xfail em metadata.
7. Escrever a tabela de diff no ledger (mesmo formato do DEC-016 acima) e um novo `DEC-018`.
8. `pytest Backend/tests -q` deve fechar em ~83 passed / ~2 xfailed (5 atuais − 6 do D12/D16 que passam a existir de verdade + o que sobrar de D15 e do resto de D12 não coberto por teste ainda).

**Write-lock deste lote:** `Backend/src/utils/treePlot.py`, `Backend/src/app.py` (função `get_node_information` apenas), `Backend/src/data/regions.json` (novo), `Backend/tests/unit/test_metadados_cientificos.py`. **Não toca** `BioComp_UFF/**`.

**Decisão do usuário já dada:** em resposta direta a "corrigir D12+D16 muda os painéis geográficos publicados, preciso do seu aval antes do merge" — usuário respondeu **"aprovado, pode seguir"**. Não é preciso perguntar de novo para fechar este lote.

### DEC-018 · 2026-08-21 · M1.7 **fechado** (D12 a-d + D16) — a geografia de *Variola* é ausente, não desconhecida

Conclui o lote aberto em [DEC-017](#dec-017--2026-08-19--m17-d12d16--lote-aberto-não-commitado-estado-exato-para-retomar), sob a aprovação já registrada ("aprovado, pode seguir"). Os passos 1-3 do plano de retomada já estavam em disco; esta sessão executou os passos 4-8.

**O que foi aplicado.** `map_country_to_region` passa a ler `Backend/src/data/regions.json` (fonte única, UN M49) em vez da tabela de 14 países do estudo de Zika; o `color_map` de `render_annotated_tree` cobre as 19 sub-regiões; e `get_node_information` deixa de fabricar metadado — ano só de `collection_date`, país só de `geo_loc_name`, `organism` com fallback real para `source`, hospedeiro truncado em `;`.

**Vão de cobertura fechado nesta sessão.** A varredura de `geo_loc_name` nos 18 projetos de `BioComp_UFF/projects` achou **68 países distintos**, dos quais **16 ainda caíam em `Unknown`** com o `regions.json` de 2026-08-19 — inclusive `Micronesia, Federated States of`, que é a forma longa do NCBI e nunca casou nem com a tabela antiga (que tinha só `"Micronesia"`). Foram acrescentados 15 países e 2 aliases (`Micronesia, Federated States of` → Micronesia; `Cabo Verde` → Cape Verde). A tabela vai de 121 para **136 países** e de 50 para **52 aliases**.

**Tabela de diff** (protocolo `04-rigor-cientifico §3`) — % de táxons com país classificado em uma sub-região real:

| Conjunto | Países distintos | ANTES (tabela de 14) | DEPOIS | Δ |
|---|---:|---:|---:|---:|
| VARV-49 (`Variola_Yu_li_2007`) | 1 | 0,0% | **100,0%** | +100,0 |
| ZIKV-11 (`..._Medium_11seq`) | 6 | 45,2% | **100,0%** | +54,8 |
| ZIKV-21 (`..._Large_21seq`) | 7 | 40,0% | **100,0%** | +60,0 |
| ZIKV-480 (`..._Large_480seq`) | 54 | 66,8% | **100,0%** | +33,2 |
| **todos os 18 projetos** | **68** | — | **0 não mapeados** | — |

**O achado que muda a leitura do resultado.** Em VARV-49, "0% → 100%" descreve **um único registro** (Kazakhstan): dos 48 táxons, apenas um traz `geo_loc_name`. A varredura por accession em VARV-6 mostra o mesmo padrão — 5 dos 6 registros não têm `geo_loc_name` **nem** a chave legada `country`, só `strain`. Ou seja: os "Bangladesh / Sumatra / Syria" e os anos "1970 / 1972 / 1975" que apareciam em `/insights` **não eram dados do GenBank** — eram o regex de D12b lendo o nome da cepa. A correção não perdeu geografia; ela revelou que a geografia nunca esteve lá.

**Efeito no snapshot `insights_varv6`** (regravado com `UPDATE_SNAPSHOTS=1`, parecer aqui conforme exigido):

| Campo | Antes | Depois | Real? |
|---|---|---|---|
| `countryData` | Bangladesh 1, Sumatra 1, Syria 1, Unknown 3 | Unknown 6 | o "antes" era fabricado do `strain` |
| `metrics.timeSpan` | `1970 - 1975` | `N/A - N/A` | idem |
| `timelineData` | 1970, 1972, 1975, Unknown 3 | Unknown Date 6 | idem |
| `totalNodes`, `uniqueLineages`, `uniqueHosts` | 6, 3, 1 | 6, 3, 1 | inalterado |

**Consequência para o artigo:** todo painel geográfico e toda linha do tempo de *Variola* publicados a partir de `/insights` são **artefato do regex**, não observação. O texto precisa dizer que os genomas de *Variola* do baseline de Li et al. (2007) não carregam `geo_loc_name`/`collection_date` estruturados, e que a procedência, se for reportada, tem de vir da literatura ou do campo `strain` **declarado como tal**.

**Um caso real de dado perdido, e não é D12.** `NC_008030` (*Nile crocodilepox virus*) **tem** `geo_loc_name: Zimbabwe`, `collection_date: 2001` e `host: Nile crocodile`, e mesmo assim sai como `Unknown`. Causa: **D13**. O `metadata.json` contém cada accession `NC_*` sob **dois** rótulos — o truncado em 10 caracteres pelo limite PHYLIP (`NC_008030.`, 10 ocorrências, **0 features**) e o íntegro (`NC_008030.1`, 14 ocorrências, 347 features). `iter_metadata_nodes` deduplica por `newick` e o rótulo truncado e vazio vence. Isso explica também por que `hostData` já era `Unknown 6` **antes** desta correção. Corrigir exige mexer em `iter_metadata_nodes`/`get_metadata_node`, fora do write-lock deste lote — registrado na fila de triagem com esta evidência.

**Portão de regressão.** `test_todo_pais_presente_nos_projetos_mapeia` parametriza os 68 países observados e falha se qualquer um voltar a cair em `Unknown` — é o portão contra a regressão que originou D16 (uma tabela ajustada a um estudo só).

**Evidência de execução:** `pytest Backend/tests` → **153 passed, 1 xfailed** (o xfail remanescente é D15, vazamento de path). Antes do lote: 84 passed, 1 failed (`insights_varv6`), 1 xfailed.

**Write-lock:** `Backend/src/utils/treePlot.py`, `Backend/src/app.py` (`get_node_information`), `Backend/src/data/regions.json`, `Backend/tests/unit/test_metadados_cientificos.py`, `Backend/tests/golden/snapshots/insights_varv6.json`. **Não tocou** `BioComp_UFF/**`. **Reversível:** sim.


### DEC-019 · 2026-08-24 · M1.8 — D13 (metade backend): o metadado de `NC_001611` sempre esteve no arquivo

Primeiro lote da fila aberta por [DEC-018](#dec-018--2026-08-21--m17-fechado-d12-a-d--d16--a-geografia-de-variola-é-ausente-não-desconhecida). D13 tem duas metades: o pipeline **grava** `TaxLabels` truncados em 10 caracteres (limite de nome do PHYLIP, consumido por IQ-TREE e RAxML) e o backend **lê** esses arquivos mal. A primeira metade está no submódulo e segue congelada pela decisão 6; **este lote fecha a segunda**, que não depende dela.

**Diagnóstico — o mecanismo não era o descrito.** `02-defeitos §D13` afirmava que só o bloco `TaxLabels` vinha truncado e que "o rótulo dentro da string da árvore permanece íntegro". **É falso** nos arquivos em disco: no `tree_dataset_final_mafft_iqtree.nexus` de VARV-6 a própria árvore traz `(NC_008030.:0.96191,...)`. O arquivo é internamente **consistente** e inconsistente com os demais — por isso a correção não podia ser "parsear com o próprio namespace e alinhar por rótulo": alinhar por rótulo produziria 9 táxons numa árvore de 6. O documento foi corrigido.

**Onde o metadado real estava.** `iter_metadata_nodes` lia **uma única árvore** — a primeira do `metadata.json`, por `only_first=True`. Em VARV-6 a primeira é `clustalo_raxml`, e nela 3 dos 6 rótulos são truncados e trazem `features` vazio. Varredura do arquivo:

| Acesso | Rótulo lido antes | features | Rótulo íntegro no mesmo arquivo | features |
|---|---|---:|---|---:|
| NC_001611 (**referência de VARV**) | `NC_001611.` | 0 | `NC_001611.1` | 395 |
| NC_008030 | `NC_008030.` | 0 | `NC_008030.1` | 347 |
| NC_008291 | `NC_008291.` | 0 | `NC_008291.1` | 451 |
| DQ437591 / DQ437592 / L22579 | íntegro | 409/411/190 | — | — |

Ou seja: 1.193 *features* do GenBank estavam no arquivo e eram descartadas por se ler só a primeira das 10 árvores.

**O que foi aplicado.**
1. `iter_metadata_nodes` passa a percorrer árvore a árvore guardando, por **acesso sem versão** (`accession_base`), o registro mais rico (`features`, depois `annotations`), e **para na primeira árvore em que nenhum táxon esteja vazio**. Quando a primeira árvore já está completa — todos os projetos de Zika, VARV-49, ZIKV-480 — lê-se exatamente o que se lia antes.
2. `extract_trees_from_nexus` deixa de aceitar um `taxon_namespace` externo: impor o namespace da primeira árvore à segunda era o que fazia o dendropy abortar.
3. `canonical_label_map` reconcilia truncado com íntegro **pelo acesso**, e `align_taxon_namespaces` aceita esse mapa. A reconciliação é recusada — devolvendo `None` — quando dois rótulos da mesma árvore dividem o acesso ou quando os conjuntos de acessos diferem: **nunca funde táxons distintos**, que é o modo de falha silencioso que D13 previa.
4. `/api/tree/compare` passa a recusar explicitamente (400) árvores com conjuntos de táxons diferentes, para que a reconciliação não vire licença para calcular RF sobre folhas que não se correspondem.

**Tabela de diff** (protocolo [`04-rigor-cientifico §3`](04-rigor-cientifico.md#3-protocolo-de-mudança-na-zona-sagrada)):

| Métrica | Antes | Depois | Δ | Afeta número publicado? |
|---|---|---|---|---|
| Pares de árvores que comparam (VARV-6, 45 pares) | 21 | **45** | +24 | **Sim** — nenhuma comparação com IQ-TREE ou RAxML era possível |
| Táxons de VARV-6 com organismo | 3 de 6 | **6 de 6** | +3 | **Sim** |
| `uniqueLineages` (`/insights`) | 3 | **4** | +1 | **Sim** |
| `uniqueHosts` | 1 | **2** | +1 | **Sim** |
| `timeSpan` | `N/A - N/A` | **`2001 - 2001`** | — | **Sim** |
| `countryData` | Unknown 6 | **Zimbabwe 1, Unknown 5** | — | **Sim** |
| `hostData` | Unknown 6 | **Nile crocodile 1, Unknown 5** | — | **Sim** |
| `totalNodes` | 6 | 6 | 0 | não |
| `rf_distance` de FastTree × NJ (par saudável) | 4 | 4 | **0** | não — controle |
| Snapshot `pattern_analysis_varv6` | — | idêntico | **0** | não — controle |
| VARV-49, ZIKV-480 (`/insights`) | — | idênticos | **0** | não — nenhum rótulo truncado |

**Achado que muda a leitura do resultado.** Os dois grupos externos do baseline de Li *et al.* (2007) chegavam ao painel como `Unknown` e eram **indistinguíveis dos genomas de *Variola***. Agora aparecem pelo que são: `NC_008291` = *Taterapox virus*, `NC_008030` = *Nile crocodilepox virus*. Um painel que mostrava "3 linhagens, 6 táxons de organismo majoritariamente desconhecido" descrevia mal um conjunto que é, de fato, 4 genomas de *Variola* mais 2 grupos externos de espécies distintas. `NC_008030` é também o **único** registro do conjunto com geografia e data estruturadas (`Zimbabwe`, `2001`, hospedeiro *Nile crocodile*) — e era exatamente o que DEC-018 registrou como "um caso real de dado perdido, e não é D12". Está recuperado.

**Isso não reabre a conclusão de DEC-018.** Os 4 genomas de *Variola* de VARV-6 continuam **sem** `geo_loc_name` e **sem** `collection_date`. A geografia de *Variola* segue ausente; o que voltou é a geografia de um crocodilo do Zimbábue, que é grupo externo. Todo painel geográfico de *Variola* já publicado continua sendo artefato do regex sobre `strain`.

**Escopo intocado.** Nenhuma mudança em `BioComp_UFF/**`. O caminho `iter_tree=True` (que alimenta `pattern-analysis`) é byte a byte o mesmo — verificado pelo snapshot `pattern_analysis_varv6` e pelo teste de D8: o `continue` do código anterior pulava o `break`, então esse ramo já percorria todas as árvores, e a reescrita preserva isso. `only_first` fica sem efeito e documentado como tal.

**Mudança de contrato.** `/api/tree/compare` devolve **400** para árvores de conjuntos de táxons diferentes, com a lista dos rótulos exclusivos de cada lado. Antes o dendropy recusava esses casos por efeito colateral do namespace compartilhado — o cliente já via erro; agora vê o motivo. `projectExplorer.jsx:408` trata `!response.ok` e cai no modal de erro: nenhuma mudança de frontend é necessária, e os 24 pares que antes caíam nesse modal passam a abrir.

**Oráculo independente.** `Backend/tests/oracle/test_rf_rotulos_truncados.py` recalcula a RF fora do backend: lê a string Newick do Nexus por regex (sem passar pelo leitor de Nexus, que é quem consulta o `TaxLabels` truncado), normaliza os rótulos por conta própria e chama `dendropy.calculate.treecompare.symmetric_difference` sobre árvores não enraizadas. Confere para os 3 pares truncados e para o par de controle, e verifica que o namespace reconciliado tem 6 táxons — se a normalização fundisse dois táxons, o oráculo veria 5.

**Custo.** Mediana de 3 execuções de `build_metadata_index`:

| Conjunto | Antes | Depois | Efeito |
|---|---:|---:|---|
| VARV-6 (28,6 MB, afetado) | 0,00 s | **0,10 s** | lê 3 árvores em vez de 1; recupera 3 táxons |
| VARV-49 (821 MB) | 1,32 s | **1,40 s** | primeira árvore já completa — dentro do ruído |
| ZIKV-480 (1,1 GB) | 1,05 s | **1,02 s** | idem |

O pior caso teórico — um táxon que **nunca** tenha metadado no arquivo — força a leitura completa (~11 s em VARV-49). Não ocorre em nenhum dos 11 projetos varridos, e o resultado do cache é reaproveitado por `mtime`. Registrado na fila de triagem para `P-1`, que é quem tira essa leitura do event loop.

**Reprodução da varredura:** `cd Backend && python scripts/varredura_rotulos_truncados.py` (sem argumentos varre os 9 projetos com `metadata.json` < 100 MB; passe o nome para incluir os grandes).

**Evidência de execução:** `pytest Backend/tests` → **180 passed, 1 xfailed** (antes do lote: 153 passed, 1 xfailed; o xfail é D15). `vitest --run` → 8 passed.

**Write-lock:** `Backend/src/app.py` (`iter_metadata_nodes`, `accession_base`, `_riqueza_metadado`, `build_metadata_index`, `extract_trees_from_nexus`, `leaf_labels`, `canonical_label_map`, `align_taxon_namespaces`, `compare_trees`), `Backend/tests/unit/test_rotulos_truncados.py` (novo), `Backend/tests/oracle/test_rf_rotulos_truncados.py` (novo), `Backend/tests/golden/test_golden_compare.py`, `Backend/tests/golden/test_golden_endpoints.py`, `Backend/tests/golden/snapshots/insights_varv6.json`, `Backend/scripts/varredura_rotulos_truncados.py` (novo), `docs/science/02-defeitos-que-alteram-resultado.md`. **Não tocou** `BioComp_UFF/**`. **Reversível:** sim.

### DEC-020 · 2026-08-24 · **Decisão 6 tomada: escrita liberada no submódulo `BioComp_UFF`**, com lock próprio e histórico separado

Resolve [DEC-011](#dec-011--2026-08-19--pendente--conflito-de-protocolo-sobre-o-submódulo-biocomp_uff), pendente desde 2026-08-19. Escolhida a saída **(a)** de [`08-ficha-de-fatos §6`](08-ficha-de-fatos.md#6-conflito-de-protocolo-detectado-precisa-de-decisão), que era a recomendada.

**Motivo.** A saída (b) — correções em camada de pós-processamento no `Backend/` — institucionaliza exatamente o defeito [D5](../science/02-defeitos-que-alteram-resultado.md#d5): dois universos de identidade paralelos, um no pipeline e outro na API. A (c), absorver o submódulo, é decisão de produto e muda o modelo de distribuição.

**Termos.**
- Write-lock próprio para `BioComp_UFF/**`; **um lote não toca os dois repositórios**.
- Nenhum commit e nenhum push no submódulo sem pedido explícito — [DEC-003](#dec-003--2026-07--nenhum-commit-sem-pedido-explícito-do-usuário) vale igual nos dois históricos.
- O submódulo já tinha trabalho não commitado antes deste lote (`workflow/stability/`, `docs/`, READMEs): o `git status` de lá **não** é linha de base limpa e isso precisa ser considerado ao commitar.
- [`02-protocolo §3`](02-protocolo-de-orquestracao.md#3-write-lock-por-arquivo) atualizado.

**Consequência.** Destrava **M1.1, M1.2, M1.3, M2 inteiro e M3.1-M3.2** — as correções D3, D4, D5 e D10, que são metade das correções científicas. O caminho crítico da submissão (M0→M1→M2→M3→M6) volta a andar. **Reversível:** sim (nada commitado).

---

### DEC-021 · 2026-08-24 · M1.1 — D4: o `support` do FPMax deixa de ser o limiar da varredura

Primeiro lote executado sob DEC-020. Escopo: **só** `BioComp_UFF/workflow/subtree_mining/miner.py` e o teste correspondente. Nenhum arquivo de `Backend/` tocado.

**O defeito, na linha que o produzia.** `process_group`, modo `auto`, varria `np.arange(0.1, 1.1, 0.1)` e fazia `result_fpmax['support'] = support` — jogando fora o suporte devolvido pelo mlxtend e gravando o **limiar** no lugar. A coluna `support` do `all_results_fpmax.csv` nunca foi suporte.

**O que foi aplicado.**
1. A coluna `support` preserva o valor do mlxtend: a fração de árvores que contém o itemset.
2. O limiar da varredura vai para coluna própria, `min_support_threshold`, arredondado a 2 casas (a grade produzia `0.30000000000000004` no CSV).
3. `consolidate_fpmax_results` (novo, estático) deduplica por itemset ao fim da varredura e grava `support`, `min_support_threshold`, `max_support_threshold` e `n_trees`, em ordem determinística (suporte ↓, tamanho ↓, limiar ↑). O suporte é propriedade do itemset e não do limiar, então deduplicar **não perde informação** — e a função avisa no log se algum itemset aparecer com suportes divergentes entre limiares, o que não deve acontecer.
4. O modo de suporte fixo passa a gravar as mesmas colunas — antes o CSV fixo não tinha nem o limiar registrado.
5. `find_exact_subsets` passa a acumular em `subtree_data['supports']` (que vai para o `metadata.json` e para o grafo) o **suporte real**, não a lista de limiares em que o clado apareceu.

**Tabela de diff** — recomputada sobre a matriz de subárvores real de cada experimento, sem reexecutar bioinformática. As colunas "linhas", ">1 suporte" e "2 tabelas" reproduzem exatamente os números publicados em [`02-defeitos §D4`](../science/02-defeitos-que-alteram-resultado.md#d4), o que valida a reconstrução:

| Experimento | M | Linhas no CSV | Itemsets distintos | Com >1 "suporte" | Nas **duas** tabelas | Frágeis (≤0,3) | Robustos (≥0,6) |
|---|---:|---|---:|---|---|---|---|
| VARV-49 | 8 | 16 → **7** | 7 | 7 → **0** | 2 → **0** | 6 → **4** | 1 → 1 |
| VARV-52 | 9 | 20 → **13** | 13 | 7 → **0** | 2 → **0** | 10 → **5** | 1 → 1 |
| VARV-121 | 8 | 20 → **11** | 11 | 7 → **0** | 2 → **0** | 9 → **6** | 1 → 1 |
| VARV-6 | 10 | 12 → **6** | 6 | 6 → **0** | 1 → **0** | 6 → **5** | 0 → 0 |

**Oráculo independente — Δ = 0 em 37 de 37 itemsets.** `audit_variola.py --secao 5` reconstrói o suporte verdadeiro a partir do CSV antigo (o menor `k` tal que `k/M ≥` maior limiar observado). O `n_trees` que o miner corrigido grava **coincide com essa reconstrução em todos os itemsets dos quatro experimentos**:

| Experimento | Itemsets | Suporte idêntico ao oráculo |
|---|---:|---|
| VARV-49 | 7 | **7/7** |
| VARV-52 | 13 | **13/13** |
| VARV-121 | 11 | **11/11** |
| VARV-6 | 6 | **6/6** |

É o critério de aceite declarado para M1 em [`10-marcos-e-metas §3`](10-marcos-e-metas.md#3-m1--verdade-dos-números): *"o pipeline de produção passa a concordar com o script"*. Para D4, passa.

**Achado sobre a semântica do FPMax, que D4 apagava.** Limiar e suporte não variam juntos: no caso de teste, o itemset `{A}` tem suporte 1,0 e **só** é devolvido a partir do limiar 0,6 — abaixo disso ele não é *maximal*, porque `{A,B}` e `{A,D}` ainda são frequentes. Confundir os dois números não era só impreciso; era uma inversão em parte da faixa.

**O que este lote NÃO faz.** Os `all_results_fpmax.csv` **já em disco continuam errados** — a correção é do pipeline, e os artefatos só mudam quando o experimento for reexecutado (decisão 5: corrigir e re-rodar). Enquanto isso, `/api/tree/pattern-analysis` sobre projeto antigo segue exibindo o limiar como suporte. Consequência registrada na fila de triagem.

**Evidência de execução:**
```
cd BioComp_UFF && python -m unittest workflow.tests.test_subtree_mining   → Ran 10 tests, OK
cd BioComp_UFF && python -m unittest workflow.tests.test_stability        → Ran 16 tests, OK
cd Backend     && pytest tests                                           → 180 passed, 1 xfailed
```

**Write-lock:** `BioComp_UFF/workflow/subtree_mining/miner.py`, `BioComp_UFF/workflow/tests/test_subtree_mining.py` (novo). **Não tocou** `Backend/**`. **Reversível:** sim.

### DEC-022 · 2026-08-24 · M1.2 — D5: o pipeline passa a usar a identidade canônica de clado

Segundo lote sob [DEC-020](#dec-020--2026-08-24--decisão-6-tomada-escrita-liberada-no-submódulo-biocomp_uff-com-lock-próprio-e-histórico-separado). Escopo: `BioComp_UFF/**` apenas.

**O defeito.** `encode_list_to_int` calculava MD5 de 16 bits sobre `str(lista_de_hashes)` — a representação textual da lista **na ordem de travessia**. Dois efeitos somados e opostos: o mesmo clado recebia identificadores diferentes em árvores que ordenam filhos de modo distinto (**subestima** o suporte), e clados distintos colidiam em 65 536 valores (**fabrica** suporte). A identidade correta já existia em `workflow/stability/clade_identity.py` e o pipeline nunca a usou — os *dois universos de identidade paralelos* que o próprio D5 descreve.

**O que foi aplicado.**
1. `canonical_item_id` (novo, em `clade_identity.py`): o digest canônico de 128 bits truncado em `ITEM_ID_BITS`, para uso onde a identidade precisa ser inteiro — chave do `metadata.json`, item do FPMax, propriedade de nó no Neo4j.
2. `encode_clade_to_int` (novo, em `treeUtils.py`): identidade de clado a partir dos **nomes** dos terminais, normalizados, em qualquer ordem. `SubtreeBuilder.build` passa a gravá-la em `List_terminals_hash`.
3. O valor legado continua gravado, agora em `List_terminals_hash_legacy`, e **nunca** é usado como item — é o que D5 pede: `legacy` só para auditoria.
4. `strip_accession_version` **mudou de módulo**: sai de `stability.py` e vai para `clade_identity.py`, reexportado no lugar antigo (`audit_variola.py` e `TreeSet` seguem importando de onde importavam). Normalizar o rótulo *é* parte de decidir a identidade; deixar as duas decisões em módulos diferentes é como o projeto chegou a ter dois universos.
5. `calculate_tree_hash` passa a hashar o rótulo **normalizado**, que é também o que grava em `newick`.

**Por que 52 bits e não 128.** O consumidor mais estreito da cadeia manda: o identificador viaja no JSON da API até o navegador, e `Number` do JavaScript só é exato até 2^53 − 1. Um id de 60 ou 128 bits seria **arredondado no cliente** — trocar colisão de 16 bits por arredondamento silencioso não é correção. 52 bits dão 4,5 × 10¹⁵ valores (contra 65 536), cabem no inteiro de 64 bits com sinal do Neo4j e mantêm a colisão em ~10⁻⁶ mesmo com 10⁵ clados — três ordens de grandeza acima do maior experimento atual. Está fixado por teste, não por comentário.

**Tabela de diff** — identidade recomputada sobre as **mesmas árvores em disco**, com a regra do `builder` (todo clado com mais de um terminal):

| Experimento | M | Itens distintos | Clados canônicos (oráculo) | Fragmentados (oráculo) | Padrões (itemsets) |
|---|---:|---|---:|---|---|
| VARV-49 | 8 | 155 → **101** | 100 + raiz | 41 (40,6%) → **0** | 7 → **9** |
| VARV-52 | 9 | 194 → **120** | 119 + raiz | 52 (43,3%) → **0** | 13 → **20** |
| VARV-121 | 8 | 405 → **270** | 269 + raiz | 96 (35,6%) → **0** | 11 → **22** |
| VARV-6 | 10 | 20 → **11** | 10 + raiz | 6 (54,5%) → **0** | 6 → **7** |

O número de itens distintos **bate exatamente** com a contagem de clados canônicos de `audit_variola.py --secao 5` em todos os quatro, com a diferença de 1 explicada e esperada: `clade_identities` exclui o clado universal e o `builder` o inclui. A fragmentação vai a zero por construção — a identidade é o conjunto de terminais.

**O número que muda a leitura do resultado.** O padrão de maior suporte que o FPMax reportava:

| Experimento | Antes | Depois |
|---|---|---|
| VARV-49 | **1 clado** a 6/8 | **16 clados a 8/8** |
| VARV-52 | 1 clado a 7/9 | **13 clados a 9/9** |
| VARV-121 | 4 clados a 6/8 | **32 clados a 8/8** |
| VARV-6 | 1 clado a 4/10 | 1 clado a **10/10** |

D5 previa "a verdade é 15 clados a 8/8" para VARV-49 a partir do reticulado exato; o pipeline corrigido devolve 16 — os 15 mais o clado universal, que o `builder` conta. **Confere.** O núcleo de concordância entre pipelines nunca foi de um clado: era de dezenas, e a identidade de 16 bits o pulverizava.

**Efeito colateral verificado: `decode_tree_hash` volta a funcionar.** Ele comparava o hash do rótulo **bruto** (`NC_008030.1`) com o do rótulo **gravado** (`NC_008030`): a conferência de integridade devolvia `None` para todo acesso versionado, ou seja, sempre. Passou a fechar porque hash e valor gravado agora são da mesma string. Não era item de D5 — apareceu ao unificar a normalização.

**Encontro com D13.** Como a identidade sai de nomes normalizados, `NC_008030.` (IQ-TREE/RAxML, truncado pelo limite do PHYLIP) e `NC_008030.1` (FastTree) passam a designar o mesmo terminal. Parte do ganho de suporte da tabela acima vem daí: clados que só diferiam pela grafia do rótulo deixaram de ser itens distintos.

**O que este lote NÃO faz.** Os `metadata.json` e `all_results_fpmax.csv` **em disco continuam com a identidade legada**. Nada nas páginas atuais muda até o experimento ser reexecutado (decisão 5). Artefato antigo e artefato novo não são comparáveis item a item — o `List_terminals_hash_legacy` existe exatamente para permitir essa ponte quando for preciso.

**Evidência de execução:**
```
cd BioComp_UFF && python -m unittest workflow.tests.test_tree_identity     → Ran 19 tests, OK
                  python -m unittest workflow.tests.test_subtree_mining    → Ran 10 tests, OK
                  python -m unittest workflow.tests.test_stability         → Ran 16 tests, OK
                  python ../docs/science/scripts/audit_variola.py --secao 5 → roda, números do 'antes' inalterados
cd Backend     && pytest tests                                            → 180 passed, 1 xfailed
```

**Write-lock:** `BioComp_UFF/workflow/stability/clade_identity.py`, `BioComp_UFF/workflow/stability/stability.py`, `BioComp_UFF/workflow/utils/treeUtils.py`, `BioComp_UFF/workflow/subtree_construction/builder.py`, `BioComp_UFF/workflow/tests/test_tree_identity.py` (novo). **Não tocou** `Backend/**`. **Reversível:** sim.

### DEC-023 · 2026-08-24 · M1.3 — D3: a unidade de comparação passa a ser a bipartição, e **M1 fecha**

Terceiro e último lote de M1 sob [DEC-020](#dec-020--2026-08-24--decisão-6-tomada-escrita-liberada-no-submódulo-biocomp_uff-com-lock-próprio-e-histórico-separado).

**O defeito, em duas camadas.** `clade_sets` guardava clados **enraizados** e `rf_matrix` os comparava entre pipelines. FastTree, IQ-TREE, RAxML e NJ emitem topologia **não enraizada**, escrita em Newick com raiz trifurcante: o clado que se lê do arquivo depende de onde a ferramenta pôs a raiz, que é convenção de escrita e não hipótese biológica. Só o UPGMA tem raiz real. Somado a isso, a normalização dividia por `2(n−2)` — o máximo para árvore enraizada —, quando sobre bipartições o máximo é `2(n−3)`, o que deslocava todo valor normalizado.

**O que foi aplicado.**
1. `canonical_bipartition` (novo, em `clade_identity.py`): o lado de menor cardinalidade, desempate lexicográfico, `None` para bipartição trivial — a definição formal de [`03-metricas §2.2`](../science/03-metricas.md#22-bipartição-árvore-não-enraizada), agora em produção.
2. `StabilityAnalyzer` ganha `rooted: bool = False`. **O padrão passa a ser a bipartição.** A análise enraizada continua acessível com `rooted=True` e continua legítima quando a raiz é real — mas exige enraizamento comum e explícito, nunca a raiz do arquivo.
3. `rf_matrix` escolhe o denominador pelo enraizamento: `2(n−3)` não enraizada, `2(n−2)` enraizada.
4. **"Não aplicável" deixa de ser um número** ([`04-rigor §3`](04-rigor-cientifico.md)): a RF é `None` quando indefinida — não enraizada exige `n ≥ 4`, enraizada `n ≥ 3`. A diagonal continua `0`. Devolver `0` faria topologias incomparáveis passarem por idênticas. `factor_effects` ignora pares indefinidos e devolve `None` em vez de `0.0` para grupo vazio; `report.py` grava célula vazia no CSV e "—" no heatmap.
5. `bipartition_counts()` (novo): `|B(T)|` por pipeline, que [`03-metricas §3`](../science/03-metricas.md#3-distância-de-robinsonfoulds) exige ao lado de toda RF — sem ele, um valor baixo é ambíguo entre "topologias parecidas" e "árvore malresolvida".

**Tabela de diff** — reproduz exatamente a tabela publicada em [`02-defeitos §D3`](../science/02-defeitos-que-alteram-resultado.md#d3):

| Experimento | Par | RF enraizada | RF bipartição | Δ |
|---|---|---:|---:|---:|
| VARV-6 | fasttree × iqtree | 0,7500 | **0,0000** | **−100%** |
| VARV-6 | iqtree × raxml | 0,7500 | **0,0000** | **−100%** |
| VARV-6 | fasttree × upgma | 0,8750 | 0,3333 | −61,9% |
| VARV-52 | fasttree × iqtree | 0,2600 | **0,0204** | **−92,2%** |
| VARV-121 | fasttree × iqtree | 0,1765 | **0,0508** | **−71,2%** |
| VARV-49 | fasttree × iqtree | 0,0851 | 0,0435 | −48,9% |
| VARV-49 | fasttree × nj | 0,5532 | 0,5652 | +2,2% |

O sinal misto é a evidência de que a correção não é um redutor cego: entre métodos que produzem topologia genuinamente diferente (fasttree × nj), a distância **sobe** — o denominador menor pesa mais que os clados reconciliados.

**Clados universais — o que aparece quando se para de medir a raiz:**

| Experimento | Enraizado | Bipartição |
|---|---:|---:|
| VARV-6 | **0** | **1** |
| VARV-49 | 15 | **18** |
| VARV-52 | 12 | **17** |
| VARV-121 | 31 | **36** |

Os "0 clados universais" de VARV-6 — um conjunto em que três métodos produzem a **mesma** topologia — eram o sintoma mais visível de D3. `02-defeitos` previa "tornam-se 1 bipartição universal". Confere.

**Todas as árvores estão totalmente resolvidas.** `bipartition_counts()` devolve `n−3` para **todo** pipeline dos quatro experimentos (3, 46, 49 e 118). Não há politomia, então a normalização por `n−3` não subestima nada — a ressalva de `03-metricas §3` fica registrada como verificada, não como suposta.

**Oráculo externo — 137 pares, 0 divergências.** [`docs/science/scripts/oraculo_rf_dendropy.py`](../science/scripts/oraculo_rf_dendropy.py) (novo) recalcula a RF de todos os pares com `dendropy.calculate.treecompare.symmetric_difference` sobre árvores lidas com `rooting='force-unrooted'`, sem passar por nenhuma linha do pipeline, e confronta com `rf_matrix`:

| Experimento | Pares | Divergências |
|---|---:|---:|
| VARV-6 | 45 | **0** |
| VARV-49 | 28 | **0** |
| VARV-52 | 36 | **0** |
| VARV-121 | 28 | **0** |

O script precisa contornar D13 para funcionar — ler todos os Nexus num namespace compartilhado faz o dendropy abortar, porque o `TaxLabels` de IQ-TREE e RAxML diverge do dos demais. Cada arquivo é lido isolado e os rótulos são normalizados antes de reunir. É a mesma manobra que M1.8 fez no backend.

**`audit_variola.py` §3 agora é um confronto de três colunas** — RF enraizada (o "antes", pedido explicitamente com `rooted=True`), RF de bipartição pela reimplementação independente do próprio script, e o valor que a produção devolve —, mais a contagem de divergências. A independência do oráculo é preservada: `canonical_split` continua sendo a implementação do script, não a importada da produção.

**O que este lote NÃO faz.** Não enraíza nada. A análise enraizada legítima — grupo externo declarado, comum a todos os métodos — é **M2.3** e depende das decisões 2, 3 e 4. Até lá, a unidade de comparação é a bipartição, e é o que a regra de [`03-metricas §2.2`](../science/03-metricas.md#22-bipartição-árvore-não-enraizada) determina enquanto o pipeline misturar métodos enraizados e não enraizados.

**Evidência de execução:**
```
cd BioComp_UFF && python -m unittest workflow.tests.test_rf_bipartition   → Ran 15 tests, OK
                  (test_stability, test_subtree_mining, test_tree_identity) → 60 tests no total, OK
                  python ../docs/science/scripts/oraculo_rf_dendropy.py    → 137 pares, 0 divergências
                  python ../docs/science/scripts/audit_variola.py --secao 3 → 0 divergência(s) em todos
cd Backend     && pytest tests                                            → 180 passed, 1 xfailed
```

**Write-lock:** `BioComp_UFF/workflow/stability/clade_identity.py`, `.../stability.py`, `.../report.py`, `BioComp_UFF/workflow/tests/test_rf_bipartition.py` (novo), `docs/science/scripts/audit_variola.py`, `docs/science/scripts/oraculo_rf_dendropy.py` (novo). **Reversível:** sim.

---

### M1 — **MARCO FECHADO** · 2026-08-24

Os oito lotes de M1 estão concluídos. Resumo do que mudou de verdade, e como cada um foi conferido contra oráculo independente:

| Lote | Defeito | Trilha | Confronto |
|---|---|---|---|
| M1.1 | D4 — `support` era o limiar | T1 | `audit_variola --secao 5`: **Δ = 0 em 37/37 itemsets** |
| M1.2 | D5 — identidade de 16 bits, dependente da ordem | T1 | contagem de clados canônicos bate nos 4 experimentos |
| M1.3 | D3 — clado enraizado como unidade de comparação | T1 | dendropy: **137 pares, 0 divergências** |
| M1.4 | D7 — truncamento silencioso por `max_pattern_size` | T2 | DEC-016 |
| M1.5 | D8 — `tree_coverage` um-para-um | T2 | DEC-016 |
| M1.6 | D9 — `unique_signatures_count` sempre 0 | T2 | DEC-016 |
| M1.7 | D12 + D16 — metadado fabricado do `strain`; país/região | T2 | DEC-018 |
| M1.8 | D13 (backend) — leitura descartava o registro do GenBank | T2 | dendropy nos pares truncados; DEC-019 |

**Gate de M1.** Os três comandos de [`10-marcos-e-metas §3`](10-marcos-e-metas.md#3-m1--verdade-dos-números) foram satisfeitos na forma que os artefatos atuais permitem: produção e oráculo concordam (itens 1 e 2, acima); nenhum golden snapshot mudou por acidente (item 3 — `pattern_analysis_varv6` idêntico, `insights_varv6` alterado com parecer registrado em DEC-019). O `compare_oracle.py` citado no gate não existe; seu papel é cumprido por `audit_variola.py --secao 3/5` e por `oraculo_rf_dendropy.py`.

**A ressalva que não pode ser omitida.** M1 corrigiu o **pipeline**. Os artefatos em `BioComp_UFF/projects/**` continuam sendo os antigos: identidade legada de 16 bits, `support` com o limiar, RF enraizada nos relatórios já gravados. **Nenhum número exibido hoje na aplicação mudou.** O que M1 garante é que a próxima execução produz o número certo — e é a reexecução (decisão 5, já aprovada) que materializa isso. Enquanto ela não acontece, artefato antigo e novo não são comparáveis item a item.

**Próximo passo do caminho crítico: M2**, bloqueado pelas decisões **2** (VARV-121 fica ou sai), **3** (VARV-6 fica ou sai) e **4** (UPGMA fica ou sai).

### DEC-024 · 2026-08-24 · Decisões 2, 3 e 4 tomadas: **os três conjuntos ficam, o UPGMA fica**

Com [DEC-018](#dec-018--2026-08-21--m17-fechado-d12-a-d--d16--a-geografia-de-variola-é-ausente-não-desconhecida) (decisão 5) e [DEC-020](#dec-020--2026-08-24--decisão-6-tomada-escrita-liberada-no-submódulo-biocomp_uff-com-lock-próprio-e-histórico-separado) (decisão 6), **M2 deixa de estar bloqueado**. Segue aberta apenas a decisão 1, que só importa depois de M3.

| # | Decisão | Resposta | Motivo do usuário |
|---|---|---|---|
| **2** | VARV-121 fica ou sai | **Fica** | Histórico de experimentos — permite ver a evolução e os ajustes do workflow |
| **3** | VARV-6 fica ou sai | **Fica** | Serve de demo didático |
| **4** | UPGMA fica ou sai | **Fica**, com a recomendação aceita: reportar **com e sem** | O objetivo do projeto é uma biblioteca com diversas opções de ferramentas para o pipeline |

**Por que o UPGMA chegou a ser cotado para sair** — a pergunta do usuário, respondida a partir de [`01-revisao-variola §12`](../science/01-revisao-variola.md) e [`03-metricas §4`](../science/03-metricas.md): o UPGMA supõe **ultrametricidade**, isto é, taxa de evolução constante em todas as linhagens (relógio molecular). O conjunto de *Variola* atravessa gêneros — vai de VARV a *Nile crocodilepox* — e essa suposição é falsa ali por construção. O UPGMA então produz uma topologia sabidamente errada, e como o suporte metodológico é "em quantos dos M pipelines o clado aparece", incluir um método cujo pressuposto é violado **infla artificialmente a discordância medida**. O argumento nunca foi "o UPGMA é ruim": foi que ele contamina o denominador. Mantê-lo e reportar `sup` com e sem ele resolve — a sensibilidade da métrica ao conjunto de pipelines vira uma limitação declarada, que é mais forte que escondida. É também o único método enraizado do conjunto, o que o torna o caso que **D3** tratava errado; com M1.3 fechado, comparar UPGMA com os demais passou a ser legítimo, via bipartição.

**Consequência para M2.** A composição-alvo do dataset de referência não muda por estas decisões: os três conjuntos permanecem publicáveis e VARV-49-clean continua sendo o de referência. O que muda é o enquadramento — VARV-121 e VARV-6 passam a ter papel declarado (escala e demonstração didática), em vez de figurarem como replicações concorrentes.

**Atualiza:** DM-6 e DM-11 em [`06-decisoes-metodologicas`](../science/06-decisoes-metodologicas.md); [`08-ficha-de-fatos §5`](08-ficha-de-fatos.md).

---

### DEC-025 · 2026-08-24 · [D17](../science/02-defeitos-que-alteram-resultado.md#d17) — o RAxML **roda** nos dados de *Variola*; o que quebrava era `--threads auto`

Investigação motivada por um ponto de atenção do usuário: em árvores muito grandes alguns algoritmos não rodavam, por estouro de memória ou limitação do algoritmo, sem saber se a causa era erro de implementação dele.

**Resposta curta: não foi erro de implementação, e em um dos dois casos não foi limitação do algoritmo.** São duas falhas de natureza distinta, que a memória juntou:

**1. Clustal Omega — estouro de memória real.** `Non-zero return code 137` com `message 'Killed'` no conjunto Zika479: o *OOM killer* do kernel matou o processo. É limite de recurso genuíno, e o pipeline **já o trata** — `_isExecutableByClustalO` troca para MAFFT acima de 20 kb por sequência. O defeito ali não é a falha, é a **substituição silenciosa** ([D1](../science/02-defeitos-que-alteram-resultado.md#d1)): o arquivo continua sendo nomeado `*_clustalo_*`.

**2. RAxML-NG — não foi memória, e não é limitação do algoritmo.** Em VARV-52 o processo morreu com `SIGSEGV` (sinal 11) após a autoconfiguração escolher `5 workers × 3 threads`. O alinhamento de 52 táxons e 259 496 sítios comprime para **3 713 padrões**: a necessidade de memória é de dezenas de MB, não de gigabytes. Reexecutado nesta máquina com o **mesmo arquivo e a mesma linha de comando**, escolheu `2 workers × 3 threads` e **concluiu em 251 s**.

**Dimensão que realmente pesa.** Não é o número de táxons — é o comprimento do alinhamento, e ainda assim só até a compressão de padrões:

| Conjunto | Táxons | Colunas | Células | RAxML |
|---|---:|---:|---:|---|
| VARV-6 | 6 | 250 517 | 1,5 M | rodou |
| VARV-49 | 49 | 235 955 | 11,6 M | excluído do `ignore_mode` |
| VARV-52 | 52 | 259 496 | 13,5 M | **SIGSEGV** → excluído |
| VARV-121 | 121 | 283 874 | 34,3 M | excluído do `ignore_mode` |
| ZIKV-480 | **478** | 10 816 | 5,2 M | **rodou** |

478 táxons de Zika rodam; 52 de *Variola* quebravam. A diferença é o comprimento do genoma (~10,8 kb contra ~250 kb), não a quantidade de folhas.

**Achado colateral, e é o mais sério: a semente fixa não garante reprodutibilidade.** Duas execuções na mesma máquina, mesmo arquivo, **mesma semente `12345`**, variando só a paralelização, produzem **RF = 8** entre si — quatro bipartições de diferença — com verossimilhanças praticamente idênticas (−591486,234 e −591486,233). São dois ótimos quase equivalentes, e o esquema de paralelização decide em qual a busca para. Como o esquema depende do número de núcleos, **a mesma análise em outra máquina dá outra árvore**. Isso torna o item *"cada figura reproduzível por script + commit + hash"* do checklist de submissão inatingível enquanto `--threads auto` estiver na linha de comando, e se soma a [D11](../science/02-defeitos-que-alteram-resultado.md#d11).

**Ações que isto abre.**
1. **Fixar `--threads N --workers 1`** e registrar `N`, a versão do RAxML-NG e o esquema efetivo no manifesto — entra em **M2.5**. Custo medido de abrir mão do `auto`: ~10% de tempo (251 s → 276 s).
2. **Reverter a exclusão do RAxML** em VARV-49, VARV-52 e VARV-121, devolvendo `M` de 4 para 5 e eliminando a incomparabilidade de `M` entre experimentos (DM-11) — depende de reexecutar, decisão 5 já aprovada.
3. Registrar a divergência de versão do RAxML-NG entre máquinas (**1.2.2** na de origem, **1.1.0** nesta), que se soma à do FastTree (2.2.0 × 2.1.11) já conhecida e continua bloqueando a replicação exata.

**Evidência:** `.raxml.log` da execução que quebrou, em `projects/test_variola_noITRs_57_Complete/out/tmp/raxml_*/`; duas execuções de reprodução nesta máquina com `--threads auto` e `--threads 4 --workers 1`; `dendropy.symmetric_difference` entre as duas árvores resultantes. **Nenhum código foi alterado neste lote** — é parecer sobre artefatos e sobre reprodução controlada.

### DEC-026 · 2026-08-24 · Biblioteca de contexto para a **máquina de validação** — `CLAUDE.md` e handoff

**Contexto do usuário:** o desenvolvimento fica nesta máquina e **a execução pesada será feita em outra**, com mais recursos, para validação e teste de estresse. Uma janela de contexto que abrir lá precisa saber o necessário para validar sem redescobrir nada.

**O que faltava.** O repositório **não tinha `CLAUDE.md`** — o arquivo que um agente carrega automaticamente ao abrir o projeto. Toda a memória externa estava em `docs/`, excelente, mas dependia de alguém saber que ela existe e por onde entrar. Era o achado de triagem de 2026-07-29 ("repositório sem `CLAUDE.md`"), ainda aberto.

**O que foi criado.**
1. **`CLAUDE.md`** na raiz: por onde começar (ficha de fatos → ledger → marcos → defeitos), as sete regras invioláveis, o layout, os comandos de verificação com os números esperados, e as armadilhas que custam uma sessão inteira se descobertas na hora errada — o namespace compartilhado que o D13 derruba, o `--threads auto` de D17, os artefatos em disco serem anteriores a M1, e o submódulo já vir sujo.
2. **[`11-handoff-maquina-de-validacao.md`](11-handoff-maquina-de-validacao.md)**: a ponte entre as duas máquinas. Traz o ambiente medido desta (com um espaço para registrar o da outra), as **divergências de versão** que bloqueiam replicação exata, um portão de sanidade que roda em minutos com os números esperados linha a linha, e o que espera máquina grande — reexecução dos experimentos com os seis critérios de conferência, devolução do RAxML, e cinco perguntas de estresse ainda sem resposta, cada uma com como medir.
3. Ambos ligados a partir de [`docs/README.md`](../README.md) e do índice de `automation/`.

**Reversível:** sim — é documentação.

---

### DEC-027 · 2026-08-24 · M2.5 — manifesto de execução, e a semente deixa de ser da ferramenta

Primeiro lote de **M2**, escolhido por ser o que torna **verificável** todo o trabalho pesado que a outra máquina vai fazer. Não exige execução pesada.

**O problema.** Os `config_backup.json` guardam parâmetros e mais nada: nem versão de ferramenta, nem commit, nem semente efetiva, nem hash de entrada. É [D11](../science/02-defeitos-que-alteram-resultado.md#d11), e é o que torna inatingível o item *"cada figura reproduzível por script + commit + hash"*. Somado a [D17](../science/02-defeitos-que-alteram-resultado.md#d17) — a paralelização muda a topologia —, o resultado é que **duas máquinas rodando o mesmo comando produzem árvores diferentes e nada no artefato registra por quê.**

**O que foi aplicado.**

1. **`workflow/utils/manifest.py`** (novo). `ExecutionManifest` grava `out/outputs/manifest.json` com: `run_id`, início e fim em UTC, **commit/ramo/sujo dos dois repositórios**, ambiente (sistema, arquitetura, núcleos, memória, Python), versão de **todas** as sete ferramentas externas, semente e paralelização efetivas, e SHA-256 de entradas e saídas.
2. **Gravado antes de rodar**, e de novo em `finally`. Uma execução que morre no meio — e D17 mostra que morre — deixa um manifesto que diz em que ambiente ela morreu.
3. **RAxML-NG pinado**: `--threads N --workers 1` no lugar de `--threads auto`, com a razão medida no comentário.
4. **IQ-TREE ganha `-seed`**: sem ele a ferramenta gerava a própria semente (nos logs de VARV, `97376`) e reexecutar não reproduzia a árvore. `-nt AUTO` vira `-nt N` pelo mesmo motivo de D17.
5. **`reproducibility_settings`** é a fonte única desses valores: o builder e o manifesto leem da mesma função, e um teste falha se divergirem. Padrões: semente `12345`, 4 threads para cada inferência, sobrescrevíveis pelo `tree_config`.

**Regra de privacidade, aplicada por teste.** O manifesto vai para o repositório e pode ir para o material suplementar. Ele **não** grava *hostname*, usuário nem caminho absoluto — todo caminho é relativo à raiz do projeto. É [D15](../science/02-defeitos-que-alteram-resultado.md#d15) tratado na origem, em vez de vazar de novo por um artefato novo.

**Ausente é `None`.** `mrbayes` não está no PATH desta máquina e o manifesto grava `"mrbayes": null` — não string vazia, não "desconhecida". Uma ferramenta que não existe é um fato do experimento.

**Dois defeitos encontrados e corrigidos dentro do próprio lote:**
- A poda de `out/tmp` testava `"/tmp" in caminho_absoluto`, o que descartava **todo** projeto guardado sob um diretório chamado `tmp` — inclusive todo diretório temporário de teste. Passou a podar pelo nome do subdiretório durante a travessia.
- `FastTree` invocado sem argumentos **lê a entrada padrão** e ficava bloqueado até o timeout: coletar versões custava **300 s**. Com `stdin=DEVNULL` e cache, custa **0,05 s**. Seria uma regressão séria no início de toda execução na máquina de validação.

**Exemplo do que passa a existir** (execução real desta máquina):

```json
"reproducibility": {"iqtree_threads": 4, "random_seed": 12345, "raxml_threads": 4},
"tools_available": {"FastTree": "2.1.11", "clustalo": "1.2.4", "iqtree2": "2.2.2.6",
                    "mafft": "v7.490", "mrbayes": null, "muscle": "v3.8.1551",
                    "raxml-ng": "1.1.0"},
"git": {"BioComp_UFF": {"branch": "main", "commit": "cfa2af4…", "dirty": true}, …}
```

O `dirty: true` é informação, não defeito: diz que a execução saiu de uma árvore de trabalho com mudanças não commitadas, o que é exatamente o estado atual do projeto.

**Nota sobre `num_threads`.** Já existia no `tree_config`, mas governa só o **alinhamento** (`mafft --thread`, `clustalo --threads`) — os projetos usam de 1 em VARV a 16 em ZIKV-480. Inferência e alinhamento têm perfis de paralelismo diferentes, então as chaves novas são separadas, e isso está documentado ao lado do padrão.

**O que este lote NÃO faz.** Não gera manifesto para os experimentos **já executados** — não há como: as versões e sementes daquelas execuções não foram registradas, e é justamente o buraco que D11 descreve. Os projetos existentes seguem sem manifesto até serem reexecutados.

**Evidência de execução:**
```
cd BioComp_UFF && python -m unittest workflow.tests.test_manifest   → Ran 17 tests, OK (0,05 s)
                  (suíte completa do submódulo)                     → Ran 77 tests, OK
                  python -m py_compile workflow.py                  → ok
cd Backend     && pytest tests                                      → 180 passed, 1 xfailed
```

**Write-lock:** `BioComp_UFF/workflow/utils/manifest.py` (novo), `BioComp_UFF/workflow/tests/test_manifest.py` (novo), `BioComp_UFF/workflow/tree_construction/builder.py`, `BioComp_UFF/workflow.py`. **Reversível:** sim.

### DEC-028 · 2026-08-25 · **Zika-21 é o conjunto de validação do workflow**, e a primeira execução achou [D18](../science/02-defeitos-que-alteram-resultado.md#d18)

**Decisão do usuário:** `Zika_Virus_Singapura_Large_21seq` passa a ser o conjunto usado sempre que for preciso validar o workflow, com todas as combinações de alinhador e método de inferência — ou a configuração que melhor se adeque ao teste.

**Por que é uma boa escolha, além do tamanho.** 20 táxons e ~10,8 kb rodam em minutos, o que permite validar a cada mudança em vez de uma vez por mês. Mas o motivo mais forte é outro: **é o único conjunto em que o braço `clustalo` é genuíno**. Nos conjuntos de *Variola* as sequências têm ~250 kb, acima do limite de 20 kb de `_isExecutableByClustalO`, e o controlador troca silenciosamente para MAFFT — os dois braços viram cópias byte a byte ([D1](../science/02-defeitos-que-alteram-resultado.md#d1)) e o fator alinhador **não existe**. Com 10,8 kb o Clustal Omega executa de verdade. Para validar o workflow, isso importa mais que o número de táxons.

**Isto não resolve D11**, e vale registrar por quê, porque a pergunta foi feita. D11 é *"nenhum manifesto de execução"* e foi fechado em [M2.5](#dec-027--2026-08-24--m25--manifesto-de-execução-e-a-semente-deixa-de-ser-da-ferramenta), que é código e vale para qualquer conjunto. Fixar um conjunto de validação resolve um problema **vizinho**: dá um alvo comparável às execuções. É o que torna o manifesto *útil* — um manifesto isolado não prova nada; dois manifestos do mesmo conjunto, com a mesma entrada e a mesma semente, provam ou refutam reprodutibilidade. E ataca **DM-11**, a incomparabilidade de `M` entre experimentos.

**Procedimento registrado** como skill [`validar-workflow`](../skills/validar-workflow/SKILL.md), instalada em `.claude/skills/`, e conferência automatizada em `Backend/scripts/conferir_correcoes_m1.py`.

---

**O que a primeira execução achou: [D18](../science/02-defeitos-que-alteram-resultado.md#d18).**

Configurado com `mode: "auto"` e `ignore_mode: ["mrbayes"]` — isto é, pedindo explicitamente para não ignorar mais nada —, o pipeline produziu **8 árvores**, todas de distância e parcimônia. **Nenhum FastTree, IQ-TREE ou RAxML.** E o log encerrou com `STEP: Completed successfully!`.

A causa é `_process_auto_mode`: ele varre `{nj, upgma} × {distance, parsimony} × {clustalo, mafft}` e **retorna**. Quem executa os métodos avançados é `_process_advanced_mode`, o modo chamado `advanced`. O nome `auto` sugere "escolha sozinho o que faz sentido"; o que ele faz é rodar só o básico.

Confirmado nos projetos que já existiam — mesmo dado de entrada, o `mode` sozinho dobra o número de pipelines:

| Projeto | `mode` | `ignore_mode` | Árvores |
|---|---|---|---:|
| `Zika_Virus_Singapura_Large_21seq` | `auto` | vazio | **8** |
| `Zika_Virus_Singapura_Advanced_21seq` | `advanced` | vazio | **16** |
| `Variola_Yu_li_2007` | `advanced` | raxml, mrbayes, parsimony | 9 |
| `Variola_Yu_li_2007_noITRs_6seqs` | `advanced` | mrbayes, parsimony | 11 |
| `Zika_Virus_Singapura_Large_480seq` | `advanced` | parsimony | 10 |

**Por que isso é grave.** `M` é o denominador de todo suporte metodológico, e portanto de todo número da Deep Analysis. Um conjunto rodado em `auto` e outro em `advanced` **não são comparáveis**, e nada no artefato registra a diferença além de uma chave no `config_backup.json`. Compõe-se com **DM-11**: já se sabia que `ignore_mode` varia entre experimentos; agora sabe-se que **mesmo com `ignore_mode` idêntico** o `mode` sozinho muda `M`.

**Nenhuma correção aplicada neste lote** — D18 está registrado com as três opções de correção, e a mínima obrigatória (gravar no manifesto os métodos efetivamente executados contra os disponíveis) entra como lote próprio.

---

### DEC-029 · 2026-08-25 · O backend declara quando o CSV do FPMax é anterior a M1.1

Fecha o achado de triagem aberto por [DEC-021](#dec-021--2026-08-24--m11--d4-o-support-do-fpmax-deixa-de-ser-o-limiar-da-varredura). M1.1 corrigiu a **escrita** do `all_results_fpmax.csv`; os arquivos em disco seguem com o limiar da varredura na coluna `support`. Até agora, `/api/tree/pattern-analysis` exibia os dois como se fossem a mesma coisa — corrigir na escrita e repetir o defeito na leitura.

`analyze_patterns` passa a reconhecer o artefato antigo pela **ausência da coluna `min_support_threshold`** e a declarar isso no payload:

```json
"support_schema": {
  "corrected": false,
  "support_means": "LIMIAR da varredura do FPMax, não o suporte real",
  "warning": "Este projeto foi gerado antes da correção de D4 (M1.1) ... Reexecute o projeto para obter os valores corretos."
}
```

**Parecer de snapshot.** `pattern_analysis_varv6` muda por **acréscimo**: nenhum número existente foi alterado, um campo novo apareceu. Regravado com este parecer.

**Segundo ajuste, motivado pela máquina de validação.** `test_projects_listing` congelava a lista **inteira** de projetos em disco — e `BioComp_UFF/projects/` é gitignored, isto é, o conjunto de projetos é local de cada máquina. O portão de sanidade do handoff falharia na máquina nova por um motivo que não é defeito. O teste passa a congelar apenas o **subconjunto de referência** — os conjuntos que os documentos científicos citam pelo nome — e a falhar se algum deles estiver ausente, que é a condição que realmente importa. Projeto a mais é normal; um destes a menos impede os oráculos de rodarem.

**Evidência:** `pytest Backend/tests` → **182 passed, 1 xfailed** (era 180 + 1).

**Write-lock:** `Backend/src/app.py` (`analyze_patterns`), `Backend/tests/unit/test_rotulos_truncados.py`, `Backend/tests/golden/test_golden_endpoints.py`, `Backend/tests/golden/snapshots/{pattern_analysis_varv6,projects_nomes}.json`. **Reversível:** sim.

### DEC-030 · 2026-08-25 · Primeira execução completa sob o pipeline corrigido — **as correções de M1 materializaram**

`Zika_21seq_validacao`, `mode: advanced`, `ignore_mode: ["mrbayes"]` (ausente do PATH). **14 árvores**: 2 alinhadores × {nj-distância, upgma-distância, nj-parcimônia, upgma-parcimônia, FastTree, IQ-TREE, RAxML}. Duração **11 min 03 s**. `run_id 15ac62a6dcfb493b92dd3f61cdfe348f`.

É a primeira vez que um artefato do projeto é produzido pelo pipeline corrigido. Até aqui M1 e M2.5 eram verdade sobre o **código**; agora são verdade sobre um **arquivo em disco**.

**Conferência** (`Backend/scripts/conferir_correcoes_m1.py`) — tudo verde:

| Marco | O que se conferiu | Resultado |
|---|---|---|
| M2.5 | manifesto com `run_id`, término, semente, versões, commits, hashes | ✅ 1 entrada e **274 saídas** com SHA-256; `mrbayes: null` declarado; nenhum caminho absoluto |
| M1.1 | uma linha por itemset, quatro colunas, limiar ≤ suporte | ✅ **37 linhas, 37 itemsets**; 16 frágeis, 8 robustos, **interseção vazia** |
| M1.2 | identidade canônica, legada ao lado, dentro do seguro do JS | ✅ **46 clados canônicos contra 109 identificadores legados** |
| M1.3 | bipartição, `\|B\| ≤ n−3`, diagonal zero | ✅ `\|B\| = 17 = n−3` em **todos** os 14 pipelines; 7 bipartições universais |

**O número mais eloquente é o de M1.2.** Pela primeira vez o **mesmo arquivo** carrega as duas identidades lado a lado, o que torna a comparação controlada: **109 identificadores legados para 46 clados reais**. O esquema de 16 bits dependente da ordem fragmentava cada clado em 2,4 pedaços em média. Todas as estimativas anteriores vinham de artefatos diferentes; esta vem de uma execução só.

**Oráculo externo:** `oraculo_rf_dendropy.py` sobre os 14 pipelines → **91 pares, 0 divergências** contra o dendropy.

**Custo por método** (Δ entre árvores consecutivas, mesmo alinhamento reaproveitado):

| Método | Tempo por árvore |
|---|---:|
| distância (NJ, UPGMA) | 0-6 s |
| IQ-TREE (com UFBoot 1000) | 4-5 s |
| FastTree | 4-5 s |
| RAxML-NG (`--threads 4 --workers 1`, 10 árvores iniciais) | 6-7 s |
| **parcimônia** | **116-169 s** |

A parcimônia é **~25× mais lenta** que qualquer método de ML e consome ~9 dos 11 minutos da execução. É o `ParsimonyTreeConstructor` do Biopython, em Python puro — e é a resposta quantificada para por que ela está no `ignore_mode` de todos os experimentos de *Variola*, onde o alinhamento é 25× maior. **O RAxML, o suposto vilão, é o terceiro mais rápido.**

**Dois defeitos novos, ambos achados por esta execução e nenhum deles achável por teste de unidade:**

- **[D18](../science/02-defeitos-que-alteram-resultado.md#d18)** — o modo `auto` não executa os métodos avançados. A primeira tentativa, com `ignore_mode: ["mrbayes"]`, devolveu 8 árvores e `Completed successfully!`. Registrado, não corrigido.
- **[D19](../science/02-defeitos-que-alteram-resultado.md#d19)** — `nj_parsimony` e `upgma_parsimony` recebiam o mesmo rótulo de pipeline e uma sobrescrevia a outra: **14 árvores viravam 12 pipelines**, silenciosamente. **Corrigido** neste lote: sufixo mais longo vence, `INFERENCE_METHODS` completo, e `TreeSet.from_directory` recusa colisão em vez de escolher uma árvore. Depois: 14 para 14.

**Por que D19 só apareceu agora.** A parcimônia está excluída de todos os experimentos de *Variola*; sem árvore de parcimônia não há colisão. Foi preciso um conjunto que rodasse **todas** as combinações para o defeito existir — que é exatamente o que o conjunto de validação foi escolhido para fazer.

**Evidência de execução:**
```
cd Backend && python scripts/conferir_correcoes_m1.py Zika_21seq_validacao   → TUDO VERDE
cd BioComp_UFF && python ../docs/science/scripts/oraculo_rf_dendropy.py projects/Zika_21seq_validacao
                                                                             → 91 pares, 0 divergências
cd Backend && pytest tests                                                   → 182 passed, 1 xfailed
cd BioComp_UFF && python -m unittest (5 módulos)                             → 81 tests, OK
```

**Write-lock:** `BioComp_UFF/workflow/stability/stability.py`, `BioComp_UFF/workflow/tests/test_rf_bipartition.py`. **Reversível:** sim.

### DEC-031 · 2026-08-25 · O explorador abre qualquer JSON; respostas metodológicas ganham lugar próprio

**Explorador de arquivos.** Nenhum JSON que não fosse lista de listas podia ser aberto. `manifest.json` e `config_backup.json` respondiam **404 dizendo que o arquivo estava vazio** — o oposto do que acontecia — e `/file` respondia **500**, porque a leitura fazia `parsed_json[0]` supondo que todo JSON fosse lista. Na prática: o manifesto que M2.5 acabou de criar era invisível pela aplicação.

| O que mudou | Onde |
|---|---|
| `json_root_kind` — descobre a forma da raiz lendo **dois eventos** do parser incremental, custo independente do tamanho | `app.py` |
| `/api/file/paginated` passa a servir `object`, `array` e `array_of_arrays`, e devolve `kind` para o cliente decidir a apresentação | `app.py` |
| Guarda de tamanho (`MAX_JSON_INLINE_BYTES`, 8 MB) antes de qualquer `read()` — um `metadata.json` de 3,2 GB derrubava o processo | `app.py` |
| JSON malformado é **400 com o motivo**, não 500 | `app.py` |
| `JsonViewer` — leitor colapsável, com filtro por chave ou valor, alternância árvore/bruto e cópia | novo, frontend |
| `PaginatedJsonViewer` usa `kind`: metadados no visualizador de árvores, o resto no leitor genérico, sem paginação quando não há o que paginar | frontend |

O rótulo também mentia: toda página dizia "Tree N of M" mesmo para um manifesto. E o erro genérico "Falha ao carregar" foi trocado pela mensagem do backend, que sabe o motivo.

**Respostas úteis.** Nova seção [`docs/respostasUteis/`](../respostasUteis/README.md) para o **porquê** — raciocínio metodológico e conceitual —, separado do ledger, que guarda o **que** mudou com evidência. Primeiro documento: [R1](../respostasUteis/r1.md), sobre o conjunto de validação, por que fixá-lo não resolve D11, o padrão comum aos três defeitos que a execução achou, e por que semente fixa não basta.

**Evidência:** `pytest Backend/tests` → **194 passed, 1 xfailed** (12 testes novos em `tests/api/test_previa_de_json.py`); `vitest` → 8 passed; `build` ✓; catraca de lint **melhorou**, de 69 para 68 erros.

---

### DEC-032 · 2026-08-25 · [D20](../science/02-defeitos-que-alteram-resultado.md#d20) — o MrBayes estava instalado o tempo todo

**O erro era meu, e do lote anterior.** O MrBayes foi excluído do conjunto de validação sob a justificativa de "não está instalado". **Está**: `MrBayes 3.2.7`, no PATH. O binário chama-se **`mb`**, como na maioria das distribuições; a detecção de versão que escrevi em M2.5 procurava `mrbayes` e gravava `"mrbayes": null`. O construtor do pipeline sempre chamou `mb` corretamente — **os dois lados do código discordavam sobre o nome da própria ferramenta**, e o método sumiu do delineamento sem que ninguém tivesse decidido isso.

Corrigido: a detecção usa `mb` e lê a versão do banner de abertura. `tool_versions()` agora devolve `"mrbayes": "3.2.7"`.

**A inspeção do construtor achou cinco problemas**, todos registrados em D20 e nenhum corrigido ainda:

1. `tmp_dir` construído com `split('/PhyloTreeMiner/')` — depende do **nome do diretório do repositório** e produz caminho **relativo**, enquanto todos os outros construtores produzem absoluto. Os arquivos do MrBayes vão parar onde o processo foi lançado. O repositório **já foi renomeado** de `FPM-Tree` para `PhyloTreeMiner`, então isso já quebrou uma vez.
2. **Sem semente.** O MCMC é estocástico, o MrBayes aceita `set seed=`/`set swapseed=`, e o script não usa nenhum. É D11 e D17 outra vez, num método onde o efeito é maior porque a cadeia inteira diverge.
3. `ngen=10⁶` e `burnin=250` fixos e **sem relação entre si** — 250 amostras de 10 000 é 2,5% de descarte, contra os 25% usuais; mudar `ngen` altera essa fração em silêncio.
4. **Convergência nunca verificada.** O ASDSF e os ESS saem no `sump`/`sumt` e são ignorados. Uma árvore consenso de cadeia não convergida **não significa nada** — é o único método do conjunto cuja saída pode ser silenciosamente sem sentido com o processo terminando em código 0.
5. Descritor de arquivo vazado no `stdin=open(...)`; `timeout` fixo sem relação com `ngen`; modelo `nst=6 rates=gamma` fixo e sem correspondência declarada com o dos outros métodos.

---

### DEC-033 · 2026-08-25 · Marco **M7** — heurísticas de inferência auditadas, parametrizáveis e escaláveis

**Motivo.** M1 corrigiu o que o pipeline calcula **depois** que as árvores existem. M7 é o degrau anterior: **como as árvores são feitas**. Erro aqui não é corrigível a jusante — a árvore errada já entrou no conjunto.

E a evidência acumulada diz que este degrau nunca foi auditado: [D17](../science/02-defeitos-que-alteram-resultado.md#d17) (RAxML, `--threads auto`), [D11](../science/02-defeitos-que-alteram-resultado.md#d11) (IQ-TREE sem semente), [D18](../science/02-defeitos-que-alteram-resultado.md#d18) (o modo que nunca chamava método avançado), [D20](../science/02-defeitos-que-alteram-resultado.md#d20) (MrBayes) e a medição de custo de 2026-08-25. **Cada um foi achado por acaso, ao investigar outra coisa; três dos quatro métodos tinham defeito.**

Sete lotes, em [`10-marcos-e-metas §8`](10-marcos-e-metas.md): ficha de chamada por método (M7.1), suporte de ramo simétrico (M7.2, que é o mesmo trabalho que M3.2), modelo declarado e coerente (M7.3), MrBayes correto com verificação de convergência (M7.4), parcimônia viável ou declarada inviável **com limite medido** (M7.5), falha nunca silenciosa (M7.6) e curva de custo em função de `n` e `L` (M7.7).

**Portão:** toda chamada de ferramenta no manifesto com semente e paralelização; duas execuções da mesma entrada com os mesmos hashes; nenhum método falhando em silêncio; curva de custo publicada. E a regra: **nenhum método entra em `M` sem ter passado por M7.1** — um pipeline cuja chamada ninguém conferiu não é um voto válido no suporte metodológico.

Paralelo ao caminho crítico. M7.5 e M7.7 exigem a máquina de validação; o resto é código.

---

### DEC-034 · 2026-08-25 · M2.3 — enraizamento explícito por grupo externo, e o que a recusa revelou

`workflow/stability/rooting.py` (novo) implementa o que [D3](../science/02-defeitos-que-alteram-resultado.md#d3) pedia na outra metade: quando a análise enraizada é o que se quer, ela exige **enraizamento explícito e comum a todos os métodos, pelo grupo externo declarado** — nunca a raiz arbitrária do arquivo.

**Três regras, todas porque enraizar errado é pior que não enraizar:**

1. **O grupo externo é declarado, nunca inferido.** `outgroup_from_classifier` deriva o externo como complemento do grupo **interno** declarado — nos experimentos de *Variola*, "tudo que não é VARV". A declaração continua sendo do pesquisador.
2. **Grupo externo não monofilético não enraíza.** Sem clado, há mais de uma aresta candidata a raiz e a escolha seria arbitrária. O resultado é `None` **com o motivo**, e não uma árvore enraizada em algum lugar plausível. Pode ser desligado, mas é preciso pedir.
3. **Ou todos, ou nenhum.** `root_tree_set` devolve o relatório de **todas** as árvores, inclusive as que falharam: se um método não enraizou, a análise enraizada daquele conjunto não é comparável, e quem decide precisa ver o quadro inteiro.

A árvore original nunca é modificada — a mesma árvore precisa poder ser analisada nas duas formas sem que uma contamine a outra. Rótulos são normalizados, então o grupo externo declarado uma vez vale na grafia truncada de IQ-TREE e RAxML (D13).

**Aplicado aos experimentos reais, o resultado é evidência, não só código:**

| Conjunto | Grupo externo derivado | Enraizadas | Recusadas |
|---|---|---:|---|
| VARV-49 | 4 táxons (`AF438165`, `AY009089`, `DQ437593`, `DQ437594`) | **6 / 8** | **os dois UPGMA** |
| VARV-6 | 2 táxons (`NC_008030`, `NC_008291`) | **6 / 10** | os dois UPGMA **e os dois IQ-TREE** |

**Achado 1 — o argumento contra o UPGMA deixa de ser teórico.** Ele é o único método que já vinha enraizado, e o faz impondo um relógio molecular. Em **ambos** os experimentos, os dois braços de UPGMA são os que **não recuperam o grupo externo como clado**. O que se dizia por dedução — "os pressupostos são violados num conjunto que atravessa gêneros" — passa a ter medida: o UPGMA erra justamente onde o erro é verificável de fora.

**Achado 2 — a recusa detecta [D6](../science/02-defeitos-que-alteram-resultado.md#d6).** Em VARV-6 o "grupo externo" é `NC_008291` (*Taterapox virus*, gênero irmão) mais `NC_008030` (*Nile crocodilepox virus*, **fora de Orthopoxvirus**). Não é um grupo externo: são dois, em níveis taxonômicos diferentes, e nenhuma árvore razoável os agruparia. **A recusa de enraizamento é o sintoma da contaminação taxonômica** que D6 descreve — e é a primeira vez que ela aparece como consequência mensurável, e não como observação sobre a composição do conjunto.

**O que este lote NÃO faz.** Não enraíza os artefatos em disco nem muda número exibido. A ferramenta existe e está testada; **aplicá-la ao dataset de referência é M2.6**, e depende da composição que M2.2 (filtro `txid10242`) vai definir — o que, à luz do achado 2, é a ordem certa: limpar o conjunto antes de enraizá-lo.

**Evidência de execução:**
```
cd BioComp_UFF && python -m unittest workflow.tests.test_rooting   → Ran 15 tests, OK
                  (suíte completa do submódulo)                    → Ran 96 tests, OK
cd Backend     && pytest tests                                     → 194 passed, 1 xfailed
```

**Write-lock:** `BioComp_UFF/workflow/stability/rooting.py` (novo), `BioComp_UFF/workflow/tests/test_rooting.py` (novo), `BioComp_UFF/workflow/utils/manifest.py` (detecção do `mb`), `Backend/src/app.py`, `Backend/tests/api/test_previa_de_json.py` (novo), `Frontend/.../JsonViewer.jsx` (novo), `Frontend/.../PaginatedJsonViewer.jsx`, `Frontend/.../projectExplorer.jsx`, `docs/respostasUteis/**`. **Reversível:** sim.

### DEC-035 · 2026-08-25 · M2.2 — filtro taxonômico declarado, e a contaminação de [D6](../science/02-defeitos-que-alteram-resultado.md#d6) medida acesso a acesso

`workflow/utils/taxonomy.py` (novo) implementa as **duas defesas** que M2.2 pede, e a segunda existe porque a primeira não basta.

**1. Filtro na consulta.** `entrez_term(query, taxon)` compõe o termo do Entrez com o clado declarado:

```
(Variola virus[Organism] AND complete genome) AND txid10242[Organism:exp]
```

**2. Verificação pós-download.** `audit_genbank` confere a linhagem de cada registro **baixado** contra o clado. É necessária porque o filtro da consulta **não cobre todos os caminhos de entrada**: `download_method="csv"` e um FASTA fornecido à mão nunca passam por uma consulta. Uma verificação que só olha a consulta confia justamente no que deveria conferir.

A verificação é **offline** — a linhagem vem de `annotations['taxonomy']`, que o próprio registro GenBank carrega. Por isso ela vale para os conjuntos **que já existem em disco**, sem nova consulta ao NCBI. Foi assim que se produziu a tabela abaixo.

**O clado é declarado, nunca presumido.** O padrão é `None`, e nesse caso nada é conferido — mas o log **avisa**, com a razão: *"foi assim que crocodilepox entrou nos conjuntos de Variola"*. Ausência de filtro passa a ser uma decisão visível.

**Três estados, não dois.** Um registro pode estar dentro do clado, fora, ou **sem anotação de taxonomia**. O terceiro é indecidível sem consultar o NCBI, e tratá-lo como qualquer um dos outros seria decidir por falta de metadado: reprovar descartaria registro legítimo; aprovar aceitaria contaminação não detectada. O modo estrito **levanta por táxon fora e apenas avisa por indecidível**, e um conjunto só é declarado limpo quando não há nem um nem outro.

**Auditoria dos conjuntos em disco** (`docs/science/scripts/auditar_taxonomia.py`, novo):

| Conjunto | Clado exigido | Total | Dentro | Fora | Estado |
|---|---|---:|---:|---:|---|
| **VARV-49** | *Orthopoxvirus* | 49 | **49** | **0** | ✅ limpo |
| VARV-52 | *Orthopoxvirus* | 52 | 51 | **1** | contaminado |
| VARV-121 | *Orthopoxvirus* | 121 | 117 | **4** | contaminado |
| VARV-6 | *Orthopoxvirus* | 6 | 5 | **1** | contaminado |
| ZIKV-21 | *Orthoflavivirus* | 20 | **20** | **0** | ✅ limpo |

Os seis táxons fora do clado, com a linhagem que os denuncia:

| Acesso | Organismo | Gênero real |
|---|---|---|
| `NC_008030` | Nile crocodilepox virus | *Crocodylidpoxvirus* |
| `MG450915` | Saltwater crocodilepox virus | *Crocodylidpoxvirus* |
| `MG450916` | Saltwater crocodilepox virus | *Crocodylidpoxvirus* |
| `NC_015960` | Yokapox virus | *Centapoxvirus* |

**Reproduz exatamente a tabela de D6**, agora por comando e não por inspeção manual. E confirma a afirmação de [`01-revisao-variola §1`](../science/01-revisao-variola.md): **VARV-49 é o único experimento com delineamento defensável** — 49 de 49 dentro do gênero.

**O clado é do experimento, não do projeto.** Rodar os conjuntos de Zika contra *Orthopoxvirus* reprova os 20 táxons, corretamente; contra *Orthoflavivirus*, aprova os 20. Por isso `TaxonFilter` é um parâmetro e não uma constante — e por isso `ORTHOFLAVIVIRUS` existe ao lado de `ORTHOPOXVIRUS`, como prova de que a máquina serve a mais de um estudo.

**Encontro com M2.3.** O enraizamento explícito ([DEC-034](#dec-034--2026-08-25--m23--enraizamento-explícito-por-grupo-externo-e-o-que-a-recusa-revelou)) recusou os dois braços de IQ-TREE de VARV-6 porque o "grupo externo" não era monofilético. A auditoria taxonômica explica **por quê**: aquele grupo externo mistura *Taterapox* (*Orthopoxvirus*, gênero irmão) com *Nile crocodilepox* (*Crocodylidpoxvirus*, outro gênero). Não é um grupo externo — são dois, em níveis diferentes. **A recusa de enraizamento e a reprovação taxonômica são o mesmo defeito visto por dois instrumentos independentes.**

**O que este lote NÃO faz.** Não remove nada de conjunto nenhum. Compor `VARV-49-clean` e publicar o dataset de referência é **M2.6**, e agora tem o instrumento que decide quem entra. VARV-52, VARV-121 e VARV-6 continuam contaminados até serem recompostos — e VARV-121 e VARV-6 ficam, por decisão registrada ([DEC-024](#dec-024--2026-08-24--decisões-2-3-e-4-tomadas-os-três-conjuntos-ficam-o-upgma-fica)), com o papel declarado de escala e demo didático. **Um conjunto contaminado pode ficar; o que não pode é ficar sem estar declarado como tal.**

**Evidência de execução:**
```
cd BioComp_UFF && python -m unittest workflow.tests.test_taxonomy    → Ran 20 tests, OK
                  (suíte completa do submódulo)                      → Ran 116 tests, OK
                  python ../docs/science/scripts/auditar_taxonomia.py → 6 fora do clado, exit 1
cd Backend     && pytest tests                                       → 194 passed, 1 xfailed
```

**Write-lock:** `BioComp_UFF/workflow/utils/taxonomy.py` (novo), `BioComp_UFF/workflow/tests/test_taxonomy.py` (novo), `BioComp_UFF/workflow/workflow_dataAcquisition.py`, `docs/science/scripts/auditar_taxonomia.py` (novo). **Reversível:** sim.

### DEC-036 · 2026-08-25 · **Decisão 1 tomada** — a biblioteca de alinhadores é MAFFT + Clustal Omega + MUSCLE

Última das seis decisões pendentes. **Nenhuma decisão do usuário bloqueia mais nada.**

**Resposta do usuário:** a biblioteca de ferramentas disponíveis à escolha contém **MAFFT** e **Clustal Omega** (já inclusos) e **MUSCLE** (novo).

Isto **substitui** a recomendação registrada, que era contrastar duas estratégias do MAFFT (`--retree 1` × `--maxiterate 1000`). O motivo da recomendação era evitar depender do MUSCLE 3.8.1551, que é o instalado e não o MUSCLE 5. A decisão do usuário privilegia outro objetivo — **uma biblioteca com várias ferramentas de verdade**, e não um contraste de parâmetros dentro de uma só —, e é uma escolha de produto legítima.

**O que fica registrado como limitação:** a versão instalada é **MUSCLE 3.8.1551**, cujo algoritmo é diferente do MUSCLE 5. Se o artigo comparar alinhadores, tem de dizer **qual MUSCLE**, e o manifesto já grava a versão.

**Consequência para [E4](../science/04-agenda-de-pesquisa.md):** o fator alinhador passa a ter três níveis reais em vez de dois. E, com [D1](../science/02-defeitos-que-alteram-resultado.md#d1) corrigido, o braço `clustalo` deixa de ser cópia de MAFFT nos conjuntos onde ele de fato roda.

---

### DEC-037 · 2026-08-25 · MUSCLE integrado, e a substituição silenciosa de alinhador acaba (**M2.4**)

**MUSCLE no pipeline.** `align_sequences_muscle` suporta as **duas gerações de linha de comando**, que são incompatíveis e ambas circulam: `-in/-out` na 3.8, `-align/-output` na 5. A versão é detectada uma vez e registrada — não se adivinha por tentativa e erro, porque um erro de sintaxe e uma falha de alinhamento produzem o mesmo código de saída, e confundi-los esconderia o segundo. Acima de 500 sequências, a 3.8 recebe `-maxiters 2`: o refinamento iterativo padrão (16) não termina em tempo útil.

**Biblioteca declarada.** `workflow/alignment/aligners.py` (novo) reúne num lugar só o que cada alinhador é, o que aguenta e **por quê**. `viability(n, L)` responde, para um conjunto concreto, quais são viáveis e qual o motivo dos que não são — que é o que a UI precisa para avisar **no momento da configuração, quando ainda há escolha**.

**Limite não medido é `None`, nunca um palpite.** Só o Clustal Omega tem limite declarado (20 kb por sequência), e ele vem de uma falha **observada** neste projeto: `return code 137`, o OOM killer, no conjunto Zika479. Os limites de MAFFT e MUSCLE estão como desconhecidos até M7.7 medir.

**A substituição silenciosa acaba — é o núcleo de D1.** `_isExecutableByClustalO` trocava Clustal Omega por MAFFT e devolvia a troca sem que ninguém renomeasse o arquivo: nos experimentos de *Variola*, metade dos "pipelines" são cópias byte a byte com nome de `clustalo`, e o fator alinhador **não existe** ali. Agora:

1. o padrão é **falhar** com o motivo, e a mensagem diz como autorizar a substituição;
2. autorizada, `resolve_aligner` **devolve o nome do alinhador que rodou**, e o chamador nomeia a saída por ele;
3. os **três** pontos de despacho do controlador — que eram cópias um do outro — foram unificados em `_resolver_alinhador` + `_alinhar`, e um método desconhecido virou erro em vez de aviso.

Isto fecha **M2.4** (proveniência honesta) pela metade que é código. A outra metade — reexecutar para que os artefatos deixem de mentir — é da máquina de validação.

**Medição dos três alinhadores** no conjunto de validação (20 sequências × 10,8 kb, 4 threads):

| Alinhador | Tempo | Colunas |
|---|---:|---:|
| **MAFFT** | **4,9 s** | 10 792 |
| MUSCLE 3.8 | 34,5 s | 10 791 |
| Clustal Omega | 64,0 s | 10 791 |

MAFFT é **7× mais rápido que o MUSCLE e 13× mais rápido que o Clustal Omega**, com alinhamento do mesmo comprimento. Num conjunto pequeno, onde os três são viáveis, a escolha é de método e não de custo; a diferença passa a decidir quando o conjunto cresce.

**Dependências.** `scripts/check_dependencies.sh` (novo) confere as sete ferramentas externas, relata versão de cada uma e **instala só com `--install`** — instalar software na máquina de alguém sem pedir é decisão de quem está na frente do teclado. Ligado ao `start.sh` como passo 1 de 4: falhar ali é melhor que falhar no meio de um alinhamento de duas horas. O script trata a armadilha do `FastTree` e do `mb`, que **leem a entrada padrão** quando invocados sem argumentos e ficam bloqueados sem `</dev/null`.

**Achado incidental:** as linhas 79-93 do `start.sh` eram um **prompt colado por acidente** num commit anterior. Texto morto, depois do `cleanup` que encerra o script, mas lixo num arquivo versionado. Removido.

---

### DEC-038 · 2026-08-25 · Conjuntos limpos criados **ao lado** dos contaminados

**Decisão do usuário:** limpar os conjuntos e corrigir o erro, **sem apagar** — os originais servem como subamostra do conjunto completo, úteis para teste.

`workflow/utils/dataset_cleaning.py` e `docs/science/scripts/limpar_datasets.py` (novos) criam uma variante `-clean` ao lado de cada conjunto contaminado. **Nenhum arquivo de origem foi alterado** — verificado por contagem antes e depois.

| Conjunto | Antes | Depois | Removidos |
|---|---:|---:|---|
| VARV-6 | 6 | **5** | `NC_008030` (Nile crocodilepox) |
| VARV-52 | 55 | **54** | `NC_008030` |
| VARV-121 | 125 | **121** | `MG450915`, `MG450916` (Saltwater crocodilepox), `NC_008030`, `NC_015960` (Yokapox) |
| VARV-49 | 52 | — | já limpo, nada a fazer |

**Cada conjunto limpo carrega um `PROVENIENCIA.md`** com a origem, o clado exigido, a lista do que saiu **com o motivo taxonômico**, e o comando que reproduz. Um conjunto limpo sem proveniência é tão indefensável quanto um contaminado: o que o torna publicável não é estar limpo, é **ser possível provar o que foi retirado**.

**Terceiro estado, de novo.** Três acessos — `DQ437594`, `NC_003391`, `HQ849551` — estão no FASTA e **não têm registro no `raw_data_sequences.gb`**, então não havia como decidir seu clado. Eles **ficam** no conjunto limpo e são declarados na proveniência: retirá-los seria descartar dado por falta de metadado, que é uma decisão diferente e precisa ser tomada explicitamente. Registrado na triagem como vão de proveniência.

**VARV-6 é o caso que muda de natureza.** Ali o crocodilepox não é contaminante à margem — é **um sexto do conjunto**, e estava sendo usado como grupo externo. O papel declarado de VARV-6 é demo didático, e um demo que ensina um delineamento errado ensina a coisa errada. A variante limpa tem 5 táxons com *Taterapox* como único grupo externo, que é o desenho correto; o contraste entre as duas versões vira, ele próprio, a lição.

**Evidência de execução:**
```
cd BioComp_UFF && python ../docs/science/scripts/limpar_datasets.py --dry-run  → 6 a remover
                  python ../docs/science/scripts/limpar_datasets.py            → 6 removidas, originais intactos
                  python -m unittest (8 módulos)                               → Ran 129 tests, OK
cd Backend     && pytest tests                                                 → 194 passed, 1 xfailed
bash scripts/check_dependencies.sh                                             → 7 de 7 presentes
```

**Write-lock:** `BioComp_UFF/workflow/alignment/{aligners.py,alignmentSeq.py}`, `BioComp_UFF/workflow/controller/treeBuilderController.py`, `BioComp_UFF/workflow/utils/dataset_cleaning.py`, `BioComp_UFF/workflow/tests/test_aligners.py`, `docs/science/scripts/limpar_datasets.py`, `scripts/check_dependencies.sh`, `start.sh`, `BioComp_UFF/data/*-clean/**` (novos). **Reversível:** sim.

### DEC-039 · 2026-08-25 · Política de alinhador: **avisar, não bloquear** — endpoint e seletor

**Decisão do usuário:** avisar sem bloquear.

Três saídas eram possíveis, e a escolha entre elas é o que separa este projeto do defeito que ele passou dois meses corrigindo:

| Saída | Veredito |
|---|---|
| **Substituir em silêncio** | É [D1](../science/02-defeitos-que-alteram-resultado.md#d1). Produz artefato que mente sobre a própria proveniência, e ninguém descobre até auditar |
| **Bloquear na interface** | Remove agência de quem sabe o que está fazendo. E os limites são **conservadores e alguns não medidos** — o de 20 kb nunca foi verificado, o de 1 000 sequências é palpite. Bloquear com base em número não medido é pior que avisar |
| **Avisar e deixar escolher** | ✅ O inviável aparece esmaecido, **com o motivo ao lado**, e continua selecionável. Se falhar, o motivo fica no manifesto |

**Backend.** `GET /api/aligners` devolve a biblioteca — instalado, versão, limites e **o motivo de cada limite**, que é campo obrigatório na resposta. `GET /api/aligners/viability?path=…` responde para um conjunto concreto: mede o número de sequências e o **comprimento da maior** (é uma sequência só que estoura a memória, não a média), e devolve `viable` + `reasons` por alinhador, mais `policy: "warn"` declarado no corpo.

**O registro de limites não foi duplicado.** O backend **importa** `workflow/alignment/aligners.py` do submódulo. Duas tabelas de limites divergindo seria [D5](../science/02-defeitos-que-alteram-resultado.md#d5) em outro assunto — e D5 custou 109 identificadores para 46 clados reais.

**Interface.** `AlignerSelect.jsx` (novo) lê os dois endpoints, esmaece o inviável com uma etiqueta, mostra as dimensões do conjunto, e — quando o escolhido é inviável — abre um aviso que termina dizendo: *"a escolha continua sua; a execução não troca de alinhador por conta própria"*.

**Achado corrigido no caminho.** O seletor antigo oferecia duas opções fixas: `mafft` e **`clustalw`**. O pipeline **não implementa `clustalw`** — escolhê-lo fazia a execução falhar com "método de alinhamento não suportado". A interface oferecia uma opção quebrada, e agora lê a biblioteca de verdade.

---

### DEC-040 · 2026-08-25 · Relatório de gargalos e rotas de execução

[`docs/science/07-gargalos-e-rotas.md`](../science/07-gargalos-e-rotas.md) (novo) reúne o que cada método custa, onde quebra, por onde a execução passa e o que acontece quando não dá.

Existe porque três defeitos — [D1](../science/02-defeitos-que-alteram-resultado.md#d1), [D17](../science/02-defeitos-que-alteram-resultado.md#d17) e [D18](../science/02-defeitos-que-alteram-resultado.md#d18) — têm a mesma raiz: **o pipeline decidia sozinho o que não conseguia fazer, e não contava a ninguém.**

**Regra de leitura declarada no topo:** número medido vem com máquina e data; onde não há medição, está escrito *não medido*, nunca um palpite. Este projeto já carregou por anos um limite de 20 kb que ninguém sabia de onde vinha.

**O que o relatório fixa:**

- **Custo dos alinhadores** (Zika-21, 20 × 10,8 kb): MAFFT 4,9 s · MUSCLE 34,5 s · Clustal Omega 64,0 s, todos com o mesmo comprimento de alinhamento.
- **Custo da inferência**: distância 0-6 s · IQ-TREE 4-5 s (com 1000 UFBoot) · FastTree 4-5 s · RAxML 6-7 s · **parcimônia 116-169 s**.
- **Limites com a origem de cada número** — e a marca explícita de *não medido* em quatro dos sete.
- **A dimensão que pesa não é a que parece**: 478 táxons de Zika rodam, 52 de *Variola* quebravam. No alinhamento pesa o **comprimento**; na inferência, nem isso, porque a compressão de padrões torna 259 mil sítios baratos quando 70% são invariantes.
- **As rotas**, antes e depois: a de D1 (`clustalo pedido → troca para MAFFT → grava com nome de clustalo`) contra a atual (`inviável → erro com motivo`, ou substituição autorizada **que devolve o nome do que rodou**).
- **O buraco que resta**: não há política para método de **inferência** que falha. Hoje `ignore_mode` mistura "excluído de propósito" com "quebrou e foi excluído depois" — foi assim que o RAxML sumiu dos experimentos de *Variola* sem que ninguém soubesse que a causa era um `SIGSEGV` de autoconfiguração. É o lote **M7.6**.
- **Seis perguntas em aberto**, cada uma com como medir, todas para a máquina de validação (M7.7).

**Evidência de execução:**
```
cd Backend && pytest tests   → 205 passed, 1 xfailed  (11 testes novos em tests/api/test_alinhadores.py)
npm run test -- --run        → 8 passed
npm run build                → ✓ built
npm run lint:ratchet         → erros 68/68, avisos 27/27
```

**Write-lock:** `Backend/src/app.py`, `Backend/tests/api/test_alinhadores.py` (novo), `Frontend/.../AlignerSelect.jsx` (novo), `Frontend/.../pipelineConfigurator.jsx`, `docs/science/07-gargalos-e-rotas.md` (novo). **Reversível:** sim.

### DEC-042 · 2026-08-25 · M2.6 e M2.7 — o dataset de referência e o portão científico existem

**M2.6 — dataset de referência versionado.** `Backend/tests/data/reference/`, gerado por `docs/science/scripts/gerar_dataset_referencia.py` e regenerável por `make reference-dataset`.

O conjunto é o **VARV-49**, e a escolha não precisou de decisão: é o único dos quatro experimentos que é ao mesmo tempo **taxonomicamente limpo** (49/49 *Orthopoxvirus*, conferido) e com **delineamento defensável** — 45 VARV contra 2 CMLV, 1 CPXV e 1 TATV, que é exatamente a composição-alvo do plano e a replicação de Li *et al.* (2007).

Contém `README.md` de proveniência, `accessions.txt` com a classificação de cada acesso, `expected.json` com o invariante declarado, as árvores de referência e `MANIFEST.sha256`. Um teste confere o manifesto: **se um arquivo mudou sem o manifesto ser regenerado, a proveniência deixou de valer** — e um dataset de referência sem proveniência é tão indefensável quanto um contaminado.

**M2.7 — o portão.** `make reference-check` (rápido, qualquer máquina, segundos) e `make reference-check-full` (reexecuta; máquina de validação). O rápido responde *"a refatoração preservou a biologia?"*; o completo, *"o pipeline ainda produz essa biologia?"*. São perguntas diferentes e só a primeira pode rodar em CI.

**Decisões do usuário que moldaram o portão** (2026-08-25):

| Escolha | Decisão | Consequência |
|---|---|---|
| Tolerância | **só o invariante biológico** | A topologia é registrada como *impressão digital do ambiente*, e mudança nela é sinal para investigar — não reprovação. Exigir topologia idêntica reprovaria por troca de máquina: D17 mediu RF = 8 com a mesma semente |
| Composição de M | **esperar a reexecução completa** | O portão fica em código 2 até lá. Escolha informada: a opção dizia que bloqueia o fechamento de M2 |
| Execução | **dois níveis** | O rápido é o portão do dia a dia; o completo valida a reexecução |

**Três códigos de saída, não dois:**

```
0   invariante válido E M completo     — portão satisfeito
2   invariante válido, M incompleto    — falta reexecutar
1   invariante VIOLADO                 — sempre falha
```

O código 2 existe porque *"ainda não terminamos"* e *"quebrou"* são estados diferentes, e colapsá-los ensinaria a ignorar o portão.

**Estado atual, medido:**

```
✓ monofilia_varv    4 táxons   recuperado por todos os 4 pipelines
✓ clado_p2          6 táxons   recuperado por todos os 4 pipelines
✓ p2_basal         10 táxons   recuperado por todos os 4 pipelines
○ Invariante válido, mas M incompleto: 4 de 5.  Faltam: mafft_raxml
```

**O portão compara pipelines por nome, não por contagem.** Com 8 árvores em disco e alvo 5, a contagem diria "completo" — mas 4 são cópias byte a byte do braço `clustalo` ([D1](../science/02-defeitos-que-alteram-resultado.md#d1)) e falta o RAxML. E o invariante é conferido **só sobre os pipelines do alvo**: um braço que é cópia de outro não é um voto.

**Uma sutileza que vale registrar.** Sob semântica de bipartição, *"VARV é monofilético"* e *"o grupo externo é monofilético"* são **a mesma afirmação** — a bipartição é não ordenada, e o representante canônico é o lado menor, o grupo externo de 4 táxons. Está escrito no `expected.json` para que ninguém tropece nisso depois.

**M alvo: 5, não 15.** Após a medição de que MUSCLE e Clustal Omega são inviáveis em sequências de ~230 kb, o M alvo do VARV-49 é **MAFFT × 5 métodos de inferência**. Os dois alinhadores excluídos ficam em `aligners_excluded` **com o motivo medido**, não apenas removidos. Isso não enfraquece o portão: o invariante de Li *et al.* sempre foi sobre **métodos de inferência**, nunca sobre alinhadores — os "4/4" são FastTree, IQ-TREE, NJ e UPGMA, todos sobre o mesmo alinhamento.

**O que falta para o portão sair de 2 e ir a 0:** uma coisa só — **o RAxML sobre o VARV-49**. Ele nunca rodou ali, por causa do `SIGSEGV` do `--threads auto` que [D17](../science/02-defeitos-que-alteram-resultado.md#d17) corrigiu.

**Evidência de execução:**
```
make reference-dataset                                       → 49 táxons, invariantes 3/3
make reference-check                                         → invariante 3/3, código 2
cd Backend && pytest tests/oracle/test_portao_cientifico.py  → 11 passed
                pytest tests                                 → 216 passed, 1 xfailed
```

**Write-lock:** `Backend/tests/data/reference/**` (novo), `Backend/tests/oracle/test_portao_cientifico.py` (novo), `docs/science/scripts/{gerar_dataset_referencia,reference_check}.py` (novos), `Makefile`. **Reversível:** sim.

---

### DEC-041 · 2026-08-25 · **Independência de hardware vira requisito de projeto** — limites deixam de ser escalares

**Pergunta do usuário que originou o achado:** *"esses limites dos alinhadores são algo fixo ou é por conta da arquitetura desta máquina? Como definimos os limites para qualquer arquitetura?"*

Análise completa em [R2](../respostasUteis/r2.md). O resumo é que **estávamos rotulando mal os números**, e o erro tem a mesma forma de [D1](../science/02-defeitos-que-alteram-resultado.md#d1) e do `20000` herdado do Clustal Omega: **um número sem as suas condições.**

**Há duas coisas dentro de cada limite, e elas se comportam de forma oposta quando o hardware muda:**

| | Natureza | Transfere? |
|---|---|---|
| **A lei de escala** — como o consumo cresce com `n` e `L` | do **algoritmo** | sim |
| **O ponto onde a curva cruza o orçamento** | da **máquina** | **não** |

Escrevemos o campo como `max_sequence_bp`, como se fosse intrínseco à ferramenta, e jogamos a condicionalidade na prosa. Mas **"10.788 pb" não é propriedade do MUSCLE** — é propriedade de `MUSCLE ⊗ esta máquina ⊗ este formato de dado`. O MUSCLE consumiu 19,4 GB antes de ser morto numa máquina de 31 GB; numa de 125 GB provavelmente teria terminado.

**O que foi aplicado.**

1. **`ResourceModel` e `Measurement`** (novos, em `aligners.py`): a lei de escala declarada, a constante quando há, e os **pontos medidos com as suas condições** — dimensões, desfecho, pico de RSS, **memória da máquina** e data. Uma medição sem `machine_bytes` não é interpretável, não transfere, e o código a ignora explicitamente.
2. **`viability(n, L, available_bytes=None)`**: sem argumento, lê a memória **da máquina em execução**. O mesmo código passa a dar vereditos diferentes em máquinas diferentes — que é o comportamento correto, não um bug.
3. **O modelo de custo tem precedência sobre o limite escalar.** Onde há estimativa, o `max_sequence_bp` não é consultado: mantê-lo faria a ferramenta vetar numa máquina de 128 GB pelo que mediu numa de 31.
4. **Falha observada vence estimativa.** Uma falha só condena máquinas de orçamento **igual ou menor**; numa maior, o veredito volta a ser do modelo.
5. **`fitted=False` em todos os modelos.** Com pontos de uma máquina só, expoente e deslocamento ficam confundidos — qualquer curva passa por dois pontos. Um teste falha se alguém marcar `fitted=True` sem calibrar em duas máquinas.
6. **Estimativa vinda de falha é declarada como piso** (`bytes_is_lower_bound`): o pico registrado no instante da morte subestima por construção.

**Dois defeitos meus, achados ao testar o próprio mecanismo:**

- Com a estimativa mandando, o MUSCLE apareceu como **viável justamente no conjunto em que o vimos morrer** — porque 19,9 GB estimados < 26,7 GB utilizáveis. É o problema do piso, e é o que motivou a regra 4.
- A comparação `m.machine_bytes >= budget` falhava contra a **própria máquina**: registrei `33.400.000.000` e o sistema reporta `33.424.216.064`. Vinte e quatro MB de arredondamento apagavam a observação. Passou a usar tolerância de 5%, com o motivo no docstring.

**Comportamento resultante, verificado nos quatro casos:**

| Máquina | Conjunto | MUSCLE |
|---|---|---|
| 31 GB (esta) | 52 × 228 kb | **inviável** — observado falhar aqui |
| 128 GB | 52 × 228 kb | **viável** — a falha foi numa máquina menor |
| 8 GB | 52 × 228 kb | inviável |
| 31 GB | 20 × 10,8 kb | viável |

**Memória não é o único eixo — e a prova é D17.** O RAxML morreu com `SIGSEGV` numa máquina e concluiu em 251 s noutra, com o mesmo arquivo e a mesma linha de comando: o alinhamento comprimia para 3.713 padrões, dezenas de MB. **Memória não tinha nada a ver** — foi o esquema de paralelização. E, com a mesma semente, mudar só a paralelização deu **RF = 8** entre as árvores. Um limite em pares de base não vê três dos quatro eixos.

**Consequência para o manuscrito:** o fingerprint de execução passa a ser **parte do resultado científico**. Se o número de núcleos muda a árvore, relatar a topologia sem relatar o esquema de paralelização é relatar metade do experimento.

**Novos artefatos de contexto:**

- [`12-portabilidade-e-migracao.md`](12-portabilidade-e-migracao.md) — o mapa: os quatro eixos, o que já é portável (7 mecanismos), o que não é (8 itens com destino), o procedimento ao ligar numa máquina nova, e as 6 regras de projeto que decorrem disso.
- **`CLAUDE.md` ganha a regra 8**: nenhum limite absoluto compilado.
- **M7.7 recalibrado** para exigir ≥2 máquinas, e em função de **colunas distintas**, não `L` bruto — 259.496 sítios comprimiram para 3.713 padrões, e é o número comprimido que manda no consumo.
- **M7.8 criado**: o eixo de núcleos no modelo de custo.

**Evidência de execução:**
```
cd BioComp_UFF && python -m unittest workflow.tests.test_aligners   → Ran 22 tests, OK
                  (suíte completa do submódulo)                      → Ran 138 tests, OK
cd Backend     && pytest tests                                       → 216 passed, 1 xfailed
npm run build · npm run lint:ratchet                                 → ✓ · 68/68, 27/27
```

**Write-lock:** `BioComp_UFF/workflow/alignment/aligners.py`, `BioComp_UFF/workflow/tests/test_aligners.py`, `Backend/src/app.py`, `Frontend/.../AlignerSelect.jsx`, `docs/respostasUteis/r2.md`, `docs/automation/12-portabilidade-e-migracao.md` (novo), `CLAUDE.md`, `docs/automation/10-marcos-e-metas.md`. **Reversível:** sim.

### DEC-043 · 2026-08-25 · Ambiente isolado, binário resolvido por nome — e a **retratação** de um fato que nunca existiu

**Gatilho:** o IQ-TREE falhava ao instalar na máquina nova, e o usuário pediu um env conda próprio do projeto, separado do ambiente geral da máquina.

#### O fato retratado

Este log, [`11-handoff`](11-handoff-maquina-de-validacao.md) e [`12-portabilidade`](12-portabilidade-e-migracao.md) afirmaram, em três lugares e por vários dias, que havia **divergência de versão entre máquinas** — FastTree 2.2.0 × 2.1.11, RAxML-NG 1.2.2 × 1.1.0 — e que isso **bloqueava a replicação exata**, exigindo uma decisão entre pinar as versões de origem ou reexecutar tudo.

**Não havia divergência.** O env conda do projeto sempre teve FastTree **2.2.0**, RAxML-NG **1.2.2** e IQ-TREE **3.0.1** — as mesmas versões dos logs dos artefatos. Com o env não ativado, o PATH resolvia `/usr/bin/FastTree` 2.1.11 e `/usr/local/bin/raxml-ng` 1.1.0, e eu registrava o binário do sistema como se fosse "a versão do projeto".

O que a retratação muda:

- **A decisão pendente não existe.** O item correspondente de [`08-ficha-de-fatos §1`](08-ficha-de-fatos.md) está resolvido: as versões coincidem.
- **A linha do ledger de 2026-08-24** ("Divergência de versão do RAxML-NG entre máquinas… **Bloqueia replicação exata**") fica **retratada** — mantida no registro porque o histórico de crença faz parte da auditoria, com a correção anotada na própria linha.
- **A causa real é operacional e reaparece em qualquer máquina** onde as ferramentas existam também fora do conda.

**A lição:** medir a ferramenta errada produz um fato falso que se propaga por todo o registro. Antes de anotar uma versão, confira **de onde** o binário veio, não só o número que ele imprime.

#### O defeito de instalação

O pacote `iqtree` do bioconda instalava `iqtree2` na série 2.x e passou a instalar `iqtree` e `iqtree3` na 3.x — **sem `iqtree2`**. O pipeline chamava `'iqtree2'` fixo em `builder.py`, e o manifesto procurava por esse mesmo nome. Consequência: quem seguisse a receita do projeto **instalava o IQ-TREE com sucesso e mesmo assim não conseguia rodar**, e o manifesto gravava `"iqtree2": null` numa máquina onde a ferramenta estava instalada — o mesmo erro que já tinha tirado o MrBayes do conjunto de validação ([D20](../science/02-defeitos-que-alteram-resultado.md#d20)).

**Correção:** `workflow/utils/external_tools.py` passa a ser o **único lugar** que sabe os nomes possíveis de cada ferramenta (`iqtree3`/`iqtree2`/`iqtree`, `FastTree`/`fasttree`/`FastTreeMP`, `mb`/`mrbayes`). Pipeline e manifesto consultam a mesma tabela — duas listas divergindo seria [D5](../science/02-defeitos-que-alteram-resultado.md#d5) em outro assunto.

#### O ambiente isolado

Correção de rota: **`application_ui.sh` sempre criou o env `Phylotreeminer` e instalou com `-n`** — nunca contaminou o `base`. O `conda install` sem `-n` estava só no helper `scripts/check_dependencies.sh --install`, acrescentado por mim em `4214c36`. O `cleanup_env.sh` mediu esta máquina: **o `base` está limpo, não há nada a desfazer.**

O defeito real do instalador era outro, e é o que explica o erro do IQ-TREE na máquina nova:

```bash
conda config --add channels defaults    # ← reescreve o ~/.condarc GLOBAL
conda config --add channels bioconda
conda config --add channels conda-forge
```

Duas coisas erradas de uma vez. Primeira: `conda config` mexe na configuração **global do usuário**, o oposto de manter o projeto separado — quem rodasse o setup levava os canais do PhyloTreeMiner para todo trabalho seu em conda. Segunda: `defaults` **conflita com o bioconda** na resolução e passou a exigir aceite dos termos de serviço da Anaconda; numa máquina nova, essa combinação é o que faz a instalação do IQ-TREE falhar.

Além disso, a lista de ferramentas do instalador (`clustalo mafft iqtree fasttree raxml-ng mrbayes`) **não tinha MUSCLE** — duas listas para a mesma coisa, já divergindo.

**Correção:** `application_ui.sh` delega a criação do ambiente a `scripts/setup_env.sh` e a verificação a `scripts/check_dependencies.sh --install`. Os canais passam a ser fixados **por ambiente**, dentro do `environment.yml`, e o `~/.condarc` do usuário não é mais tocado. A lista de ferramentas passa a existir num lugar só.

| Artefato | O que passa a garantir |
|---|---|
| `environment.yml` | Receita completa: python 3.10, as 7 ferramentas (incluindo **muscle**), pyqt, e `pip: -r requirements-dev.txt` como fonte única das dependências Python. Canais conda-forge + bioconda; `defaults` fica de fora |
| `scripts/setup_env.sh` | Cria ou atualiza o env do projeto; **recusa** ter o `base` como alvo; `--recreate`; diagnóstico ordenado quando a resolução falha (ARM sem build no bioconda, prioridade de canal, solver) |
| `scripts/cleanup_env.sh` | Diagnostica e desfaz o que foi parar no `base`. **Não apaga nada sem `--apply`** e confirma antes |
| `scripts/lib_env.sh` | Resolve o nome do env num lugar só, **sem diferenciar maiúsculas** — esta base tinha um env `Phylotreeminer` anterior à receita, e procurar `phylotreeminer` exato faria os scripts criarem um segundo env em vez de reaproveitar o existente |
| `check_dependencies.sh` | Procura em `PTM_BIN` > env do projeto > PATH (com aviso ruidoso), usa **lista de candidatos** por ferramenta, sinaliza toda ferramenta resolvida **fora do env** e a inclui na lista de instalação — presente no sistema não é presente no projeto. Instala sempre com `-n` |
| `application_ui.sh` | Deixa de configurar canais globalmente e de manter a própria lista de ferramentas; chama os dois scripts acima |
| `scripts/lib_node.sh` | Detecção e instalação assistida do pnpm num lugar só, usada por `start.sh` e `application_ui.sh` |

**Estado desta máquina, medido:** o `base` está **limpo** (nada a desfazer); o env `Phylotreeminer` tem 6 das 7 ferramentas; **MUSCLE** só existe em `/usr/bin` (3.8.1551) e agora é oferecido para instalação no env.

#### pnpm no lugar do npm

Pedido do usuário, por ser mais rápido e mais leve em disco. `pnpm import` converteu o `package-lock.json` preservando as versões resolvidas; o lockfile antigo saiu, junto com um `package-lock.json` vazio que tinha sobrado na raiz do repositório.

Três coisas que a migração obrigou a arrumar:

- **`allowBuilds`** em `pnpm-workspace.yaml`: o pnpm 10 parou de rodar scripts de build de dependências por padrão e o 11 renomeou a chave. Sem autorizar o `esbuild`, o pnpm o ignora **em silêncio** e o vite quebra ao *rodar*, não ao instalar — falha que aparece longe da causa.
- **`"test": "vitest run"`**: o script era `vitest` puro, e o modo watch só não travava porque o `npm run test -- --run` repassava a flag. O pnpm não repassa igual, e a chamada ficou pendurada. Depender de repasse de flag para não travar é frágil em qualquer gestor; o modo interativo virou `test:watch`.
- **`--frozen-lockfile`** no instalador, no lugar de `rm -rf package-lock.json`: apagar o lockfile a cada setup significa que duas máquinas podem resolver árvores de dependência diferentes **do mesmo commit**.

`scripts/lib_node.sh` faz a detecção assistida: tenta o **corepack** primeiro — vem com o Node e não exige administrador —, depois `npm install -g pnpm`, e só então pede ação do usuário, listando as três formas de instalar. `start.sh` confere o pnpm **antes** de subir o Neo4j, porque falhar depois de subir o banco e o backend é descobrir tarde. Os dois caminhos foram exercitados com o PATH podado: com corepack, resolve sozinho; sem Node, orienta e sai com código 1.

| | npm | pnpm |
|---|---|---|
| `install` limpo | — | 2,6 s |
| `build` | — | 19,0 s |
| `test` | — | 0,8 s, 8 testes |
| `lint:ratchet` | 68/68 · 27/27 | 68/68 · 27/27 (idêntico) |

**Evidência de execução:**
```
bash scripts/cleanup_env.sh          → base LIMPO, nada a desfazer; 8 binários de sistema
bash scripts/check_dependencies.sh   → env Phylotreeminer: MAFFT 7.525, Clustal 1.2.4,
                                        FastTree 2.2.0, IQ-TREE 3.0.1 (iqtree3),
                                        RAxML-NG 1.2.2, MrBayes 3.2.7
                                        ⚠ MUSCLE fora do env (/usr/bin/muscle)
python -m pytest workflow/tests/     → 150 passed
pnpm install --frozen-lockfile       → Done in 2.6s
pnpm run build · test · lint:ratchet → ✓ built in 19.03s · 8 passed · 68/68, 27/27
bash -n application_ui.sh            → sem erro de sintaxe
```

**Write-lock:** `environment.yml`, `application_ui.sh`, `scripts/{setup_env,cleanup_env,check_dependencies,lib_env}.sh`, `BioComp_UFF/workflow/utils/{external_tools,manifest}.py`, `BioComp_UFF/workflow/tree_construction/builder.py`, `BioComp_UFF/workflow/tests/{test_external_tools,test_manifest}.py`, `Frontend/phylotreeminer/{package.json,pnpm-lock.yaml,pnpm-workspace.yaml}`, `Makefile`, `.github/workflows/ci.yml`, `README.md`, `docs/automation/{07,10,11,12}`. **Reversível:** sim.

### DEC-044 · 2026-08-25 · A máquina de validação entra em operação — e as versões deixam de ser sorteadas

**Gatilho:** primeira sessão de trabalho na máquina de validação (`geomesh`), com `BioComp_UFF/projects/` já repovoado. O objetivo era rodar o portão de sanidade de [`11-handoff §3`](11-handoff-maquina-de-validacao.md); o portão passou e expôs, no caminho, um problema que [DEC-043](#dec-043--2026-08-25--ambiente-isolado-binário-resolvido-por-nome--e-a-retratação-de-um-fato-que-nunca-existiu) não tinha fechado.

#### O portão de sanidade: 6 de 6

Submódulo em `rigor-cientifico-m1-m2`, HEAD `0f80941`, env `Phylotreeminer` ativo. A tabela item a item está em [`11-handoff §3.1`](11-handoff-maquina-de-validacao.md); em resumo: **216 passed / 1 xfailed**, **Ran 150 tests OK**, **137 pares e 0 divergências** no oráculo dendropy, **5 de 5 conjuntos com 0 divergência** na §3 do `audit_variola.py`, **8 passed · 68/68 · 27/27 · ✓ built**, e `reference-check` com **invariante 3/3**.

Três expectativas escritas no handoff estavam desatualizadas e foram corrigidas **contra a execução real**, não o contrário: `182 passed` → **216**, `Ran 81 tests` → **82**, `erros 69/69` → **68/68**.

O ambiente da máquina — Threadripper 2970WX, 24 núcleos físicos / **48 lógicos**, 47 GB de RAM, 786 GB livres — está registrado em [`11-handoff §2.3`](11-handoff-maquina-de-validacao.md). É a máquina que a §4 do handoff estava esperando.

#### O que o portão expôs: **a receita não pinava versão**

As 7 ferramentas resolvem todas dentro do env — não é o sombreamento de PATH de [DEC-043](#dec-043--2026-08-25--ambiente-isolado-binário-resolvido-por-nome--e-a-retratação-de-um-fato-que-nunca-existiu). E mesmo assim as versões diferem da máquina de desenvolvimento:

| Ferramenta | Validação | Desenvolvimento | |
|---|---|---|---|
| RAxML-NG | **2.0.2** | 1.2.2 | ❌ salto de versão maior |
| MUSCLE | **5.3** | 3.8.1551 (fora do env) | ❌ interfaces incompatíveis (`-align/-output` × `-in/-out`) |
| IQ-TREE | 3.1.3 | 3.0.1 | ~ |
| MAFFT | 7.526 | 7.525 | ~ |
| Clustal Omega · FastTree · MrBayes | 1.2.4 · 2.2.0 · 3.2.7 | idem | ✅ |

A causa é única e banal: `environment.yml` listava `- raxml-ng` sem versão. **Duas máquinas que rodam `make setup` em datas diferentes recebem o que o canal tiver no dia.** DEC-043 tirou o env da máquina e o pôs no projeto; faltava o passo seguinte — tirá-lo também do calendário.

É o eixo *"versão da ferramenta"* de [`12-portabilidade §1`](12-portabilidade-e-migracao.md), e ele interage com a zona sagrada: a versão do inferidor **faz parte do resultado**, não do ambiente.

#### Decisão do usuário: adotar 2.0.2 e pinar

Perguntado entre pinar 1.2.2 (a versão dos logs dos artefatos) ou adotar 2.0.2, o usuário decidiu **adotar 2.0.2 e pinar no `environment.yml`**. O fundamento é que os artefatos em disco são **pré-M1** e vão ser substituídos pela reexecução de [`§4.1`](11-handoff-maquina-de-validacao.md) de qualquer forma — preservar comparabilidade item a item com números que já se sabe errados não paga uma versão de 2024.

**Consequências que ficam declaradas:**

1. Reexecutar VARV **não reproduz** as árvores de RAxML em disco, por construção. Não é defeito; é a versão declarada mudando.
2. A medição que declarou o **MUSCLE inviável em *Variola*** (19,4 GB e OOM, [DEC-041](#dec-041--2026-08-25-independência-de-hardware-vira-requisito-de-projeto--limites-deixam-de-ser-escalares)) foi feita contra o **3.8.1551 do sistema**. Ela **não transfere** para o 5.3 e precisa ser refeita antes de valer como veredito.
3. Com **48 núcleos lógicos** contra 12, [D17](../science/02-defeitos-que-alteram-resultado.md#d17) deixa de ser hipótese: `--threads N --workers 1` é obrigatório e **o próprio `N` entra no manifesto**.

**O que foi pinado:** as 7 ferramentas e o `pyqt` no `environment.yml`; e, no `requirements.txt`, as 8 dependências Python que ainda estavam soltas (`fastapi`, `uvicorn[standard]`, `python-multipart`, `aiofiles`, `owid-catalog`, `ijson`, `ete3`, `PyQt5`). Pinar metade da lista é o mesmo que não pinar: basta uma dependência solta para dois commits idênticos produzirem ambientes diferentes.

#### O bloqueio operacional do frontend: **existir não é servir**, de novo

O `pnpm` 11.6.0 fixado em `packageManager` exige **Node ≥ 22.13**. Nesta máquina `/usr/bin/node` é o **18.19.1**, e o Node 22.23.2 já estava no **nvm** — só nunca era carregado nos shells não interativos que rodam os scripts. Sintoma: `start.sh` imprimia `✓ pnpm` com a versão **em branco**, subia Neo4j, backend e frontend, e o frontend morria 15 s depois.

Duas correções, e as duas são a mesma regra de `check_dependencies.sh`:

- **`garantir_pnpm` aprovava um `pnpm` que não executa.** `command -v` só responde se o arquivo existe. A checagem passa a **executar** `pnpm --version` e exigir saída não vazia.
- **`lib_node.sh` resolve o Node como as ferramentas de bioinformática são resolvidas**: `PTM_NODE_BIN` > o do PATH, se atender > nvm > pedir ação do usuário. `make` passa a ir pelo `scripts/pnpm.sh`, que garante o Node antes de chamar o pnpm.

Exercitado com o PATH podado ao Node 18: os três alvos do frontend passam.

#### Pinar sem verificar não fecha nada

Pinar a receita corrige quem **cria** o env a partir daqui. Não corrige quem já
tem um: um env criado antes do pino continua com a versão antiga, e
`check_dependencies.sh` dizia **✓** para ele — reportava o número e não o
comparava com nada. É a mesma classe de defeito que o script foi escrito para
pegar, um nível acima.

`check_dependencies.sh` passa a ler o pino do `environment.yml` — **a receita é a
única fonte**, manter uma segunda lista de versões dentro do script seria
[D5](../science/02-defeitos-que-alteram-resultado.md#d5) noutro assunto — e a
comparar com o que está instalado. A divergência aparece na linha da ferramenta,
entra no resumo e **entra no comando de instalação já com a versão certa**. Por
padrão é aviso; com `--strict` reprova, que é o modo do portão de sanidade e do
CI. A comparação é por prefixo, porque a receita pina `muscle=5.3` e o binário
imprime `5.3.linux64`.

Exercitado nos dois sentidos — o negativo com uma receita de teste
(`PTM_RECEITA`) pedindo as versões da máquina de desenvolvimento:

```
bash scripts/check_dependencies.sh              → 7 ✓, exit 0 (env bate com a receita)
PTM_RECEITA=<receita pedindo 1.2.2 e 3.8.1551>  → ⚠ MUSCLE 5.3≠3.8.1551
                                                  ⚠ RAxML-NG 2.0.2≠1.2.2
                                                  e sugere: conda install -n Phylotreeminer
                                                            muscle=3.8.1551 raxml-ng=1.2.2
  … com --strict                                → exit 1
```

#### Docker e Neo4j

Resolvidos pelo usuário durante a sessão. `docker ps` responde e o contêiner `phylotree_neo4j` (`neo4j:2026.01.3`) está de pé em `127.0.0.1:7474` e `7687`; `curl` devolve **http 200**. A pendência aberta em §2.3.3 do handoff está encerrada.

**Evidência de execução:**
```
make test-backend                       → 216 passed, 1 xfailed (67 s)
python -m unittest (9 módulos)          → Ran 150 tests, OK
oraculo_rf_dendropy.py                  → 137 pares, 0 divergências
audit_variola.py --secao 3 --secao 5    → 5 de 5 conjuntos, 0 divergência(s); §5 completa os 4 (125 s)
make test-frontend / lint / build       → 8 passed · 68/68, 27/27 · ✓ built em 20,8 s
make reference-check                    → invariante 3/3; M = 4 de 5 (falta mafft_raxml)
conda env create -f environment.yml --dry-run  → exit 0 (os pinos resolvem nos canais)
bash scripts/check_dependencies.sh --strict    → 7 ✓, exit 0
docker ps                               → phylotree_neo4j Up; curl :7474 → http 200
```

**Write-lock:** `environment.yml`, `requirements.txt`, `requirements-dev.txt`, `scripts/{lib_node,pnpm,check_dependencies}.sh`, `Makefile`, `application_ui.sh`, `CLAUDE.md`, `docs/automation/{07,11,12}`. **Reversível:** sim.

### DEC-045 · 2026-08-25 · Pré-voo §4.0 na máquina de validação — o que muda entre máquinas é a **versão**, e só ela

**Gatilho:** [`11-handoff §4.0`](11-handoff-maquina-de-validacao.md) manda rodar o conjunto de validação antes de qualquer conjunto grande. Era o primeiro uso real do pipeline nesta máquina, e o primeiro sob o env pinado de [DEC-044](#dec-044--2026-08-25--a-máquina-de-validação-entra-em-operação--e-as-versões-deixam-de-ser-sorteadas).

Projeto novo `Zika_21seq_validacao_mv` — o original é a evidência do "antes" e **não foi sobrescrito**. `mode: "advanced"` ([D18](../science/02-defeitos-que-alteram-resultado.md#d18)), `ignore_mode: ["mrbayes"]`, semente 12345, `raxml_threads=4`, `iqtree_threads=4`. `run_id` `e66311b836c8`.

#### O portão: TUDO VERDE, e 3 de 14 pipelines com topologia diferente

`conferir_correcoes_m1.py` devolveu **TUDO VERDE** nos três blocos (M2.5, M1.1, M1.2, M1.3) e o oráculo dendropy confirmou **91 pares, 0 divergências**. Os números derivados, porém, não são os mesmos da máquina de desenvolvimento ([DEC-030](#dec-030--2026-08-25--o-conjunto-de-validação-roda-fim-a-fim)):

| Medida | Desenvolvimento | Validação | |
|---|---|---|---|
| árvores / pipelines | 14 / 14 | **14 / 14** | ✅ |
| duração total | 11 min 03 s (12 núcleos) | **9 min 40 s** (48 núcleos) | ✅ |
| FPMax | 37 linhas, 37 itemsets | **38 / 38** | ⚠ |
| frágeis ∩ robustos | ∅ | **∅** (17 frágeis, 9 robustos) | ✅ |
| clados canônicos × legados | 46 × 109 | **47 × 115** | ⚠ |
| bipartições | \|B\| = 17 = n − 3 · **7** universais | \|B\| = **17** · **6** universais | ⚠ |
| oráculo dendropy | 91 pares, 0 divergências | **91 pares, 0 divergências** | ✅ |

Comparando árvore a árvore contra a execução de desenvolvimento, a diferença é **localizada**:

```
clustalo_iqtree   RF = 8      |  os outros 11 pipelines:  RF = 0
clustalo_raxml    RF = 4      |  (fasttree, nj/upgma × distance/parsimony,
mafft_raxml       RF = 2      |   nos dois braços de alinhamento — idênticos)
```

#### Isolar a causa: **não é a máquina, é a versão**

Três diferenças candidatas mudaram ao mesmo tempo — 48 núcleos contra 12, RAxML-NG 2.0.2 contra 1.2.2, IQ-TREE 3.1.3 contra 3.0.1 — e "as duas coisas mudaram" não é uma explicação. Duas medições descartam as outras duas hipóteses:

**1. O alinhamento é byte a byte idêntico.** MAFFT 7.526 aqui e 7.525 lá produzem o mesmo arquivo, e o Clustal Omega 1.2.4 também:

```
a879a6e9…  dataset_final_clustalo.aln   (desenvolvimento)
a879a6e9…  dataset_final_clustalo.aln   (validação)
aa754c13…  dataset_final_mafft.aln      (desenvolvimento)
aa754c13…  dataset_final_mafft.aln      (validação)
```

A divergência nasce **depois** do alinhamento. O fator alinhador está fora.

**2. O número de núcleos não muda a topologia — com `--workers 1`.** Mesmo alinhamento, mesma semente, variando só a paralelização, nesta máquina:

| | 2 threads | 4 threads | 8 threads | 16 threads |
|---|---|---|---|---|
| RAxML-NG 2.0.2 | logLK −21861,779444 | −21861,779446 | −21861,779445 | *recusado* |
| IQ-TREE 3.1.3 | −21882,206 | −21882,205 | −21882,208 | — |
| **RF entre elas** | **0** | **0** | **0** | — |

A árvore que o pipeline gravou (`threads=4`) também tem RF = 0 contra a de 2 threads. **A fixação de [D17](../science/02-defeitos-que-alteram-resultado.md#d17) funciona**: `--threads N --workers 1` neutraliza o efeito da paralelização numa máquina de 48 núcleos, que é justamente onde ele deveria aparecer com mais força. Isso não retira `N` do manifesto — retira dele o poder de explicar esta divergência.

**Conclusão:** eliminados o alinhador e a paralelização, o que resta é a **versão do inferidor**. RAxML-NG mudou nos dois braços e é o único a divergir nos dois; IQ-TREE mudou e diverge num braço só — o que é o comportamento esperado de um ótimo de verossimilhança quase empatado, não o de um defeito. É a consequência 1 de DEC-044, agora **medida** em vez de prevista.

> ⚠️ **Corrigido em [DEC-046](#dec-046--2026-08-26--tools_invoked-deixa-de-sair-vazio--o-manifesto-passa-a-registrar-o-que-rodou).** A conclusão acima vale para o **RAxML-NG** e **não vale para o IQ-TREE**. Duas execuções na mesma máquina, mesma versão e mesma semente mostraram que o IQ-TREE com `-nt 4` **não é determinístico** ([D21](../science/02-defeitos-que-alteram-resultado.md#d21)): a divergência dos braços de IQ-TREE era ruído entre execuções, e teria aparecido sem trocar de máquina nem de versão. O RAxML-NG, no mesmo teste, é determinístico — logo a atribuição à versão continua de pé para ele. O erro de raciocínio foi tratar "eliminei duas hipóteses" como "provei a terceira", sem medir a repetibilidade da própria medida.

> Pela mesma razão, a coluna **Validação** da tabela acima e a de [`11-handoff §4.0`](11-handoff-maquina-de-validacao.md) não são expectativa estável: `38 / 47 / 6` é **uma** amostra. Uma segunda execução idêntica devolveu `34 / 43 / 7`.

O resto move-se por arrasto: 3 topologias diferentes produzem clados distintos diferentes (47 × 46), um itemset a mais no FPMax (38 × 37) e uma bipartição universal a menos (6 × 7) — a bipartição que os 14 pipelines compartilhavam lá deixou de ser compartilhada aqui. Nenhum desses números é "o certo" ou "o errado": são **duas versões declaradas do mesmo experimento**, e é por isso que a versão passou a ser pinada.

#### O achado que o pré-voo entregou de graça: **`tools_invoked` está vazio**

O manifesto grava `tools_available` com as 7 versões e grava `tools_invoked: {}` — **nas duas máquinas**. `ExecutionManifest.register_tool_run` existe, tem docstring que diz exatamente por que existe ("é o que responde 'com que semente e com que paralelização esta árvore foi feita' — e, depois de D17, sabe-se que a paralelização muda a topologia"), tem teste de unidade em `test_manifest.py:178`… e **nenhum ponto do pipeline a chama**.

O teste passa porque chama o método direto. O artefato prova que ninguém chama. É o mesmo padrão de [D18](../science/02-defeitos-que-alteram-resultado.md#d18): o registro diz o que estava **disponível**, não o que foi **executado** — e era precisamente essa distinção que o campo existia para fazer.

**Não corrigido neste lote**, por escopo: mexe em `BioComp_UFF/**`, muda o artefato e obriga a refazer o pré-voo. Vai como lote próprio de T1, e é pré-requisito da reexecução de [`§4.1`](11-handoff-maquina-de-validacao.md) — reexecutar os cinco conjuntos gravando `tools_invoked: {}` é gastar a execução cara e não registrar a linha de comando que a produziu.

**Evidência de execução:**
```
python workflow.py -p <config Zika-21 advanced>   → 14 árvores, real 9m40,047s, exit 0
python Backend/scripts/conferir_correcoes_m1.py Zika_21seq_validacao_mv
                                                  → TUDO VERDE em M2.5/M1.1/M1.2/M1.3
                                                    38 linhas / 38 itemsets; 17 frágeis, 9 robustos
                                                    47 canônicos × 115 legados; n=20, |B| 17..17
                                                    14 pipelines, 6 bipartições universais
python docs/science/scripts/oraculo_rf_dendropy.py projects/Zika_21seq_validacao_mv
                                                  → 91 pares, 0 divergências
md5sum out/Align/*.aln (as duas execuções)        → idênticos nos dois alinhadores
raxml-ng --threads {2,4,8} --workers 1 (mesma semente)  → RF = 0 entre todas
iqtree3 -nt {2,4,8} -seed 12345                   → RF = 0 entre todas
raxml-ng --threads 16                             → ERROR: Too few patterns per thread
```

**Write-lock:** nenhum arquivo de produção. Projeto novo `BioComp_UFF/projects/Zika_21seq_validacao_mv/` e `docs/automation/{07,11}`. **Reversível:** sim.

### DEC-046 · 2026-08-26 · `tools_invoked` deixa de sair vazio — o manifesto passa a registrar o que **rodou**

**Gatilho:** o achado de [DEC-045](#dec-045--2026-08-25--pré-voo-40-na-máquina-de-validação--o-que-muda-entre-máquinas-é-a-versão-e-só-ela), aberto pelo usuário como lote próprio por ser pré-requisito da reexecução de [`§4.1`](11-handoff-maquina-de-validacao.md).

#### O defeito era de ligação, não de cálculo

`ExecutionManifest.register_tool_run` existia desde M2.5, com docstring justificando-se por [D17](../science/02-defeitos-que-alteram-resultado.md#d17) e com teste de unidade próprio. **Nenhum ponto do pipeline a chamava.** O teste passava porque chamava o método direto; o artefato em disco saía com `tools_invoked: {}` de toda execução, nas duas máquinas.

É a lição que este repositório já pagou em outras moedas: **um teste que exercita a função e não o caminho não prova que o caminho existe.** O teste de regressão agora entra pelo construtor de árvore, com a ferramenta externa substituída por um duplo que grava o arquivo que o método real vai ler — se alguém retirar a instrumentação, ele reprova.

#### Três defeitos, não um

Ao ligar o campo, dois outros apareceram — e nenhum apareceria sem executar e olhar o artefato.

**1. A forma antiga perdia chamadas.** `tools_invoked` era `ferramenta -> {command, ...}`: um dicionário chaveado por ferramenta. O delineamento tem **dois alinhadores**, então o RAxML-NG roda duas vezes por execução, e a segunda sobrescreveria a primeira — o manifesto declararia como único o comando que produziu metade das árvores. É a mesma classe de [D18](../science/02-defeitos-que-alteram-resultado.md#d18): declarar o disponível no lugar do executado. A forma passa a ser `ferramenta -> {parâmetros, "runs": [uma entrada por chamada]}`, cada chamada apontando a **saída que produziu** — que é o que responde "com que semente *esta* árvore foi feita". `manifest_version` vai a **2**; como o campo nunca chegou a ser populado, **nenhum artefato em disco tem a forma antiga**.

**2. Gravar a linha de comando crua reintroduziria D15.** `require_tool` devolve o caminho absoluto do binário, que mora no ambiente conda **do usuário**: `/home/<usuário>/miniconda3/envs/...`. E `os.path.relpath` de um caminho fora da raiz do projeto devolve `../../..` seguido do resto do caminho absoluto — relativizar não resolve, espalha. A regra passa a ser explícita: **dentro do projeto, caminho relativo; fora, só o nome do arquivo.** A versão de cada ferramenta já está em `tools_available`, e *onde* ela estava instalada não é reproduzível noutra máquina de qualquer forma.

**3. `params` vazava caminho absoluto — e a conferência dizia que não.** O módulo promete, na sua primeira linha, que "todo caminho é relativo à raiz do projeto". `params` era gravado **cru**, com `input_path` e `output_path` absolutos, nome de usuário incluído. `conferir_correcoes_m1.py` imprimia `[ ok ] nenhum caminho absoluto no manifesto (D15)` porque varre apenas as **chaves** de `inputs_sha256`/`outputs_sha256` — nunca olhou `params`. Um verde falso, de pé desde M2.5.

Corrigido no mesmo lote por três razões: é o mesmo arquivo, é a mesma promessa escrita no mesmo docstring, e a ferramenta de higienização acabou de ser construída dez linhas acima. Nada lê `manifest["params"]` — a configuração para reexecutar é o `config_backup.json`, que segue intacto.

#### O que passa a ser registrado

Uma chamada por invocação, com os parâmetros que decidem o resultado e **não se leem da linha de comando sem interpretá-la**:

| Ferramenta | Chamadas | Parâmetros registrados |
|---|---:|---|
| `mafft` | 1 | `threads`, **`estrategia`** (`--auto` × `--parttree`) |
| `clustalo` | 1 | `threads`, `n_sequencias` |
| `muscle` | — | `versao_maior` (a sintaxe muda entre 3.8 e 5.x), `n_sequencias` |
| `fasttree` | 2 | `model` — **sem semente**, e o registro diz isso |
| `iqtree` | 2 | `seed`, `threads`, `model`, `bootstrap` |
| `raxml-ng` | 2 | `seed`, `threads`, **`workers=1`** (D17), `model` |
| `mrbayes` | — | `ngen`, `burnin`, `samplefreq`, `model`, e a nota de que **não há semente** |

Três escolhas que valem registro:

- **A estratégia do MAFFT** (`--auto` × `--parttree`) é decidida pelo tamanho do conjunto, muda o alinhamento e portanto muda a árvore. Até aqui só existia no log da execução, que não acompanha o artefato.
- **O MrBayes registra `seed=None` como ausência declarada**, não como valor. A ferramenta gera a própria semente e a árvore **não é reprodutível** — é [D11](../science/02-defeitos-que-alteram-resultado.md#d11) vivo, e o manifesto passa a declará-lo em vez de omiti-lo. Regra 5 do projeto: "não aplicável" nunca é um número.
- **O FastTree é registrado mesmo sem semente nem paralelização.** Registrar a ausência é o que distingue *não se aplica* de *ninguém registrou* — que era exatamente a confusão que este lote veio desfazer.

O coletor (`workflow/utils/tool_runs.py`) é de processo, e a separação é deliberada: **quem chama registra o fato bruto; o manifesto decide o que pode ser gravado.** O `TreeBuilder` é construído seis vezes por execução, do fundo da pilha do controlador, e não tem — nem deve ter — referência ao manifesto.

#### Δ em métrica publicada: **nenhum por este lote — mas a conferência achou D21**

Nada aqui toca cálculo, e a conferência confirma: reexecutado o conjunto de validação, **12 dos 14 pipelines saem byte a byte idênticos** aos do pré-voo de DEC-045. Os dois que não saem são os de **IQ-TREE**, e a causa não é este lote.

Foi assim que apareceu [**D21**](../science/02-defeitos-que-alteram-resultado.md#d21): **o IQ-TREE com `-nt 4` não é determinístico**. Três repetições, mesma máquina, mesma versão, mesma semente, mesmo arquivo:

| Configuração | Repetições | Topologias distintas | RF |
|---|---:|---:|---:|
| IQ-TREE `-nt 4` | 3 | **3** | **2** |
| IQ-TREE `-nt 1` | 3 | 1 | 0 |
| RAxML-NG `--threads 4 --workers 1` (controle) | 3 | 1 | 0 |

O controle é o que dá o diagnóstico: o RAxML-NG, na mesma máquina e com quatro threads, **é** determinístico, porque `--workers 1` serializa a busca. D17 corrigiu a ferramenta onde o controle existia e **deixou passar a outra** — o IQ-TREE não tem equivalente a `--workers 1`, e fixar `-seed` e `-nt` não basta.

Isso **corrige uma conclusão de DEC-045**, que atribuiu à versão do inferidor toda a divergência entre as duas máquinas. Vale para o RAxML-NG; não vale para o IQ-TREE, cuja divergência era ruído entre execuções. O erro de raciocínio foi tratar "eliminei duas hipóteses" como "provei a terceira" sem medir a repetibilidade da própria medida — a correção está anotada na entrada de DEC-045.

Consequência prática para [`§4.1`](11-handoff-maquina-de-validacao.md): os números derivados do conjunto de árvores (**itemsets do FPMax, clados canônicos, bipartições universais**) variam entre duas execuções idênticas — medido `38 / 47 / 6` contra `34 / 43 / 7`. Nenhum dos dois está errado, e é exatamente o que o item "cada figura reproduzível por script + commit + hash" proíbe. **A escolha entre `-nt 1`, declarar o método não reprodutível, ou repetições com consenso é do usuário** e está em D21.

**Evidência de execução:**
```
python -m unittest (10 módulos)          → Ran 162 tests, OK   (eram 150: +8 test_tool_runs, +4 test_manifest)
make test-backend                        → 216 passed, 1 xfailed
python workflow.py (Zika-21 advanced)    → 14 árvores, exit 0, real 10m20s
  manifest_version                       → 2
  tools_invoked                          → 8 chamadas: mafft 1, clustalo 1,
                                             fasttree 2, iqtree 2, raxml-ng 2
  tokens absolutos em tools_invoked      → nenhum
  nome de usuário no manifesto inteiro   → ausente
conferir_correcoes_m1.py                 → TUDO VERDE
oraculo_rf_dendropy.py                   → 91 pares, 0 divergências
comparação com o pré-voo (DEC-045)       → 12 de 14 idênticos; os 2 de IQ-TREE não (D21)
iqtree3 -nt 4, 3 repetições, mesma semente → 3 md5 distintos, RF = 2
iqtree3 -nt 1, 3 repetições                → 1 md5
raxml-ng --threads 4 --workers 1, 3 rep.   → 1 md5 (controle)
```

**Write-lock:** `BioComp_UFF/workflow.py`, `BioComp_UFF/workflow/utils/{manifest,tool_runs}.py`, `BioComp_UFF/workflow/tree_construction/builder.py`, `BioComp_UFF/workflow/alignment/alignmentSeq.py`, `BioComp_UFF/workflow/tests/{test_manifest,test_tool_runs}.py`, `docs/automation/{07,10}`, `docs/skills/validar-workflow/SKILL.md`. **Reversível:** sim. **Não toca `Backend/`** — a correção do verde falso em `conferir_correcoes_m1.py` é lote seguinte, pela regra 6.

### DEC-047 · 2026-08-26 · Estado e duração são raspados do log — caracterizado como D22, e o manifesto já tinha a resposta

**Gatilho:** o usuário relatou que o status e a duração da execução são obtidos por leitura de log e erram — o status depende de um dicionário de etapas conhecidas e cai em `waiting` quando o termo não aparece. Pedido: caracterizar e registrar no plano.

**Lote de caracterização, não de correção.** Nada de produção foi alterado. O que se entrega é o "antes" da tabela de diff exigida por [`04-rigor §3`](04-rigor-cientifico.md), medido sobre os **21 projetos em disco**, mais o defeito registrado e o lote colocado no marco.

#### O relato confere, e é maior do que parecia

`Backend/scripts/sonda_status_execucao.py` replica os três endpoints. Seis achados, todos medidos:

**1. `idle` é o `else`.** O status sai de busca por substring e o ramo final devolve `idle` — o mesmo valor de "nunca executado", que a UI mostra como **"Waiting"**. `Zika_Virus_Singapura_Large_480seq_ADVANCED` rodou **8 h 43 min**, parou em `Construction of Subtrees.` e aparece como *Waiting*. `test` aparece como *Waiting* embora tenha uma execução **concluída** de 262 s — perdeu para um log mais recente, de outra execução de 39 s.

**2. A duração não é a de execução nenhuma.** O log chama-se `log_setup_{ano}_{mês}_{dia}.log` e `logging.basicConfig` abre em *append*: duas execuções no mesmo dia caem no mesmo arquivo. A duração vai do primeiro ao último timestamp e cobre as duas **mais o intervalo ocioso**.

| Projeto | Reportado | Última execução | Erro |
|---|---:|---:|---:|
| `Teste_Neo4j` | 1 960 s | 396 s | **5,0×** |
| `Zika_Virus_Singapura_Large_480seq` | 26 428 s | 11 942 s | **2,2×** |

Seis dos 21 projetos têm mais de um `.log`, e o escolhido é o de `mtime` maior — que não é o da execução que produziu os artefatos em disco.

**3. `duration` vira `None` em silêncio** quando a última linha não casa o regex de timestamp. Ocorre hoje em `test_variola_noITRs`, cujo log termina em *traceback*.

**4. O progresso é sempre 0 % — em 21 de 21.** Não é borda; são **três caminhos mortos**. O regex de `tqdm` procura a barra no `.log`, e o `tqdm` escreve em **stderr** (0 ocorrências de `%|` no `.log` e no `output_log.txt`). O regex `Progress: N%` procura uma string que **nada no pipeline emite** (0 ocorrências no código e em todos os logs). E o `STEP:` é lido do *stdout* do processo, mas `logging.basicConfig(filename=…)` manda tudo para o arquivo e, com `log_file: true`, o próprio `stdout` do filho vai para `output_log.txt` — o cano que o backend lê chega vazio.

**5. Toda linha de stderr é rotulada `ERROR`.** Como o `tqdm` escreve em stderr, **a barra de progresso de uma execução saudável chega ao usuário como enxurrada de erros**.

**6. O dicionário de etapas é código morto.** `progress_percent` em `projectsTableView.jsx` tem 6 etapas mapeadas, ~30 linhas comentadas, e **nunca é referenciado**. Se fosse ligado seria incompleto: um log real de `mode: advanced` tem **14 strings de `STEP:` distintas** e nenhum método avançado — IQ-TREE, FastTree, RAxML-NG, MrBayes — está entre as 6.

#### Por que isto é de resultado, e não só de interface

- **`completed` é a substring `Completed successfully!`** — exatamente a que [D18](../science/02-defeitos-que-alteram-resultado.md#d18) mostrou ser impressa pelo `mode: auto` **depois de rodar só distância e parcimônia**. O "concluído" da aplicação herda a mentira do `auto` e não separa 14 pipelines de 2.
- **`failed` é a presença de `ERROR` em qualquer lugar** — inclusive de execução anterior anexada ao mesmo arquivo, inclusive de erro do qual o pipeline se recuperou.
- **A duração alimentaria [M7.7](10-marcos-e-metas.md)**, a curva de custo por método. Uma curva ajustada sobre números com 5× de erro é pior que nenhuma: parece medida. M7.7 fica marcado para **medir pelo manifesto**.

**Sem cobertura:** zero testes em `Backend/tests/` para `/projects/status`, `/projects/details` ou o campo `duration`.

#### A fonte autoritativa já existe e está sendo ignorada

Desde M2.5 o `manifest.json` grava `run_id`, `started_at_utc` e `finished_at_utc`; desde [DEC-046](#dec-046--2026-08-26--tools_invoked-deixa-de-sair-vazio--o-manifesto-passa-a-registrar-o-que-rodou), a linha de comando de cada ferramenta com a saída que produziu. Nos três projetos que têm manifesto, a duração dele **bate exatamente** com a do log (618 · 663 · 578 s) — o parser não é impreciso, é frágil: acerta quando o log é bem-comportado e erra sem avisar quando não é.

**Deduzir com regex o que está declarado de forma estruturada ao lado é o defeito.** É a mesma forma de [DEC-046](#dec-046--2026-08-26--tools_invoked-deixa-de-sair-vazio--o-manifesto-passa-a-registrar-o-que-rodou): existe o registro certo, e o consumidor lê outro lugar.

**Um pré-requisito ordena o resto:** enquanto duas execuções compartilharem arquivo — de log e de manifesto —, **nenhuma leitura consegue separá-las**. `run_id` no nome vem primeiro.

#### Onde ficou registrado

| Documento | O quê |
|---|---|
| [`science/02-defeitos §D22`](../science/02-defeitos-que-alteram-resultado.md#d22) | o defeito, com as seis medições e os 8 itens de correção |
| [`10-marcos §M4`](10-marcos-e-metas.md) | lote **M4.O — Observabilidade** (T2 + T4), com gate executável que **hoje reprova nos 4 critérios** |
| [`10-marcos §M7`](10-marcos-e-metas.md) | M7.6 casa com M4.O (mesmo manifesto); M7.7 marcado para medir pelo manifesto, não pela API |
| `Backend/scripts/sonda_status_execucao.py` | a sonda versionada — é o "antes", e é o que reprova depois |

**Evidência de execução:**
```
python Backend/scripts/sonda_status_execucao.py     → 21 projetos; progresso 0% em 21 de 21
                                                      Zika_480_ADVANCED: idle, 31 407 s
                                                      test: idle, 39 s (há execução completa de 262 s)
                                                      test_variola_noITRs: duração None
grep -c "Completed successfully!" Teste_Neo4j/…log   → 2   (duas execuções no mesmo arquivo)
grep -rc "Progress:" workflow/ projects/**/*.log     → 0   (string nunca emitida)
grep -c "%|" …log …output_log.txt                    → 0 e 0   (tqdm não é capturado)
grep -c progress_percent projectsTableView.jsx       → 1   (definido, nunca usado)
```

**Write-lock:** `docs/science/02-defeitos-que-alteram-resultado.md`, `docs/automation/{07,10}`, `Backend/scripts/sonda_status_execucao.py`. **Nenhum arquivo de produção alterado.** **Reversível:** sim.

### DEC-048 · 2026-08-26 · M4.O — estado e duração passam a vir do manifesto, no backend e no frontend

**Gatilho:** o usuário perguntou se a correção de [D22](../science/02-defeitos-que-alteram-resultado.md#d22) já tinha sido feita e mandou atacar o problema. Não tinha: [DEC-047](#dec-047--2026-08-26--estado-e-duração-são-raspados-do-log--caracterizado-como-d22-e-o-manifesto-já-tinha-a-resposta) foi só caracterização.

**7 dos 8 itens entregues.** O que falta é o item 4 — um arquivo por execução —, que é `BioComp_UFF/` e a regra 6 mantém fora deste lote.

#### O que mudou

**`Backend/src/services/execution_state.py`** (novo) concentra a decisão num lugar só, com precedência declarada: **manifesto primeiro, log depois**. `app.py` não voltou a crescer com isso — a extração é na direção de Arq-B.

| Antes | Depois |
|---|---|
| `idle` no `else` do parse, exibido como *"Waiting"* | enumeração **fechada** de 6 estados: `running`, `completed`, `failed`, `interrupted`, `never_run`, `unknown` |
| duração do primeiro ao último carimbo do **arquivo** | duração da **última execução**, recortada nas fronteiras |
| `duration` sumia como `None` sem motivo | `duration` `null` **com `duration_note`**, e `duration_source` dizendo `manifesto` ou `log` |
| `progress` = 0 por padrão | `progress` `null` quando indeterminado; `trees_built` traz a contagem real |
| `"ERROR" in log_content` sobre o arquivo inteiro | erro reconhecido pelo **nível do registro**, na execução corrente |
| todo stderr transmitido como `ERROR` | barra do `tqdm` vira progresso; o resto é `WARNING` salvo quando se declara erro |

No frontend, `constants/executionStatus.jsx` (novo) é a **fonte única** dos estados: a galeria e a tabela mantinham mapas próprios, e duas listas divergindo é D5 noutro assunto. O filtro de status passa a ser derivado do mapa em vez de repetido à mão. `progress_percent` — 6 etapas mapeadas, ~30 comentadas, **nunca referenciado** — foi apagado; o débito de lint caiu de 68 para 67.

#### O resultado, medido nos mesmos 21 projetos

| Projeto | Antes | Depois |
|---|---|---|
| `Teste_Neo4j` | completed, **1 960 s** | completed, **396 s** — a duração da última execução |
| `Zika_..._480seq_ADVANCED` | **idle** ("Waiting"), 31 407 s | **interrupted**, 31 407 s, 9 árvores, parou em `Construction of Subtrees.` |
| `test` | **idle** ("Waiting") | **interrupted** |
| `test_variola_noITRs` | failed, duração **ausente** | failed, **12 219 s** |
| `Zika_21seq_manifesto` | completed, 618 s (do log) | completed, 618 s **do manifesto**, `run_id 4a8ad78f90d2` |
| progresso | **0 % em 21 de 21** | `null` onde indeterminado, `100` onde concluída |

#### Uma regressão pega no caminho

O primeiro corte por execução usava o marcador de conclusão como fronteira e tratava tudo o que vinha depois como execução nova. Toda execução escreve linhas de encerramento **depois** de anunciar a conclusão — a gravação do manifesto, por exemplo —, então os três projetos com manifesto passaram a sair como `interrupted`. Sem rodar a sonda contra os 21 projetos reais, isso teria ido embora verde.

A separação entre cauda e execução nova passou a ser o **intervalo**: linhas de encerramento saem em milissegundos, uma execução nova começa depois de um intervalo humano. O corte é `_INTERVALO_NOVA_EXECUCAO_S = 60`.

**É heurística, e está declarada como tal.** Ela separa duas execuções quando a primeira **concluiu**; não separa quando a primeira morreu sem concluir — nesse caso elas ficam coladas e a duração volta a somar. O conserto de verdade continua sendo o item 4.

#### O que este lote não fez

- **Item 4 de D22** — um log e um manifesto por execução, com `run_id` no nome. É `BioComp_UFF/`, e a regra 6 proíbe um lote tocar `Backend/` e o submódulo ao mesmo tempo. Fica como lote seguinte, e é ele que remove a heurística acima.
- **Progresso por etapas planejadas.** Exigiria o pipeline declarar quantos pipelines pretende executar — mesmo lote do item 4. Até lá, `null` e a contagem de árvores, que é honesta.

**Evidência de execução:**
```
pytest Backend/tests                       → 232 passed, 1 xfailed   (eram 216: +16)
pytest tests/unit/test_execution_state.py  → 16 passed
make lint                                  → erros 67/68 → linha de base regravada em 67
make build                                 → ✓ built em 22,78 s
make test-frontend                         → 8 passed
GET /projects/status                       → interrupted onde antes era idle
GET /projects                              → Teste_Neo4j 396 s (era 1 960); duration_source por projeto
POST /projects/details                     → progress null + trees_built 9; runs_in_log 2 em Teste_Neo4j
```

**Write-lock:** `Backend/src/app.py`, `Backend/src/services/execution_state.py`, `Backend/tests/unit/test_execution_state.py`, `Frontend/phylotreeminer/src/constants/executionStatus.jsx`, `Frontend/phylotreeminer/src/components/displayData/{projectsGallery,projectsTableView}.jsx`, `Frontend/phylotreeminer/.eslint-baseline.json`, `docs/automation/{07,10}`, `docs/science/02-defeitos-que-alteram-resultado.md`. **Não toca `BioComp_UFF/`.** **Reversível:** sim.

### DEC-049 · 2026-08-26 · Um arquivo de log por execução — D22 fecha em 8 de 8

**Gatilho:** o item 4 de [D22](../science/02-defeitos-que-alteram-resultado.md#d22), único que [DEC-048](#dec-048--2026-08-26--m4o--estado-e-duração-passam-a-vir-do-manifesto-no-backend-e-no-frontend) não pôde fazer: mexe em `BioComp_UFF/`, e a regra 6 proíbe um lote tocar `Backend/` e o submódulo ao mesmo tempo.

#### O defeito era do log, não do manifesto

Vale corrigir o que DEC-047 registrou. O manifesto **nunca fundiu execuções**: ele é gravado em modo `w`, uma vez por execução, e cada gravação carrega o seu `run_id`. Quem fundia era só o log, e por dois motivos somados: o nome vinha da **data** (`log_setup_{ano}_{mês}_{dia}.log`) e o arquivo era aberto em **append**. Duas execuções no mesmo dia escreviam no mesmo arquivo, e há dois artefatos em disco com **dois `Completed successfully!`** dentro.

Agora o nome carrega o `run_id` — `log_setup_2026-08-26_4c09076ad5b3.log` — e o manifesto registra em `log_file` qual é o seu. Os dois apontam um para o outro: "que log produziu esta árvore" passa a ter resposta exata, em vez de "o mais recente por data de modificação", que escolhia entre execuções sem dizer qual.

#### Sete cópias das mesmas três linhas

`logging.basicConfig(level=..., filename=..., format=...)` estava copiado em **sete** módulos, cada um recalculando o nome do arquivo pela data. É a forma de [D5](../science/02-defeitos-que-alteram-resultado.md#d5) noutro assunto — sete lugares que precisam concordar sobre um nome —, e havia um agravante: **`basicConfig` só tem efeito na primeira chamada**, então qual das sete vencia dependia da ordem de importação.

`workflow/utils/run_logging.py` passa a ser o único lugar que sabe o nome. Duas funções, com papéis separados:

- **`configurar(outputs_dir, run_id)`** — abre o log desta execução e **substitui** o que houver na raiz. Não usa `basicConfig`, justamente porque ele é no-op quando já há handler; a substituição é explícita.
- **`garantir(outputs_dir)`** — o que os sete módulos chamam agora. Configura **só se ninguém tiver configurado**, de modo que um módulo importado no meio da execução não desvia o log para outro arquivo. Fora do workflow, cada módulo continua tendo para onde escrever.

Dois defeitos menores caíram junto:

- `alignmentSeq.py` fazia `filename=config.get('logfile_path', 1)`. O padrão era o **inteiro 1**, que o `logging` interpreta como descritor de arquivo: sem `logfile_path` na configuração, o log ia para o **stdout**.
- `setupWorkflow.py` mantém o seu `basicConfig` de módulo. Ele nunca é importado por ninguém — é script de preparação de ambiente, roda fora do pipeline — e foi deixado como está.

#### Verificado no cenário do defeito

Não bastava um teste: o defeito só aparece com **duas** execuções. O conjunto de validação foi rodado duas vezes seguidas **no mesmo diretório de projeto**, que é exatamente o que produzia um arquivo com duas conclusões:

```
log_setup_2026-08-26_4c09076ad5b3.log   1 × "Completed successfully!"
log_setup_2026-08-26_8567263a9687.log   1 × "Completed successfully!"
manifest.json → run_id 8567263a9687, log_file out/outputs/log_setup_2026-08-26_8567263a9687.log
```

E o leitor do backend, sem alteração nenhuma, passa a ler a execução certa: `completed`, **14 s** (a segunda execução reaproveitou as árvores), `fonte=manifesto`, `runs_no_log=1`.

**A heurística de intervalo de DEC-048 fica**, e deixa de ter função em execução nova: ela existe para os logs **já em disco**, que continuam fundidos e precisam ser lidos.

#### Δ em métrica publicada: **nenhum**

Mudança de registro, não de cálculo. O conjunto de validação reexecutado devolve **14 árvores**, `conferir_correcoes_m1.py` **TUDO VERDE** e o oráculo dendropy **91 pares, 0 divergências**.

**Evidência de execução:**
```
python -m unittest (11 módulos)          → Ran 169 tests, OK   (eram 162: +7 test_run_logging)
make test-backend                        → 232 passed, 1 xfailed
python workflow.py (Zika-21 advanced)    → 14 árvores, exit 0, real 9m38s
  log gravado                            → log_setup_2026-08-26_4c09076ad5b3.log
  manifest.log_file                      → aponta para ele
segunda execução no MESMO projeto        → segundo arquivo, 1 conclusão em cada
conferir_correcoes_m1.py                 → TUDO VERDE
oraculo_rf_dendropy.py                   → 91 pares, 0 divergências
```

**Write-lock:** `BioComp_UFF/workflow.py`, `BioComp_UFF/workflow/utils/{run_logging,manifest,messages}.py`, `BioComp_UFF/workflow/controller/{treeBuilderController,subtreeBuilderController,subtreeMinerController}.py`, `BioComp_UFF/workflow/{subtree_mining/miner,subtree_construction/builder,alignment/alignmentSeq}.py`, `BioComp_UFF/workflow/tests/test_run_logging.py`, `docs/automation/{07,10}`, `docs/science/02-defeitos-que-alteram-resultado.md`. **Não toca `Backend/` nem `Frontend/`.** **Reversível:** sim.

### DEC-050 · 2026-08-27 · D1 fecha, M2 chega a 7 de 7 — e o fator alinhador passa a existir

**Gatilho:** pedido do usuário para fechar [D1](../science/02-defeitos-que-alteram-resultado.md#d1) e o marco corrente. Fechar os dois exigia três decisões que só o usuário podia tomar; as três foram tomadas em 2026-08-27, com medição nova em duas delas.

#### Decisão 1 — o segundo alinhador, com o veredito antigo corrigido

A parte 2 de D1 era a [decisão 1](08-ficha-de-fatos.md), pendente desde 2026-08-19. As três alternativas foram **remedidas** no ambiente pinado ([DEC-044](#dec-044--2026-08-25--a-máquina-de-validação-entra-em-operação--e-as-versões-deixam-de-ser-sorteadas)), sobre 52 sequências de até 228 kb — e o registro anterior estava **errado no mecanismo**, não só no número:

| Candidato | Medido | Registro anterior |
|---|---|---|
| **Clustal Omega 1.2.4** | **não terminou em 1 h**; pico de RSS **220 MB** | "morto pelo OOM killer com sequências longas" — **falso neste porte**. É limite de **tempo**. O código 137 observado foi em Zika479, 478 sequências curtas: outro regime |
| **MUSCLE 5.3** | **recusa em 0,06 s**: `Too long, not appropriate for global alignment` | "19,4 GB e OOM" — era o **3.8.1551**, e não transferia (a consequência 2 de DEC-044, agora medida) |
| **MAFFT, duas estratégias** | roda em ambos os conjuntos | ✅ **escolhido** |

**O fator alinhador passa a ser `mafft` × `mafft_iterative`** — progressivo (`--maxiterate 0`) contra iterativo (`--maxiterate 1000`). Mesma ferramenta, mesma versão, mesmo binário: **o que muda é o algoritmo**, que é o contraste que [E4](../science/04-agenda-de-pesquisa.md) quer. É o único par que existe **tanto em *Variola* quanto em Zika** — nos outros dois o braço simplesmente não roda, que era a forma de D1.

#### Decisão 2 — D21: `-nt 1` no IQ-TREE

Entre fixar uma thread, declarar o método não reprodutível, ou repetições com consenso: **comprar reprodutibilidade com tempo**. A busca de ML roda em `-nt 1`; `iqtree_threads` continua governando o **bootstrap**, que é embaraçosamente paralelo e não decide topologia. O manifesto grava `threads=1` **e** `threads_configurados=N`, para que a diferença contra execuções anteriores seja legível em vez de silenciosa.

#### Decisão 3 — D23: declarar agora, corrigir depois

Corrigir a aquisição muda a composição dos conjuntos e portanto **toda árvore publicada**. A escolha foi declarar o `n` efetivo e a lista de descartados, e deixar a correção para um lote posterior. `remove_pipe` — que **não removia pipe nenhum**, e sim deduplicava por conteúdo — virou `deduplicar_por_sequencia` e passa a registrar **quais** acessos descartou e em favor de quem, no log e em `tools_invoked`.

#### M2.1 — o experimento sai do comentário

As 48 accessions de Li *et al.* (2007) viviam **comentadas** no rodapé de `workflow_dataAcquisition.py`, com o e-mail em `"seu_email@dominio.com"`. Um bloco comentado não é reprodutível: não roda, não é testado, e ninguém sabe se ainda corresponde ao que gerou os artefatos.

`workflow/experimentos/variola_li_2007.py` torna-o executável. As accessions foram **extraídas do bloco por script, sem redigitação**, e vão para arquivo versionado — elas *são* a definição do experimento. O e-mail vem de `NCBI_EMAIL`, e o teste que garante isso é **comportamental**, não textual: sem a variável, **não existe caminho** que monte o workflow. (A primeira versão procurava `@` no fonte e reprovava na própria documentação — um teste que mede o texto em vez do comportamento.)

#### Dois defeitos de forma, achados por executar

Trocar o par de alinhadores expôs que a lista estava **fixa em três lugares**:

1. `for alg in ['clustalo', 'mafft']` — em **dois** laços do controlador;
2. `_initialize_multi_trees_structure`, com as mesmas duas chaves escritas à mão.

A primeira execução com o par novo saiu com **8 árvores em vez de 14**, e o segundo braço rendeu **uma**: a estrutura não tinha a chave `mafft_iterative` e as árvores daquele braço se perdiam. Os três lugares passam a derivar de `self.aligners`, que valida contra a biblioteca e **levanta erro** em alinhador desconhecido — um braço que não existe produziria árvore com nome de um método que nunca rodou, que é a forma de D1 outra vez.

Também: `_VERSAO` era indexado pela **chave** do alinhador, não pelo binário. Dois alinhadores compartilhando executável quebravam a leitura de versão.

#### Δ em métrica publicada: **sim, e é o ponto**

Este é o lote que faz o fator alinhador **existir**. Verificado no conjunto de validação:

```
dataset_final_mafft.aln            md5 aa754c13cad8af1102ce1a9d4075c0f2
dataset_final_mafft_iterative.aln  md5 0e7ceaf8fe8fc16ff753eca2c3f4f278
```

Dois alinhamentos **genuinamente diferentes**, onde o delineamento antigo produzia cópias byte a byte. Toda árvore, todo suporte de clado e todo padrão maximal de *Variola* mudam quando a reexecução acontecer — e é exatamente o que a decisão 5 ("corrigir e re-rodar") autorizou.

**Estado de M2: 7 de 7 lotes.** O portão continua em **código 2** — invariante 3/3, falta `mafft_raxml` — e o que falta **não é código**: é a reexecução de [`§4.1`](11-handoff-maquina-de-validacao.md), que estava bloqueada por D1 e D21 e agora está livre.

**Evidência de execução:**
```
muscle -align <VARV-52>            → Fatal error: Too long, not appropriate for global alignment (0,06 s, 14 MB)
clustalo -i <VARV-52> --threads 8  → timeout em 1 h; Maximum RSS 225 164 kB
python workflow.py (Zika-21, mafft × mafft_iterative)
                                   → 14 árvores, 7 por braço, alinhamentos de md5 distinto
python -m unittest (12 módulos)    → Ran 171 tests, OK   (eram 162)
make test-backend                  → 232 passed, 1 xfailed
conferir_correcoes_m1.py           → TUDO VERDE
oraculo_rf_dendropy.py             → 91 pares, 0 divergências
```

**Write-lock:** `BioComp_UFF/workflow/alignment/{aligners,alignmentSeq}.py`, `BioComp_UFF/workflow/controller/treeBuilderController.py`, `BioComp_UFF/workflow/tree_construction/builder.py`, `BioComp_UFF/workflow/utils/dataValidation.py`, `BioComp_UFF/workflow/experimentos/`, `BioComp_UFF/workflow/tests/{test_aligners,test_tool_runs,test_experimento_variola}.py`, `Backend/tests/api/test_alinhadores.py`, `docs/automation/{07,10}`, `docs/science/02-defeitos-que-alteram-resultado.md`. **Reversível:** sim.

### DEC-051 · 2026-08-27 · Visores de log e de tabela, e o painel de comparação — com [D24](../science/02-defeitos-que-alteram-resultado.md#d24) no meio

**Gatilho:** pedido do usuário — melhorias de interface na exibição de log/txt/csv e no painel de comparação de árvores, back e front.

Era para ser trabalho de interface. Ao abrir o painel de comparação, virou [D24](../science/02-defeitos-que-alteram-resultado.md#d24).

#### O que o pedido de UI revelou

`calculate_quartet_distance` devolvia **`-1`** para árvore não binária, com um `TODO`. E `-1` é um número: descia para o payload e era **dividido pelo máximo teórico** em `check_consistency`. Resultado, capturado nos golden snapshots de M0:

```
compare_fasttree_nj_varv6:  rf=4  quartet=-1
  consistency = "Inconsistent results: RF and Quartet metrics show significant discrepancy"
```

A conta é `|4/6 − (−1/15)| = 0,73 > 0,5`. **O backend afirmava discordância entre duas métricas quando uma delas não fora medida.**

Duas coisas explicam por que durou: o campo `consistency` **nunca foi renderizado** por componente nenhum — viajava no contrato da API sem passar pelos olhos de ninguém —, e no snapshot de controle (árvore comparada consigo) a conta caía por coincidência em *"consistent"*, que é a resposta certa. **O sentinela acertava exatamente no caso que alguém conferiria.**

Junto vieram três defeitos menores no mesmo caminho: `check_consistency` **dividia sem guarda** e levantava `ZeroDivisionError` com `n ≤ 3`; `make_tree_binary` resolvia politomia **por sorteio** e estava no caminho; e o máximo teórico era recalculado em quatro lugares, um deles na interface.

**Golden snapshots regravados** depois do parecer, como manda a regra do projeto — e o diff é exatamente a troca do sentinela por `null` mais os campos novos.

#### Os três visores

| | Antes | Agora |
|---|---|---|
| **`.log` / `.txt`** | um `<pre>` com o arquivo inteiro | número de linha, nível lido do próprio registro (`ERROR`/`WARNING`/`STEP`) como filtro clicável, busca com navegação entre ocorrências, corte por página **declarado em voz alta**, copiar o filtrado e baixar o inteiro |
| **`.csv` / `.tsv`** | `split` por regex de vírgula-ou-tab | parser RFC 4180 em módulo próprio, ordenação **numérica** onde a coluna é numérica, busca, contagem de linhas e colunas, e aviso quando a linha tem campos a mais ou a menos |
| **comparação de árvores** | `--` mudo para a quartet; máximo recalculado na tela | valor **sobre o máximo**, barra do normalizado vindo do backend, o **motivo** de a métrica não se aplicar, e `consistency` finalmente exibido |

**O parser de CSV não era estética.** Ele quebrava em toda vírgula, inclusive dentro de campo entre aspas — e os dados deste projeto têm exatamente isso: o `strain` do GenBank traz `"Bangladesh 1974, nur islam"`, e cada itemset do `all_results_fpmax.csv` é uma **lista de clados separada por vírgula**. Uma linha assim virava colunas a mais, e o excedente era descartado por `values[i] || ''`. Quem abrisse o CSV do FPMax na aplicação lia uma tabela deslocada.

`consistency` passa a ser exibido pela razão que o próprio defeito ensinou: **um veredito que ninguém vê é um veredito que ninguém confere.**

**Evidência de execução:**
```
pytest Backend/tests                → 232 passed, 1 xfailed
  golden compare (regravados)       → quartet_distance: -1 → null
                                       consistency: "Inconsistent results…" → "…indisponível…"
                                       + rf_max, rf_normalized, quartet_max, quartet_normalized, quartet_note
make test-frontend                  → 18 passed (eram 8; +10 do parser de CSV)
make lint                           → erros 66/67, avisos 27/27 — débito REDUZIDO, linha de base regravada
make build                          → ✓ built em 22,18 s
```

**Write-lock:** `Backend/src/app.py`, `Backend/tests/golden/snapshots/compare_*.json`, `Frontend/phylotreeminer/src/components/common/{LogViewer.jsx,TableView.jsx,csv.js}`, `Frontend/phylotreeminer/src/components/analysis/TreeComparisonViewer.jsx`, `Frontend/phylotreeminer/src/components/displayData/projectExplorer.jsx`, `Frontend/phylotreeminer/src/__tests__/csv.test.js`, `docs/science/02-defeitos-que-alteram-resultado.md`, `docs/automation/07`. **Não toca `BioComp_UFF/`.** **Reversível:** sim.

### DEC-052 · 2026-09-01 · Pente-fino nos `.cql` dos projetos Zika — C-5e fechado, 4 artefatos legados reparados

**Gatilho:** pedido do usuário — conferir os `.cql` dos projetos Zika em busca de erros de geração/parsing que sobraram da última rodada de correções do `CQLExecutor.jsx`.

#### Caracterização

Achados dois defeitos de classes diferentes, nos 10 projetos Zika com `.cql` em disco (`Zika_21seq_{d1,runid,manifesto,validacao,validacao_mv}`, `Zika_Virus_Singapura_{Small_6seq,Medium_11seq,Advanced_21seq,Large_21seq,Large_480seq}`, `zika_virus`):

**1) `parse_cql_blocks` (`Backend/src/services/cql_batch_service.py:164`) — já catalogado como `C-5e`.** Cortava o arquivo em todo `;`, sem olhar se estava dentro de aspas. Descrições do GenBank trazem `;` literal com frequência — ex. `"African green monkey kidney cells 1 time; serogroup: Spondweni"`, presente em 30 registros de `Medium_11seq`, 58 de `Advanced_21seq`, 38 de `Large_21seq`. Cada ocorrência produzia um bloco fantasma extra (a segunda metade da string virava um "comando" sem `MATCH`/`MERGE`, destinado a falhar ou a ser enviado como Cypher inválido ao Neo4j). Este parser está listado na zona sagrada por [`04-rigor-cientifico.md §1`](04-rigor-cientifico.md) (tabela de casos-limite, `C-5e`), então o protocolo de mudança se aplica — ver formalização e oráculo abaixo.

**2) Artefatos legados com aspa simples não escapada dentro do blob de metadata — não é `C-5e`, é dado, não código.** 4 dos 10 projetos (`Zika_Virus_Singapura_{Small_6seq,Medium_11seq,Advanced_21seq,Large_21seq}`) foram gerados por uma versão do gerador **anterior à que existe hoje no repositório** — serializa cada metadado como um blob JSON inteiro dentro de uma string Cypher de aspas simples (`MERGE (m:Metadata {value: '{...}'})`), sem escapar as aspas simples do próprio texto biológico (ex. `"Cote d'Ivoire"`, presente em cepas históricas de Zika/Spondweni de 1996-1999). O gerador atual (`BioComp_UFF/workflow/utils/neo4jProcessing.py::create_subtree`) já é seguro — usa `json.dumps` por campo, aspas duplas, sem esse risco — mas **não existe no repositório o código que gerou os 4 artefatos antigos**: são pré-existentes a este generator, no padrão descrito em [`CLAUDE.md` "armadilhas conhecidas"](../../CLAUDE.md). Uma aspa não escapada fecha a string Cypher antes da hora; a segunda aspa da PRÓXIMA ocorrência do mesmo padrão devolve o estado por acidente, fundindo duas instruções `MERGE (m:Metadata ...)` numa só. Medido em `Medium_11seq`, bloco #10:

```
MATCH (child:Subtree {name: 'tree_dataset_final_clustalo_upgma_parsimony_Inner10'})
MERGE (m:Metadata {value: '{"newick": "KF383037.1", ... }'})
CREATE (child)-[:HAS_METADATA]->(m);
    MATCH (child:Subtree {... Inner10'})
    MERGE (m:Metadata {value: '{"newick": "KF383036.1", ..."geo_loc_name": ["Cote d'Ivoire"]... }'})
    CREATE (child)-[:HAS_METADATA]->(m);
```
— vira um único bloco de 4009 caracteres, com o `CREATE (child)-[:HAS_METADATA]->(m);` do meio absorvido como texto.

#### Formalização

`parse_cql_blocks` deve computar: o conjunto maximal de instruções Cypher sintaticamente independentes de um texto, onde um limite de instrução é um `;` que está fora de toda string (aspas simples ou duplas, respeitando `\` como escape) e fora de todo comentário (`//`, `/* */`). Não há métrica de domínio (RF, quarteto, clado) aqui — é sintaxe de texto, não filogenia.

#### Oráculo

Sem oráculo de domínio aplicável (não é dendropy/ete3/tqDist). Usados dois substitutos, na falta de um parser Cypher formal disponível neste ambiente:
1. **Segunda implementação independente**: `CQLExecutor.jsx::parseCQLBlocks` (frontend), que já usa a mesma regra de aspas/escape desde a rodada de correções anterior. Backend e frontend devem concordar no número de blocos para o mesmo arquivo — confirmado (ver diff abaixo).
2. **Contagem de `;` de fechamento no texto bruto** como teto superior do número de instruções pretendidas pelo gerador (o layout sempre coloca uma instrução por parágrafo).

#### Casos-limite (`Backend/tests/unit/test_parse_cql_blocks.py`, 9 testes novos)

`;` dentro de string dupla e simples, aspas duplas literais dentro de string simples (o caso do JSON embutido), aspa simples escapada, comentário de linha e de bloco, conteúdo vazio, último bloco sem `;` final, e o caso de aspa **não** escapada (documenta o limite do tokenizer: sem reescapar o dado, nenhum parser resolve — por isso o reparo é no dado, não só no código).

#### Diff de resultado

| Arquivo | Blocos antes (naive `split(';')`) | Blocos depois (tokenizer) | Δ | Afeta número publicado? |
|---|---:|---:|---:|---|
| `Small_6seq` | 318 | 318 | 0 | Não |
| `Medium_11seq` (pós-reparo do dado) | 866 | 836 | −30 | Não |
| `Advanced_21seq` | 2854 | 2796 | −58 | Não |
| `Large_21seq` | 1840 | 1802 | −38 | Não |

O Δ é sempre o número de blocos fantasma eliminados (um por `;` embutido em string) — **nunca** um número que vai para o artigo: este parser ingere metadado já extraído no grafo Neo4j de visualização, não recalcula distância, clado ou padrão FPMax. **Não bloqueia nada em M2/M4/M7.**

Reparo do dado (`BioComp_UFF/workflow/utils/reparar_cql_legado.py`, escapa aspa simples não escapada dentro do blob após validar que o JSON resultante decodifica; grava backup `.bak-preDEC052`):

```
Zika_Virus_Singapura_Small_6seq:    146 blobs, 0 corrigidos
Zika_Virus_Singapura_Medium_11seq:  354 blobs, 64 corrigidos
Zika_Virus_Singapura_Advanced_21seq: 1627 blobs, 0 corrigidos
Zika_Virus_Singapura_Large_21seq:    880 blobs, 0 corrigidos
```

Antes do reparo, `Medium_11seq` produzia 804 blocos no parser do frontend (32 fusões) contra 836 esperados. Depois do reparo, backend e frontend concordam em 836/836, com 0 blocos fundidos.

`Zika_Virus_Singapura_Large_480seq` (472 MB) usa o formato seguro (`json.dumps` por campo) — não tem o defeito de aspa; não foi tocado. Os 5 projetos `Zika_21seq_{d1,runid,manifesto,validacao,validacao_mv}` e `zika_virus` também já usam o formato seguro.

#### Achado fora de escopo — não corrigido

`BioComp_UFF/workflow/utils/neo4jUploader.py` tem URI e senha de uma instância Neo4j Aura em texto puro, commitados desde `08219cc` (jun/2025), presentes na árvore de trabalho atual. Não é dado pessoal de participante de pesquisa, mas é credencial de escrita num banco de terceiro. **Reportado ao usuário; não mexido** — rotação de credencial e decisão sobre reescrever histórico do submódulo são dele.

**Evidência de execução:**
```
cd Backend && python -m pytest tests -q   → 241 passed, 1 xfailed (era 232; +9 testes novos)
```

**Write-lock:** `Backend/src/services/cql_batch_service.py`, `Backend/tests/unit/test_parse_cql_blocks.py` (novo), `BioComp_UFF/workflow/utils/reparar_cql_legado.py` (novo), os 4 `.cql` legados reparados (dado, gitignorado — não versionado), `docs/audit/06-eixo-bugs.md`, `docs/automation/07`. **Reversível:** sim (backups `.bak-preDEC052` mantidos; código é diff de texto).

### DEC-053 · 2026-09-01 · "Interrompida" era falso positivo para execução lançada por fora da API

**Gatilho:** pedido do usuário — durante a reexecução do conjunto de validação (`Zika_21seq_reexec_20260901`, disparada por `python workflow.py -p /tmp/zika21_reexec.json`, conforme [`13-guia-reexecucao-m2.md`](13-guia-reexecucao-m2.md)), a UI mostrou o projeto como **"Interrompida"** enquanto ele ainda rodava, e só depois **"Concluída com sucesso"** — sem que tivesse havido interrupção real em nenhum momento.

#### Diagnóstico

O `manifest.json` da execução tem `started_at_utc` às `11:30:28` e `finished_at_utc` às `11:39:24`, ambos do mesmo `run_id`; `log_setup_2026-09-01_952736647882.log` termina em `STEP: Completed successfully!` sem nenhuma linha `ERROR`; e `logs_backend.log` **não registra nenhuma chamada** a `POST /projects/{nome}/run` nem `/rerun` durante a janela — só `/projects`, `/projects/status`, `/browse` e `/file`. A execução real nunca passou pela API.

#### Causa raiz

`em_execucao`, em `resolver_estado` (`Backend/src/services/execution_state.py`), vinha só de `project_name in running_workflows` — um dict em memória (`Backend/src/app.py:206`) que a API só popula quando **ela mesma** dispara o subprocesso, em `/run` ou `/rerun`. Com manifesto tendo `started_at_utc` sem `finished_at_utc` e `em_execucao=False`, o código caía direto no ramo `else: estado = "interrompida"` — mesmo com o processo genuinamente vivo, só não lançado (ou não mais rastreado) pela API. Duas situações batem nesse ramo sem que a execução tenha de fato morrido: lançamento por CLI, como no guia de reexecução (o caso medido aqui); e reinício do processo do backend em memória enquanto um workflow que ele mesmo disparou continua rodando (o dict se perde no restart, o subprocess não).

#### Correção

`_processo_vivo_no_diretorio` (novo, `Backend/src/services/execution_state.py`) confirma pelo sistema operacional via `psutil` — já dependência do projeto: procura processo vivo com `workflow.py` na linha de comando **e** um arquivo aberto dentro do diretório do projeto (não só a string no argumento, o que não distinguiria dois projetos concorrentes). `resolver_estado` só chama esse checque no ramo ambíguo (manifesto sem `finished_at_utc`, `em_execucao=False` vindo do chamador) — os casos comuns (concluído, nunca executado) não pagam o custo da varredura de processos.

#### Casos-limite testados

`Backend/tests/unit/test_execution_state.py`: `test_execucao_lancada_por_fora_da_api_nao_e_interrompida` reproduz o cenário relatado (subprocesso com `workflow.py` no argv, escrevendo dentro do diretório do projeto → `running`); `test_processo_vivo_de_outro_projeto_nao_conta` confirma que o match exige o arquivo aberto **dentro** do diretório do projeto alvo — `workflow.py` em qualquer processo do sistema não basta. O teste pré-existente da interrupção genuína (`test_manifesto_sem_conclusao_e_sem_processo_e_interrompida`, sem processo nenhum de fato aberto no diretório) continua verde.

#### Δ em métrica publicada: nenhum

Rastreamento de estado de execução, não zona sagrada — não toca distância, clado, metadado ou padrão FPMax.

**Evidência de execução:**
```
cd Backend && python -m pytest tests/unit/test_execution_state.py -v   → 18 passed (eram 16; +2 novos)
cd Backend && python -m pytest tests -q                                 → 243 passed, 1 xfailed (era 241; +2)
```

**Write-lock:** `Backend/src/services/execution_state.py`, `Backend/tests/unit/test_execution_state.py`, `docs/automation/07`. Não toca `BioComp_UFF/` nem `Frontend/`. **Reversível:** sim.

### DEC-054 · 2026-09-01 · Exclusão de projeto no menu de ações, e a tela de Provenance

**Gatilho:** pedido do usuário — o item "Delete Project" do dropdown de ações existia desabilitado desde antes, sem rota no backend (clicar mostrava "Funcionalidade em desenvolvimento"); e a proveniência/reprodutibilidade de uma execução (o `manifest.json` gravado desde M2.5/DEC-027) só dava para ver como JSON bruto no explorador de arquivos.

#### Exclusão de projeto

`DELETE /projects/{nome}` (`Backend/src/app.py`) valida o nome, resolve o caminho com `resolve_within` — a mesma proteção contra path traversal dos demais endpoints —, e recusa excluir um projeto em execução usando `resolver_estado`, que já enxerga execuções lançadas por fora da API (DEC-053). Remove com `shutil.rmtree`; não há lixeira nem backup. No frontend, o `Modal.confirm` lista o que será apagado (`out/`: árvores, alinhamentos, metadados, manifesto) antes de confirmar.

#### Tela de Provenance

Nova tela (`ProvenanceView.jsx` + `ProvenancePage.jsx`) que lê o `manifest.json` e apresenta de forma analítica o que antes só dava pra ver como JSON: identidade da execução, estado dos dois repositórios (branch, commit, alerta quando algum está sujo), ambiente, sementes e parâmetros de determinismo, tabela de ferramentas disponíveis × invocadas com o comando de cada execução, integridade SHA-256 de entradas/saídas com busca, e os parâmetros do workflow — reaproveitando o `JsonViewer` que já existia no explorador. Um projeto sem manifesto (nunca executado, ou anterior a M2.5) declara isso explicitamente. Acessível pelo menu lateral (`/provenance`, com seletor de projeto e `?project=nome`) e pelo mesmo menu de ações que ganhou o "Delete".

`API_BASE_URL` passou a ser exportado de `services/dataServices.jsx` em vez de redeclarado — as telas novas o importam de lá para não alimentar mais o defeito conhecido de URL fixa (F-2/Arq-C, travado em no máximo 13 arquivos pelo teste de config).

#### Δ em métrica publicada: nenhum

Gestão de projeto e leitura de proveniência — não toca distância, clado, metadado extraído ou padrão FPMax.

**Evidência de execução:**
```
Backend/tests/api/test_project_delete.py     → 7 passed (sucesso, nome inválido, inexistente, em execução)
cd Backend && python -m pytest tests -q      → 250 passed, 1 xfailed (era 243; +7)
Frontend: build ok; vitest 18 passed; lint-ratchet: débito reduzido (era 66/27, ficou 64/27)
Teste manual: criado projeto descartável, excluído via API real, diretório confirmado ausente em disco
```

**Write-lock:** `Backend/src/app.py`, `Backend/tests/api/test_project_delete.py` (novo), `Frontend/phylotreeminer/src/{App.jsx,main.jsx,components/displayData/{projectsGallery,projectsTableView}.jsx,components/displayData/ProvenanceView.jsx (novo),pages/ProvenancePage.jsx (novo),services/dataServices.jsx}`. **Reversível:** sim.

### DEC-055 · 2026-09-01 · Provenance — parâmetros do workflow como resumo, manifesto bruto com o mesmo modo

**Gatilho:** pedido do usuário — "Parâmetros do workflow" mostrava `params` como JSON bruto; pediu o mesmo formato do "Review Final Settings" do configurador (`pipelineConfigurator.jsx`), disponível por um switch contra a view atual.

`renderValorParametro` (novo) reproduz o `renderConfigValue` do configurador — rótulo capitalizado por palavra, booleano como Sim/Não, lista uma linha por item, objeto aninhado em `Descriptions` — mas de forma **recursiva**: a versão original não recursava em objeto dentro de objeto, e `params.tree_config`/`subtree_config` tem mais de um nível, que o formulário ao vivo nunca teve. O botão "Bruto" continua disponível. O painel "Manifesto bruto" ganhou o mesmo switch e passa a abrir por padrão no resumo (pedido explícito do usuário).

Objeto aninhado com mais de 15 entradas (`outputs_sha256` de uma execução grande passa de 200) ganha altura máxima de 420px com rolagem própria — sem isso a tabela de um manifesto real (274 saídas) travou a página inteira ao testar no navegador.

#### Δ em métrica publicada: nenhum

Formatação de leitura de proveniência.

**Evidência de execução:** build ok; testado ao vivo contra `Zika_21seq_reexec_20260901` (params aninhados de `tree_config`/`subtree_config`, e os 274 `outputs_sha256` com rolagem confirmada via DOM: `scrollHeight` 10755 / `clientHeight` 418).

**Write-lock:** `Frontend/phylotreeminer/src/components/displayData/ProvenanceView.jsx`. **Reversível:** sim.

### DEC-056 · 2026-09-01 · Visualizador de árvore filogeneticamente correto, com metadado e NCBI religados

**Gatilho:** pedido do usuário — a view de árvores/subárvores não era topologicamente correta (sem respeitar comprimento de ramo), e a ligação com metadado tinha sido removida (passava o `metadata.json` inteiro como prop) sem substituto.

#### O defeito: cladograma disfarçado de filograma

`PhylogeneticTreeViewer.jsx` fazia `root.each((node) => { node.y = node.depth; })` antes de rodar `d3.tree()`/`d3.cluster()` — descartava exatamente o `node.length` que `parseNewick` já extraía do Newick, e todo ramo saía do mesmo tamanho na tela independente da distância evolutiva real. Corrigido: a posição no eixo principal passa a ser a **distância acumulada de ramo desde a raiz** (`d.lenAcumulado`, calculado em ordem BFS via `root.each`, garantindo pai antes de filho). Quando o arquivo não declara comprimento nenhum, cai para cladograma por profundidade — e uma tag ("Filograma"/"Cladograma") declara qual dos dois está sendo mostrado, em vez de fingir uma distância que não existe (regra 5 do projeto, estendida de número para estado visual).

Pedido complementar do usuário: os links deviam parecer com `Bio.Phylo.draw()` — sem curva suave. `d3.linkHorizontal()`/`linkRadial()` (bezier) foram trocados por geradores de caminho próprios em ângulo reto: cotovelo vertical+horizontal no layout linear, arco de raio constante (via `d3.pointRadial`, a mesma função que `linkRadial` usa por baixo — garante consistência com a posição dos nós) + reta radial no radial. O layout radial, que estava `disabled`, foi habilitado.

#### Metadado sem o `metadata.json` inteiro

A ligação de metadado usava um prop `metadata` (array) nunca populado desde que `fetchMetadata` em `projectExplorer.jsx` teve o corpo comentado — carregar o arquivo inteiro no navegador para colorir/filtrar a árvore é o que motivou a remoção. Em vez de um endpoint novo, o componente passa a receber `projectName` e consumir `GET /api/tree/{projeto}/search-nodes` — rota que **já existia**, consumida por `PhylogeneticInsights.jsx`, e devolve uma linha leve por acesso (host, país, região, linhagem, data), não a árvore de features/qualifiers do metadado completo.

Clicar num terminal mostra esse metadado local **e** busca ao vivo no NCBI via `fetchNcbiInfo` + `InsightsPanelAntd` — o mesmo mecanismo já usado em `AnalysisPage.jsx`, reaproveitado em vez de reconstruído. Nós internos (`InnerN`) são reconhecidos como não sendo acessos do GenBank e não disparam a busca. A busca por nome/metadado, que já existia como estado (`searchTerm`/`setSearchTerm`) mas não tinha campo de UI, ganhou o `Input.Search` que faltava — era código morto acusado pelo lint.

`TreeComparisonViewer.jsx` e `projectExplorer.jsx` passam `projectName` em vez do `metadata` array morto.

#### Δ em métrica publicada: nenhum

Camada de apresentação — não recalcula distância, clado, suporte nem padrão FPMax; o Newick e o `metadata.json` em disco não mudam.

**Evidência de execução:**
```
Frontend: build ok; vitest 18 passed; lint-ratchet 57/66 erros, 23/27 avisos (melhorou; era 64/27)
Teste manual (tree_dataset_final_mafft_iqtree.nexus, Zika_21seq_reexec_20260901):
  - comprimento de ramo variando por folha, tag "Filograma" — confirmado visualmente
  - links em ângulo reto nos dois layouts (linear e radial) — confirmado por DOM (path 'd' com V/H no linear, A/L no radial)
  - clique em KF383085.1 → Host/País/Linhagem locais (Senegal, Zika virus, 1969) + espécie/taxonomia/GenBank do NCBI ao vivo
```

**Write-lock:** `Frontend/phylotreeminer/src/components/analysis/{PhylogeneticTreeViewer,TreeComparisonViewer}.jsx`, `Frontend/phylotreeminer/src/components/displayData/projectExplorer.jsx`. **Reversível:** sim.

### DEC-057 · 2026-09-01 · D25 — `mafft_iterative` colidia com `mafft` em `stability.py`, e M1.3 crashava nas três reexecuções

**Gatilho:** achado ao validar as 3 reexecuções já concluídas de [`13-guia-reexecucao-m2.md`](13-guia-reexecucao-m2.md) (Zika-21, VARV-6, VARV-49): o usuário pediu validação dos artefatos e da UI, relatando também um problema à parte de metadado geo/temporal ausente no NCBI para VARV-49 (achado 2, ver parecer abaixo). Investigando o primeiro, `conferir_correcoes_m1.py` crashava em M1.3 (RF por bipartição) nas três, com M1.1 e M1.2 verdes.

#### Diagnóstico e causa raiz

`BioComp_UFF/workflow/stability/stability.py:44` mantinha `ALIGNERS = ("mafft", "clustalo")` — uma **cópia duplicada e desatualizada** do registro autoritativo `workflow.alignment.aligners.ALIGNERS`, que [DEC-050](#dec-050--2026-08-27--d1-fecha-m2-chega-a-7-de-7--e-o-fator-alinhador-passa-a-existir) já havia estendido com `mafft_iterative` — mas só nos outros três lugares que fixavam a lista, não neste quarto. `PipelineLabel.parse` casava o alinhador por `tokens = set(stem.split("_"))`, que fragmenta `"mafft_iterative"` em tokens soltos (`"mafft"`, `"iterative"`); como `"mafft"` está na lista e vence primeiro, todo pipeline do braço iterativo do MAFFT recebia o rótulo do braço progressivo. Com os dois braços presentes no mesmo diretório — o caso das três reexecuções —, dois arquivos colidiam no mesmo `PipelineLabel.name`, e a guarda anticolisão de [D19](../science/02-defeitos-que-alteram-resultado.md#d19) barrava com `ValueError` em vez de sobrescrever em silêncio: o efeito prático era travar `TreeSet.from_directory`, e com ele toda a checagem M1.3. Detalhe completo em [D25](../science/02-defeitos-que-alteram-resultado.md#d25).

#### Correção

`ALIGNERS` em `stability.py` passa a vir de `workflow.alignment.aligners.ALIGNERS.keys()` — mesma fonte que as outras três cópias já usam desde DEC-050 — e o casamento passa a ser por substring delimitada por `"_"`, preferindo o mais longo (`f"_mafft_iterative_" in f"_{stem}_"` vence sobre `f"_mafft_"`). A primeira tentativa usou `stem.startswith(a + "_")`, mas quebrou 2 testes pré-existentes: `PipelineLabel.parse` também é chamado com `prefix` parcial, deixando texto antes do nome do alinhador no stem (ex. `"dataset_final_"`), então a posição do alinhador não pode ser assumida como 0.

#### Diff de resultado

| Métrica | Antes | Depois | Δ | Afeta número publicado? |
|---|---|---|---|---|
| `conferir_correcoes_m1.py` — Zika-21/VARV-6/VARV-49, M1.3 | `ValueError` (crash) | TUDO VERDE | de "sem medição" para "medição correta" | Não — não havia número aceito antes para divergir |
| Oráculo RF × dendropy — Zika-21 | não executava (bloqueado) | 91 pares, 0 divergências | idem | Não |
| Oráculo RF × dendropy — VARV-6 | não executava (bloqueado) | 91 pares, 0 divergências | idem | Não |
| Oráculo RF × dendropy — VARV-49 | não executava (bloqueado) | 45 pares, 0 divergências | idem | Não |
| `test_stability.py` | 16 passed | 20 passed | +4 (casos-limite do achado) | — |
| BioComp_UFF `unittest` completo | 160 passed | 164 passed | +4 | — |
| `make test-backend` | 250 passed, 1 xfailed | 250 passed, 1 xfailed | 0 (sem regressão) | — |

**Parecer:** este é um caso de zona sagrada sem reafirmação de número publicado — a checagem M1.3 nunca havia completado com sucesso sob essas condições, então não há valor aceito sendo trocado por outro; o que muda é que uma medição que antes era impossível (bloqueada por crash) passa a existir e a bater com o oráculo independente nos três conjuntos. Registrado por força da regra 7 do projeto (nenhuma mudança de zona sagrada fica fora do ledger), não porque haja um número anterior a corrigir.

**Evidência de execução:**
```
cd BioComp_UFF && python -m unittest workflow.tests.test_stability -v
  → 20 passed (eram 16; +4 casos-limite do achado)
cd BioComp_UFF && python -m unittest workflow.tests.test_stability workflow.tests.test_subtree_mining \
  workflow.tests.test_tree_identity workflow.tests.test_rf_bipartition workflow.tests.test_manifest \
  workflow.tests.test_rooting workflow.tests.test_taxonomy workflow.tests.test_aligners \
  workflow.tests.test_external_tools
  → 164 passed (eram 160; +4)

cd Backend && python scripts/conferir_correcoes_m1.py Zika_21seq_reexec_20260901       → TUDO VERDE
cd Backend && python scripts/conferir_correcoes_m1.py Variola_VARV6_reexec_20260901    → TUDO VERDE
cd Backend && python scripts/conferir_correcoes_m1.py Variola_VARV49_reexec_20260901   → TUDO VERDE
  (antes: ValueError em M1.3 nas três)

cd BioComp_UFF && python ../docs/science/scripts/oraculo_rf_dendropy.py projects/Zika_21seq_reexec_20260901
  → 91 pares, 0 divergências
cd BioComp_UFF && python ../docs/science/scripts/oraculo_rf_dendropy.py projects/Variola_VARV6_reexec_20260901
  → 91 pares, 0 divergências
cd BioComp_UFF && python ../docs/science/scripts/oraculo_rf_dendropy.py projects/Variola_VARV49_reexec_20260901
  → 45 pares, 0 divergências

cd Backend && python -m pytest tests -q   → 250 passed, 1 xfailed (sem regressão)
```

**Write-lock:** `BioComp_UFF/workflow/stability/stability.py`, `BioComp_UFF/workflow/tests/test_stability.py`, `docs/science/02-defeitos-que-alteram-resultado.md`, `docs/automation/07-log-de-execucao.md`. Não toca `Backend/` nem `Frontend/`. **Reversível:** sim.

### DEC-058 · 2026-09-01 · Link para o artigo-fonte (PubMed) na tabela de sequências, e sinalização de cobertura baixa em geoloc/temporal

**Gatilho:** pedido do usuário, encadeado ao achado 2 da validação das reexecuções (metadado geo/temporal ausente do NCBI em VARV-49): "quero que na tabela apareça o PUBMED... e quero sinalizar nos gráficos quando tivermos poucos dados com valor semântico, importante levar ao NCBI e PUBMED para mostrar que é ausência de informações das bases de dados".

#### Link do PubMed

`workflow/utils/treeUtils.py` (BioComp_UFF) já serializa `annotations['references']` — incluindo `pubmed_id` — para o `metadata.json` desde antes deste lote; só não havia consumidor. `get_node_information` (`Backend/src/app.py`) passa a extrair a primeira referência com `pubmed_id` não vazio e devolvê-la como `pubmedId`; `PhylogeneticInsights.jsx` ganhou a coluna "PubMed Link" ao lado de "NCBI Link", no mesmo estilo (`Button` com `ExportOutlined`), apontando para `pubmed.ncbi.nlm.nih.gov/{id}`. Sequência sem referência com PMID mostra "-", nunca um link quebrado.

#### Sinalização de cobertura

`Frontend/phylotreeminer/src/utils/metadataCoverage.js` (novo) mede a fração de sequências com valor semântico (não `"Unknown"`/`"Unknown Date"`) por campo. `GeographicDistribution.jsx` e `TemporalInsights.jsx` mostram um `Alert` de aviso quando a cobertura de `country`/`year` cai abaixo de 50%, explicitando que a ausência é da submissão original ao NCBI — não um defeito do pipeline — e apontando de volta para os links de NCBI/PubMed da tabela acima, para que quem lê o gráfico confira a limitação na fonte primária. Não há alteração de nenhum valor calculado: os números por trás do mapa e da série temporal são os mesmos; a mudança é só o aviso quando eles são majoritariamente `Unknown`.

#### Δ em métrica publicada: nenhum

Passthrough de um campo já existente no metadado e camada de aviso na apresentação — não recalcula distância, clado, país/região nem padrão FPMax.

**Evidência de execução:**
```
cd Backend && python -m pytest tests -q   → 250 passed, 1 xfailed (sem regressão)
Frontend: pnpm run build → ok; pnpm run test → 18 passed (18); lint:ratchet → débito reduzido (não cresceu)

curl localhost:8000/api/tree/Zika_21seq_validacao/search-nodes
  → 20/20 nós com pubmedId (ex.: KF270886 → "24516683")
curl localhost:8000/api/tree/Variola_VARV49_reexec_20260901/search-nodes
  → 49/49 nós com pubmedId; geo_ok 1/49 (2%); year_ok 0/49 (0%)

Teste manual (Deep Analysis, Variola_VARV49_reexec_20260901):
  - tabela "Sequences Dataset": coluna "PubMed Link" ao lado de "NCBI Link",
    "Source article" → https://pubmed.ncbi.nlm.nih.gov/16873609/ nas 49 linhas
  - "Geographical Distribution": alerta "Only 2% of sequences (1/49) have a
    geolocation in the source GenBank record" acima do mapa
  - "Time Series Analysis": alerta "Only 0% of sequences (0/49) have a
    collection date in the source GenBank record" acima do gráfico
```

**Write-lock:** `Backend/src/app.py`, `Frontend/phylotreeminer/src/components/analysis/Tree/{PhylogeneticInsights,GeographicDistribution,TemporalInsights}.jsx`, `Frontend/phylotreeminer/src/utils/metadataCoverage.js` (novo). Não toca `BioComp_UFF/`. **Reversível:** sim.

### DEC-059 · 2026-09-01 · Alinhamento grande deixava de abrir no explorador — `/file` recusava com mensagem que não ajudava

**Gatilho:** pedido do usuário — "Por que estou com erro Failed to load dataset_final_mafft_iterative.aln para VARV49?"

#### Diagnóstico

```
curl "localhost:8000/file?path=Variola_VARV49_reexec_20260901/out/Align/dataset_final_mafft_iterative.aln"
→ 413 {"detail":"Arquivo de 11.7 MB é grande demais para pré-visualização (limite 8 MB). Use /api/file/paginated."}
```

O arquivo (11,2 MB) passa do teto de 8 MB de `GET /file` — decisão correta e antiga (`app.py:1229`, mesma razão que já limita `metadata.json`). Dois efeitos colaterais não intencionais, esses sim defeito: (1) `projectExplorer.jsx:255-256` só olhava `response.ok` e nunca lia o `detail` do corpo — por isso a UI mostrava só "Failed to load..." genérico, escondendo o motivo real; (2) a própria mensagem de erro recomendava `/api/file/paginated`, que **só pagina JSON** — chamá-la com um `.aln` devolveria 400 "não contém JSON válido". Não havia, portanto, nenhum caminho para pré-visualizar um alinhamento acima de 8 MB, e VARV-121 (283 874 colunas) bate nisso com folga maior ainda.

#### Correção

Estendido ao FASTA/Clustal (`.fasta`, `.fa`, `.fas`, `.faa`, `.aln`, `.clustal`) o mesmo tratamento que `.cql` já tinha desde antes: em vez de recusar, lê os primeiros 8 MB e corta num limite seguro — no último cabeçalho `>` completo para FASTA, na última linha inteira para Clustal/`.aln` (que não tem marcador de registro; o `MSAViewer` já descarta linha incompleta) — sinalizando `truncated: true`, que o frontend já sabia exibir. A sugestão "`Use /api/file/paginated`" passa a aparecer só quando o arquivo é `.json` de fato, já que é a única extensão que esse endpoint sabe processar. O frontend (`projectExplorer.jsx`) agora lê `detail` do corpo da resposta de erro e mostra o motivo real na mensagem, em vez do genérico fixo.

#### Δ em métrica publicada: nenhum

Pré-visualização no explorador de arquivos — o `.aln` em disco não muda; só o que é servido para visualização parcial.

**Evidência de execução:**
```
curl "localhost:8000/file?path=Variola_VARV49_reexec_20260901/out/Align/dataset_final_mafft_iterative.aln"
  → 200 {"type":"clustal","truncated":true,"total_bytes":11736853,"preview_bytes":8388573,...}
curl "localhost:8000/file?path=Variola_VARV49_reexec_20260901/out/outputs/metadata.json"
  → 413 (comportamento de JSON grande inalterado, sugestão de /api/file/paginated mantida)

cd Backend && python -m pytest tests -q   → 250 passed, 1 xfailed (sem regressão)
Frontend: pnpm run build → ok; pnpm run test → 18 passed (18)

Teste manual (Deep Analysis → File Explorer, Variola_VARV49_reexec_20260901):
  clique em dataset_final_mafft_iterative.aln → MSAViewer renderiza 36 de 49
  sequências (comprimento 235 526), "Sequences: 36" — antes: modal de erro
```

**Write-lock:** `Backend/src/app.py`, `Frontend/phylotreeminer/src/components/displayData/projectExplorer.jsx`. Não toca `BioComp_UFF/`. **Reversível:** sim.

### DEC-060 · 2026-09-01 · M7.1 fecha (ficha de chamada por método, achado D26), e E4 ganha validação de oráculo

**Gatilho:** pedido do usuário — atacar M7 em paralelo à reexecução do VARV-121, com um agente por frente (`ptm-bioinformatica-inferencia` para M7.1, `ptm-dominio-cientifico` para aprofundar E4), esta sessão gerenciando e validando. Nenhuma das duas frentes executou pipeline pesado nem tocou o diretório do VARV-121.

#### M7.1 — ficha de chamada por método

Novo `docs/science/08-ficha-de-chamada-por-metodo.md`: linha de comando efetiva, parâmetros fixos vs. parametrizáveis, e suporte de ramo produzido/preservado, para FastTree, IQ-TREE, RAxML-NG e MrBayes — só leitura de código e de artefatos já em disco (`Zika_21seq_validacao`, fora do write-lock de qualquer execução em andamento).

**Achado principal — [D26](../science/02-defeitos-que-alteram-resultado.md#d26)**: `random_seed`/`raxml_threads`/`iqtree_threads` parecem vir do `tree_config` do usuário, mas `TreeBuilderController` nunca repassa esse config ao `TreeBuilder` que de fato roda a inferência — só o manifesto (`workflow.py:100`) lê o `tree_config` real. Confirmado eu mesmo lendo `treeBuilderController.py:803-849` e o `manifest.json` de `Variola_VARV49_reexec_20260901` (`reproducibility: {iqtree_threads: 16, raxml_threads: 8, random_seed: 12345}` — pedido; a chamada real usou os defaults 4/4/12345). Não muda nenhuma árvore já produzida (`--workers 1`/`-nt 1` já fixam o que decide topologia, D17/D21), mas o manifesto declara paralelização que não rodou — quebra a garantia central de DEC-027/037 ("proveniência honesta") para esses três campos especificamente.

**Achado secundário, não fechado**: suporte de UFBoot do IQ-TREE **sobrevive** ao `Phylo.write` para Nexus no artefato atual (IQ-TREE 3.1.3) — contradiz parcialmente a premissa de [D10](../science/02-defeitos-que-alteram-resultado.md#d10) (escrita sobre IQ-TREE 2.2.2.6). Nota adicionada a D10 sem fechá-lo — falta confirmar se `.confidence` chega a `metadata.json`/grafo/UI.

Achados menores registrados no documento, não corrigidos aqui: hipótese fundamentada (não confirmada) de que `_clean_mrbayes_tree` descarta probabilidade posterior do MrBayes; divergência entre `06-decisoes-metodologicas.md` (DM-2) e o código atual sobre o IQ-TREE rodar ModelFinder; `generations` do MrBayes nunca alcançado pelo chamador.

#### E4 — validação de oráculo do achado exploratório

A leitura exploratória que eu tinha feito (`workflow.stability.case_study` sobre `Variola_VARV49_reexec_20260901`: RF médio trocando alinhador 0,052 vs. trocando inferência 0,385; NJ o método mais sensível à troca de alinhador, 0,152 — inverso do padrão de Zika) foi confrontada por `ptm-dominio-cientifico` contra dois oráculos independentes (dendropy 4.6.1, ete3 3.1.3) nos 5 pares mafft × mafft_iterative: **Δ = 0** nos cinco. A hipótese "NJ tem poucas bipartições e por isso é instável" foi testada e refutada — as 10 árvores são todas estritamente binárias, 46/46 bipartições. Mecanismo mais provável (hipótese, não prova): `DistanceCalculator('identity')` sem correção de modelo, comum a NJ e UPGMA, combinado com o critério de agrupamento do NJ (matriz-Q), amplifica a diferença de ~429 colunas entre as duas estratégias do MAFFT onde UPGMA (mesma distância, outro critério) não amplifica. E4 continua ◐ — falta VARV-121 como segunda réplica antes de qualquer conclusão.

#### Δ em métrica publicada: nenhum

M7.1 é documentação sobre código existente (nenhuma árvore recalculada). O achado D26 não muda nenhum resultado já publicado (Δ=0 na topologia, confirmado pelo próprio raciocínio de D17/D21). A validação de E4 confirma que o número exploratório já registrado estava certo (Δ=0 contra dois oráculos) — não é uma correção, é uma confirmação.

**Evidência de execução:**
```
grep -n "TreeBuilder(" BioComp_UFF/workflow/controller/treeBuilderController.py
#  6 ocorrências; as 4 dos métodos avançados não passam tree_config

python3 -c "import json; m=json.load(open('BioComp_UFF/projects/Variola_VARV49_reexec_20260901/out/outputs/manifest.json')); print(m['reproducibility'])"
#  {'iqtree_threads': 16, 'random_seed': 12345, 'raxml_threads': 8}  (pedido, não executado)

oráculo dendropy + ete3, 5 pares mafft × mafft_iterative (VARV-49):
  fasttree 0.0217 · iqtree 0.0217 · raxml 0.0435 · nj_distance 0.1522 · upgma_distance 0.0217
  idêntico em produção (rf_matrix.csv), dendropy e ete3 — Δ = 0 nos cinco
```

**Write-lock:** `docs/science/08-ficha-de-chamada-por-metodo.md` (novo), `docs/science/02-defeitos-que-alteram-resultado.md` (D26 novo, nota em D10), `docs/science/04-agenda-de-pesquisa.md` (E4 expandido). Nenhum código de produção tocado. **Reversível:** sim.

### DEC-061 · 2026-09-01 · M4, primeira onda — 4 de 5 lotes fecham; M4.13 implementado e revertido

**Gatilho:** pedido do usuário — atacar M4 em paralelo à reexecução do VARV-121, via `ptm-desenvolvedor` implementando os 5 lotes já sem dependência (M4.1, M4.12, M4.13, M4.21, M4.22), esta sessão como Gerente + Revisor + Validador. Nenhum lote tocou o diretório do VARV-121 nem rodou pipeline pesado.

#### M4.1, M4.12, M4.21, M4.22 — fecham, verificados de ponta a ponta

Descrição de cada um nas tabelas de `10-marcos-e-metas.md §6`. Achado de revisão que merece registro: **M4.12, como entregue, não corrigia o defeito em produção.** O lote corrigiu `treePlot.py` para tratar `metadata_dict` como dict (`.get()` em vez de iterar), mas `Backend/src/app.py:913` chamava essa função passando `cache["nodes"]` — uma **lista** — em vez de `cache["node_index"]`, o dict de fato indexado (o próprio comentário na linha já dizia "usa o dicionário", só o código não usava). Sem esse ajuste, o fix trocaria `TypeError` por `AttributeError` em produção, sem consertar nada de ponta a ponta. Corrigido eu mesmo (fora do write-lock original de M4.12, mas é a linha que fecha o lote) e confirmado: `GET /api/gen_plot/Zika_21seq_validacao` → PNG real de 57 976 bytes, onde antes da correção a rota quebrava.

#### M4.13 — implementado, testado, e revertido antes do commit

O lote trocou `<<USER_UID>>` (literal textual) por `$user_id` (parâmetro nomeado) no gerador de CQL do submódulo, exatamente como especificado, com teste unitário verde. Revisão encontrou um problema de integração que a especificação do lote não previa: `Backend/src/routers/cql_router.py:38` (`/execute`) e `Backend/src/services/cql_batch_service.py:153` chamam `neo4j_service.execute_query(query, parameters)` **sem** passar `user_id`; `Backend/src/services/neo4j_services.py:53` faz `parameters['user_id'] = user_id` **incondicionalmente**, sobrescrevendo com `None` mesmo quando `parameters` já contivesse o valor certo. Antes de M4.13, isso era inofensivo — o `$user_id` nunca existia no Cypher gerado, tudo ia por substituição textual de `<<USER_UID>>`, que roda independente de `parameters`. Depois de M4.13 sozinho, qualquer CQL novo usando `$user_id` se resolveria para `None` na execução real — uma regressão funcional (e potencialmente de integridade de dado, se algum padrão usar `MERGE (u:User {uid: $user_id})`) para o próprio path de ingestão que este mesmo lote pretendia tornar mais seguro.

A dependência declarada no fatiamento original (`10-marcos-e-metas.md`) já previa "M4.14 depende de M4.13" — a revisão mostra que a ordem certa é a **inversa**: M4.14 (backend para de fazer `.replace()` e passa a tratar `user_id` como parâmetro de verdade em toda chamada a `execute_query`) precisa existir **antes ou junto** de M4.13, não depois. Decisão: revertida a mudança no submódulo (`git checkout -- workflow/utils/neo4jProcessing.py`, teste novo removido) antes de qualquer commit — nada do M4.13 chegou a ser publicado. Tabela de M4 atualizada com a dependência corrigida e o achado documentado na própria linha de M4.14, para quem pegar o lote depois não precisar redescobrir.

#### Δ em métrica publicada: nenhum

Segurança/resiliência de API e correção de bug de renderização de imagem — não toca distância, clado, metadado extraído nem padrão FPMax.

**Evidência de execução:**
```
cd Backend && python -m pytest tests -q          → 257 passed, 1 xfailed (era 250; +7: 5 de M4.1, 2 de M4.12)
Frontend: pnpm run build → ok; pnpm run test → 21 passed (21; era 18; +3: M4.21, M4.22 e o pré-existente)
Frontend: lint:ratchet → débito reduzido (não cresceu)

curl -o /tmp/plot_test.png "localhost:8000/api/gen_plot/Zika_21seq_validacao"
  → HTTP 200, PNG 1280x720, 57976 bytes (antes: quebrava com TypeError/AttributeError)

grep -n "TreeBuilder(" BioComp_UFF/workflow/controller/treeBuilderController.py   [confirmação do achado M4.13/M4.14]
python3 -c "import json; m=json.load(open('BioComp_UFF/projects/Variola_VARV49_reexec_20260901/out/outputs/manifest.json')); print(m['reproducibility'])"
  → {'iqtree_threads': 16, 'random_seed': 12345, 'raxml_threads': 8}  (mesmo achado de D26/DEC-060, reconfirmado aqui)

BioComp_UFF: git status --porcelain (após reverter M4.13) → só os arquivos alheios
  do VARV-121 (data/*/dataset_final_NoPipe), nada do lote revertido restando
```

**Write-lock:** `Backend/src/services/neo4j_services.py`, `Backend/src/routers/{neo4j_router,cql_router,cql_batch_router}.py`, `Backend/src/utils/treePlot.py`, `Backend/src/app.py` (linha 913), `Backend/tests/{api/test_neo4j_resiliencia.py,unit/test_tree_plot.py}` (novos), `Frontend/phylotreeminer/src/components/analysis/{PhylogeneticTreeViewer,GraphVisualization}.jsx`, `Frontend/phylotreeminer/src/__tests__/{zoomCleanup,graphIncremental}.test.jsx` (novos). `BioComp_UFF/` revertido, nada commitado lá. **Reversível:** sim (cada lote em commit próprio).

### DEC-062 · 2026-09-02 · VARV-121 reexecutado e validado; E4 ganha a segunda réplica

**Gatilho:** usuário — "Fechamos VARV121". Validação da reexecução (`Variola_VARV121_reexec_20260901`, iniciada 2026-09-01 17:07, concluída 2026-09-02 12:56, 16h49) pelo mesmo protocolo já aplicado a Zika-21/VARV-6/VARV-49, e aproveitamento como segunda réplica de [E4](../science/04-agenda-de-pesquisa.md#e4--◐--o-fator-alinhador-medido-onde-ele-existe).

#### Validação

```
conferir_correcoes_m1.py Variola_VARV121_reexec_20260901 Variola_Yu_li_2007_200seq → TUDO VERDE
  (as 4 falhas reportadas são do artefato ANTERIOR a M1, usado só como comparação — esperado)
oraculo_rf_dendropy.py projects/Variola_VARV121_reexec_20260901 → 45 pares, 0 divergências
```

M1.3 (o achado de D25 desta rodada) segue corrigido: nenhum `ValueError` de rótulo duplicado, as 10 árvores (2 alinhadores × 5 métodos) foram todas produzidas e comparadas.

#### E4 — segunda réplica

`workflow.stability.case_study` sobre o novo projeto, com os 5 pares mafft × mafft_iterative recomputados por oráculo dendropy independente (Δ = 0 contra `rf_matrix.csv`, todas as 10 árvores estritamente binárias, 118 = n−3 bipartições não triviais):

| Método | VARV-49 (n=49) | VARV-121 (n=121) |
|---|---:|---:|
| FastTree | 0,0217 | 0,0932 |
| IQ-TREE | 0,0217 | 0,1017 |
| RAxML | 0,0435 | 0,1186 |
| UPGMA | 0,0217 | 0,1864 |
| NJ | **0,1522** | **0,1949** |

**O que replica:** NJ é o método mais sensível à troca de alinhador nos dois conjuntos de *Variola* — confirma a recomendação (i) do parecer anterior (DEC-060) e é o oposto do padrão de ZIKV-478 (NJ o mais imune lá). **O que não replica exatamente:** em VARV-49, UPGMA ficava no patamar dos métodos de caráter; em VARV-121, UPGMA sobe para perto do NJ. Leitura mais defensável: os dois métodos de distância, juntos, são mais sensíveis que os três de caráter neste par de conjuntos — mas a divisão individual NJ/UPGMA ainda oscila. Detalhe completo, com a tabela e o parecer, em `docs/science/04-agenda-de-pesquisa.md` (seção E4, "Segunda réplica — VARV-121").

#### Δ em métrica publicada: nenhum

Validação de reexecução (mesmo protocolo já usado 3 vezes nesta rodada) e leitura exploratória de E4 — nenhum código de produção mudou, nenhuma árvore foi recalculada além do que o próprio `case_study.py` (ferramenta já existente e testada) produz como leitura.

**Evidência de execução:** ver blocos de comando acima — literais, sem edição.

**Write-lock:** `docs/automation/13-guia-reexecucao-m2.md` (estado da rodada), `docs/science/04-agenda-de-pesquisa.md` (E4, segunda réplica). Nenhum código tocado. **Reversível:** sim.

### DEC-063 · 2026-09-02 · M2 fecha — `expected.json` regenerado a partir da reexecução limpa, portão em código 0

**Gatilho:** pedido do usuário — fechar M2 (ajuste dos alinhadores no fixture). Zona sagrada: muda o invariante que passa a gatear toda refatoração futura ([`04-rigor-cientifico §3`](04-rigor-cientifico.md#3-protocolo-de-mudança-na-zona-sagrada)).

#### Caracterizar

`docs/science/scripts/gerar_dataset_referencia.py` já tinha `M_ALVO["aligners"] = ["mafft", "mafft_iterative"]` desde DEC-050 (2026-08-27) — o gerador estava certo. O que estava desatualizado era `PROJETO = "projects/Variola_Yu_li_2007"`: apontava para o artefato **anterior** à reexecução, que nunca teve o braço `mafft_iterative`. `Backend/tests/data/reference/expected.json`, nunca regravado desde então, carregava `aligners: ["mafft"]`, `target_M_size: 5` e a nota antiga (D1, já retratada) atribuindo a exclusão de Clustal/MUSCLE a OOM. `make reference-check` devolvia código 2 — "4 de 5 pipelines, falta mafft_raxml".

#### Formalizar

O dataset de referência deve vir da reexecução mais recente e taxonomicamente limpa de VARV-49 que já passou pelo M1.3 corrigido (D25) — hoje `Variola_VARV49_reexec_20260901`, não o artefato pré-M1.

#### Correção

`PROJETO` passa a apontar para `projects/Variola_VARV49_reexec_20260901`. Achado no caminho: o gerador nunca limpava `Backend/tests/data/reference/trees/` antes de copiar — os 4 `.nexus` do braço `clustalo` do artefato contaminado original (pré D6/M2.2) sobreviviam indefinidamente, ignorados pelo portão mas nunca removidos. Adicionado `shutil.rmtree` antes de recriar o diretório. Texto do `README.md` gerado também atualizado (removida a advertência de divergência de versão FastTree/RAxML-NG, resolvida desde DEC-043/044).

#### Oráculo independente

Nenhum recálculo de RF nesta mudança — os números já vêm oráculo-confirmados: `Variola_VARV49_reexec_20260901` passou por `conferir_correcoes_m1.py` (TUDO VERDE) e pelo oráculo dendropy (45 pares, 0 divergências) em DEC-062. Esta mudança só aponta o gerador do fixture para esse artefato já validado.

#### Diff de resultado

| Campo | Antes | Depois | Δ | Afeta número publicado? |
|---|---|---|---|---|
| `source_project` | `Variola_Yu_li_2007` (pré-M1) | `Variola_VARV49_reexec_20260901` | — | Não — nenhum número do artigo cita este fixture ainda |
| `target_M.aligners` | `["mafft"]` | `["mafft", "mafft_iterative"]` | +1 alinhador | Não — já era o alvo declarado desde DEC-050, só não regravado |
| `target_M_size` | 5 | 10 | +5 | Não |
| `present_pipelines` | 8 (4 `mafft_*` + 4 `clustalo_*` contaminados) | 10 (`mafft_*` + `mafft_iterative_*`, sem `clustalo`) | — | Não |
| `aligner_factor_present` | `false` | `true` | — | Não |
| `make reference-check` | código 2 (4 de 5, falta `mafft_raxml`) | **código 0** (10 de 10) | **fecha o portão** | Não — é o gate fechando, não um número do artigo mudando |

**Parecer:** não há reafirmação de nenhum número já publicado — o fixture nunca tinha sido regravado com o alvo correto, então não havia valor aceito sendo substituído. O que muda é que o portão científico, aberto desde M2.6, **fecha em código 0** pela primeira vez, com os 3 invariantes de Li *et al.* (2007) recuperados por 10 de 10 pipelines.

**Evidência de execução:**
```
cd BioComp_UFF && python ../docs/science/scripts/gerar_dataset_referencia.py
  → 49 táxons (45 VARV + 4 grupo externo); 10 árvores, 10 pipelines efetivos;
    invariantes verificados: 3 de 3; M alvo: 10 pipelines

make reference-check
  → ✓ monofilia_varv, ✓ clado_p2, ✓ p2_basal — recuperados por todos os 10 pipelines
    pipelines conferidos: 10 de 10; bipartições universais: 17; RF 0,0217 a 0,587
    ✓ Portão satisfeito: invariante válido em 10 de 10 pipelines.
  EXIT: 0        (era: código 2, "4 de 5 pipelines, falta mafft_raxml")

ls Backend/tests/data/reference/trees/   → 10 arquivos (sem clustalo_*, antes 14 com 4 contaminados)

cd Backend && python -m pytest tests -q   → 257 passed, 1 xfailed (sem regressão)
```

**Write-lock:** `docs/science/scripts/gerar_dataset_referencia.py`, `Backend/tests/data/reference/{expected.json,README.md,MANIFEST.sha256,trees/*}`. Não toca código de produção. **Reversível:** sim (regenerável a qualquer momento pelo mesmo comando).

### DEC-064 · 2026-09-02 · M3.2/M7.2 fecha — RAxML-NG passa a produzir suporte de ramo

**Gatilho:** pedido do usuário — atacar M3 em paralelo a M2/M4, via `ptm-bioinformatica-inferencia` (trilha T1, só `BioComp_UFF/`), esta sessão gerenciando e validando.

#### O que fechou

`raxml_ng_constructor` (`BioComp_UFF/workflow/tree_construction/builder.py`) rodava só busca de ML — sem `--bootstrap`/`--all`, não calculava suporte nenhum, o único dos três métodos avançados sem essa informação ([`08-ficha-de-chamada-por-metodo.md §3`](../science/08-ficha-de-chamada-por-metodo.md#3-raxml-ng)). Corrigido: `--all --bs-trees 1000` combina busca de ML + bootstrap + mapeamento de suporte num só comando, mesma contagem de réplicas do `-bb 1000` do IQ-TREE. `--workers 1` (D17) e a semente seguem intocados. Leitura passa a tentar `<prefix>.raxml.support` primeiro (tem `.confidence`), com `.raxml.bestTree` como fallback.

**Achado que fica registrado, não é regressão:** o suporte do RAxML-NG é **FBP** (Felsenstein bootstrap proportion, bootstrap não-paramétrico clássico) — **não é UFBoot**, a métrica aproximada do IQ-TREE. Ambos saem em escala 0-100, mas não são a mesma coisa e não devem ser lidos com o mesmo limiar de confiança. Isso é exatamente o tipo de heterogeneidade de suporte que M7.3 (modelo declarado e coerente) precisa endereçar mais tarde.

#### M3.1 — metade fechada (só `BioComp_UFF/`)

Confirmado que o suporte do RAxML-NG sobrevive ao `Phylo.write` para Nexus, mesmo mecanismo genérico já usado por FastTree e IQ-TREE (ficha §1/§2) — não precisou de código novo, só confirmação por teste. **A outra metade de M3.1** (propagar `confidence` a `metadata.json`/grafo/UI) é `Backend/`/`Frontend/`, fora do escopo deste lote pela regra 6 do CLAUDE.md — fica para um lote futuro.

#### Δ em métrica publicada: nenhum

Nenhum genoma real (Variola/Zika) foi processado neste lote — só um alinhamento sintético de 6 táxons, fixo no teste, sem rede. As árvores já publicadas (VARV-49, VARV-121, etc.) não mudam até serem reexecutadas com este código.

**Evidência de execução:**
```
raxml-ng --all --msa test.fasta --model GTR+G --threads 1 --workers 1 --seed 12345 \
  --tree rand{10} --bs-trees 1000 --prefix test1000b --redo
  → "Best ML tree with Felsenstein bootstrap (FBP) support values saved to: test1000b.raxml.support"

cd BioComp_UFF && python -m unittest workflow.tests.test_raxml_bootstrap -v
  → 3 testes, OK (árvore com .confidence não-nulo; suporte sobrevive ao Nexus;
    linha de comando trava --all/--bs-trees 1000/--workers 1, sem "auto")

cd BioComp_UFF && python -m unittest workflow.tests.test_stability workflow.tests.test_subtree_mining \
  workflow.tests.test_tree_identity workflow.tests.test_rf_bipartition workflow.tests.test_manifest \
  workflow.tests.test_rooting workflow.tests.test_taxonomy workflow.tests.test_aligners \
  workflow.tests.test_external_tools workflow.tests.test_raxml_bootstrap
  → Ran 167 tests, OK (era 164; +3, sem regressão)
```

**Não verificado, registrado para depois:** determinismo do bootstrap entre execuções (mesma semente) não foi medido — só a busca de ML tinha essa medição (D17/D21); com `raxml_threads` no default (4), o RAxML-NG recusa alinhamentos pequenos ("Too few patterns per thread") — comportamento pré-existente, não causado por este lote, registrado na ficha como escolha silenciosa a revisitar.

**Write-lock:** `BioComp_UFF/workflow/tree_construction/builder.py`, `BioComp_UFF/workflow/tests/test_raxml_bootstrap.py` (novo), `docs/science/08-ficha-de-chamada-por-metodo.md`. Não toca `Backend/` nem `Frontend/`. **Reversível:** sim.

### DEC-065 · 2026-09-02 · M4, segunda onda — T2 segurança e desempenho fecham (M4.2→M4.11, 10 de 10 lotes)

**Gatilho:** continuação da trilha T2 (`app.py` é write-lock único, serial) já planejada em `10-marcos-e-metas.md §6` e no rascunho de retomada da sessão anterior. Uma queda de energia interrompeu a sessão que implementou o lote, sem perda de trabalho (nada estava commitado nem em stash — confirmado por `git status`/`git stash list` limpos além dos arquivos do próprio lote). Esta sessão reconstituiu o estado a partir dos horários de modificação dos arquivos, cruzou contra `10-marcos-e-metas.md` para identificar os dez lotes e validou cada um antes de registrar. **Nota adicionada após DEC-066:** esta entrada descreve o estado do lote como commitado em `e7321ee`, antes da revisão encontrar 4 bloqueadores. Ver DEC-066 para a correção (commit `bf5fb04` é só documentação; os bloqueadores foram corrigidos num terceiro commit).

#### M4.2/M4.3 — log estruturado, zero `str(e)` vazando ao cliente (`S-4`)

`logging_conf.py` (novo) centraliza `logging.basicConfig` por `LOG_LEVEL`; toda captura de exceção em `app.py`, nos 4 routers e em `cql_batch_service.py` passa a logar o traceback real no servidor (`logger.exception`) e devolver `detail=` genérico ao cliente. Contagem literal de `str(e)` nos seis arquivos: **HEAD tinha 25** (`app.py`=15, `cql_router.py`=2, `ncbi_router.py`=1, `neo4j_router.py`=2, `cql_batch_service.py`=5, `cql_batch_router.py`=0); **restam 2**, ambos em `app.py` e nenhum em `detail=` de `HTTPException` (uma `ValueError` interna e uma comparação `.lower()`, confirmados pelo teste AST abaixo). Teste é AST, não grep — percorre todo `HTTPException(...)`, acha o argumento `detail` e reprova se ele referencia, em qualquer nível da expressão, o nome do `except ... as <nome>` que o envolve, para não depender de formatação.

#### M4.4 — `ADMIN_TOKEN` em rotas administrativas (`S-5`/DEC-004)

`seguranca.exigir_admin` (novo, `seguranca.py`) compara `X-Admin-Token` contra a variável de ambiente; sem `ADMIN_TOKEN` configurado a rota é recusada, nunca fica aberta por omissão. Aplicado a `POST /api/ncbi/set-email` (`app.py`) e `POST /neo4j/connect` (`neo4j_router.py`).

#### M4.5 — `Origin` dos WebSockets contra `ALLOWED_ORIGINS` (`S-5`)

Os dois WebSockets checam `websocket.headers.get("origin")` contra a allowlist antes de aceitar a conexão e fecham com `1008` (policy violation) quando a origem não bate.

#### M4.6 — limites rígidos de entrada (`S-5`)

`MAX_UPLOAD_BYTES` (200 MB), `MAX_UPLOAD_FILES` (50) e `MAX_ZIP_EXPANSION_RATIO` (100×, contra zip bomb — verifica `descomprimido/comprimido` e o total descomprimido antes de extrair) em `/upload-data`; `NCBI_RETMAX_MAXIMO` (500) limita os dois campos `retmax` do request NCBI que antes não tinham teto.

#### M4.7 — rate limiting anônimo nas rotas de escrita (`S-5`/DEC-004)

`seguranca.limitar_taxa` (novo, mesmo módulo): janela fixa em memória por `(rota, IP)`, 30 requisições/60 s, sem Redis nem infraestrutura externa — não sobrevive a reinício nem a múltiplos workers, aceitável para o vetor que fecha (abuso anônimo de um único processo). `429` com `Retry-After`. Aplicado a `/projects/{nome}/run`, `/projects/{nome}/rerun`, `/upload-data` e `/cql-batch/execute-batch` — **4 rotas, não 3** (correção de DEC-066: a revisão achou que o diff cobria `cql_batch_router.py` também, e o texto original desta entrada não).

#### M4.8 — `psutil.cpu_percent` sai do event loop (perf)

`cpu_percent(interval=1)` bloqueava o loop inteiro por 1 s a cada ciclo do watcher, travando todo cliente WS conectado nesse intervalo; vira `cpu_percent(interval=None)` (não bloqueante, mede desde a última chamada).

#### M4.9 — 3 rotas NCBI síncronas por `asyncio.to_thread` (`B-4`)

`search-species`, `download` e `download-accessions` chamavam `ncbi_service.*` (rede via Entrez) direto dentro de um handler `async def`. Teste mede diretamente o sintoma: dispara a rota lenta sem `await`, mede quanto tempo uma segunda requisição trivial (`HEAD /`) leva para responder — antes do lote isso ficaria preso atrás da chamada de rede; depois, sempre abaixo de 0,4 s.

#### M4.10 — trabalho de CPU sai do loop (`B-5`)

`get_metadata_cache` (3 chamadas), `Phylo.convert`, geração de plot (`_gerar_plot_sync`) e comparação de árvores (`_comparar_arvores_sync`) passam por `asyncio.to_thread`. Refatoração pura de transporte — nenhuma lógica de cálculo mudou.

#### M4.11 — `stream_workflow_output` reescrito (perf)

Antes: busy-poll a 10 Hz que descartava o fim do buffer ao encerrar. Depois: duas tasks (`consumir_stdout`/`consumir_stderr`), cada uma em `while True: readline(); if not linha: break` — só termina no EOF real do pipe, então nada do que o processo ainda tinha para escrever fica preso.

#### Δ em métrica publicada: nenhum

Segurança e desempenho de API — nenhum arquivo toca distância entre árvores, identidade de clado, extração de metadado ou padrão FPMax. `BioComp_UFF/` e `Frontend/` não tocados.

**Evidência de execução:**
```
git status --short && git stash list
  → confirma: nada commitado, nada em stash: o lote sobreviveu à queda de energia intacto

cd Backend && python -m pytest tests -q
  → 294 passed, 1 xfailed (era 257 após DEC-061/064; +37, sem regressão)

cd Backend && python -m pytest tests/api/test_vazamento_de_erro.py -v   → 7 passed (M4.2/M4.3, AST, 7 arquivos varridos)
cd Backend && python -m pytest tests/api/test_admin_token.py -v        → 7 passed (M4.4)
cd Backend && python -m pytest tests/api/test_ws_origin.py -v          → 4 passed (M4.5)
cd Backend && python -m pytest tests/api/test_limites_entrada.py -v    → 6 passed (M4.6)
cd Backend && python -m pytest tests/api/test_rate_limit.py -v         → 3 passed (M4.7)
cd Backend && python -m pytest tests/api/test_event_loop.py -v         → 1 passed (M4.8)
cd Backend && python -m pytest tests/api/test_ncbi_thread.py -v        → 3 passed (M4.9)
cd Backend && python -m pytest tests/api/test_cpu_bound_to_thread.py -v → 4 passed (M4.10)
cd Backend && python -m pytest tests/unit/test_stream_workflow.py -v   → 2 passed (M4.11)

grep -c "str(e)" em app.py/routers/cql_batch_service.py: HEAD 15+0+2+1+2+5=25 → working tree 2 (nenhum em detail=)
```

**Não verificado, registrado para depois:** nenhuma revisão cruzada (Revisor/Validador formais) rodou sobre este lote ainda — só a validação desta sessão contra os testes que o próprio lote trouxe. `ADMIN_TOKEN` em `DELETE /projects/{nome}` segue fora do fatiamento, decisão pendente do usuário (nota em `10-marcos-e-metas.md §6`). **Atualização (DEC-066): a revisão formal rodou depois deste commit e achou 4 bloqueadores reais — ver DEC-066.**

**Write-lock:** `Backend/src/app.py`, `Backend/src/logging_conf.py` (novo), `Backend/src/seguranca.py` (novo), `Backend/src/routers/{cql_batch_router,cql_router,ncbi_router,neo4j_router}.py`, `Backend/src/services/cql_batch_service.py`, `Backend/tests/api/{test_admin_token,test_cpu_bound_to_thread,test_event_loop,test_limites_entrada,test_ncbi_thread,test_rate_limit,test_vazamento_de_erro,test_ws_origin,test_security_endpoints}.py`, `Backend/tests/unit/test_stream_workflow.py`. Não toca `BioComp_UFF/` nem `Frontend/`. **Reversível:** sim — commitado em `e7321ee` (código) e `bf5fb04` (doc), branch não publicada, nada impede reescrever se necessário.

### DEC-066 · 2026-09-02 · Revisão do lote M4/T2 reprova 4 bloqueadores; 3 corrigidos, 1 investigado e revertido

**Gatilho:** pedido do usuário — commitar DEC-065 e rodar Revisor + Validador em paralelo sobre o lote (`ptm-revisor-codigo`, `ptm-validador`), conforme o protocolo de fim de lote.

#### Os dois pareceres não se contradizem

O **Validador aprovou** os 12 gates declarados em `10-marcos-e-metas.md §6`, com evidência independente (curl real contra `/api/ncbi/set-email` para M4.4, grep independente de `str(e)` para M4.2/M4.3, leitura confirmando `close(1008)` antes de `accept()` para M4.5, confirmação de que os testes de M4.8-M4.11 medem latência sob bloqueio simulado, não só "roda sem erro"). O **Revisor reprovou** o lote com 4 bloqueadores — nenhum deles é um gate declarado; são defeitos em caminhos que a suíte do próprio lote não exercita, e o Revisor avisou disso explicitamente no parecer: *"três dos quatro bloqueadores são invisíveis à suíte atual porque os testes mockam exatamente a função sob suspeita [...] ou constroem só o caso benigno"*. Os dois pareceres estão certos ao mesmo tempo: o lote fazia o que dizia fazer, e o que dizia fazer era insuficiente em três pontos e perigoso num quarto.

#### B1 — `/upload-data` materializava o upload inteiro antes de checar o teto de bytes

`await uploaded_file.read()` sem argumento lia o corpo inteiro em memória antes de qualquer comparação com `MAX_UPLOAD_BYTES` — um upload de alguns GB seria lido por completo só para ser recusado com `413` depois. **Corrigido:** `_ler_upload_ate_o_teto` (novo, `app.py`) lê em blocos de 1 MB e aborta assim que o total ultrapassa o teto restante, sem terminar de consumir o stream.

#### B2 — a defesa contra zip bomb confiava em campo do cabeçalho controlado pelo atacante

`descomprimido = sum(info.file_size for info in zip_ref.infolist())` lê um campo do diretório central do ZIP, escrito por quem monta o arquivo — um ZIP forjado podia declarar `file_size` pequeno e entregar muito mais bytes na descompressão real, contornando as duas checagens. O teste do lote original só montava ZIPs honestos com `zipfile`, exercitando só o caso benigno. **Corrigido:** `_extrair_membro_com_teto` (novo, `app.py`) descomprime em blocos e aplica o teto sobre o byte de fato produzido, sem nunca ler `file_size` — o mecanismo não valida o cabeçalho contra spoofing, é imune a ele por não depender dele. A checagem antiga por `infolist()` foi mantida como triagem barata do caso honesto (evita gastar CPU descomprimindo o óbvio), não como a defesa.

#### B3 — `exigir_admin` comparava o token com `!=`

`x_admin_token != admin_token` termina no primeiro byte divergente — comparação de segredo pede tempo constante. **Corrigido:** `secrets.compare_digest`, com guarda explícita para `x_admin_token` vazio/`None` antes (a função não aceita `None`).

#### B4 — investigado com execução real: `render_annotated_tree` (ete3/PyQt) crasha fora da main thread

M4.10 moveu `_gerar_plot_sync` (que chama `render_annotated_tree`) inteiro para `asyncio.to_thread`. Reproduzido isoladamente:

```
$ python3 -c "
import threading
from src.utils.treePlot import render_annotated_tree
t = threading.Thread(target=lambda: render_annotated_tree('t.nwk', {...}, 'out.png'))
t.start(); t.join()
"
WARNING: QApplication was not created in the main() thread.
Falha de segmentação (imagem do núcleo gravada)
```
`SIGSEGV` — não é uma exceção Python capturável, derruba o processo do backend inteiro (todo cliente conectado, não só a requisição de `gen_plot`). Qt exige que `QApplication` e as operações de cena rodem na thread em que foram criadas.

**Decisão: revertido, não corrigido de outra forma.** `generate_tree_plot` volta a chamar `render_annotated_tree` de forma síncrona no event loop — exatamente como antes de M4.10. Só a parte que é de fato thread-safe (`get_metadata_cache`, I/O + CPU puro, sem Qt) continua em `asyncio.to_thread`. `_gerar_plot_sync` foi removido; a lógica ficou inline em `generate_tree_plot`. Isso reabre o bloqueio do event loop especificamente durante o render de imagem (não durante a leitura de metadata, nem nos outros três caminhos de M4.10 — `compare_trees`, `pattern-analysis`, `build_metadata_index` — que não tocam Qt e continuam em thread), e é a troca certa: um endpoint mais lento é reversível; um processo morto por `SIGSEGV` não. Uma alternativa mais completa (mover o render para um processo separado, `ProcessPoolExecutor`, onde o Qt teria sua própria main thread) fica registrada como achado fora de escopo — é mudança maior que o que este lote de correção pediu.

Guarda de regressão: `test_render_annotated_tree_nao_e_chamado_via_to_thread` (AST, `test_cpu_bound_to_thread.py`) reprova se alguém reembrulhar a chamada em `to_thread`/`run_in_executor` sem repetir esta investigação — sem recriar o crash a cada `pytest`, que seria caro e instável entre ambientes (depende de haver display/Qt configurado).

#### Divergência corrigida no ledger

DEC-065 registrava rate limiting em 3 rotas (`/projects/{nome}/run`, `/rerun`, `/upload-data`); o diff aplicou em **4** — `cql_batch_router.py`/`/execute-batch` também recebeu `Depends(limitar_taxa("cql-batch"))`, e o próprio teste do lote (`test_cql_batch_429_apos_n_mais_1`) já cobria isso. Texto de DEC-065 corrigido.

#### Ressalvas do Revisor não corrigidas nesta rodada (achados registrados, fila de triagem)

Por decisão do usuário, só B1-B4 entraram nesta correção. Ficam para depois: `_contadores` do rate limiter é cache sem teto (nunca purga janela vencida); `log_watcher` ainda vaza `str(e)` por WebSocket fora do alcance do teste AST (que só varre `detail=` de `HTTPException`); primeira leitura de `psutil.cpu_percent(interval=None)` no watcher é sempre `0.0`; comentário do `stream_workflow_output` descreve uma terceira task que não existe; `retmax` sem piso (`ge=1`); `ALLOWED_ORIGINS=*` quebra WebSocket em silêncio; `cql_router.py` (`/execute`, `/execute-batch` de Cypher arbitrário) não tem rate limiting, ao contrário de `cql_batch_router.py`.

#### Δ em métrica publicada: nenhum

Mesmo lote de segurança/desempenho da DEC-065; nenhuma correção toca a zona sagrada.

**Evidência de execução:**
```
cd Backend && python -m pytest tests --no-header
  → 295 passed, 1 xfailed (era 294; +1: guarda de regressão de B4)

cd Backend && python -m pytest tests/unit/test_upload_seguranca.py -v
  → 4 passed: aborta sem ler o arquivo inteiro (B1), lê por completo dentro do teto,
    extração aborta pelo byte real (B2, independente de file_size), extração dentro
    do teto devolve conteúdo completo

cd Backend && python -m pytest tests --no-header   [após test_upload_seguranca.py]
  → 299 passed, 1 xfailed, sem regressão

Reprodução do SIGSEGV de B4 (fora do event loop, script isolado, não faz parte do harness):
  WARNING: QApplication was not created in the main() thread.
  Falha de segmentação (imagem do núcleo gravada) — exit code 139
```

**Write-lock:** `Backend/src/app.py` (upload em blocos, extração de ZIP com teto real, `gen_plot` volta a renderizar síncrono), `Backend/src/seguranca.py` (`secrets.compare_digest`), `Backend/tests/api/test_cpu_bound_to_thread.py` (teste de `gen_plot` ajustado ao novo escopo + guarda de regressão de B4 adicionada), `Backend/tests/unit/test_upload_seguranca.py` (novo). Mesmo escopo de `Backend/`, não toca `BioComp_UFF/` nem `Frontend/`. **Reversível:** sim.

### DEC-067 · 2026-09-03 · Segunda rodada do Revisor reprova de novo o commit de correção (3 novos bloqueadores); não corrigido ainda

**Gatilho:** pedido do usuário — nova rodada do Revisor sobre `52458b4` (o commit que corrigiu B1-B4 de DEC-066), antes de decidir se apresenta o projeto num congresso em poucos dias.

**Veredito: reprovado.** Suíte segue verde (299 passed, 1 xfailed) e, de novo, os bloqueadores são invisíveis a ela.

- **R1 — B2 fecha por membro/ZIP, não pelo upload inteiro.** `bytes_descomprimidos_reais` é reinicializado dentro do laço `for uploaded_file in files`; cada ZIP do mesmo upload ganha um orçamento novo de `MAX_UPLOAD_BYTES`. Reproduzido com ZIPs honestos (razão de deflate 65,8×, dentro da triagem): 20 ZIPs de ~1,4 KB cada somam ~1,84 MB descomprimidos por um teto de ~100 KB nesse teste — em produção (200 MB/50 arquivos), até ~10 GB acumulados em `all_sequences` com `200 OK`. A forma do defeito é anterior a este commit, mas o critério de aceite de B2 ("o teto vale para o byte real") não sobrevive porque o acumulador não é global.
- **R2 — B3 troca bypass por crash.** `secrets.compare_digest` sobre `str` exige ASCII nos dois lados; um `X-Admin-Token` com byte > 0x7F (decodificado como latin-1 pelo Starlette) faz a função levantar `TypeError` não capturado → `500` em vez de `401`. Sem bypass de autenticação, mas um anônimo derruba a rota administrativa com um header de um byte.
- **R3 — a guarda AST de B4 não pegaria a forma real do bug histórico.** Só marca ofensor quando `render_annotated_tree` é argumento direto de `to_thread`; o bug de M4.10 tinha uma camada de indireção (`await asyncio.to_thread(_gerar_plot_sync, ...)`, com a chamada Qt dentro do wrapper). Testado: a guarda rodada contra o `app.py` do commit bugado (`e7321ee`) devolve **zero ofensores** — passaria mesmo com o `SIGSEGV` de volta. `app.py` atual tem 5 wrappers `_*_sync` desse padrão.

**Ressalvas (não bloqueiam, ficam registradas):**
- **S1** — a alegação de DEC-066 de que `_extrair_membro_com_teto` é imune a spoofing "por nunca ler `file_size`" está **errada no mecanismo**: `zipfile.ZipExtFile` usa `file_size` internamente para limitar o stream. O desfecho prático continua seguro (um `file_size` forjado menor que o real produz `BadZipFile: Bad CRC-32`, não um bypass), mas esse erro cai no `except Exception` genérico do endpoint e vira `500`, não `400`. Docstring/comentário/DEC-066 têm a alegação errada, mesmo com o comportamento seguro.
- **S2** — B1 reduz o pico de RAM do handler, não a recepção: o `UploadFile` do Starlette já spoola para disco acima de 1 MB antes do handler rodar, então um corpo de vários GB ainda chega ao disco antes de qualquer checagem. Fechar isso por completo pediria rejeição por `Content-Length` no middleware — fora do escopo deste lote.

**Decisão:** não corrigido nesta sessão — o foco mudou para avaliar prontidão para apresentação em congresso (pedido do usuário). R1-R3 e S1-S2 ficam pendentes, registrados aqui, para retomar quando o foco voltar a M4/T2.

**Write-lock:** nenhum (sessão de revisão, não de código). **Reversível:** não se aplica.

### DEC-068 · 2026-09-03 · D23 caracterizado a fundo — dois fenômenos, não um; decisão de curadoria formalizada, não implementada

**Gatilho:** pedido do usuário — atacar D23 em paralelo a M3.1/M3.4, via `ptm-bioinformatica-inferencia`, esta sessão gerenciando.

#### O que o lote fechou

O item 2 de D23 (renomear `remove_pipe`, corrigir a mensagem, registrar no manifesto quem foi descartado) **já estava implementado desde DEC-050** — o agente não refez, só achou e corrigiu um defeito de legibilidade dentro do que já existia: a mensagem para **acesso repetido** (mesmo `VERSION` baixado duas vezes) dizia `"DQ437594.1 (idêntico a DQ437594.1)"`, uma contradição que conflava esse caso com o de GenBank×RefSeq. Agora distingue os dois. Diff de produção: **+26 −1**, só string de log, docstring e comentário — nenhuma chave de deduplicação, nenhum caminho de cálculo, nenhum arquivo gravado muda.

#### O que o lote achou, além do pedido

1. **D23 descrevia um fenômeno; são dois.** Além do par GenBank/RefSeq, há o **mesmo acesso baixado duas vezes** (`DQ437594.1` duas vezes em VARV-49, `NC_008291.1` duas vezes em VARV-121) — explica por que VARV-49 tem 52 registros para 51 rótulos únicos.
2. **`HQ849551` é o terceiro gêmeo, não um caso à parte**: `NC_015960.1` (RefSeq) == `HQ849551.1` (GenBank), Yokapox virus, confirmado por md5.
3. **O descasamento de identidade está vivo nos artefatos reexecutados de 2026-09-01**: Taterapox virus é `DQ437594` em VARV-49 e `NC_008291` em VARV-121 — o mesmo táxon sob dois rótulos em dois experimentos que se pretendem comparáveis.
4. **Achado novo, fora de D23**: `raw_data_sequences.gb` de VARV-121 tem **4 registros `LOCUS` para 121 folhas** (VARV-49 tem os 49 completos) — se não for já sabido, qualquer leitura filogeográfica de VARV-121 hoje está vazia. Registrado como achado, não corrigido.

#### Oráculo independente

Script próprio (parser FASTA + agrupamento por md5, sem usar `workflow/`), confrontado contra `tools_invoked.deduplicacao.descartados` dos manifestos: **zero divergências** nos grupos de VARV-49 e VARV-121.

#### Pendência de decisão do usuário — qual registro sobrevive quando GenBank e RefSeq coexistem

4 opções levantadas com impacto medido (detalhe completo no relatório do agente, arquivado neste DEC): **(A)** preferir RefSeq, relabelando na posição de hoje — 2/1/0 táxons mudam de acesso (VARV-49/121/6), **provavelmente neutro em topologia** (sequência idêntica, só o cabeçalho muda); **(B)** preferir RefSeq mantendo a posição do registro RefSeq — mesmos táxons, mas a ordem de entrada no MAFFT muda, o que pode afetar alinhamento/busca de ML, **não medido**; **(C)** manter arbitrário (estado atual) — defeito permanece; **(D)** recusar o conjunto e exigir declaração por experimento. Achado que eleva a aposta: `raw_data_sequences.gb` é baixado a partir das **folhas da árvore**, ou seja, pós-deduplicação — o acesso sobrevivente decide de qual registro vêm país/ano/hospedeiro em `metadata.json`. Não é cosmética de rótulo, é a fonte dos metadados filogeográficos. Verificação pendente de rede (`efetch` em `NC_003391.1`/`HQ849551.1` — não existem nos `.gb` locais) antes de decidir entre A e a perda potencial de `geo_loc_name` do Camelpox.

#### Δ em métrica publicada: nenhum

Confirmado pelo oráculo — chave de deduplicação, política de sobrevivência e conteúdo gravado são idênticos byte a byte ao antes.

**Evidência de execução:**
```
cd BioComp_UFF && python -m unittest workflow.tests.test_deduplicacao          → 10 passed
cd BioComp_UFF && python -m unittest <14 módulos, incl. o novo>                → 205 passed
git status --short (BioComp_UFF)                                              → M workflow/utils/dataValidation.py,
                                                                                  ?? workflow/tests/test_deduplicacao.py
```

**Write-lock:** `BioComp_UFF/workflow/utils/dataValidation.py`, `BioComp_UFF/workflow/tests/test_deduplicacao.py` (novo). Não toca `Backend/` nem `Frontend/`. **Reversível:** sim — nada commitado.

### DEC-069 · 2026-09-03 · M3.4 implementado — `make main-result` existe; as duas afirmações do artigo se sustentam em 2 de 3 conjuntos, com números atualizados

**Gatilho:** pedido do usuário — atacar M3.4 em paralelo a M3.1/D23, via `ptm-dominio-cientifico`, esta sessão gerenciando.

#### O que o lote entregou

`docs/science/scripts/resultado_principal.py` (novo, reusa `StabilityAnalyzer`/`TreeSet` já corrigidos por D3/D5/D13, e a receita de oráculo de `oraculo_rf_dendropy.py`) + alvo `main-result` no `Makefile`, espelhando `reference-check` (código 1 = falso, código 2 = incompleto, código 0 = completo e sustentado).

**Resultado do gate, agora:**

| Afirmação | VARV-49 (M=5) | VARV-121 (M=5) | VARV-6 (auxiliar) | Veredito |
|---|---|---|---|---|
| (i) UFBoot=100 não garante robustez | 14/30 sobrevivem (46,7%) | 33/77 (42,9%) | 1/1 | **sustenta** |
| (ii) UFBoot≥95 idiossincrático (um só pipeline) | 0/36 | 0/90 | 0/1 | **sustenta** — total 0/127 |

Oráculo dendropy: **1682 testes de pertinência de bipartição, 0 divergências**. Oráculo RF do projeto: **181 pares, 0 divergências**. `make reference-check` intocado: 3/3 invariantes, 10/10 pipelines, código 0.

**Código de saída: 2 (não 0)** — as afirmações valem, a reprodução não está completa. Duas causas, ambas exigindo reexecução pesada, nenhuma corrigível por código:
1. **VARV-52 bloqueado**: não existe reexecução pós-M1/M2 no disco (só `teste52/`, pré-D1, sem `mafft_iterative`, sem manifesto). O script **recusa** produzir número para VARV-52 em vez de usar o artefato velho — confirmado: em modo `--caracterizar`, os artefatos velhos reproduzem exatamente os números antigos de §4.4 (30/14/38, Δ=0), o que confirma a proveniência do número antigo sem validá-lo para hoje.
2. **RAxML sem suporte de ramo nos três reexecutados de 2026-09-01**: `--bs-trees 1000` só entrou em M3.2/DEC-064 (2026-09-02), depois das reexecuções. A sub-afirmação do gate ("toda árvore ML carrega suporte de ramo") é falsa hoje para `mafft_raxml`/`mafft_iterative_raxml` — código correto, artefato anterior à correção.

#### Δ em métrica publicada: sim, mas por versão de ferramenta, não por bug

Números mudam em relação a `03-metricas §4.1` (universo comparável de 4 métodos): VARV-49 UFBoot=100 27→**30**, sobrevivem 13→**14**, UFBoot≥95 34→**36**, Pearson 0,44→**0,432**; VARV-121 UFBoot=100 86→**77**, sobrevivem 35→**34**, UFBoot≥95 94→**90**, Pearson 0,37→**0,413**. Causa isolada e confirmada: alinhamento **idêntico byte a byte** (mesmo md5, velho e novo), modelo idêntico (`GTR+G -bb 1000`) — o que mudou foi o **IQ-TREE**: 2.2.2.6 com threads em auto-detect (32 núcleos) → 3.1.3 com `-nt 1`, semente `12345` explícita. Mesmo mecanismo de [D17](../science/02-defeitos-que-alteram-resultado.md#d17)/[D21](../science/02-defeitos-que-alteram-resultado.md#d21): versão/determinismo do inferidor é parte do resultado. Os números novos são os defensáveis (determinísticos, D1/D3/D5 já corrigidos); os de §4.4 vieram de execução não determinística — caracterizado, não é regressão do script.

**Achado adicional sobre o Pearson:** a faixa herdada 0,27–0,44 (`03-metricas §4.1`) só se sustenta no universo de 4 métodos. Com 5 métodos (braço `mafft` completo) sobe a 0,504 (VARV-121); com os 10 pipelines, a 0,596. `03-metricas §4.1` precisa declarar a que universo a faixa se refere.

**Defeito achado e corrigido dentro do próprio lote:** a primeira versão do script devolvia **"AFIRMAÇÃO VIOLADA" (código 1)** quando nada tinha sido medido (ex.: rodar só com VARV-52 bloqueado) — falsidade silenciosa da regra 5 do CLAUDE.md (`0`/`-1` onde a métrica é indefinida é defeito, não convenção; aqui era "violada" em vez de "não medida"). Corrigido antes de qualquer saída chegar ao usuário: "não medida" e "violada" são estados agora distintos.

**Decisão do usuário, ainda pendente:** o que fazer com o Δ acima em `03-metricas §4.1`/§4.4 — **(a)** atualizar para os números novos, **(b)** manter os antigos com nota de proveniência, **(c)** postergar até VARV-52 reexecutar e atualizar tudo de uma vez. Mesmo padrão de D1/D6 — decisão do usuário, não do agente.

**Evidência de execução:**
```
make main-result
  → VARV-49: n=49, 10 árvores, UFBoot 100=30, sobrevivem 14/30, Pearson=0.425 (mafft-5)
  → VARV-121: n=121, UFBoot 100=77, sobrevivem 33/77, Pearson=0.504 (mafft-5)
  → (i) sustenta em VARV-49 e VARV-121; (ii) 0 de 127 idiossincráticos, sustenta
  → VARV-52: bloqueado (requer reexecução) — reprodução INCOMPLETA
  → código de saída: 2

modo --caracterizar (sobre artefatos pré-correção) → reproduz §4.4 exatamente, Δ=0 nas 16 contagens
oráculo dendropy: 1682 testes, 0 divergências · oráculo RF do projeto: 181 pares, 0 divergências
make reference-check → inalterado, 3/3 invariantes, código 0
```

**Write-lock:** `docs/science/scripts/resultado_principal.py` (novo), `Makefile` (alvo `main-result`). Não toca `Backend/`, `Frontend/` nem `BioComp_UFF/`. **Reversível:** sim — nada commitado.

### DEC-070 · 2026-09-03 · M3.1 (metade `Backend/`) fecha — suporte de ramo chega ao usuário, sem achatar a heterogeneidade entre métodos

**Gatilho:** pedido do usuário — atacar a metade `Backend/` de M3.1 em paralelo a M3.4/D23, via `ptm-bioinformatica-inferencia`, esta sessão gerenciando.

#### O que fechou

Rota nova `GET /api/tree/{project_name}/branch-support` (`Backend/src/suporte_de_ramo.py`, novo módulo, ~370 linhas — não engordou `app.py`, só 2 linhas: 1 import, 1 handler). Lê `.confidence` das árvores em `out/Trees/*.nexus` — nunca `.name` (nas árvores de distância o Biopython guarda `InnerNN` em `.name` quando não há suporte; um leitor que caísse para `.name` inventaria número onde não há nenhum). `clade_id` é a bipartição canônica já usada em `metadata.json`/FPMax/Neo4j (D5) — nenhuma segunda fórmula de identidade.

**A decisão central: nenhum valor é normalizado.** UFBoot (0-100, IQ-TREE), FBP (0-100, RAxML-NG pós-M3.2), suporte local (0-1, FastTree) e posterior (MrBayes) viajam cada um com `metrica` e `metodo` no próprio ramo — payload declara `comparabilidade.entre_metodos: false`. O limiar "alto" (95) só existe para UFBoot, porque é o único que o projeto já adota (é o limiar do próprio gate de M3.4); FBP e suporte local recebem `limiar_alto: null` com nota de que a decisão é pendente do usuário — não emprestou o 95 do UFBoot para eles.

#### Oráculo independente

`Backend/tests/oracle/test_oraculo_suporte_dendropy.py` relê os mesmos Nexus com dendropy (parser, bipartição e normalização de D13 reimplementados do zero, nenhuma linha de produção importada). **656 ramos das árvores de referência (VARV-49, VARV-121) + 5 de uma fixture de FBP real: 0 divergências**, incluindo os casos de ausência (NJ/UPGMA/RAxML-pré-M3.2 — o oráculo também confirma que não há suporte a encontrar).

#### Achado crítico, cross-validado por M3.4 de forma independente

**Nenhum artefato em disco tem FBP.** As reexecuções validadas de VARV-49/121 são de 2026-09-01; `--all --bs-trees 1000` só entrou em código em 2026-09-02 (M3.2/DEC-064). M3.2 mudou o código, nenhum resultado em disco o materializou ainda. **O agente de M3.4, trabalhando em paralelo sem ver este relatório, achou exatamente a mesma lacuna** (RAxML sem suporte de ramo nos três reexecutados) — duas investigações independentes, mesmo achado, reforça que não é erro de leitura de nenhuma das duas.

**Achado novo:** probabilidade posterior do MrBayes confirmada perdida no artefato final — 0 de 2 nós internos com `.confidence` em `tree_dataset_test_*_mrbayes.nexus`. Consistente com suspeita já registrada na ficha de chamada por método (M7.1); agora tem evidência de artefato real. Fora do escopo deste lote (é `BioComp_UFF/`), fica para M7.4.

**Achado fora de escopo:** `Zika_ZIKV480_reexec_20260901` tem só 3 árvores em `out/Trees/` contra 8-10 dos demais — pode ser perda silenciosa de pipeline (padrão de D19). Não investigado; a execução está ativa (ver acompanhamento de ZIKV-480 nesta sessão). Registrado para triagem.

#### Δ em métrica publicada: nenhum

Aditivo — rota nova, 2 linhas tocadas em `app.py`. Nenhum cálculo existente (distância, clado, metadado, FPMax) foi alterado; golden snapshots não regravados.

**Pendências de decisão do usuário, explícitas no parecer do agente:**
1. Limiar de suporte alto para FBP e suporte local do FastTree — hoje `null` de propósito. Bloqueia M3.3 (UI) pintar "alto/baixo" para esses dois métodos.
2. Propagação ao grafo Neo4j (a terceira perna de M3.1, "ao grafo") — não implementada; registrada como ingestão de `(valor, metrica, metodo)` numa propriedade de clado que já existe, coordenar com A12.
3. Reexecução de VARV-49/121 com o código pós-M3.2 é o que materializaria FBP em disco — bloqueia a coluna de RAxML em M3.4, mesma pendência que M3.4 já registrou em DEC-069.

**Evidência de execução:**
```
cd Backend && conda run -n Phylotreeminer python -m pytest tests --tb=short
  → 338 passed, 1 xfailed (era 302; +36, sem regressão)

pytest tests/unit/test_suporte_de_ramo.py tests/api/test_branch_support.py tests/oracle/test_oraculo_suporte_dendropy.py
  → 36 passed (15 + 7 + 14)

Varredura de FBP em disco: nenhuma árvore RAxML com valor de suporte (0 arquivos)
Fixture de FBP: raxml-ng --all --bs-trees 200 ... → FBP real [72,83,95,100,100], gerado em scratchpad, não em BioComp_UFF/

Custo medido: Variola_VARV121_reexec (10 árvores) 0,35s/0,15MB; Zika Large_480seq (9 árvores) 3,21s/0,72MB — sem teto compilado (regra 8)
```

**Write-lock:** `Backend/src/suporte_de_ramo.py` (novo), `Backend/src/app.py` (+45 linhas), `Backend/tests/{unit/test_suporte_de_ramo.py,api/test_branch_support.py,oracle/test_oraculo_suporte_dendropy.py,data/suporte/}` (novos). Não toca `BioComp_UFF/` nem `Frontend/`. **Reversível:** sim.

### DEC-071 · 2026-09-03 · Sessão bate no limite de agentes em paralelo — revisor/validador de D23/M3.4 falharam, retomada às 12:20

**O que aconteceu.** Duas rodadas de revisão despachadas em paralelo (Revisor + Validador sobre `e863f33` D23 e `aa1713b` M3.4) falharam com `rate_limit`/HTTP 429: *"You've hit your session limit · resets 12:20pm (America/Sao_Paulo)"*. Nenhuma delas chegou a veredito — o Validador só confirmou, antes de cair, que `make main-result` absorve o código 2 de propósito (`Makefile:58-61`, comentado) e que o código de saída literal do script precisa ser conferido cru, não pelo `make`.

**Consequência prática.** Até 12:20, novos agentes (`Agent`, incluindo forks) tendem a falhar pelo mesmo motivo — é limite de sessão, não condição transitória por chamada. Esta sessão passa a revisar/validar diretamente (sem subagente) o que já foi implementado, e retoma o despacho paralelo de agentes depois do horário de reset.

**Não é achado de código** — não entra na fila de triagem de defeitos, é um limite operacional desta sessão.

### DEC-072 · 2026-09-03 · D18 (metade `BioComp_UFF/`) fecha — `basic` é o nome novo, `auto` continua aceito, manifesto para de esconder o que foi pulado

**Gatilho:** pedido do usuário — renomear o modo `auto` com honestidade e fechar D18. Implementado diretamente nesta sessão (sem subagente — ver DEC-071, limite de sessão em vigor).

#### As três opções do defeito, todas atendidas

`docs/science/02-defeitos-que-alteram-resultado.md#d18` listava três correções, com a nota "a opção 3 é obrigatória de qualquer forma". As três entraram, nenhuma sozinha:

1. **Renomear com honestidade.** `mode: "basic"` é o nome novo — `MODOS_BASICOS = ("auto", "basic")` em `treeBuilderController.py`, os dois tratados de forma idêntica em todo ponto de dispatch. `"auto"` **continua aceito**, como alias: os projetos já em disco com `mode: "auto"` em `config_backup.json` (dezenas) não podem quebrar, e nenhum deles precisa ser tocado.
2. **Aviso explícito.** Novo `logging.warning` (e `print`) disparado sempre que o modo é básico: *"Modo básico: métodos avançados (IQ-TREE, FastTree, RAxML-NG, MrBayes) NÃO serão executados nesta execução. Use mode='advanced' para incluí-los."* A descrição no início da execução também deixou de ser `"DISTANCE TREE CONSTRUCTOR e PARSIMONY"` (neutra) e passou a nomear o que não roda.
3. **Manifesto grava o executado contra o disponível** (a obrigatória). `ExecutionManifest.register_execution_mode` (novo, `manifest.py`) — campo `execution_mode` no `to_dict()`: `mode_solicitado`, `metodos_avancados_disponiveis` (via `external_tools.resolve_tool`, não suposição), `metodos_avancados_executados`, `metodos_avancados_pulados`. Calculado e registrado em `workflow.py`, antes de qualquer controlador rodar — não depende do resultado da execução. Ausente (execução antiga, sem esse registro) é `None`, nunca `{}` — regra 5: lista vazia pareceria "básico, zero métodos disponíveis" em vez de "não registrado".

#### O que "Completed successfully!" continua sendo

Esse texto (emitido por `subtreeBuilderController.py`, ao fim da mineração de subárvores, não do `treeBuilderController`) não foi alterado — ele marca o fim do *pipeline*, não do *modo de árvore*. A opção 2 (aviso explícito) e a opção 3 (manifesto) juntas já respondem à pergunta "quantos métodos rodaram de fato" sem precisar mexer nessa mensagem, que é sobre outra etapa.

#### Evidência de execução — ponta a ponta, não só sintaxe

```
python workflow.py -p <config com mode: "basic">
  → "Iniciando construção das árvores utilizando o método: BÁSICO (...)"
  → "AVISO: Modo básico: métodos avançados [...] NÃO serão executados [...]"
  → manifest.json.execution_mode = {
       "mode_solicitado": "basic",
       "metodos_avancados_disponiveis": ["iqtree","fasttree","raxml","mrbayes"],
       "metodos_avancados_executados": [],
       "metodos_avancados_pulados": ["fasttree","iqtree","mrbayes","raxml"]
     }

python workflow.py -p <mesmo config, mode: "auto">
  → mesma descrição BÁSICO, mesmo aviso, manifest.execution_mode.mode_solicitado == "auto"
  → confirma que o alias legado produz o comportamento idêntico ao nome novo

cd BioComp_UFF && python -m unittest workflow.tests.test_manifest workflow.tests.test_stability \
  workflow.tests.test_subtree_mining workflow.tests.test_tree_identity workflow.tests.test_rf_bipartition \
  workflow.tests.test_rooting workflow.tests.test_taxonomy workflow.tests.test_aligners \
  workflow.tests.test_external_tools workflow.tests.test_raxml_bootstrap workflow.tests.test_deduplicacao
  → 180 tests, OK (era 177; +3 de execution_mode)
```

**Não testado por unidade, só pela execução real acima:** não existe suíte de testes para `treeBuilderController.py` (nenhum `test_tree_builder_controller.py` no repositório) — a classe cria diretórios e roda construção real no `__init__`/`__call__`, o que tornaria um teste de unidade caro sem refatorar a classe primeiro, fora do escopo deste lote. A evidência do dispatch e do aviso é a execução ponta a ponta acima, repetida com `"basic"` e `"auto"`. Registrado como lacuna, não escondido.

#### Δ em métrica publicada: nenhum

Nenhuma árvore, distância, clado ou padrão FPMax é afetado. Mudança é de nomenclatura, mensagem e provenência no manifesto — o comportamento de quais métodos rodam para um `mode` dado é idêntico a antes.

**Write-lock:** `BioComp_UFF/workflow/controller/treeBuilderController.py`, `BioComp_UFF/workflow/utils/manifest.py`, `BioComp_UFF/workflow.py`, `BioComp_UFF/workflow/tests/test_manifest.py`. Não toca `Backend/` nem `Frontend/` — essa é a segunda metade, lote seguinte. **Reversível:** sim.

## Medições

### Baseline P-0 — **coletado em 2026-08-19**
Comando: `cd Backend && python scripts/perf_baseline.py` (em repouso) e `--servidor http://127.0.0.1:8011` (sob carga).

**Ambiente:** Linux 6.8.0-136, Python 3.10.19, 12 CPUs lógicas / 6 físicas, 31,1 GB RAM, MAFFT 7.490, IQ-TREE 2.2.2.6.
**Entrada:** projeto `Variola_Yu_li_2007_noITRs_6seqs` (VARV-6, 6 táxons). 5 repetições, mediana [min-max] ±desvio.

| Métrica | Mediana | Faixa | Desvio |
|---|---:|---|---:|
| `/api/system/health` | 1,3 ms | [1,3-2,7] | ±0,6 |
| `/projects` em repouso | 58,6 ms | [57,9-64,5] | ±2,8 |
| `/api/tree/{p}/insights` | 0,5 ms | [0,5-5,7] | ±2,3 |
| `/api/tree/pattern-analysis/{p}` | 375,4 ms | [331,0-379,4] | ±20,5 |
| **`/projects` sob carga** (servidor real) | **383,2 ms** | — | n=1 |

**O número que decide P-1: degradação de 6,4×.**

A medida foi feita com uvicorn de verdade — o transporte ASGI em processo atende em sequência e **mascara** o bloqueio. Durante os 383 ms de `pattern-analysis`, **uma única** requisição trivial completou, e ela absorveu a duração inteira do trabalho pesado. É a prova direta de que a bioinformática roda no event loop sem ceder (`B-4`, `B-5`, `P-1`).

**Extrapolação declarada como estimativa, não medição:** VARV-6 tem `metadata.json` de 28,6 MB; o de VARV-49 tem **860 MB**. Se o custo escala com o arquivo, `pattern-analysis` em VARV-49 congela a API inteira por minutos. **Não medido** — a execução pesada é da máquina do usuário.

| Métrica | Ambiente | Antes | Depois | Marco |
|---|---|---|---|---|
| `/projects` sob carga | ver acima | 383,2 ms (6,4×) | — | M4 |
| `/projects` em repouso | ver acima | 58,6 ms | — | M4 |


## Pareceres científicos

Toda mudança na zona sagrada ([04-rigor-cientifico §1](04-rigor-cientifico.md)) deixa um parecer aqui — **inclusive quando Δ = 0**.

| Item | Data | Δ em métrica publicada? | Parecer | Decisão do usuário |
|---|---|---|---|---|
| Revisão dos experimentos de *Variola* (D1–D12) | 2026-08-19 | **Sim, em todos os números reportados** | [`science/01-revisao-variola.md`](../science/01-revisao-variola.md) e [`science/02-defeitos-que-alteram-resultado.md`](../science/02-defeitos-que-alteram-resultado.md). Nenhum código foi alterado: é parecer sobre artefatos já em disco. Quatro defeitos bloqueantes/altos (braço `clustalo` espúrio, denominador do suporte 2×, RF enraizada sobre árvores não enraizadas, `support` do FPMax = limiar da varredura) invalidam os números atuais. Corrigidos, o resultado principal sobrevive e é replicado em 3 conjuntos. | **Pendente** — ver as 5 decisões em [`science/04-agenda-de-pesquisa.md`](../science/04-agenda-de-pesquisa.md#decisões-que-são-do-usuário-não-de-um-agente) |
| M1.7 — D12 (a-d) + D16, país/região e data de coleta | 2026-08-21 | **Sim** — `/insights` de *Variola*: país e ano deixam de existir; cobertura de região vai a 100% onde há dado | [DEC-018](#dec-018--2026-08-21--m17-fechado-d12-a-d--d16--a-geografia-de-variola-é-ausente-não-desconhecida). Nenhum número **real** foi alterado: os países e anos que sumiram do painel eram produzidos por regex sobre `strain`, não vinham do GenBank (5 de 6 registros de VARV-6 não têm `geo_loc_name` nem `country`). A cobertura de região sobe de 0%/40%/66,8% para 100% em VARV-49/ZIKV-21/ZIKV-480. Painéis geográficos e linha do tempo de *Variola* já publicados são artefato e não podem ser reafirmados. | **Aprovada** — "aprovado, pode seguir" (decisão 5) |
| M1.8 — D13 (metade backend), rótulos truncados em 10 caracteres | 2026-08-24 | **Sim** — `/insights` de VARV-6 e 24 dos 45 pares de comparação de árvores | [DEC-019](#dec-019--2026-08-24--m18--d13-metade-backend-o-metadado-de-nc_001611-sempre-esteve-no-arquivo). Nenhum número foi recalculado: o metadado estava no `metadata.json` o tempo todo, sob o rótulo íntegro, e era descartado por se ler apenas a primeira das 10 árvores. Os dois grupos externos do baseline de Li *et al.* (2007) deixam de aparecer como `Unknown` e passam a aparecer como *Taterapox virus* e *Nile crocodilepox virus*. RF do par de controle inalterada (Δ = 0); oráculo dendropy independente confere os 3 pares truncados. **Não reabre DEC-018**: os 4 genomas de *Variola* seguem sem `geo_loc_name` e sem `collection_date`. | **Coberta** pela decisão 5 já aprovada — nenhum número publicado é reafirmado, e sim retirado da condição de desconhecido |
| M1.1 — D4, `support` do FPMax era o limiar da varredura | 2026-08-24 | **Sim** — toda linha de `all_results_fpmax.csv`, as duas tabelas da Deep Analysis, `pattern_statistics.avg_support` e `support_distribution` | [DEC-021](#dec-021--2026-08-24--m11--d4-o-support-do-fpmax-deixa-de-ser-o-limiar-da-varredura). Confronto contra `audit_variola.py --secao 5`: **Δ = 0 em 37 de 37 itemsets** nos quatro experimentos de *Variola*. A contradição de exibir o mesmo padrão como frágil e como robusto cai a zero em todos. **Os CSVs em disco não mudam** — só reexecutando o experimento. | **Coberta** pela decisão 5 ("corrigir e re-rodar"); a reexecução é o passo que materializa o número novo |
| M1.2 — D5, identidade de clado de 16 bits e dependente da ordem | 2026-08-24 | **Sim** — todo item do FPMax e todo padrão da Deep Analysis | [DEC-022](#dec-022--2026-08-24--m12--d5-o-pipeline-passa-a-usar-a-identidade-canônica-de-clado). Itens distintos caem de 155/194/405/20 para 101/120/270/11, batendo com a contagem de clados canônicos do oráculo (+1, o clado universal, que o builder inclui). O padrão de maior suporte de VARV-49 vai de **1 clado a 6/8** para **16 clados a 8/8** — `02-defeitos` previa 15 a 8/8. | **Coberta** pela decisão 5; materializa na reexecução |
| M1.3 — D3, RF sobre clados enraizados | 2026-08-24 | **Sim** — `rf_matrix`, `factor_effects`, `support_profile`, `universal_clades` e todo padrão maximal | [DEC-023](#dec-023--2026-08-24--m13--d3-a-unidade-de-comparação-passa-a-ser-a-bipartição-e-m1-fecha). Confronto contra dendropy: **137 pares, 0 divergências**. VARV-6 sai de 0 para 1 clado universal e a discordância entre três métodos de topologia idêntica cai de 75% para 0%. A distância **sobe** em pares genuinamente diferentes (fasttree × nj, +2,2%), o que descarta a hipótese de redutor cego. | **Coberta** pela decisão 5; a análise enraizada legítima é M2.3 |
| M2.5 — DEC-046, instrumentação do manifesto | 2026-08-26 | **Não pelo lote; sim pelo que ele revelou** | [DEC-046](#dec-046--2026-08-26--tools_invoked-deixa-de-sair-vazio--o-manifesto-passa-a-registrar-o-que-rodou). A mudança é de registro, não de cálculo: **12 dos 14 pipelines saem idênticos** à execução anterior e o oráculo dendropy devolve **91 pares, 0 divergências**. Os 2 divergentes são os de IQ-TREE e a causa é [D21](../science/02-defeitos-que-alteram-resultado.md#d21), anterior a este lote: com `-nt 4` a ferramenta devolve **3 topologias em 3 repetições** da mesma semente. Por arrasto, itemsets do FPMax, clados canônicos e bipartições universais **variam entre execuções idênticas** (38/47/6 contra 34/43/7). Corrige a atribuição de causa de [DEC-045](#dec-045--2026-08-25--pré-voo-40-na-máquina-de-validação--o-que-muda-entre-máquinas-é-a-versão-e-só-ela) para o braço do IQ-TREE. | **Pendente** — D21 oferece três saídas (`-nt 1`, declarar não reprodutível, ou repetições com consenso) e **bloqueia §4.1** até ser decidida |
| C-5e — `parse_cql_blocks` corta em `;` dentro de dado | 2026-09-01 | **Não** — parser de ingestão do grafo Neo4j de visualização, não recalcula distância/clado/FPMax | [DEC-052](#dec-052--2026-09-01--pente-fino-nos-cql-dos-projetos-zika--c-5e-fechado-4-artefatos-legados-reparados). Sem oráculo de domínio aplicável (é sintaxe de texto); cross-check contra a segunda implementação independente (`CQLExecutor.jsx`) e contra a contagem de `;` de fechamento no texto bruto — os três concordam após o reparo. Δ medido: −30/−58/−38 blocos fantasma em `Medium_11seq`/`Advanced_21seq`/`Large_21seq` (eram instruções fundidas ou fatiadas por `;` embutido em descrição do GenBank). 4 artefatos legados com aspa simples não escapada também reparados (dado, não código) | Não se aplica — nenhum número publicado envolvido; fila de triagem original (`docs/audit/06-eixo-bugs.md`) marcada resolvida |
| D25 — `mafft_iterative` colidia com `mafft` em `stability.py`, M1.3 crashava | 2026-09-01 | **Não pelo lote; sim pelo que ele desbloqueou** | [DEC-057](#dec-057--2026-09-01--d25--mafft_iterative-colidia-com-mafft-em-stabilitypy-e-m13-crashava-nas-três-reexecuções). Oráculo dendropy: **0 divergências em 91+91+45 pares** (Zika-21, VARV-6, VARV-49) — a checagem M1.3, antes bloqueada por `ValueError`, passa a existir e bate com o oráculo independente nas três reexecuções da máquina de validação. Não há valor aceito sendo substituído: a medição nunca havia completado sob essas condições | **Aprovada** — coberta pelo pedido explícito "abra o lote e corrija o Achado 1" |
| E4 — leitura exploratória do fator alinhador em `Variola_VARV49_reexec_20260901` (NJ inverte o padrão de ZIKV-478) | 2026-09-01 | **Não** — nenhum número de E4 saiu em artigo ainda; é a primeira leitura, e nenhuma linha de código mudou nesta revisão | [`science/04-agenda-de-pesquisa.md#e4`](../science/04-agenda-de-pesquisa.md#e4--◐--o-fator-alinhador-medido-onde-ele-existe). Os 5 pares mafft×mafft_iterative do `rf_matrix.csv` conferem exatamente (**Δ = 0**) contra dois oráculos independentes (dendropy 4.6.1 e ete3 3.1.3, `taxon_namespace` compartilhado, `force-unrooted`, denominador 2(n−3)=92) — a inversão de padrão (NJ o mais sensível à troca de alinhador aqui, o mais imune em Zika) não é bug de cálculo. Hipótese de politomia/baixo poder do NJ **refutada**: as 10 árvores (5 métodos × 2 alinhadores) são todas estritamente binárias, 46/46 bipartições. O que distingue os métodos: dos ramos internos curtos (≤1e-4), os de caráter (FastTree/IQ-TREE/RAxML) trocam só 1–2 de ~25 entre alinhadores; o NJ troca 7 de 7 (100%); o UPGMA (mesma distância de entrada que o NJ) troca só 1 de ~5, no mesmo patamar dos métodos de caráter. Mecanismo mais provável, não provado: `builder.py:107-115` usa `DistanceCalculator('identity')` sem correção de modelo como entrada única de NJ/UPGMA; com alinhamento de ~236 mil colunas e um deslocamento de 429 colunas entre as duas estratégias do MAFFT, o critério de agrupamento do NJ (matriz-Q) amplifica essa diferença pequena onde UPGMA e os métodos de caráter não amplificam. | **Pendente** — segue ◐; falta VARV-121 como segunda réplica antes de tratar como resultado. Nenhuma correção de código é proposta (nenhum defeito de cálculo encontrado); recomendação de teste de robustez adicional (rodar NJ/UPGMA com modelo de distância corrigido) registrada no documento, não executada |
| D26 — `tree_config` não alcança o `TreeBuilder`; manifesto declara semente/threads pedidos, não executados | 2026-09-01 | **Não na topologia** — `--workers 1`/`-nt 1` (D17/D21) já fixam o que decide a árvore; o `N` de threads e a semente nunca divergiram na prática (todo experimento até hoje pediu o valor-padrão) | [DEC-060](#dec-060--2026-09-01--m71-fecha-ficha-de-chamada-por-método-achado-d26-e-e4-ganha-validação-de-oráculo). Confirmado lendo `treeBuilderController.py:803-849` (nenhuma das 4 chamadas avançadas repassa `tree_config`) e o `manifest.json` real de VARV-49 (`reproducibility` declara `raxml_threads:8, iqtree_threads:16`; a chamada usou os defaults 4/4). Achado de auditoria de código (M7.1), não de execução — nenhuma árvore recalculada | Não se aplica — nenhum número publicado envolvido; correção fica para lote futuro de M7 (fora do escopo de M7.1, que é só a ficha) |
| E4 — VARV-121 como segunda réplica: NJ replica como mais sensível, UPGMA não replica exatamente | 2026-09-02 | **Não** — leitura exploratória de E4, nenhuma linha de código mudou | [DEC-062](#dec-062--2026-09-02--varv-121-reexecutado-e-validado-e4-ganha-a-segunda-réplica). Oráculo dendropy confere os 5 pares mafft×mafft_iterative de VARV-121 (Δ=0 contra `rf_matrix.csv`; 118=n−3 bipartições não triviais em ambos os alinhadores, sem polítoma). NJ é o método mais sensível à troca de alinhador nos dois conjuntos de *Variola* (0,1522 e 0,1949) — confirma a recomendação (i) do parecer de DEC-060. UPGMA não replica: no patamar dos métodos de caráter em VARV-49 (0,0217), sobe para perto do NJ em VARV-121 (0,1864) | **Pendente** — critério de sucesso de E4 ("replicar em ao menos 2 conjuntos") parcialmente satisfeito dentro de *Variola*; falta generalização entre espécies/regimes de contraste de alinhador e o rastreio mecanístico da matriz-Q (recomendação ii de DEC-060, não executada) |
| M2.6/M2.7 — `expected.json` regenerado a partir da reexecução limpa, portão fecha em código 0 | 2026-09-02 | **Não** — o alvo (`mafft`+`mafft_iterative`) já estava correto desde DEC-050, só não regravado; nenhum número do artigo cita este fixture ainda | [DEC-063](#dec-063--2026-09-02--m2-fecha--expectedjson-regenerado-a-partir-da-reexecução-limpa-portão-em-código-0). `source_project` passa de `Variola_Yu_li_2007` (pré-M1) para `Variola_VARV49_reexec_20260901` (D25 corrigido, oráculo-validado em DEC-062). `target_M_size` 5→10; `present_pipelines` 8→10, sem os 4 `clustalo_*` contaminados que sobreviviam por o gerador nunca limpar `trees/` antes de copiar (corrigido). `make reference-check`: código 2 ("4 de 5, falta mafft_raxml") → **código 0**, 10 de 10 pipelines, 3 de 3 invariantes | **Aprovada** — coberta pelo pedido explícito de fechar M2 |

## Handoffs e relatórios

Formato em [protocolo §4](02-protocolo-de-orquestracao.md). Manter os últimos ~10; arquivar os antigos ao fim de cada onda em `07-log-arquivo-Wn.md`.

*(nenhum handoff registrado ainda)*

## Riscos materializados

| Data | O que aconteceu | Como foi detectado | Ação | Controle que falhou |
|---|---|---|---|---|
| *(vazio)* | | | | |

## Achados fora de escopo (fila de triagem)

Achados que agentes encontraram e **não** corrigiram, conforme a regra de escopo. O orquestrador tria: vira item de onda, entra na auditoria, ou é descartado com justificativa.

| Data | Achado | `arquivo:linha` | Quem achou | Destino |
|---|---|---|---|---|
| 2026-07 | `rerun_workflow` e `can_rerun_project` ainda usam `startswith` fraco em vez de `resolve_within`; `rerun_workflow` executa subprocess → prioridade alta | `Backend/src/app.py:~367,412` | P1 batch 1 | **W1** |
| 2026-07 | `os.path.commonpath` pode levantar `ValueError` em caminhos cross-drive no Windows | `Backend/src/app.py` (`resolve_within`) | P1 batch 1 | Baixa prioridade (deploy alvo é Linux) |
| 2026-07-29 | Repositório sem `CLAUDE.md`, sem `.github/`, sem qualquer teste | raiz | criação deste sistema | ✅ **fechado** — testes e CI em M0; `CLAUDE.md` em 2026-08-24 ([DEC-026](#dec-026--2026-08-24--biblioteca-de-contexto-para-a-máquina-de-validação--claudemd-e-handoff)) |
| 2026-08-19 | **D1** — `_isExecutableByClustalO` troca para MAFFT acima de 20 kb e grava em `dataset_final_clustalo.aln`; nos 4 experimentos de Variola metade dos "pipelines" são cópias byte a byte | `BioComp_UFF/workflow/controller/treeBuilderController.py:868,898` | revisão científica | **Bloqueante** — decisão do usuário |
| 2026-08-19 | **D3** — RF calculada sobre clados enraizados misturando árvores enraizadas (UPGMA) e não enraizadas; superestima discordância em até 100% | `BioComp_UFF/workflow/stability/stability.py:300,461` | revisão científica | **Alta** |
| 2026-08-19 | **D4** — `result_fpmax['support'] = support` sobrescreve o suporte real com o limiar da varredura; mesmo padrão exibido como frágil e robusto | `BioComp_UFF/workflow/subtree_mining/miner.py:147` | revisão científica | **Alta** |
| 2026-08-19 | **D5** — identidade de clado de 16 bits e dependente da ordem fragmenta 36–55% dos clados; `clade_identity.py` já tem a correta e não é usada em produção | `BioComp_UFF/workflow/utils/treeUtils.py:275,392` | revisão científica | **Alta** |
| 2026-08-19 | **D7/D8/D9** — `max_pattern_size=100` descarta 8 de 20 padrões em silêncio; `tree_coverage` perde 50–62% das árvores por colisão de `dict.update`; `unique_signatures_count` é sempre 0 | `Backend/src/app.py:1560,1581,1655` | revisão científica | **Alta** |
| 2026-08-19 | **D10** — UFBoot calculado pelo IQ-TREE (`.contree`) é descartado ao gravar o Nexus; é o insumo do resultado principal do artigo | `out/tmp/iqtree_*/*.contree` vs `out/Trees/*.nexus` | revisão científica | **Alta — maior valor por custo** |
| 2026-08-19 | **D12** — ano derivado do nome da cepa (`0408151v` → ano 408, visível em `/insights`); país por regex sobre `strain`; fallback de `organism` inalcançável | `Backend/src/app.py:627,635,648` | revisão científica | **Média** (`C-5b`, `C-5d`) |
| 2026-08-19 | **G1/G2** — grafo Neo4j: `Metadata` duplicado 321× por acesso (3,8 M nós para 477 registros); metade dos nós `Subtree` chamam-se `"metadata"` e são lixo do parser; zero constraints e zero índices de propriedade | instância `localhost:7474` | revisão científica | **Alta** (`P-3`) |
| 2026-08-19 | O Neo4j em produção contém **apenas Zika**; a Deep Analysis de Variola lê CSV/JSON do disco, não o grafo | `Backend/src/app.py:1566` | revisão científica | Documentado em [`science/05-grafo-neo4j.md`](../science/05-grafo-neo4j.md) |
| 2026-08-19 | Proveniência quebrada: `project_name` nos `config_backup.json` não corresponde ao diretório; caminhos apontam para outra máquina; 3 pares de projetos são duplicatas renomeadas; `test_variola_noITRs_57_Complete` (52 táxons) nunca foi analisado | `BioComp_UFF/projects/**` | revisão científica | **Alta** |
| 2026-08-19 | **Divergência de versão do FastTree**: logs de VARV registram 2.2.0, a máquina tem 2.1.11 → reexecutar não reproduz as árvores em disco | `PATH` vs `out/tmp/*/​*.log` | replanejamento | **Bloqueia M2** — pinar 2.2.0 ou redeclarar o experimento |
| 2026-08-19 | MUSCLE instalado é **3.8.1551**, não MUSCLE5 — reforça a recomendação de contrastar duas estratégias do MAFFT em [E4](../science/04-agenda-de-pesquisa.md) | `PATH` | replanejamento | Insumo da decisão 1 |
| 2026-08-19 | **Conflito de protocolo**: D3/D4/D5/D10 exigem editar `BioComp_UFF/**`, que o protocolo congela → metade das correções científicas inexecutável | `02-protocolo §3` | replanejamento | **DEC-011 — decisão do usuário** |
| 2026-08-19 | `.claude/agents/` e `.claude/skills/` **não existem**: os 13 contratos e as 6 skills de `docs/` nunca foram instalados no harness | `.claude/` | replanejamento | ✅ instalados em M0.1 e **versionados** em 2026-08-25, para que as duas máquinas sigam o mesmo processo |
| 2026-08-25 | O worktree órfão `.claude/worktrees/phylotreeminer-audit-ef6b53/` (5,2 MB) tinha `.git` apontando para `C:/Users/JKP/...`, caminho **Windows de outra máquina** — inalcançável, e nenhum arquivo exclusivo | `.claude/worktrees/` | limpeza de migração | ✅ **removido**; a regra no `.gitignore` fica como guarda contra novos órfãos |
| 2026-08-19 | Semente do IQ-TREE gerada pela ferramenta (`97376`), não fixada pelo pipeline → reexecução não reproduz a árvore mesmo com versão idêntica | pipeline | replanejamento | **M2.5** (manifesto) |
| 2026-08-19 | **D13** — `TaxLabels` truncados em 10 caracteres (limite PHYLIP) nos Nexus de IQ-TREE e RAxML; **24 de 45 pares de árvores não comparam** em VARV-6 e 11 terminais ficam sem metadado, incluindo `NC_001611` (referência de VARV) | `out/Trees/*_iqtree.nexus`, `*_raxml.nexus` | harness M0 | **Alta** — correção no backend não depende da decisão 6 |
| 2026-08-21 | **D13 — evidência de perda de metadado real.** O `metadata.json` guarda cada `NC_*` sob dois rótulos: truncado (`NC_008030.`, 10 ocorrências, **0 features**) e íntegro (`NC_008030.1`, 14 ocorrências, 347 features). `iter_metadata_nodes` deduplica por `newick` e o truncado vazio vence, descartando `geo_loc_name: Zimbabwe`, `collection_date: 2001` e `host: Nile crocodile`. É a causa de `hostData` ser `Unknown` para todos os 6 táxons de VARV-6 | `Backend/src/app.py` (`iter_metadata_nodes`, `get_metadata_node`) | M1.7 / DEC-018 | ✅ **corrigido em M1.8** ([DEC-019](#dec-019--2026-08-24--m18--d13-metade-backend-o-metadado-de-nc_001611-sempre-esteve-no-arquivo)) — a causa era `only_first`, não a deduplicação por `newick` |
| 2026-08-19 | **D14** — saída da API não é reprodutível: 3 sementes de hash → 3 payloads diferentes para a mesma entrada | `app.py` (iteração sobre `set`) | harness M0 | **Alta** — contradiz o checklist de artefato |
| 2026-08-19 | **D15** — `GET /api/tree/metadata/{p}` devolve `/home/hilai360/...`: caminho e nome de usuário de terceiro expostos ao cliente | `metadata.json` gravado pelo pipeline | varredura A8 | **Média** — `xfail(strict=True)` rastreando |
| 2026-08-19 | **D16** — `REGION_MAPPING` tem 14 países do estudo de Zika; **97% dos táxons de VARV-49 caem em `Unknown`**. Compõe-se com D12 e um sem o outro não melhora nada | `treePlot.py:4` | harness M0 | **Alta** — D12+D16 são um lote só |
| 2026-08-19 | `ignore_mode` difere entre experimentos (VARV-49 e VARV-121 excluem RAxML; VARV-6 não) e nunca foi reportado — "número de pipelines" não é comparável entre eles | `config_backup.json` | M0.8 | **Alta** — entra em *Methods* |
| 2026-08-19 | Campo `/strain=` do GenBank contém aparentes **nomes de pacientes** de surtos de 1966-75 (`Bangladesh 1974 (nur islam)`) | dados do baseline | M0.7 | Menção obrigatória na declaração de ética (M6); não bloqueia |
| 2026-08-19 | Grafo: **zero constraints e zero índices de propriedade** em 3,8 M nós; `Metadata` duplicado 153 mil vezes; label `Support` guarda o limiar do FPMax, não suporte de ramo | instância Neo4j | M0.9 | **Alta** (`P-3`) — T5, fora do caminho crítico |
| 2026-08-19 | Frontend: `uuid` era **dependência fantasma** (importada, ausente do `package.json`); `import { width } from "@mui/system"` era import morto | `UserContext.jsx`, `projectsTableView.jsx` | M0 | ✅ **corrigido** — teste de fantasma em `dependencias.test.js` |
| 2026-08-19 | 13 arquivos do frontend fixam `http://localhost:8000`; **zero** uso de `import.meta.env` | `Frontend/**/src` | M0 | **M5/T4** — rastreado por `it.fails` |
| 2026-08-24 | `iter_metadata_nodes` faz a leitura inteira do `metadata.json` quando algum táxon nunca tem metadado no arquivo (~11 s em VARV-49, 821 MB), dentro de `cache_lock` e no event loop. Não ocorre em nenhum dos 11 projetos varridos | `Backend/src/app.py` (`iter_metadata_nodes`, `get_metadata_cache`) | M1.8 / DEC-019 | **P-1** — é o lote que tira essa leitura do event loop |
| 2026-08-24 | `02-defeitos §D13` afirmava que a string da árvore preservava o rótulo íntegro; nos arquivos em disco ela também vem truncada. A afirmação orientava uma correção que teria inflado o namespace de 6 para 9 táxons | `docs/science/02-defeitos-que-alteram-resultado.md` | M1.8 / DEC-019 | ✅ **documento corrigido** neste lote |
| 2026-08-24 | Os `all_results_fpmax.csv` **em disco** seguem com o limiar na coluna `support` (D4 corrigido só no pipeline). `/api/tree/pattern-analysis` sobre projeto antigo continua exibindo número errado, sem avisar. Sugestão: o backend detectar a ausência da coluna `min_support_threshold` e declarar no payload que o CSV é pré-M1.1 | `Backend/src/app.py` (`analyze_patterns`) | M1.1 / DEC-021 | **Alta** — fora do write-lock deste lote; lote curto de T2 |
| 2026-08-24 | O `git status` do submódulo já vinha sujo antes de DEC-020 (`workflow/stability/` e `docs/` **não rastreados**, READMEs modificados). Commitar ali exige separar o que é deste trabalho do que já estava | `BioComp_UFF/` | DEC-020 | Considerar antes do primeiro commit no submódulo |
| 2026-08-24 | `report.py` e `audit_variola.py` foram ajustados para RF `None`; qualquer outro consumidor de `rf_matrix`/`factor_effects` fora do repositório vai receber `None` onde antes recebia `0.0` | `BioComp_UFF/workflow/stability/` | M1.3 / DEC-023 | Mudança de contrato declarada; nenhum consumidor conhecido fora dos dois ajustados |
| 2026-08-24 | **D17** — `--threads auto` do RAxML-NG: `SIGSEGV` na máquina de origem e, mesmo onde roda, **RF = 8 entre duas execuções com a mesma semente** variando só o esquema de paralelização. Torna inatingível o item "figura reproduzível por script + commit + hash" | chamada do RAxML-NG no pipeline | DEC-025 | **M2.5** — fixar `--threads N --workers 1` e registrar no manifesto |
| 2026-08-24 | ~~Divergência de versão do **RAxML-NG** entre máquinas: 1.2.2 na de origem, 1.1.0 nesta. Soma-se à do FastTree (2.2.0 × 2.1.11)~~ **RETRATADO em DEC-043**: o env do projeto sempre teve 1.2.2 e 2.2.0 — o PATH resolvia os binários do sistema. Não havia divergência, havia sombreamento | `PATH` vs `*.raxml.log` | DEC-025 → **DEC-043** | ✅ **não bloqueia nada** — as versões coincidem |
| 2026-08-24 | A exclusão de `raxml` do `ignore_mode` em VARV-49/52/121 pode ser **revertida**: o RAxML conclui nesses dados em ~4 min. Devolve `M` de 4 para 5 e elimina a incomparabilidade de `M` entre experimentos (DM-11) | `config_backup.json` | DEC-025 | **M2** — depende de reexecutar |
| 2026-08-24 | Os experimentos **já executados** não têm e não terão manifesto: versões e sementes daquelas execuções nunca foram registradas. Só a reexecução fecha esse buraco | `BioComp_UFF/projects/**` | M2.5 / DEC-027 | Reexecução, na máquina de validação |
| 2026-08-25 | **D18** — o modo `auto` não executa métodos avançados e encerra com `Completed successfully!`. `M` muda sem que nada além do `config_backup.json` registre | `treeBuilderController._process_auto_mode` | DEC-028 | **Aberto** — mínimo obrigatório: gravar no manifesto os métodos executados contra os disponíveis |
| 2026-08-25 | Parcimônia custa **116-169 s por árvore** contra 4-7 s dos métodos de ML no conjunto de validação (20 táxons, 10,8 kb). Domina 9 dos 11 min da execução | `ParsimonyTreeConstructor` do Biopython | DEC-030 | Insumo de [E7](../science/04-agenda-de-pesquisa.md); medir em escala na máquina de validação |
| 2026-08-25 | `inputs_sha256` do manifesto grava `../../data/...` quando a entrada fica fora do diretório do projeto. É relativo e sem nome de usuário, mas atravessa a raiz | `manifest.ExecutionManifest._relativo` | DEC-030 | Baixa — considerar ancorar na raiz do repositório em vez do projeto |
| 2026-08-25 | **D20** — MrBayes está instalado (`mb`, 3.2.7) e era dado como ausente; integração sem semente, sem verificação de convergência, com `tmp_dir` relativo dependente do nome do repositório | `builder.mrbayes_constructor` | DEC-032 | **M7.4** — detecção já corrigida; o resto é o marco |
| 2026-08-25 | Os dois braços de **UPGMA** não recuperam o grupo externo como clado em VARV-49 **nem** em VARV-6 — evidência empírica de que seus pressupostos são violados nestes dados | `rooting.root_tree_set` | DEC-034 | Entra no *Methods* como sensibilidade declarada (DM-6) |
| 2026-08-25 | Em VARV-6 o "grupo externo" mistura *Taterapox* (gênero irmão) com *Nile crocodilepox* (fora de Orthopoxvirus): a recusa de enraizamento é o sintoma mensurável de [D6](../science/02-defeitos-que-alteram-resultado.md#d6) | composição do conjunto | DEC-034 | **M2.2** — limpar antes de enraizar |
| 2026-08-25 | VARV-52, VARV-121 e VARV-6 seguem **contaminados** (1, 4 e 1 táxons fora de *Orthopoxvirus*). VARV-49 é o único limpo, 49/49. Recompor é M2.6; os conjuntos ficam por DEC-024, mas precisam ser **declarados** como contaminados onde aparecerem | `raw_data_sequences.gb` | M2.2 / DEC-035 | **M2.6** e *Methods* |
| 2026-08-25 | Três acessos (`DQ437594`, `NC_003391`, `HQ849551`) estão no FASTA de VARV-52/VARV-121 e **não têm registro** no `raw_data_sequences.gb`: clado indecidível. Mantidos e declarados na proveniência | `data/*/dataset_final.fasta` | DEC-038 | Vão de proveniência — decidir explicitamente em M2.6 |
| 2026-08-25 | `start.sh` continha um **prompt colado por acidente** nas linhas 79-93 (texto morto após o `cleanup`) | `start.sh` | DEC-037 | ✅ removido |
| 2026-08-25 | MAFFT é **7× mais rápido que MUSCLE e 13× que Clustal Omega** em 20 seqs × 10,8 kb, com alinhamento do mesmo comprimento. Falta medir onde a diferença passa a decidir viabilidade | `aligners.py` | DEC-037 | **M7.7** — curva de custo na máquina de validação |
| 2026-08-25 | O seletor de alinhador da UI oferecia **`clustalw`**, que o pipeline não implementa — escolhê-lo fazia a execução falhar | `pipelineConfigurator.jsx` | DEC-039 | ✅ corrigido: o seletor lê a biblioteca real |
| 2026-08-25 | Não há política para **método de inferência** que falha: `ignore_mode` mistura "excluído de propósito" com "quebrou e foi excluído depois" | `treeBuilderController` | DEC-040 | **M7.6** |
| 2026-08-25 | **MUSCLE é inviável em sequências de *Variola***: 19,4 GB e OOM em 52 seqs de 228 kb, numa máquina de 31 GB. Com Clustal também fora, **MAFFT é o único alinhador viável no VARV-49** — o fator alinhador não existe nesse conjunto | sonda medida | DEC-041 | Declarado em `expected.json`; o fator alinhador pertence ao Zika-21 |
| 2026-08-25 | Nenhum método de **inferência** tem `ResourceModel`: só os alinhadores têm modelo de custo | `aligners.py` | DEC-041 | **M7.1 / M7.7** |
| 2026-08-25 | O modelo de custo só prevê **memória**; D17 mostrou que núcleos mudam o **resultado** | `ResourceModel` | DEC-041 | **M7.8** (novo) |
| 2026-08-25 | O pacote `iqtree` 3.x do bioconda instala `iqtree`/`iqtree3` e **não** instala `iqtree2`, que o pipeline chamava fixo: instalação correta da receita não conseguia rodar, e o manifesto gravava `null` para ferramenta presente | `builder.py`, `manifest.py` | DEC-043 | ✅ corrigido — `external_tools.resolve_tool` |
| 2026-08-25 | `application_ui.sh` rodava `conda config --add channels defaults` — reescrevendo o **`~/.condarc` global do usuário** e adicionando um canal que conflita com o bioconda e exige aceite de termos. Causa provável da falha de instalação do IQ-TREE em máquina nova | `application_ui.sh` | DEC-043 | ✅ corrigido — canais fixados por ambiente no `environment.yml` |
| 2026-08-25 | A lista de ferramentas do `application_ui.sh` (6 pacotes) **não tinha MUSCLE**, que a biblioteca de alinhadores exige desde DEC-036: duas listas para a mesma coisa, já divergindo | `application_ui.sh` | DEC-043 | ✅ corrigido — lista única no `environment.yml` |
| 2026-08-25 | `check_dependencies.sh --install` rodava `conda install` **sem `-n`** (helper meu, `4214c36`; o instalador do projeto sempre usou `-n`). Medido: o `base` desta máquina está limpo | `scripts/check_dependencies.sh` | DEC-043 | ✅ corrigido; `cleanup_env.sh` diagnostica onde tiver ocorrido |
| 2026-08-25 | O script `test` do frontend era `vitest` puro: só não travava porque o `npm run test -- --run` repassava a flag. Qualquer chamada não interativa sem esse repasse fica pendurada | `Frontend/.../package.json` | DEC-043 | ✅ corrigido — `test` é `vitest run`, watch virou `test:watch` |
| 2026-08-25 | **MUSCLE não está no env do projeto** desta máquina — só em `/usr/bin` (3.8.1551). Toda medição de MUSCLE registrada até aqui usou o binário do sistema, não o da receita | `check_dependencies.sh` | DEC-043 | Instalar no env antes da próxima medição de alinhador |
| 2026-08-25 | A medição que declarou **MUSCLE inviável em *Variola*** (19,4 GB, OOM) foi feita contra o **3.8.1551 do sistema**. O env pinado tem **MUSCLE 5.3**, de interface incompatível (`-align/-output` × `-in/-out`): o veredito **não transfere** e o `ResourceModel` do MUSCLE foi calibrado na ferramenta errada | `aligners.py`, `ResourceModel` | DEC-044 | **M7.7** — refazer a sonda no 5.3 antes de reafirmar |
| 2026-08-25 | `environment.yml` **não pinava versão de nenhuma ferramenta**: duas máquinas com o mesmo commit recebiam RAxML-NG 1.2.2 × 2.0.2 e MUSCLE 3.8 × 5.3. A versão do inferidor é parte do resultado, não do ambiente | `environment.yml`, `requirements.txt` | DEC-044 | ✅ **corrigido** — 7 ferramentas + `pyqt` + 8 deps Python pinadas; `--dry-run` resolve |
| 2026-08-25 | `garantir_pnpm` aprovava um `pnpm` **que não executa**: `command -v` só responde pela existência do arquivo. Sintoma: `start.sh` imprimia `✓ pnpm` com versão em branco, subia tudo, e o frontend morria 15 s depois | `scripts/lib_node.sh` | DEC-044 | ✅ **corrigido** — a checagem executa `pnpm --version` e exige saída não vazia |
| 2026-08-26 | ~~O corte do log por execução separa cauda de execução nova por um **intervalo de 60 s**, e não cobre duas execuções em que a primeira morreu sem concluir~~ **resolvido na origem em DEC-049**: cada execução tem o seu arquivo. A heurística fica só para os logs antigos | `Backend/src/services/execution_state.py` | DEC-048 → DEC-049 | ✅ **fechado** |
| 2026-08-26 | `alignmentSeq.py` passava `filename=config.get('logfile_path', 1)` ao `logging`: o padrão era o **inteiro 1**, tratado como descritor de arquivo, então sem `logfile_path` o log ia para o **stdout** | `workflow/alignment/alignmentSeq.py` | DEC-049 | ✅ corrigido |
| 2026-08-26 | `setupWorkflow.py` mantém um `basicConfig` de módulo, executado na importação. Nunca é importado por ninguém — é script de preparação de ambiente — e por isso não rouba o log de nenhuma execução | `workflow/setupWorkflow.py` | DEC-049 | Baixa — deixado como está |
| 2026-08-26 | **D22 — estado e duração raspados do log.** `idle` é o ramo `else` e a UI o mostra como *Waiting*: um projeto que rodou 8 h 43 min e morreu no meio é indistinguível de um nunca executado. A duração cobre duas execuções mais o intervalo ocioso — **1 960 s reportados contra 396 s reais** | `Backend/src/app.py` (`get_projects`, `get_projects_status`, `get_projects_details`) | DEC-047 | **M4.O**, com gate executável |
| 2026-08-26 | O progresso é **0% em 21 de 21 projetos**: os três regex são caminhos mortos. O `tqdm` escreve em stderr e não é capturado; `Progress: N%` **nunca é emitido** pelo pipeline; e os `STEP:` vão para o arquivo de log, não para o `stdout` que o backend lê | `app.py` (`stream_workflow_output`, `get_projects_details`) | DEC-047 | **M4.O** |
| 2026-08-26 | `stream_workflow_output` rotula **toda** linha de stderr como `ERROR`. Como o `tqdm` escreve em stderr, a barra de progresso de uma execução saudável chega ao usuário como enxurrada de erros | `app.py` | DEC-047 | **M4.O** |
| 2026-08-26 | O log é `log_setup_{ano}_{mês}_{dia}.log` aberto em *append*: **duas execuções do mesmo dia fundem-se num arquivo**, com dois `Completed successfully!` dentro. Enquanto isso valer, nenhuma leitura separa as execuções — é pré-requisito de todo o resto de M4.O | `treeBuilderController`, `messages.py` | DEC-047 | **M4.O, item 1** |
| 2026-08-26 | `progress_percent` em `projectsTableView.jsx` é **código morto**: 6 etapas mapeadas, ~30 comentadas, nunca referenciado. Um log real de `mode: advanced` tem **14 `STEP:` distintos**, e nenhum método avançado está entre os 6 | `Frontend/.../projectsTableView.jsx` | DEC-047 | **M4.O, item 7** |
| 2026-08-26 | **Zero testes** para `/projects/status`, `/projects/details` e o campo `duration` de `/projects` — os três endpoints que a UI usa para dizer o que está acontecendo | `Backend/tests/` | DEC-047 | **M4.O, item 8** |
| 2026-08-27 | **D24** — `calculate_quartet_distance` devolvia `-1` para árvore não binária, e o `-1` era **dividido pelo máximo teórico** em `check_consistency`: o backend anunciava *"Inconsistent results"* entre duas métricas quando uma delas não fora medida | `Backend/src/app.py` | DEC-051 | ✅ **corrigido** — `None` com motivo ([D24](../science/02-defeitos-que-alteram-resultado.md#d24)) |
| 2026-08-27 | `comparison_notes.consistency` está no payload desde sempre e **nunca foi renderizado**. Foi o que permitiu que o veredito falso durasse: ninguém o via, logo ninguém o conferia | `TreeComparisonViewer.jsx` | DEC-051 | ✅ passa a ser exibido |
| 2026-08-27 | `check_consistency` dividia por zero com `n ≤ 3` — a comparação de qualquer par pequeno derrubava a rota com 500 | `Backend/src/app.py` | DEC-051 | ✅ **corrigido** |
| 2026-08-27 | O visor de CSV dividia a linha por regex de vírgula-ou-tab e quebrava **dentro de campo entre aspas**. O `strain` do GenBank e os itemsets do FPMax têm exatamente isso: a tabela era exibida deslocada, e o excedente descartado em silêncio | `common/TableView.jsx` | DEC-051 | ✅ **corrigido** — parser RFC 4180 com 10 testes |
| 2026-08-27 | `make_tree_binary` resolve politomia **por sorteio** (`random.shuffle`) e estava no caminho da distância quartet. Duas chamadas dariam dois resultados | `Backend/src/app.py` | DEC-051 | Fora de uso; o caminho segue no arquivo — considerar remover |
| 2026-08-27 | Os braços do fator alinhador estavam **fixos em três lugares** — dois laços do controlador e a estrutura de árvores. Com o par novo, a execução saiu com **8 árvores em vez de 14** e o segundo braço rendeu uma só, porque a estrutura não tinha a chave | `treeBuilderController` | DEC-050 | ✅ **corrigido** — os três derivam de `self.aligners` |
| 2026-08-27 | `_VERSAO` da biblioteca de alinhadores era indexado pela **chave**, não pelo binário: dois alinhadores compartilhando executável quebravam a leitura de versão | `workflow/alignment/aligners.py` | DEC-050 | ✅ **corrigido** |
| 2026-08-27 | ~~Clustal Omega é morto pelo OOM killer em sequências longas~~ **RETRATADO**: medido em 52 seqs × 228 kb, ele **não termina em 1 h** com pico de **220 MB**. É limite de **tempo**. O código 137 observado foi em Zika479 (478 seqs curtas), que é outro regime | `aligners.py`, `expected.json` | DEC-041 → DEC-050 | ✅ nota corrigida na biblioteca |
| 2026-08-27 | Um teste de M2.1 procurava `@` no **texto** do módulo para provar que não há e-mail embutido, e reprovava na própria documentação. Substituído por teste **comportamental**: sem `NCBI_EMAIL`, nenhum caminho monta o workflow | `workflow/tests/test_experimento_variola.py` | DEC-050 | ✅ um teste que mede o texto não mede o comportamento |
| 2026-08-26 | **D21 — o IQ-TREE com `-nt 4` não é determinístico.** Três repetições com a mesma semente, entrada, máquina e versão dão **três topologias** (RF = 2); com `-nt 1`, uma só. O RAxML-NG com `--workers 1` é determinístico no mesmo teste — D17 corrigiu a ferramenta que tinha o controle e deixou passar a que não tem | `builder.iqtree_constructor` | DEC-046 | **Bloqueia §4.1 — decisão do usuário** ([D21](../science/02-defeitos-que-alteram-resultado.md#d21)) |
| 2026-08-26 | `manifest["params"]` gravava `input_path` e `output_path` **absolutos**, com nome de usuário — enquanto a primeira linha do módulo promete que todo caminho é relativo. `conferir_correcoes_m1.py` dava **verde falso** porque só varre as chaves de `inputs_sha256`/`outputs_sha256`, nunca `params` | `workflow/utils/manifest.py` | DEC-046 | ✅ **corrigido no manifesto**; estender a conferência é lote de `Backend/` (regra 6) |
| 2026-08-26 | A conferência de D15 em `conferir_correcoes_m1.py` varre **só as chaves de SHA-256**. Passou verde durante todo M2.5 sobre um manifesto que vazava caminho absoluto em `params` | `Backend/scripts/conferir_correcoes_m1.py` | DEC-046 | **Alta** — lote curto de `Backend/`, não tocado por disciplina de escopo |
| 2026-08-26 | Os alinhadores chamam o binário por **nome fixo** (`"mafft"`, `"muscle"`) em vez de `external_tools.require_tool`, que existe justamente para isso desde DEC-043. Funciona hoje porque os nomes coincidem | `workflow/alignment/alignmentSeq.py` | DEC-046 | Média — mesma classe de defeito que o `iqtree2` fixo |
| 2026-08-25 | **`tools_invoked` do manifesto está vazio nas duas máquinas.** `ExecutionManifest.register_tool_run` existe, tem docstring justificando-se por D17 e tem teste de unidade — e **nenhum ponto do pipeline a chama**. O manifesto registra o que estava *disponível*, nunca o que foi *executado*, que é a distinção que o campo existia para fazer | `BioComp_UFF/workflow/utils/manifest.py:277`, chamadores ausentes | DEC-045 | **Alta — pré-requisito de §4.1**; lote próprio de T1 |
| 2026-08-25 | RAxML-NG **recusa** `--threads 16` no conjunto de validação: *Too few patterns per thread*. Os 48 núcleos da máquina são inutilizáveis nesta escala de dado — o teto é do dado, não do hardware | sonda medida | DEC-045 | Insumo de **M7.8** / [DEC-041](#dec-041--2026-08-25-independência-de-hardware-vira-requisito-de-projeto--limites-deixam-de-ser-escalares): o `ResourceModel` precisa de um piso, não só de um teto |
| 2026-08-25 | Com `--threads N --workers 1` e semente fixa, RAxML-NG 2.0.2 e IQ-TREE 3.1.3 dão **RF = 0** entre 2, 4 e 8 threads numa máquina de 48 núcleos. A mitigação de [D17](../science/02-defeitos-que-alteram-resultado.md#d17) **funciona onde deveria falhar** | sonda medida | DEC-045 | ✅ **D17 mitigado e verificado**; `N` continua obrigatório no manifesto |
| 2026-08-25 | `check_dependencies.sh` **reportava** a versão de cada ferramenta e não a **comparava** com nada. Pinar a receita não alcança um env criado antes do pino: ele fica na versão antiga e o script diz ✓ | `scripts/check_dependencies.sh` | DEC-044 | ✅ **corrigido** — lê o pino do `environment.yml`, avisa, sugere a instalação certa, e reprova com `--strict` |
| 2026-08-25 | A máquina de validação tem **48 núcleos lógicos** contra 12 da de desenvolvimento. É o gatilho direto de [D17](../science/02-defeitos-que-alteram-resultado.md#d17): com a mesma semente, o esquema de paralelização muda a topologia | máquina | DEC-044 | **Aberto** — `--threads N --workers 1` obrigatório, e o próprio `N` vai ao manifesto |
| 2026-09-01 | Uma tentativa real de reexecutar VARV-49 (`projects/Variola_Yu_li_2007_M2/`, 3 tentativas no mesmo diretório) morreu com `ValueError: No records found in handle`: o cache de alinhamento (`STEP: Reusing Aligning...`) reaproveitou um `dataset_final_mafft_iterative.aln` vazio, deixado por uma tentativa anterior interrompida no meio da escrita. O braço `mafft` tinha completado (5 árvores); `mafft_iterative` nunca produziu nada. Generaliza o aviso já existente em `docs/skills/validar-workflow/SKILL.md` ("o workflow reaproveita árvore existente") para o alinhamento também, agora com evidência de log | `projects/Variola_Yu_li_2007_M2/out/outputs/log_setup_2026-08-27_bb3fcd1b784d.log:14-20` | pesquisa para o guia de reexecução | Documentado como armadilha operacional em [`13-guia-reexecucao-m2.md §2.1`](13-guia-reexecucao-m2.md#21-regra-operacional-que-já-derrubou-uma-tentativa-diretório-novo-sempre) — `Variola_Yu_li_2007_M2/` fica envenenado e não deve ser reaproveitado. Sem write-lock aberto; considerar um guard (não reusar `.aln` de 0 bytes) como item de M7 |
| 2026-09-01 | `Backend/tests/data/reference/expected.json` (`target_M`) ainda declara `"aligners": ["mafft"]` e justifica a exclusão de Clustal Omega/MUSCLE pela medição de OOM que [DEC-050](#dec-050--2026-08-27--d1-fecha-m2-chega-a-7-de-7--e-o-fator-alinhador-passa-a-existir) **retratou** (Clustal é limite de tempo; MUSCLE 5.3 recusa por interface, não OOM). Com o alvo desatualizado, uma reexecução de VARV-49 com os dois braços do MAFFT nunca faz `reference_check.py --trees` devolver M completo — o braço `mafft_iterative` não entra em `alvo_nomes` | `Backend/tests/data/reference/expected.json` (`target_M`) | pesquisa para o guia de reexecução | **Bloqueia o fechamento de M2** — é zona sagrada (muda o invariante de gate); atualizar via `make reference-dataset` **depois** de corrigir `target_M` e registrar parecer próprio, não junto de outro lote |
