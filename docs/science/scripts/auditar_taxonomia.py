#!/usr/bin/env python
"""
Auditoria taxonômica dos conjuntos em disco — D6 / M2.2.

Confere a linhagem de cada registro do `raw_data_sequences.gb` contra o clado
declarado. **Offline**: a linhagem vem de `annotations['taxonomy']`, que o
próprio registro GenBank carrega, então funciona nos conjuntos que já existem
sem nova consulta ao NCBI.

O clado é **do experimento**, não do projeto. Rodar os conjuntos de Zika contra
*Orthopoxvirus* reprova os 20 táxons — corretamente.

Uso:

    cd BioComp_UFF && python ../docs/science/scripts/auditar_taxonomia.py
    cd BioComp_UFF && python ../docs/science/scripts/auditar_taxonomia.py --taxon orthoflavivirus Zika_21seq_validacao

Sai com código 1 se algum conjunto tiver registro fora do clado declarado.
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.abspath("."))

from workflow.utils.taxonomy import (ORTHOFLAVIVIRUS, ORTHOPOXVIRUS,
                                     TaxonFilter, audit_genbank)

CLADOS = {
    "orthopoxvirus": ORTHOPOXVIRUS,
    "orthoflavivirus": ORTHOFLAVIVIRUS,
}

#: Conjuntos de *Variola* citados pelos documentos científicos, com o clado que
#: cada um deveria respeitar.
PADRAO = [
    ("VARV-49", "Variola_Yu_li_2007", ORTHOPOXVIRUS),
    ("VARV-52", "test_variola_noITRs_57_Complete", ORTHOPOXVIRUS),
    ("VARV-121", "Variola_Yu_li_2007_200seq", ORTHOPOXVIRUS),
    ("VARV-6", "Variola_Yu_li_2007_noITRs_6seqs", ORTHOPOXVIRUS),
    ("ZIKV-21", "Zika_21seq_validacao", ORTHOFLAVIVIRUS),
]


def auditar(rotulo, projeto, taxon):
    caminho = os.path.join("projects", projeto, "out", "outputs", "raw_data_sequences.gb")
    if not os.path.exists(caminho):
        print(f"{rotulo:10s} sem raw_data_sequences.gb")
        return 0

    a = audit_genbank(caminho, taxon)
    marca = "limpo" if a.clean else "CONTAMINADO"
    print(f"{rotulo:10s} {taxon.name:16s} total={a.total:4d}  dentro={len(a.within):4d}  "
          f"fora={len(a.outside):2d}  sem linhagem={len(a.unknown):2d}   {marca}")
    for acesso, info in sorted(a.outside.items()):
        linhagem = " > ".join(info["lineage"][-2:]) if info["lineage"] else "?"
        print(f"           └─ {acesso:12s} {info['organism'][:34]:36s} {linhagem}")
    return len(a.outside)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("projetos", nargs="*", help="nomes de projeto; vazio usa a lista padrão")
    parser.add_argument("--taxon", choices=sorted(CLADOS), default="orthopoxvirus",
                        help="clado exigido para os projetos passados na linha de comando")
    parser.add_argument("--taxid", help="taxid arbitrário, no formato txidNNNNN")
    parser.add_argument("--nome", help="nome do clado na linhagem, quando se usa --taxid")
    args = parser.parse_args(argv)

    if args.projetos:
        if args.taxid:
            if not args.nome:
                parser.error("--taxid exige --nome (o nome como aparece na linhagem)")
            taxon = TaxonFilter(taxid=args.taxid, name=args.nome)
        else:
            taxon = CLADOS[args.taxon]
        alvos = [(p, p, taxon) for p in args.projetos]
    else:
        alvos = PADRAO

    fora = sum(auditar(*alvo) for alvo in alvos)
    print(f"\nTOTAL fora do clado declarado: {fora}")
    return 1 if fora else 0


if __name__ == "__main__":
    sys.exit(main())
