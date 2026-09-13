# NMFSt.P — um Notebook para Identificação em Paralelo de Subárvores Frequentes em Conjuntos de Árvores Filogenéticas

[← Literatura](README.md)

## 1. Citação completa

Ferrari, C.; Moraes, J. V.; de Oliveira, D. **NMFSt.P: um Notebook para Identificação em Paralelo de Subárvores Frequentes em Conjuntos de Árvores Filogenéticas.** Instituto de Computação — Universidade Fluminense (UFF). Financiamento: CAPES (Código 001), CNPq (grant 311898/2021-1), FAPERJ (grant E-26/202.806/2019). Sem DOI/venue de publicação impresso no PDF disponível (parece ser o *camera-ready* de um simpósio nacional, a julgar pelo formato de duas colunas e o financiamento CAPES/CNPq/FAPERJ típico de SBC).

Repositório do notebook citado no próprio artigo: `https://github.com/UFFeScience/NMFSt.P` (descrito como "em processo de disponibilização" no momento da publicação).

**João Vitor Moraes é coautor deste artigo** — é o mesmo autor por trás do PhyloTreeMiner atual. Este é, portanto, um trabalho da própria linhagem de pesquisa do projeto, não uma referência externa.

## 2. Motivação

O artigo ataca um gargalo real e reconhecido pela literatura: encontrar subárvores frequentes em um conjunto de árvores filogenéticas é **NP-difícil** (Amir e Kesselman, 1997) e a comparação pode envolver centenas de árvores. A motivação declarada não é biológica — é de **usabilidade e infraestrutura**: os autores observam que ferramentas anteriores do próprio grupo (SciPhyloMiner, que usa o sistema de *workflow* SciCumulus) exigem que o usuário aprenda um sistema de workflow completo para rodar em ambientes de alto desempenho, o que é uma barreira de adoção. O NMFSt.P propõe resolver o mesmo problema computacional (identificação de subárvores compartilhadas entre árvores) **dentro de um notebook Jupyter**, com paralelismo transparente via a biblioteca `Parsl`.

Esse é um gargalo de **acessibilidade/complexidade operacional**, diferente do gargalo medido em `docs/automation/10-marcos-e-metas.md §8` (M7.5) — ali o problema é que o construtor de parcimônia em Biopython puro é **25× mais lento** que qualquer método de ML, um gargalo de desempenho bruto do algoritmo de inferência de árvore, não de mineração de subárvores. São dois gargalos distintos na mesma cadeia: NMFSt.P paraleliza a etapa *pós-inferência* (comparar árvores já construídas); M7.5 é sobre a própria etapa de *construção* da árvore. `docs/science/07-gargalos-e-rotas.md` também não documenta nenhum gargalo específico de comparação de subárvores em escala — a lacuna que o NMFSt.P endereça nunca foi medida no pipeline atual do PhyloTreeMiner.

## 3. Arquitetura do notebook

O NMFSt.P é um *workflow* de oito atividades (Figura 1 do artigo), das quais as quatro primeiras são o *sub-workflow* SciPhy (Ocaña et al. 2011) — reaproveitado, não reescrito:

1. **Validação das Sequências** (Biopython) — garante que os multi-FASTA de entrada são válidos.
2. **Alinhamento Múltiplo de Sequências** — ClustalW por padrão, mas o notebook permite trocar o programa "com poucas adaptações".
3. **Escolha do Modelo Evolutivo** — por padrão Neighbor Joining (Saitou e Nei, 1987) via Biopython; o usuário pode explorar RAxML ou MrBayes.
4. **Geração da Árvore Filogenética** — o resultado das três etapas anteriores.

A partir daqui começa a parte original do artigo:

5. **Geração das Subárvores Possíveis** (Algoritmo 1, `SubTreeGen`): para cada árvore, itera sobre todos os clados (`find_clades`) e salva como subárvore todo clado com mais de 1 folha terminal, em arquivo Nexus. Esta etapa é **paralelizável por natureza** — é *bag-of-tasks*, porque a extração de subárvores de uma árvore não depende das demais.
6. **Mapeamento das Subárvores** — classifica cada subárvore por tamanho.
7. **Cálculo da Similaridade entre Subárvores** (Algoritmos 2 e 3, `SubTreeMatrixGen` e `SimCalcFST`): constrói uma matriz esparsa e simétrica `m_subtree` com todas as subárvores identificadas, e calcula, para cada par de subárvores de árvores diferentes, um grau de similaridade normalizado em `[0,1]` (`grau_maf`/`sim_fst`). Pares com similaridade ≥ 1 (ou seja, idênticos, já que a normalização usa esse limiar) entram no banco de dados de saída `fst_db`.
8. **Geração do Dicionário de Saída** — o `fst_db`, consultável pelo usuário para identificar quais subárvores são compartilhadas entre árvores.

**Paralelismo**: implementado com a biblioteca `Parsl` (Babuji et al. 2019), via *decorators* `@python_app` anotados nas atividades de geração de subárvores e no cálculo de similaridade — não em todo o pipeline. O usuário anota onde o Parsl deve paralelizar; o restante do notebook roda sequencialmente. A versão com paralelização "ainda se encontra em processo de disponibilização" no momento da publicação.

## 4. Relação com o FPMax — **é uma técnica diferente**

Este é o ponto mais importante para não confundir a genealogia do projeto: **o NMFSt.P não usa FPMax nem qualquer variante de mineração de itens frequentes maximais.** O texto do artigo (lido integralmente) não cita "FPMax", "itemset" nem "padrão maximal" em nenhum momento. A técnica proposta é **baseada em similaridade par-a-par entre subárvores** (uma matriz de similaridade com limiar), não em contar suporte de um itemset (subárvore) através de um conjunto de "transações" (pipelines/árvores), que é o que o FPMax faz e o que a mineração atual de `all_results_fpmax.csv` implementa em produção.

Em outras palavras: o NMFSt.P resolve o **mesmo problema de negócio** (achar subárvores compartilhadas entre árvores filogenéticas de um conjunto) que o artigo "Mineração de Subárvores Frequentes... usando Conjuntos de Itens Frequentes Maximais" (ver [`02-fpmax-mineracao-subarvores-frequentes.md`](02-fpmax-mineracao-subarvores-frequentes.md)), mas com um **algoritmo distinto**: comparação de similaridade em vez de mineração de itens frequentes. Uma leitura conjunta dos dois dossiês é necessária para estabelecer se um sucedeu o outro, se são linhas de pesquisa paralelas do mesmo grupo, ou se o NMFSt.P é anterior e foi abandonado em favor do FPMax — o texto do NMFSt.P não cita o artigo do FPMax nem o contrário parece provável dado que o FPMax é a técnica que sobreviveu até o pipeline de produção atual (ver §6).

## 5. Resultados experimentais

- **Dataset**: subconjunto de 50 arquivos multi-FASTA de genes ortólogos de protozoários, derivado do dataset de 200 arquivos definido por Ocaña e Dávila (2011) — cada arquivo correspondendo a um gene.
- **Baseline de comparação**: SciPhyloMiner (Guedes et al. 2017), rodando sobre o sistema de workflow paralelo SciCumulus.
- **Ambiente**: Amazon AWS, quatro tipos de VM — `c5a.2xlarge` (8 vCPU/16 GiB), `c5a.4xlarge` (16 vCPU/32 GiB), `c5a.8xlarge` (32 vCPU/64 GiB), `c5a.16xlarge` (64 vCPU/128 GiB).
- **Resultado biológico**: NMFSt.P produziu as mesmas árvores que o baseline (mesma conclusão de relações consistentes entre táxons usando tanto RAxML quanto MrBayes); a única diferença é o formato de saída (banco de similaridades vs. lista de subárvores acima de um limiar `θ`).
- **Resultado computacional**: o *makespan* caiu de 155,40 min (2xlarge) para 49,24 min (16xlarge) — **melhoria de até 68,31%** ao passar de 8 para 64 vCPUs. Mas o ganho **não escala linearmente**: 4× mais vCPUs/RAM não trouxe 4× de melhoria — efeito de overhead de paralelização que os próprios autores registram como "sendo investigado".
- Comparado ao SciCumulus/SciPhyloMiner: NMFSt.P foi **ligeiramente mais lento** nas VMs menores (-2,9% na 2xlarge, -4,8% na 4xlarge) e **ligeiramente mais rápido** nas maiores (+1,6% na 8xlarge, +6,3% na 16xlarge) — resultado como "equivalente", não como vitória de desempenho; a vantagem alegada é de usabilidade (notebook vs. sistema de workflow completo), não de velocidade bruta.

## 6. Confronto com o estado atual do pipeline de produção

Busquei por `multiprocessing`, `Pool`, `concurrent.futures`, `parsl`, `joblib`, `ProcessPoolExecutor` em `BioComp_UFF/workflow/`. Achados:

- `BioComp_UFF/workflow/optimization/parallelWorkflow.py:1-17` define `parallel_tree_construction(trees_data, num_cores=None)`, cujo corpo é literalmente `# Implementação usando multiprocessing ou joblib` seguido de `NotImplemented`. **É um stub nunca implementado.**
- `BioComp_UFF/workflow/utils/tool_runs.py:35-37` traz o comentário: *"O pipeline é sequencial hoje, mas `parsl` está nas dependências e a paralelização por pipeline é um caminho previsto."* — ou seja, o próprio código reconhece `parsl` como dependência instalada mas não utilizada.
- Nenhuma ocorrência de mineração baseada em similaridade par-a-par (`sim_fst`/`grau_maf`) foi encontrada em `BioComp_UFF/workflow/stability/` — o módulo de mineração de padrões em produção (`stability.py`, `report.py`, ver `docs/science/05-grafo-neo4j.md` e `docs/automation/10-marcos-e-metas.md §5`) implementa contagem sobre `all_results_fpmax.csv`, gerado por um caminho FPMax separado dentro de `BioComp_UFF` (fora de `workflow/stability/`).

**Conclusão**: a técnica de paralelização do NMFSt.P (Parsl, `@python_app`) **nunca chegou à produção**. O que existe hoje é um stub morto (`parallelWorkflow.py`) e uma dependência instalada e não usada (`parsl`). Isso tem relação direta com **M7.7/M7.8** (`docs/automation/10-marcos-e-metas.md §8`): a curva de custo por método e o eixo de núcleos que M7.7/M7.8 exigem medir seriam exatamente o tipo de dado que justificaria (ou descartaria) reativar essa paralelização — hoje a decisão está em aberto porque **nunca foi medida a necessidade real**: com `M ≤ 10` pipelines e datasets de dezenas de táxons (não 200 árvores de protozoários), o gargalo de mineração de subárvores pode simplesmente não existir na escala atual do PhyloTreeMiner.

## 7. Limitações e trabalhos futuros apontados pelos autores

- A versão com paralelização "ainda se encontra em processo de disponibilização" — o artigo publica resultados de uma implementação que os próprios autores classificam como não plenamente liberada.
- O comportamento sub-linear do speedup com mais vCPUs é reconhecido e deixado como investigação em aberto, sem explicação causal no texto.
- Trabalhos futuros declarados: (i) acoplar ferramentas de **captura de proveniência** ao NMFSt.P; (ii) executar experimentos com **datasets maiores** que o de 50 genes usado.
- O artigo não discute custo de memória, apenas tempo (*makespan*) — não há medição de pico de RSS, o que o projeto atual já cobra de si mesmo em M7.7 (`docs/automation/10-marcos-e-metas.md`).

## 8. Relevância para M6 e publicações futuras

- **Citação de linhagem/genealogia**: este artigo é candidato natural para a seção de *Related Work*/*Background* do manuscrito de M6 — mostra que o grupo já explorou paralelização de mineração de subárvores por notebook antes de convergir para a arquitetura FPMax + API + Neo4j do PhyloTreeMiner atual. Vale registrar essa evolução explicitamente no manuscrito como parte da narrativa metodológica (de workflow paralelo → notebook paralelo → ferramenta web integrada a grafo).
- **Não é citável como parte da implementação atual** — a técnica descrita (similaridade par-a-par, Parsl) não está em produção; citar como "trabalho relacionado do mesmo grupo", não como "componente do PhyloTreeMiner".
- **Reaproveitamento futuro condicional**: se M7.7/M7.8 medirem que a mineração de padrões (ou a construção de árvores) se torna o gargalo dominante em datasets maiores que os atuais (VARV-49/52/121), a técnica de paralelização *bag-of-tasks* do Algoritmo 1 do NMFSt.P (paralelizar por árvore de entrada) é diretamente aplicável e mais simples de reativar que desenhar uma nova abordagem — mas isso depende de medição, não deve ser assumido.
- **Cuidado editorial**: como João Vitor Moraes é coautor, este artigo entra também no CV/histórico de publicações do autor da tese — relevante para a carta de apresentação e para o enquadramento de "trabalho em desenvolvimento contínuo" que `docs/agents/13-escrita-cientifica.md §5` já recomenda.

---
**Fonte primária:** `Artigos-Referencia/NMFSt.P - um Notebook para Identificação em Paralelo de Subárvores Frequentes em Conjuntos de Árvores Filogenéticas.pdf` (arquivo local, sem link externo).
