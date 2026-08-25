#!/usr/bin/env python
"""
Oráculo externo da distância Robinson-Foulds (D3, portão de M1.3).

`03-metricas §3` exige que a RF do projeto seja conferida contra uma
implementação independente. Este script calcula a RF **não enraizada** de todos
os pares de árvores de um experimento com `dendropy.calculate.treecompare` e a
compara com a que `StabilityAnalyzer.rf_matrix` produz. Nenhuma linha do
pipeline participa do lado do oráculo.

Duas armadilhas que o script trata explicitamente, e que qualquer conferência
destes arquivos vai encontrar:

1. **D13** — o bloco `TaxLabels` de IQ-TREE e RAxML vem truncado em 10
   caracteres e diverge do dos demais arquivos. Ler todos num namespace
   compartilhado faz o dendropy abortar. Cada arquivo é lido no próprio
   namespace, os rótulos são normalizados, e só então tudo é reunido.
2. **Enraizamento** — as árvores são lidas com `rooting='force-unrooted'`, que é
   o que torna a comparação uma diferença de bipartições e não de clados.

Uso:

    cd BioComp_UFF && python ../docs/science/scripts/oraculo_rf_dendropy.py
    cd BioComp_UFF && python ../docs/science/scripts/oraculo_rf_dendropy.py projects/meu_projeto

Sai com código 1 se produção e oráculo divergirem em qualquer par.
"""

import glob
import itertools
import os
import re
import sys

sys.path.insert(0, os.path.abspath("."))

import dendropy
from dendropy.calculate import treecompare

from workflow.stability.stability import PipelineLabel, StabilityAnalyzer, TreeSet

EXPERIMENTOS = [
    ("VARV-6", "projects/Variola_Yu_li_2007_noITRs_6seqs"),
    ("VARV-49", "projects/Variola_Yu_li_2007"),
    ("VARV-52", "projects/test_variola_noITRs_57_Complete"),
    ("VARV-121", "projects/Variola_Yu_li_2007_200seq"),
]

_VERSAO = re.compile(r"\.\d*$")


def _normalizar(rotulo):
    return _VERSAO.sub("", rotulo.strip().strip("'\""))


def _arvores_do_oraculo(diretorio, pipelines):
    """Lê cada Nexus isolado, normaliza rótulos e reúne num namespace comum."""
    newicks = {}
    for caminho in sorted(glob.glob(os.path.join(diretorio, "*.nexus"))):
        nome = PipelineLabel.parse(caminho, prefix="tree_dataset_final_").name
        if nome not in pipelines or nome in newicks:
            continue
        arvore = dendropy.Tree.get(path=caminho, schema="nexus",
                                   rooting="force-unrooted", preserve_underscores=True)
        for taxon in arvore.taxon_namespace:
            taxon.label = _normalizar(taxon.label)
        newicks[nome] = arvore.as_string(schema="newick", suppress_rooting=True)

    namespace = dendropy.TaxonNamespace()
    arvores = {}
    for nome, texto in newicks.items():
        arvore = dendropy.Tree.get(data=texto, schema="newick", taxon_namespace=namespace,
                                   rooting="force-unrooted", preserve_underscores=True)
        arvore.encode_bipartitions()
        arvores[nome] = arvore
    return arvores


def conferir(rotulo, projeto):
    diretorio = os.path.join(projeto, "out", "Trees")
    if not os.path.isdir(diretorio):
        print(f"{rotulo}: {diretorio} ausente")
        return 0, 0

    tree_set = TreeSet.from_directory(diretorio)
    producao = StabilityAnalyzer(tree_set).rf_matrix(normalized=False)
    arvores = _arvores_do_oraculo(diretorio, tree_set.trees)

    divergencias = pares = 0
    for a, b in itertools.combinations(sorted(arvores), 2):
        pares += 1
        esperado = treecompare.symmetric_difference(arvores[a], arvores[b])
        obtido = producao[a][b]
        if obtido != esperado:
            divergencias += 1
            print(f"   DIVERGE {a} x {b}: produção={obtido} dendropy={esperado}")

    print(f"{rotulo:10s} n={tree_set.n_taxa:4d}  árvores={len(arvores):2d}  "
          f"pares={pares:3d}  divergências={divergencias}")
    return pares, divergencias


def main(argv):
    alvos = [(os.path.basename(p.rstrip("/")), p) for p in argv] or EXPERIMENTOS
    total_pares = total_div = 0
    for rotulo, projeto in alvos:
        pares, divergencias = conferir(rotulo, projeto)
        total_pares += pares
        total_div += divergencias
    print(f"\nTOTAL: {total_pares} pares, {total_div} divergências")
    return 1 if total_div else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
