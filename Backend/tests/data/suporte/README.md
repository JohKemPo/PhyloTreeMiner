# Fixtures de suporte de ramo (M3.1)

## `tree_dataset_final_mafft_raxml.nexus`

**Sintética, e é preciso saber disso.** Nenhum artefato em
`BioComp_UFF/projects/**` traz suporte FBP: as reexecuções validadas
(`Variola_VARV49_reexec_20260901`, `Variola_VARV121_reexec_20260901`,
DEC-062/063) são de **2026-09-01**, e `--all --bs-trees 1000` só entrou no
RAxML-NG em **2026-09-02** (M3.2/DEC-064). Varredura confirmando:

```
for f in $(find projects -name "*raxml*.nexus"); do
  grep -qE '\)[0-9]+\.[0-9]+:' "$f" && echo "COM SUPORTE: $f"; done
  → nenhuma linha
```

Sem um artefato real de FBP não há como testar que FBP e UFBoot não se
confundem no payload — que é o achado que M3 precisa preservar. Esta árvore
foi então produzida pelo **RAxML-NG de verdade**, com a mesma chamada do
pipeline, sobre um alinhamento sintético de 8 táxons:

```
raxml-ng --all --msa aln.fasta --model GTR+G --threads 1 --workers 1 \
         --seed 12345 --tree rand{10} --bs-trees 200 --prefix fbp --redo
  → "Best ML tree with Felsenstein bootstrap (FBP) support values saved to: fbp.raxml.support"
```

e convertida a Nexus pelo mesmo mecanismo do `builder.py`
(`Phylo.read(..., 'newick')` → `Phylo.write(..., 'nexus')`). RAxML-NG v2.0.2,
ambiente conda `Phylotreeminer`.

**O que ela é:** um artefato genuíno do inferidor, com valores de FBP genuínos.
**O que ela não é:** um resultado biológico — o alinhamento é inventado, os
rótulos de acesso são emprestados de VARV-49 só para exercitar a normalização
de D13. Nenhum número daqui vai para o artigo.

`--bs-trees 200` (e não 1000) porque o que o teste precisa é da *presença e da
escala* do FBP, não da precisão do valor; 1000 réplicas sobre um alinhamento de
brinquedo custariam tempo de CI sem mudar o que se afirma.

## As demais árvores

Vêm dos projetos reais em `BioComp_UFF/projects/Variola_VARV49_reexec_20260901/out/Trees/`
e são lidas de lá, não copiadas para cá.
