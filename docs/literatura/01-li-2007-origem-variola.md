# Li et al. (2007) — On the origin of smallpox: correlating variola phylogenics with historical smallpox records

[← Literatura](README.md) · Baseline normativo do invariante científico do projeto (ver [`docs/automation/10-marcos-e-metas.md §0`](../automation/10-marcos-e-metas.md) e [`docs/science/01-revisao-variola.md`](../science/01-revisao-variola.md))

## 1. Citação completa

Li Y, Carroll DS, Gardner SN, Walsh MC, Vitalis EA, Damon IK. **On the origin of smallpox: Correlating variola phylogenics with historical smallpox records.** *Proceedings of the National Academy of Sciences* (PNAS), 2 de outubro de 2007, vol. 104, n. 40, p. 15787–15792. DOI: [10.1073/pnas.0609268104](https://doi.org/10.1073/pnas.0609268104). Recebido para revisão em 19/10/2006, aprovado em 15/08/2007 (Bernard Moss, editor). Afiliações: CDC (Poxvirus and Rabies Branch) e Lawrence Livermore National Laboratory (Pathogen Bio-Informatics).

## 2. Pergunta de pesquisa e motivação

O artigo parte de uma lacuna histórica: os registros médicos sobre a varíola (*variola virus*, VARV) descrevem manifestações clínicas há mais de 2000 anos, mas há **lacunas significativas** nesses registros e hipóteses concorrentes sobre a origem e a cronologia de formas distintas da doença — em particular o *alastrim minor*, uma forma mais branda descrita nas Américas com propriedades biológicas distintas da varíola maior clássica. A questão central: **a filogenia molecular de VARV pode ser correlacionada com os registros históricos para resolver quando e onde a varíola maior e o alastrim minor divergiram, e onde/quando a varíola se originou?**

A estratégia dos autores é combinatória: (i) construir uma filogenia robusta de VARV a partir de SNPs genômicos completos; (ii) datar os nós dessa filogenia com relógio molecular sob calibrações alternativas ancoradas em registros históricos (as datas mais antigas de varíola documentada no Leste Asiático e na África); (iii) cruzar a topologia resultante com a geografia e a cronologia dos surtos históricos.

## 3. Dataset

**47 isolados de VARV** com ampla distribuição geográfica (Fig. 1: América do Sul/*alastrim*, África Ocidental, Oriente Médio, Leste Asiático, Índia e Sumatra, Não-África-Ocidental, importações europeias). O texto declara explicitamente: *"the genomic sequences of 47 VARV isolates used in this study are from ref. 4 and GenBank accession nos. DQ441438, DQ441439, and DQ441441"* — ou seja, **44 genomas vêm de Esposito et al. (2006, ref. 4, *Science* 313:807–812)** e **3 são acrescentados neste artigo** (DQ441438, DQ441439, DQ441441). Grupo externo: **CMLV** (camelpox, Ásia Central) e **TATV** (taterapox, África Ocidental) — os dois ortopoxvírus mais próximos de VARV por identidade de sequência (>98%).

**Confronto com o dataset do projeto.** As 48 accessions já documentadas em `BioComp_UFF/workflow/workflow_dataAcquisition.py:798-884` (`DQ437580`–`DQ437594`, 15 accessions, e `DQ441416`–`DQ441448`, 33 accessions) **não são o dataset de Li et al. (2007) propriamente**: pela contagem (15+33=48) e pela faixa de acesso (`DQ441416`–`DQ441448` engloba `DQ441438/39/41`, os três que Li et al. diz ter *adicionado*), o bloco de accessions do projeto corresponde ao dataset mais amplo de **Esposito et al. (2006)** — a referência 4 deste artigo — do qual Li et al. reaproveita 44 e acrescenta 3. Isso explica por que `VARV-49` (45 VARV + 4 externos, ver `docs/science/01-revisao-variola.md` linha 89) não bate exatamente em `n` com os 47 VARV de Li et al.: **o projeto está replicando a base de amostragem de Esposito 2006/Li 2007 conjuntamente, não reproduzindo o `n=47` exato de nenhum dos dois isoladamente.** Isso é declarado corretamente como `n` efetivo em [D23](../science/02-defeitos-que-alteram-resultado.md#d23) e não é um defeito — é uma composição diferente, documentada.

Critério de inclusão geográfico: ampla distribuição — América do Sul (alastrim), África Ocidental, Oriente Médio, Leste Asiático, Índia/Sumatra, não-África-Ocidental, mais casos de importação europeia rotulados como tal (não usados para inferir origem geográfica nativa).

## 4. Metodologia filogenética

- **Representação dos dados**: não é alinhamento genômico completo convencional. Os autores usam **cSNPs concatenados** ("concatenated SNP", cSNP) — um SNP é definido como um polimorfismo de nucleotídeo único **flanqueado por 7 nucleotídeos conservados em ambos os lados**, o que reduz a complexidade de indels em relação ao genoma completo. A matriz VARV-only tem **1.347 SNPs** (≈79% da diversidade genômica total de SNPs, pois SNPs em clusters sem flanco conservado foram descartados); a matriz VARV+CMLV+TATV tem **2.436 SNPs** (≈42% do total).
- **Modelo de substituição**: MODELTEST (Posada & Crandall) selecionou o **modelo de transversão** (taxas de transversão variáveis, frequências de base variáveis, transições iguais entre si) como o mais adequado.
- **Método de inferência**: **máxima verossimilhança** via PAUP* 4.0b10, com suporte por **bootstrap** (Fig. 2).
- **Índices de qualidade da árvore**: **consistency index (CI) = 0,97**, **retention index (RI) = 0,98**, e **índice de homoplasia = 0,039** (muito baixo — os autores citam isso como evidência de que a topologia não é artefato de evolução convergente).
- **Enraizamento**: a árvore VARV+CMLV+TATV é enraizada usando **TATV como grupo externo** (Fig. 2B). A árvore VARV-only (Fig. 2A) é apresentada como cladograma expandido, com valores de bootstrap por nó.
- **Datação/relógio molecular**: **BEAST** (Bayesian Evolutionary Analysis Sampling Trees), com análises de coalescência sob **relógio estrito e relaxado**, calibradas por três esquemas alternativos ancorados em registros históricos: (1) data de isolamento de cada amostra; (2) prior de 250 anos no clado africano (excluindo África Ocidental); (3) prior de 1600 anos na radiação de P-I, ancorado no registro histórico mais antigo do Leste Asiático. Tracer 1.3 para visualização.

## 5. Resultados principais

**Estrutura de clados.** A filogenia enraizada de VARV resulta em **dois clados primários**: **Primary clade I (P-I)** — VARV maior asiática e africana (África do Sul, Central e do Leste) — e **Primary clade II (P-II)** — dividido em duas subclades, uma sul-americana (isolados classicamente chamados de *alastrim minor*) e uma da África Ocidental. **P-II tem um ancestral comum recente com o alastrim** (compartilhado com a subclade da África Ocidental), o que é o achado central sobre a origem geográfica do alastrim.

**Suporte estatístico.** Os clados principais reportados na Fig. 2 recebem **bootstrap = 100** nos nós mais profundos que separam P-I de P-II e nas subclades internas nomeadas; nós mais rasos (dentro de P-I "Non-West Africa") variam entre 67 e 100.

**Datação.** Sob os diferentes esquemas de calibração, os autores estimam:
- Divergência VARV↔TATV: **~16.000 anos** (calibração pelos registros históricos do Leste Asiático) a **~68.000 anos** (calibração pelos registros da África do Sul) antes do presente (YBP).
- TMRCA de P-I/P-II: entre **~1.400** e **~6.300 YBP**, dependendo da calibração.
- Radiação de P-I: **~400 YBP** (calibração pelo Leste Asiático, relógio estrito) até estimativas maiores sob calibração africana.
- Diversificação do alastrim minor dentro de P-II: **pelo menos ~800 anos**, antecedendo a hipótese anterior de que a divergência teria ocorrido com o início do tráfico de escravos.

**Duas hipóteses de origem (Fig. 3, painéis A e B)** são apresentadas lado a lado, sem que o artigo declare vencedora: (A) VARV divergiu na Ásia (Leste Asiático) e se espalhou; (B) VARV divergiu na África e se espalhou para a Ásia. Ambas são compatíveis com a topologia — a filogenia por si só não resolve a polaridade geográfica; é a combinação com os registros históricos que faz o argumento.

## 6. O argumento central: filogenia × registros históricos

Este é o núcleo do artigo, e é um argumento de **consistência cronológica cruzada**, não de prova filogenética isolada. A lógica:

1. Os registros históricos mais antigos de varíola (com descrição clínica inequívoca) vêm do **Leste Asiático** (China, século IV d.C.; Índia, século VII d.C.) e do **Norte da África/Egito** (múmias com lesões cutâneas, 1100–1580 a.C., mas contestadas por não terem descrição clínica inequívoca — Hipócrates nunca a descreveu, apesar de catalogar doenças de pele, o que sugere que a varíola *major* como a conhecemos ainda não existia na Grécia clássica).
2. As datas de TMRCA calculadas por BEAST, quando ancoradas em cada um desses registros como prior, produzem estimativas de divergência **compatíveis** com a data do registro histórico usado como âncora — ou seja, o método é parcialmente circular por construção (a calibração usa a própria hipótese histórica como prior), e os autores reconhecem isso ao apresentar as duas hipóteses (A e B) em pé de igualdade em vez de escolher uma.
3. O argumento mais forte e menos circular é o da **estrutura geográfica dos clados**: P-II (alastrim + África Ocidental) formar um clado monofilético fechado, geograficamente coerente (América do Sul + África Ocidental, ligadas historicamente pelo tráfico transatlântico), é uma predição da genética que **não depende de calibração temporal** e que casa com o padrão histórico de introdução do alastrim nas Américas via a mesma rota do tráfico de escravos que introduziu a varíola maior africana.
4. A data mínima de diversificação do alastrim (≥800 anos) **contradiz** a hipótese anterior de que essa diversificação teria ocorrido apenas com o início do tráfico de escravos (séc. XVI em diante) — sugerindo uma origem mais antiga do que se documentou por escrito, na África.

Em suma: o artigo não resolve univocamente "onde nasceu a varíola", mas estabelece com confiança **que existem dois clados primários geneticamente distintos, que o alastrim é geneticamente uma linhagem da varíola da África Ocidental, e que essa linhagem é mais antiga do que a documentação histórica direta permite datar**.

## 7. Limitações reconhecidas pelos autores

- **A amostragem é geograficamente enviesada** e depende da disponibilidade de isolados preservados — os autores notam explicitamente casos de importação (isolados coletados fora de sua origem geográfica, marcados no mapa da Fig. 1) que precisam ser excluídos ou tratados à parte na inferência de origem geográfica.
- **A datação por relógio molecular depende criticamente da calibração escolhida**, e os próprios autores apresentam **duas hipóteses de origem sem decidir entre elas** (Fig. 3A vs. 3B) — reconhecem que os dados de sequência sozinhos não resolvem a polaridade temporal/geográfica sem um prior histórico, e que priors diferentes levam a conclusões diferentes.
- **A ausência de VARV pré-moderna de regiões com poucos registros escritos** (América, África Subsaariana) significa que a árvore observada pode não capturar linhagens extintas relevantes para a origem — os autores citam a falta de descrição da varíola na literatura greco-romana como possível ausência de evidência, não evidência de ausência.
- **O uso de cSNPs em vez do genoma completo** é uma simplificação deliberada (menor complexidade computacional, menos ruído de indels), mas descarta ≈21% da diversidade de SNPs total (os que não têm flanco conservado suficiente) — um trade-off de sinal por robustez que o artigo não quantifica em termos de perda de resolução filogenética.
- **Distinção alastrim/varíola maior por CFR (case fatality rate) é questionada pela própria filogenia**: os autores mostram que isolados de África com CFR intermediária (~10%) não se encaixam bem na dicotomia clínica tradicional, o que enfraquece — mas não invalida — a nomenclatura clínica usada para desenhar o próprio estudo.

## 8. Confronto com o estado atual do projeto

O invariante científico do PhyloTreeMiner (`docs/automation/10-marcos-e-metas.md §0`) formaliza exatamente os dois achados mais robustos e menos dependentes de calibração temporal deste artigo — não a datação, que é a parte mais frágil do artigo original:

| Afirmação de Li et al. (2007) | Status no PhyloTreeMiner |
|---|---|
| Monofilia de VARV (implícita: todos os isolados VARV formam clado à parte de CMLV/TATV) | ✅ Replicado **4/4** métodos em VARV-49, VARV-52 e VARV-121 (`docs/science/01-revisao-variola.md` §"Monofilia de VARV") |
| Clado P-II = África Ocidental + América do Sul (alastrim), monofilético | ✅ Replicado **4/4** métodos nos três experimentos, com o conjunto de táxons do clado crescendo corretamente com a amostragem (`docs/science/01-revisao-variola.md` linha 316-337) |
| P-II como linhagem geneticamente distinta e mais próxima da África Ocidental que de P-I | ✅ A bipartição aninhada de 10 táxons (4 grupos externos + 6 de P-II) posiciona P-II como **linhagem basal de VARV** — topologia consistente com a publicada, embora a "posição basal" não seja o foco quantitativo original de Li et al. (o artigo enfatiza mais Esposito et al. 2006 para essa afirmação específica de polaridade) |
| Bootstrap como medida de suporte (PAUP*, ML) | ⚠️ **Status diferente**: o projeto usa **UFBoot** (IQ-TREE, réplicas ultrarrápidas) e **FBP** (RAxML-NG, `--bs-trees 1000`, *Felsenstein bootstrap proportion* — não é a mesma estatística de UFBoot, ver nota em D10/M7.2) — não é o bootstrap clássico de PAUP*, mas a mesma família de metodologia (proporção de réplicas que recuperam o clado) |
| Datação por relógio molecular (BEAST, TMRCA) | ❌ **Não reproduzido, nem tentado.** O projeto não faz inferência temporal/relógio molecular em nenhum marco atual (M0-M7). É a alegação mais citável do artigo original que segue **inteiramente fora do escopo** do PhyloTreeMiner hoje — se um manuscrito futuro quiser reivindicar "confirma Li et al. 2007", precisa ser explícito que confirma a **estrutura de clados**, não a **cronologia**. |
| `n` = 47 VARV + CMLV + TATV | ⚠️ O projeto usa uma composição diferente (45 VARV + CMLV/CPXV/TATV = 49 em VARV-49; ver §3 acima) — sobreposição substancial de amostragem (herdada de Esposito 2006), mas não é uma réplica de `n` idêntico |
| CI = 0,97, RI = 0,98, índice de homoplasia = 0,039 (PAUP*) | Não recalculado no projeto atual — seria uma verificação barata e direta a acrescentar (dendropy/ete3 calculam CI/RI facilmente) se uma seção de Methods quiser comparar diretamente qualidade de árvore com o artigo original |

**O que o projeto vai além do artigo original**: Li et al. (2007) reporta uma única topologia por dataset, com bootstrap de um único método (PAUP* ML). O PhyloTreeMiner testa a **mesma pergunta biológica** (monofilia de VARV, estrutura P-I/P-II) contra **4 métodos de inferência independentes simultaneamente** (FastTree, IQ-TREE, RAxML-NG, distância/NJ), e mostra que esse núcleo é **invariante ao método** — algo que o artigo de 2007 não podia testar porque só usou um método. Essa é, em si, uma contribuição adicional sobre o artigo-base: não apenas "replicar o resultado", mas "mostrar que o resultado é robusto à escolha metodológica que o replica".

## 9. Relevância para M6 e publicações futuras

Este artigo é a **fundação normativa do dataset de referência `VARV-49`** (`docs/automation/10-marcos-e-metas.md §4`, M2) e do **invariante científico** que governa todo marco a partir de M2 (`§0`: monofilia de VARV 4/4, clado P-II 4/4, bipartição aninhada de 10 táxons 4/4). Uma seção de Methods/Related Work do manuscrito do PhyloTreeMiner precisa:

1. **Citar Li et al. (2007) e Esposito et al. (2006) juntos** como a dupla de referências que define o dataset de origem (ver `docs/science/01-revisao-variola.md` linha 478, que já cita Esposito et al. corretamente) — nunca citar só um dos dois, já que o `n` do projeto é uma composição dos dois.
2. **Citar a Fig. 2B (p. 15789) e a definição de P-I/P-II** como a fonte da nomenclatura de clado usada em todo o projeto (`clade_sets`, identidade canônica de clado em `BioComp_UFF/workflow/stability/`).
3. **Ser explícito sobre o que NÃO foi replicado**: a datação/relógio molecular (Table 2, p. 15790) fica fora do escopo — se alguém perguntar "o PhyloTreeMiner reproduz a cronologia de Li et al.?", a resposta documentada é não, por design, e isso deveria estar escrito no manuscrito para prevenir a pergunta de um revisor.
4. **Usar os índices CI/RI/homoplasia (p. 15789) como candidatos a métricas adicionais** de qualidade de árvore no dataset de referência, caso o comitê/revisor peça uma comparação mais direta e quantitativa com o artigo de 2007 além da concordância topológica booleana já medida.
5. **A metodologia de cSNP concatenado (Methods, p. 15792)** é conceitualmente diferente do alinhamento de genoma completo que o PhyloTreeMiner usa (MAFFT sobre genomas completos, não SNPs extraídos) — vale uma frase no manuscrito reconhecendo que a abordagem de representação de dados é diferente da do artigo original, o que é uma limitação-espelho da limitação #4 da seção 7 acima: o projeto usa mais sinal genômico bruto, ao custo de arquiteturas de alinhamento mais caras computacionalmente.

---
**Fonte primária:** `Artigos-Referencia/li-et-al-2007-on-the-origin-of-smallpox-correlating-variola-phylogenics-with-historical-smallpox-records.pdf` (arquivo local, sem link externo).
