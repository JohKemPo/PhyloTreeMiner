# Zadra, Rizzoli & Rota-Stabelli (2024) — filogenômica abrangente do Zika vírus

[← Literatura](README.md) · Fonte externa (não é da linhagem de autoria do PhyloTreeMiner)

## 1. Citação completa

Zadra, N.; Rizzoli, A.; Rota-Stabelli, O. **"Comprehensive phylogenomic analysis of Zika virus: Insights into its origin, past evolutionary dynamics, and global spread."** *Virus Research*, v. 350, artigo 199490, 2024. DOI: [10.1016/j.virusres.2024.199490](https://doi.org/10.1016/j.virusres.2024.199490). Recebido em 27/10/2024, aceito em 31/10/2024, publicado online em 08/11/2024. Acesso aberto (CC BY 4.0). Autor correspondente: Nicola Zadra (NBFC, National Biodiversity Future Center, Palermo).

## 2. Pergunta de pesquisa

O ZIKV (*Flaviviridae*) tem histórico evolutivo pouco esclarecido apesar de estudos recentes sobre surtos. O artigo ataca três lacunas ao mesmo tempo: **origem** do vírus (incluindo a divergência de seu parente mais próximo, o Spondweni virus, SPOV), **dinâmica evolutiva pré-pandêmica** (datação dos nós profundos, antes dos surtos de 2015-2016 já bem estudados) e **dispersão global** — com ênfase declarada no papel da Tailândia como "hub" de disseminação para os outros focos asiáticos (Cingapura, Ilha Yap, Polinésia Francesa).

## 3. Dataset

Download do GenBank em **junho de 2021**, 1733 hits brutos (`Sayers et al., 2019`). Filtro: arquivo GenBank válido, data de coleta e local de amostragem presentes, sequência com **>700 pb**; duplicatas removidas. Resultado: **479 sequências**.

Três datasets derivados, em cascata:

| Dataset | n | Construção |
|---|---|---|
| 1 (bruto filtrado) | 479 | 123 Ásia, 24 Pacífico, 305 Américas; inclui deliberadamente **KX447518** (Polinésia Francesa) por ser o "nó comparável" à origem do surto americano ([Pettersson et al., 2016](https://doi.org/10.1093/molbev/msw235)) |
| 2 (refinado) | 117 | Remove sequências curtas (<9000 nt), depois poda por **efeito de densidade de nós** (`Bromham et al. 2018`; `Hugall & Lee 2007`) — reduz clados sobrerrepresentados. 8 amostras africanas, 35 asiáticas, 74 americanas |
| 3 (com grupo externo) | 118 | Dataset 2 + a única sequência de SPOV que passou no filtro (**MG182017**), para estimar a origem do ZIKV por enraizamento externo |

Todos alinhados com **MAFFT** (`Katoh et al. 2019`). O artigo declara que os alinhamentos estão disponíveis por link (não reproduzido neste PDF).

**Não há lista de acessos completa no corpo do artigo** — as figuras (Fig. 1, Fig. 2, Fig. 3) mostram acessos individuais pontuais (ex.: `KY241712`-`KY241790`ish, cluster de Cingapura; `HQ234498` e `KY288905`, Uganda 1947/1962; `KX447518`, Polinésia Francesa; `MG182017`, SPOV). A lista completa das 479/117/118 sequências está no repositório de dados (ver §9, disponibilidade).

## 4. Metodologia filogenômica

- **Detecção de recombinação**: RDP4 (`Martin et al. 2015`), cinco métodos (GENECONV, MaxChi, Chimera, Bootscan, 3Seq), significância exigindo detecção por **≥4 dos 5 métodos** com p ≤ 0,01 e correção de Bonferroni. Um evento real foi confirmado entre uma linhagem africana (Uganda) e uma cingapurense (`KY241712`/`KY241717`), na região do gene E — as sequências recombinantes foram **excluídas** da análise filogenética principal para evitar viés sistemático.
- **Inferência ML**: IQ-TREE 1.6.12, ultrafast bootstrap (1000 réplicas), bootstrap aproximado de Bayes e SH-aLRT.
- **Inferência Bayesiana / datação**: BEAST v2.6. Sete combinações de *prior* testadas: 2 modelos de relógio (estrito × relaxado log-normal não-correlacionado) × 3 *priors* de árvore de coalescência (constante, exponencial, *skyline* bayesiano) + um modelo de nascimento-morte serial (BDS) como comparação externa. Duas corridas por combinação, 200-400 milhões de gerações, convergência checada com Tracer 1.7 (ESS). **Seleção de modelo por Stepping Stone** (verossimilhança marginal + fator de Bayes, `Kass & Raftery 1995`).
- **Modelo de substituição**: GTR+γ em todas as corridas.
- **Calibração temporal**: *tip-dating* — datas de coleta como estado discreto/contínuo na ponta; amostra mais recente fixada em 15/10/2018 como tempo zero.
- **Estado geográfico**: local de coleta como **caractere discreto** para inferência de estado ancestral (`Bouckaert 2012`), não uma análise filogeográfica contínua/difusiva completa — é reconstrução de estado discreto sobre a árvore datada, não um modelo de dispersão espacial explícito (tipo *relaxed random walk*).

**Achado metodológico relevante para o PhyloTreeMiner**: o artigo trata explicitamente a **paralelização/seleção de prior como parte do resultado**, não como detalhe de implementação — o modelo vencedor (relógio relaxado + *Coalescent Bayesian Skyline*) muda a estimativa de idade dos nós em dezenas de anos frente aos modelos alternativos (Tabela 2 do artigo). É o mesmo tipo de acoplamento "escolha metodológica → número publicado" que M7 do PhyloTreeMiner audita para RAxML-NG/IQ-TREE/MrBayes (`D17`, `D20`, `D26`).

## 5. Resultados principais

- **Divergência Ásia-África/Américas** (nó *a*, Fig. 2): ~135 anos antes da amostra mais recente → **1883** (HPD 95% 1821-1933).
- **Radiação asiática** (nó *b*): **1952** (HPD 95% 1953-1933... reportado como 1962/07-1933/11 no artigo), consistente com ZIKV já circulando no Sudeste Asiático nas décadas de 1940-50.
- **Nó da epidemia recente** (nó *c*, coalescência de Yap/Cingapura/Américas): **1994/02**.
- **Papel central da Tailândia**: nó *d* (raiz da radiação que leva aos surtos recentes) tem 67% de probabilidade posterior de origem tailandesa, estimado em **1999/06**. A sequência tailandesa mais antiga na base é de 2006, mas o artigo argumenta por evidências indiretas que o vírus já circulava desde os anos 1999-2006.
- **Divergência ZIKV-SPOV** (nó da raiz, Fig. 3): estimada em **~800 d.C.** (HPD 95% 294 a.C.–1516 d.C.) — intervalo muito amplo, reconhecido pelos próprios autores como pouco confiável (ver limitações).
- **Reintrodução do ZIKV na África**: divergência das sequências angolanas estimada em **2015/02** (antes do primeiro caso confirmado em 2016/12) — um atraso de detecção de quase um ano, o mesmo padrão observado em Cabo Verde e no Brasil. O argumento central do artigo (seção "Concluding remarks") é justamente este: **o ZIKV circula silenciosamente por ~1 ano ou mais antes de qualquer surto ser detectado**, em todos os três continentes examinados.
- **Recombinação**: um evento real detectado entre linhagem africana (Uganda, doadora) e linhagem cingapurense, sugerindo co-circulação não documentada de uma cepa africana na Ásia durante os surtos de 2016.
- Passagem em cultura de células **distorce a taxa de mutação** — sequências com histórico de passagem longo/desconhecido foram removidas do dataset de datação por violarem o sinal temporal (coeficiente de variação σ_c > 1 quando incluídas, indicando ausência de relógio molecular coerente).

## 6. Relação com o dataset de validação leve do projeto

O PhyloTreeMiner usa, como conjunto de validação rápida (skill `validar-workflow`), o projeto `Zika_Virus_Singapura_Large_21seq`, cujo `input_path` aponta para `BioComp_UFF/data/Zika479_Test_large/dataset_final.fasta` — **20 sequências**, a maioria isolados parciais africanos/asiáticos antigos (`EU545988` Uganda, `JN860885` Camboja FSS13025, várias `KF3830xx` do Senegal, `KF9936xx` Canadá). **Nenhum acesso desse arquivo de 20 sequências coincide com os acessos específicos citados no artigo** (Cingapura `KY241xxx`, Uganda `HQ234498`/`KY288905`, `KX447518`) — não há sobreposição direta verificável neste subconjunto pequeno.

Mas o repositório guarda também `BioComp_UFF/data/Zika479ONE/dataset_final.fasta`, com **478 sequências** — a um acesso de diferença do "479 sequências" que o artigo relata como seu dataset bruto de partida (§3.1 do artigo, mesmo filtro: GenBank, ≥700 pb, com data e local). Uma checagem direta confirma que **este arquivo de 478 sequências contém `KX447518` e `KY288905`**, os dois acessos que o artigo cita nominalmente por razão metodológica específica (respectivamente, o nó comparável à origem americana e um dos dois contribuidores da recombinação Uganda-Cingapura). Essa coincidência de nome (479 vs. 478) **e** de acessos específicos e pouco comuns é forte indício de que `Zika479ONE` foi construído com os mesmos critérios de busca do GenBank usados neste artigo (ou é uma extração muito próxima no tempo/critério) — mas não é prova de derivação direta, porque tanto o artigo quanto o dataset local podem ter sido gerados independentemente a partir da mesma consulta óbvia ("ZIKV, GenBank, ≥700 pb, com metadado de data/local"). **Nenhum README ou metadata.json em `BioComp_UFF/data/Zika479*` documenta a proveniência** — isso é uma lacuna concreta de reprodutibilidade que vale registrar (ver §8).

O projeto Neo4j em `localhost:7474` mencionado em `docs/science/01-revisao-variola.md:421` (**477 acessos, 10 árvores**, único organismo `"Zika virus"` no grafo) também bate, por ordem de grandeza, com esta mesma família de datasets Zika479 — reforçando que o "controle Zika" citado em `docs/science/01-revisao-variola.md §157/169` (usado para medir o efeito real do alinhador porque os genomas de ~10,6 kb ficam abaixo do limite de 20 kb do `_isExecutableByClustalO`) é este mesmo corpus de ~478-479 sequências, e não um dataset menor e não relacionado.

## 7. Limitações reconhecidas pelos autores

- **Amostragem africana limitada e desbalanceada** — os autores dizem explicitamente que isso restringe a resolução da diversidade do clado africano e deixa em aberto a pergunta de `Gong et al. 2017` ("duas ou três linhagens de Zika?").
- **Estimativa de idade da raiz (ZIKV-SPOV) pouco confiável**: um único par SPOV/ZIKV como grupo externo, HPD 95% de ~2300 anos de largura (294 a.C.–1516 d.C.) — os próprios autores pedem cautela nessa estimativa específica e reconhecem que mais sequências de SPOV são necessárias.
- **Passagem em cultura de células** como fonte de viés de datação — resolvido por exclusão, não por modelagem.
- **Comparação limitada com estimativas anteriores** (`Pettersson et al. 2018`): os métodos de amostragem taxonômica diferentes impedem comparação direta rigorosa entre os dois estudos (nota de rodapé da Tabela 3 do artigo).
- Nenhuma seção formal de "Limitations", mas as ressalvas aparecem distribuídas nas seções 3.6-3.8 e nas "Concluding remarks".

## 8. Relevância para M6 e publicações futuras

Diferente dos outros cinco artigos analisados nesta biblioteca (que são a genealogia direta de método do PhyloTreeMiner), este é um **caso de validação externa em segunda espécie** — útil não como base metodológica, mas como candidato a experimento de generalização depois de M6.

**Achados que o PhyloTreeMiner poderia tentar reproduzir qualitativamente com o pipeline atual**, sem replicar a inferência bayesiana temporal completa (BEAST está fora do escopo atual do projeto):
1. **Monofilia da linhagem africana e da linhagem asiático-americana** — o próprio artigo confirma isso como já bem estabelecido na literatura (não é o achado novo do artigo, mas é testável com M4 de FastTree/IQ-TREE/RAxML-NG do jeito que o dataset de referência VARV-49 testa monofilia de VARV).
2. **Contraste bootstrap × robustez metodológica** (o resultado principal de M3 do PhyloTreeMiner) é diretamente replicável neste corpus: bastaria rodar os quatro/cinco métodos de inferência atuais do PhyloTreeMiner sobre um subconjunto do Zika479 e medir se o mesmo padrão (UFBoot alto necessário mas não suficiente) se sustenta numa segunda espécie viral. Isso seria evidência de **generalização** do achado central do artigo em preparação — hoje limitado a Variola.

**Recomendação concreta**: antes de propor esse experimento formalmente na agenda de pesquisa (`docs/science/04-agenda-de-pesquisa.md`), documentar a proveniência real de `Zika479ONE`/`Zika479_Test*` (quem baixou, quando, com que query do NCBI) — hoje não há manifesto nem README nesses diretórios de dados, o que viola o mesmo princípio de proveniência que motivou `M2.5` (manifesto de execução) para os dados de Variola. Sem isso, um eventual "resultado Zika" do PhyloTreeMiner não teria a mesma rastreabilidade que o dataset de referência VARV-49 tem hoje.

Este artigo também é a citação natural em *Related Work*/*Introduction* do manuscrito de M6 para justificar o desenho "vários métodos de inferência, mesmo dado" como técnica geral em virologia filogenética — não é específico de poxvírus, e o achado do artigo sobre a Tailândia como *hub* é, por si, um exemplo publicado de como reconstrução filogenética molda inferência epidemiológica, reforçando o enquadramento de "computação para o bem da saúde pública" do projeto.

---
**Fonte primária:** Artigos-Referencia/1-s2.0-S0168170224001837-main.pdf (arquivo local, sem link externo).
