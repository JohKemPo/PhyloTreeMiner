# Literatura — a linhagem do método e os baselines externos

[← Documentação](../README.md)

Esta pasta é a **biblioteca de contexto** dos artigos de referência do projeto: um dossiê por PDF em [`../../Artigos-Referencia/`](../../Artigos-Referencia/), com análise aprofundada (não resumo de abstract), escrito para que uma janela de contexto nova entenda o que cada artigo prova, o que ele não prova, e como ele se relaciona com o estado **atual** do código e dos marcos (`docs/automation/10-marcos-e-metas.md`) — sem precisar reabrir o PDF, operação cara em tokens.

Os PDFs originais ficam versionados em `Artigos-Referencia/` como backup — cada dossiê aqui tem uma linha final `**Fonte primária:**` apontando para o arquivo exato.

## Os dois grupos

**A linhagem própria do método** (mesmo grupo de pesquisa, UFF — João Vitor Moraes como autor central, o mesmo autor deste projeto): quatro publicações que documentam a evolução da ferramenta, do notebook de identificação paralela de subárvores até a arquitetura atual com grafo de conhecimento.

**Os baselines externos**: dois artigos de terceiros que fundamentam, respectivamente, o dataset científico de referência (Variola) e o dataset de demonstração histórico da ferramenta (Zika).

| # | Documento | Artigo | O que é | Ano |
|---|---|---|---|---|
| [`03`](03-nmfst-p-notebook-paralelo.md) | NMFSt.P | Ferrari, Moraes, de Oliveira — *NMFSt.P: um Notebook para Identificação em Paralelo de Subárvores Frequentes* | Precursor mais antigo da linhagem: mineração de subárvores num notebook Jupyter com paralelismo via Parsl, sem grafo ainda | 2023 (BreSci) |
| [`02`](02-fpmax-mineracao-subarvores-frequentes.md) | FPMax / PhyloTreeMiner | Moraes, Castro, Rosseti, de Oliveira — *Mineração de Subárvores Frequentes em Árvores Filogenéticas usando Conjuntos de Itens Frequentes Maximais* | Formaliza o problema como mineração de itemsets maximais (FPMax); introduz o grafo Neo4j; estudo de caso com Zika (479 seqs.) | s.d. (pós-2023) |
| [`04`](04-exploring-evolutionary-patterns-notebook.md) | Exploring Evolutionary Patterns | Moraes, Ferrari, Rosseti, de Oliveira — versão estendida internacional do NMFSt.P, *JIDM* 16:1 | Extensão de periódico do NMFSt.P (2023), com experimento novo e fundamentação ampliada | 2025 |
| [`05`](05-phylotreeminer-integracao-grafos.md) | PhyloTreeMiner — Grafos | Moraes, Castro, Rosseti, de Oliveira — *PhyloTreeMiner: Integração de Dados Heterogêneos e Consultas em Grafos para Mineração de Padrões Filogenéticos* | Descrição de sistema mais completa e mais recente da própria ferramenta — arquitetura de 3 camadas, schema do grafo, consultas Cypher | s.d. (mais recente que `02`) |
| [`01`](01-li-2007-origem-variola.md) | Li et al. 2007 | Li, Carroll, Gardner, Walsh, Vitalis, Damon — *On the origin of smallpox: correlating variola phylogenics with historical smallpox records*, PNAS 104(40) | **Baseline externo do invariante científico** (`docs/automation/10-marcos-e-metas.md §0`) — fundamenta o dataset `VARV-49` e o gate de M2 | 2007 |
| [`06`](06-zika-filogenomica-2024.md) | Zadra et al. 2024 | Zadra, Rizzoli, Rota-Stabelli — *Comprehensive phylogenomic analysis of Zika virus*, Virus Research 350 | **Baseline externo do dataset de demonstração histórico** — fonte original das 479 sequências ZIKV usadas nos artigos `02`/`05` | 2024 |

## O que ler primeiro

- Se a tarefa é **M6/manuscrito** e envolve citar a linhagem do método: leia `05` primeiro (é a descrição de sistema mais completa e mais recente), depois `02` (formalização do problema FPMax), depois `03`→`04` (histórico do notebook, caso o manuscrito precise da genealogia completa).
- Se a tarefa toca **o invariante científico ou o dataset VARV-49**: leia `01` — é normativo, não histórico.
- Se a tarefa toca **qualquer número do estudo de caso Zika** (nos artigos `02`/`05`, ou no grafo Neo4j em `docs/science/05-grafo-neo4j.md`): leia `06` antes de reusar qualquer número — há uma divergência de contagem já registrada (479/16 árvores publicadas vs. 477-480/10 árvores medidas no grafo atual) que precisa ser resolvida antes de citar.

## Achados que atravessam vários dossiês (não resolvidos aqui, registrados para triagem)

1. **Divergência de contagem do estudo de caso Zika**: os artigos `02`/`05` reportam 479 sequências e 16 árvores; o grafo Neo4j medido hoje (`docs/science/05-grafo-neo4j.md`) tem 477 acessos e 10 árvores no projeto `Zika_Virus_Singapura_Large_480seq`. `06` confirma que 479 é o `n` correto pós-curadoria segundo a fonte primária dos dados — a diferença é do lado do projeto, não do dataset. Candidato a item de triagem antes de M6.
2. **`Zika_21seq_validacao`** (usado pela skill `validar-workflow` e pelo handoff de máquina de validação) é uma subamostra de 21 sequências **não derivada diretamente** do dataset de 479 de `06` — não confundir o conjunto de validação técnica do pipeline com o dataset científico dos artigos `02`/`05`.
3. **`app.py` já não existe como monólito**: os artigos `02` e `05` descrevem uma arquitetura anterior ao M5/Arq-B (`docs/automation/10-marcos-e-metas.md §6`) — qualquer citação desses artigos como "descrição de sistema" em M6 precisa de uma frase de atualização explícita sobre a quebra do monólito e as correções de M4.
4. **Datação/relógio molecular de Li et al. (2007) nunca foi reproduzida** pelo projeto, nem está em nenhum marco atual (`01` §8) — se um revisor perguntar, a resposta documentada é que está fora de escopo por design, não um esquecimento.

---
**Como estes dossiês foram produzidos:** leitura integral de cada PDF em `Artigos-Referencia/` (nenhum resumo de terceiros), cruzado contra o estado atual do repositório (`docs/science/`, `docs/automation/`, código em `BioComp_UFF/` e `Backend/`) em 2026-09-13.
