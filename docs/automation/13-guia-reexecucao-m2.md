# Guia de reexecução completa dos projetos — M2 / §4.1

[← Automação](README.md) · Criado em 2026-09-01. Documento vivo — atualize a versão do gate (`make reference-check`) e o número da última reexecução aqui, não só no ledger.

Este documento **operacionaliza** [`11-handoff-maquina-de-validacao.md §4.1`](11-handoff-maquina-de-validacao.md#41-reexecutar-os-experimentos-com-o-pipeline-corrigido--prioridade-máxima) com os parâmetros **atuais** — pós [DEC-046](07-log-de-execucao.md#dec-046--2026-08-26--tools_invoked-deixa-de-sair-vazio--o-manifesto-passa-a-registrar-o-que-rodou) (`-nt 1` do IQ-TREE) e [DEC-050](07-log-de-execucao.md#dec-050--2026-08-27--d1-fecha-m2-chega-a-7-de-7--e-o-fator-alinhador-passa-a-existir) (o fator alinhador é `mafft` × `mafft_iterative`). O §4.1 fala em "o quê" e "por quê"; aqui está o comando, a config e o número de threads, prontos para colar.

⚠️ **Isto é um guia, não uma ordem de execução.** Rodar os conjuntos grandes (VARV-121, ZIKV-480) leva horas e ocupa a máquina inteira — [regra do `CLAUDE.md`](../../CLAUDE.md): **combine antes de rodar pipeline pesado**. Este documento existe para quando a decisão de rodar já foi tomada.

### Estado desta rodada — atualizado em 2026-09-03

**Esta é a máquina de validação** (48 núcleos lógicos / Threadripper 2970WX, 47 GB RAM — confirmado batendo com §1.1 nesta sessão, 2026-09-03). Todas as reexecuções abaixo, passadas e futuras, rodam aqui.

| Conjunto | Seção | Estado | Achado |
|---|---|---|---|
| Zika-21 (pré-voo) | §3.0 | ✅ concluído | — |
| VARV-6 | §3.1 | ✅ concluído | — |
| VARV-49 | §3.2 | ✅ concluído | [D25](../science/02-defeitos-que-alteram-resultado.md#d25)/[DEC-057](07-log-de-execucao.md#dec-057--2026-09-01--d25--mafft_iterative-colidia-com-mafft-em-stabilitypy-e-m13-crashava-nas-três-reexecuções) encontrado e corrigido aqui: `stability.py` não reconhecia `mafft_iterative` como alinhador e travava M1.3 (`ValueError`) nas três reexecuções acima. Oráculo dendropy confirmou 0 divergências nas três depois do fix |
| VARV-52 | §3.2-bis | ⏳ não iniciado | Confundido com `teste52` (= VARV-49) até esta sessão corrigir — ver a nota de correção em §3. É a causa nº 1 do código de saída 2 de [DEC-069](07-log-de-execucao.md) |
| VARV-121 | §3.3 | ✅ concluído (2026-09-01 20:07 → 2026-09-02 12:56, 16h49) | `conferir_correcoes_m1.py` TUDO VERDE, oráculo dendropy 45 pares/0 divergências. Serviu de segunda réplica de [E4](04-agenda-de-pesquisa.md#e4--◐--o-fator-alinhador-medido-onde-ele-existe) — confirma NJ como método mais sensível à troca de alinhador em *Variola* (replica VARV-49), com UPGMA se aproximando do NJ nesta escala (não replica exatamente) |
| ZIKV-480 | §3.4 | ⏳ não iniciado | `parsimony` corrigido para dentro de `ignore_mode` (ver §3.4) |

Se você está lendo isto numa sessão nova: os já concluídos já provaram M1.3 verde nesta máquina; se `conferir_correcoes_m1.py` voltar a travar em M1.3 com um `ValueError` de rótulo duplicado, o código já deveria ter o fix de D25 — confira `BioComp_UFF/workflow/stability/stability.py` antes de reabrir o achado.

## 0. Por que a reexecução importa

M1 corrigiu o **pipeline**; os artefatos em `BioComp_UFF/projects/**` continuam com os números de antes das correções (D1, D3, D4, D5, D12, D13, D16 — ver [`11-handoff §1`](11-handoff-maquina-de-validacao.md#1-o-que-já-está-pronto-e-não-precisa-de-máquina-grande)). Nenhum número que a aplicação mostra hoje sobre esses projetos mudou. Só a reexecução materializa o número certo — é a decisão 5 do usuário ([DEC-018](07-log-de-execucao.md)): "corrigir e re-rodar".

## 1. Pré-requisitos — rode uma vez, antes de qualquer conjunto

```bash
cd /home/geomesh/Documentos/GIT/PhyloTreeMiner
conda activate Phylotreeminer
bash scripts/check_dependencies.sh --strict      # 7 ✓, exit 0 — nenhuma ferramenta "fora do env"
make test-backend                                # 250 passed, 1 xfailed (medido em 2026-09-01)
cd BioComp_UFF && python -m unittest \
  workflow.tests.test_stability workflow.tests.test_subtree_mining \
  workflow.tests.test_tree_identity workflow.tests.test_rf_bipartition \
  workflow.tests.test_manifest workflow.tests.test_rooting \
  workflow.tests.test_taxonomy workflow.tests.test_aligners \
  workflow.tests.test_external_tools                # Ran 164 tests, OK (D25/DEC-057 já corrigido; eram 150 antes)
cd .. && make reference-check                    # invariante 3/3; código 2 esperado (falta mafft_raxml — confirmado ainda válido em 2026-09-01)
```

Se algum falhar, **pare** — o estado da máquina diverge do esperado e nenhum resultado pesado terá valor (mesma regra do [`11-handoff §3`](11-handoff-maquina-de-validacao.md#3-o-que-rodar-primeiro--portão-de-sanidade)).

**Dado pessoal — obrigatório para VARV (baixa do NCBI).** O Entrez exige e-mail de contato; não fica no código (regra 7 do `CLAUDE.md`):

```bash
export NCBI_EMAIL='seu-email@instituicao.br'
```

### 1.1 Orçamento da máquina — meça agora, não confie neste número depois

Regra 8 do `CLAUDE.md`: nenhum limite compilado, todo limite é lido da máquina em execução. Os números abaixo são a leitura **de 2026-09-01**, nesta máquina — releia antes de rodar, principalmente `disponível` e `livre`:

```bash
nproc --all                    # 48 (24 núcleos físicos, Threadripper 2970WX)
free -h                        # 47 GB totais, 41 GB disponíveis nesta medição
df -h /home/geomesh/Documentos/GIT/PhyloTreeMiner   # 785 GB livres
```

Os `num_threads` / `raxml_threads` / `iqtree_threads` recomendados em cada seção abaixo partem **destes** números. Numa máquina diferente, ou se `free -h` mostrar menos disponível (outro processo rodando), recalcule — não copie os números às cegas.

## 2. O que não muda entre conjuntos

Estas linhas de `tree_config` são as mesmas em toda reexecução — são decisões já tomadas, não parâmetros de ajuste:

| Campo | Valor | Por quê |
|---|---|---|
| `"mode"` | `"advanced"` | **Nunca `"auto"`** — roda só distância e parcimônia e imprime `Completed successfully!` ([D18](../science/02-defeitos-que-alteram-resultado.md#d18)) |
| `"aligners"` | `["mafft", "mafft_iterative"]` | O fator alinhador ([DEC-050](07-log-de-execucao.md#dec-050--2026-08-27--d1-fecha-m2-chega-a-7-de-7--e-o-fator-alinhador-passa-a-existir)) — progressivo × iterativo, mesmo binário. É o `ALINHADORES_PADRAO` do controlador; declarar explicitamente é só clareza |
| `"random_seed"` | `12345` | Sem semente fixa, reexecutar não reproduz ([D11](../science/02-defeitos-que-alteram-resultado.md#d11)) |
| `-nt 1` do IQ-TREE | fixo no código, não é campo de config | [D21](../science/02-defeitos-que-alteram-resultado.md#d21) — com `-nt N` a mesma semente dá topologias diferentes. `iqtree_threads` governa só o **bootstrap** |
| `--workers 1` do RAxML-NG | fixo no código, não é campo de config | [D17](../science/02-defeitos-que-alteram-resultado.md#d17) — `--threads auto` mudou a topologia (RF = 8) |
| `ignore_mode` | inclui sempre `"mrbayes"` | Instalado (3.2.7) mas sem semente nem verificação de convergência integradas — item aberto de **M7.4**, fora do escopo de M2 |

`align_method` (singular) pode continuar presente por compatibilidade, mas quem governa o modo `advanced` é `aligners` — é o que `TreeBuilderController.aligners` lê.

### 2.1 Regra operacional que já derrubou uma tentativa: **diretório novo, sempre**

`docs/skills/validar-workflow/SKILL.md` já avisa: *"o workflow reaproveita árvore existente — rodar duas vezes no mesmo diretório não refaz nada."* Isto vale também para o **alinhamento**, e uma tentativa real de reexecução de VARV-49 bateu nisso:

```
projects/Variola_Yu_li_2007_M2/out/outputs/log_setup_2026-08-27_bb3fcd1b784d.log

STEP: Reusing Aligning...
Arquivo de alinhamento já existe: .../tmp/dataset_final_mafft_iterative.aln. Reutilizando.
ERROR - Erro no alinhamento das sequências para .../dataset_final_NoPipe: No records found in handle
```

O que aconteceu: uma tentativa anterior, no **mesmo** diretório de saída, morreu no meio da escrita de `dataset_final_mafft_iterative.aln`, deixando um arquivo vazio para trás. A tentativa seguinte encontrou esse `.aln` no cache de `tmp/`, decidiu "reusar" em vez de realinhar, e travou ao tentar ler um alinhamento sem registro nenhum — depois de já ter completado o braço `mafft` inteiro (5 árvores: `nj_distance`, `upgma_distance`, `fasttree`, `iqtree`, `raxml`; o braço `mafft_iterative` nunca produziu nada). **O diretório `projects/Variola_Yu_li_2007_M2/` está envenenado** — qualquer nova tentativa ali vai bater no mesmo `.aln` vazio e falhar do mesmo jeito. Não reutilize.

**Regra:** cada tentativa de reexecução usa um `project_name` novo — sugestão: `<Conjunto>_reexec_AAAAMMDD` (ex.: `Variola_Yu_li_2007_reexec_20260901`). Se precisar mesmo retomar num diretório existente, limpe o cache primeiro: `rm -rf projects/<nome>/out/tmp/*.aln`.

## 3. Os conjuntos, na ordem recomendada

Ordem: do mais barato para o mais caro — cada um valida o anterior antes de comprometer horas no próximo.

⚠️ **Correção de revisão (2026-09-03):** a frase que estava aqui dizia que `VARV-52` "não foi localizado como conjunto próprio" e que seria o mesmo VARV-49 contado antes/depois do dedup. **Isso está errado** — a confusão veio de comparar o `config_backup.json` do diretório errado. `projects/teste52/` de fato usa o mesmo `input_path` de VARV-49 (`data/replication-RetMax200-ITRs`, 52 registros brutos → 49 distintos) e é **duplicata** de VARV-49, não VARV-52. O VARV-52 real é `projects/test_variola_noITRs_57_Complete`, cujo dado de origem é **outro** diretório — `data/workflow_dataAcquisition_li_et_al_2007_replication-RetMax200-ITRs`, **55 registros brutos**, com o contaminante *Nile crocodilepox virus* (`NC_008030`, fora de *Orthopoxvirus*, [D6](../science/02-defeitos-que-alteram-resultado.md#d6)) que a tabela de [`11-handoff §4.1`](11-handoff-maquina-de-validacao.md#41-reexecutar-os-experimentos-com-o-pipeline-corrigido--prioridade-máxima) já registrava. Confirmado por `grep -c '^>'` nos dois FASTA (52 × 55) e por composição de acessos — nenhum dos dois é subconjunto do outro. Ver §3.2-bis abaixo para a reexecução real de VARV-52; a nota antiga permanece incorreta em qualquer commit anterior a esta correção.

### 3.0 Pré-voo — Zika-21 (não pula esta etapa)

Confirma que a máquina está sã antes de comprometer horas nos conjuntos de *Variola*. Fecha em minutos. Config completa em [`docs/skills/validar-workflow/SKILL.md`](../skills/validar-workflow/SKILL.md) — **uma ressalva**: o exemplo de lá ainda usa `"mode": "auto"`, anterior à regra do D18 declarada no `CLAUDE.md`; use `"advanced"` como abaixo, que é o que os projetos mais recentes (`Zika_21seq_d1`, `_manifesto`, `_runid`) já fazem.

```bash
cd BioComp_UFF
cat > /tmp/zika21_reexec.json <<'JSON'
{
  "log_file": true,
  "project_name": "Zika_21seq_reexec_20260901",
  "output_log": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Zika_21seq_reexec_20260901/out",
  "tree_config": {
    "mode": "advanced",
    "ignore_mode": ["mrbayes"],
    "aligners": ["mafft", "mafft_iterative"],
    "align_method": "mafft",
    "num_threads": 8,
    "random_seed": 12345,
    "raxml_threads": 4,
    "iqtree_threads": 8,
    "input_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/data/Zika479_Test_large",
    "output_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Zika_21seq_reexec_20260901/out",
    "output_format": "nexus"
  },
  "subtree_config": {
    "construct_tree_method": "distance",
    "input_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Zika_21seq_reexec_20260901/out/Trees",
    "output_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Zika_21seq_reexec_20260901/out",
    "input_format": "nexus",
    "output_format": "nexus",
    "resume_infos": true,
    "save_metadata": true,
    "subtree_miner": true,
    "subtree_miner_configs": {
      "mode": "OFST",
      "save_fpmax": true,
      "output_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Zika_21seq_reexec_20260901/out",
      "support_fpmax": "auto"
    }
  }
}
JSON
python workflow.py -p /tmp/zika21_reexec.json
```

`raxml_threads: 4`, não mais — é o alinhamento **curto** (~10,8 kb) que fez o RAxML-NG recusar `--threads 16` na máquina de validação (*"Too few patterns per thread"*, medido; ver [`11-handoff §4.3`](11-handoff-maquina-de-validacao.md#43-teste-de-estresse--o-que-ainda-não-se-sabe)). O que limita RAxML-NG é o número de **padrões** depois da compressão, não o número de táxons nem de núcleos — por isso este conjunto pequeno pede menos threads que VARV-49, apesar da máquina ser a mesma.

**Esperado:** 14 árvores (2 alinhadores × {nj, upgma, fasttree, iqtree, raxml}, `mrbayes` fora), ~10 min. Confira:

```bash
cd ../Backend && python scripts/conferir_correcoes_m1.py Zika_21seq_reexec_20260901
cd ../BioComp_UFF && python ../docs/science/scripts/oraculo_rf_dendropy.py projects/Zika_21seq_reexec_20260901
                                 # exigência: 0 divergências
```

⛔ **Não compare os agregados (FPMax, clados canônicos) desta execução contra execuções anteriores.** [D21](../science/02-defeitos-que-alteram-resultado.md#d21) só neutraliza a *causa* da não-determinização do IQ-TREE; medições feitas **antes** de `-nt 1` entrar em vigor (tudo até [DEC-046](07-log-de-execucao.md)) não são comparáveis a esta.

### 3.1 VARV-6 — demo didático

```bash
cd BioComp_UFF
cat > /tmp/varv6_reexec.json <<'JSON'
{
  "log_file": true,
  "project_name": "Variola_VARV6_reexec_20260901",
  "output_log": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Variola_VARV6_reexec_20260901/out",
  "tree_config": {
    "mode": "advanced",
    "ignore_mode": ["mrbayes"],
    "aligners": ["mafft", "mafft_iterative"],
    "align_method": "mafft",
    "num_threads": 8,
    "random_seed": 12345,
    "raxml_threads": 4,
    "iqtree_threads": 8,
    "input_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/data/SMALL_li_2007_replication-RetMax200-ITRs",
    "output_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Variola_VARV6_reexec_20260901/out",
    "output_format": "nexus"
  },
  "subtree_config": {
    "construct_tree_method": "distance",
    "input_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Variola_VARV6_reexec_20260901/out/Trees",
    "output_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Variola_VARV6_reexec_20260901/out",
    "input_format": "nexus",
    "output_format": "nexus",
    "resume_infos": true,
    "save_metadata": true,
    "subtree_miner": true,
    "subtree_miner_configs": {
      "mode": "OFST",
      "save_fpmax": true,
      "output_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Variola_VARV6_reexec_20260901/out",
      "support_fpmax": "auto"
    }
  }
}
JSON
python workflow.py -p /tmp/varv6_reexec.json
```

`ignore_mode` **sem** `"parsimony"` aqui — em 6 táxons o custo de parcimônia é irrelevante, e é o único conjunto de *Variola* pequeno o bastante para incluí-la sem dominar o tempo total (ao contrário do que a parcimônia faz num alinhamento de 20 táxons × 10,8 kb, onde já custa 116-169 s por árvore). `raxml_threads: 4` pela mesma razão de §3.0: alinhamento pequeno, poucos padrões.

**Esperado:** minutos. `data/SMALL_li_2007_replication-RetMax200-ITRs/dataset_final.fasta` tem **6 sequências**, sem duplicata RefSeq/GenBank conhecida (confirme com `grep -c '^>'`).

### 3.2 VARV-49 — baseline de referência (prioridade máxima)

É o conjunto de [DEC-024](07-log-de-execucao.md) e o que fecha [`§4.1`](11-handoff-maquina-de-validacao.md#41-reexecutar-os-experimentos-com-o-pipeline-corrigido--prioridade-máxima) e alimenta `make reference-dataset` (§4 abaixo).

**O dado já está adquirido.** `data/replication-RetMax200-ITRs/dataset_final.fasta` (52 registros brutos, confirmado com `grep -c '^>'`) já existe em disco. Reaquisição é **opcional** — só necessária para provar que a consulta ao NCBI ainda devolve o mesmo conjunto, ou se o arquivo não existir na sua cópia:

```bash
# opcional — precisa de rede e de NCBI_EMAIL exportado (§1)
cd BioComp_UFF
python -m workflow.experimentos.variola_li_2007 data/replication-RetMax200-ITRs_novo
```

Isto reconstrói `dataset_with_outgroup.gb` e `dataset_final.fasta` a partir dos 48 acessos declarados em `workflow/experimentos/variola_li_2007_acessos.txt` + o outgroup (*Taterapox*/*Camelpox*). **Não sobrescreva** `data/replication-RetMax200-ITRs/` original — é a evidência do "antes"; escreva num diretório novo e compare os `md5sum` se quiser confirmar reprodutibilidade da aquisição.

**Config para a reexecução (usa o dado já adquirido):**

```bash
cd BioComp_UFF
cat > /tmp/varv49_reexec.json <<'JSON'
{
  "log_file": true,
  "project_name": "Variola_VARV49_reexec_20260901",
  "output_log": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Variola_VARV49_reexec_20260901/out",
  "tree_config": {
    "mode": "advanced",
    "ignore_mode": ["mrbayes", "parsimony"],
    "aligners": ["mafft", "mafft_iterative"],
    "align_method": "mafft",
    "num_threads": 16,
    "random_seed": 12345,
    "raxml_threads": 8,
    "iqtree_threads": 16,
    "input_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/data/replication-RetMax200-ITRs",
    "output_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Variola_VARV49_reexec_20260901/out",
    "output_format": "nexus"
  },
  "subtree_config": {
    "construct_tree_method": "distance",
    "input_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Variola_VARV49_reexec_20260901/out/Trees",
    "output_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Variola_VARV49_reexec_20260901/out",
    "input_format": "nexus",
    "output_format": "nexus",
    "resume_infos": true,
    "save_metadata": true,
    "subtree_miner": true,
    "subtree_miner_configs": {
      "mode": "OFST",
      "save_fpmax": true,
      "output_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Variola_VARV49_reexec_20260901/out",
      "support_fpmax": "auto"
    }
  }
}
JSON
python workflow.py -p /tmp/varv49_reexec.json
```

`ignore_mode` inclui `"parsimony"` aqui — em 20 táxons × 10,8 kb ela já custa 116-169 s por árvore; em 49 táxons × ~236 kb o `ParsimonyTreeConstructor` do Biopython (Python puro) domina o tempo total sem necessidade — é limitação **conhecida**, não nova (ver [`11-handoff §4.3`](11-handoff-maquina-de-validacao.md#43-teste-de-estresse--o-que-ainda-não-se-sabe)).

`num_threads: 16` para o alinhamento e `iqtree_threads: 16` para o bootstrap — generoso de propósito: o bootstrap é embaraçosamente paralelo e não decide topologia (§2), então não há risco em usar boa parte dos 48 núcleos lógicos aqui. `raxml_threads: 8` é o valor já testado nesta máquina, neste conjunto, numa tentativa anterior (`Variola_Yu_li_2007_M2`, §2.1) — chegou a rodar (5 árvores do braço `mafft`, incluindo `raxml`, todas produzidas) antes de a tentativa morrer por outro motivo. Se `raxml-ng` recusar com *"Too few patterns per thread"*, baixe para 4.

**Esperado:** 52 registros → 49 sequências distintas (log confirmado: *"52 registros → 49 sequências distintas. Descartados por sequência idêntica: NC_008291.1 (idêntico a DQ437594.1); NC_003391.1 (idêntico a AF438165.1); DQ437594.1 (idêntico a DQ437594.1)"* — [D23](../science/02-defeitos-que-alteram-resultado.md#d23), declarado e não corrigido). 10 árvores (2 alinhadores × {nj, upgma, fasttree, iqtree, raxml}). MAFFT roda em minutos nos dois alinhamentos ([DEC-050](07-log-de-execucao.md#dec-050--2026-08-27--d1-fecha-m2-chega-a-7-de-7--e-o-fator-alinhador-passa-a-existir): *"roda em ambos os conjuntos"*, medido em 228 kb); RAxML-NG com `--threads N --workers 1` completou o mesmo porte de alinhamento (`teste52`, mesmo dado de VARV-49, 251 s) na máquina de desenvolvimento, de 12 núcleos — espere igual ou mais rápido aqui.

```bash
cd ../Backend && python scripts/conferir_correcoes_m1.py Variola_VARV49_reexec_20260901 Variola_Yu_li_2007
cd ../BioComp_UFF && python ../docs/science/scripts/oraculo_rf_dendropy.py projects/Variola_VARV49_reexec_20260901
cd .. && python docs/science/scripts/audit_variola.py --secao 3 --secao 5
```

### 3.2-bis VARV-52 — o conjunto que faltava para fechar M3.4

Adicionado em 2026-09-03: é o segundo motivo do código de saída 2 de `make main-result` ([DEC-069](07-log-de-execucao.md#dec-069--2026-09-03--m34-implementado--make-main-result-existe--as-duas-afirmações-do-artigo-se-sustentam-em-2-de-3-conjuntos-com-números-atualizados)). `docs/science/scripts/resultado_principal.py` tem `Conjunto("VARV-52", None, bloqueio=...)` **hardcoded** — depois de reexecutar, é preciso trocar o `None` pelo caminho do projeto novo nesse arquivo, senão o gate continua bloqueado mesmo com o artefato em disco.

**O dado já está adquirido e já está limpo.** Ao contrário de VARV-49, o dado bruto de VARV-52 (`data/workflow_dataAcquisition_li_et_al_2007_replication-RetMax200-ITRs/dataset_final.fasta`, 55 registros) **está contaminado** — 1 táxon fora de *Orthopoxvirus* ([D6](../science/02-defeitos-que-alteram-resultado.md#d6)/[DEC-035](07-log-de-execucao.md#dec-035--2026-08-25--m22--filtro-taxonômico-declarado-e-a-contaminação-de-d6-medida-acesso-a-acesso)). A variante limpa já existe, gerada em 2026-08-25 por [DEC-038](07-log-de-execucao.md#dec-038--2026-08-25--conjuntos-limpos-criados-ao-lado-dos-contaminados) — **use-a**, não o dado bruto:

```bash
cat BioComp_UFF/data/workflow_dataAcquisition_li_et_al_2007_replication-RetMax200-ITRs-clean/PROVENIENCIA.md
# 55 → 54 sequências; removida NC_008030 (Nile crocodilepox virus); DQ437594 e
# NC_003391 mantidas sem lineage por falta de metadado (mesma classe de D23/DEC-038)
grep -c '^>' BioComp_UFF/data/workflow_dataAcquisition_li_et_al_2007_replication-RetMax200-ITRs-clean/dataset_final.fasta   # 54
```

**Config para a reexecução** — mesmo padrão de §3.2 (VARV-49), só troca `input_path`/`output_path`/`project_name`:

```bash
cd BioComp_UFF
cat > /tmp/varv52_reexec.json <<'JSON'
{
  "log_file": true,
  "project_name": "Variola_VARV52_reexec_20260903",
  "output_log": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Variola_VARV52_reexec_20260903/out",
  "tree_config": {
    "mode": "advanced",
    "ignore_mode": ["mrbayes", "parsimony"],
    "aligners": ["mafft", "mafft_iterative"],
    "align_method": "mafft",
    "num_threads": 16,
    "random_seed": 12345,
    "raxml_threads": 8,
    "iqtree_threads": 16,
    "input_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/data/workflow_dataAcquisition_li_et_al_2007_replication-RetMax200-ITRs-clean",
    "output_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Variola_VARV52_reexec_20260903/out",
    "output_format": "nexus"
  },
  "subtree_config": {
    "construct_tree_method": "distance",
    "input_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Variola_VARV52_reexec_20260903/out/Trees",
    "output_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Variola_VARV52_reexec_20260903/out",
    "input_format": "nexus",
    "output_format": "nexus",
    "resume_infos": true,
    "save_metadata": true,
    "subtree_miner": true,
    "subtree_miner_configs": {
      "mode": "OFST",
      "save_fpmax": true,
      "output_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Variola_VARV52_reexec_20260903/out",
      "support_fpmax": "auto"
    }
  }
}
JSON
python workflow.py -p /tmp/varv52_reexec.json
```

`ignore_mode` inclui `"parsimony"` pelo mesmo motivo de VARV-49 (§3.2): 54 táxons × ~236 kb deixariam o `ParsimonyTreeConstructor` puro-Python dominar o tempo total. `raxml_threads: 8`/`iqtree_threads: 16` seguem o mesmo raciocínio de §3.2 — porte de dado quase idêntico a VARV-49 (54 × ~236 kb contra 49 × ~236 kb), então o mesmo orçamento de threads deve se comportar igual.

**Esperado:** 54 sequências (já deduplicadas na origem — D23 ainda não conferido neste conjunto especificamente; se `deduplicar_por_sequencia` descartar alguma, o log dirá quantas sobram). 10 árvores (2 alinhadores × {nj, upgma, fasttree, iqtree, raxml}).

```bash
cd ../BioComp_UFF && python ../docs/science/scripts/oraculo_rf_dendropy.py projects/Variola_VARV52_reexec_20260903
cd .. && python docs/science/scripts/audit_variola.py --secao 3 --secao 5
```

**Depois de validado**, edite `docs/science/scripts/resultado_principal.py`: troque `Conjunto("VARV-52", None, bloqueio=...)` por `Conjunto("VARV-52", "projects/Variola_VARV52_reexec_20260903")` e rode `make main-result` de novo — é o que fecha a primeira das duas causas do código 2 de DEC-069.

### 3.3 VARV-121 — escala e histórico do workflow

O conjunto mais pesado de *Variola*: `metadata.json` chegava a **3,2 GB** no artefato pré-M1. `data/workflow_dataAcquisition_li_et_al_2007_replication-RetMax200/` já tem **125 registros brutos** (confirme com `grep -c '^>'`; a contagem pós-dedup deve ficar perto de 121 — é o que o log de `deduplicar_por_sequencia` vai declarar).

```bash
cd BioComp_UFF
cat > /tmp/varv121_reexec.json <<'JSON'
{
  "log_file": true,
  "project_name": "Variola_VARV121_reexec_20260901",
  "output_log": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Variola_VARV121_reexec_20260901/out",
  "tree_config": {
    "mode": "advanced",
    "ignore_mode": ["mrbayes", "parsimony"],
    "aligners": ["mafft", "mafft_iterative"],
    "align_method": "mafft",
    "num_threads": 16,
    "random_seed": 12345,
    "raxml_threads": 8,
    "iqtree_threads": 16,
    "input_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/data/workflow_dataAcquisition_li_et_al_2007_replication-RetMax200",
    "output_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Variola_VARV121_reexec_20260901/out",
    "output_format": "nexus"
  },
  "subtree_config": {
    "construct_tree_method": "distance",
    "input_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Variola_VARV121_reexec_20260901/out/Trees",
    "output_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Variola_VARV121_reexec_20260901/out",
    "input_format": "nexus",
    "output_format": "nexus",
    "resume_infos": true,
    "save_metadata": true,
    "subtree_miner": true,
    "subtree_miner_configs": {
      "mode": "OFST",
      "save_fpmax": true,
      "output_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Variola_VARV121_reexec_20260901/out",
      "support_fpmax": "auto"
    }
  }
}
JSON
python workflow.py -p /tmp/varv121_reexec.json
```

Mesmos threads de VARV-49 — o comprimento do alinhamento (o que pesa no RAxML-NG, [`11-handoff §4.4`](11-handoff-maquina-de-validacao.md#44-limites-de-recurso-já-conhecidos)) é da mesma ordem de grandeza (~280 kb contra ~236 kb); o que muda é o número de táxons, que MAFFT absorve melhor. **Confira `df -h` e `free -h` antes de rodar** — este é o conjunto que mais pressiona disco (metadados) e memória.

```bash
cd ../Backend && python scripts/conferir_correcoes_m1.py Variola_VARV121_reexec_20260901 Variola_Yu_li_2007_200seq
cd ../BioComp_UFF && python ../docs/science/scripts/oraculo_rf_dendropy.py projects/Variola_VARV121_reexec_20260901
```

### 3.4 ZIKV-480 — escala em número de táxons

478 sequências (`data/Zika479ONE/dataset_final.fasta`, confirmado nesta máquina), alinhamento **curto** (~10,8 kb, mesma região do Zika-21) — é o oposto do perfil de VARV-121: muitos táxons, poucos sítios. O `metadata.json` do artefato pré-M1 tinha 1,1 GB.

```bash
cd BioComp_UFF
cat > /tmp/zikv480_reexec.json <<'JSON'
{
  "log_file": true,
  "project_name": "Zika_ZIKV480_reexec_20260901",
  "output_log": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Zika_ZIKV480_reexec_20260901/out",
  "tree_config": {
    "mode": "advanced",
    "ignore_mode": ["mrbayes", "parsimony"],
    "aligners": ["mafft", "mafft_iterative"],
    "align_method": "mafft",
    "num_threads": 16,
    "random_seed": 12345,
    "raxml_threads": 4,
    "iqtree_threads": 16,
    "input_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/data/Zika479ONE",
    "output_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Zika_ZIKV480_reexec_20260901/out",
    "output_format": "nexus"
  },
  "subtree_config": {
    "construct_tree_method": "distance",
    "input_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Zika_ZIKV480_reexec_20260901/out/Trees",
    "output_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Zika_ZIKV480_reexec_20260901/out",
    "input_format": "nexus",
    "output_format": "nexus",
    "resume_infos": true,
    "save_metadata": true,
    "subtree_miner": true,
    "subtree_miner_configs": {
      "mode": "OFST",
      "save_fpmax": true,
      "output_path": "/home/geomesh/Documentos/GIT/PhyloTreeMiner/BioComp_UFF/projects/Zika_ZIKV480_reexec_20260901/out",
      "support_fpmax": "auto"
    }
  }
}
JSON
python workflow.py -p /tmp/zikv480_reexec.json
```

`raxml_threads: 4`, pela mesma razão de §3.0 — alinhamento curto, poucos padrões. `ignore_mode` inclui `"parsimony"` aqui (corrigido em 2026-09-01 — a versão anterior deste guia deixava `parsimony` **fora** de `ignore_mode`, uma inconsistência com o próprio texto desta seção, que já alertava contra isso sem que a config seguisse o alerta): 478 táxons no `ParsimonyTreeConstructor` puro-Python é exatamente o cenário que [`11-handoff §4.3`](11-handoff-maquina-de-validacao.md#43-teste-de-estresse--o-que-ainda-não-se-sabe) lista como "rodar em VARV-6 e ZIKV-6 **antes** de qualquer conjunto grande" — o que não foi feito, e a medição de 2026-08-25 já registrou parcimônia como **25× mais lenta** que qualquer método de ML ([M7.5](10-marcos-e-metas.md#8-m7--heurísticas-de-inferência-corretas-parametrizáveis-e-escaláveis), `DM-11`). Rodar em 478 táxons sem essa medição de viabilidade primeiro arriscava dominar o tempo total do experimento sem necessidade — a mesma razão que já excluiu `parsimony` de VARV-49 e VARV-121 (§3.2, §3.3). **Esperado:** 10 árvores (2 alinhadores × {nj, upgma, fasttree, iqtree, raxml}), não 12.

⚠️ Clustal Omega **não** está em `aligners` (nunca esteve, desde DEC-050) — mas se algum dia for testado à parte neste conjunto, lembre que **é aqui** que ele historicamente foi morto pelo OOM killer (código 137, [D1](../science/02-defeitos-que-alteram-resultado.md#d1)), não em *Variola* — regime diferente (muitos táxons curtos, não poucos táxons longos).

```bash
cd ../Backend && python scripts/conferir_correcoes_m1.py Zika_ZIKV480_reexec_20260901 Zika_Virus_Singapura_Large_480seq
cd ../BioComp_UFF && python ../docs/science/scripts/oraculo_rf_dendropy.py projects/Zika_ZIKV480_reexec_20260901
```

## 4. Fechando M2 — ✅ fechado em 2026-09-02

```bash
cd BioComp_UFF
python ../docs/science/scripts/reference_check.py --trees projects/Variola_VARV49_reexec_20260901/out/Trees
```

Três códigos de saída ([`reference_check.py`](../science/scripts/reference_check.py), M2.7): `0` = invariante válido e M completo; `2` = invariante válido, M incompleto (esperado enquanto M2 está aberto); `1` = invariante violado, **sempre falha** — pare e traga para o ledger.

✅ **Fechado.** `docs/science/scripts/gerar_dataset_referencia.py` já tinha `target_M.aligners = ["mafft", "mafft_iterative"]` desde DEC-050 — só `PROJETO` apontava para o artefato anterior à reexecução. Corrigido para `projects/Variola_VARV49_reexec_20260901` (D25 corrigido, oráculo-validado em DEC-062), e regravado:

```bash
make reference-dataset      # regenerou Backend/tests/data/reference/ a partir do VARV-49 reexecutado
make reference-check        # código 0 — 10 de 10 pipelines, 3 de 3 invariantes
```

Achado no caminho: o gerador nunca limpava `trees/` antes de copiar — os 4 `.nexus` do braço `clustalo` do artefato contaminado original sobreviviam, ignorados pelo portão mas nunca removidos. Corrigido (`shutil.rmtree` antes de recriar). Parecer completo e diff de resultado em [DEC-063](07-log-de-execucao.md#dec-063--2026-09-02--m2-fecha--expectedjson-regenerado-a-partir-da-reexecução-limpa-portão-em-código-0).

## 5. O que registrar depois de cada reexecução

No [log de execução](07-log-de-execucao.md), como manda o item 7 de [`04-rigor-cientifico §3`](04-rigor-cientifico.md#3-protocolo-de-mudança-na-zona-sagrada) ("registrar o parecer, mesmo quando Δ = 0"): `run_id` (do manifesto), ambiente (`nproc`/`free -h` no momento), o que `conferir_correcoes_m1.py` e o oráculo devolveram, e **quanto tempo cada método levou** — é o insumo de [E7](../science/04-agenda-de-pesquisa.md).
