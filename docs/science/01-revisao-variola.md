# Revisão científica — experimentos de *Variola* no PhyloTreeMiner

[← Ciência](README.md) · Data: 2026-08-19 · Escopo: `BioComp_UFF/projects/Variola_*`, `test_variola_noITRs_57_Complete`, página **Deep Analysis**, grafo Neo4j em `localhost:7474`

> **Aviso de escopo.** Este é um parecer metodológico produzido a partir dos artefatos já em disco. Não substitui a revisão do orientador nem a de pares. Nenhuma árvore foi reinferida: todas as reanálises são recomputações sobre as mesmas árvores, alinhamentos e logs que a ferramenta produziu.

---

## Sumário executivo

O programa de pesquisa do PhyloTreeMiner — *usar mineração de itens maximais frequentes sobre um conjunto de pipelines para separar o sinal filogenético reprodutível do artefato metodológico* — **é válido e tem um resultado defensável nos dados atuais**. Mas os números que a ferramenta reporta hoje **não são esses**, por quatro defeitos que atuam antes de qualquer interpretação:

| # | Defeito | Efeito no número |
|---|---|---|
| **D1** | O braço "clustalo" nunca executou o Clustal Omega | O fator *alinhador* é vazio; 4 dos 8 pipelines são cópias |
| **D2** | Denominador do suporte conta as cópias | Todo suporte reportado tem 2× o denominador real |
| **D3** | Clados enraizados comparados entre árvores enraizadas e não enraizadas | Discordância superestimada em até 100% |
| **D4** | `support` no CSV do FPMax é o limiar da varredura, não o suporte | Mesmo padrão exibido como frágil **e** robusto |

Corrigidos os quatro, emerge o resultado que sustenta o artigo:

> **O bootstrap mede robustez amostral e não prediz robustez metodológica.** Em VARV-121, 86 dos 118 ramos internos do consenso IQ-TREE têm UFBoot = 100 — o máximo possível — e apenas **35 deles (40,7%)** sobrevivem à troca do método de inferência; **40 (46,5%)** são recuperados por apenas 2 dos 4 métodos. A correlação de Pearson entre UFBoot e suporte metodológico é de **0,27 a 0,44** nos quatro experimentos.

E a implicação assimétrica, que é o que torna a métrica útil:

> **UFBoot alto é necessário, não suficiente.** Em 4 de 4 experimentos, **nenhum** ramo com UFBoot ≥ 95 foi recuperado por um único pipeline (0 de 34, 0 de 38, 0 de 94, 0 de 1). O bootstrap elimina o idiossincrático; a mineração entre pipelines é que certifica o robusto.

O núcleo metodologicamente invariante, por sua vez, **reproduz a literatura**: monofilia de VARV e clado P-II (África Ocidental + América do Sul) a 100% de suporte em três conjuntos independentes.

---

## 1. O que foi realmente executado

### 1.1 Os quatro experimentos

Há sete diretórios de Variola em `BioComp_UFF/projects/`, mas apenas **quatro experimentos distintos**. Três pares são byte a byte idênticos (mesmo digest do conjunto de árvores) — são renomeações, não réplicas:

| Experimento | Diretório canônico | Duplicata | Táxons | Árvores em disco |
|---|---|---|---|---|
| **VARV-49** | `Variola_Yu_li_2007` | `teste52` | 49 | 8 |
| **VARV-52** | `test_variola_noITRs_57_Complete` | — | 52 | 9 |
| **VARV-121** | `Variola_Yu_li_2007_200seq` | `variola_200seq` | 121 | 8 |
| **VARV-6** | `Variola_Yu_li_2007_noITRs_6seqs` | `test_variola_noITRs_57` | 6 | 10 |

`test_variola_noITRs` (0 árvores) é uma execução abortada.

**VARV-52 nunca foi analisado.** Não aparece em `DEFAULT_EXPERIMENTS` de `workflow/stability/case_study.py`, não tem diretório `out/outputs/stability/`, e não é mencionado em lugar nenhum da documentação. É o quarto ponto de replicação — e, como se verá em §4, ele **replica o resultado principal**.

### 1.2 O rótulo "noITRs" é falso

`VARV-6` e `VARV-52` têm "noITRs" no nome do diretório, mas:

- seus `config_backup.json` apontam para `data/SMALL_li_2007_replication-RetMax200-**ITRs**` e `data/workflow_dataAcquisition_li_et_al_2007_replication-RetMax200-**ITRs**`;
- não existe nenhum diretório de dados sem ITR em `BioComp_UFF/data/`;
- os comprimentos de sequência são de genoma completo (185–198 kb), não de genoma truncado nas repetições terminais invertidas.

**As ITRs estão presentes em todos os quatro experimentos.** Isso importa: as ITRs de ortopoxvírus são regiões repetidas, de comprimento variável entre isolados e propensas a alinhamento espúrio. Elas são a fonte mais provável dos 21–35% de colunas com mais de 50% de *gap* medidos em §2.2. Um experimento *de fato* sem ITRs seria o controle mais informativo que este conjunto de dados não tem.

### 1.3 A proveniência dos nomes está quebrada

Nenhum `config_backup.json` corresponde ao diretório em que está:

| Diretório | `project_name` no config |
|---|---|
| `Variola_Yu_li_2007` | `teste52` |
| `Variola_Yu_li_2007_200seq` | `variola_200seq` |
| `Variola_Yu_li_2007_noITRs_6seqs` | `test_variola_noITRs_57` |

Os `output_path` apontam para `/home/hilai360/Documents/Joao_IC/...`, uma máquina que não é esta. Os diretórios foram copiados e renomeados à mão. **Para uma submissão isso é fatal**: não há como um revisor ligar uma figura ao comando que a produziu. Ver [`04-rigor-cientifico.md §4`](../automation/04-rigor-cientifico.md#4-determinismo-e-reprodutibilidade) — o manifesto de execução ali especificado é exatamente o que falta.

---

## 2. Os dados

### 2.1 Composição taxonômica — o dataset não é de *Variola*

A consulta de aquisição (`RetMax200`) não é restrita taxonomicamente. O que ela trouxe:

| Experimento | VARV | Outros ortopoxvírus | **Fora de *Orthopoxvirus*** |
|---|---|---|---|
| VARV-49 | 45 | CMLV 2, CPXV 1, TATV 1 | — |
| VARV-52 | 48 | CMLV 2, TATV 1 | **CROC 1** |
| VARV-121 | 77 | MPXV 23, CMLV 11, VACV 2, CPXV 2, BPXV 1, TATV 1 | **CROC 3, YOKA 1** |
| VARV-6 | 4 | TATV 1 | **CROC 1** |

- **CROC** = *Crocodylidpoxvirus* (Nile crocodilepox `NC_008030`, Saltwater crocodilepox `MG450915`/`MG450916`). Gênero distinto dentro de *Chordopoxvirinae*, divergente dos ortopoxvírus em escala de centenas de milhões de anos de hospedeiro. **Um alinhamento nucleotídico genoma-inteiro entre VARV e crocodilepox não tem interpretação posicional.**
- **YOKA** = Yoka poxvirus (`NC_015960`), isolado de mosquito, também fora de *Orthopoxvirus*.

**VARV-49 é o único experimento com delineamento defensável**: 45 VARV com um grupo externo apropriado (camelpox, cowpox, taterapox — os parentes mais próximos conhecidos de VARV). É a replicação de Li *et al.* (2007) que o nome do diretório promete.

**VARV-121 não é um estudo de varíola.** Com 23 MPXV, 11 CMLV e 4 táxons fora do gênero, é um estudo heterogêneo de *Chordopoxvirinae* em que VARV é 64% da amostra. Qualquer figura de filogeografia da varíola derivada dele está errada: o país mais frequente é a República Democrática do Congo, com 25 sequências — que são o clado de MPXV, não varíola.

**VARV-6 é degenerado.** Seis táxons, dos quais um crocodilepox. Uma árvore de 6 folhas tem 3 bipartições informativas. Não há delineamento aqui; o experimento não é capaz de sustentar afirmação alguma sobre estabilidade e deve ser retirado do artigo ou reapresentado explicitamente como caso-limite.

### 2.2 Qualidade do alinhamento

Medido diretamente sobre `out/Align/dataset_final_mafft.aln` (§2 do script de auditoria):

| Experimento | Comprimento do alinhamento | Fração de *gaps* | Colunas >50% *gap* | Informativas p/ parcimônia |
|---|---|---|---|---|
| VARV-49 | 235.955 | 0,203 | 21,2% | **2,31%** |
| VARV-121 | 283.874 | 0,330 | 34,5% | **32,58%** |
| VARV-6 | 250.517 | 0,248 | 25,7% | 0,43% |

Dois sinais de alerta:

1. **Inflação de comprimento.** Genomas de ~186 kb produzem alinhamentos de 236–284 kb — 27% a 53% de colunas inseridas. Em VARV-121, mais de um terço das colunas tem maioria de *gaps*: são colunas que existem porque três crocodilepox e um Yoka não alinham com os ortopoxvírus.
2. **A fração informativa de VARV-121 (32,6%) é biologicamente implausível para varíola** (identidade intraespecífica > 98%). Ela mede a distância entre gêneros, não a variação dentro de VARV. É o sintoma quantitativo da contaminação taxonômica.

O IQ-TREE confirma independentemente o número de VARV-49: *"49 sequences with 235955 columns, 2461 distinct patterns; 5378 parsimony-informative, 7404 singleton sites, 223173 constant sites"* — 2,28% contra os 2,31% medidos aqui.

O próprio FastTree registra o problema no log:

```
WARNING! This alignment consists of closely-related and very-long sequences.
WARNING! FastTree (or other standard maximum-likelihood tools)
may not be appropriate for aligments of very closely-related sequences
like this one, as FastTree does not account for recombination or gene conversion
```

Esse aviso está no artefato e **não aparece em lugar algum da interface**. Ver [D9](02-defeitos-que-alteram-resultado.md#d9).

### 2.3 A estratégia de alinhamento

O log de execução (`out/outputs/log_setup_*.log`) mostra:

```
WARNING - ALERTA: Sequência gigante detectada (185855 pb). O limite seguro para o ClustalO é 20000 pb.
          Para evitar o OOM Killer, alterando a rota dinamicamente: align_method -> 'mafft'.
INFO    - Estratégia MAFFT: FFT-NS-1/2 (Auto)
INFO    - Executando comando: mafft --thread 16 --auto .../dataset_final_NoPipe
```

`mafft --auto` sobre 49 × 186 kb seleciona **FFT-NS-1/FFT-NS-2** — as estratégias progressivas mais rápidas, sem refinamento iterativo. Para um alinhamento genômico de poxvírus com ITRs, é a escolha de menor acurácia disponível. Não é errado *per se*, mas é uma decisão metodológica tomada por um heurístico interno, não registrada como parâmetro, e não declarada em lugar nenhum.

---

## 3. Os quatro defeitos que invalidam os números atuais

### D1 — O fator "alinhador" é vazio

`BioComp_UFF/workflow/controller/treeBuilderController.py:868-892` (`_isExecutableByClustalO`) rejeita o Clustal Omega para sequências acima de 20.000 pb e devolve `"mafft"`. O chamador (`_get_alignment`, mesmo arquivo, linha 898) grava o resultado **no caminho de saída original** — `dataset_final_clustalo.aln` — e as árvores derivadas mantêm o nome `tree_dataset_final_clustalo_*`.

Evidência (§1 do script):

```
VARV-49    alinhamentos IDÊNTICOS  (11.8 MB)
           árvore fasttree         IDÊNTICA (byte a byte)
           árvore iqtree           difere
           árvore nj_distance      IDÊNTICA (byte a byte)
           árvore upgma_distance   IDÊNTICA (byte a byte)
```

Idêntico nos quatro experimentos de Variola. E o contraste é limpo:

```
Controle Zika (genomas ~10,6 kb, abaixo do limite):
ZIKV-478   alinhamentos DISTINTOS
ZIKV-20    alinhamentos DISTINTOS
ZIKV-11    alinhamentos DISTINTOS
```

**Consequências.**

1. A afirmação *"o alinhador não afeta a topologia"* (`factor_effects.aligner.mean = 0.0` em `summary.json`) é uma tautologia: compara um arquivo consigo mesmo.
2. O par `clustalo_iqtree` / `mafft_iqtree` é a única exceção, e por um motivo instrutivo: **é a mesma entrada processada duas vezes pelo IQ-TREE.** A diferença observada — RF = 0,000 em VARV-49 e **0,017** em VARV-121 — não é efeito de alinhador; é o **ruído de reexecução do IQ-TREE**. Isso é um controle acidental valioso: ele estabelece que, em VARV-121, ~1,7% das bipartições não são reprodutíveis nem com entrada idêntica, e portanto **nenhuma diferença topológica abaixo de ~2% de RF é interpretável** nesses dados.
3. O `Seed: 97376 (Using SPRNG)` do log do IQ-TREE foi gerado pela própria ferramenta, não fixado pelo pipeline. Ver [D11](02-defeitos-que-alteram-resultado.md#d11).

**O efeito real do alinhador, medido onde ele existe** (§7 do script, projeto Zika de 478 táxons, onde o Clustal Omega de fato executou):

| Par (mesmo método, alinhador diferente) | RF normalizada |
|---|---|
| `nj_distance` | 0,0021 |
| `upgma_distance` | 0,0945 |
| `fasttree` | 0,2038 |
| `raxml` | 0,3025 |
| `iqtree` | 0,3298 |

Média 0,187; máximo 0,330. **O alinhador não é desprezível — é o segundo maior fator.** E há aqui um resultado próprio, que vale mais que o achado nulo que se pretendia reportar:

> A sensibilidade ao alinhador **depende do método de inferência**. Métodos de distância são quase imunes (NJ: RF = 0,002) porque a distância par a par integra sobre todo o alinhamento e média o erro local; métodos baseados em caracteres (RAxML, IQ-TREE: RF ≈ 0,30–0,33) consomem padrões de sítio diretamente e herdam o erro de alinhamento. **A incerteza de alinhamento se propaga para topologias de máxima verossimilhança e é amortecida pela sumarização em distância.**

Essa interação alinhador × inferência é uma afirmação testável, quantificada, e ausente da literatura de forma sistemática. É candidata a resultado principal — mas só é mensurável em dados onde ambos os alinhadores executem, isto é, **fora dos experimentos de Variola** enquanto o limite de 20 kb existir.

### D2 — Denominador do suporte inflado por 2×

Como metade das árvores é cópia, o suporte reportado conta cada pipeline duas vezes. O `summary.json` de VARV-49 declara `n_pipelines: 8` e `universal_clades: 15`.

Recomputado com os pipelines efetivos (§4 do script):

| | Declarado | Efetivo |
|---|---|---|
| VARV-49 | 15 clados em 8/8 | 15 clados em **4/4** |
| VARV-121 | 31 clados em 8/8 | 32 clados em **4/4** |
| VARV-6 | 0 clados em 10/10 | 0 clados em **5/5** |

O *conjunto* de clados universais está certo — duplicatas não acrescentam nem removem clados. O que está errado é a **força da afirmação**: "recuperado por 8 pipelines independentes" tem peso retórico diferente de "recuperado por 4". Em VARV-121 há um efeito adicional: a segunda execução do IQ-TREE introduz 2 clados espúrios e impede 1 clado de ser universal — 269 → 267 clados distintos, 31 → 32 universais.

### D3 — Enraizamento contamina a medida de discordância

`workflow/stability/stability.py:300-306` extrai clados como conjuntos de descendentes de uma árvore **enraizada**. Mas o pipeline mistura duas classes de árvore:

| Método | Grau da raiz no Newick | Natureza |
|---|---|---|
| FastTree, IQ-TREE, RAxML, NJ | 3 | **não enraizada**, escrita com raiz trifurcante (convenção) |
| UPGMA | 2 | **enraizada** (ultramétrica, relógio molecular imposto) |

Comparar conjuntos de clados enraizados entre essas duas classes penaliza a **posição da raiz**, não a topologia. Recomputando com bipartições canônicas (§3 do script):

| Experimento | Par | RF enraizada | RF bipartição | Redução |
|---|---|---|---|---|
| VARV-49 | fasttree vs iqtree | 0,0851 | **0,0435** | **−48,9%** |
| VARV-121 | fasttree vs iqtree | 0,1765 | **0,0508** | **−71,2%** |
| VARV-6 | fasttree vs iqtree | 0,7500 | **0,0000** | **−100%** |
| VARV-6 | iqtree vs raxml | 0,7500 | **0,0000** | **−100%** |
| VARV-6 | raxml vs upgma | 0,8750 | 0,3333 | −61,9% |
| VARV-49 | fasttree vs nj | 0,5532 | 0,5652 | +2,2% |
| VARV-121 | fasttree vs nj | 0,6218 | 0,6271 | +0,8% |

O padrão é nítido e **seletivo**:

- **Dentro da família baseada em caracteres**, a RF enraizada infla a discordância maciçamente. Em VARV-6, FastTree, IQ-TREE e RAxML produzem a **mesma topologia não enraizada** e são reportados como 75% discordantes.
- **Entre paradigmas** (caractere × distância), a RF de ~0,55–0,63 é real; o enraizamento não a explica.

Portanto: a afirmação "métodos de inferência discordam muito" é verdadeira **entre paradigmas** e substancialmente exagerada **dentro do paradigma de máxima verossimilhança**. E o resultado corrigido é mais forte, não mais fraco: métodos ML concordam em ~95% das bipartições em varíola.

Consequência prática mais séria: o `summary.json` de VARV-6 reporta **0 clados universais** — apresentado como instabilidade extrema. Sobre bipartições há **1 bipartição universal em 5/5** e um reticulado interpretável (3 bipartições compartilhadas por fasttree+iqtree+raxml). A conclusão "instabilidade total" é, em boa parte, artefato de enraizamento.

### D4 — A coluna `support` do FPMax não é o suporte

`BioComp_UFF/workflow/subtree_mining/miner.py:142-156`:

```python
for support in np.arange(0.1, 1.1, 0.1):
    result_fpmax = fpmax(df, min_support=support, use_colnames=True)
    result_fpmax['support'] = support          # <-- sobrescreve o suporte real
    all_results_fpmax = pd.concat([all_results_fpmax, result_fpmax], ignore_index=True)
```

O `mlxtend.frequent_patterns.fpmax` devolve o suporte **observado** de cada itemset. A linha 147 o sobrescreve com o **limiar da iteração**, e a varredura concatena as dez iterações. Como um itemset maximal em um limiar continua maximal em todos os limiares menores em que é frequente, **cada itemset aparece 2 a 3 vezes com "suportes" diferentes**.

Auditoria (§5 do script):

| Experimento | Linhas no CSV | Itemsets distintos | Com >1 "suporte" | Nas **duas** tabelas da Deep Analysis |
|---|---|---|---|---|
| VARV-49 | 16 | **7** | 7 de 7 | **2** |
| VARV-121 | 20 | **11** | 7 de 11 | **2** |
| VARV-6 | 12 | **6** | 6 de 6 | **1** |

A página **Deep Analysis** classifica com `support <= rare_threshold` → *method-sensitive signature* e `support >= robust_threshold` → *topologically robust* (`Backend/src/app.py:1668-1672`), com os limiares 0,3 / 0,4 que o front envia. Resultado direto: **o mesmo conjunto de clados é exibido simultaneamente como assinatura frágil de método e como padrão topologicamente robusto.** Em VARV-49 isso acontece com os padrões de 15 e de 18 itens.

O suporte verdadeiro é recuperável — é o **maior** limiar em que o itemset aparece, arredondado à grade de 1/M:

| Experimento | \|I\| | `support` no CSV | Suporte real |
|---|---|---|---|
| VARV-49 | 1 | 0,6 e 0,7 | **6/8** |
| VARV-49 | 18 | 0,3 / 0,4 / 0,5 | **4/8** |
| VARV-49 | 15 | 0,3 / 0,4 / 0,5 | **4/8** |
| VARV-49 | 47, 47, 47, 48 | 0,1 e 0,2 | **2/8** |

Os quatro itemsets de 47–48 itens com suporte 2/8 são exatamente os **quatro pipelines reais** — cada um aparece em duas árvores por causa de D1. **A duplicação do braço clustalo está visível na própria saída do FPMax**, e não foi percebida.

---

## 4. O que os dados de fato mostram

Tudo nesta seção usa pipelines efetivos (D1/D2 corrigidos) e bipartições (D3 corrigido).

### 4.1 O perfil de suporte

| Experimento | Bipartições distintas | 4/4 (universais) | 3/4 | 2/4 | 1/4 (idiossincráticas) |
|---|---|---|---|---|---|
| VARV-49 | 93 | **18 (19,4%)** | 7 | 23 | 45 (48,4%) |
| VARV-52 | 92 | **17 (18,5%)** | 7 | 39 | 29 (31,5%) |
| VARV-121 | 243 | **37 (15,2%)** | 15 | 88 | 103 (42,4%) |

**Entre 15% e 20% das bipartições são metodologicamente invariantes; 30% a 48% são artefato de um único método.** É esse contraste que justifica a existência da ferramenta: quase metade do que uma árvore publicada afirma não sobrevive à troca de método.

### 4.2 O reticulado de padrões maximais

O reticulado revela a estrutura do desacordo — não apenas a sua magnitude.

**VARV-49** (M = 4):

| Suporte | Pipelines | Bipartições compartilhadas |
|---|---|---|
| 4/4 | fasttree, iqtree, nj, upgma | **18** |
| 3/4 | fasttree, iqtree, upgma | 23 |
| 3/4 | fasttree, iqtree, nj | 20 |
| 2/4 | **fasttree, iqtree** | **44** |
| 2/4 | **nj, upgma** | 22 |

**VARV-121** (M = 4):

| Suporte | Pipelines | Bipartições |
|---|---|---|
| 4/4 | todos | **37** |
| 3/4 | fasttree, iqtree, nj | 44 |
| 3/4 | fasttree, iqtree, upgma | 44 |
| 3/4 | iqtree, nj, upgma | 38 |
| 2/4 | **fasttree, iqtree** | **112** |
| 2/4 | **nj, upgma** | 64 |

Leitura:

1. **O maior padrão de suporte parcial é sempre `{fasttree, iqtree}`** — 44 bipartições em VARV-49 (2,4× o núcleo universal), 112 em VARV-121 (3× o núcleo). Os dois métodos de máxima verossimilhança compartilham um corpo grande de estrutura que **nenhum método de distância recupera**.
2. **`{nj, upgma}` é o segundo padrão**, sempre menor. A partição do reticulado segue o **paradigma de inferência**, não o alinhador — que é exatamente o que se esperaria, e que os dados de Variola *não podiam* mostrar antes da correção de D1, porque o fator alinhador era vazio.
3. Em VARV-121, os padrões cruzados (`{iqtree, nj}` com 46, `{iqtree, upgma}` com 45) mostram que o IQ-TREE ocupa posição intermediária — é o método que mais compartilha estrutura com ambos os paradigmas.

### 4.3 O núcleo invariante reproduz a literatura

Esta é a validação externa do método, e ela é forte.

**Monofilia de VARV**: suporte **4/4 em todos os três experimentos com amostragem substancial** — VARV-49 (45 táxons de VARV contra CMLV/CPXV/TATV), VARV-52 (48), VARV-121 (77). Nenhum método coloca um não-VARV dentro de VARV.

**Clado P-II** (África Ocidental + América do Sul, *alastrim minor*) de Esposito *et al.* (2006) e Li *et al.* (2007): suporte **4/4 nos três experimentos**, com o conjunto crescendo corretamente com a amostragem:

| Experimento | Táxons no clado | Suporte |
|---|---|---|
| VARV-49 | 6 | 4/4 |
| VARV-52 | 7 (+ `Y16780`) | 4/4 |
| VARV-121 | 8 (+ `OL468961`, `Y16780`) | 4/4 |

Os seis táxons do núcleo, com suas descrições no GenBank:

```
DQ441416  Variola virus strain Benin, Dahomey 1968 (v68-59)
DQ441419  Variola virus strain Brazil 1966 (v66-39 Sao Paulo)
DQ441426  Variola virus strain Guinea 1969 (005)
DQ441434  Variola virus strain Niger 1969 (001, importation from Nigeria)
DQ441437  Variola virus strain Sierra Leone 1969 (V68-258)
DQ441447  Variola virus strain United Kingdom 1952 Butler
```

Cinco isolados da África Ocidental mais **um isolado brasileiro de 1966 (São Paulo)** — a assinatura clássica de que o *alastrim minor* sul-americano descende da varíola oeste-africana, compatível com o tráfico transatlântico. Os dois táxons que se juntam ao clado nos conjuntos maiores são exatamente os esperados: `Y16780` = *"variola minor virus, complete genome"* (a referência de *alastrim*, Garcia-1966, Brasil) e `OL468961` = *"Variola virus strain GHA68"* (Gana, 1968).

A bipartição **aninhada** de 10 táxons — os 4 grupos externos mais os 6 táxons de P-II, contra os outros 39 VARV — também tem suporte 4/4. Ela posiciona P-II como **linhagem basal de VARV**, que é a topologia publicada (P-II basal, P-I = varíola maior asiática/africana derivada).

Os outros clados universais de VARV-49 são igualmente coerentes:

- **6 táxons, Oriente Médio / Ásia Ocidental**: Afeganistão 1970, Irã 1972, Paquistão 1969, Síria 1972, Kuwait 1967, **Iugoslávia 1972**. O surto iugoslavo de 1972 é historicamente documentado como importação do Oriente Médio — e a topologia o coloca exatamente lá.
- **4 táxons, África Austral**: Botsuana 1972, Botsuana 1973, África do Sul 1965 (Natal), África do Sul 1965 (Transvaal).

Em VARV-121, dos 37 splits universais, aqueles de tamanho ≤ 23 são **taxonomicamente puros em 31 de 32 casos**. A única exceção é `{BPXV: 1, VACV: 2}` — e ela está **biologicamente correta**: *buffalopox virus* é uma linhagem derivada de *vaccinia virus*. O núcleo metodologicamente invariante recuperou um fato taxonômico que o rótulo de espécie do NCBI oculta.

**Conclusão de 4.3.** Os clados que sobrevivem à troca de método são exatamente os que evidência independente — história, epidemiologia, taxonomia, literatura prévia — sustenta. O suporte metodológico é um critério de robustez **válido**, não apenas uma medida de concordância interna.

### 4.4 O resultado principal: bootstrap × robustez metodológica

O IQ-TREE já calculou 1000 réplicas de *ultrafast bootstrap* em cada execução; o `.contree` está em `out/tmp/iqtree_*/`. O pipeline **descarta esse suporte** ao gravar o `.nexus` em `out/Trees/` (ver [D10](02-defeitos-que-alteram-resultado.md#d10)). Recuperando-o e cruzando com o suporte entre pipelines (§6 do script):

**VARV-121** — 118 ramos internos:

| UFBoot | 4/4 | 3/4 | 2/4 | 1/4 | total |
|---:|---:|---:|---:|---:|---:|
| **100** | 35 | 11 | **40** | 0 | 86 |
| 95–99 | 0 | 2 | 6 | 0 | 8 |
| 70–94 | 0 | 2 | 9 | 1 | 12 |
| < 70 | 2 | 0 | 5 | 4 | 12 |

**VARV-49** — 46 ramos:

| UFBoot | 4/4 | 3/4 | 2/4 | 1/4 | total |
|---:|---:|---:|---:|---:|---:|
| **100** | 13 | 4 | **10** | 0 | 27 |
| 95–99 | 2 | 2 | 3 | 0 | 7 |
| 70–94 | 3 | 1 | 5 | 0 | 9 |
| < 70 | 0 | 0 | 1 | 2 | 3 |

**VARV-52** — 49 ramos, réplica independente:

| UFBoot | 4/4 | 3/4 | 2/4 | 1/4 | total |
|---:|---:|---:|---:|---:|---:|
| **100** | 14 | 3 | **13** | 0 | 30 |
| 95–99 | 1 | 2 | 5 | 0 | 8 |
| 70–94 | 2 | 1 | 4 | 1 | 8 |
| < 70 | 0 | 1 | 2 | 0 | 3 |

Correlação de Pearson entre UFBoot e suporte metodológico: **0,44** (VARV-49), **0,27** (VARV-52), **0,37** (VARV-121).

Duas afirmações, ambas quantificadas e replicadas:

> **(i) UFBoot máximo não garante robustez metodológica.** Dos 86 ramos com UFBoot = 100 em VARV-121, 35 (40,7%) sobrevivem à troca de método e 40 (46,5%) são recuperados por apenas 2 dos 4 métodos. Em VARV-49, 13 de 27 (48%); em VARV-52, 14 de 30 (47%). **Cerca de metade do que o bootstrap certifica como certo desaparece quando se troca o método de inferência.**

> **(ii) UFBoot alto é necessário, não suficiente.** Em nenhum dos quatro experimentos algum ramo com UFBoot ≥ 95 foi recuperado por um único pipeline: 0 de 34, 0 de 38, 0 de 94, 0 de 1. O bootstrap é um filtro eficaz contra o idiossincrático e um certificador fraco do robusto.

As duas medidas são **ortogonais por construção**: o bootstrap reamostra colunas do *mesmo* alinhamento sob o *mesmo* modelo — mede variância amostral condicionada ao pipeline. O suporte entre pipelines varia o pipeline com os dados fixos — mede variância metodológica. Reportar apenas o bootstrap é reportar uma das duas fontes de incerteza e chamá-la de "a" incerteza.

**Este é o argumento do artigo.** Ele não depende de FPMax: depende de tratar pipelines como transações e clados como itens. O FPMax é a implementação; o reticulado exato (M ≤ 10 ⇒ 2^M subconjuntos) é computável sem heurística e é o que o módulo `workflow/stability/` já faz.

---

## 5. A página Deep Analysis

`GET /api/tree/pattern-analysis/{project}` → `Backend/src/app.py:1554-1594`, `analyze_patterns` em `:1625`.

Além de herdar D4, a página tem três defeitos próprios:

**Truncamento silencioso.** O parâmetro `max_pattern_size` tem default 100 (`app.py:1560`) e o front nunca o envia. Em VARV-121, **8 das 20 linhas do CSV são descartadas** — precisamente os padrões maiores (118, 118, 118, 119, 119, 120, 120 itens), que são os que carregam mais conteúdo filogenético. A UI reporta `total_patterns: 12` sem nenhum aviso de que 40% da entrada foi eliminada.

**`tree_coverage` atribui padrões à árvore errada.** `app.py:1581-1582` constrói `hash_subtrees_infos` com `dict.update()` sobre todas as árvores. Como um clado conservado tem o *mesmo* `List_terminals_hash` em várias árvores, **a última árvore processada sobrescreve as demais**. Resultado observado:

| Experimento | Árvores no `tree_coverage` | Árvores reais | Perda |
|---|---|---|---|
| VARV-49 | 4 | 8 | 50% |
| VARV-121 | 3 | 8 | 62% |
| VARV-6 | 5 | 10 | 50% |

O painel de cobertura mostra metade a dois terços das árvores como se não tivessem padrão algum.

**`unique_signatures_count` é sempre 0.** A lista `unique_signatures` é declarada em `app.py:1655` e nunca recebe elemento; o campo é exibido na UI como estatística.

E `quasi_invariant` (`app.py:1683-1698`) recomputa exatamente a mesma condição de `topologically_robust` — o mesmo conjunto sob dois nomes, com custo dobrado.

---

## 6. Os dados no grafo

Detalhe em [`05-grafo-neo4j.md`](05-grafo-neo4j.md). Para esta revisão importam dois fatos:

1. **O Neo4j em `localhost:7474` não contém nenhum dado de Variola.** Ele contém um único projeto, de **Zika (477 acessos, 10 árvores)**. `MATCH (m:Metadata) RETURN DISTINCT m.organism` devolve apenas `"Zika virus"`. Portanto **a página Deep Analysis para os projetos de Variola não lê o grafo** — lê `all_results_fpmax.csv` e `metadata.json` do disco. Grafo e Deep Analysis são dois caminhos de dados desconexos.
2. **Não há proveniência no grafo.** Nenhum nó carrega projeto, `run_id`, data, versão de ferramenta ou parâmetro. Um `Tree` tem exatamente duas propriedades: `name` e `uid`. Não é possível, a partir do grafo, dizer de que execução uma árvore veio.

---

## 7. Ameaças à validade

Ordenadas por gravidade para a submissão.

| # | Ameaça | Estado |
|---|---|---|
| 1 | Fator alinhador vazio nos experimentos de Variola (D1) | **Bloqueante** — invalida `factor_effects` e metade do delineamento |
| 2 | Contaminação taxonômica em VARV-121, VARV-52, VARV-6 (crocodilepox, Yoka) | **Bloqueante** para toda afirmação sobre varíola derivada desses conjuntos |
| 3 | Discordância inflada por enraizamento (D3) | **Alta** — muda a magnitude de todo resultado reportado |
| 4 | Semântica de `support` no FPMax (D4) | **Alta** — a tabela da UI é autocontraditória |
| 5 | Identidade de clado de 16 bits, dependente de ordem | **Alta** — ver [D5](02-defeitos-que-alteram-resultado.md#d5); fragmenta 36–55% dos clados |
| 6 | Proveniência ausente (nomes, caminhos, sementes, versões) | **Alta** — nenhuma figura é rastreável até o comando |
| 7 | ITRs presentes apesar do rótulo "noITRs" | Média — confunde a interpretação de *gaps* |
| 8 | `mafft --auto` escolhendo FFT-NS-1/2 sem registro | Média — a estratégia de alinhamento não é um parâmetro declarado |
| 9 | Semente do IQ-TREE não fixada | Média — reexecução não reproduz a árvore |
| 10 | VARV-6 sem poder estatístico (3 bipartições informativas) | Média — não sustenta afirmação |
| 11 | Aviso do FastTree sobre recombinação nunca exibido | Média — poxvírus recombinam; o modelo de árvore pode ser inadequado |
| 12 | UPGMA impõe relógio molecular em dados que atravessam gêneros | Média — parte da "discordância de método" é a violação de um pressuposto conhecido |

Sobre a #12: UPGMA assume ultrametricidade. Aplicá-lo a um conjunto que vai de VARV a crocodilepox garante que ele produza uma topologia errada. Incluí-lo como um dos M pipelines **infla artificialmente a discordância medida**. Isso não é motivo para removê-lo — é motivo para reportar o suporte metodológico com e sem ele, e discutir que a métrica é sensível à escolha do conjunto de pipelines. Essa sensibilidade é, ela própria, uma limitação do método que o artigo precisa declarar.

---

## 8. O que pode ser publicado hoje

**Pode**, com as correções de D1–D4 aplicadas e o delineamento reescrito como M = 4 métodos de inferência sobre um alinhamento:

- O contraste bootstrap × suporte metodológico (§4.4), com as três tabelas cruzadas e a afirmação assimétrica. Replicado em três conjuntos.
- O perfil de suporte: 15–20% das bipartições invariantes, 30–48% idiossincráticas (§4.1).
- A partição do reticulado por paradigma de inferência (§4.2).
- A validação externa contra Li *et al.* (2007) / Esposito *et al.* (2006): monofilia de VARV e clado P-II a 4/4 (§4.3).
- O ruído de reexecução do IQ-TREE (RF = 0,017 com entrada idêntica) como piso de resolução da métrica.

**Não pode**, sem reexecução:

- Qualquer afirmação sobre o fator alinhador a partir de Variola.
- Qualquer afirmação de filogeografia ou temporalidade da varíola a partir de VARV-121.
- Qualquer número de suporte com denominador 8 ou 10.
- Qualquer resultado de VARV-6 como evidência de instabilidade.
- Os painéis atuais da Deep Analysis, sem exceção.

**Precisa ser gerado** (ver [`04-agenda-de-pesquisa.md`](04-agenda-de-pesquisa.md)):

- Um experimento de Variola com alinhador realmente variado (exige resolver o limite de 20 kb).
- Um VARV-49 depurado, sem grupos externos fora de *Orthopoxvirus*.
- O controle sem ITRs que o nome dos diretórios promete.
- Curvas de escalabilidade com ambiente reportado, para a afirmação de desempenho.

---

## 9. Referências usadas na validação

- Esposito J.J. *et al.* (2006). Genome sequence diversity and clues to the evolution of variola (smallpox) virus. *Science* 313:807–812. — Estrutura P-I / P-II; posição basal da linhagem oeste-africana/sul-americana.
- Li Y., Carroll D.S., Gardner S.N., Walsh M.C., Vitalis E.A., Damon I.K. (2007). On the origin of smallpox: correlating variola phylogenics with historical smallpox records. *PNAS* 104:15787–15792. — Delineamento que os diretórios `Variola_Yu_li_2007*` replicam.
- Robinson D.F., Foulds L.R. (1981). Comparison of phylogenetic trees. *Mathematical Biosciences* 53:131–147. — Definição de RF; ver [`03-metricas.md`](03-metricas.md).
- Hoang D.T. *et al.* (2018). UFBoot2: improving the ultrafast bootstrap approximation. *MBE* 35:518–522. — Interpretação de UFBoot ≥ 95.
- Nguyen L.-T. *et al.* (2015). IQ-TREE. *MBE* 32:268–274. — Versão em uso: 2.2.2.6.
- Price M.N., Dehal P.S., Arkin A.P. (2010). FastTree 2. *PLoS ONE* 5:e9490. — Versão em uso: 2.2.0 (double precision).

*Versões de ferramenta extraídas dos logs de execução em `out/tmp/`. As demais (MAFFT, Clustal Omega, RAxML-NG) não são registradas por nenhum artefato — ver [D11](02-defeitos-que-alteram-resultado.md#d11).*
