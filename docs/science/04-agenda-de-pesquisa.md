# Agenda de pesquisa — o que rodar em seguida, e por quê

[← Ciência](README.md) · Base: [`01-revisao-variola.md`](01-revisao-variola.md) e [`02-defeitos-que-alteram-resultado.md`](02-defeitos-que-alteram-resultado.md)

Nove experimentos, ordenados por razão *informação obtida / custo*. Cada um com **hipótese**, **delineamento**, **critério de sucesso** e **o que invalida a hipótese** — porque um experimento que não pode falhar não é experimento.

Legenda de custo: **○** recomputação sobre artefatos em disco · **◐** reexecução parcial · **●** reexecução completa + nova aquisição.

---

## Onde o artigo está hoje

Existe **um** resultado defensável: bootstrap e suporte metodológico medem coisas diferentes, e o primeiro certifica menos do que aparenta (§4.4 da revisão; replicado em três conjuntos; Pearson 0,27–0,44). Ele sustenta um artigo metodológico.

Não existe, hoje: afirmação válida sobre o fator alinhador em Variola; qualquer resultado de filogeografia; curva de escalabilidade; e nenhuma figura é rastreável até o comando que a produziu.

A agenda abaixo transforma o primeiro em resultado principal e fecha as lacunas na ordem em que elas bloqueiam a submissão.

---

## E1 · ○ · Reanálise corrigida dos quatro experimentos existentes

**Hipótese.** As conclusões atuais mudam de magnitude, e o resultado principal sobrevive, quando D1–D4 são corrigidos.

**Delineamento.** Recomputar as tabelas usando: pipelines efetivos (M = 4, ou 5 em VARV-6), bipartições canônicas, identidade canônica de 128 bits, suporte real reconstruído do CSV. Incluir **VARV-52**, que nunca foi analisado.

**Critério de sucesso.** As três tabelas cruzadas UFBoot × suporte metodológico, o perfil de suporte e o reticulado maximal para os quatro experimentos, todos regeneráveis por um comando.

**Invalidaria a hipótese.** Se o contraste bootstrap × suporte metodológico desaparecesse sob a correção. Não desaparece — já verificado: as três tabelas de §4.4 já são pós-correção.

**Estado.** ✅ **Feito nos dois lados.** `docs/science/scripts/audit_variola.py` já fazia a análise correta; M1 (fechado em 2026-08-24, [D3](02-defeitos-que-alteram-resultado.md#d3) + [D5](02-defeitos-que-alteram-resultado.md#d5)) portou a correção para o pipeline de produção. E3 (abaixo) é o experimento que materializa isso numa reexecução limpa.

---

## E2 · ○ · Propagar o suporte de ramo já calculado

**Hipótese.** O suporte de ramo é um insumo de primeira classe do argumento, não um subproduto.

**Delineamento.** Ler `.contree` (IQ-TREE) e o Newick com suporte do RAxML e do FastTree; propagar `confidence` ao Nexus, ao `metadata.json`, ao grafo e à UI. Habilitar `-B 1000` em RAxML-NG e `-boot` no FastTree para simetria entre métodos ML.

**Critério de sucesso.** Toda árvore ML em `out/Trees/` carrega suporte de ramo; a página exibe, por clado, **bootstrap e suporte metodológico lado a lado**.

**Por que é o item de maior valor por unidade de custo.** Os dados já existem em `out/tmp/`. Ver [D10](02-defeitos-que-alteram-resultado.md#d10).

---

## E3 · ✅ · `VARV-49-clean`: replicação depurada de Li *et al.* (2007)

**Hipótese.** O núcleo metodologicamente invariante de VARV-49 é robusto à remoção da contaminação taxonômica — porque VARV-49 já não tem crocodilepox, mas a hipótese precisa ser testada contra a versão com filtro explícito.

**Delineamento.** Aquisição com filtro `txid10242` (*Orthopoxvirus*); 45 VARV + CMLV/CPXV/TATV como grupo externo declarado; **enraizamento explícito pelo grupo externo** em todos os métodos; M = 4 métodos de inferência. Manifesto completo.

**Critério de sucesso.** Monofilia de VARV e clado P-II a 4/4; e — por haver enraizamento comum — a análise por clados enraizados torna-se legítima e pode ser reportada ao lado da análise por bipartições.

**Invalidaria a hipótese.** P-II caindo abaixo de 4/4, ou VARV deixando de ser monofilético.

**Este é o conjunto de referência do artigo.** Deve virar `Backend/tests/data/reference/` conforme [`04-rigor-cientifico.md §2`](../automation/04-rigor-cientifico.md#2-dataset-de-referência-pré-requisito-de-w3).

**Estado em 2026-09-02 — ✅ fechado.** `Variola_VARV49_reexec_20260901` é o dataset de referência oficial: filtro `txid10242` aplicado (M2.2, [DEC-035](../automation/07-log-de-execucao.md)), 49 sequências limpas (52 registros → 49 distintas, sem crocodilepox), M = 2 alinhadores × 5 métodos = 10 árvores (10 de 10 presentes, `M` completo), manifesto completo (DEC-027/046/050), enraizamento comum disponível (M2.3, [DEC-034](../automation/07-log-de-execucao.md)). `docs/science/scripts/gerar_dataset_referencia.py` regenerou `Backend/tests/data/reference/` a partir deste projeto ([DEC-063](../automation/07-log-de-execucao.md)); `make reference-check` devolve **código 0** — monofilia de VARV, clado P-II e a bipartição aninhada de 10 táxons, os três a 10/10 pipelines.

---

## E4 · ◐ · O fator alinhador, medido onde ele existe

**Hipótese** (formulada a partir do controle Zika, §3 da revisão):

> A sensibilidade da topologia ao alinhador **depende do paradigma de inferência**. Métodos de distância são quase imunes porque a distância par a par integra sobre o alinhamento inteiro; métodos baseados em caracteres consomem padrões de sítio e herdam o erro de alinhamento.

Evidência preliminar (ZIKV-478, onde os dois alinhadores realmente executaram):

| Método | RF entre MAFFT e Clustal Omega |
|---|---|
| NJ | 0,0021 |
| UPGMA | 0,0945 |
| FastTree | 0,2038 |
| RAxML | 0,3025 |
| IQ-TREE | 0,3298 |

**Delineamento.** Delineamento fatorial completo `alinhador × inferência` em conjuntos onde ambos os alinhadores executem. Como o Clustal Omega não escala a 186 kb ([D1](02-defeitos-que-alteram-resultado.md#d1)), há três saídas, e a escolha é científica:

| Saída | Custo | Risco |
|---|---|---|
| Clustal Omega em modo reduzido (`--max-guidetree-iterations 1 --max-hmm-iterations 1`) | baixo | pode ainda estourar memória; degrada a acurácia justamente do braço em teste |
| Substituir por MUSCLE5 ou MAFFT com estratégias contrastantes (`--retree 1` × `--maxiterate 1000`) | baixo | não é "o mesmo experimento" do desenho original — mas é um desenho **melhor**, porque isola a estratégia de alinhamento |
| Restringir a genes/regiões (não genoma inteiro) | médio | muda a unidade de análise |

**Recomendação.** A segunda. Contrastar duas *estratégias* do MAFFT é metodologicamente mais limpo que contrastar dois programas com implementações e heurísticas independentes: isola exatamente a variável de interesse (esforço de refinamento do alinhamento) mantendo tudo o mais constante.

**Critério de sucesso.** Interação `alinhador × inferência` significativa, com métodos de distância abaixo de 0,05 de RF e métodos ML acima de 0,20, replicada em ao menos dois conjuntos.

**Invalidaria a hipótese.** Efeito uniforme entre paradigmas, ou nulo em ambos.

**Este é o segundo resultado do artigo**, e é original: a literatura discute sensibilidade ao alinhamento e sensibilidade ao método separadamente; a interação é raramente quantificada de forma sistemática.

**Estado em 2026-09-01 — agora computável, e já computado uma vez (exploratório, não revisado).** A decisão 1 ([DEC-036](../automation/07-log-de-execucao.md)/[DEC-050](../automation/07-log-de-execucao.md)) definiu o segundo alinhador como a segunda estratégia do MAFFT — e as reexecuções desta rodada (`Variola_VARV49_reexec_20260901`) são a primeira vez que os dois braços rodam de verdade sobre *Variola* com o `stability.py` corrigido ([D25](02-defeitos-que-alteram-resultado.md#d25)). Primeira leitura, via `python -m workflow.stability.case_study --project projects/Variola_VARV49_reexec_20260901`:

```
RF médio | trocando alinhador ........ 0.052 (n=5, máx 0.152)
RF médio | trocando inferência ....... 0.385 (n=20, máx 0.587)
```

Por par mafft × mafft_iterative, do mesmo método: fasttree 0,022 · iqtree 0,022 · raxml 0,044 · upgma 0,022 · **nj_distance 0,152**. Isto é **na direção oposta** ao padrão de ZIKV-478 na tabela acima, onde NJ era o método mais imune (0,0021) e os métodos de caráter os mais sensíveis: aqui NJ é o **mais** sensível à troca de alinhador entre os cinco.

**Revisão do domínio científico, 2026-09-01 (`ptm-dominio-cientifico`).** Leitura sobre artefatos já existentes de `Variola_VARV49_reexec_20260901` — nenhum pipeline foi executado nesta revisão (a máquina está ocupada com a reexecução de VARV-121; nada naquele diretório foi tocado).

*Passo 1 — oráculo independente.* A RF de cada um dos 5 pares foi recomputada por fora do `stability.py`, direto sobre os Nexus em `out/Trees/`, com dois oráculos (`dendropy` 4.6.1 e `ete3` 3.1.3, `taxon_namespace`/leitura compartilhados por par, `rooting="force-unrooted"`, denominador `2(n-3)` com `n=49`):

```
$ python oracle_e4_check.py   # dendropy, sobre BioComp_UFF/projects/Variola_VARV49_reexec_20260901/out/Trees/
método            RF bruta  n_taxa  denom 2(n-3)  RF normalizada
fasttree                 2      49            92          0.0217
iqtree                   2      49            92          0.0217
raxml                    4      49            92          0.0435
nj_distance             14      49            92          0.1522
upgma_distance           2      49            92          0.0217

Comparação com rf_matrix.csv (produção, workflow.stability.StabilityAnalyzer):
método             oráculo  produção         Δ
fasttree            0.0217    0.0217    0.0000
iqtree              0.0217    0.0217    0.0000
raxml               0.0435    0.0435   -0.0000
nj_distance         0.1522    0.1522   -0.0000
upgma_distance      0.0217    0.0217    0.0000
```

Confirmado por um segundo oráculo (ete3, `robinson_foulds(..., unrooted_trees=True)`, mesmos cinco pares): RF=2/2/4/14/2 sobre max=92, idêntico a dendropy e à produção. **Δ = 0 nos cinco pares, com dois oráculos independentes** — o número do `rf_matrix.csv` está certo; a inversão do padrão de NJ não é bug de cálculo.

*Tabela por método (mafft × mafft_iterative, VARV-49, n=49 táxons, denominador 2(n-3)=92):*

| Método | RF normalizada | RF bruta | Bipartições não triviais (mafft / iter) | Bipartições que trocam |
|---|---|---|---|---|
| NJ (distância) | **0,1522** | 14 | 46 / 46 (ambas totalmente binárias) | 7 de 46 (15%) |
| UPGMA (distância) | 0,0217 | 2 | 46 / 46 | 1 de 46 (2%) |
| RAxML (ML) | 0,0435 | 4 | 46 / 46 | 2 de 46 (4%) |
| FastTree (ML) | 0,0217 | 2 | 46 / 46 | 1 de 46 (2%) |
| IQ-TREE (ML) | 0,0217 | 2 | 46 / 46 | 1 de 46 (2%) |

*Passo 2 — hipótese da politomia/baixo poder, testada e refutada.* `2n-3 = 46` é o máximo de bipartições não triviais possível para uma árvore não enraizada binária com 49 folhas — **as dez árvores (5 métodos × 2 alinhadores) são todas estritamente binárias**, sem politomia nenhuma. A hipótese "NJ tem poucas bipartições informativas e por isso a RF fica instável" está **refutada pelos dados**: NJ não tem menos bipartições que os outros métodos, tem exatamente as mesmas 46.

O que de fato distingue os métodos é o comprimento dos ramos que trocam. Distribuição dos 46 ramos internos por árvore (`out/Trees/*.nexus`, mesmo par):

| Método | ramos ≤ 1e-4 (de 46) | ramos ≤ 1e-6 (comprimento ~0) | fração dos ramos curtos que trocam de alinhador |
|---|---|---|---|
| FastTree | 24–25 | 5 | 1 de ~24 (~4%) |
| IQ-TREE | 25 | 5 | 1 de 25 (~4%) |
| RAxML | 25 | 5 | 2 de 25 (~8%) |
| UPGMA | 4–5 | 0 | 1 de ~5 (~20%) |
| NJ | 6–7 | 0 | **7 de 7 (100%)** |

Achado chave: os métodos de caráter (FastTree/IQ-TREE/RAxML) têm **mais** ramos próximos de zero do que o NJ (24–25 contra 6–7) — não é o NJ que tem sinal mais pobre. A diferença é que, nos métodos de caráter, quase todos esses ramos curtos são **estáveis** entre as duas estratégias de alinhamento (1–2 de ~25 trocam); no NJ, **todos** os seus ramos curtos trocam.

*Passo 3 — mecanismo mais provável (hipótese, não prova).* `BioComp_UFF/workflow/tree_construction/builder.py:107-115` usa `Bio.Phylo.TreeConstruction.DistanceCalculator('identity')` — p-distância bruta, sem correção de modelo de substituição — como única entrada tanto do NJ quanto do UPGMA (`distance_constructor`, linhas 117-141). Com alinhamento de `L ≈ 236 000` colunas (`AlignIO`: MAFFT = 235 955 colunas, MAFFT-iterativo = 235 526 — uma diferença de 429 colunas, ~0,18%, e frações de gap quase idênticas: 20,33% × 20,18%), cada coluna de diferença desloca uma distância par-a-par em apenas `1/L ≈ 4,2×10⁻⁶`. Os ramos que trocam no NJ têm comprimento entre `7×10⁻⁵` e `4,5×10⁻⁴` — de 17 a ~107 "colunas-equivalente" de sinal —, uma margem plausível de ser cruzada pelas ~429 colunas que só o comprimento total do alinhamento já garante que diferem, mais qualquer realocação interna de *gap* não capturada nessa contagem. O critério de agrupamento do NJ (a matriz-Q, que subtrai a soma das distâncias a todos os outros táxons a cada passo) é conhecidamente mais sensível a perturbações pequenas quando as distâncias já estão quase empatadas do que o encadeamento por média do UPGMA ou a superfície de verossimilhança dos métodos de caráter — o que é consistente com UPGMA (mesma distância de entrada, critério de agrupamento diferente) ficar no mesmo patamar de estabilidade dos métodos de ML, e não no do NJ. **Isto é a explicação mais provável, não uma prova**: confirmá-la exigiria recomputar as duas matrizes de identidade e rastrear especificamente quais comparações da matriz-Q trocam de sinal — não foi feito nesta revisão.

*Parecer.* Duas leituras seguem em aberto, e nenhuma delas é decidível com `n=1` conjunto:

- (a) o efeito de E4 pode de fato depender do **tipo de contraste de alinhador** — MAFFT×Clustal (dois programas, heurísticas independentes, ZIKV-478) versus MAFFT×MAFFT-iterativo (mesma heurística, refinamento diferente, aqui) — e não apenas do paradigma de inferência;
- (b), refinada pelo mecanismo do Passo 3: não é "NJ tem baixo poder estatístico" de forma genérica (ele não tem menos bipartições resolvidas que ninguém) — é que a **distância de identidade não corrigida**, no regime de divergência quase clonal de *Variola*, produz sinais tão próximos do limiar de uma coluna de alinhamento que o critério de agrupamento do NJ especificamente amplifica o ruído introduzido por uma diferença pequena de alinhamento, enquanto UPGMA (mesma distância, outro critério) e os métodos de caráter (outra fonte de sinal) não amplificam da mesma forma neste conjunto.

Essas duas leituras não são mutuamente exclusivas e ambas podem ser verdadeiras ao mesmo tempo. **O que está provado:** os números do `rf_matrix.csv` para os cinco pares estão corretos (dois oráculos, Δ=0) e a inversão de padrão em relação a Zika é real, não artefato de cálculo. **O que continua sendo hipótese:** a causa mecanística (Passo 3) e se o padrão generaliza. Isto **não muda o estado de E4**: continua ◐, e falta VARV-121 como segunda réplica — o critério de sucesso do experimento pede replicação em pelo menos dois conjuntos, e `n=1` não sustenta nem confirma nem descarta a hipótese original. **Recomendação para quando VARV-121 terminar:** (i) conferir se o NJ volta a ser o método mais sensível à troca de alinhador; (ii) se sim, recomputar as matrizes de identidade dos dois alinhadores e checar diretamente se as bipartições que trocam correspondem a pares de distância quase empatados que se invertem — isso confirmaria o mecanismo do Passo 3; (iii), independente de VARV-121, um teste de robustez de baixo custo é reexecutar NJ/UPGMA com um modelo de distância corrigido (ex.: Jukes-Cantor, outro `model=` do `DistanceCalculator`) sobre os mesmos dois alinhamentos já existentes, para separar "NJ é intrinsecamente mais sensível" de "a distância de identidade não corrigida usada aqui é o que é frágil" — isso é uma sugestão de próximo passo, não foi executado nesta revisão e não deve ser feito na máquina que está rodando VARV-121 agora.

**Ambiente bioinformático:** esta revisão não executa nenhum pipeline pesado; roda apenas leitura de Nexus/FASTA já existentes e chamadas de `dendropy`/`ete3`/`Bio.AlignIO`. Qualquer reexecução de NJ/UPGMA com modelo de distância diferente (recomendação iii acima) é validação numérica que só o usuário deve rodar, em WSL, fora da janela em que VARV-121 está ocupando a máquina.

**Segunda réplica — VARV-121, 2026-09-02.** A reexecução terminou (16h49, `finished_at_utc` no manifesto), `conferir_correcoes_m1.py` TUDO VERDE e o oráculo dendropy confere **45 pares, 0 divergências** sobre os 10 pipelines. Mesma leitura de `case_study.py`, agora com `n=121`:

```
RF médio | trocando alinhador ........ 0.139 (n=5, máx 0.195)
RF médio | trocando inferência ....... 0.449 (n=20, máx 0.661)
```

Por par mafft × mafft_iterative, confirmado por oráculo dendropy independente (todas as árvores estritamente binárias, 118 = n−3 bipartições não triviais em ambos os alinhadores, sem exceção — a hipótese de politomia continua refutada):

| Método | VARV-49 (n=49) | VARV-121 (n=121) |
|---|---:|---:|
| FastTree (ML) | 0,0217 | 0,0932 |
| IQ-TREE (ML) | 0,0217 | 0,1017 |
| RAxML (ML) | 0,0435 | 0,1186 |
| UPGMA (distância) | 0,0217 | **0,1864** |
| NJ (distância) | **0,1522** | **0,1949** |

**O que replica, e o que não.** A recomendação (i) do parecer anterior — "conferir se o NJ volta a ser o mais sensível" — **confirma-se**: NJ é o método mais sensível à troca de alinhador nos dois conjuntos. O que **não replica da mesma forma**: em VARV-49, UPGMA ficava no patamar dos métodos de caráter (0,0217, igual a FastTree/IQ-TREE); em VARV-121, UPGMA sobe para perto do NJ (0,1864 contra 0,1949) — o único método de distância que se comportou "como um método de caráter" em VARV-49 deixa de fazer isso em VARV-121. A leitura mais defensável com os dois pontos: **os dois métodos de distância (NJ e UPGMA) são, juntos, mais sensíveis à troca de alinhador que os três métodos de caráter neste par de conjuntos de *Variola*** — o oposto do padrão de Zika (NJ o mais imune, caráter o mais sensível) — mas a divisão exata entre NJ e UPGMA individualmente ainda oscila entre os dois conjuntos. Recomendação (ii) do parecer anterior (rastrear a matriz-Q) segue **não executada** — é o próximo passo para decidir se a oscilação de UPGMA é ruído de amostra única por conjunto ou parte real do mecanismo.

**Estado de E4 atualizado.** O critério de sucesso do experimento ("replicada em ao menos dois conjuntos") está **parcialmente satisfeito**: o achado "distância mais sensível que caráter em *Variola*, invertendo Zika" replica entre VARV-49 e VARV-121. Mas os dois conjuntos são a mesma espécie com o mesmo desenho de contraste de alinhador (MAFFT × MAFFT-iterativo) — não é ainda a réplica **independente** que decidiria se o efeito é de *Variola* especificamente, do regime quase clonal, ou do tipo de contraste de alinhador (a leitura (a) do parecer anterior). E4 avança de ◐ inicial para **◐ avançado**: o segundo resultado do artigo tem agora dois pontos de dado concordantes entre si e discordantes de Zika, o que já é publicável como achado, mas a mecânica (Passo 3) e a generalização (Zika com o mesmo desenho MAFFT×MAFFT-iterativo, se algum dia rodado) continuam em aberto.

---

## E5 · ◐ · Controle com e sem ITRs

**Hipótese.** As repetições terminais invertidas são a fonte dominante da inflação de *gaps* (21–35% das colunas com maioria de *gap*) e uma causa material da instabilidade metodológica.

**Delineamento.** O mesmo conjunto `VARV-49-clean`, alinhado duas vezes: genoma completo e região central única (ITRs mascaradas). Comparar fração de *gaps*, número de bipartições universais e perfil de suporte.

**Critério de sucesso.** Redução mensurável de *gaps* e aumento do núcleo invariante ao remover as ITRs.

**Invalidaria a hipótese.** Núcleo invariante inalterado — o que apontaria a instabilidade para o modelo de substituição ou para a recombinação, não para o alinhamento.

**Nota.** Os diretórios `*noITRs*` prometem este experimento e **não o contêm** (§1.2 da revisão): os dados de entrada têm ITRs. Este é o experimento que o nome já anuncia.

---

## E6 · ◐ · O efeito da recombinação

**Hipótese.** Parte da discordância entre métodos não é erro de inferência: é o resultado de forçar um modelo de árvore sobre genomas que recombinam.

**Motivação direta.** O próprio FastTree registra no log e ninguém vê:

```
WARNING! This alignment consists of closely-related and very-long sequences.
WARNING! FastTree (or other standard maximum-likelihood tools)
may not be appropriate for aligments of very closely-related sequences
like this one, as FastTree does not account for recombination or gene conversion
```

Ortopoxvírus recombinam, sobretudo nas regiões terminais.

**Delineamento.** Detecção de recombinação (RDP4, GARD ou `3SEQ`) sobre `VARV-49-clean`; particionar o alinhamento em blocos não recombinantes; rodar os M pipelines por bloco; comparar o suporte metodológico **dentro** de um bloco contra o suporte sobre o alinhamento inteiro.

**Critério de sucesso.** Suporte metodológico sistematicamente maior dentro de blocos não recombinantes.

**Invalidaria a hipótese.** Nenhum ponto de recombinação detectado, ou suporte igual dentro e fora dos blocos.

**Impacto.** Se confirmada, muda a leitura do resultado principal: parte da fragilidade que a mineração revela é **sinal biológico real** (histórias distintas em regiões distintas), não ruído metodológico. Isso é mais forte, não mais fraco — e transforma a ferramenta de "detector de artefato" em "detector de conflito filogenético".

---

## E7 · ◐ · Onde o FPMax passa a ser necessário

**Hipótese.** Existe um `M` a partir do qual a enumeração exata do reticulado deixa de ser viável e a mineração heurística passa a valer a pena.

**Motivação.** Com `M ≤ 10`, `2^M ≤ 1024` — a enumeração exata é trivial e é o que `maximal_patterns` já faz. **O FPMax não se justifica na escala atual** ([D4](02-defeitos-que-alteram-resultado.md#d4)). Como o FPMax é o núcleo declarado da pesquisa, isso precisa de resposta.

**Delineamento.** Ampliar `M` deliberadamente: `{MAFFT, MUSCLE5, MAFFT-linsi} × {IQ-TREE, RAxML, FastTree, NJ, UPGMA, parcimônia} × {GTR+G, GTR+I+G, HKY} × {3 sementes}` → `M` na casa das centenas. Medir tempo de enumeração exata contra FPMax em função de `M`, com ambiente reportado e ≥3 repetições.

**Critério de sucesso.** Uma curva com um ponto de cruzamento identificado, e a demonstração de que acima dele o FPMax recupera os padrões de alto suporte que a enumeração exata encontraria.

**Invalidaria a hipótese.** Ausência de cruzamento no intervalo praticável — o que seria, ele próprio, um resultado honesto e publicável: *"para o número de pipelines que um estudo filogenético real emprega, a enumeração exata basta"*.

**Ganho colateral.** `M` grande com sementes replicadas dá a **linha de base de ruído** por método, que hoje só existe por acidente (RF = 0,017 do IQ-TREE consigo mesmo).

---

## E8 · ● · Escalabilidade como afirmação científica

**Hipótese.** O custo do pipeline escala de modo previsível em `n` (táxons) e `M` (pipelines), e o gargalo é identificável.

**Delineamento.** Conforme [`04-rigor-cientifico.md §5`](../automation/04-rigor-cientifico.md#5-performance-como-afirmação-científica): mesmo hardware, ≥3 repetições, mediana e dispersão, ambiente reportado (CPU, RAM, versões). Grade `n ∈ {6, 20, 50, 120, 480}` × `M ∈ {4, 8, 16}`, cronometrando separadamente alinhamento, inferência, extração de subárvores, mineração e ingest no grafo.

**Critério de sucesso.** Curvas medidas com barras de dispersão e o gargalo nomeado por medição, não por intuição.

**Ancoragem existente.** Os logs dão pontos isolados: VARV-49 levou ~19 min para 8 árvores (23:15 → 23:34). Não é um benchmark — é um ponto único, sem repetição e sem ambiente registrado.

**Cuidado.** `treePlot.py` documenta como `O(1)` um *lookup* que percorre uma lista (`O(n)`), e `exact_quartet_distance` é `O(n⁴)` com corte em `n ≤ 25`. **Complexidade declarada é complexidade provada**: ao publicar uma curva, mostre a medição.

---

## E9 · ● · Manifesto de execução e reprodutibilidade ponta a ponta

**Hipótese.** Um terceiro consegue reproduzir cada figura a partir do repositório.

**Delineamento.** Implementar o manifesto de [`04-rigor-cientifico.md §4`](../automation/04-rigor-cientifico.md#4-determinismo-e-reprodutibilidade): `run_id`, UTC, `git_commit`, versões de **todas** as ferramentas, parâmetros, sementes fixas, SHA-256 de entradas e saídas. Fixar a semente do IQ-TREE. Fechar o checklist de W7.

**Critério de sucesso.** `git clone --recursive` + um comando reproduz o resultado principal, com hashes conferindo.

**Por que está por último na ordem de valor e primeiro na de bloqueio.** Não produz resultado novo — mas sem ele nenhum dos outros oito é publicável. Deve rodar **em paralelo**, não em série.

---

## Sequência recomendada

```
paralelo:  E9 (manifesto)  ────────────────────────────────────────────►
           E1 ✓ ──► E2 ──► E3 ✓ ┬──► E4  (fator alinhador — 2º resultado, ◐ com 2 réplicas)
                                ├──► E5  (controle ITR)
                                └──► E6  (recombinação — muda a leitura)
                                          E7 (escala de M) ──► E8 (desempenho)
```

**Caminho crítico para a submissão:** E9 · E2 · E3 · E4. Os demais fortalecem, não bloqueiam.

---

## Decisões que são do usuário, não de um agente

Conforme [`agents/06-dominio-cientifico.md §3`](../agents/06-dominio-cientifico.md) e [`04-rigor-cientifico.md §3`](../automation/04-rigor-cientifico.md#3-protocolo-de-mudança-na-zona-sagrada):

1. **Qual é o segundo alinhador** (E4) — Clustal Omega em modo reduzido, MUSCLE5, ou duas estratégias do MAFFT. Muda o que o artigo pode afirmar.
2. **VARV-121 fica ou sai.** Contaminado para o propósito declarado, mas é o maior conjunto e o único que exercita escala. Reapresentável como estudo de *Chordopoxvirinae* — o que muda o enquadramento do artigo.
3. **VARV-6 fica ou sai.** Sem poder estatístico (3 bipartições informativas), mas é o caso-limite que expõe [D3](02-defeitos-que-alteram-resultado.md#d3) de forma mais nítida. Serve melhor como exemplo pedagógico do defeito que como experimento.
4. **UPGMA fica ou sai do conjunto de pipelines.** Seus pressupostos são violados nestes dados. Mantê-lo infla a discordância; removê-lo reduz `M` de 4 para 3. Recomendação: manter e **reportar com e sem**, discutindo a sensibilidade da métrica ao conjunto de pipelines — é uma limitação honesta do método, e declará-la é mais forte que escondê-la.
5. **Quando reexecutar.** Corrigir D1 muda todos os números publicados. Conforme o protocolo, essa decisão — corrigir e re-rodar, corrigir com *erratum*, ou postergar — **é do autor**.
