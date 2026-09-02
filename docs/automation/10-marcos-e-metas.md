# Marcos, metas e gates — o baseline como teste de regressão

[← Automação](README.md) · Refina [`01-plano-mestre.md`](01-plano-mestre.md): as ondas W0→W7 continuam sendo o mapa de escopo; este documento define **marcos com gate executável**, a ordem imposta pela dependência científica, e as trilhas paralelas.

## 0. A ideia central

O plano mestre organiza o trabalho por **tipo de problema** (segurança, performance, correção, estrutura). Isso é útil para atribuir agentes, e insuficiente para saber se a refatoração preservou o que importa.

Este documento acrescenta o eixo que faltava: **um invariante científico externo, verificável por comando, que toda refatoração precisa preservar.**

> **O invariante.** Sobre o dataset de referência derivado de Li *et al.* (2007): a **monofilia de VARV** e o **clado P-II** (África Ocidental + América do Sul, *alastrim minor*) são recuperados por **4 de 4** métodos de inferência; a bipartição aninhada de 10 táxons que posiciona P-II como linhagem basal de VARV também tem suporte 4/4.
>
> Fonte: [`../science/01-revisao-variola.md §4.3`](../science/01-revisao-variola.md), validado contra Li *et al.* (2007) PNAS 104:15787-92 e Esposito *et al.* (2006) Science 313:807-812.

Por que isto é melhor que um golden snapshot comum:

| Golden snapshot | Invariante do baseline |
|---|---|
| Congela o comportamento **atual**, bugs inclusive | Congela um resultado **externamente validado pela literatura** |
| Muda quando o bug é corrigido — e aí ninguém sabe se melhorou | **Não pode mudar**: se a monofilia de VARV cair, a refatoração quebrou a ciência |
| Detecta regressão de implementação | Detecta regressão de **significado** |

Os dois são necessários. O golden snapshot pega refatoração que mudou byte; o invariante pega refatoração que mudou verdade. **Este é o gate final de todo marco de M2 em diante.**

### A hierarquia de gates

```
gate de lote    → R aprova o diff  +  V executa verde
gate de marco   → todos os lotes fechados + comando de gate verde
gate científico → o invariante do baseline continua 4/4     ← M2+
gate humano     → o usuário decidiu o que é dele            ← §5
```

---

## 1. Mapa dos marcos

| Marco | Nome | Onda(s) | Trilha | Destrava | Bloqueado por |
|---|---|---|---|---|---|
| **M0** | Fundação verificável | W0 | T3 | tudo | — |
| **M1** | Verdade dos números | W3 (núcleo) | T1 + T2 | M2 | decisão 6 (submódulo) |
| **M2** | Baseline replicado | novo (E3) | T1 | gate científico | decisões 1-5 |
| **M3** | Resultado principal | novo (E2/D10) | T1 + T4 | manuscrito | M1 |
| **M4** | Segurança e desempenho | W1 + W2 | T2 + T4 + T5 | adoção | M0 |
| **M5** | Estrutural | W4 | T2 + T4 | paralelismo em T2 | M0, M4 |
| **M6** | Artefato publicável | W7 | T6 | submissão | M2, M3, M5 |
| **M7** | Heurísticas de inferência auditadas | nova | T1 | confiança em `M` | — (paralelo) |

**Caminho crítico para a submissão: M0 → M1 → M2 → M3 → M6.**
M4 e M5 são engenharia necessária para *adoção e manutenção*, e rodam **em paralelo** ao caminho crítico a partir do fim de M0.
**M7** audita como as árvores são construídas — também paralelo, mas **M3.2 é o mesmo trabalho que M7.2**, então os dois se encontram ali.

```
M0 ─┬─► M1 ──► M2 ──► M3 ─────────────► M6
    │                     ▲              ▲
    ├─► M7 (T1) ──────────┘              │   (M7.2 == M3.2)
    │                                    │
    ├─► M4 (T2/T4/T5) ──► M5 (T2/T4) ────┤
    │                                    │
    └─► T6 documento & manuscrito ───────┘   (contínuo, sempre paralelo)
```

---

## 2. M0 — Fundação verificável

**Meta.** Tornar executáveis as duas regras que o próprio projeto já se impôs e nunca pôde cumprir: *"golden test antes de mover"* e *"medir antes e depois"*. Hoje não existe **nenhum** teste no repositório ([`08-ficha-de-fatos.md §2`](08-ficha-de-fatos.md)).

**Por que primeiro.** Refatorar `app.py` (2 122 linhas) sem caracterização é aposta, não engenharia. E o loop de agentes não fecha sem V, que precisa de algo para executar.

| # | Lote | Trilha | Perfil |
|---|---|---|---|
| M0.1 | Instalar os 5 papéis em `.claude/agents/` + skills em `.claude/skills/`; escrever a skill `oracle-check` | T3 | G |
| M0.2 | `pytest` + `httpx.AsyncClient` no backend; `vitest` no frontend; `Makefile` de verificação | T3 | A7 |
| M0.3 | Golden snapshots de `compare`, `pattern-analysis`, `gen_plot`, `metadata`, `paginated` | T3 | A7 |
| M0.4 | Testes de regressão retroativos do que P0/P1-batch1 já mudou (`resolve_within`, sanitização de upload, flag de cancelamento, `set_ncbi_email`) | T3 | A7 |
| M0.5 | CI GitHub Actions: lint + pytest + build do front; fixture de Neo4j efêmero | T3 | A1 |
| M0.6 | Baseline de performance P-0 registrado no ledger | T3 | A4 |
| M0.7 | Mapa de dados LGPD inicial (gate para snapshots não conterem dado real) | T6 | A8 |
| M0.8 | Quadro de decisões metodológicas do pipeline (insumo do dataset de referência) | T6 | A11 |
| M0.9 | Introspecção do modelo real do grafo Neo4j (labels, rels, constraints, índices) | T5 | A12 |

**Gate de M0 — executável:**

```bash
pytest Backend/tests -q                                  # verde
npm --prefix Frontend/phylotreeminer run build            # verde
npm --prefix Frontend/phylotreeminer run lint             # verde
ls Backend/tests/golden/ | wc -l                          # ≥ 5 snapshots
gh run list --limit 1                                     # CI verde
grep -c "P-0" docs/automation/07-log-de-execucao.md       # baseline registrado
```

Mais: nenhum snapshot contém dado pessoal identificável (parecer de A8); os 5 papéis respondem em `.claude/agents/`.

**Nota de escopo.** M0.4 vai encontrar o residual conhecido de `resolve_within` em `rerun_workflow`/`can_rerun_project` (`app.py:~367,412`), registrado como pendência de W1. **Não corrigir aqui** — escrever o teste que falha, e deixar falhando com `xfail` marcado. O teste vira o critério de aceite do lote de M4.

---

## 3. M1 — Verdade dos números

**Meta.** Fazer o pipeline de produção calcular o que os documentos científicos já provaram ser o correto. Hoje `docs/science/scripts/audit_variola.py` calcula certo e o pipeline calcula errado — **dois universos de identidade paralelos**, que é o próprio [D5](../science/02-defeitos-que-alteram-resultado.md#d5).

**Estratégia.** O script de auditoria é promovido a **oráculo de regressão**: o critério de aceite de cada lote é *"o pipeline de produção passa a concordar com o script"*.

| # | Lote | Defeito | Trilha | Custo | Regra |
|---|---|---|---|---|---|
| M1.1 | ✅ Não sobrescrever `support` no FPMax; gravar `min_support_threshold` em coluna separada; deduplicar por itemset | [D4](../science/02-defeitos-que-alteram-resultado.md#d4) | T1 | ○ | 1 lote = 1 defeito |
| M1.2 | ✅ Pipeline passa a usar a identidade canônica (`canonical_item_id`, 52 bits — limite do `Number` do JavaScript); `legacy` só para auditoria | [D5](../science/02-defeitos-que-alteram-resultado.md#d5) | T1 | ○ | idem |
| M1.3 | ✅ `clade_sets` guarda **bipartição canônica**; RF normalizada passa de `2(n−2)` para `2(n−3)`; RF indefinida é `None` | [D3](../science/02-defeitos-que-alteram-resultado.md#d3) | T1 | ○ | idem |
| M1.4 | ✅ `max_pattern_size`: devolver no payload o nº de padrões descartados; UI avisa | [D7](../science/02-defeitos-que-alteram-resultado.md#d7) | T2 | ○ | — |
| M1.5 | ✅ `tree_coverage`: `hash → {tree_name: subtree_name}` (um-para-muitos) | [D8](../science/02-defeitos-que-alteram-resultado.md#d8) | T2 | ○ | — |
| M1.6 | ✅ `unique_signatures_count`: implementar a definição ou remover o campo; unificar `quasi_invariant`/`topologically_robust` | [D9](../science/02-defeitos-que-alteram-resultado.md#d9) | T2 | ○ | — |
| M1.7 | ✅ Metadados: remover fallback de `strain` para ano e país; `organism` ausente é ausente; normalizar hospedeiros; **fonte única** país/região | [D12](../science/02-defeitos-que-alteram-resultado.md#d12), `C-5b`, `C-5d` | T2 | ○ | zona sagrada |
| M1.8 | ✅ Ler artefato com rótulo truncado sem perder informação: registro mais rico por acesso em `iter_metadata_nodes`; reconciliação de rótulos em `/api/tree/compare` | [D13](../science/02-defeitos-que-alteram-resultado.md#d13) (metade backend) | T2 | ○ | zona sagrada |

Todos são **custo ○** — recomputação sobre artefatos já em disco, sem reexecutar o pipeline bioinformático. É o melhor retorno por unidade de risco do projeto inteiro.

**Protocolo obrigatório por lote** ([`04-rigor-cientifico §3`](04-rigor-cientifico.md#3-protocolo-de-mudança-na-zona-sagrada)): caracterizar → formalizar → **oráculo independente** → casos-limite → tabela de diff → parecer → decisão do usuário.

**Gate de M1 — executável:**

```bash
# 1. produção e oráculo concordam
python -m workflow.stability.report --project VARV-49 --json > /tmp/prod.json
python docs/science/scripts/audit_variola.py --secao 3 --json > /tmp/oracle.json
python docs/science/scripts/compare_oracle.py /tmp/prod.json /tmp/oracle.json   # Δ = 0

# 2. oráculo externo confirma a RF de bipartição (D3)
python -c "import dendropy; ..."   # symmetric_difference com is_rooted=False

# 3. nenhum golden snapshot de M0 mudou por acidente
pytest Backend/tests/golden -q
```

Mais: cada lote com sua **tabela de diff** (métrica · antes · depois · Δ · afeta número publicado?) e parecer no ledger — **inclusive quando Δ = 0**, porque ausência de mudança também é resultado.

⚠️ **Δ ≠ 0 é esperado e é o objetivo.** Todos os números atuais de Variola mudam. A [decisão 5](08-ficha-de-fatos.md#5-decisões-pendentes-do-usuário-bloqueiam-execução) do usuário — corrigir e re-rodar, corrigir com *erratum*, ou postergar — precisa estar tomada **antes** do primeiro merge de M1.

✅ **M1 FECHADO em 2026-08-24** — 8 de 8 lotes (DEC-016, DEC-018, DEC-019, DEC-021, DEC-022, DEC-023). A decisão 6 ([DEC-020](07-log-de-execucao.md)) liberou a escrita no submódulo e destravou M1.1-M1.3.

⚠️ **O que M1 corrigiu foi o pipeline, não os artefatos.** Os `metadata.json`, `all_results_fpmax.csv` e relatórios em `BioComp_UFF/projects/**` continuam com os números antigos até o experimento ser reexecutado. Nenhum número exibido hoje na aplicação mudou; M1 garante que a próxima execução produz o certo.

---

## 4. M2 — Baseline replicado · `VARV-49-clean` ✅ FECHADO em 2026-09-02

**Meta.** Transformar a replicação de Li *et al.* (2007) — hoje parcial, contaminada e sem manifesto — no **dataset de referência versionado** do projeto, e com ele instituir o gate científico.

**Ponto de partida já existente** ([`08-ficha-de-fatos.md §4`](08-ficha-de-fatos.md#4-o-baseline--li-et-al-2007)): `BioComp_UFF/workflow/workflow_dataAcquisition.py:798-884` traz, comentado, o experimento com as **48 accessions explícitas** (`DQ437580`–`DQ437594`, `DQ441416`–`DQ441448`) e o grupo externo (Taterapox + Camelpox, `"1900"[PDAT]:"2007"[PDAT]`), com `initial_min_length=180000`, `refined_min_length=183000`, `similarity_threshold=0.999`, `retmax=200`.

| # | Lote | O que resolve | Trilha |
|---|---|---|---|
| M2.1 | ✅ `workflow/experimentos/variola_li_2007.py` ([DEC-050](07-log-de-execucao.md)): as **48 accessions** saem de um bloco comentado e vão para arquivo versionado, os parâmetros do estudo ficam num lugar só, o e-mail do Entrez vem de `NCBI_EMAIL` e **não há caminho que monte o workflow sem ele**. A checagem de [D23](../science/02-defeitos-que-alteram-resultado.md#d23) nomeia os pares RefSeq/GenBank em vez de deixá-los passar | reprodutibilidade | T1 |
| M2.2 | ✅ **Filtro taxonômico declarado** na consulta **e** verificação pós-download offline, que distingue *fora do clado* de *sem linhagem* ([DEC-035](07-log-de-execucao.md)). Medido: VARV-49 limpo (49/49); VARV-52, VARV-121 e VARV-6 com 1, 4 e 1 táxons fora | [D6](../science/02-defeitos-que-alteram-resultado.md#d6) — crocodilepox, Yoka | T1 |
| M2.3 | ✅ **Enraizamento explícito e comum** pelo grupo externo declarado, em todos os métodos ([DEC-034](07-log-de-execucao.md)) — a ferramenta existe e está testada; aplicá-la ao dataset de referência é M2.6 | [D3](../science/02-defeitos-que-alteram-resultado.md#d3) — legitima a análise por clados enraizados | T1 |
| M2.4 | ✅ Proveniência honesta: o padrão é **abortar** com o motivo; a substituição só ocorre se autorizada, e `resolve_aligner` devolve o nome do alinhador que rodou ([DEC-037](07-log-de-execucao.md)). Reexecutar para que os artefatos deixem de mentir é da máquina de validação | [D1](../science/02-defeitos-que-alteram-resultado.md#d1) parte 1 | T1 |
| M2.5 | ✅ **Manifesto de execução**: `run_id`, UTC, `git_commit` dos dois repositórios, versão de **toda** ferramenta, sementes e paralelização fixas, SHA-256 de entradas e saídas ([DEC-027](07-log-de-execucao.md)). Completado em [DEC-046](07-log-de-execucao.md): `tools_invoked` deixa de sair vazio e passa a registrar **a linha de comando de cada chamada** — era o campo que separava *disponível* de *executado* | [D11](../science/02-defeitos-que-alteram-resultado.md#d11), [D17](../science/02-defeitos-que-alteram-resultado.md#d17) | T1 |
| M2.6 | ✅ Publicado em `Backend/tests/data/reference/` — VARV-49, o único limpo e com delineamento defensável. `make reference-dataset` regenera ([DEC-042](07-log-de-execucao.md)) | [`04-rigor §2`](04-rigor-cientifico.md#2-dataset-de-referência-pré-requisito-de-w3) | T3 |
| M2.7 | ✅ `make reference-check` (rápido, qualquer máquina) e `make reference-check-full` (reexecuta). Três códigos: 0 satisfeito, 2 M incompleto, 1 invariante violado. **Código 0 desde 2026-09-02** — invariante 3/3, `M` completo (10 de 10 pipelines) ([DEC-063](07-log-de-execucao.md)) | institui o gate | T3 |

**Composição alvo:** 45 VARV + CMLV/CPXV/TATV como grupo externo declarado. M = 4 métodos de inferência sobre um alinhamento (não 8 — ver [D2](../science/02-defeitos-que-alteram-resultado.md#d2): o denominador 8 conta cópias byte a byte).

**Casos-limite que o dataset deve conter** (é o que expõe os bugs de `C-5*`): árvore não-binária/politomia, `organism` ausente, país fora do dicionário, `;` dentro de string em bloco CQL, duas árvores no mesmo arquivo.

**Gate de M2 — o gate científico, executável:**

```bash
make reference-check
# equivalente a:
#   1. reexecuta os M=4 pipelines sobre Backend/tests/data/reference/
#   2. confere SHA-256 de toda entrada contra MANIFEST.sha256
#   3. assere o invariante:
#        - monofilia de VARV .................. 4/4
#        - clado P-II (AfOc + Am.Sul) ......... 4/4
#        - bipartição aninhada de 10 táxons ... 4/4
#   4. confere contra dendropy/ete3 como oráculo externo
#   5. nenhum táxon fora de txid10242
```

**Este comando passa a ser exigido em todo marco seguinte.** Uma refatoração que o quebre é revertida, independentemente de quantos testes unitários passem.

✅ **Divergência de versão resolvida.** A de FastTree 2.2.0 × 2.1.11 era sombreamento de PATH e foi **retratada** em [DEC-043](07-log-de-execucao.md). A real — RAxML-NG 1.2.2 × 2.0.2 entre as duas máquinas — foi decidida em [DEC-044](07-log-de-execucao.md): **2.0.2 é a versão do experimento**, e as versões passaram a ser pinadas no `environment.yml`. A semente, que a ferramenta gerava, é fixada pelo pipeline desde M2.5.

🔓 **Destravado em 2026-08-24** ([DEC-024](07-log-de-execucao.md)): decisões 2, 3, 4, 5 e 6 tomadas. ✅ **A decisão 1 foi tomada em 2026-08-26** ([DEC-050](07-log-de-execucao.md)): o segundo alinhador é a **segunda estratégia do MAFFT**, e com ela [D1](../science/02-defeitos-que-alteram-resultado.md#d1) fecha. As três alternativas foram remedidas no ambiente pinado — Clustal Omega não termina em 1 h (limite de **tempo**, não de memória, ao contrário do que o registro afirmava) e MUSCLE 5.3 **recusa por projeto**.

➕ **M2.5 ganha um requisito** vindo de [D17](../science/02-defeitos-que-alteram-resultado.md#d17): fixar `--threads N --workers 1` no RAxML-NG e registrar o esquema efetivo. Medido: com a mesma semente, mudar só a paralelização produz **RF = 8** entre as árvores. Fixar semente é necessário e não é suficiente.

➕ **A exclusão do RAxML pode ser revertida** em VARV-49, VARV-52 e VARV-121 — o método conclui nesses dados em ~4 min quando a paralelização é fixada. Devolve `M` de 4 para 5 e resolve DM-11.

➕ **M2.5 ganha um segundo requisito**, de [D21](../science/02-defeitos-que-alteram-resultado.md#d21): o IQ-TREE roda com **`-nt 1`**. Medido: com `-nt N`, três repetições da mesma semente devolvem três topologias, e a ferramenta não tem equivalente ao `--workers 1` do RAxML-NG. Decidido pelo usuário em 2026-08-26.

✅ **M2 fechado em 2026-09-02** ([DEC-063](07-log-de-execucao.md)). A reexecução de [`§4.1`](11-handoff-maquina-de-validacao.md) materializou tudo que faltava: o RAxML de volta (`M` 4 → 5, confirmado rodando nas quatro reexecuções — D17), o fator alinhador genuíno (`mafft` × `mafft_iterative`, D25 corrigido no caminho), o IQ-TREE reprodutível (D21) e o `n` efetivo de 49 (D23, declarado e não corrigido, mas o dedup é o esperado). `docs/science/scripts/gerar_dataset_referencia.py` foi apontado para `Variola_VARV49_reexec_20260901` e regenerou `expected.json` com `target_M_size: 10`; `make reference-check` devolve **código 0** — 10 de 10 pipelines, 3 de 3 invariantes de Li *et al.* (2007).

---

## 5. M3 — Resultado principal

**Meta.** Levar à UI e ao manuscrito o contraste **bootstrap × robustez metodológica**, que é o argumento do artigo e hoje é jogado fora pelo pipeline.

**Por que é o melhor custo-benefício científico do projeto:** o IQ-TREE já roda 1000 réplicas de UFBoot e grava `out/tmp/iqtree_*/*.contree` **com** os valores; o `.nexus` gravado em `out/Trees/` os descarta ([D10](../science/02-defeitos-que-alteram-resultado.md#d10)). **O suporte já foi pago e é desperdiçado.**

| # | Lote | Trilha |
|---|---|---|
| M3.1 | Propagar `confidence` do `.contree` ao Nexus, ao `metadata.json` e ao grafo | T1 |
| M3.2 | Habilitar `-B 1000` no RAxML-NG e `-boot` no FastTree — simetria entre métodos ML | T1 |
| M3.3 | UI exibe, por clado, **bootstrap e suporte metodológico lado a lado** | T4 |
| M3.4 | Regenerar as três tabelas cruzadas (VARV-49, VARV-52, VARV-121) por um comando | T3 |

**Gate de M3:**

```bash
make main-result     # regenera as 3 tabelas UFBoot × suporte metodológico
```

Assere as duas afirmações do artigo, quantificadas e replicadas:

- **(i)** UFBoot = 100 não garante robustez: 35/86 (VARV-121), 13/27 (VARV-49), 14/30 (VARV-52) sobrevivem à troca de método.
- **(ii)** UFBoot alto é necessário, não suficiente: **0 de 167** ramos com UFBoot ≥ 95 recuperado por um único pipeline.

Mais: toda árvore ML em `out/Trees/` carrega suporte de ramo; Pearson recalculado (esperado 0,27–0,44).

---

## 6. M4 — Segurança e desempenho · M5 — Estrutural

Estes marcos **não estão no caminho crítico da submissão**, mas são o que decide se a ferramenta é adotável. Rodam em paralelo a M1→M3 desde o fim de M0, em trilhas de lock disjunto.

### M4 — Segurança (W1) e desempenho (W2)

**Fatiado em lotes em 2026-09-01** (papel P), com verificação ao vivo contra o código — não contra a ficha de fatos, que estava desatualizada em 5 pontos desta tabela (ver nota ao fim). Cinco itens do levantamento original já **fecharam** por trabalho recente e não geram lote: residual de `resolve_within` em `rerun_workflow`/`can_rerun_project`, índice memoizado `F-4`, CORS `S-3`, sanitização de nome/extensão de upload, `progress_percent` (M4.O).

**Observabilidade — ✅ M4.O, 8 de 8** ([DEC-048](07-log-de-execucao.md) no backend e no frontend, [DEC-049](07-log-de-execucao.md) no pipeline): estado e duração vindos do manifesto, não do log, e **um arquivo de log por execução** ([D22](../science/02-defeitos-que-alteram-resultado.md#d22)). Ver o gate executável logo abaixo — já fechado, mantido aqui como registro.

#### T2 — Backend, segurança (serial: `app.py` é um write-lock único)

| # | Lote | O que resolve | Defeito | Write-lock | Gate | Depende de |
|---|---|---|---|---|---|---|
| M4.1 | ✅ Neo4j indisponível devolve `503` com `Retry-After`, em vez de `[]` mudo / `500` genérico ([DEC-061](07-log-de-execucao.md)) | `C-3c`, `B-9` | `services/neo4j_services.py`, `routers/{neo4j,cql,cql_batch}_router.py`, `tests/api/test_neo4j_resiliencia.py` (novo) | `pytest tests/api/test_neo4j_resiliencia.py -q` — 4 rotas em 503 com Neo4j fora | — |
| M4.2 | Log estruturado; zero `str(e)` vazando ao cliente (hoje 19 ocorrências) | `S-4` | `logging_conf.py` (novo), `app.py`, `tests/api/test_vazamento_de_erro.py` (novo) | teste AST: 0 ocorrências | — |
| M4.3 | Mesmo tratamento nos routers e no serviço de lote | `S-4` | `routers/*.py`, `cql_batch_service.py` | mesmo teste AST, agora cobrindo esses arquivos | M4.1, M4.2 |
| M4.4 | `ADMIN_TOKEN` em `/api/ncbi/set-email` e `/neo4j/connect` | `S-5`/DEC-004 | `seguranca.py` (novo), `app.py`, `neo4j_router.py`, `tests/api/test_admin_token.py` (novo) | sem header → `401`; token correto → passa | M4.2 |
| M4.5 | `Origin` dos dois WebSockets contra `ALLOWED_ORIGINS` | `S-5` | `app.py`, `tests/api/test_ws_origin.py` (novo) | origem fora da allowlist → fecha `1008` | M4.4 |
| M4.6 | Limites rígidos: bytes/nº de arquivos em `/upload-data`, razão de expansão do ZIP, teto de `retmax` | `S-5` | `app.py`, `tests/api/test_limites_entrada.py` (novo) | acima do teto → `413`/`400`/`422` | M4.5 |
| M4.7 | Rate limiting anônimo nas rotas de escrita | `S-5`/DEC-004 | `seguranca.py`, `app.py`, `tests/api/test_rate_limit.py` (novo) | N+1 requisições na janela → `429` | M4.6 |

⛔ **Fora do fatiamento, decisão do usuário:** `ADMIN_TOKEN` em `DELETE /projects/{nome}` colide com o propósito de demo público (DEC-004) — token anônimo permitiria apagar o projeto de outro avaliador. Precisa de decisão: token, confirmação por nome, ou lixeira com TTL.

#### T2 — Backend, desempenho (medição antes/depois obrigatória em cada lote)

| # | Lote | O que resolve | Defeito | Write-lock | Gate | Depende de |
|---|---|---|---|---|---|---|
| M4.8 | `psutil.cpu_percent(interval=1)` sai do event loop — bloqueia 1s inteiro por ciclo, com todo cliente WS conectado | perf | `app.py`, `tests/api/test_event_loop.py` (novo) | latência de `GET /` com watcher ativo, antes/depois | M4.7 |
| M4.9 | 3 rotas NCBI síncronas passam por `asyncio.to_thread` | `B-4` | `app.py`, `ncbi_router.py` | 2ª requisição responde durante download em curso | M4.8 |
| M4.10 | `compare_trees`/`pattern-analysis`/`gen_plot`/`build_metadata_index` saem do loop | `B-5` | `app.py` | refatoração pura: golden idêntico; latência de `GET /` durante `POST /api/tree/compare` | M4.9 |
| M4.11 | `stream_workflow_output` reescrito com duas tasks + leitura até EOF (hoje descarta o fim do buffer e faz busy-poll a 10 Hz) | perf | `app.py`, `tests/unit/test_stream_workflow.py` (novo) | processo falso emite N linhas → as N chegam ao broadcast | M4.10 |
| M4.12 | ✅ **Bug real, não só performance**: `render_annotated_tree` recebia `dict` do índice e iterava como lista → `TypeError` ([DEC-061](07-log-de-execucao.md)) | perf + bug | `utils/treePlot.py`, `tests/unit/test_tree_plot.py` (novo) | dict de 3 acessos gera PNG sem `TypeError` | — · paralelo a toda a cadeia acima |

#### T5 — Grafo

| # | Lote | O que resolve | Write-lock | Gate | Depende de |
|---|---|---|---|---|---|
| M4.13 | ⏸️ Gerador de CQL emite `$user_id` em vez do literal `<<USER_UID>>` — **implementado e revertido** em 2026-09-01 ([DEC-061](07-log-de-execucao.md)): sozinho quebra a execução de CQL novo, porque `cql_router.py:38`/`cql_batch_service.py:153` chamam `execute_query()` sem `user_id`, e `neo4j_services.py:53` sobrescreve `parameters['user_id'] = None` incondicionalmente — o `$user_id` do Cypher gerado nunca se resolveria. **Precisa entrar junto com M4.14**, não sozinho | `BioComp_UFF/workflow/utils/neo4jProcessing.py` ⚠️ submódulo, lock próprio | `python -m unittest workflow.tests.test_neo4j_processing`; 0 ocorrências do placeholder | M4.14 (**revisado**: a ordem era o inverso do que a dependência declarada supunha) |
| M4.14 | Backend para de fazer `.replace()` textual do UID — vira parâmetro do driver. **Achado de 2026-09-01**: `execute_query(query, parameters)` é chamado em `cql_router.py:38` e `cql_batch_service.py:153` sem o argumento `user_id` — `neo4j_services.py:53` faz `parameters['user_id'] = user_id` incondicionalmente, sobrescrevendo com `None` mesmo quando `parameters` já traz o valor certo. Corrigir isso é pré-requisito para M4.13 ser segura | `cql_router.py`, `cql_batch_service.py`, `neo4j_services.py`, `tests/api/test_cql_parametrizado.py` (novo) | UID malicioso não altera o plano da consulta; `$user_id` resolve para o valor real, não `None`, nos dois caminhos (`/execute` e o ingest em lote) | M4.3 |
| M4.15 | `.cql` legado com `<<USER_UID>>` é recusado nomeando o arquivo, não executado às cegas | `cql_batch_service.py`, `tests/api/test_cql_legado.py` (novo) | bloco legado → erro nomeando arquivo/linha; nada persiste | M4.14 |
| M4.16 | Credencial de leitura e de escrita separadas | `neo4j_services.py`, `.env.example`, `tests/api/test_credenciais_grafo.py` (novo) | `CREATE` via sessão de leitura é recusado; ingest legítimo continua | M4.1, M4.14 |
| M4.17 | Allowlist de procedures — APOC fora do alcance da credencial de leitura | `docker-compose.yml` | credencial de leitura + `CALL apoc.*` → recusado | M4.16 |
| M4.18 | `LIMIT` obrigatório no servidor (hoje só se aplica quando o cliente não manda consulta própria) | `neo4j_services.py`, `neo4j_router.py`, `tests/api/test_limite_linhas.py` (novo) | consulta sem `LIMIT` do cliente devolve no máximo o teto, com `truncated: true` | M4.16 |
| M4.19 | Índices em `uid`/`name`/`key`, criados de forma idempotente e justificados por `PROFILE` | `scripts/neo4j_indices.py` (novo) | db hits antes/depois, ≥3 repetições; rodar 2x não duplica índice | M4.18 |
| M4.20 | `P-3` — ingest em transação por lote (hoje um bloco que falha deixa o grafo meio ingerido) | `cql_batch_service.py`, `tests/api/test_ingest_transacional.py` (novo) | bloco inválido na posição 5 de 10 → nenhum dos 10 persiste | M4.15, M4.16 |

#### T4 — Frontend

| # | Lote | O que resolve | Write-lock | Gate | Depende de |
|---|---|---|---|---|---|
| M4.21 | ✅ Leak de zoom D3 — `svg.on(".zoom", null)` no cleanup do efeito ([DEC-061](07-log-de-execucao.md)) | `PhylogeneticTreeViewer.jsx`, `__tests__/zoomCleanup.test.jsx` (novo) | `getEventListeners(svg)` estável em 10 trocas de layout | — |
| M4.22 | ✅ vis-network atualiza `DataSet` em vez de `destroy()`+`new Network()` a cada mudança de dado ([DEC-061](07-log-de-execucao.md)). Risco registrado, não corrigido: o container do vis-network é desmontado/remontado por `isLoading`/`viewMode` — preservar a instância não impede a troca do elemento DOM que a contém | `GraphVisualization.jsx`, `__tests__/graphIncremental.test.jsx` (novo) | 2 mudanças de dado → `new Network` chamado 1 vez | — |
| M4.23 | UI trata `503` com banner, não tela em branco | `GraphVisualization.jsx`, `CQLExecutor.jsx`, `__tests__/erro503.test.jsx` (novo) | `fetch` mockado com 503 renderiza o banner | M4.1, M4.22 |
| M4.24 | Cliente envia `X-Admin-Token` nas rotas de reconfiguração | `CQLExecutor.jsx`, `pipelineConfigurator.jsx`, `__tests__/adminToken.test.jsx` (novo) | chamada a `/neo4j/connect` inclui o header | M4.4 |

**Ordem de despacho** — três frentes paralelas desde o dia 1, mais um lote solto:

```
T2 (app.py, serial)   M4.2 → M4.4 → M4.5 → M4.6 → M4.7 → M4.8 → M4.9 → M4.10 → M4.11
T2 (routers)          M4.1 → M4.3 ──────────────────────────────────────────┐
T2 (isolado)          M4.12                                (sem dependência) │
T5 (grafo)            M4.13 → M4.14 → M4.15 ─────────────────────────────────┴→ M4.16 → M4.17
                                                                                M4.16 → M4.18 → M4.19
                                                                                M4.15+M4.16 → M4.20
T4 (frontend)         M4.21 ‖ M4.22 → M4.23 (após M4.1)
                                       M4.24 (após M4.4)
```

**Primeira onda, despachável imediatamente, 5 write-locks disjuntos, nenhum em `app.py`:** M4.1, M4.12, M4.13, M4.21, M4.22.

> **`app.py` é o gargalo real de M4:** 9 dos 20 lotes travam o mesmo arquivo (hoje 2 597 linhas, não as 2 122 registradas na ficha de fatos). A trilha T2 vai levar tanto tempo quanto as outras três somadas — antecipar Arq-B (M5) para depois de M4.7 libera M4.8–M4.11 para rodar em paralelo.

**Gate de M4:** bateria [`security-probe`](../skills/security-probe/SKILL.md) verde; Cypher destrutivo recusado na rota de consulta; ingest legítimo continua funcionando; rota administrativa rejeita requisição sem token; **medição antes/depois anexada a cada item de performance** (≥3 repetições, mediana e dispersão, ambiente reportado); `getEventListeners(svg)` estável entre cliques; **nenhum golden snapshot de M0 mudou**; `make reference-check` verde.

**Gate de M4.O — executável, e hoje reprova:**

```bash
# 1. nenhum projeto com execução real aparece como 'nunca executado'
#    era: Zika_..._480seq_ADVANCED devolvia idle ("Waiting") com 31 407 s de log
#    ✅ agora: interrupted
# 2. a duração reportada é a de UMA execução
#    era: Teste_Neo4j devolvia 1 960 s onde a última execução levou 396 s (5,0x)
#    ✅ agora: 396 s
# 3. o progresso não é sempre 0
#    era: 0% em 21 de 21 — os três regex de progresso eram caminhos mortos
#    ✅ agora: null quando indeterminado, 100 quando concluída, e a UI mostra
#       a contagem real de árvores no lugar da barra
# 4. os três endpoints têm teste sobre log truncado, duas execuções anexadas,
#    log sem timestamp final e projeto sem log
#    era: zero testes
#    ✅ agora: 16 testes em Backend/tests/unit/test_execution_state.py
#
# 5. um arquivo de log por execução (item 4 de D22)
#    era: log nomeado por dia e aberto em append; duas execuções no mesmo
#         arquivo, com dois "Completed successfully!" dentro
#    ✅ agora: log_setup_{AAAA-MM-DD}_{run_id}.log, e o manifesto registra
#       em `log_file` qual é o seu. Verificado com duas execuções seguidas
#       no mesmo diretório de projeto: dois arquivos, uma conclusão em cada.
```

### M5 — Estrutural (W4)

| Bloco | Itens | Trilha |
|---|---|---|
| Arq-A | `Dockerfile` de backend (micromamba, `QT_QPA_PLATFORM=offscreen`) e frontend (build → nginx com fallback SPA + proxy `/api`, `/ws`); compose full-stack; `conda-lock` | T3 |
| Arq-B | Quebrar `app.py` em `config`/`logging_conf`/`routers/*`/`services/*`; DI em vez de singleton Neo4j | T2 |
| Arq-C | `services/http.js` + módulos por domínio; decompor `PhylogeneticTreeViewer`; React Query | T4 |
| Grafo | Esquema versionado com migrações idempotentes (e o inverso de cada uma); catálogo de consultas predefinidas | T5 |

**Gate de M5:** golden snapshots **idênticos byte a byte** (é refatoração, não mudança de comportamento); `docker compose up` sobe tudo; `grep -rl "localhost:8000" Frontend/` vazio; `make reference-check` verde.

> **Arq-B tem valor de processo além do técnico:** enquanto `app.py` for um monólito de 2 597 linhas (medido em 2026-09-01; ver M4), a trilha T2 é **serial** e é o gargalo de paralelismo do projeto inteiro ([§7 da arquitetura](09-arquitetura-de-agentes.md#7-paralelismo--seis-trilhas)). Quebrá-lo multiplica a vazão de todos os marcos seguintes.

---

## 7. M6 — Artefato publicável

**Meta.** Um terceiro reproduz o resultado principal do zero, seguindo só o README.

| Bloco | Itens |
|---|---|
| Artefato (A9) | `CITATION.cff` + DOI Zenodo; *code/data availability statements*; README de reprodução em um comando; **manifesto de análise ligando cada figura a script + commit + hash**; benchmark de escalabilidade com ambiente reportado |
| Manuscrito (A13) | Enquadramento e veículo; mapa afirmação → evidência → limitação; figuras de publicação; carta; pacote de submissão |
| Métodos (A11 + A6) | Inferência e métricas; Limitações; conferência técnica do que A13 redigiu |
| Governança (A8) | Declaração de ética/LGPD; política de retenção do demo; Nagoya/SisGen se houver material biológico brasileiro; licença e compatibilidade de dependências |

**Gate de M6:** o checklist completo de [`04-rigor-cientifico §6`](04-rigor-cientifico.md#6-checklist-de-artefato-para-submissão-gate-de-w7); e **nenhuma afirmação do manuscrito sem evidência rastreável no ledger**.

**Definição de sucesso do [plano mestre §2](01-plano-mestre.md), hoje 2 de 5** (atualizado em 2026-09-02, com o fechamento de M2 — condições 4 e 5 exigem M6, ainda não iniciado):

| # | Condição | Fecha em | Estado |
|---|---|---|---|
| 1 | `git clone --recursive` + um comando → stack de pé | M5 | aberto |
| 2 | `pytest` + testes do front verdes, cobrindo endpoints e núcleo científico | M0 | ✅ satisfeita |
| 3 | Dataset de referência versionado reproduz os números publicados | **M2** | ✅ satisfeita ([DEC-063](07-log-de-execucao.md)) |
| 4 | Está escrito que dados a ferramenta trata, com que base legal e por quanto tempo | M0.7 + M6 | aberto (falta M6) |
| 5 | Cada figura reproduzível por script + hash + commit | M2.5 + M6 | aberto (falta M6) |

---

---

## 8. M7 — Heurísticas de inferência: corretas, parametrizáveis, escaláveis

**Meta.** Auditar a integração de **cada método avançado** — FastTree, IQ-TREE, RAxML-NG, MrBayes — e garantir três coisas que hoje nenhuma delas tem por inteiro: que a chamada esteja **correta** (parâmetros que fazem o que se supõe), **parametrizável** (o experimento decide, não uma constante no código) e **escalável** (o custo cresce de forma previsível e conhecida).

**Por que existe como marco separado.** M1 corrigiu o que o pipeline **calcula depois** que as árvores existem — identidade de clado, suporte, distância. M7 é o degrau anterior: **como as árvores são feitas**. Um erro aqui não é corrigível a jusante, porque a árvore errada já entrou no conjunto. E a evidência acumulada mostra que este degrau nunca foi auditado:

| Achado | O que revelou |
|---|---|
| [D17](../science/02-defeitos-que-alteram-resultado.md#d17) | `--threads auto` no RAxML: mesma semente, árvores diferentes (RF = 8); `SIGSEGV` em outra máquina |
| [D11](../science/02-defeitos-que-alteram-resultado.md#d11) | IQ-TREE gerava a própria semente; reexecutar não reproduzia |
| [D18](../science/02-defeitos-que-alteram-resultado.md#d18) | o modo `auto` nunca chamava nenhum método avançado, e dizia ter concluído |
| [D20](../science/02-defeitos-que-alteram-resultado.md#d20) | MrBayes: sem semente, sem verificação de convergência, diretório relativo, `burnin` fixo |
| medição de 2026-08-25 | parcimônia 25× mais lenta que qualquer método de ML; RAxML é o terceiro mais rápido |

Cada um foi achado por acaso, ao investigar outra coisa. **Nenhum método foi auditado deliberadamente**, e três dos quatro tinham defeito.

**Trilha.** T1 (`BioComp_UFF/**`). **Paralelo:** não bloqueia M2 nem M3, mas **M3 depende de M7.2** — habilitar bootstrap no RAxML e no FastTree é, ao mesmo tempo, o lote M3.2 e um item de auditoria de chamada.

| # | Lote | O que resolve | Origem |
|---|---|---|---|
| M7.1 | ✅ **Ficha de chamada por método** ([DEC-060](07-log-de-execucao.md#dec-060--2026-09-01--m71-fecha-ficha-de-chamada-por-método-achado-d26-e-e4-ganha-validação-de-oráculo)): [`docs/science/08-ficha-de-chamada-por-metodo.md`](../science/08-ficha-de-chamada-por-metodo.md) documenta FastTree/IQ-TREE/RAxML-NG/MrBayes. Achou [D26](../science/02-defeitos-que-alteram-resultado.md#d26) (semente/threads pedidos ≠ executados) e atualização parcial não fechada de [D10](../science/02-defeitos-que-alteram-resultado.md#d10) | dá a linha de base — hoje não existe  — |
| M7.2 | **Suporte de ramo simétrico**: UFBoot no IQ-TREE já existe; habilitar `--bs-trees` no RAxML-NG e `-boot` no FastTree, com o mesmo número de réplicas declarado | [D10](../science/02-defeitos-que-alteram-resultado.md#d10), e é o M3.2  — |
| M7.3 | **Modelo de substituição declarado e coerente**: hoje o IQ-TREE recebe `GTR+G` fixo (sem ModelFinder), o RAxML `GTR+G`, o FastTree usa o padrão e o MrBayes `nst=6 rates=gamma`. São quatro decisões separadas que ninguém comparou | `DM-2`  — |
| M7.4 | **MrBayes correto**: caminho absoluto, semente, `ngen`/`burnin`/`nruns`/`nchains` por configuração, e **recusar a árvore se o ASDSF não indicar convergência** | [D20](../science/02-defeitos-que-alteram-resultado.md#d20)  — |
| M7.5 | **Parcimônia viável ou declarada inviável**: o construtor do Biopython é Python puro e custa 25× um método de ML. Ou se troca por uma implementação em C (TNT, PAUP\*), ou se declara que a parcimônia só entra em conjuntos pequenos — **com o limite medido, não estimado** | [E7](../science/04-agenda-de-pesquisa.md), `DM-11`  — |
| M7.6 | **Falha nunca é silenciosa**: todo método que não produzir árvore precisa aparecer no manifesto como *tentado e falhou*, com o motivo. Hoje o `ignore_mode` mistura "excluído de propósito" com "quebrou e foi excluído depois". **Casa com M4.O**: é o mesmo manifesto que a API passa a ler em vez de raspar o log ([D22](../science/02-defeitos-que-alteram-resultado.md#d22)) | [D18](../science/02-defeitos-que-alteram-resultado.md#d18), `DM-11`  — |
| M7.7 | ⚠️ **Bloqueado por [D22](../science/02-defeitos-que-alteram-resultado.md#d22) se a fonte do tempo for a API**: a duração que ela reporta erra por até **5×**. Meça pelo manifesto. **Curva de custo calibrada em ≥2 máquinas**: tempo e pico de RSS por método em função de `n` e de **colunas distintas** (não `L` bruto — 259 496 sítios comprimiram para 3 713 padrões). Com pontos de uma máquina só, expoente e deslocamento ficam confundidos: qualquer curva passa por dois pontos. Só com duas máquinas o `fitted=True` é honesto | responde "o que roda em que escala **e em que máquina**" com número | [R2](../respostasUteis/r2.md) |
| M7.8 | **Eixo de núcleos no modelo de custo**: hoje o modelo só prevê memória, e [D17](../science/02-defeitos-que-alteram-resultado.md#d17) mostrou que o número de núcleos muda o **resultado**, não só o tempo. Registrar o esquema de paralelização efetivo como parte do fingerprint científico, e prever quando ele diverge | torna o resultado comparável entre máquinas | [D17](../science/02-defeitos-que-alteram-resultado.md#d17) |

**Gate de M7 — executável:**

```bash
# 1. toda chamada de ferramenta está no manifesto, com semente e paralelização
python - <<'EOF'
import json; m = json.load(open('.../out/outputs/manifest.json'))
# `tools_invoked` é `ferramenta -> {parâmetros, "runs": [uma por chamada]}`
# desde `manifest_version: 2` (DEC-046). Uma entrada por chamada, e não por
# ferramenta: dois alinhadores invocam o mesmo inferidor duas vezes.
assert set(m['tools_invoked']) >= {'iqtree','raxml-ng','fasttree','mrbayes'}
assert all(v['runs'] for v in m['tools_invoked'].values())
assert all('seed' in v for k, v in m['tools_invoked'].items()
           if k in {'iqtree', 'raxml-ng'})   # fasttree e mrbayes não aceitam
EOF

# 2. duas execuções da mesma entrada produzem os mesmos hashes de árvore
#    (o teste de reprodutibilidade da skill validar-workflow)

# 3. nenhum método falha em silêncio
#    manifesto declara, para cada método: executado | ignorado por configuração | falhou (com motivo)

# 4. curva de custo publicada em docs/science/, com ambiente declarado
```

Mais: **nenhum método entra em `M` sem ter passado por M7.1** — um pipeline cuja chamada ninguém conferiu não é um voto válido no suporte metodológico.

⚠️ **M7.5 e M7.7 exigem a máquina de validação.** M7.1, M7.3, M7.4 e M7.6 são código e podem ser feitos em qualquer lugar.

---

## 9. Limitações honestas deste plano

Escritas aqui porque um plano que não declara o que não sabe é propaganda.

1. **M2 pode falhar, e falhar é informação.** Se o invariante não sobreviver à limpeza taxonômica e ao enraizamento explícito, a conclusão não é "o pipeline está quebrado" — é que o resultado dependia da contaminação. Isso precisa ser reportado, não contornado. O critério de invalidação está em [E3](../science/04-agenda-de-pesquisa.md#e3--◐--varv-49-clean-replicação-depurada-de-li-et-al-2007).

2. **O gate científico só existe depois de M2.** Entre M0 e M2, a única rede é o golden snapshot — que congela bugs junto com o comportamento. É um risco aceito e datado, não um descuido.

3. **M1 muda todos os números publicados.** Não há caminho que corrija D1-D5 e preserve os valores atuais. A escolha é do autor ([decisão 5](08-ficha-de-fatos.md#5-decisões-pendentes-do-usuário-bloqueiam-execução)).

4. **D1 é o item mais caro e não está em nenhum marco.** Corrigir de verdade o braço `clustalo` exige decidir o segundo alinhador ([decisão 1](08-ficha-de-fatos.md#5-decisões-pendentes-do-usuário-bloqueiam-execução)) **e** reexecutar tudo. M2.4 corrige só a *proveniência* (nome honesto), que é barato e obrigatório. O fator alinhador como resultado científico é [E4](../science/04-agenda-de-pesquisa.md#e4--◐--o-fator-alinhador-medido-onde-ele-existe), posterior a M3.

5. **O FPMax pode não ser necessário na escala atual.** Com M ≤ 10, `2^M ≤ 1024` e a enumeração exata é trivial — é o que `workflow/stability/maximal_patterns` já faz. Como o FPMax é o núcleo declarado da pesquisa, [E7](../science/04-agenda-de-pesquisa.md#e7--◐--onde-o-fpmax-passa-a-ser-necessário) precisa achar o ponto de cruzamento. **Ausência de cruzamento também é resultado publicável** — e honesto.

6. **A ferramenta, sozinha, dificilmente entra em veículo de alto impacto.** O que entra é a descoberta que ela viabilizou. A escada realista está em [`../agents/13-escrita-cientifica.md §5`](../agents/13-escrita-cientifica.md). A recomendação permanece: preparar o manuscrito para o degrau que a evidência sustenta hoje (o contraste bootstrap × método, M3), construindo desde já o que o degrau seguinte exige.

---

## 10. Quadro de decisões que destravam o plano

Nenhum agente decide estas seis. Estão em [`08-ficha-de-fatos.md §5`](08-ficha-de-fatos.md#5-decisões-pendentes-do-usuário-bloqueiam-execução) e replicadas aqui com o que cada uma libera:

| # | Decisão | Libera | Urgência |
|---|---|---|---|
| ~~**6**~~ | ✅ **Tomada** (DEC-020): sim, com lock e histórico separados | ~~M1.1-M1.3, M2, M3.1-M3.2~~ — destravados |
| ~~**5**~~ | ✅ **Tomada** (DEC-018): corrigir e re-rodar | ~~merge de M1~~ | — |
| ~~**4**~~ | ✅ **Tomada** (DEC-024): fica, reportando com e sem | ~~números de suporte~~ | — |
| ~~**2**~~ | ✅ **Tomada** (DEC-024): fica, como histórico de experimentos e caso de escala | ~~composição de M2~~ | — |
| ~~**3**~~ | ✅ **Tomada** (DEC-024): fica, como demo didático | ~~composição de M2~~ | — |
| ~~**1**~~ | ✅ **Tomada** (DEC-036, biblioteca; refinada por [DEC-050](07-log-de-execucao.md)): a biblioteca é **MAFFT + Clustal Omega + MUSCLE**, e o **fator alinhador em si é `mafft` × `mafft_iterative`** — duas estratégias do MAFFT, remedidas no ambiente pinado. Clustal Omega não termina em 1 h nestes genomas (limite de tempo, não OOM) e MUSCLE 5.3 recusa o alinhamento | ~~E4~~ — fecha [D1](../science/02-defeitos-que-alteram-resultado.md#d1) | — |

> Sobre a decisão 1: a ficha de fatos registrava que o MUSCLE instalado era **3.8.1551, não MUSCLE5** — o que já apontava para contrastar duas *estratégias* do MAFFT em vez de dois programas com heurísticas independentes. O fator alinhador remedido em 2026-08-27 confirmou essa leitura.

**Situação em 2026-08-27: as seis estão tomadas.** Nenhuma decisão do usuário bloqueia qualquer marco.
