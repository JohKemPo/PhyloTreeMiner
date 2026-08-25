# Métricas — definição formal, suposições e casos degenerados

[← Ciência](README.md)

Documento exigido por [`agents/06-dominio-cientifico.md §8`](../agents/06-dominio-cientifico.md). É insumo direto da seção *Methods* do artigo. Regra de [`04-rigor-cientifico.md §3`](../automation/04-rigor-cientifico.md#3-protocolo-de-mudança-na-zona-sagrada): **se a definição não pode ser escrita em uma frase, a correção não está pronta para ser feita.**

Notação: `T` = árvore; `X` = conjunto de táxons, `n = |X|`; `M` = número de pipelines; `P` = conjunto de pipelines.

---

## 1. Pipeline

**Definição.** Um *pipeline* é um par (alinhador, método de inferência) aplicado a um mesmo conjunto de sequências, produzindo uma árvore.

**Estado no código.** `PipelineLabel.parse` (`stability.py:90`) extrai os dois fatores do nome do arquivo.

**Suposição que hoje é violada.** Que dois rótulos distintos correspondam a duas execuções distintas. Nos experimentos de Variola isso é falso — ver [D1](02-defeitos-que-alteram-resultado.md#d1). **Um pipeline só conta como réplica metodológica se sua saída for demonstravelmente distinta.** Verificação mínima antes de qualquer análise: nenhum par de árvores com o mesmo conjunto de bipartições.

**Consequência para o artigo.** `M` é o número de pipelines *efetivos*, não o número de arquivos em `out/Trees/`.

---

## 2. Bipartição e identidade de clado

### 2.1 Clado (árvore enraizada)

**Definição.** O conjunto dos táxons descendentes de um nó interno.

**Aplicável a.** Árvores com raiz biologicamente significativa. No pipeline atual: **apenas UPGMA**.

### 2.2 Bipartição (árvore não enraizada)

**Definição.** A remoção de uma aresta interna de uma árvore não enraizada parte `X` em `A | X∖A`. A *bipartição* é o par não ordenado `{A, X∖A}`. É **não trivial** se `|A| ≥ 2` e `|X∖A| ≥ 2`.

**Forma canônica adotada.** O lado de menor cardinalidade; em empate, o menor na ordem lexicográfica dos nomes ordenados. Assim, duas escritas Newick da mesma topologia com raízes diferentes produzem o mesmo objeto.

**Aplicável a.** FastTree, IQ-TREE, RAxML, NJ — que emitem topologia não enraizada escrita com raiz trifurcante.

**Por que importa.** Ver [D3](02-defeitos-que-alteram-resultado.md#d3): comparar clados enraizados entre árvores não enraizadas mede a convenção de escrita da raiz, não a topologia. Em VARV-6 isso reporta 75% de discordância entre três métodos que produzem a **mesma** topologia.

**Regra.** Enquanto o pipeline misturar métodos enraizados e não enraizados, **a unidade de comparação é a bipartição**. Análise enraizada exige enraizamento comum e explícito por grupo externo declarado — nunca a raiz arbitrária do arquivo.

### 2.3 Identidade

**Definição correta.** `frozenset` dos nomes dos terminais, opcionalmente resumido em MD5 de 128 bits sobre os nomes **ordenados** (`clade_identity.py:50` e `:71`). Invariante à ordem de travessia, à rotação de nós e ao enraizamento arbitrário de subárvores.

**Identidade legada.** `encode_list_to_int` (`treeUtils.py`): MD5 de `str(lista_de_hashes_na_ordem_de_travessia)`, truncado a **16 bits**. **Saiu de produção em 2026-08-24** (M1.2 / DEC-022) — segue gravada em `List_terminals_hash_legacy` só para auditoria e para reler artefatos anteriores. A identidade de produção é `treeUtils.encode_clade_to_int` → `canonical_item_id`, de 52 bits.

| Propriedade | Canônica | Legada |
|---|---|---|
| Invariante à ordem | sim | **não** |
| Espaço | 128 bits | **16 bits (65 536)** |
| Efeito observado | — | fragmenta 36–55% dos clados; colide 0–0,5% dos itens |

Os dois erros atuam em direções opostas: a dependência de ordem **subestima** o suporte (um clado vira vários itens); a colisão **fabrica** suporte (dois clados viram um item). Ver [D5](02-defeitos-que-alteram-resultado.md#d5).

**Normalização de rótulo.** IQ-TREE e RAxML truncam o dígito de versão de acessos RefSeq (`NC_008030.1` → `NC_008030.`). `strip_accession_version` remove o sufixo inteiro — desde M1.2 mora em `clade_identity.py`, junto da identidade, e é reexportado por `stability.py`. Isto é seguro **sob a suposição declarada** de que duas versões do mesmo registro não coexistem no alinhamento — suposição verdadeira nestes dados, e que deve ser verificada, não presumida, em dados novos.

---

## 3. Distância de Robinson–Foulds

**Definição** (Robinson & Foulds, 1981). Para duas árvores sobre o mesmo `X`, a distância RF é a cardinalidade da diferença simétrica entre seus conjuntos de bipartições não triviais:

```
RF(T1, T2) = |B(T1) △ B(T2)|
```

**Normalização.** Divide-se pelo máximo possível. Aqui está uma armadilha ativa no código:

| Caso | Bipartições informativas máx. | Denominador |
|---|---|---|
| Não enraizada, binária | `n − 3` | `2(n − 3)` |
| Enraizada, binária (raiz excluída) | `n − 2` | `2(n − 2)` |

~~`stability.py:483` usa `2(n − 2)` sobre `clade_sets` enraizados.~~ **Corrigido em 2026-08-24** (M1.3 / DEC-023): `rf_matrix` escolhe o denominador pelo enraizamento — `2(n − 3)` para bipartição (o padrão) e `2(n − 2)` para `rooted=True`. Ignorar isso deslocava todo valor normalizado.

**Casos degenerados — e todos ocorrem nestes dados.**

| Caso | Comportamento exigido | Estado |
|---|---|---|
| `n < 4` | RF não enraizada indefinida → **`None`**, jamais `0` | ✅ implementado (M1.3) |
| Politomia | Reduz `|B(T)|`; RF continua definida, mas a normalização por `n − 3` **subestima**. Deve-se reportar `|B(T1)|` e `|B(T2)|` ao lado da distância | ✅ `bipartition_counts()` (M1.3); nos 4 experimentos de *Variola* todo pipeline tem `|B| = n − 3`, isto é, nenhuma politomia |
| Conjuntos de folhas distintos | RF **indefinida**. Ou restringir ao conjunto comum (declarando-o) ou devolver `None` | ✅ `TreeSet` recusa o conjunto na construção; `/api/tree/compare` devolve 400 (M1.8) |
| Comparação de árvore consigo mesma | `0` | ✅ diagonal de `rf_matrix` (M1.3) |

**Regra geral** ([`04-rigor-cientifico.md §3`](../automation/04-rigor-cientifico.md#semântica-de-valores-sentinela)): **"não aplicável" nunca é um número.** O `-1` devolvido por `exact_quartet_distance` para árvore não binária (item `C-5a` da auditoria) é indistinguível de uma distância e faz `check_consistency` responder "Inconsistent" sempre.

**Oráculo independente.** `dendropy.calculate.treecompare.symmetric_difference`; `ete3.Tree.robinson_foulds(unrooted_trees=True)`. Implementado em [`scripts/oraculo_rf_dendropy.py`](scripts/oraculo_rf_dendropy.py) — rode `cd BioComp_UFF && python ../docs/science/scripts/oraculo_rf_dendropy.py`. Última execução (2026-08-24): **137 pares, 0 divergências**.

**Limitação a declarar no artigo.** A RF é conhecidamente pouco robusta: mover um único táxon "rogue" pode saturá-la. Onde a interpretação depender da magnitude, reportar em paralelo uma métrica menos sensível — *matching split distance* ou distância de quartetos — ou a fração de bipartições compartilhadas, que é o que o perfil de suporte já dá.

---

## 4. Suporte metodológico e padrão maximal

### 4.1 Suporte metodológico de uma bipartição

**Definição.** Dado um conjunto `P` de `M` pipelines aplicados aos **mesmos dados**, o suporte metodológico de uma bipartição `b` é

```
sup(b) = |{p ∈ P : b ∈ B(T_p)}| / M
```

isto é, a fração de pipelines que a recuperam.

**O que mede.** Robustez **metodológica**: sensibilidade da inferência à escolha de método, com os dados fixos.

**O que não mede.** Robustez **amostral** — isso é bootstrap. As duas são ortogonais por construção e empiricamente pouco correlacionadas (Pearson 0,27–0,44; ver [`01-revisao-variola.md §4.4`](01-revisao-variola.md#44-o-resultado-principal-bootstrap--robustez-metodológica)).

**Suposições.**

1. Todos os pipelines veem exatamente os mesmos táxons. `TreeSet.__init__` (`stability.py:218`) impõe isso e falha alto — comportamento correto.
2. Os pipelines são **distintos**. Violado hoje ([D1](02-defeitos-que-alteram-resultado.md#d1)).
3. `M` é pequeno o bastante para que a grade `k/M` seja interpretável. Com `M = 4` os valores possíveis são 0,25 / 0,5 / 0,75 / 1,0 — **quatro níveis**. Reportar "suporte 0,73" com `M = 4` é falsa precisão.

**Limitação a declarar.** `sup` depende do **conjunto de pipelines escolhido**, que é uma decisão do pesquisador. Incluir UPGMA — que impõe relógio molecular a um conjunto que atravessa gêneros — infla a discordância medida. O artigo deve reportar `sup` com e sem os métodos cujos pressupostos são sabidamente violados, e discutir a sensibilidade.

### 4.2 Padrão maximal

**Definição.** Tratando cada pipeline como transação e cada bipartição como item, um *padrão* é um par `(Q, S)` com `Q ⊆ P` e `S = ⋂_{p∈Q} B(T_p)`. O padrão é **maximal** quando nenhum superconjunto `Q' ⊃ Q` tem `S' ⊇ S` — isto é, quando ampliar o conjunto de pipelines custa bipartições.

**O que revela.** Não a magnitude do desacordo, mas a sua **estrutura**: quais métodos partilham qual corpo de sinal. Nos dados de Variola o reticulado se particiona por paradigma de inferência — `{fasttree, iqtree}` contra `{nj, upgma}` — e essa é uma afirmação sobre *como* os métodos discordam, que a RF média não expressa.

**Cálculo.** Com `M ≤ 10`, enumeração exata em `O(2^M · |B|)`. `maximal_patterns` (`stability.py:428`) faz isso; não é aproximação. **O FPMax é desnecessário nesta escala** — ver [D4](02-defeitos-que-alteram-resultado.md#d4).

**Relação com o FPMax.** O FPMax devolve itemsets maximais frequentes acima de um `min_support`. Sobre a mesma codificação, os padrões maximais exatos são o resultado do FPMax com `min_support = 0`, restrito a itemsets que são interseções de transações. As discrepâncias observadas nos CSVs não vêm do algoritmo: vêm da identidade de item ([D5](02-defeitos-que-alteram-resultado.md#d5)) e da coluna de suporte sobrescrita ([D4](02-defeitos-que-alteram-resultado.md#d4)).

### 4.3 Pureza taxonômica

**Definição.** Para um clado/bipartição `b` e um classificador `c: X → espécies`, a pureza é `max_s |{t ∈ b : c(t) = s}| / |b|`. Vale 1 quando `b` é monoespecífico.

**Uso.** Validação externa: um núcleo metodologicamente invariante deve ser taxonomicamente coerente. Em VARV-121, 31 de 32 splits universais de tamanho ≤ 23 têm pureza 1,0.

**Cuidado.** Pureza < 1 não é necessariamente erro. O único split "misto" de VARV-121 — `{BPXV: 1, VACV: 2}` — está **correto**: *buffalopox* é linhagem derivada de *vaccinia*. **O rótulo do NCBI é a referência falível, não o resultado.**

**Estado.** `build_classifier` (`case_study.py:66`) infere a espécie por palavra-chave no cabeçalho FASTA. Quando `fasta_path` é `None` devolve `"unknown"` para tudo — foi o que ocorreu em VARV-49, cujo `clade_support.csv` tem `majority_label = unknown` em todas as 100 linhas. O alinhamento em `out/Align/*.aln` carrega as descrições e serve como fonte.

---

## 5. Metadados derivados

Todos afetados por [D12](02-defeitos-que-alteram-resultado.md#d12).

### 5.1 Ano de coleta

**Definição pretendida.** O ano em `/collection_date` do registro GenBank.

**Comportamento atual** (`app.py:648-653`): sem `collection_date`, cai no nome da cepa e captura os quatro primeiros dígitos por regex. `Camelpox virus strain 0408151v` → **ano 408**.

**Regra.** Metadado ausente é **ausente**. `None`, propagado até a UI, exibido como "não informado". O fallback pelo nome da cepa deve ser **removido**, não corrigido: não existe convenção que garanta que quatro dígitos num nome de cepa sejam um ano.

**Casos-limite exigidos em teste.** `collection_date` ausente; formato `2016-03`; formato `Mar-2016`; intervalo `2015/2016`; nome de cepa com dígitos.

### 5.2 País e região

**Definição pretendida.** O país em `/geo_loc_name`, normalizado contra uma tabela única.

**Comportamento atual.** `geo_loc_name.split(':')[0]`, com fallback por regex sobre o nome da cepa (`app.py:635-637`) que produz `"v"` como país para `"0408151v"`.

**Problemas confirmados em dado real.**

- `"Sumatra"` classificada como país (é uma ilha da Indonésia).
- No grafo: `"USA: Florida"`, `"USA: Miami, FL"`, `"USA: Miami, Florida"` como três entradas.
- Três tabelas divergentes — front (~44 entradas), `treePlot.py` (~14), `color_map` (6 regiões). É `C-5d` da auditoria.

**Regra.** **Fonte única de verdade** (ex.: `Backend/src/data/regions.json`), consumida pelo backend e servida ao frontend. País desconhecido é `None`, nunca uma string inventada. A unificação **muda agregações** e portanto exige o protocolo da zona sagrada.

### 5.3 Hospedeiro

**Comportamento atual.** String bruta de `/host`. `"camel"`, `"Camelus dromedarius"`, `"Camelus dromedarius; sex: male"` contam como três hospedeiros distintos; `uniqueHosts` em VARV-121 reporta 8 para ~4 hospedeiros biológicos.

**Regra.** Normalizar: cortar em `;`, remover qualificadores (`sex:`, `age:`), mapear contra vocabulário controlado. Ou, se não houver vocabulário, **não reportar `uniqueHosts` como métrica** — uma contagem de strings distintas não é uma contagem de hospedeiros.

### 5.4 Linhagem

`app.py:627`: `annotations.get("organism", 'Unknown') or annotations.get("source", 'Unknown')`. Como `.get` já devolve `'Unknown'` (truthy) quando a chave falta, o `or` nunca dispara: **o fallback para `source` é código morto.** É `C-5b`.

---

## 6. Determinismo

Exigências de [`04-rigor-cientifico.md §4`](../automation/04-rigor-cientifico.md#4-determinismo-e-reprodutibilidade), com o estado atual:

| Requisito | Estado |
|---|---|
| Semente explícita em tudo que amostra | **falha** — `Seed: 97376` gerado pelo IQ-TREE, não fixado |
| Versões de ferramenta no manifesto | **falha** — apenas IQ-TREE e FastTree, e só dentro do log |
| Digest de entrada e saída | **falha** — inexistente |
| Sem dependência de ordem de iteração | **falha** — a identidade de clado depende da ordem de travessia (§2.3) |
| Ponto flutuante com tolerância declarada | não avaliado |
| Fonte única para tabelas de domínio | **falha** — três tabelas de país (§5.2) |

**Piso de resolução medido.** Reexecutar o IQ-TREE sobre entrada byte a byte idêntica produz RF = 0,000 (VARV-49) e **0,017** (VARV-121). Portanto, nesses dados, **nenhuma diferença topológica abaixo de ~2% de RF é interpretável.** Este número deve ser reportado no artigo como o limiar de detecção do método — é um resultado, obtido por acidente a partir do defeito [D1](02-defeitos-que-alteram-resultado.md#d1).
