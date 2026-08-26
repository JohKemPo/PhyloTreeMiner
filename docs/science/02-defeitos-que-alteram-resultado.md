# Defeitos que alteram resultado — registro com evidência

[← Ciência](README.md) · Base factual: [`01-revisao-variola.md`](01-revisao-variola.md)

Cada entrada tem: onde está, o que faz, **que número publicado passa por ali**, como foi comprovado e o que a correção exige. Ordem por severidade.

Convenção de severidade:

- **Bloqueante** — invalida uma afirmação central; não pode ir para submissão.
- **Alta** — muda a magnitude de um número reportado.
- **Média** — degrada interpretação ou reprodutibilidade sem inverter a conclusão.

Todos os itens caem na **zona sagrada** de [`04-rigor-cientifico.md §1`](../automation/04-rigor-cientifico.md#1-zona-sagrada). Nenhum deve ser corrigido sem o protocolo do §3 daquele documento: caracterizar → formalizar → oráculo independente → casos-limite → tabela de diff → parecer → decisão do usuário.

---

<a id="d1"></a>

## D1 · Bloqueante · O braço "clustalo" nunca executou o Clustal Omega

> **Estado:** ⚙️ **substituição silenciosa eliminada** em 2026-08-25 (M2.4 / DEC-037). O padrão passou a ser **abortar com o motivo**; a troca só ocorre se o experimento a autorizar, e nesse caso `resolve_aligner` devolve o nome do alinhador que rodou, para que a saída seja nomeada por ele. **Os artefatos em disco continuam mentindo** — metade dos "pipelines" de *Variola* segue sendo cópia byte a byte de MAFFT com nome de `clustalo` até a reexecução.

**Onde.** `BioComp_UFF/workflow/controller/treeBuilderController.py:868-892` (`_isExecutableByClustalO`) e `:898-921` (`_get_alignment`).

```python
safe_limit_bp = 20000
for record in SeqIO.parse(fasta_path, "fasta"):
    if len(record.seq) > safe_limit_bp:
        is_safe_for_clustalo = False
        ...
if not is_safe_for_clustalo:
    logging.warning("... alterando a rota dinamicamente: align_method -> 'mafft'.")
    return "mafft"
```

O chamador grava o resultado em `output_path_align`, que continua sendo `dataset_final_clustalo.aln`, e as árvores mantêm o nome `tree_dataset_final_clustalo_*`.

**Número afetado.** `factor_effects.aligner` em todo `summary.json` (`mean = 0.0`), `n_pipelines = 8`/`10`, todo suporte de clado, todo padrão maximal, os quatro itemsets de 47–48 itens no CSV do FPMax.

**Evidência.** `audit_variola.py --secao 1`. Alinhamentos MD5-idênticos nos 4 experimentos de Variola; árvores byte a byte idênticas para fasttree, nj, upgma e raxml. Contraste: os 3 projetos Zika (genomas de ~10,6 kb) têm alinhamentos distintos.

**Correção.** Duas partes, independentes:

1. *Integridade de proveniência* (obrigatória, barata): quando a rota muda, o arquivo de saída e o nome da árvore devem refletir o alinhador **usado**, não o pedido. Um `dataset_final_clustalo.aln` produzido pelo MAFFT é um registro falso. Alternativa mínima aceitável: abortar com erro em vez de substituir silenciosamente.
2. *Viabilizar o Clustal Omega em genoma de poxvírus* (científica): o limite de 20 kb é uma proteção real contra OOM. Caminhos: `--max-guidetree-iterations 1 --max-hmm-iterations 1` (já presente em `alignment/alignmentSeq.py:248`), particionamento do genoma, ou substituir o segundo alinhador por um que escale (MAFFT `--maxiterate 1000` × `--retree 1`, ou `mafft` × `muscle5`). **A escolha é científica e é de [A11](../agents/11-bioinformatica-inferencia.md).**

**Cuidado.** Corrigir apenas (1) faz o pipeline produzir 4 árvores em vez de 8 para Variola. Isso **muda todos os números publicados** e exige o protocolo completo.

---

<a id="d2"></a>

## D2 · Bloqueante · Denominador do suporte conta as cópias

**Onde.** Consequência de D1. `workflow/stability/stability.py:333` (`support = len(pipelines) / total`, com `total = len(self.tree_set)`).

**Número afetado.** `universal_clades`, `support_profile`, `maximal_patterns.support`, e a coluna `support` de `clade_support.csv` em todos os `summary.json` de Variola.

**Evidência.** `audit_variola.py --secao 4`. VARV-49: 15 clados "em 8/8" são 15 clados em 4/4. VARV-121: 31 "em 8/8" → 32 em 4/4 (a segunda execução do IQ-TREE introduz 2 clados espúrios e bloqueia 1 clado universal).

**Correção.** Não é código: é **delineamento**. Enquanto D1 existir, os experimentos de Variola devem ser reportados como M = 4 (ou M = 5 em VARV-6). Depois de D1, `TreeSet.from_directory` deve recusar carregar duas árvores com o mesmo digest de topologia, ou avisar.

---

<a id="d3"></a>

## D3 · Alta · Clados enraizados comparados entre árvores enraizadas e não enraizadas

> **Estado:** ✅ **corrigido** em 2026-08-24 (M1.3 / DEC-023). `StabilityAnalyzer` compara bipartições canônicas por padrão e normaliza por `2(n−3)`; RF indefinida devolve `None`. Conferido contra dendropy em 137 pares, 0 divergências. Os **artefatos já gravados** seguem com os números antigos até a reexecução.
>
> A outra metade — **enraizamento explícito e comum pelo grupo externo declarado**, para quando a análise enraizada é o que se quer — chegou em 2026-08-25 com `workflow/stability/rooting.py` (M2.3 / DEC-034). Ela recusa enraizar quando o grupo externo não é monofilético, e essa recusa revelou que **os dois braços de UPGMA falham em VARV-49 e em VARV-6**.

**Onde.** `workflow/stability/stability.py:300-306` — `clade_sets` guarda conjuntos de descendentes; `:461-490` — `rf_matrix` opera sobre esses conjuntos.

**O problema.** FastTree, IQ-TREE, RAxML e NJ emitem árvores **não enraizadas**, escritas em Newick com raiz trifurcante (grau 3 — verificável em todas as árvores em disco). UPGMA emite árvores **enraizadas** e ultramétricas (grau 2). Comparar conjuntos de clados enraizados entre as duas classes penaliza a posição da raiz, que é convenção de escrita nas primeiras e hipótese nas segundas.

**Número afetado.** Toda a `rf_matrix`, `factor_effects.inference`, `support_profile`, `universal_clades`, e portanto todo padrão maximal.

**Evidência.** `audit_variola.py --secao 3`:

| Experimento | Par | RF enraizada | RF bipartição | Δ |
|---|---|---|---|---|
| VARV-121 | fasttree vs iqtree | 0,1765 | 0,0508 | −71,2% |
| VARV-6 | fasttree vs iqtree | 0,7500 | **0,0000** | −100% |
| VARV-6 | iqtree vs raxml | 0,7500 | **0,0000** | −100% |
| VARV-49 | fasttree vs nj | 0,5532 | 0,5652 | +2,2% |

Em VARV-6, três métodos produzem a **mesma topologia não enraizada** e são reportados como 75% discordantes. Os `0 universal_clades` de VARV-6 tornam-se 1 bipartição universal e um reticulado interpretável.

**Correção.** `clade_sets` deve guardar a **bipartição canônica** (lado menor, desempate lexicográfico) para árvores não enraizadas, e o denominador da RF normalizada passa de `2(n−2)` para `2(n−3)`. Definição formal em [`03-metricas.md §2`](03-metricas.md#2-bipartição-e-identidade-de-clado). Se a análise enraizada for desejada, ela exige **enraizamento explícito e comum** (grupo externo declarado), não a raiz arbitrária do Newick.

**Oráculo.** `dendropy.calculate.treecompare.symmetric_difference` com `is_rooted=False`, ou `ete3.Tree.robinson_foulds(unrooted_trees=True)`.

---

<a id="d4"></a>

## D4 · Alta · `support` no CSV do FPMax é o limiar da varredura

> **Estado:** ✅ **corrigido** em 2026-08-24 (M1.1 / DEC-021). `support` guarda a fração real de árvores; o limiar vai para `min_support_threshold`; uma linha por itemset. Δ = 0 contra `audit_variola.py --secao 5` em 37/37 itemsets. Os **CSVs já gravados** seguem errados até a reexecução.

**Onde.** `BioComp_UFF/workflow/subtree_mining/miner.py:147`.

```python
for support in np.arange(0.1, 1.1, 0.1):
    result_fpmax = fpmax(df, min_support=support, use_colnames=True)
    result_fpmax['support'] = support     # sobrescreve o suporte real devolvido pelo mlxtend
```

**Número afetado.** Todo `all_results_fpmax.csv`; as duas tabelas da página Deep Analysis; `pattern_statistics.avg_support` e `support_distribution`.

**Evidência.** `audit_variola.py --secao 5`:

| Experimento | Linhas | Itemsets distintos | Com >1 "suporte" | Nas **duas** tabelas |
|---|---|---|---|---|
| VARV-49 | 16 | 7 | 7 de 7 | 2 |
| VARV-121 | 20 | 11 | 7 de 11 | 2 |
| VARV-6 | 12 | 6 | 6 de 6 | 1 |

Em VARV-49, os padrões de 15 e de 18 itens aparecem simultaneamente como *method-sensitive signature* (suporte 0,3) e como *topologically robust* (suporte 0,5). É uma contradição visível na interface.

**Correção.** Não sobrescrever a coluna. Se a varredura por limiar for mantida, gravar `min_support_threshold` em coluna separada e deduplicar por itemset ao final. O suporte verdadeiro dos CSVs existentes é recuperável — é o **maior** limiar em que o itemset aparece, na grade de 1/M — e o script de auditoria o reconstrói.

**Nota de projeto.** Com M ≤ 10 transações, a varredura é desnecessária: o reticulado inteiro tem 2^M subconjuntos e é enumerável exatamente. É o que `workflow/stability/stability.py:428` (`maximal_patterns`) já faz. **O FPMax não é necessário nesta escala** — a heurística de mineração só se justifica quando M cresce (ver [`04-agenda-de-pesquisa.md`](04-agenda-de-pesquisa.md), E7).

---

<a id="d5"></a>

## D5 · Alta · Identidade de clado de 16 bits, dependente da ordem

> **Estado:** ✅ **corrigido** em 2026-08-24 (M1.2 / DEC-022). O pipeline usa `encode_clade_to_int` → `canonical_item_id` (52 bits, invariante à ordem, rótulos normalizados). O valor legado fica em `List_terminals_hash_legacy`, só para auditoria. Os **artefatos já gravados** seguem com a identidade antiga até a reexecução.

**Onde.** `BioComp_UFF/workflow/utils/treeUtils.py:275-294` (`encode_list_to_int`) e `:392-427` (`calculate_tree_hash`).

```python
lst_str = str(lst)                              # ordem de travessia entra no hash
hash_object = hashlib.md5(lst_str.encode())
return int(hash_object.hexdigest()[:4], 16)     # 16 bits -> 65 536 valores
```

Dois defeitos somados, que atuam em direções opostas e igualmente perigosas:

1. **Dependência de ordem** → o mesmo clado recebe identificadores diferentes em árvores que ordenam os filhos de modo distinto. **Subestima** o suporte.
2. **Espaço de 16 bits** → clados distintos colidem. **Fabrica** suporte.

**Número afetado.** Todo item do FPMax, e portanto todo padrão da página Deep Analysis.

**Evidência.** `audit_variola.py --secao 5`:

| Experimento | Itens legados | Clados canônicos | Colisões | Clados fragmentados |
|---|---|---|---|---|
| VARV-49 | 155 | 100 | 0 | **41 (40,6%)** |
| VARV-52 | 194 | 119 | 0 | **52 (43,3%)** |
| VARV-121 | 405 | 269 | 2 (0,49%) | **96 (35,6%)** |
| VARV-6 | 20 | 10 | 0 | 6 (54,5%) |

O custo em sinal é quantificável. O reticulado exato de VARV-49 diz que `{fasttree, iqtree}` compartilham **42 clados**. O FPMax, com a identidade legada, recupera um padrão de **15 itens** para o mesmo par — **27 clados (64%) perdidos por fragmentação**. E o padrão de maior suporte que o FPMax reporta em VARV-49 tem **1 item a 6/8**, quando a verdade é **15 clados a 8/8**.

O motivo de o padrão `{nj, upgma}` (18 itens) sobreviver intacto é instrutivo: NJ e UPGMA vêm do mesmo `DistanceTreeConstructor` do Biopython e produzem a mesma ordem de travessia. FastTree e IQ-TREE não.

**Correção — aplicada em M1.2 ([DEC-023 anterior, DEC-022](../automation/07-log-de-execucao.md)).** `workflow/stability/clade_identity.py` já definia `canonical_clade_id` (frozenset de nomes) e `canonical_digest` (MD5 de 128 bits sobre nomes ordenados); faltava o pipeline usá-la. Agora usa, via `canonical_item_id` / `treeUtils.encode_clade_to_int`.

**Nota sobre a largura.** O identificador de produção tem **52 bits**, não 128: ele viaja no JSON da API até o navegador, e `Number` do JavaScript só é exato até 2^53 − 1 — um id maior seria arredondado no cliente, trocando a colisão de 16 bits por um erro silencioso. 52 bits dão 4,5 × 10¹⁵ valores contra os 65 536 do esquema legado, cabem no inteiro de 64 bits do Neo4j, e mantêm a colisão em ~10⁻⁶ com 10⁵ clados. A identidade conceitual continua sendo o `frozenset`; os 52 bits são só a sua forma serializável.

`legacy` fica apenas para auditoria — gravado em `List_terminals_hash_legacy` —, como `audit_legacy_identity` já fazia.

---

<a id="d6"></a>

## D6 · Alta · Contaminação taxonômica do conjunto de dados

> **Estado:** ⚙️ **instrumento pronto** em 2026-08-25 (M2.2 / DEC-035): filtro declarado na consulta e verificação pós-download offline. Rode `cd BioComp_UFF && python ../docs/science/scripts/auditar_taxonomia.py`. **Os conjuntos em disco continuam contaminados** — VARV-52 (1), VARV-121 (4) e VARV-6 (1); VARV-49 é o único limpo, 49/49. Recompor é M2.6.

**Onde.** Consulta de aquisição, `BioComp_UFF/workflow/workflow_dataAcquisition.py`, e os diretórios `data/*RetMax200*`.

**O problema.** A busca não é restrita a *Orthopoxvirus*. Entraram:

| Experimento | Táxons fora de *Orthopoxvirus* |
|---|---|
| VARV-121 | `NC_008030` Nile crocodilepox, `MG450915`/`MG450916` Saltwater crocodilepox, `NC_015960` Yoka poxvirus |
| VARV-52 | `NC_008030` Nile crocodilepox |
| VARV-6 | `NC_008030` Nile crocodilepox (1 de 6 táxons) |

**Número afetado.** O alinhamento inteiro de VARV-121 (34,5% das colunas com maioria de *gap*; 32,6% "informativas para parcimônia", implausível para VARV); a topologia; e qualquer painel de filogeografia — o país mais frequente em VARV-121 é a RDC com 25 sequências, que são o clado de MPXV.

**Evidência.** `audit_variola.py --secao 2`.

**Correção.** Filtro taxonômico explícito na aquisição (`txid10242` para *Orthopoxvirus*), declarado no manifesto. Um conjunto `VARV-49-clean` — 45 VARV + CMLV/CPXV/TATV, sem crocodilepox — é o primeiro item da [agenda](04-agenda-de-pesquisa.md).

---

<a id="d7"></a>

## D7 · Alta · `max_pattern_size` descarta os maiores padrões em silêncio

**Onde.** `Backend/src/app.py:1560` — `max_pattern_size: int = Query(100, ge=1)`. O front (`TreePatternAnalysis.jsx:60-62`) envia apenas `rare_threshold` e `robust_threshold`.

**Número afetado.** `pattern_statistics.total_patterns` e ambas as tabelas.

**Evidência.** Em VARV-121, o CSV tem 20 linhas e a API reporta `total_patterns: 12` — as 8 descartadas têm 118 a 120 itens, isto é, são precisamente os padrões de maior conteúdo. Nenhum aviso é emitido.

**Correção.** Ou remover o teto, ou devolvê-lo no payload junto do número de padrões descartados, e a UI exibir "N padrões ocultos por tamanho > K".

---

<a id="d8"></a>

## D8 · Alta · `tree_coverage` atribui padrões à árvore errada

**Onde.** `Backend/src/app.py:1581-1582`.

```python
for metadata in iter_metadata_nodes(metadata_path, iter_tree=True):
    hash_subtrees_infos.update(get_hash_to_subtree(metadata))
```

`get_hash_to_subtree` (`:1598`) devolve `List_terminals_hash -> {tree_name, subtree_name, terminals}`. Um clado conservado tem o **mesmo hash** em várias árvores; o `update` faz a última vencer. `analyze_tree_coverage` (`:1712`) então atribui todos os padrões daquele hash a uma única árvore.

**Número afetado.** O painel *tree coverage* inteiro.

**Evidência.**

| Experimento | Árvores listadas | Reais | Perda |
|---|---|---|---|
| VARV-49 | 4 | 8 | 50% |
| VARV-121 | 3 | 8 | 62% |
| VARV-6 | 5 | 10 | 50% |

**Correção.** `hash -> {tree_name: subtree_name}` (um-para-muitos) em vez de um-para-um. O campo `terminals` é o mesmo para todas as árvores e pode continuar único.

---

<a id="d9"></a>

## D9 · Média · `unique_signatures_count` é sempre 0

**Onde.** `Backend/src/app.py:1655` declara `unique_signatures = []`; nada é anexado. `:1704` exporta `'unique_signatures_count': len(unique_signatures)`.

**Número afetado.** Uma estatística exibida na UI que é constante 0 por construção.

**Correção.** Ou implementar a definição pretendida (e escrevê-la primeiro), ou remover o campo. Enquanto existir, é um número falso na interface.

**Relacionado.** `quasi_invariant` (`:1683-1698`) recalcula exatamente a condição de `topologically_robust` — mesmo conjunto, custo dobrado, dois nomes.

---

<a id="d10"></a>

## D10 · Média · O suporte de ramo calculado é descartado

**Onde.** O IQ-TREE roda 1000 réplicas de UFBoot (`Generating 1000 samples for ultrafast bootstrap (seed: 97376)` no log) e grava `out/tmp/iqtree_*/*.contree` **com** os valores. O `.nexus` gravado em `out/Trees/` não os tem.

**Número afetado.** Nenhum número atual — mas é o insumo do **resultado principal** do artigo (§4.4 da revisão). O suporte já é pago e é jogado fora.

**Evidência.** `audit_variola.py --secao 6` recupera os valores do `.contree` e produz a tabela cruzada UFBoot × suporte metodológico.

**Correção.** Propagar `confidence` ao Nexus, ao `metadata.json`, ao grafo (nó `Support` já existe, hoje usado para o limiar do FPMax) e à UI. Isto é o principal item de valor científico da lista.

---

<a id="d11"></a>

## D11 · Média · Nenhum manifesto de execução

> **Estado:** ✅ **corrigido** em 2026-08-24 (M2.5 / DEC-027) — `out/outputs/manifest.json` grava commit dos dois repositórios, versões de ferramenta, ambiente, semente e paralelização efetivas e SHA-256 de entradas e saídas. Os experimentos **já executados** não têm manifesto e não podem ganhar um: aqueles fatos não foram registrados na época.

**Onde.** Ausente em todo o pipeline. O que existe: `config_backup.json` (parâmetros, com `project_name` errado e caminhos de outra máquina) e logs.

**O que falta.** Versão de cada ferramenta, semente, digest de entrada e saída, `git commit`, timestamp UTC. Recuperáveis hoje apenas por leitura de log, e só para 2 de 6 ferramentas:

| Ferramenta | Versão registrada? |
|---|---|
| IQ-TREE | 2.2.2.6 (no `.log`) |
| FastTree | 2.2.0 double precision (no `.log`) |
| MAFFT | **não** |
| Clustal Omega | **não** (e não executou) |
| RAxML-NG | **não** |
| mlxtend (FPMax) | **não** |

A semente do IQ-TREE (`97376`) foi gerada pela ferramenta, não fixada pelo pipeline: **reexecutar não reproduz a árvore.**

**Correção.** O manifesto especificado em [`04-rigor-cientifico.md §4`](../automation/04-rigor-cientifico.md#4-determinismo-e-reprodutibilidade). É pré-requisito do checklist de W7.

---

<a id="d12"></a>

## D12 · Média · Extração de metadados: ano inventado, país errado, fallback morto

**Onde.** `Backend/src/app.py:611-664` (`get_node_information`).

**(a) Ano fabricado a partir do nome da cepa.** `:648-653`:

```python
raw_date = coll_date if coll_date else strain_info
year_match = re.search(r'\d{4}', raw_date)
```

Sem `collection_date`, cai no nome da cepa e captura os quatro primeiros dígitos. `Camelpox virus strain 0408151v` → ano **`0408`**. Observável em produção: `GET /api/tree/Variola_Yu_li_2007_200seq/insights` devolve `"timeSpan": "0408 - 2023"`.

**(b) País a partir do nome da cepa.** `:635-637`: `re.search(r'([a-zA-Z\s]+)', strain_info)` sobre `"0408151v"` devolve `"v"` como país. Em VARV-49, `"Sumatra"` aparece como país (é uma ilha da Indonésia) — o problema `C-5d` das três tabelas divergentes.

**(c) Fallback inalcançável.** `:627`:

```python
lineage = annotations.get("organism", 'Unknown') or annotations.get("source", 'Unknown')
```

Quando `organism` falta, `.get` devolve `'Unknown'`, que é *truthy*: o `or` nunca dispara. É `C-5b` da auditoria, confirmado em dado real.

**(d) Hospedeiros não normalizados.** VARV-121 reporta `uniqueHosts: 8` contando `"camel"`, `"Camelus dromedarius"`, `"Camelus dromedarius; sex: male"` e `"Camelus dromedarius; sex: female"` como quatro hospedeiros distintos.

**Número afetado.** Painéis de linha do tempo, distribuição geográfica e hospedeiro; a métrica `timeSpan`; qualquer figura de filogeografia.

**Correção.** Ver [`03-metricas.md §5`](03-metricas.md#5-metadados-derivados). Regra geral: **um metadado ausente é ausente, não é um valor inferido de outro campo.** O fallback do `strain` deve ser removido, não consertado.

---

<a id="d13"></a>

## D13 · Alta · Rótulos de táxon truncados em 10 caracteres nas árvores de IQ-TREE e RAxML

> **Estado:** metade backend **corrigida** em 2026-08-24 (M1.8 / DEC-019); metade pipeline **aberta**, bloqueada pela decisão 6. Ver *Correção*, ao fim.

**Descoberto em 2026-08-19** pelo harness de verificação de M0, ao construir o golden snapshot de `/api/tree/compare`.

**Onde.** O bloco `TaxLabels` dos Nexus gravados para IQ-TREE e RAxML-NG. Limite de nome do formato PHYLIP, que essas duas ferramentas consomem.

```
tree_dataset_final_mafft_fasttree.nexus   TaxLabels ... NC_001611.1 NC_008030.1 NC_008291.1
tree_dataset_final_mafft_iqtree.nexus     TaxLabels NC_008030. NC_008291. NC_001611. ...
```

**Correção de 2026-08-24 (M1.8).** A versão anterior deste parágrafo afirmava que só o bloco `TaxLabels` vinha truncado e que o rótulo dentro da string da árvore permanecia íntegro. **Não é o caso.** A própria árvore traz o rótulo truncado:

```
tree_dataset_final_mafft_iqtree.nexus
 Tree tree1=(NC_008030.:0.96191,NC_008291.:0.00645,(NC_001611.:0.00116,(L22579.1:...
```

Cada arquivo é, portanto, **internamente consistente** e inconsistente **com os demais**. A diferença importa: alinhar por rótulo, como a correção antes sugerida, produziria 9 táxons numa árvore de 6. A reconciliação tem de ser pelo **acesso sem versão**.

**Número afetado.** Três consequências mensuráveis:

1. **`/api/tree/compare` recusa 24 de 45 pares** em VARV-6 (53%) — todos os que envolvem IQ-TREE ou RAxML. O `taxon_namespace` da primeira árvore não acomoda os rótulos da segunda e o dendropy aborta com `Cannot add taxon with label ...: Declared number of taxa (6) already defined`.
2. **11 terminais ficam sem metadado** no `metadata.json` de VARV-6. Os acessos afetados são exatamente os truncados: `NC_001611.`, `NC_008030.`, `NC_008291.` — o rótulo não casa com nenhum registro do GenBank e o campo vira `{"error": "Acesso NC_008030. não encontrado ..."}`. **`NC_001611` é o genoma de referência de *Variola* virus**: o táxon mais importante do conjunto perde organismo, país, hospedeiro e data em metade das árvores.
3. Qualquer análise que case táxons por rótulo entre métodos herda o defeito.

**Evidência.**

```bash
grep -o "TaxLabels[^;]*" BioComp_UFF/projects/Variola_Yu_li_2007_noITRs_6seqs/out/Trees/*.nexus
pytest Backend/tests/golden/test_golden_compare.py -k d13 -v
```

Presente também em VARV-121 (4 rótulos truncados nas árvores de IQ-TREE). **Sem colisão** nos conjuntos atuais — mas dois acessos que compartilhem os primeiros 10 caracteres seriam **fundidos num único táxon**, silenciosamente.

**Correção — duas metades.**

**Metade do pipeline — aberta.** Gravar o `TaxLabels` e a string da árvore a partir dos rótulos efetivamente usados, não da matriz PHYLIP intermediária. Está no submódulo, congelado pela [decisão 6](../automation/08-ficha-de-fatos.md#6-conflito-de-protocolo-detectado-precisa-de-decisão) — ver [DEC-011](../automation/07-log-de-execucao.md).

**Metade do backend — ✅ fechada em 2026-08-24** ([DEC-019](../automation/07-log-de-execucao.md), lote M1.8). Ler artefato truncado sem perder informação:

1. **Metadado.** `iter_metadata_nodes` lia **uma árvore só** (`only_first=True`), e em VARV-6 a primeira é `clustalo_raxml` — 3 dos 6 rótulos truncados, `features` vazio. Passa a percorrer árvore a árvore guardando, por acesso sem versão, o registro mais rico, e para na primeira árvore sem táxon vazio. Recupera 1.193 *features* do GenBank que estavam no arquivo (`NC_001611.1`: 395, `NC_008030.1`: 347, `NC_008291.1`: 451).
2. **Comparação.** `extract_trees_from_nexus` deixa de receber o namespace da primeira árvore — era ele que fazia o dendropy abortar. `canonical_label_map` reconcilia truncado com íntegro pelo acesso e `align_taxon_namespaces` aplica o mapa. Os 45 pares de VARV-6 passam a comparar.
3. **Contra a fusão silenciosa.** A reconciliação é **recusada** quando dois rótulos da mesma árvore dividem o acesso, ou quando os conjuntos de acessos diferem — o cenário de colisão que este documento previa não vira fusão, vira recusa. `/api/tree/compare` devolve 400 para conjuntos de táxons diferentes.

Portões de regressão: `Backend/tests/unit/test_rotulos_truncados.py`, `Backend/tests/oracle/test_rf_rotulos_truncados.py` (RF conferida contra dendropy fora do backend), `test_d13_nenhum_taxon_perde_metadado_por_truncamento` e `test_todos_os_pares_comparam_apesar_do_truncamento`.

---

<a id="d14"></a>

## D14 · Alta · A saída da API não é reprodutível entre execuções

**Descoberto em 2026-08-19** pelo harness de M0: o mesmo snapshot divergia a cada execução.

**Onde.** Qualquer resposta cuja ordem venha de iteração sobre `set` ou `dict` de strings. Confirmado em `/api/tree/pattern-analysis` e `/api/tree/compare`.

**O problema.** O hash de `str` em Python é aleatorizado por processo. A ordem de iteração de um `set` de strings muda a cada reinício do servidor.

**Evidência.**

```
PYTHONHASHSEED=0  pattern-analysis sha=da024e23c8e7783b
PYTHONHASHSEED=1  pattern-analysis sha=973b3377d6469861
PYTHONHASHSEED=2  pattern-analysis sha=572849814247b0ae
```

Mesma entrada, mesmo código, três payloads diferentes.

**Número afetado.** Nenhum valor escalar muda — muda a **ordem** de listas de clados, padrões e táxons. O impacto é de reprodutibilidade, não de aritmética: uma figura gerada a partir do payload não é reproduzível a partir do commit e do hash de entrada, o que contradiz diretamente o item *"cada figura reproduzível por script + commit + hash"* do checklist de artefato ([`04-rigor-cientifico §6`](../automation/04-rigor-cientifico.md#6-checklist-de-artefato-para-submissão-gate-de-w7)).

**Correção.** Ordenar explicitamente antes de serializar toda coleção que vá para o payload. É a regra *"nada de dependência de ordem de iteração para resultado"* de [`04-rigor-cientifico §4`](../automation/04-rigor-cientifico.md#4-determinismo-e-reprodutibilidade), hoje violada. Fixar `PYTHONHASHSEED` **não** é correção: mascara o defeito e não sobrevive a um deploy que não controle a variável.

**Mitigação no harness:** os golden snapshots normalizam a ordem antes de comparar (`_normalizar` em `Backend/tests/conftest.py`), e a instabilidade é verificada por teste dedicado. Isso permite detectar mudança de **conteúdo** enquanto D14 não é corrigido.

---

<a id="d15"></a>

## D15 · Média · A API devolve caminho absoluto do sistema de arquivos

**Descoberto em 2026-08-19** pela varredura de dado pessoal nos snapshots (gate de A8).

**Onde.** `GET /api/tree/metadata/{project}` devolve, dentro dos metadados, mensagens de erro gravadas pelo pipeline:

```
"error": "Acesso NC_008030. não encontrado no arquivo
          /home/hilai360/Documents/Joao_IC/PhyloTreeMiner/BioComp_UFF/projects/
          test_variola_noITRs_57/out/outputs/raw_data_sequences.gb"
```

**Dois problemas.** (a) Divulgação de informação: estrutura de diretórios e **nome de usuário de terceiro** expostos a qualquer cliente. (b) O caminho aponta para **outra máquina** e para um diretório de projeto **diferente** do que está sendo consultado — é a proveniência quebrada de [`01-revisao-variola.md §1.3`](01-revisao-variola.md), agora visível pela API.

**Correção.** Sanitizar mensagens de erro na leitura dos metadados, no backend (a origem está no `metadata.json` já gravado, que só se corrige reexecutando o pipeline). Rastreado por `xfail(strict=True)` em `Backend/tests/golden/test_golden_endpoints.py`.

---

<a id="d16"></a>

## D16 · Alta · A tabela país→região é do estudo de Zika e não cobre a varíola

**Descoberto em 2026-08-19** pelos testes de unidade do núcleo científico (M0.4).

**Onde.** `Backend/src/utils/treePlot.py:4` — `REGION_MAPPING`.

A tabela tem **14 países**, todos do estudo de Zika/Singapura:

```
Brazil, Colombia, Dominican Republic, French Polynesia, Jamaica, Malaysia,
Mexico, Micronesia, Philippines, Senegal, Singapore, Thailand, USA, Uganda
```

`map_country_to_region` devolve `"Unknown"` para tudo que não estiver nessa lista.

**Número afetado.** Toda agregação regional dos experimentos de *Variola*.

**Evidência.** Sobre os 48 táxons distintos de VARV-49:

| Região atribuída | Táxons | % |
|---|---:|---:|
| `Unknown` | 47 | **97%** |
| `Americas` | 1 | 2% |

Um único país do baseline — Brazil — existe na tabela. **Bangladesh, Índia, Somália, Etiópia, Botsuana, Afeganistão, Paquistão, Sudão, Benin, Níger**: nenhum. São precisamente os países centrais da erradicação da varíola, e são o conteúdo geográfico do artigo de Li *et al.* (2007).

```bash
pytest Backend/tests/unit/test_metadados_cientificos.py -k d16 -v
```

**Interação com D12.** Os dois defeitos se compõem e se mascaram:

1. Os registros de VARV quase não têm `/country=` — apenas **8 de 392** (todos Kazakhstan).
2. O código cai no *fallback* de `strain` ([D12b](#d12)) e extrai o país por regex — que, para VARV, **funciona por acidente**, porque o campo `strain` começa com o país (`"Bangladesh 1974 (nur islam)"`).
3. Esse país correto entra em `REGION_MAPPING` e vira `Unknown`.

O resultado é que corrigir D12 sem corrigir D16 **não melhora nada**: o país passa a ser corretamente ausente em vez de corretamente presente, e a região continua `Unknown`. **Os dois têm de ser um único lote.**

**Correção.** Fonte única de verdade país→região, como manda [`../automation/04-rigor-cientifico.md §4`](../automation/04-rigor-cientifico.md#4-determinismo-e-reprodutibilidade): um arquivo de dados (`Backend/src/data/regions.json`) consumido pelo backend **e servido ao frontend**, cobrindo o domínio de fato — hoje há **três tabelas divergentes** (`REGION_MAPPING`, o `color_map` de `treePlot.py`, e o `COUNTRY_DICTIONARY` do frontend). É o `C-5d` da auditoria, agora quantificado.

---

## Ordem de ataque sugerida

Sequência que maximiza informação recuperada por unidade de risco:

1. **D4 + D5** — não exigem reexecução do pipeline bioinformático; corrigem a página Deep Analysis e o CSV. `clade_identity.py` já tem a implementação certa.
2. **D3** — recomputação sobre as árvores em disco; muda todos os números, mas de forma verificável e para melhor.
3. **D10** — desbloqueia o resultado principal do artigo. Barato: os dados já estão em `out/tmp/`.
4. **D7 + D8 + D9** — defeitos de apresentação, contidos em `app.py`.
5. **D12** — metadados; toca `C-5b` e `C-5d` da auditoria.
6. **D6** — exige nova aquisição de dados.
7. **D11** — exige instrumentar o pipeline.
8. **D1 + D2** — exigem decisão científica sobre o segundo alinhador **e** reexecução completa. É o item mais caro e é onde a decisão é do usuário, não de um agente.

**Regra de [`04-rigor-cientifico.md §3`](../automation/04-rigor-cientifico.md#3-protocolo-de-mudança-na-zona-sagrada) que vale para todos:** um lote = um item. Agrupar dois esconde qual deles moveu o número.

---

<a id="d17"></a>

## D17 · Alta · `--threads auto` do RAxML-NG: a mesma semente produz árvores diferentes, e derruba o processo em algumas máquinas

> **Estado:** ✅ **corrigido no pipeline** em 2026-08-24 (M2.5 / DEC-027): `--threads N --workers 1` no RAxML e `-seed`/`-nt N` no IQ-TREE, com o valor efetivo no manifesto de execução. As **árvores já em disco** seguem sendo as do `auto` até a reexecução.

**Descoberto em 2026-08-24**, ao investigar por que os experimentos de *Variola* excluem RAxML do `ignore_mode`.

**Onde.** A chamada do RAxML-NG no pipeline usa `--threads auto` e não fixa o esquema de paralelização.

```
raxml-ng --msa ... --model GTR+G --threads auto --seed 12345 --tree rand{10} --prefix ...
```

**Duas consequências, medidas.**

**1. O processo morre em algumas máquinas.** Em VARV-52 (`test_variola_noITRs_57_Complete`), o RAxML-NG **1.2.2** morreu com `SIGSEGV` (sinal 11) na máquina de origem (i9-13900KF, 24 núcleos, 125 GB), após escolher `5 worker(s) x 3 thread(s)`. Não é falta de memória: o alinhamento tem 52 táxons e 259 496 sítios que comprimem para **3 713 padrões distintos** (69,76% de sítios invariantes), o que põe a necessidade de memória na casa de dezenas de MB. O log mostra os *workers* #3 e #4 concluindo buscas com verossimilhança −591486,32 e −591486,30 — ele quebrou **perto do fim**, não por não conseguir calcular.

Reprodução em outra máquina (i5-11400H, 12 núcleos lógicos, 31 GB, RAxML-NG **1.1.0**), com o **mesmo arquivo PHYLIP e a mesma linha de comando**: esquema `2 worker(s) x 3 thread(s)`, **concluiu em 251 s**, verossimilhança final −591486,23. O algoritmo dá conta do dado; a autoconfiguração é que é frágil.

**2. A semente fixa não basta — o esquema de paralelização muda a árvore.** Duas execuções na mesma máquina, mesmo arquivo, **mesma semente `12345`**, variando só a paralelização:

| Execução | Esquema | Tempo | Verossimilhança final |
|---|---|---:|---|
| `--threads auto` | 2 workers × 3 threads | 251 s | −591486,234 |
| `--threads 4 --workers 1` | 1 worker × 4 threads | 276 s | −591486,233 |

**RF não enraizada entre as duas árvores: 8** — quatro bipartições de diferença em 52 táxons. As verossimilhanças são praticamente idênticas: são dois ótimos quase equivalentes, e o esquema decide em qual deles a busca para.

**Número afetado.** Toda árvore de RAxML e, por consequência, todo suporte metodológico que a inclua. E, de forma mais grave para o artefato: **o item "cada figura reproduzível por script + commit + hash" do checklist de submissão é impossível enquanto o esquema de paralelização for automático**, porque ele depende do número de núcleos da máquina. Isto se soma a [D11](#d11) (semente não fixada): fixar a semente é necessário e **não é suficiente**.

**Consequência histórica.** É o que levou `ignore_mode` a excluir `raxml` em VARV-49, VARV-52 e VARV-121, e não em Zika — a origem da incomparabilidade de `M` entre experimentos, já registrada. Como o RAxML **roda** nesses dados, a exclusão pode ser revertida: `M` volta de 4 para 5 nos conjuntos de *Variola*.

**Não confundir com o limite real de memória do Clustal Omega.** O `clustalo` foi de fato morto pelo *OOM killer* (`Non-zero return code 137`, `message 'Killed'`) no conjunto Zika479 — esse é um estouro de memória genuíno, e é a razão de existir `_isExecutableByClustalO`, que troca para MAFFT acima de 20 kb. São falhas de natureza diferente: uma é limite de recurso, a outra é defeito de autoconfiguração.

**Correção.** Fixar `--threads N --workers 1` e registrar `N`, a versão do RAxML-NG e o esquema efetivo no manifesto de execução (M2.5). O custo medido de abrir mão do `auto` é de ~10% no tempo (251 s → 276 s) neste conjunto.

**Evidência.**

```bash
grep -E "Parallelization scheme|System:|patterns" \
  BioComp_UFF/projects/test_variola_noITRs_57_Complete/out/tmp/raxml_*/*.raxml.log
raxml-ng --msa <phylip> --model GTR+G --threads auto        --seed 12345 --tree rand{10} --prefix auto
raxml-ng --msa <phylip> --model GTR+G --threads 4 --workers 1 --seed 12345 --tree rand{10} --prefix fixo
python -c "import dendropy; ..."   # symmetric_difference(auto, fixo) == 8
```

---

<a id="d18"></a>

## D18 · Alta · O modo `auto` não executa os métodos avançados, e nada avisa

**Descoberto em 2026-08-25**, na primeira execução do conjunto de validação sob o pipeline corrigido.

**Onde.** `BioComp_UFF/workflow/controller/treeBuilderController.py` — `_process_auto_mode` (~:438) contra `_process_advanced_mode` (~:459).

```python
def _process_auto_mode(...):
    for method in ['nj', 'upgma']:
        for alg in ['clustalo', 'mafft']:
            ... distance ...
            ... parsimony ...
    return trees_built, multi_trees          # e acabou

def _process_advanced_mode(...):
    advanced_methods = ['iqtree', 'fasttree', 'raxml', 'mrbayes']
    for alg in ['clustalo', 'mafft']:
        for method in ['nj', 'upgma']:
            ... distance ...
            ... parsimony ...
            for adv_method in advanced_methods:      # <- só aqui
                ...
```

**O problema.** O nome mente. `auto` sugere "escolha sozinho o que faz sentido", e o que ele faz é rodar **apenas** os métodos de distância e parcimônia. Quem executa FastTree, IQ-TREE, RAxML e MrBayes é o modo chamado `advanced`. Um usuário que peça `auto` com `ignore_mode` vazio — isto é, que peça explicitamente para não ignorar nada — recebe metade dos pipelines e **nenhum aviso**.

**Número afetado.** O denominador `M` do suporte metodológico, que é o divisor de todo número da Deep Analysis. Um conjunto rodado em `auto` e outro em `advanced` **não são comparáveis**, e nada no artefato registra a diferença além do `mode` no `config_backup.json`.

**Evidência.** Mesmo conjunto de dados (`data/Zika479_Test_large`, 20 táxons), duas execuções que só diferem no `mode`:

| Projeto | `mode` | `ignore_mode` | Árvores |
|---|---|---|---:|
| `Zika_Virus_Singapura_Large_21seq` | `auto` | vazio | **8** |
| `Zika_Virus_Singapura_Advanced_21seq` | `advanced` | vazio | **16** |

Reproduzido em 2026-08-25 com o pipeline corrigido: `mode: auto` com `ignore_mode: ["mrbayes"]` produziu as mesmas 8 árvores de distância e parcimônia, e nenhuma avançada. O log registra `Completed successfully!`.

```bash
grep -o '"mode": "[a-z]*"' BioComp_UFF/projects/*/out/outputs/config_backup.json
ls BioComp_UFF/projects/Zika_Virus_Singapura_{Large,Advanced}_21seq/out/Trees | wc -l
```

**Compõe-se com DM-11.** A auditoria já registrava que `ignore_mode` varia entre experimentos e nunca é reportado. D18 acrescenta um segundo eixo silencioso: **mesmo com `ignore_mode` idêntico**, o `mode` sozinho dobra ou reduz pela metade o número de pipelines. Os dois precisam entrar no manifesto e no *Methods*.

**Correção.** Três opções, em ordem de preferência:

1. **Renomear com honestidade** — `basic` para o que hoje se chama `auto`, e `auto` passa a ser o que roda tudo o que está disponível no PATH, pulando com aviso o que faltar. É a semântica que o nome já promete.
2. Manter os nomes e **emitir aviso explícito** ao fim da execução: *"modo `auto`: N métodos avançados não foram executados; use `advanced` para incluí-los"*.
3. No mínimo, **gravar no manifesto** a lista dos métodos efetivamente executados contra a lista dos disponíveis — o que transforma a omissão em fato registrado, ainda que não corrigido.

A opção 3 é obrigatória de qualquer forma: sem ela, `M` continua sendo um número sem proveniência.

---

<a id="d19"></a>

## D19 · Alta · Dois arquivos designam o mesmo pipeline, e um sobrescreve o outro em silêncio

**Descoberto em 2026-08-25**, na execução do conjunto de validação com todas as combinações.

**Onde.** `BioComp_UFF/workflow/stability/stability.py` — `INFERENCE_METHODS` (:39) e `TreeSet.from_directory` (:243).

**O problema.** `INFERENCE_METHODS` listava `parsimony`, mas não `nj_parsimony` nem `upgma_parsimony`. `PipelineLabel.parse` escolhe o **primeiro** sufixo que casar, então `clustalo_nj_parsimony` e `clustalo_upgma_parsimony` recebiam o mesmo rótulo, `clustalo_parsimony`. Como `TreeSet.trees` é um dicionário indexado pelo rótulo, a segunda árvore **sobrescrevia a primeira** — sem exceção, sem aviso, sem uma linha de log.

**Número afetado.** `M`, o número de pipelines, que é o denominador de todo suporte metodológico e portanto de todo padrão da Deep Analysis. No conjunto de validação, **14 árvores em disco produziam 12 pipelines**: as duas de parcimônia por NJ desapareciam e as de UPGMA eram contadas no lugar delas.

**Por que não apareceu antes.** A parcimônia está no `ignore_mode` de **todos** os experimentos de *Variola* — por causa do custo, ver [D18](#d18) e as medições de tempo. Sem árvore de parcimônia, não há colisão. Foi preciso um conjunto que rodasse todas as combinações para o defeito existir.

**Evidência.**

```
clustalo_nj_parsimony     -> clustalo_parsimony   <-- colidem
clustalo_upgma_parsimony  -> clustalo_parsimony   <--
...
pipelines: 12 | árvores em disco: 14
```

**Correção.** Aplicada em 2026-08-25:

1. `INFERENCE_METHODS` ganha `nj_parsimony`, `upgma_parsimony` e `mrbayes`.
2. `PipelineLabel.parse` passa a escolher o **sufixo mais longo** entre os que casam, e não o primeiro da tupla — a regra deixa de depender da ordem em que a constante foi escrita, que é frágil demais para decidir um denominador.
3. `TreeSet.from_directory` **levanta `ValueError`** quando dois arquivos mapeiam ao mesmo rótulo, nomeando os dois. Perder pipeline em silêncio é inaceitável; recusar é o comportamento correto.

Depois: **14 pipelines para 14 árvores**. Portão de regressão em `workflow/tests/test_rf_bipartition.py::TestRotuloDePipeline`.

---

<a id="d20"></a>

## D20 · Alta · MrBayes: dado como ausente numa máquina onde está instalado, e integrado de forma não reprodutível

**Descoberto em 2026-08-25**, ao investigar por que o MrBayes estava fora do conjunto de validação.

**O ponto de partida estava errado.** O MrBayes foi excluído do `ignore_mode` da execução de validação sob a justificativa de "não está instalado". **Está.** `MrBayes 3.2.7`, no PATH. O binário chama-se **`mb`**, como na maioria das distribuições; a detecção de versão do manifesto ([M2.5](../automation/07-log-de-execucao.md)) procurava por `mrbayes` e gravava `"mrbayes": null`. O construtor do pipeline, esse, sempre chamou `mb` corretamente — os dois lados do código discordavam sobre o nome da própria ferramenta.

**Consequência.** Toda execução registrou no manifesto que o MrBayes não existia, e o método ficou fora de `M` sem que ninguém tivesse decidido isso. Um método some do delineamento por causa de um nome de binário.

### Os defeitos de integração

Inspeção de `mrbayes_constructor` (`BioComp_UFF/workflow/tree_construction/builder.py:357`):

**1. O diretório de trabalho é relativo, e depende do nome do repositório.**

```python
tmp_dir = os.path.join(
    (os.path.dirname(output_path_tree).split('/PhyloTreeMiner/')[-1]).split('/Trees')[0],
    'tmp', f'mrbayes_{base_name}')
```

Todos os outros construtores usam `os.path.dirname(output_path_tree).split('/Trees')[0]`, que preserva o caminho absoluto. Este divide pelo **nome do diretório do repositório**, e o resultado é um caminho **relativo**:

```
MrBayes : BioComp_UFF/projects/X/out/tmp/mrbayes_t     (relativo ao cwd!)
RAxML   : /home/.../BioComp_UFF/projects/X/out/tmp/raxml_t
```

Os arquivos do MrBayes vão parar onde o processo foi lançado, não dentro do projeto. E se o diretório não se chamar `PhyloTreeMiner`, o `split` não casa e o comportamento muda — o repositório **já foi renomeado** de `FPM-Tree` para `PhyloTreeMiner`, então isso já quebrou uma vez.

**2. Não há semente. A análise não é reprodutível, nem em princípio.**

O MCMC é estocástico e o MrBayes aceita `set seed=` e `set swapseed=`. O script gerado não usa nenhum dos dois. Duas execuções da mesma entrada produzem árvores diferentes, e nada no artefato registra por quê — é [D11](#d11) e [D17](#d17) de novo, agora num método bayesiano, onde o efeito é maior porque a cadeia inteira diverge.

**3. `ngen=1000000` fixo no código, `burnin=250` fixo, e nenhuma relação entre os dois.**

```python
def mrbayes_constructor(self, alignment, output_path_tree, generations=1000000):
    ...
    mcmc ngen={generations} printfreq=1000 samplefreq=100
    sumt burnin=250
```

Com `ngen=10⁶` e `samplefreq=100` saem 10 000 amostras; `burnin=250` descarta **2,5%**. A prática usual é 25%. Pior: `burnin` é um número absoluto de amostras e `ngen` é parametrizável — mudar `ngen` sem mudar `burnin` altera silenciosamente a fração descartada. Nenhum dos dois chega pela configuração do projeto.

**4. Convergência nunca é verificada.**

O MrBayes emite o *average standard deviation of split frequencies* (ASDSF) e os ESS em `sump`/`sumt`. **Uma árvore consenso de uma cadeia que não convergiu não significa nada** — e o pipeline lê o `.con.tre` sem olhar para nenhum diagnóstico. Este é o item mais grave: é o único método do conjunto cuja saída pode ser silenciosamente sem sentido mesmo com o processo terminando em código 0.

**5. Detalhes.** `stdin=open(script_path, 'r')` vaza o descritor (sem `with`); `timeout=3600` fixo, sem relação com `ngen`; `nst=6 rates=gamma` (GTR+G) fixo, sem correspondência com o modelo usado pelos outros métodos, o que é uma diferença de modelo não declarada entre pipelines.

### Correção

| # | O quê | Onde |
|---|---|---|
| 1 | detecção pelo binário `mb`, com a versão lida do banner | ✅ `manifest.py` — feito em 2026-08-25 |
| 2 | `tmp_dir` absoluto, pela mesma regra dos outros construtores | `builder.py:364` |
| 3 | `set seed=` e `set swapseed=` a partir de `random_seed` | `builder.py` |
| 4 | `ngen`, `samplefreq`, `nchains`, `nruns` e fração de `burnin` vindos da configuração | `builder.py` + `reproducibility_settings` |
| 5 | **ler o ASDSF e recusar a árvore** se não convergiu, em vez de devolvê-la | `builder.py` |
| 6 | modelo declarado e coerente com os demais métodos | `builder.py` |

Os itens 2 a 6 são o marco [M7](../automation/10-marcos-e-metas.md), que trata de todos os métodos avançados e não só deste.

---

<a id="d21"></a>

## D21 · Alta · `-nt N` do IQ-TREE: duas execuções idênticas produzem árvores diferentes

> **Estado:** ⚠️ **aberto**. Medido em 2026-08-26 ([DEC-046](../automation/07-log-de-execucao.md)). O pipeline usa `-nt 4`, e é essa a configuração de todas as árvores de IQ-TREE em disco.

**Descoberto em 2026-08-26**, ao comparar duas execuções do conjunto de validação **na mesma máquina** para conferir que a instrumentação do manifesto não tinha alterado nada. Doze dos catorze pipelines saíram idênticos; **os dois de IQ-TREE, não**.

**Onde.** A chamada do IQ-TREE fixa a semente e o número de threads — o que [D17](#d17) prescreveu — e isso **não basta**:

```
iqtree3 -s ... -m GTR+G -bb 1000 -seed 12345 -pre ... -nt 4
```

**A medição.** Três repetições, mesmo arquivo, mesma linha de comando, mesma máquina, mesma versão (IQ-TREE 3.1.3):

| Configuração | Repetições | Topologias distintas | RF entre elas |
|---|---:|---:|---:|
| `-nt 4` | 3 | **3** | **2** |
| `-nt 1` | 3 | **1** | 0 |
| RAxML-NG `--threads 4 --workers 1` (controle) | 3 | **1** | 0 |

As verossimilhanças finais diferem na terceira casa decimal (−21882,207 · −21882,207 · −21882,203): são ótimos quase equivalentes, e a ordem em que as reduções de ponto flutuante chegam decide em qual deles a busca para. Com `-nt 1` não há redução paralela, e o resultado é bit a bit reprodutível.

**Por que o controle importa.** O RAxML-NG, na mesma máquina e com 4 threads, é **determinístico** — porque `--workers 1` serializa a busca. É a prova de que o problema não é a máquina nem o número de núcleos em si: é a **ausência, no IQ-TREE, de um equivalente ao `--workers 1`**. D17 corrigiu a ferramenta onde o controle existia e deixou passar a outra.

**Número afetado.** Toda árvore de IQ-TREE, e por arrasto tudo que se deriva do conjunto de árvores: itens do FPMax, clados canônicos, bipartições universais. Medido no conjunto de validação, entre duas execuções idênticas:

| Medida | Execução A | Execução B |
|---|---:|---:|
| itemsets do FPMax | 38 | **34** |
| clados canônicos | 47 | **43** |
| bipartições universais | 6 | **7** |

**Nenhuma das duas está errada.** É o mesmo experimento devolvendo números diferentes — que é precisamente o que o checklist de submissão proíbe no item "cada figura reproduzível por script + commit + hash".

**Interação com D17 e com a atribuição de causa.** Este defeito **corrige uma conclusão anterior**: [DEC-045](../automation/07-log-de-execucao.md) atribuiu à *versão do inferidor* toda a divergência entre a máquina de desenvolvimento e a de validação. Para o RAxML-NG a atribuição continua de pé — ele é determinístico na mesma máquina, logo a diferença entre máquinas é a versão. Para o **IQ-TREE, não**: a divergência era ruído entre execuções, e teria aparecido igual sem trocar de máquina nem de versão.

**Correção — é decisão do usuário, não de um agente**, porque muda árvore publicada:

1. **`-nt 1`**, comprando reprodutibilidade com tempo. No conjunto de validação o IQ-TREE custa 4-5 s; falta medir o custo em *Variola*, onde o alinhamento tem ~250 kb.
2. **Manter `-nt N` e declarar o método como não reprodutível**, reportando a árvore como uma amostra de um conjunto de ótimos equivalentes — o que exigiria reportar também a variação entre repetições.
3. **`-nt N` com repetições e consenso**, o mais caro e o mais defensável.

Enquanto não houver decisão, o manifesto passa a registrar `-nt` efetivo em `tools_invoked` ([DEC-046](../automation/07-log-de-execucao.md)), de modo que a irreprodutibilidade fica pelo menos **declarada** em vez de invisível.

**Evidência.**

```bash
# três repetições, mesma semente, mesma entrada
for R in 1 2 3; do
  iqtree3 -s <phylip> -m GTR+G -bb 1000 -seed 12345 -pre r$R -nt 4 -redo
done
md5sum r{1,2,3}.treefile      # três hashes distintos
# o mesmo com -nt 1           # um hash só
```

---

<a id="d22"></a>

## D22 · Alta · Status e duração são deduzidos por leitura de log, e erram em silêncio

> **Estado:** ⚠️ **aberto**. Caracterizado em 2026-08-26 ([DEC-047](../automation/07-log-de-execucao.md)) sobre os 21 projetos em disco. Nenhum número deste defeito chegou a manuscrito — mas [M7.7](../automation/10-marcos-e-metas.md) é a curva de custo, e é exatamente daí que ela tiraria o tempo.

**Onde.** `Backend/src/app.py` — `get_projects()` (duração), `get_projects_status()` (status), `get_projects_details()` (etapa e progresso) e `stream_workflow_output()` (tempo real). Os quatro derivam o estado da execução **relendo o arquivo de log**, quando o `manifest.json` gravado ao lado já traz `run_id`, `started_at_utc` e `finished_at_utc`.

### O que foi medido

Sonda replicando a lógica dos três endpoints sobre `BioComp_UFF/projects/**` — 21 projetos.

**1. `idle` é o balde de "não consegui decidir".** O status sai de uma busca por substring, e o `else` final devolve `idle` — o mesmo valor de "projeto nunca executado". A UI o renderiza como **"Waiting"**.

| Projeto | Status reportado | O que de fato é |
|---|---|---|
| `Zika_Virus_Singapura_Large_480seq_ADVANCED` | **idle** ("Waiting") | rodou **8 h 43 min** e parou em `Construction of Subtrees.` |
| `test` | **idle** ("Waiting") | tem uma execução **concluída** de 262 s; o log mais recente é de outra, de 39 s |

Um projeto que rodou quase nove horas e morreu no meio é indistinguível, na interface, de um que nunca foi executado.

**2. A duração não é a duração de execução nenhuma.** O nome do log é `log_setup_{ano}_{mês}_{dia}.log` e `logging.basicConfig` abre em modo *append*: **duas execuções no mesmo dia caem no mesmo arquivo**. A duração é `primeiro timestamp → último timestamp`, de modo que ela cobre as duas execuções **mais o intervalo ocioso entre elas**.

| Projeto | Duração reportada | Última execução real | Erro |
|---|---:|---:|---:|
| `Teste_Neo4j` | **1 960 s** | 396 s | **5,0×** |
| `Zika_Virus_Singapura_Large_480seq` | **26 428 s** | 11 942 s | **2,2×** |

Nos dois casos o log contém **dois** `Completed successfully!`. Seis dos 21 projetos têm mais de um `.log`, e `max(log_files, key=os.path.getmtime)` escolhe um deles por data de modificação — que não é a data da execução que produziu os artefatos em disco.

**3. A duração vira `None` sem avisar.** Se a **última linha** do log não casar com o regex de timestamp, `duration` fica `None` e o campo simplesmente não aparece. Ocorre hoje em `test_variola_noITRs`, cujo log termina num *traceback*. É o mesmo padrão da [regra 5](../automation/README.md) do projeto: ausência silenciosa no lugar de "indefinido, e eis por quê".

**4. O progresso é estruturalmente sempre 0 %.** Nos 21 projetos, sem exceção. Não é bug de borda; são três caminhos mortos ao mesmo tempo:

| Caminho | Regex | Por que nunca casa |
|---|---|---|
| `/projects/details` | `(\d+)\s*%\s*\|` | procura barra de `tqdm` no `.log`; o `tqdm` escreve em **stderr** e o log recebe só `logging` — **0 ocorrências** de `%\|` no `.log` e no `output_log.txt` |
| WebSocket, stdout | `Progress:\s*(\d+)%` | **nada no pipeline emite essa string** — 0 ocorrências no código e em todos os logs |
| WebSocket, stdout | `STEP:\s*(.*)` | os `STEP:` são `logging.info`, e `logging.basicConfig(filename=…)` manda tudo **para o arquivo**; com `log_file: true` o `stdout` do filho ainda é redirecionado para `output_log.txt`. O cano de stdout que o backend lê chega **vazio** |

**5. Toda linha de stderr é rotulada `ERROR`.** `stream_workflow_output` transmite o ramo de stderr com `"level": "ERROR"` fixo. Como o `tqdm` escreve em stderr, **a barra de progresso de uma execução saudável aparece ao usuário como uma enxurrada de erros**.

**6. O dicionário de etapas é código morto e incompleto.** `Frontend/.../projectsTableView.jsx` define `progress_percent` com 6 etapas mapeadas e ~30 linhas comentadas, e **nunca o referencia**. Se fosse ligado, seria incompleto: um log real de `mode: advanced` tem **14 strings de `STEP:` distintas**, e nenhum dos métodos avançados — IQ-TREE, FastTree, RAxML-NG, MrBayes — está entre as 6 mapeadas.

### Por que isto é um defeito de resultado, e não só de interface

- **`completed` é uma busca por substring de `Completed successfully!`.** É precisamente a string que [D18](#d18) mostrou ser impressa pelo `mode: auto` **depois de rodar só distância e parcimônia**. O status "concluído" da aplicação herda a mentira do modo `auto`, e não distingue "concluiu 14 pipelines" de "concluiu 2".
- **`failed` é a presença de `ERROR` em qualquer lugar do log** — inclusive de uma execução anterior anexada ao mesmo arquivo, e inclusive de um erro do qual o pipeline se recuperou.
- **A duração alimentaria [M7.7](../automation/10-marcos-e-metas.md)**, a curva de custo por método em função de `n` e de colunas distintas. Uma curva ajustada sobre números com 5× de erro é pior que nenhuma curva, porque parece medida.

**Sem cobertura.** Não há um único teste em `Backend/tests/` para `/projects/status`, `/projects/details` ou o campo `duration` de `/projects`.

### Correção

A fonte autoritativa **já existe e é ignorada**. Desde M2.5 o `manifest.json` grava `run_id`, `started_at_utc`, `finished_at_utc`, ambiente, sementes e — desde [DEC-046](../automation/07-log-de-execucao.md) — a linha de comando de cada ferramenta invocada, com a saída que produziu. Deduzir por log o que está gravado de forma estruturada ao lado é reconstruir, com regex, um fato que já foi declarado.

| # | O quê | Onde |
|---|---|---|
| 1 | Estado e duração vindos do `manifest.json`, não do log. `finished_at_utc` ausente com processo vivo = **em execução**; ausente sem processo = **interrompido** | `app.py` |
| 2 | Estado como **enumeração fechada**, com `desconhecido` distinto de `nunca executado`. `idle` deixa de ser o `else` | `app.py` + a UI |
| 3 | `duration` indefinido devolve **`null` com motivo**, nunca some | `app.py` |
| 4 | **Um manifesto por execução**, com `run_id` no nome — hoje duas execuções do mesmo dia se fundem num log e num manifesto | `manifest.py` |
| 5 | Progresso por **etapas concluídas / etapas planejadas**, do manifesto, em vez de barra de `tqdm` raspada de stderr | `app.py` + a UI |
| 6 | `stream_workflow_output` deixa de rotular stderr como `ERROR` por padrão | `app.py` |
| 7 | Apagar `progress_percent`, que é código morto | `projectsTableView.jsx` |
| 8 | Testes dos três endpoints sobre logs sintéticos: log truncado, duas execuções anexadas, log sem timestamp final, projeto sem log | `Backend/tests/` |

O item 4 é pré-requisito dos demais: enquanto duas execuções compartilharem arquivo, **nenhuma leitura consegue separá-las** — nem a do log, nem a do manifesto.

**Evidência.**

```bash
python scratchpad/sonda_status.py          # replica os 3 endpoints sobre os 21 projetos
                                           # → progresso 0% em 21 de 21
                                           # → Zika_480_ADVANCED: idle, 31 407 s
                                           # → test: idle, 39 s (há execução completa de 262 s)
grep -c "Completed successfully!" .../Teste_Neo4j/out/outputs/log_setup_2026_2_9.log   # → 2
grep -rc "Progress:" BioComp_UFF/workflow/ BioComp_UFF/projects/*/out/outputs/*.log    # → 0
grep -c "%|" .../out/outputs/log_setup_2026_8_26.log .../out/outputs/output_log.txt    # → 0 e 0
```
