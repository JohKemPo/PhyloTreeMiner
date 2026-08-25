# Rigor científico e reprodutibilidade

[← Automação](README.md)

O PhyloTreeMiner produz **números que vão para um artigo**: distâncias entre árvores, padrões FPMax, agregações geográficas e temporais de sequências. Um bug aqui não é um incômodo de usuário — é um resultado errado publicado. Este documento define o padrão de prova exigido antes de qualquer mudança nesse caminho.

> Aviso de escopo: este documento trata de método e engenharia de reprodutibilidade. Ele não substitui a revisão do orientador nem a de pares.

## 1. Zona sagrada

Mudança em qualquer um destes pontos **muda resultado** e exige o protocolo da §3:

| Área | Onde | Itens |
|---|---|---|
| Distância entre árvores | `exact_quartet_distance`, RF, `check_consistency` (`app.py`) | `C-5a`, `P-2` |
| Extração de metadados | `get_node_information`, `iter_metadata_nodes` (`app.py`), `genericOWIDAnalyzer.py` | `C-5b`, `C-5c` |
| Agregação geográfica | `COUNTRY_DICTIONARY` (front), `REGION_MAPPING` e `color_map` (`treePlot.py`) — **três tabelas divergentes hoje** | `C-5d` |
| Mineração de padrões | `analyze_patterns`, FPMax (parâmetros de suporte mínimo) | W6 |
| Deduplicação de sequências | `_is_duplicate` (`ncbi_acquisition.py`) — hoje compara posições com `zip`, semanticamente errado | `B-10` |
| Parsing de blocos CQL | `parse_cql_blocks` — quebra em `;` dentro de dados | `C-5e` |

Fora dessa zona (infra, CORS, path traversal, leak de listener, Docker) o protocolo pesado não se aplica — basta o [DoD geral](03-diretrizes-de-engenharia.md#6-definition-of-done-geral).

## 2. Dataset de referência (pré-requisito de W3)

Sem um dataset fixo, "o resultado mudou?" é impossível de responder. Antes de tocar a zona sagrada, precisa existir:

```
Backend/tests/data/reference/
  README.md          # proveniência: accessions, data de download, versão do NCBI, licença
  accessions.txt     # lista exata de accessions públicas usadas
  sequences.fasta    # ou script que rebaixa determinismo: baixa e verifica sha256
  trees/*.newick     # árvores de referência (inclui casos não-binários e politomias)
  expected.json      # saídas esperadas com tolerância declarada
  MANIFEST.sha256    # hash de cada arquivo
```

Critérios: só dados **públicos e não identificáveis** (ver [governança](05-governanca-de-dados-lgpd.md)); pequeno o bastante para versionar (poucos MB) ou reconstruível por script com verificação de hash; **inclui casos-limite** — árvore não-binária (é o que expõe `C-5a`), metadado ausente (`organism` vazio → `C-5b`), país fora do dicionário (`C-5d`), `;` dentro de string (`C-5e`), duas árvores no mesmo arquivo (`C-5c`).

## 3. Protocolo de mudança na zona sagrada

Ordem obrigatória. Pular passo é motivo de reprovação pelo [revisor](../agents/10-revisor.md).

1. **Caracterizar.** Golden snapshot do comportamento **atual** sobre o dataset de referência, com comentário dizendo que caracteriza um bug conhecido.
2. **Formalizar.** Escrever, em uma frase, o que a função *deveria* computar, com a definição da métrica e a citação (ex.: distância de quartetos = número de quartetos resolvidos de forma discordante; Robinson-Foulds = simetria das partições). Se a definição não pode ser escrita, a correção não está pronta para ser feita.
3. **Oráculo independente.** Comparar contra implementação de referência sobre o mesmo insumo: `DendroPy` (RF, consenso), `ETE3` (topologia), `tqDist` (quartetos). Divergência é dado, não ruído — investigar antes de mudar.
4. **Casos-limite explícitos.** Árvore não-binária, politomia, folha única, árvores com conjuntos de folhas diferentes, metadado ausente, data malformada, país desconhecido. Cada um com teste.
5. **Diff de resultado.** Rodar antes e depois e produzir a tabela:

   | Métrica | Antes | Depois | Δ | Afeta número publicado? |
   |---|---|---|---|---|

6. **Parecer + decisão humana.** Se algum Δ ≠ 0 em métrica publicada: **parar** e apresentar ao usuário. Ele decide entre corrigir com erratum, corrigir e re-rodar as análises, ou postergar. Um agente não toma essa decisão.
7. **Registrar** o parecer em [07-log-de-execucao](07-log-de-execucao.md) — mesmo quando Δ = 0 (a ausência de mudança também é resultado).

### Semântica de valores sentinela

Regra geral, motivada por `C-5a`: **"não aplicável" nunca é um número.** `-1` retornado por `exact_quartet_distance` em árvore não-binária é indistinguível de uma distância, e faz `check_consistency` responder "Inconsistent" sempre. Use `None`/`null` e propague explicitamente até a UI, que deve mostrar "não aplicável", não "0" nem "erro".

## 4. Determinismo e reprodutibilidade

- **Ambiente pinado:** `requirements.txt` com versões exatas; `environment.yml` + `conda-lock` para o canal bioconda; imagem Docker referenciada por digest quando for para o artigo.
- **Versões das ferramentas registradas em runtime.** `mafft`, `clustalo`, `iqtree`, `fasttree`, `raxml-ng`, `mrbayes` mudam resultado entre versões. Toda execução grava um **manifesto**:
  ```json
  {
    "run_id": "...", "utc": "...", "git_commit": "...",
    "tools": {"mafft": "7.526", "iqtree": "2.3.6"},
    "params": {"minsup": 0.3, "model": "GTR+G", "seed": 42},
    "inputs": [{"path": "...", "sha256": "..."}],
    "outputs": [{"path": "...", "sha256": "..."}]
  }
  ```
  Sem manifesto, um resultado não é reproduzível — é anecdótico.
- **Semente explícita** em tudo que amostra (bootstrap, heurística de busca de árvore). Semente ausente = resultado irreprodutível.
- **Nada de dependência de ordem de iteração** para resultado numérico. Ordene antes de agregar.
- **Ponto flutuante:** comparar com tolerância declarada (`math.isclose(rel_tol=1e-9)`), nunca `==`; a tolerância vai no `expected.json`.
- **Fonte única de verdade** para tabelas de domínio (`C-5d`): um arquivo de dados (ex.: `Backend/src/data/regions.json`) consumido pelo backend e servido ao frontend. Três tabelas divergentes produzem três respostas diferentes para "quantas sequências na América do Sul?".

## 5. Performance como afirmação científica

Escalabilidade é um resultado do artigo, logo tem o mesmo padrão de prova:

- **Medir, não estimar.** Protocolo em [`../audit/05-eixo-performance.md`](../audit/05-eixo-performance.md) (`P-0`) e na skill [`perf-baseline`](../skills/perf-baseline/SKILL.md).
- **Complexidade declarada é complexidade provada.** `treePlot.py` documenta um lookup como "O(1)" enquanto passa uma lista (é O(n)); `exact_quartet_distance` é O(n⁴) com cutoff em n≤25. Ao publicar uma curva, mostre a medição.
- **Reportar o ambiente** (CPU, RAM, versão) junto de qualquer número de tempo.
- **Antes/depois no mesmo hardware**, mesma entrada, ≥3 repetições, reportar mediana e dispersão.

## 6. Checklist de artefato para submissão (gate de W7)

- [ ] `git clone --recursive` + um comando → stack de pé
- [ ] `pytest` e testes do front verdes em CI, com badge
- [ ] Dataset de referência versionado com proveniência e hashes
- [ ] Resultado principal do artigo reproduzido por um script único a partir do dataset
- [ ] Manifesto de análise ligando **cada** figura/tabela a script + commit + hash de entrada
- [ ] `CITATION.cff` + DOI (Zenodo) do release usado no artigo
- [ ] *Code availability* e *Data availability statements* redigidos
- [ ] Licença declarada e compatível com todas as dependências (incl. ferramentas bioconda)
- [ ] Declaração de ética/LGPD e de acesso a recursos genéticos, se aplicável ([governança](05-governanca-de-dados-lgpd.md))
- [ ] Benchmark de escalabilidade com ambiente reportado
- [ ] Limitações conhecidas escritas (ex.: cutoff n≤25 em quartetos; suporte a árvores não-binárias)
