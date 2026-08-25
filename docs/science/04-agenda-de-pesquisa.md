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

**Estado.** Feito. `docs/science/scripts/audit_variola.py`. Falta portar as correções para o pipeline de produção, o que é [D3](02-defeitos-que-alteram-resultado.md#d3) + [D5](02-defeitos-que-alteram-resultado.md#d5).

---

## E2 · ○ · Propagar o suporte de ramo já calculado

**Hipótese.** O suporte de ramo é um insumo de primeira classe do argumento, não um subproduto.

**Delineamento.** Ler `.contree` (IQ-TREE) e o Newick com suporte do RAxML e do FastTree; propagar `confidence` ao Nexus, ao `metadata.json`, ao grafo e à UI. Habilitar `-B 1000` em RAxML-NG e `-boot` no FastTree para simetria entre métodos ML.

**Critério de sucesso.** Toda árvore ML em `out/Trees/` carrega suporte de ramo; a página exibe, por clado, **bootstrap e suporte metodológico lado a lado**.

**Por que é o item de maior valor por unidade de custo.** Os dados já existem em `out/tmp/`. Ver [D10](02-defeitos-que-alteram-resultado.md#d10).

---

## E3 · ◐ · `VARV-49-clean`: replicação depurada de Li *et al.* (2007)

**Hipótese.** O núcleo metodologicamente invariante de VARV-49 é robusto à remoção da contaminação taxonômica — porque VARV-49 já não tem crocodilepox, mas a hipótese precisa ser testada contra a versão com filtro explícito.

**Delineamento.** Aquisição com filtro `txid10242` (*Orthopoxvirus*); 45 VARV + CMLV/CPXV/TATV como grupo externo declarado; **enraizamento explícito pelo grupo externo** em todos os métodos; M = 4 métodos de inferência. Manifesto completo.

**Critério de sucesso.** Monofilia de VARV e clado P-II a 4/4; e — por haver enraizamento comum — a análise por clados enraizados torna-se legítima e pode ser reportada ao lado da análise por bipartições.

**Invalidaria a hipótese.** P-II caindo abaixo de 4/4, ou VARV deixando de ser monofilético.

**Este é o conjunto de referência do artigo.** Deve virar `Backend/tests/data/reference/` conforme [`04-rigor-cientifico.md §2`](../automation/04-rigor-cientifico.md#2-dataset-de-referência-pré-requisito-de-w3).

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
           E1 ✓ ──► E2 ──► E3 ──┬──► E4  (fator alinhador — 2º resultado)
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
