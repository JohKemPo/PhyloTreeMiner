# Handoff para a máquina de validação

[← Automação](README.md) · **Documento vivo.** Criado em 2026-08-24.

Este documento existe porque **o desenvolvimento e a validação acontecem em máquinas diferentes**. A máquina de desenvolvimento não roda pipeline pesado; a de validação roda, e é onde o teste de estresse e a reexecução dos experimentos acontecem.

Uma janela de contexto que abrir na máquina de validação deve conseguir, **lendo só este documento e o [`CLAUDE.md`](../../CLAUDE.md)**, saber o que rodar, o que esperar e o que fazer com o resultado.

---

## 1. O que já está pronto e não precisa de máquina grande

Todo o marco **M1 — Verdade dos números** está fechado (8 de 8 lotes) e verificado sem execução pesada. O que M1 corrigiu foi o **pipeline**; os artefatos em disco continuam com os números antigos.

| Lote | Defeito | O que mudou | Conferido contra |
|---|---|---|---|
| M1.1 | [D4](../science/02-defeitos-que-alteram-resultado.md#d4) | `support` do FPMax deixa de ser o limiar da varredura | `audit_variola.py --secao 5`: Δ = 0 em 37/37 itemsets |
| M1.2 | [D5](../science/02-defeitos-que-alteram-resultado.md#d5) | identidade de clado canônica (52 bits, invariante à ordem) | contagem de clados canônicos, 4 experimentos |
| M1.3 | [D3](../science/02-defeitos-que-alteram-resultado.md#d3) | bipartição canônica; RF por `2(n−3)`; indefinida é `None` | `dendropy`: 137 pares, 0 divergências |
| M1.4-M1.6 | [D7](../science/02-defeitos-que-alteram-resultado.md#d7)/[D8](../science/02-defeitos-que-alteram-resultado.md#d8)/[D9](../science/02-defeitos-que-alteram-resultado.md#d9) | truncamento declarado; cobertura um-para-muitos; campo falso removido | golden snapshots |
| M1.7 | [D12](../science/02-defeitos-que-alteram-resultado.md#d12)+[D16](../science/02-defeitos-que-alteram-resultado.md#d16) | metadado deixa de ser fabricado do `strain`; país/região com fonte única | 68 países dos 18 projetos |
| M1.8 | [D13](../science/02-defeitos-que-alteram-resultado.md#d13) (backend) | leitura recupera o registro íntegro do GenBank | `dendropy` nos pares truncados |

Detalhe e tabelas de diff: DEC-016, DEC-018 a DEC-023 no [log de execução](07-log-de-execucao.md).

---

## 2. Ambiente

### 2.1 O que a máquina de desenvolvimento tem (linha de base)

| Componente | Versão | Como conferir |
|---|---|---|
| CPU / RAM | i5-11400H, 6 núcleos físicos / 12 lógicos, 31 GB | `nproc`, `free -g` |
| Python | 3.10.19 | `python -V` |
| Node | v22.22.3 | `node -v` |
| Docker | 28.3.3 | `docker --version` |

Para as ferramentas de bioinformática, **a versão depende de onde o binário for
encontrado** — ver §2.2. O comando que responde é sempre o mesmo:

```bash
bash scripts/check_dependencies.sh
```

| Ferramenta | No env do projeto | No PATH do sistema |
|---|---|---|
| MAFFT | 7.525 | v7.490 |
| Clustal Omega | 1.2.4 | 1.2.4 |
| MUSCLE | *ausente* | **3.8.1551** (não é o MUSCLE5) |
| FastTree | **2.2.0** | 2.1.11 |
| IQ-TREE | **3.0.1** (binário `iqtree3`) | 2.2.2.6 (binário `iqtree2`) |
| RAxML-NG | **1.2.2** | 1.1.0 |
| MrBayes | 3.2.7 | 3.2.7 |

### 2.2 Não havia divergência entre máquinas — havia sombreamento de PATH

**Correção de um registro errado.** Este documento afirmou, por vários dias, que
os artefatos em `BioComp_UFF/projects/**` tinham sido gerados com FastTree 2.2.0
e RAxML-NG 1.2.2 enquanto a máquina de desenvolvimento tinha 2.1.11 e 1.1.0, e
que essa diferença bloqueava a replicação exata. **Isso estava errado.**

O env conda do projeto *sempre* teve FastTree 2.2.0 e RAxML-NG 1.2.2 — as mesmas
versões dos logs dos artefatos. O que acontecia é que, com o env não ativado, o
PATH resolvia `/usr/bin/FastTree` 2.1.11 e `/usr/local/bin/raxml-ng` 1.1.0. Eu
media o binário do sistema e registrava o resultado como "a versão do projeto".

O que isso muda:

- **Não há decisão pendente** sobre pinar versões ou reexecutar tudo. O item
  correspondente de [`08-ficha-de-fatos §1`](08-ficha-de-fatos.md) está resolvido:
  as versões coincidem.
- **A causa real é operacional e reaparece em qualquer máquina** onde as
  ferramentas existam também fora do conda. É o que `check_dependencies.sh`
  agora sinaliza como *"fora do env"*.
- **O nome do binário não é estável.** O pacote `iqtree` do bioconda instalava
  `iqtree2` na série 2.x e passou a instalar `iqtree`/`iqtree3` na 3.x, sem
  `iqtree2`. O pipeline chamava `iqtree2` fixo: quem seguisse a receita do
  projeto instalava o IQ-TREE com sucesso e mesmo assim não conseguia rodar.
  Resolvido em `workflow/utils/external_tools.py`, que é o único lugar que sabe
  os nomes possíveis de cada ferramenta.

**A lição que fica:** medir a ferramenta errada produz um fato falso que se
propaga por todo o registro. Antes de anotar uma versão, confira **de onde** o
binário veio, não só o número que ele imprime.

### 2.3 Registre o ambiente da máquina de validação aqui

*(a preencher na primeira sessão da máquina nova — CPU, RAM, versões da tabela acima, e se há GPU)*

---

## 3. O que rodar primeiro — portão de sanidade

Nada aqui é pesado; tudo termina em minutos. Se algum falhar, **pare e reporte**: o estado da máquina diverge do esperado e nenhum resultado pesado terá valor.

```bash
# 1. backend
make test-backend                # esperado: 182 passed, 1 xfailed
                                 # o xfail é D15 (vazamento de caminho absoluto)

# 2. submódulo (unittest, não pytest, e de dentro de BioComp_UFF/)
cd BioComp_UFF && python -m unittest \
  workflow.tests.test_stability workflow.tests.test_subtree_mining \
  workflow.tests.test_tree_identity workflow.tests.test_rf_bipartition \
  workflow.tests.test_manifest
                                 # esperado: Ran 81 tests, OK

# 3. oráculo da RF — confronta produção contra dendropy
cd BioComp_UFF && python ../docs/science/scripts/oraculo_rf_dendropy.py
                                 # esperado: TOTAL: 137 pares, 0 divergências

# 4. oráculo do FPMax e da identidade
cd BioComp_UFF && python ../docs/science/scripts/audit_variola.py --secao 3 --secao 5
                                 # esperado na §3: "produção x oráculo: 0 divergência(s)"

# 5. frontend
make test-frontend               # esperado: 8 passed
make lint                        # catraca: erros 69/69, avisos 27/27
make build                       # ✓ built
```

---

## 4. O que está esperando máquina grande

Em ordem de valor. Nenhum destes foi executado ainda.

### 4.0 O conjunto de validação já roda — use-o como pré-voo

Antes de qualquer conjunto grande, rode o conjunto de validação e confira. Ele fecha em **11 minutos** e é o que prova que a máquina está sã.

```bash
# ver docs/skills/validar-workflow/SKILL.md para a configuração completa
cd BioComp_UFF && python workflow.py -p <config-zika21-advanced>.json
cd Backend     && python scripts/conferir_correcoes_m1.py Zika_21seq_validacao
cd BioComp_UFF && python ../docs/science/scripts/oraculo_rf_dendropy.py projects/Zika_21seq_validacao
```

Números obtidos na máquina de desenvolvimento em 2026-08-25 ([DEC-030](07-log-de-execucao.md)), para comparar:

| Medida | Esperado |
|---|---|
| árvores / pipelines | **14 / 14** (`mode: advanced`, só `mrbayes` ignorado) |
| duração total | **11 min 03 s** |
| FPMax | **37 linhas, 37 itemsets**; frágeis ∩ robustos = ∅ |
| identidade | **46 clados canônicos** contra **109 legados** |
| bipartições | `\|B\| = 17 = n − 3` em todos; **7 universais** |
| oráculo dendropy | **91 pares, 0 divergências** |
| custo por método | distância 0-6 s · IQ-TREE/FastTree 4-5 s · RAxML 6-7 s · **parcimônia 116-169 s** |

⚠️ **Use `mode: "advanced"`.** O modo `auto` roda só distância e parcimônia e encerra dizendo que deu tudo certo — é o [D18](../science/02-defeitos-que-alteram-resultado.md#d18).

Divergência esperada entre máquinas: o **tempo** muda com o número de núcleos; os **hashes das árvores de RAxML e IQ-TREE** podem mudar se a paralelização for outra — por isso `--threads N --workers 1` está fixado. Se um hash divergir com semente e entrada idênticas, **isso é defeito** e vai para o ledger.

---

### 4.1 Reexecutar os experimentos com o pipeline corrigido — **prioridade máxima**

É o que materializa M1. Sem isso, **nenhum número exibido pela aplicação mudou**, e artefato antigo não é comparável ao novo item a item.

Conjuntos, e o custo esperado de cada um:

| Conjunto | Táxons | Colunas do alinhamento | `metadata.json` atual | Papel declarado ([DEC-024](07-log-de-execucao.md)) |
|---|---:|---:|---:|---|
| VARV-6 | 6 | 250 517 | 29 MB | demo didático |
| VARV-49 | 49 | 235 955 | 821 MB | **baseline de referência** |
| VARV-52 | 52 | 259 496 | 1,1 GB | replicação |
| VARV-121 | 121 | 283 874 | 3,2 GB | escala e histórico do workflow |
| ZIKV-480 | 478 | 10 816 | 1,1 GB | escala em nº de táxons |

**O que conferir depois de reexecutar** — é aqui que a reexecução prova ou refuta M1:

1. `all_results_fpmax.csv` tem as colunas `support`, `min_support_threshold`, `max_support_threshold`, `n_trees` e **uma linha por itemset**.
2. Nenhum itemset aparece ao mesmo tempo como *method-sensitive* e *topologically robust* na Deep Analysis.
3. `List_terminals_hash` é o identificador canônico e `List_terminals_hash_legacy` está presente ao lado.
4. O número de itens distintos bate com a contagem de clados canônicos: **101 / 120 / 270 / 11** para VARV-49 / VARV-52 / VARV-121 / VARV-6 (inclui o clado universal).
5. O padrão de maior suporte de VARV-49 passa a ser de **16 clados a 8/8** (era 1 clado a 6/8).
6. `pytest Backend/tests` continua verde e os golden snapshots que mudarem têm parecer no ledger **antes** de serem regravados.

### 4.2 Devolver o RAxML aos experimentos de *Variola*

`ignore_mode` exclui `raxml` em VARV-49, VARV-52 e VARV-121. A causa foi identificada ([D17](../science/02-defeitos-que-alteram-resultado.md#d17)): um `SIGSEGV` do `--threads auto`, **não** limitação do método nem falta de memória. Reproduzido na máquina de desenvolvimento: o mesmo alinhamento de VARV-52 conclui em 251 s.

**Fixe `--threads N --workers 1`** e devolva `M` de 4 para 5. Resolve também DM-11 (a incomparabilidade de `M` entre experimentos).

⚠️ **Não use `--threads auto`.** Medido: mesma semente, mesmo arquivo, mudando só a paralelização → **RF = 8** entre as árvores resultantes. O esquema depende do número de núcleos, então a máquina de validação **vai** produzir árvore diferente da de desenvolvimento se isso não for fixado.

### 4.3 Teste de estresse — o que ainda não se sabe

| Pergunta | Por que importa | Como medir |
|---|---|---|
| Onde o FPMax passa a ser necessário? | Com `M ≤ 10`, `2^M ≤ 1024` e a enumeração exata é trivial — `maximal_patterns` já a faz. Se não houver cruzamento, **isso é resultado publicável** | [E7](../science/04-agenda-de-pesquisa.md) — ampliar `M` deliberadamente e medir tempo de enumeração exata contra FPMax |
| `pattern-analysis` em VARV-49 congela a API por quanto tempo? | O baseline P-0 mediu **6,4× de degradação** com VARV-6 (28,6 MB). VARV-49 tem 860 MB. **Extrapolação declarada, nunca medida** | `Backend/scripts/perf_baseline.py --servidor http://127.0.0.1:8011` |
| O `build_metadata_index` tem pior caso ruim? | Quando algum táxon nunca tem metadado no arquivo, lê o `metadata.json` inteiro (~11 s em 821 MB) dentro do `cache_lock` e no event loop | cronometrar `/api/tree/{p}/insights` a frio nos 5 conjuntos |
| MrBayes é viável? | Está ausente do PATH e no `ignore_mode` de todos os experimentos; nunca produziu árvore | instalar e rodar em VARV-6 primeiro |
| Parcimônia é viável? | Excluída em **todos** os experimentos. O construtor do Biopython é Python puro e escala mal | rodar em VARV-6 e ZIKV-6 antes de qualquer conjunto grande |

**Protocolo obrigatório de medição** ([`skills/perf-baseline`](../skills/README.md)): ≥3 repetições, mediana e dispersão, ambiente reportado, antes/depois na mesma máquina. Uma medição sem ambiente declarado não entra no ledger.

### 4.4 Limites de recurso já conhecidos

- **Clustal Omega estoura memória** em conjuntos grandes: `return code 137` / `Killed` (OOM killer) no Zika479. O pipeline troca para MAFFT acima de 20 kb por sequência — e é isso que produz [D1](../science/02-defeitos-que-alteram-resultado.md#d1), a substituição silenciosa que mantém o nome de arquivo `*_clustalo_*`. Numa máquina com mais RAM, vale medir **onde** o limite real está, em vez de manter os 20 kb chutados.
- **O que pesa no RAxML não é o número de táxons**, é o comprimento do alinhamento — e ainda assim só até a compressão de padrões: VARV-52 tem 259 496 sítios que comprimem para **3 713 padrões**. 478 táxons de Zika rodam; 52 de *Variola* quebravam.

---

## 5. Regras que valem igual nas duas máquinas

1. **Nada de commit e nada de push sem pedido explícito** — nos dois repositórios.
2. **Toda mudança na zona sagrada deixa parecer no ledger**, inclusive quando Δ = 0.
3. **Golden snapshot só é regravado depois do parecer**, nunca antes: `UPDATE_SNAPSHOTS=1 pytest tests/golden`.
4. **O submódulo já vinha sujo** antes deste trabalho — `workflow/stability/`, `docs/` e READMEs não rastreados ou modificados. Separe o que é seu antes de qualquer commit lá.
5. **Registre tudo no [log de execução](07-log-de-execucao.md)** com o número DEC seguinte, e atualize a linha "Última atualização" do bloco Estado.

---

## 6. Decisões já tomadas — não reabra

| # | Decisão | Resposta | Onde |
|---|---|---|---|
| 2 | VARV-121 fica ou sai | **Fica** — histórico de experimentos | [DEC-024](07-log-de-execucao.md) |
| 3 | VARV-6 fica ou sai | **Fica** — demo didático | [DEC-024](07-log-de-execucao.md) |
| 4 | UPGMA fica ou sai | **Fica**, reportando `sup` com e sem | [DEC-024](07-log-de-execucao.md) |
| 5 | Quando reexecutar | **Corrigir e re-rodar** | [DEC-018](07-log-de-execucao.md) |
| 6 | Editar o submódulo | **Sim**, com lock e histórico separados | [DEC-020](07-log-de-execucao.md) |

**Única pendente:** decisão 1 — qual é o segundo alinhador. Não bloqueia M2 nem M3; governa [E4](../science/04-agenda-de-pesquisa.md) e a correção plena de D1. Recomendação registrada: duas estratégias do MAFFT (`--retree 1` × `--maxiterate 1000`), já que o MUSCLE instalado é 3.8.1551 e não o 5.
