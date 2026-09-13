# "Exploring Evolutionary Patterns" — a versão estendida internacional do NMFSt.P

[← Literatura](README.md)

## 1. Citação completa

Moraes, J. V., Ferrari, C., Rosseti, I., de Oliveira, D. (2025). **"Exploring Evolutionary Patterns: A Jupyter Notebook for Discovering Frequent Subtrees in Phylogenetic Tree Databases."** *Journal of Information and Data Management (JIDM)*, 16:1. DOI: [10.5753/jidm.2025.4361](https://doi.org/10.5753/jidm.2025.4361). Recebido em 8 de abril de 2024, publicado em 23 de agosto de 2025. Licença CC BY 4.0. Autores filiados ao Instituto de Computação, Universidade Federal Fluminense (UFF), Niterói/RJ.

## 2. Relação com o artigo irmão em português — não é inferência, é declarado no texto

Isto **não precisa de inferência**: o próprio artigo declara sua origem no primeiro parágrafo da Introdução (seção 1, penúltimo parágrafo) e na lista de referências:

> "This manuscript is an extension of work originally reported in the Proceedings of the Brazilian e-Science Workshop (BreSci) [Ferrari et al., 2023] held in Belo Horizonte, MG - Brazil, on September 2023. We enriched the experimental evaluation with a brand-new experiment in this extended version and improved the background and related work sections."

E a referência bibliográfica confirma o artigo precursor exato:

> Ferrari, C., Moraes, J. V., and de Oliveira, D. (2023). *Nmfst.p: um notebook para identificação em paralelo de subárvores frequentes em conjuntos de árvores filogenéticas.* Anais do XVII Brazilian e-Science Workshop, p. 1–8, Porto Alegre, RS, Brasil. SBC. DOI: 10.5753/bresci.2023.234110.

Ou seja: **é o mesmo trabalho, na forma de versão estendida de periódico** — não é tradução literal nem um projeto de escopo diferente. A relação exata (o que precisamente foi acrescentado) é objeto do dossiê `03-nmfst-p-notebook-paralelo.md` (produzido em paralelo por outro agente, a partir do PDF de 2023); este documento registra apenas o que a versão de 2025 diz sobre si mesma: acrescentou um experimento novo e reforçou as seções de fundamentação e trabalhos relacionados. A autoria também mudou de ordem — João Vitor Moraes (o autor deste projeto) é primeiro autor na versão de 2025, e Camila Ferrari era primeira autora em 2023 — sem explicação no texto sobre o critério de reordenação.

## 3. Motivação e o problema atacado

O artigo parte de uma constatação simples: métodos de inferência filogenética diferentes (Máxima Parcimônia, Máxima Verossimilhança, Neighbor-Joining) podem produzir árvores ligeiramente diferentes a partir dos mesmos dados, porque cada um assume um critério de otimização distinto (baseado em distância vs. baseado em caracteres). Quando um estudo gera **muitas árvores** — por rodar vários métodos, ou por explorar várias condições — surge a pergunta: quais subestruturas (subárvores) se repetem através desse conjunto e por isso representam um **padrão evolutivo robusto**, e não um artefato do método?

Os autores definem esse problema como **descoberta de subárvores frequentes num "banco de dados" de árvores filogenéticas** — um conjunto de árvores tratado como uma coleção a ser minerada, não uma árvore única a ser lida. Citam Amir e Keselman (1997) para estabelecer que encontrar subárvores frequentes é **NP-difícil**, o que justifica toda a discussão de desempenho computacional que segue.

A diferença para o PhyloTreeMiner atual é de grau, não de natureza: o "banco de árvores" do NMFSt.P vem de **200 arquivos multi-FASTA** de genes ortólogos (um banco amplo, biologicamente heterogêneo), enquanto o conjunto de pipelines do PhyloTreeMiner atual é **um mesmo dataset processado por M métodos de inferência diferentes** (hoje M ≤ 10 — ver `docs/automation/10-marcos-e-metas.md §4`). O NMFSt.P mina frequência *entre genes*; o PhyloTreeMiner mina frequência *entre métodos sobre o mesmo dado*. É a mesma máquina de mineração aplicada a um eixo de variação diferente — e essa mudança de eixo é justamente o que torna o FPMax necessário como critério de robustez metodológica (o argumento central de M3, ver `docs/science/01-revisao-variola.md`).

## 4. Metodologia do notebook

### 4.1 O workflow de sete atividades (Figura 5 do artigo)

```
Sequence Validation → Multiple Sequence Alignment → Evolutionary Model Selection →
Tree Construction → Subtree Generation → Subtree Mapping → Similarity Calculation
```

As quatro primeiras atividades são reaproveitadas do "sub-workflow SciPhy" (Ocaña et al., 2011): validação de sequência via Biopython, alinhamento múltiplo (ClustalW por padrão, ou MAFFT/outro, escolha do cientista), seleção de modelo evolutivo (Biopython, padrão Neighbor-Joining), e construção da árvore (RAxML, MrBayes, ou Biopython). As três últimas são a contribuição específica do NMFSt.P:

**Algoritmo 1 — SubTreeGen (geração de subárvores).** Para cada árvore carregada em formato Nexus, itera sobre todos os clados (`find_clades(tree)`); para cada clado com mais de um terminal (`count_terminals(subtree) > 1`), grava a subárvore em Nexus e registra o caminho do arquivo. Produz a lista de subárvores candidatas de cada árvore de entrada.

**Algoritmo 2 — SubTreeMatrixGen (matriz de subárvores).** Carrega todas as subárvores geradas num array `m_subtree`, indexado por arquivo.

**Algoritmo 3 — SimCalcFST (cálculo de similaridade).** Compara par a par as subárvores de árvores diferentes (`m_subtree[i][j]` contra `m_subtree[k][l]`, com `i ≠ k`), usando uma função de similaridade `sim`; quando a similaridade ultrapassa um limiar `θ` (`l` no pseudocódigo), a subárvore entra no **banco de subárvores frequentes** (`fst_db`), indexado pelo maior valor de similaridade encontrado (`g_fst`) — e o array `m_subtree` é simétrico, então a matriz transposta é ela mesma.

Este é o núcleo algorítmico: **não é o FPMax** (mineração de itens maximais frequentes sobre itemsets), é uma comparação de similaridade par a par entre subárvores extraídas independentemente de cada árvore, com um limiar definido pelo usuário. A ideia de "frequência" aqui é geométrica/topológica (quantas árvores compartilham uma subárvore similar), não a definição formal usada no FPMax atual do projeto (itemsets sobre táxons, ver `docs/science/03-metricas.md`).

### 4.2 Paralelismo: descrito, mas não entregue na versão pública

Ponto que merece registro exato porque é fácil de ler errado: o artigo descreve a adaptação do notebook para paralelismo via a biblioteca **Parsl**, com decoradores `@python_app` nas atividades de geração de subárvores e cálculo de similaridade — mas o próprio texto diz, no meio da Seção 4:

> "It is important to note that the public version of NMFSt.P does not yet include parallel capabilities, as we are currently adapting the script to seamlessly function across various environments (...)."

Ou seja: **o paralelismo é a contribuição conceitual do artigo, mas o repositório público (https://github.com/UFFeScience/NMFSt.P) não o implementava no momento da publicação.** Qualquer alegação futura de que "o NMFSt.P paraleliza a mineração de subárvores" precisa checar se essa lacuna foi fechada depois — não presuma que está resolvida só porque o artigo foi publicado.

## 5. Dataset e resultados experimentais

**Dataset:** 200 arquivos multi-FASTA de sequências de proteínas de genes ortólogos de parasitas causadores de malária (protozoários), obtidos do RefSeq (`ftp://ftp.ncbi.nih.gov/refseq/release/protozoa/`), conforme definido por Ocaña e Dávila (2011).

**Avaliação biológica:** o NMFSt.P produziu as **mesmas árvores** que a abordagem-baseline SciPhyloMiner (Guedes et al., 2017), usando RAxML e MrBayes — divergindo apenas no formato de saída (o NMFSt.P devolve um banco de similaridades; o SciPhyloMiner devolve uma lista de subárvores acima de um limiar de frequência `θ` definido pelo usuário). Conclusão biológica equivalente entre as duas ferramentas.

**Avaliação computacional:** executado numa VM `c3d-standard-60` do Google Cloud Platform (60 vCPUs, 120 GB RAM, US$ 1,0651/hora no mercado spot), variando o número de núcleos. O **SciPhyloMiner é mais rápido** que o NMFSt.P nesse experimento — atribuído pelos autores ao motor de execução: o SciPhyloMiner roda sobre o SciCumulus (sistema de workflow otimizado para nuvem), enquanto o NMFSt.P roda sobre o motor de notebook Jupyter, cujo overhead de execução interativa "pode se tornar não-desprezível em cenários específicos" (citando Colonnelli et al., 2022). Eficiência ótima obtida com 16 vCPUs para ambas as abordagens; o desvio do speedup linear é atribuído a segmentos não paralelizáveis do workflow ("blocking activities").

## 6. Confronto com o estado atual do PhyloTreeMiner — ancestralidade direta confirmada por código

Esta não é uma inferência por analogia: o código atual em `BioComp_UFF/workflow/` carrega evidência textual direta de descendência do NMFSt.P/MFSt.P.

| Evidência no código atual | Onde | Relação com o artigo |
|---|---|---|
| Banner impresso `MFSt.P` | `BioComp_UFF/workflow/utils/messages.py:37` | Nome do ancestral direto, sobrevivendo como identidade visual da ferramenta |
| `find_clades()` + `count_terminals() > 1` para extrair subárvores | `BioComp_UFF/workflow/subtree_construction/builder.py:61,115,129,144` | É **exatamente** o Algoritmo 1 (SubTreeGen) do artigo, linha a linha: itera clados, filtra por mais de um terminal, grava subárvore |
| Módulo dedicado de mineração de subárvores frequentes | `BioComp_UFF/workflow/subtree_mining/miner.py` | Sucessor do Algoritmo 3 (SimCalcFST) — ver descrição "Encontra a maior subárvore frequente" nas docstrings (linhas 297-366) |
| Modo de execução `"OFST"` ("Only of the same tree") | `BioComp_UFF/workflow/controller/subtreeMinerController.py:24,92,108-109`, `miner.py:67,154,169` | Terminologia nova (não está no artigo de 2025), mas a sigla `FST` (Frequent SubTree) é herdada diretamente do vocabulário do artigo (`fst_db`, `FST`) |
| Controlador dedicado de construção de subárvores | `BioComp_UFF/workflow/controller/subtreeBuilderController.py:128,133` (log: `"STEP: Frequent subtree mining."`) | Etapa de pipeline nomeada quase literalmente como no artigo |
| Descrição textual "subárvores que aparecem em múltiplas árvores no dataset" | `BioComp_UFF/workflow/utils/treeUtils.py:167` | Parafraseia a própria definição do problema do artigo (Seção 1) |

**Conclusão desta seção:** o NMFSt.P (e sua base conceitual, documentada em profundidade nesta versão estendida) é o ancestral direto e rastreável do módulo `subtree_mining`/`subtree_construction` do `BioComp_UFF` atual — não um trabalho relacionado citado por cortesia. O `Backend/src/suporte_de_ramo.py:233` também usa `tree.find_clades()`, mas nesse caso para suporte de ramo (M3), não para mineração de subárvore — não confundir as duas linhagens de uso da mesma API do Biopython.

O que **não** sobreviveu ao PhyloTreeMiner atual: a métrica de similaridade par-a-par entre subárvores com limiar `θ` (Algoritmo 3) foi substituída pelo FPMax sobre itemsets de táxons — uma mudança de formalismo mais forte (itens maximais frequentes têm garantias combinatórias que uma comparação de similaridade ad hoc não tem), coerente com a proposta declarada do projeto atual (`docs/science/03-metricas.md`).

## 7. Limitações e trabalhos futuros apontados pelos autores

- **Paralelismo não implementado na versão pública** (ver §4.2) — já discutido, é a limitação mais importante para não repetir como alegação futura.
- **Segmentos não paralelizáveis** limitam o speedup mesmo quando o paralelismo é usado — eficiência ótima em apenas 16 vCPUs, caindo depois.
- **Trabalho futuro declarado**: integrar captura de proveniência via a biblioteca DfAnalyzer (Silva et al., 2020) e conduzir experimentos com datasets maiores para avaliar escalabilidade.
- Nenhuma das duas foi encontrada implementada no código atual (`BioComp_UFF/workflow/` não referencia DfAnalyzer nem proveniência de execução no sentido descrito pelo artigo; o manifesto de execução do projeto atual, `manifest.json`, é uma solução independente e posterior — ver `docs/automation/10-marcos-e-metas.md M2.5`). Vale registrar como linhagem paralela de ideias que convergiram para necessidades semelhantes (rastreabilidade de execução), sem dependência direta.

## 8. Relevância para M6 e publicações futuras

Esta é a **versão citável em veículo internacional** da linhagem NMFSt.P — publicada em periódico (JIDM) com DOI, em inglês, com revisão por pares mais extensa que a versão de conferência de 2023. Para qualquer manuscrito do PhyloTreeMiner destinado a um veículo internacional (a meta declarada é *Nature*-adjacent, ver `docs/README.md`), esta é a citação correta para a seção de *Related Work*/*Prior Work* sobre a origem do projeto — não a versão em português de 2023, que deve ser citada apenas quando o contraste entre as duas versões for relevante (por exemplo, para mostrar a evolução metodológica entre 2023 e 2025).

Pontos específicos que o Methods/Related Work do manuscrito de M6 deveria herdar deste artigo:

1. **A genealogia do FPMax como evolução, não coincidência**: o artigo mostra que o projeto já testou uma abordagem de similaridade par-a-par (Algoritmo 3) antes de adotar itens maximais frequentes — essa evolução metodológica é evidência de maturação de método, citável como motivação de design.
2. **O precedente de comparação de desempenho contra baseline** (SciPhyloMiner) estabelece um padrão de avaliação computacional (makespan, speedup, eficiência, ambiente de nuvem declarado) que o M6/M7.7 já segue (curva de custo com ambiente declarado) — cita-se este artigo como o primeiro do grupo a fazer esse tipo de benchmarking.
3. **A citação de MfstMiner (Deepak e Fernández-Baca, 2014)** no artigo — "a tool tailored for identifying all maximal frequent subtrees within databases of phylogenetic trees. A maximal frequent subtree is one with the largest possible number of leaves (tips)" — é a referência formal mais próxima do conceito de "item maximal frequente" que o PhyloTreeMiner atual usa; vale conferir se essa é a citação correta para fundamentar formalmente o FPMax na seção de Methods do artigo principal, em vez de citar apenas a literatura genérica de mineração de padrões frequentes.

---

**Fonte primária:** `Artigos-Referencia/Exploring Evolutionary Patterns: A Jupyter Notebook for Discovering Frequent Subtrees in Phylogenetic Tree Databases]{Exploring Evolutionary Patterns: A Jupyter Notebook for Discovering Frequent Subtrees in Phylogenetic Tree Databases.pdf` (arquivo local, sem link externo).
