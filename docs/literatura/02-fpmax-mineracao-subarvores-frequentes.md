# Mineração de Subárvores Frequentes em Árvores Filogenéticas usando Conjuntos de Itens Frequentes Maximais

[← Literatura](README.md)

> **Este é o próprio artigo do PhyloTreeMiner.** Não é um precursor externo: é a publicação que descreve o *workflow* que o repositório atual implementa, com o estudo de caso feito sobre o vírus Zika. Repositório citado no artigo: `https://github.com/UFFeScience/phylotreeminer`.

## 1. Citação completa

João Vitor Moraes¹, Layse Gomes Castro¹, Isabel Rosseti¹, Daniel de Oliveira¹ — ¹Instituto de Computação, Universidade Federal Fluminense (UFF). *Mineração de Subárvores Frequentes em Árvores Filogenéticas usando Conjuntos de Itens Frequentes Maximais.* Sem veículo/ano explícitos no corpo do PDF (nem DOI); agradecimentos à CAPES, ao CNPq e à FAPERJ. Contatos: `{joaovitormoraes,laysegomes}@id.uff.br`, `{danielcmo,rosseti}@ic.uff.br`.

## 2. Problema formal

O artigo parte de um diagnóstico: análises filogenéticas com métodos distintos (NJ, UPGMA, Máxima Parcimônia, Máxima Verossimilhança, Inferência Bayesiana) sobre o mesmo conjunto de sequências produzem topologias diferentes — "viés da heurística" (Holder et al. 2008). A prática de sintetizar essas topologias em uma **árvore de consenso** (Margush & McMorris 1981) é apontada como problemática porque mascara conflitos topológicos relevantes (ex.: sinais de recombinação/transferência horizontal, Bryant 2003).

A alternativa proposta é a **Mineração de Subárvores Frequentes** (FSM, *Frequent Subtree Mining*, citando Deepak et al. 2014): em vez de condensar múltiplas árvores numa só, identificar **padrões topológicos recorrentes** (clados que aparecem de forma consistente entre árvores) acima de um limiar de suporte, preservando informação que o consenso descartaria.

**Codificação do problema como mineração de itemsets** (o núcleo da contribuição):

- Cada **árvore filogenética** (produzida por uma combinação alinhador × método de inferência) é uma **transação**.
- Cada **subárvore/clado** — obtido decompondo a topologia por travessia — é um **item**.
- Para tornar clados estruturalmente idênticos (mesmo conjunto de folhas), ainda que provenientes de árvores/rotulagens distintas, comparáveis como o mesmo item, cada subárvore é convertida em um **identificador único por hashing**.
- Constrói-se então uma **matriz de incidência Subárvore–Árvore** (linhas = árvores/pipelines, colunas = identificadores de subárvore, valores = presença/ausência) — exatamente uma base de dados transacional no sentido clássico de mineração de itemsets.
- Sobre essa matriz, aplica-se **FPMax** (Grahne & Zhu 2005) para extrair os **itemsets maximais frequentes**: conjuntos de subárvores que coocorrem em múltiplas árvores e que não estão contidos em nenhum outro itemset frequente maior. O suporte de um padrão é a fração de árvores (pipelines) que o contêm.

A escolha de **maximais** (em vez de todos os frequentes) é justificada por custo computacional: reduz o espaço de busca e evita a explosão combinatória de enumerar todo o reticulado de itemsets frequentes, especialmente relevante porque o número de subárvores por árvore filogenética cresce rápido com `n` (número de táxons).

## 3. Algoritmo e arquitetura do *workflow*

O artigo não reproduz o pseudocódigo do FPMax (remete a Grahne & Zhu 2005) — a contribuição é a **modelagem do domínio filogenético como entrada para ele**, não uma nova variante do algoritmo. O *workflow* completo (Figura 1 do artigo) tem cinco macroatividades:

1. **Coleta e Pré-processamento** — arquivos FASTA processados via Biopython: validação sintática, remoção de duplicatas, filtros de qualidade (tamanho, regiões ambíguas) definidos pelo usuário.
2. **Alinhamento Múltiplo de Sequências e Inferência de Árvores Filogenéticas** — MSA (MAFFT, ClustalW citados) seguido de múltiplos métodos de inferência (NJ, ML via IQ-TREE/RAxML/FastTree, Inferência Bayesiana via MrBayes), gerando uma "floresta" de topologias alternativas sobre o mesmo dataset.
3. **Fragmentação, Mapeamento e Construção da Matriz** — cada árvore é decomposta em subárvores por travessia da topologia, em modelo **bag-of-tasks** (paraleliza a extração entre núcleos do processador); cada subárvore vira um identificador único via hashing; monta-se a matriz Subárvore–Árvore.
4. **Mineração de Padrões Maximais (FPMax)** — sobre a matriz transacional, extrai os itemsets maximais frequentes; suporte alto interpretado como indício de robustez evolutiva.
5. **Enriquecimento Semântico** — os padrões são cruzados com metadados de bases externas (NCBI): taxonomia, localização geográfica, data de coleta, referências bibliográficas. Todos os artefatos (árvores, subárvores, padrões, metadados) são organizados num **Grafo de Conhecimento no Neo4j**, com nós `Tree`, `Subtree`, `Support`, `Metadata` e arestas `HAS_SUBTREE`, `HAS_SUPPORT`, `HAS_METADATA`, permitindo consultas Cypher que cruzam topologia com metadados biológicos/epidemiológicos.

Nenhuma complexidade assintótica é discutida explicitamente para a etapa de mineração; a discussão de custo é qualitativa (maximais reduzem o espaço de busca vs. enumerar todos os frequentes).

## 4. Dataset experimental do artigo

**Estudo de caso: vírus Zika (ZIKV)**, usando o conjunto de dados de **Zadra, Rizzoli e Rota-Stabelli (2024)** — *Comprehensive phylogenomic analysis of Zika virus* (o mesmo artigo já catalogado nesta biblioteca em [`06-zika-filogenomica-2024.md`](06-zika-filogenomica-2024.md), publicado em *Virus Research* 350:199490). O conjunto: **479 sequências genômicas** do GenBank, ~10.000 nucleotídeos cada, com ampla diversidade geográfica (África, Ásia, Ilhas do Pacífico, Américas), já curadas (remoção de regiões altamente variáveis e de sequências com evidência de recombinação).

A partir desse conjunto, o PhyloTreeMiner infere **16 árvores filogenéticas** (Figura 2), combinando diferentes MSAs e algoritmos de inferência.

## 5. Resultados e validação apresentados

- **Distribuição geográfica de subárvores de alto suporte**: aplicando um limiar de suporte ≥ 80% sobre o grafo de conhecimento, agrupado por país (Tabela 1 do artigo):

| País | Total de subárvores | Suporte ≥ 80% | Suporte médio | Suporte máximo |
|---|---|---|---|---|
| Brasil | 31.633 | 269 (≈0,85%) | 0,134 | 0,8 |
| EUA | 19.553 | 231 | 0,137 | 0,8 |
| Colômbia | 18.390 | 214 | 0,132 | 0,8 |
| México | 17.475 | 118 | 0,131 | 0,9 |
| Honduras | 10.195 | 99 | 0,141 | 0,8 |
| Rep. Dominicana | 9.274 | 90 | 0,133 | 0,8 |
| Cingapura | 38.302 | 84 | 0,117 | 0,8 |
| Costa do Marfim | 4.875 | 78 | 0,154 | 0,8 |
| Nicarágua | 7.536 | 73 | 0,140 | 0,8 |
| Senegal | 7.113 | 68 | 0,144 | 0,8 |

- **Achado interpretativo central**: Cingapura tem o maior volume total de subárvores (38.302) mas o **menor** suporte médio (11,7%) — lido pelos autores como maior complexidade evolutiva local, possivelmente associada a eventos de recombinação ou múltiplas introduções virais independentes, e ligado à disseminação da linhagem asiática do ZIKV no surto de 2016 (citando novamente Zadra et al. 2024).
- **Eficácia como filtro**: dos 31.633 padrões extraídos para o Brasil, apenas 269 (0,85%) têm suporte ≥ 80% — os autores leem isso como evidência de que o *workflow* descarta eficazmente milhares de padrões pouco informativos, preservando um núcleo pequeno e consistente entre metodologias.
- Nenhuma métrica de tempo de execução, uso de memória ou comparação quantitativa direta contra SciPhyloMiner/EvoMiner é reportada — a comparação com esses trabalhos (seção 5) é conceitual, não experimental.

## 6. Confronto com a implementação atual

A divergência mais importante entre o artigo e o código de produção está documentada no próprio repositório, em `BioComp_UFF/workflow/stability/stability.py:1-13`:

> "Como o número de pipelines M é pequeno (tipicamente 8 a 10), o reticulado de conjuntos de clados fechados pode ser enumerado exatamente em `O(2**M * |C|)`, dispensando heurísticas de mineração. `StabilityAnalyzer.maximal_patterns` devolve, portanto, os conjuntos maximais exatos — não uma aproximação."

Concretamente, `maximal_patterns` (`stability.py:490-517`) **não roda o algoritmo FPMax**: enumera todos os padrões fechados (`closed_patterns()`) e filtra por contenção de conjuntos (`any(clades < set(other.clades) for other in frequent)`), o que é exato e correto na escala atual (`M ≤ 10` ⇒ `2^M ≤ 1024`), mas é uma implementação diferente do que o artigo descreve — o artigo aplica literalmente FPMax (Grahne & Zhu 2005) sobre uma matriz de incidência com hashing de subárvore.

`docs/science/03-metricas.md §4.2` já registra essa mesma constatação, de forma independente e anterior a esta análise: *"Com `M ≤ 10`, enumeração exata em `O(2^M · |B|)`. `maximal_patterns` (`stability.py:428`) faz isso; não é aproximação. **O FPMax é desnecessário nesta escala** — ver D4."* E ainda: *"Sobre a mesma codificação, os padrões maximais exatos são o resultado do FPMax com `min_support = 0`... As discrepâncias observadas nos CSVs não vêm do algoritmo: vêm da identidade de item (D5) e da coluna de suporte sobrescrita (D4)."* Ou seja: **a definição formal do artigo e a métrica calculada hoje são matematicamente equivalentes no ponto `min_support = 0`; a implementação trocou o algoritmo FPMax por enumeração exata, mas preservou a semântica.** Isso é consistente e não é um defeito — é exatamente o que [`10-marcos-e-metas.md §9.5`](../automation/10-marcos-e-metas.md) já assinala como limitação honesta do plano: "o FPMax pode não ser necessário na escala atual" (E7, agenda de pesquisa), e a ausência de ponto de cruzamento também seria resultado publicável.

Outras diferenças de identidade de item, não mencionadas pelo artigo mas relevantes pós-M1:

- O artigo usa "hashing" genérico para identificar subárvores; a implementação atual usa `canonical_item_id` de 52 bits (limite do `Number` do JavaScript, `clade_identity.py`), adotado em M1.2/DEC-022 para substituir uma identidade legada de 16 bits que fragmentava 36–55% dos clados por dependência de ordem de travessia (D5). O artigo, publicado antes dessa correção (o repositório citado é o mesmo em que D5 foi encontrado), não discute esse risco — é razoável supor que o hashing do artigo sofria do mesmo problema de dependência de ordem, já que não menciona canonicalização por conjunto ordenado de folhas.
- O grafo de conhecimento do artigo (nós `Tree`, `Subtree`, `Support`, `Metadata`) é qualitativamente o mesmo modelo de `docs/science/05-grafo-neo4j.md`, mas a propagação de suporte de ramo ao grafo (bootstrap/FBP) segue **não implementada** hoje — residual registrado em M3.1/DEC-070/DEC-085, na fila de triagem, candidato a M5/Grafo.

## 7. Limitações reconhecidas e trabalhos futuros do artigo

Os próprios autores, na Conclusão, apontam como trabalho futuro: "investigar estratégias para otimização adicional do processo de mineração" e "explorar a aplicação do *workflow* em outros domínios e conjuntos de dados, incluindo cenários de análise comparativa mais ampla."

Confronto com o estado atual do projeto:

| Trabalho futuro do artigo | Status no PhyloTreeMiner hoje |
|---|---|
| Otimizar o processo de mineração | Parcialmente resolvido por via diferente: a mineração real foi trocada por enumeração exata (ver §6) — não é uma otimização do FPMax, é uma substituição algorítmica justificada pela escala pequena de `M`. Não há evidência de que o projeto tenha revisitado FPMax real para `M` maior |
| Aplicar a outros domínios/datasets | Feito parcialmente: o dataset de referência do projeto migrou para Variola (Li et al. 2007), com VARV-49/52/121/6 e múltiplos experimentos; o Zika deste artigo não é mais o foco central, mas prova que o *workflow* já foi validado em pelo menos dois patógenos distintos |
| — (não mencionado no artigo) integração com grafo de conhecimento além do que já existe | O artigo já inclui Neo4j como parte do desenho original — não é um "trabalho futuro" realizado depois, é constitutivo desde esta publicação |

Uma limitação **não** discutida pelos autores, mas relevante para o rigor científico do projeto atual: o artigo não menciona verificação de que os "16 pipelines" gerados eram de fato 16 execuções distintas (o equivalente ao D1 encontrado depois nos experimentos de Variola — combinações alinhador×método que na prática produzem saída byte-a-byte idêntica). Não há como confirmar, só a partir do artigo, se essa contaminação de fator também afetou o estudo de caso de Zika.

## 8. Relevância para M6 e publicações futuras

Este é, dos seis documentos desta biblioteca, o que precisa da citação mais direta e detalhada no manuscrito atual — é a publicação de origem do método, não apenas trabalho relacionado. Implicações concretas para *Methods*/*Related Work*:

1. **Herdar a terminologia formal**: "item = subárvore/clado", "transação = árvore/pipeline", "suporte = fração de transações que contêm o item" — é exatamente a base de `docs/science/03-metricas.md §4`, e o manuscrito atual deve citar este artigo como a fonte primária dessa modelagem, não reformulá-la como se fosse nova.
2. **Declarar explicitamente a divergência algorítmica** (§6 acima) como uma decisão de engenharia informada, não como um desvio não documentado: a mineração real via FPMax foi substituída por enumeração exata porque `M` é pequeno o bastante para tornar isso equivalente e mais simples de auditar. Isso deve ir para *Methods* como nota metodológica, com a equivalência formal (`min_support = 0`) citada.
3. **O Zika como precedente de generalidade**: útil para argumentar, na introdução ou discussão do manuscrito de Variola, que o *workflow* já foi validado em outro patógeno com estrutura de dados semelhante (múltiplas linhagens geográficas, genoma grande, múltiplos pipelines de inferência) — fortalece a alegação de que o método não foi desenhado ad-hoc para VARV.
4. **Comparação com SciPhyloMiner (Guedes et al. 2017) e EvoMiner (Deepak et al. 2014)**: o artigo já faz esse trabalho de posicionamento (seção 5, "Trabalhos Relacionados") — o manuscrito de M6 pode reaproveitar esses parágrafos quase diretamente, atualizando com achados de escalabilidade que o projeto mediu depois (M7.7, curva de custo por método).
5. **Repositório público citado no próprio artigo** (`github.com/UFFeScience/phylotreeminer`) é evidência concreta de disponibilidade de código a favor da condição 1 da definição de sucesso do plano mestre (`docs/automation/10-marcos-e-metas.md §7`) — vale conferir se esse repositório é o mesmo deste projeto ou um precursor separado antes de citá-lo como "code availability" no M6.

---
**Fonte primária:** `Artigos-Referencia/Mineração de Subárvores Frequentes em Árvores Filogenéticas usando Conjuntos de Itens Frequentes Maximais.pdf` (arquivo local, sem link externo).
