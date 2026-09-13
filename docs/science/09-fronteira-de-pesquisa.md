# Fronteira de pesquisa — datasets, organismos, métodos e otimização para elevar o patamar do PhyloTreeMiner

[← Ciência](README.md) · Base: [`04-agenda-de-pesquisa.md`](04-agenda-de-pesquisa.md) (o que rodar **nos dados atuais**) e [`../respostasUteis/r5.md`](../respostasUteis/r5.md) (por que o patamar hoje não é Nature, e os dois caminhos para mudar isso)

Este documento responde a uma pergunta diferente da agenda E1-E9: não "o que fazer com VARV-49 e o Zika de demonstração", mas **para onde expandir** — que organismos, que métodos e que otimizações, hoje fora do escopo do projeto, tornariam o PhyloTreeMiner uma contribuição de fronteira, e não apenas uma reanálise metodológica correta de dado antigo. Toda recomendação aqui vem de pesquisa na literatura e nas ferramentas publicadas em 2024-2025, não de intuição interna — cada afirmação tem fonte.

---

## 0. Como ler este documento

Três blocos, na ordem em que valem a pena ser considerados:

1. **§1 — Organismos e datasets**: candidatos concretos, com dado público disponível hoje, ordenados por proximidade de engenharia (quanto do pipeline atual já serve) e por relevância/urgência de saúde pública.
2. **§2 — Fronteira metodológica**: o que outros grupos estão publicando agora sobre os mesmos problemas que o PhyloTreeMiner ataca (discordância de suporte, redes reticuladas, validação por simulação), e onde o projeto está atrás ou pode se diferenciar.
3. **§3 — Otimização e escalabilidade**: o que a literatura de HPC filogenético oferece hoje que o projeto não usa, com conexão direta a M7.7/M7.8 e à paralelização abandonada do NMFSt.P (ver [`docs/literatura/03-nmfst-p-notebook-paralelo.md`](../literatura/03-nmfst-p-notebook-paralelo.md)).

Ao final, §4 prioriza tudo isso contra o esforço de engenharia necessário.

---

## 1. Organismos e datasets promissores

### 1.1 Mpox (*Monkeypox virus*, MPXV) — o candidato mais forte, por proximidade genômica com VARV

MPXV é, como VARV, um *Orthopoxvirus* — mesmo gênero, genoma de dupla-fita de DNA de tamanho e estrutura comparáveis (ITRs incluídas), o que significa que **praticamente todo o pipeline atual do PhyloTreeMiner (alinhamento, inferência, mineração FPMax) se aplica sem reengenharia**. Isso muda o cálculo de custo/benefício: não é um novo domínio, é o mesmo domínio com dado novo e pergunta em aberto.

**Por que é urgente e não apenas conveniente:**

- O clado IIb (linhagem B.1) causou o surto global de 2022, detectado em 116 países, com mais de 10.670 genomas públicos de 65 países já sequenciados entre 1958 e 2024 — volume de dado muito maior que o de VARV.
- Um estudo de 2023 (Bangkok) já documenta **substrutura ainda não resolvida** dentro do clade IIb — sublinhagens IIb-A, IIb-B, IIb-C com dinâmica temporal distinta (IIb-A em 2022, IIb-B/IIb-C emergindo em 2023) — exatamente o tipo de pergunta ("essa subestrutura é robusta a método de inferência, ou artefato de um único pipeline?") que o suporte metodológico do PhyloTreeMiner foi desenhado para responder.
- Mais importante: em 2023-2024 emergiu uma **linhagem nova do clado I** (não IIb) causando transmissão sustentada humano-humano no leste da República Democrática do Congo — evento que a OMS classificou como Emergência de Saúde Pública de Importância Internacional em 2024. Isso é uma pergunta filogenética genuinamente em aberto, com consequência epidemiológica real, não uma reanálise de estrutura já publicada — é o tipo exato de "dado novo + pergunta biológica não respondida" que a R5 identificou como faltante em VARV/Zika.

**Recomendação concreta**: aplicar o invariante científico e o suporte metodológico (M3) a um dataset curado de MPXV clado I vs. IIb, testando se a robustez de clado clássico (monofilia de clado I, distinção de sublinhagens IIb) sobrevive à troca de método — e, principalmente, testar se a linhagem nova de clado I do leste da RDC forma um clado robusto a 4/4 métodos ou se sua posição é instável (o que teria implicação epidemiológica real: uma posição filogenética instável enfraqueceria hipóteses sobre origem/via de introdução dessa linhagem).

**Custo de engenharia**: baixo — mesmo gênero, mesmas ferramentas, defeitos já conhecidos do pipeline (D13 rótulos truncados, tratamento de ITRs de E5) provavelmente se aplicam do mesmo jeito e já têm correção.

### 1.2 Influenza A — segmentado, com um problema estrutural que o método do PhyloTreeMiner pode generalizar

Influenza tem genoma segmentado (8 segmentos), e **reassortment** (troca de segmentos entre linhagens) é detectado hoje comparando a topologia de árvores construídas por segmento — se um mesmo isolado ocupa posições incongruentes em árvores de segmentos diferentes, houve reassortment. As ferramentas de referência são:

- **FluReF**: busca incongruências entre árvores de segmentos e do genoma completo, de baixo para cima, com limiares pré-definidos.
- **TreeKnit**: infere grafos de rearranjo ancestral **comparando pares** de árvores de segmentos por diferença topológica.
- **RF-Net 2** (2021, com atualizações): infere redes de reassortment/hibridização usando **distância de Robinson-Foulds** entre árvores — a mesma métrica que `BioComp_UFF/workflow/stability/` já calcula.

**A lacuna que o PhyloTreeMiner pode preencher**: todas as ferramentas acima comparam **pares** de árvores (segmento A vs. segmento B) ou usam heurísticas bottom-up. Nenhuma delas faz o que o FPMax já faz nativamente — **mineração multi-way de padrões (subárvores/clados) que coocorrem através de mais de duas árvores simultaneamente**, com um suporte formal (fração de segmentos que concordam). Reformular o problema de reassortment como "cada segmento é uma árvore/transação, cada clado é um item, o suporte é a fração de segmentos que o recuperam" é literalmente a mesma modelagem que o artigo fundacional do PhyloTreeMiner já usa para pipelines — trocando o eixo de variação (método → segmento genômico). Isso é uma generalização genuína e defensável do método já existente, aplicada a um problema onde a métrica de comparação usual (RF par a par) já é a mesma que o projeto calcula.

**Urgência concreta**: o surto de H5N1 clado 2.3.4.4b em gado leiteiro dos EUA (genótipo B3.13, identificado como um evento de reassortment entre linhagens eurasiáticas e americanas de aves silvestres no fim de 2023) está **em curso** — infectou pelo menos 989 rebanhos em 17 estados até março de 2025, com pelo menos dois genótipos distintos (B3.13, D1.1) circulando e evidência de evolução acelerada em gado por relaxamento de seleção purificadora. Dado público farto (NCBI, GISAID), pergunta genuinamente aberta (quantos eventos de reassortment independentes, robustez da árvore por segmento a escolha de pipeline).

**Custo de engenharia**: médio-alto — exige adaptar o pipeline de entrada para tratar 8 segmentos por amostra como unidades relacionadas (não trivial dado que o `workflow_dataAcquisition.py` atual assume um genoma por amostra), mas o núcleo de mineração/suporte não muda.

### 1.3 Dengue (DENV-1 a DENV-4) — recombinação já é prática padrão do campo, validando o E6 do projeto

Estudos de 2024-2025 sobre DENV-2 (incluindo um de julho de 2025 compilando 414 genomas completos) já usam **RDP4 para triagem de recombinação antes de qualquer inferência filogenética**, e IQ-TREE com UFBoot como padrão de inferência — exatamente o desenho que `docs/science/04-agenda-de-pesquisa.md` propõe para o E6 (efeito da recombinação), ainda não executado no projeto. Isso não é um organismo com pergunta nova para o PhyloTreeMiner testar — é **evidência de que o E6 já pendente no backlog do projeto está alinhado com a prática corrente do campo**, o que aumenta a prioridade de executá-lo (um revisor de dengue ou de Orthopoxvirus vai esperar ver esse controle).

**Recomendação**: não é candidato a novo dataset por si — é reforço de prioridade para fechar **E6** com os dados de Variola já em mãos, citando esta prática corrente como padrão do campo.

### 1.4 Vigilância genômica em águas residuais — o nicho de aplicação mais original encontrado nesta pesquisa

Esta é a descoberta mais promissora da pesquisa, porque ataca um problema estrutural diferente de tudo que o projeto já fez. Ferramentas como **Freyja 2** (2025) fazem vigilância genômica multi-patógeno em tempo real a partir de amostras de esgoto — já rastreando COVID-19, mpox e H5N1 simultaneamente, com mais de 200 mil downloads. O problema central dessas amostras é que elas são **misturas de múltiplas linhagens/variantes**, e a "desconvolução" (estimar que frações de quais linhagens estão presentes) depende de escolhas de pipeline (referência usada, método de chamada de variante, banco de barcodes de linhagem) — é um problema com **exatamente a mesma estrutura** que o suporte metodológico do PhyloTreeMiner mede: "essa conclusão sobrevive à troca de pipeline, ou é artefato de uma escolha específica?"

**A oportunidade**: em vez de minerar subárvores robustas a troca de alinhador/inferência, minerar **atribuições de linhagem robustas a troca de pipeline de desconvolução** (Freyja vs. outras ferramentas de desconvolução, diferentes bancos de referência de barcode) em dados de vigilância de esgoto. Isso é uma aplicação genuinamente nova do método central do projeto (concordância entre pipelines como medida de confiança), fora do nicho já ocupado por concordance factors e bootstrap, e alinhada com uma infraestrutura de saúde pública real e em expansão ativa (COVID-19, mpox e H5N1 já sendo monitorados assim). É também a aplicação que mais long-term se alinha ao enquadramento de "computação para o bem da saúde pública" que o projeto já reivindica.

**Custo de engenharia**: alto — é um domínio de dado diferente (leituras de sequenciamento de amostra ambiental mista, não genomas montados individuais), exigiria uma camada de pré-processamento nova. Não é para agora; é a aposta de maior retorno potencial de longo prazo.

### 1.5 Resumo priorizado

| Candidato | Dado disponível | Pergunta em aberto real | Custo de engenharia | Urgência/relevância |
|---|---|---|---|---|
| **Mpox (clado I novo + IIb)** | 10.670+ genomas públicos, 65 países | Robustez da linhagem nova de clado I (RDC); substrutura IIb-A/B/C | **Baixo** — mesmo gênero de VARV | Alta — PHEIC 2024, pergunta ativa |
| **Influenza H5N1 (gado)** | NCBI/GISAID, genótipos B3.13/D1.1 | Reassortment como mineração multi-way, não par a par | Médio-alto — genoma segmentado | Alta — surto em curso |
| **Dengue (recombinação)** | 400+ genomas DENV-2 recentes | Nenhuma (reforça E6 já planejado) | Baixo — já é o E6 | Média — valida prática, não abre organismo novo |
| **Vigilância em esgoto (Freyja-like)** | Dados de vigilância pública (CDC NWSS, outros) | Concordância entre pipelines de desconvolução como medida de confiança | Alto — novo tipo de dado | Alta a longo prazo — infraestrutura ativa e crescente |

---

## 2. Fronteira metodológica

### 2.1 O campo de "redes filogenéticas" (evolução reticulada) está mais maduro do que o E6 do projeto assume

O E6 (`docs/science/04-agenda-de-pesquisa.md`) propõe detectar recombinação com RDP4/GARD/3SEQ e particionar o alinhamento em blocos — uma abordagem válida, mas que trata a recombinação como algo a *remover* antes de inferir uma única árvore por bloco. A literatura de 2024-2025 oferece uma alternativa mais direta: **inferir a rede reticulada diretamente**, sem descartar sinal:

- **InPhyNet** (2025) — inferência de redes filogenéticas massivamente escalável, validada contra SNaQ/NeighborNet/Consensus Networks.
- **PhyloNet** — pacote estabelecido, com o método RECOMP especificamente para detectar recombinação interespecífica em alinhamentos.
- **SplitsTree** (atualizado em 2024) — NeighborNet e Consensus Networks, interativo.
- **RF-Net 2** — já citado em §1.2, infere redes de reassortment/hibridização por RF.

**Implicação para o projeto**: em vez de (ou além de) particionar o alinhamento e rodar M pipelines por bloco (E6 como está desenhado), vale considerar **inferir uma rede reticulada sobre o dataset inteiro** e comparar sua estrutura com o consenso de suporte metodológico do FPMax — duas formas independentes e complementares de capturar "onde a árvore não é o modelo certo". Isso também dá uma resposta mais direta e mais citável à pergunta "o suporte metodológico baixo é ruído de método ou sinal biológico de recombinação?", que hoje o E6 só responde indiretamente (comparando suporte dentro/fora de blocos).

### 2.2 Alternativas ao bootstrap continuam surgindo — o campo não considera o problema resolvido

Além das concordance factors (gCF/sCF, já cobertas em [R5](../respostasUteis/r5.md)), a pesquisa localizou uma terceira via, publicada em *Nature Communications* (2024): um **substituto de bootstrap baseado em aprendizado de máquina**, treinado sobre milhares de árvores e alinhamentos simulados com verdade conhecida, comparando a topologia inferida com a árvore verdadeira para treinar um estimador direto de suporte de ramo — evitando o custo computacional do bootstrap tradicional sem depender de reamostragem.

**Implicação**: se o projeto for medir "suporte metodológico" contra o estado da arte (recomendação já feita em R5), o comparativo correto não é só bootstrap × gCF/sCF × suporte metodológico — é um **comparativo de quatro vias**, incluindo o estimador por aprendizado de máquina, porque é isso que um revisor de MBE/Systematic Biology vai esperar em 2026. Isso também aponta para a necessidade, já identificada em R5, de um estudo com **simulação e verdade conhecida** — que é exatamente o desenho que o artigo de ML usou para treinar e validar seu método, e é hoje considerado prática obrigatória (não opcional) para validar qualquer nova métrica de suporte no campo.

### 2.3 Validação por simulação é hoje um requisito padrão, não um extra

A pesquisa confirma, com uma revisão de 2024 sobre realismo de simulação de sequências (*MBE*), que o desenho padrão de validação de método no campo é: amostrar uma árvore verdadeira de uma distribuição a priori, simular sequências sobre ela, rodar o método de inferência, e comparar com a verdade conhecida — e que **comparar com o estado da arte em dados simulados e empíricos é obrigatório** para validar um método novo. Isso confirma e reforça a recomendação já feita em [R5 §6](../respostasUteis/r5.md#caminho-a--fortalecer-como-artigo-de-métodoferramenta-dentro-do-controle-do-projeto): sem uma bateria de simulação com verdade conhecida (INDELible, Seq-Gen, ou o simulador mais recente de geração de sequências ao longo de uma árvore citado nessa mesma revisão), o suporte metodológico do PhyloTreeMiner não tem, hoje, o tipo de validação que os revisores do campo exigem de uma métrica nova.

---

## 3. Otimização e escalabilidade

### 3.1 GPU/BEAGLE — infraestrutura madura, nunca avaliada pelo projeto

A biblioteca **BEAGLE** (atualmente na versão 4.1) é o padrão de fato para acelerar o cálculo de verossimilhança em filogenética estatística — usada por BEAST X, BEAST 2.5, MrBayes, RevBayes e PhyML, com suporte a multi-thread, SIMD e GPU (CUDA/OpenCL). O pipeline atual do PhyloTreeMiner usa MrBayes (que já suporta BEAGLE) e não há registro, em nenhum documento do projeto, de BEAGLE ter sido avaliado ou ativado. Isso é um item de baixo custo de investigação: **conferir se o MrBayes do ambiente pinado (`environment.yml`) foi compilado com suporte a BEAGLE, e medir o ganho** — antes de qualquer decisão sobre paralelismo customizado (Parsl, item 3.2 abaixo), porque pode ser um ganho "de graça" via configuração, não via reengenharia.

### 3.2 CMAPLE — inferência em escala de pandemia, relevante se o projeto crescer para mpox/H5N1 (§1)

**CMAPLE** (Ly-Trong et al., 2024) foi desenhado especificamente para inferência de máxima verossimilhança em **escala de pandemia** — avaliação de verossimilhança eficiente em memória e busca de topologia massivamente paralela, pensado para datasets do tamanho dos que GISAID acumula para SARS-CoV-2 (centenas de milhares a milhões de genomas). Se a recomendação de §1.1 (mpox, 10.670+ genomas) ou §1.2 (influenza) for adiante, o conjunto de ferramentas de inferência do PhyloTreeMiner (hoje FastTree/IQ-TREE/RAxML-NG/MrBayes) provavelmente precisa incorporar algo como CMAPLE como quinto método — os métodos atuais não foram desenhados para essa escala, e um dos achados do próprio M7 (`docs/automation/10-marcos-e-metas.md §8`) é que parcimônia (Biopython puro) já é 25× mais lenta que ML em datasets pequenos; a escala de mpox tornaria isso impraticável sem um método desenhado para isso.

### 3.3 A paralelização abandonada do NMFSt.P — decisão a tomar, não a reativar cegamente

Já documentado em [R4](../respostasUteis/r4.md#3-o-paralelismo-via-parsl-do-nmfstp-nunca-chegou-à-produção--e-conecta-com-a-lacuna-de-m777m78) e no dossiê [`03-nmfst-p-notebook-paralelo.md`](../literatura/03-nmfst-p-notebook-paralelo.md): a técnica de paralelização via Parsl do artigo NMFSt.P nunca chegou à produção (`parallelWorkflow.py` é um stub morto). A pesquisa desta seção não muda essa avaliação — só a reforça: **nenhuma das ferramentas de ponta encontradas (BEAGLE, CMAPLE) usa Parsl** — o ecossistema de HPC filogenético convergiu para bibliotecas de baixo nível (CUDA/OpenCL via BEAGLE) e algoritmos memory-efficient (CMAPLE), não para orquestração de tarefas em notebook. **Recomendação**: se e quando M7.7/M7.8 (ou a expansão para mpox/H5N1 de §1) mostrarem que a mineração de subárvores (não a inferência de árvore) é o gargalo, vale reavaliar Parsl especificamente para essa etapa — mas não para a inferência de árvore em si, onde BEAGLE/CMAPLE são a resposta madura do campo.

---

## 4. Síntese priorizada

| Ação | Bloco | Esforço | Retorno esperado | Depende de |
|---|---|---|---|---|
| **1. Mpox clado I/IIb como segundo dataset de referência** | §1.1 | Baixo | Alto — pergunta biológica real, PHEIC 2024, quase zero reengenharia | Curadoria de dataset + manifesto (mesmo padrão de M2.5) |
| **2. Conferir BEAGLE no MrBayes do ambiente pinado** | §3.1 | Muito baixo (é uma medição) | Potencial ganho de desempenho sem reengenharia | Nenhuma |
| **3. Benchmark de 4 vias: bootstrap × gCF/sCF × ML-bootstrap × suporte metodológico** | §2.2, retoma R5 | Médio | Transforma o achado de M3 de replicação em contribuição comparativa defensável | Rodar IQ-TREE com gCF/sCF sobre VARV-49/52/121 |
| **4. Simulação com verdade conhecida** | §2.3, retoma R5 | Médio-alto | Pré-requisito de aceitação em qualquer revista séria do campo | Escolher simulador (INDELible/Seq-Gen) |
| **5. Rede reticulada como segunda lente sobre E6** | §2.1 | Médio | Resposta mais direta a "ruído vs. sinal biológico" | E6 (recombinação) já em andamento |
| **6. Influenza H5N1 como generalização do FPMax para reassortment** | §1.2 | Alto | Posiciona o método como generalização de RF-Net2/TreeKnit, não como nicho de Variola | Reengenharia de ingestão multi-segmento |
| **7. Vigilância em esgoto como aplicação nova** | §1.4 | Alto | Maior potencial de impacto de longo prazo, alinhado ao enquadramento de saúde pública do projeto | Camada de pré-processamento nova, fora do escopo atual |

Os itens 1-2 são de baixo custo e podem entrar em paralelo a M6 sem competir por *write-lock*. Os itens 3-4 são o que R5 já apontava como Caminho A e continuam sendo o investimento de maior retorno por esforço para elevar o rigor do resultado já existente. Os itens 5-7 são apostas de escopo maior, mais adequadas para depois de M6 ou como agenda de pós-doutorado/próxima fase do projeto.

---

## 5. Fontes consultadas

**Mpox:**
- [Phylogenetic landscape of Monkeypox Virus (MPV) during the early outbreak in New York City, 2022](https://pubmed.ncbi.nlm.nih.gov/36927408/)
- [Global genomic surveillance of monkeypox virus](https://pubmed.ncbi.nlm.nih.gov/39442559/)
- [P-2344. Genomic Analysis of Monkeypox Virus (MPVX) Outbreak in Bangkok, Thailand in 2022-2023](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11777619/)
- [Sustained human outbreak of a new MPXV clade I lineage in eastern Democratic Republic of the Congo](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11485229/)

**Influenza / H5N1 / reassortment:**
- [Avian influenza A (H5N1) virus in dairy cattle: origin, evolution, and cross-species transmission (mBio)](https://journals.asm.org/doi/10.1128/mbio.02542-24)
- [The emergence and molecular evolution of H5N1 influenza viruses in United States dairy cattle](https://pmc.ncbi.nlm.nih.gov/articles/PMC13060070/)
- [FluReF, an automated flu virus reassortment finder based on phylogenetic trees](https://link.springer.com/article/10.1186/1471-2164-12-S2-S3)
- [TreeKnit: Inferring ancestral reassortment graphs of influenza viruses](https://pmc.ncbi.nlm.nih.gov/articles/PMC9447925/)
- [RF-Net 2: Fast Inference of Virus Reassortment and Hybridization Networks](https://www.biorxiv.org/content/10.1101/2021.05.05.442676.full.pdf)

**Dengue:**
- [Evolutionary history and transmission dynamics of dengue virus type 2 in Africa](https://pmc.ncbi.nlm.nih.gov/articles/PMC13171821/)

**Vigilância em águas residuais:**
- [Real-time, multi-pathogen wastewater genomic surveillance with Freyja 2](https://pmc.ncbi.nlm.nih.gov/articles/PMC12330420/)

**Redes filogenéticas / recombinação:**
- [A method for massively scalable inference of phylogenetic networks (InPhyNet)](https://www.biorxiv.org/content/10.1101/2025.05.05.652278v3.full)
- [Phylogenetic networks empower biodiversity research (PNAS)](https://www.pnas.org/doi/10.1073/pnas.2410934122)
- [PhyloNet: a software package for analyzing and reconstructing reticulate evolutionary relationships](https://bmcbioinformatics.biomedcentral.com/articles/10.1186/1471-2105-9-322)

**Alternativas a bootstrap / validação por simulação:**
- [A machine-learning-based alternative to phylogenetic bootstrap (Nature Communications, 2024)](https://www.nature.com/articles/s41467-024-55264-0)
- [Simulations of Sequence Evolution: How (Un)realistic They Are and Why (MBE, 2024)](https://academic.oup.com/mbe/article/41/1/msad277/7485625)

**GPU / escalabilidade:**
- [BEAGLE 4.1: A high-performance library for computation on phylogenetic trees across diverse parallel architectures](https://arxiv.org/pdf/2606.27607)
- CMAPLE (Ly-Trong et al., 2024) — citado via BEAGLE 4.1 acima como referência de inferência em escala de pandemia

---

**Como este relatório foi produzido:** pesquisa direta na internet sobre organismos com dado público disponível e pergunta filogenética em aberto, métodos de fronteira em redes reticuladas/validação de suporte, e infraestrutura de HPC filogenético — cruzada contra o backlog já registrado do projeto (M7.7/M7.8, E6-E8 da agenda de pesquisa, achados de `docs/literatura/` e `R4`/`R5`) em 2026-09-13. Nenhuma recomendação aqui foi implementada ou decidida — são candidatos para o usuário priorizar.
