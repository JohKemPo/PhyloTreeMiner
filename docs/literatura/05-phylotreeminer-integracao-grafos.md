# PhyloTreeMiner: Integração de Dados Heterogêneos e Consultas em Grafos para Mineração de Padrões Filogenéticos

[← Literatura](README.md)

> **Nota de proveniência.** Este é o artigo que descreve a ferramenta que este próprio repositório implementa — autoria do mesmo grupo (UFF), com João Vitor Moraes como primeiro autor. Não é uma referência externa: é o **registro publicado do estado da ferramenta num ponto anterior da sua evolução**, e o candidato natural a "System description" do manuscrito de M6.

---

## 1. Citação completa

Moraes, J. V.; Castro, L. G.; Rosseti, I.; Oliveira, D. de. **PhyloTreeMiner: Integração de Dados Heterogêneos e Consultas em Grafos para Mineração de Padrões Filogenéticos.** Instituto de Computação, Universidade Fluminense (UFF). Vídeo demonstrativo: `https://youtu.be/qh-8OCVBun0`. Agradecimentos a CAPES, CNPq e FAPERJ.

Sem volume/páginas de periódico visíveis no PDF — formato de artigo curto de sistema/ferramenta (6 páginas, layout de workshop/simpósio), com resumo, introdução, descrição do sistema, demonstração e conclusão.

## 2. Escopo declarado da ferramenta

O artigo apresenta o `PhyloTreeMiner` como um sistema que:

- Recebe sequências biológicas (DNA/RNA/aminoácidos) em FASTA.
- Executa **Alinhamento Múltiplo de Sequências** e **Inferência de Árvores Filogenéticas** via Biopython, com múltiplos algoritmos de alinhamento e múltiplas abordagens de inferência — Neighbor Joining (NJ), Máxima Verossimilhança (ML) e Inferência Bayesiana (BI), com suporte de IQ-TREE, RAxML, FastTree e MrBayes.
- Permite ao usuário configurar o número de *threads* (paralelismo) e escolher quais métodos de inferência entram na "floresta" filogenética.
- Oferece inspeção visual de alinhamentos e árvores, e comparação par a par de árvores com um índice de "Overall Similarity" (Figura 2 do artigo).
- Decompõe cada árvore em subárvores (clados) por travessia topológica, com equivalência estrita por *hash*: subárvores com a mesma topologia mas parâmetros diferentes (ex.: comprimentos de ramo distintos) geram hashes distintos — não há colapso de clados divergentes no mesmo item.
- Constrói uma **matriz de incidência Subárvore × Árvore** (linhas = árvores, colunas = identificadores de subárvore, valores binários de presença/ausência) — o modelo transacional que alimenta a mineração.
- Minera **itemsets frequentes maximais** com o algoritmo **FPMax** (Grahne & Zhu, 2003) sobre essa matriz — os padrões são conjuntos de subárvores que coocorrem em múltiplas árvores, interpretados como relações filogenéticas robustas entre métodos de inferência.
- Enriquece o resultado com metadados externos (NCBI: taxonomia, localização geográfica, data de coleta, referências bibliográficas) via APIs públicas.
- Integra tudo — sequências, árvores, subárvores, padrões, parâmetros experimentais e metadados — num **repositório de dados** que combina um banco de proveniência com um **grafo de conhecimento** em Neo4j.
- Permite consultas Cypher que cruzam topologia com metadados (ex.: clados de suporte ≥ 80% associados a um país).

Esse escopo bate, item a item, com o pipeline atual do projeto (`BioComp_UFF/workflow/`, mineração FPMax em `workflow/stability/`, grafo Neo4j) — é a mesma linhagem de sistema, não um trabalho relacionado externo.

## 3. Arquitetura descrita × arquitetura atual

O artigo declara três componentes principais (Figura 1 do artigo):

1. **Portal PhyloTreeMiner** — camada de apresentação/interação: define projetos, dispara o *workflow*, visualiza resultados.
2. **Workflow PhyloTreeMiner** — execução, orquestração e paralelização das análises (regiões B–E da Figura 1: Geração das Árvores, Fragmentação das Árvores, Construção da Matriz, Mineração de Padrões, enriquecimento).
3. **Repositório de dados** — proveniência + grafo de conhecimento (Neo4j).

Essa tripartição **ainda descreve corretamente** a arquitetura de alto nível de hoje: `Frontend/phylotreeminer/` (portal), `BioComp_UFF/workflow/` (workflow bioinformático) e `Backend/` + Neo4j (repositório/API). O que mudou é o que fica **dentro** do componente (2)/(3) do lado do backend:

- O artigo não fala em nenhum momento de uma camada HTTP separada em `config/routers/services` — não é o foco do artigo (que é o *workflow* científico, não a engenharia do backend), mas é razoável supor que, no momento da publicação, o backend ainda era o monólito único que o projeto documentava como `app.py`. Hoje essa camada foi quebrada: M5/Arq-B (`docs/automation/10-marcos-e-metas.md §6`, [DEC-088](../automation/07-log-de-execucao.md)) levou `app.py` de 2917 para **156 linhas, 0 rotas**, com rotas e serviços organizados em `Backend/src/{config,routers,services,graph_queries,graph_migrations,analysis,utils}/` e injeção de dependência (`Depends(get_neo4j_service)`) no lugar do singleton Neo4j. O artigo descreve o *quê* (orquestração, mineração, grafo); a estrutura interna de código mudou por completo depois dele.
- O artigo não menciona autenticação, rate limiting, nem tratamento de erro do Neo4j — toda a superfície endereçada em M4 (S-0..S-5, B-1..B-3) é posterior ao que o artigo relata como sistema.

**Conclusão prática:** ao citar este artigo como "System description" em M6, é preciso uma frase explícita de atualização — algo como "desde a publicação original, o backend foi reestruturado em camadas (M5) e blindado contra um conjunto de vetores de segurança e resiliência (M4), sem alterar o modelo conceitual aqui descrito."

## 4. Modelo de dados do grafo — descrito × medido

O artigo descreve o grafo em prosa (não mostra o diagrama de schema completo, só a Figura 3, uma consulta estrutural), citando explicitamente como entidades **TREE, SUBTREE, SUPPORT e METADATA** como nós, e **HAS_SUBTREE, CO_OCCURS_WITH e HAS_METADATA** como arestas. A consulta de exemplo do artigo (Figura 3):

```cypher
MATCH path = (s:Support)-[:HAS_SUPPORT]-(subtree:Subtree)-[:HAS_METADATA]-(m:Metadata)-[:HAS_FEATURE]-(f:Feature)-[:HAS_QUALIFIER]-(q:Qualifier)
WHERE q.key = 'geo_loc_name' AND s.value >= 0.8
RETURN path LIMIT 30
```

já usa `HAS_SUPPORT`, `HAS_FEATURE` e `HAS_QUALIFIER` — mais rico que o resumo em prosa da Seção 2, e **compatível com o modelo real medido** em `docs/science/05-grafo-neo4j.md`: `User -[OWNS]-> Tree -[HAS_SUBTREE]-> Subtree -[HAS_SUBTREE]-> Subtree(folha) -[HAS_METADATA]-> Metadata -[HAS_FEATURE]-> Feature -[HAS_QUALIFIER]-> Qualifier`, mais `Subtree -[HAS_SUPPORT]-> Support`. Ou seja: **o modelo descrito no artigo e o modelo introspectado no banco hoje são o mesmo grafo** — inclusive a query de exemplo do artigo é executável contra o schema documentado em `docs/data-model/neo4j.md`.

Duas divergências pontuais:

- O artigo cita `CO_OCCURS_WITH` como tipo de aresta na Seção 2 (prosa), mas nem a consulta de exemplo nem `docs/science/05-grafo-neo4j.md §2` registram esse tipo de relacionamento no banco introspectado — é possível que tenha sido um relacionamento planejado/descrito conceitualmente (coocorrência de subárvores, que é literalmente o que a mineração FPMax produz) e nunca materializado como aresta própria no grafo, ficando implícito na matriz de incidência calculada em memória, não persistida como `CO_OCCURS_WITH`.
- O artigo não menciona o nó `User`, presente no modelo medido (`docs/science/05-grafo-neo4j.md`) com um único nó — provavelmente um artefato de multiusuário planejado, não central ao argumento do artigo.

O achado mais importante de `docs/science/05-grafo-neo4j.md` — a duplicação de 321× dos metadados (G1) e a ausência total de dados de Variola no grafo (só Zika está lá) — **não é mencionado no artigo**, porque o artigo é a descrição da arquitetura pretendida, não uma auditoria do estado dos dados. Isso não é uma contradição; é escopo: o artigo prova o conceito com Zika, e os defeitos de modelagem são achados operacionais posteriores.

## 5. Consultas/casos de uso em Cypher

O caso de uso motivador explícito é: **"quais regiões geográficas concentram os padrões evolutivos mais confiáveis?"**, respondida agregando a média de `s.value` (suporte) dos clados associados a um `geo_loc_name` específico. A Figura 3 do artigo mostra literalmente essa consulta filtrando clados de suporte ≥ 80% e ligando-os a metadados geográficos. Esse é o argumento central de valor do grafo sobre uma solução puramente tabular: atravessar topologia → suporte → metadado num único caminho de grafo.

## 6. Resultados/demonstração

Não há resultado biológico novo — é um artigo de **sistema/ferramenta**, com demonstração sobre um estudo de caso de vigilância genômica do vírus Zika (dataset de Zadra et al. 2024, citado nas referências e correspondente ao PDF `1-s2.0-S0168170224001837-main.pdf` desta mesma pasta — ver [`06-zika-filogenomica-2024.md`](06-zika-filogenomica-2024.md)):

| Medida | Valor |
|---|---|
| Sequências genômicas usadas | 479 (curadas para remover regiões altamente variáveis e sinais de recombinação), ~10.000 nt cada |
| Diversidade geográfica | África, Ásia, Ilhas do Pacífico, Américas |
| Árvores geradas na demo | 16 (todas as combinações de método de alinhamento × algoritmo de inferência) |
| Subárvores extraídas (Brasil) | 31.633 no total; **269 (≈0,85%)** com suporte ≥ 80% |
| Subárvores extraídas (Singapura) | **38.302** no total — o maior volume — mas suporte médio de apenas **11,70%**, indicando alta variabilidade topológica |
| Total de sequências no painel geográfico | 478 (nota: um a menos que as 479 do texto — divergência pequena e não explicada no artigo) |
| Período coberto | 2008–2024 |
| Países no painel | 102 |

Essa é a mesma composição de dados hoje presente no Neo4j do ambiente de desenvolvimento (`docs/science/05-grafo-neo4j.md`: "Zika, 477 acessos distintos, 10 árvores... projeto `Zika_Virus_Singapura_Large_480seq`") — **os números de árvores (10) não batem com os 16 do artigo** (o artigo demonstra 16 árvores — todas as combinações; o grafo medido tem 10). Isso é uma pista concreta para investigar: ou o projeto do grafo é uma execução parcial/diferente daquela usada na demonstração do artigo, ou parte das 16 árvores da demo nunca foi persistida no grafo. Vale registrar como item de triagem, não resolver aqui.

## 7. Limitações reconhecidas e trabalhos futuros

O artigo lista como trabalhos futuros: **(i)** incorporação de novos métodos de inferência filogenética; **(ii)** integração com bases de dados adicionais; **(iii)** exploração de técnicas avançadas de visualização.

Cruzando com o backlog atual de M4 T5 — Grafo (`docs/automation/10-marcos-e-metas.md §6`, M4.13–M4.20): **nenhum dos itens de M4.13–M4.20 corresponde aos trabalhos futuros do artigo.** M4.13–M4.20 são todos de **robustez/segurança da camada de grafo** (parametrização de UID, allowlist de procedures, credenciais leitura/escrita separadas, `LIMIT` no servidor, índices, ingest transacional) — problemas de engenharia que simplesmente não existiam como preocupação no momento do artigo. Os trabalhos futuros do artigo (novos métodos de inferência, mais bases de dados, visualização avançada) continuam **em aberto e não fatiados em nenhum marco atual** — candidatos naturais para a agenda de pesquisa (`docs/science/04-agenda-de-pesquisa.md`) ou para M7 (heurísticas de inferência), no caso do item (i).

## 8. Relevância para M6 e publicações futuras

Este artigo é o candidato mais forte para a seção de **descrição de sistema / arquitetura** do manuscrito de M6, porque:

1. É a única fonte publicada que descreve a arquitetura de três camadas, o pipeline de fragmentação de árvores por hash, a matriz de incidência subárvore×árvore, e o uso do FPMax — o núcleo metodológico declarado do projeto inteiro.
2. Fornece uma citação formal e mecanicamente verificável (a consulta Cypher da Figura 3 roda contra o schema real) para o modelo de grafo — o que a torna citável tanto na seção de Methods quanto na de Implementação/Disponibilidade.
3. Estabelece uma **linha de base de demonstração** (Zika, 479 sequências, 16 árvores) que serve de comparação honesta contra o que M6 vai reportar: se o manuscrito final girar em torno do dataset VARV-49 (Li et al. 2007), vale citar explicitamente esta demonstração anterior com Zika como *prova de conceito* prévia da mesma ferramenta, deixando claro que o domínio de aplicação mudou (Zika → Variola) mas o método (mineração de subárvores por FPMax) é o mesmo, agora com o gate científico de M2 sobre ele.
4. Precisa de uma nota de atualização explícita cobrindo o que mudou desde a publicação: quebra do monólito `app.py` (M5/Arq-B), DI do Neo4j, e o conjunto de correções de segurança/resiliência de M4 — nenhuma delas invalida o que o artigo descreve, mas a "Figura 1" (arquitetura) do artigo já não reflete a organização interna real do backend.
5. A discrepância de contagem de árvores (16 na demo do artigo vs. 10 no grafo medido hoje) é um ponto a esclarecer antes de reutilizar qualquer número deste artigo num texto novo — não assumir que o estado atual do grafo reflete fielmente a demonstração publicada.

---

**Fonte primária:** `Artigos-Referencia/PhyloTreeMiner-Integração de Dados Heterogêneos e Consultas em Grafos para Mineração de Padrões Filogenéticos.pdf` (arquivo local, sem link externo).
