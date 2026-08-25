# Quadro de decisões metodológicas do pipeline

[← Ciência](README.md) · Dono: [A11 Bioinformática & Inferência](../agents/11-bioinformatica-inferencia.md) · Entregável **M0.8** · 2026-08-19

## Para que serve

Promover **escolha silenciosa** — o default que ninguém decidiu — a **decisão documentada**. Um revisor de método vai perguntar, para cada linha desta tabela, *"por que assim?"*. Hoje a maioria das respostas é "porque era o default do código".

Este quadro é insumo direto da seção *Methods* e pré-requisito do dataset de referência de [M2](../automation/10-marcos-e-metas.md#4-m2--baseline-replicado--varv-49-clean).

**Fonte:** `config_backup.json` dos projetos de *Variola*, logs de execução em `out/tmp/`, e leitura do controlador em `BioComp_UFF/workflow/controller/`.

---

## 1. O que os experimentos de *Variola* de fato usaram

Do `config_backup.json` de VARV-49 (arquivo que declara `"project_name": "teste52"` enquanto vive no diretório `Variola_Yu_li_2007` — a proveniência quebrada de [`01-revisao-variola.md §1.3`](01-revisao-variola.md)):

| Parâmetro | Valor | Decidido? |
|---|---|---|
| `mode` | `advanced` | sim |
| `align_method` | `mafft` | **sim, mas ver D1** — o braço `clustalo` foi trocado por MAFFT em silêncio |
| `construct_tree_method` | `nj` | é a semente; o modo `advanced` expande para vários métodos |
| `ignore_mode` | `["raxml", "mrbayes", "parsimony"]` | **escolha silenciosa** — explica VARV-49 com 8 árvores (2 × 4) e VARV-6 com 10 (2 × 5) |
| `num_threads` | `1` | **escolha silenciosa** — afeta só tempo, não resultado |
| `output_format` | `nexus` | sim — e é onde nasce [D13](02-defeitos-que-alteram-resultado.md#d13) |
| `subtree_miner_configs.mode` | `OFST` | não documentado em lugar nenhum |
| `subtree_miner_configs.support_fpmax` | `auto` | **é o que dispara [D4](02-defeitos-que-alteram-resultado.md#d4)** — varredura de 0,1 a 1,0 sobrescrevendo o suporte real |

> **Achado de M0:** `ignore_mode` difere entre experimentos e **nunca foi reportado**. VARV-49 e VARV-121 excluem RAxML; VARV-6 não. Comparar "número de pipelines" entre esses conjuntos sem declarar isso é comparar coisas diferentes.

---

## 2. Decisões que precisam de justificativa escrita

Ordenadas por quanto mudam o resultado.

| # | Decisão | Estado hoje | O que falta |
|---|---|---|---|
| **DM-1** | **Alinhadores da biblioteca** | Clustal Omega declarado, MAFFT executado nos artefatos antigos ([D1](02-defeitos-que-alteram-resultado.md#d1)) | ✅ **Decidido** (DEC-036): a biblioteca é **MAFFT + Clustal Omega + MUSCLE**, os três de verdade. **Declarar no artigo que o MUSCLE é o 3.8.1551**, cujo algoritmo difere do MUSCLE 5 — o manifesto grava a versão. Medido em 20 seqs × 10,8 kb: MAFFT 4,9 s, MUSCLE 34,5 s, Clustal Omega 64,0 s |
| **DM-2** | **Modelo de substituição** | Não fixado. O IQ-TREE roda ModelFinder e escolhe sozinho; FastTree usa JC/GTR conforme flags | Registrar o modelo **escolhido** por execução no manifesto. Modelo diferente entre réplicas = topologia não comparável |
| **DM-3** | **Enraizamento** | Nenhum nos artefatos; a raiz é a convenção de escrita do Newick ([D3](02-defeitos-que-alteram-resultado.md#d3)) | ✅ **Ferramenta pronta** (M2.3 / DEC-034): grupo externo **declarado**, enraizamento comum a todos os métodos, e **recusa quando o grupo externo não é monofilético**. Aplicá-la ao dataset de referência é M2.6. Medido: os dois braços de UPGMA não enraízam em VARV-49 nem em VARV-6 |
| **DM-4** | **Semente aleatória** | Gerada pela ferramenta (IQ-TREE: `97376`), não fixada pelo pipeline | Fixar e registrar. Sem isso, **reexecutar não reproduz a árvore** ([D11](02-defeitos-que-alteram-resultado.md#d11)). **E fixar não basta**: com a mesma semente, o esquema de paralelização do RAxML muda a árvore em RF = 8 ([D17](02-defeitos-que-alteram-resultado.md#d17)) |
| **DM-5** | **Suporte de ramo** | UFBoot 1000 réplicas calculado pelo IQ-TREE e **descartado** ao gravar o Nexus ([D10](02-defeitos-que-alteram-resultado.md#d10)) | Propagar; habilitar `-B 1000` no RAxML-NG e `-boot` no FastTree para simetria — marco M3 |
| **DM-6** | **UPGMA no conjunto** | Incluído | ✅ **Decidido** (DEC-024): **fica**, e `sup` é reportado **com e sem**. **Evidência empírica de 2026-08-25**: é o único método que não recupera o grupo externo como clado, em ambos os experimentos testados (DEC-034). Seus pressupostos (relógio molecular, ultrametricidade) são violados num conjunto que atravessa gêneros, então incluí-lo infla a discordância medida — o que se declara, não se esconde. Desde M1.3 ele é comparável aos demais via bipartição |
| **DM-7** | **Filtro taxonômico** | Ausente nos conjuntos em disco ([D6](02-defeitos-que-alteram-resultado.md#d6)) | ✅ **Instrumento pronto** (M2.2 / DEC-035): clado **declarado** na consulta (`txid10242[Organism:exp]`) e verificação pós-download offline, que separa *fora do clado* de *sem linhagem*. Medido: VARV-49 limpo 49/49; VARV-52, VARV-121 e VARV-6 com 1, 4 e 1 táxons fora. Recompor os conjuntos é M2.6 |
| **DM-8** | **Tratamento das ITRs** | Genoma completo, ITRs incluídas — apesar de diretórios chamados `noITRs` | Declarar. O controle com e sem ITRs é [E5](04-agenda-de-pesquisa.md) |
| **DM-9** | **Recombinação** | Não avaliada. O próprio FastTree emite aviso no log e ninguém lê | Ortopoxvírus recombinam. Ou se detecta e particiona ([E6](04-agenda-de-pesquisa.md)), ou se declara como limitação |
| **DM-10** | **Critério de qualidade do alinhamento** | Nenhum. VARV-121 tem 34,5% de colunas com maioria de *gap* e ninguém foi avisado | Limiar declarado de *gap* por coluna e por táxon, com o que se faz ao violá-lo |
| **DM-11** | **`ignore_mode`** | Varia entre experimentos, não é reportado | Fixar por experimento e declarar no manifesto. **A causa foi identificada** ([D17](02-defeitos-que-alteram-resultado.md#d17)): o RAxML era excluído de *Variola* por um `SIGSEGV` do `--threads auto`, não por limitação do método — com a paralelização fixada, `M` volta de 4 para 5 |
| **DM-12** | **Amostragem** | Oportunista — o que havia no NCBI | Declarar explicitamente. Amostragem oportunista **descreve padrão; não demonstra origem nem transmissão**, e isso precisa estar visível na UI, não só no artigo |

---

## 3. Versões das ferramentas — o que está registrado e o que não está

| Ferramenta | Versão no log do experimento | Versão na máquina atual | Reexecução reproduz? |
|---|---|---|---|
| IQ-TREE | 2.2.2.6 | 2.2.2.6 | **não** — semente não fixada (DM-4) |
| FastTree | 2.2.0 | **2.1.11** | **não** — versão diverge |
| MAFFT | não registrada | 7.490 | indeterminável |
| Clustal Omega | não registrada (e não executou) | 1.2.4 | n/a |
| RAxML-NG | não registrada | presente | indeterminável |
| mlxtend (FPMax) | não registrada | 0.23.1 | indeterminável |

> **Consequência direta:** nenhum experimento de *Variola* em disco é reproduzível hoje, nem na máquina que o gerou. Fechar isso é o lote **M2.5** (manifesto de execução).

---

## 4. O que o manifesto precisa gravar

Especificado em [`04-rigor-cientifico.md §4`](../automation/04-rigor-cientifico.md#4-determinismo-e-reprodutibilidade). Por execução:

```json
{
  "run_id": "...", "utc": "...", "git_commit": "...", "git_commit_submodulo": "...",
  "tools": {"mafft": "7.490", "iqtree": "2.2.2.6", "fasttree": "2.1.11",
            "raxml-ng": "...", "mlxtend": "0.23.1"},
  "params": {"align_method": "mafft", "ignore_mode": ["..."],
             "model": "<escolhido pelo ModelFinder>", "seed": 42,
             "outgroup": ["NC_003391", "..."], "support_fpmax": "auto"},
  "inputs":  [{"path": "...", "sha256": "..."}],
  "outputs": [{"path": "...", "sha256": "..."}]
}
```

Três campos que o formato atual não tem e são obrigatórios: **`git_commit_submodulo`** (o pipeline vive no submódulo e tem histórico próprio), **`model`** efetivamente escolhido, e **`outgroup`** declarado.

---

## 5. Como este quadro é usado

- **M2** não fecha sem DM-3, DM-4, DM-7 e o manifesto de §4.
- **M3** é DM-5.
- **M6** copia §2 e §3 para *Methods* e para *Limitações*.
- Toda linha ainda marcada como *escolha silenciosa* quando o manuscrito for escrito vira uma **limitação declarada** — não um silêncio.
