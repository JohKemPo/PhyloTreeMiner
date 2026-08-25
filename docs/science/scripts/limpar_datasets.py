#!/usr/bin/env python
"""
Cria variantes limpas dos conjuntos contaminados — D6, insumo de M2.6.

**Não apaga nada.** O conjunto original permanece intacto: ele é o histórico de
como o workflow evoluiu e serve como subamostra do conjunto completo para teste.
A limpeza cria um conjunto novo, ao lado, sufixado com `-clean`, acompanhado de
um `PROVENIENCIA.md` que diz o que saiu, por quê e como reproduzir.

Uso:

    cd BioComp_UFF && python ../docs/science/scripts/limpar_datasets.py --dry-run
    cd BioComp_UFF && python ../docs/science/scripts/limpar_datasets.py
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.abspath("."))

from workflow.utils.dataset_cleaning import clean_dataset
from workflow.utils.taxonomy import ORTHOPOXVIRUS, audit_genbank

#: rótulo, diretório do conjunto, projeto de onde vem o `raw_data_sequences.gb`
CONJUNTOS = [
    ("VARV-6", "SMALL_li_2007_replication-RetMax200-ITRs",
     "Variola_Yu_li_2007_noITRs_6seqs"),
    ("VARV-52", "workflow_dataAcquisition_li_et_al_2007_replication-RetMax200-ITRs",
     "test_variola_noITRs_57_Complete"),
    ("VARV-121", "workflow_dataAcquisition_li_et_al_2007_replication-RetMax200",
     "Variola_Yu_li_2007_200seq"),
    ("VARV-49", "replication-RetMax200-ITRs", "Variola_Yu_li_2007"),
]

COMANDO = "cd BioComp_UFF && python ../docs/science/scripts/limpar_datasets.py"


def processar(rotulo, diretorio, projeto, dry_run):
    origem_dir = os.path.join("data", diretorio)
    origem = os.path.join(origem_dir, "dataset_final.fasta")
    genbank = os.path.join("projects", projeto, "out", "outputs", "raw_data_sequences.gb")

    if not os.path.exists(origem):
        print(f"{rotulo:9s} FASTA ausente: {origem}")
        return 0
    if not os.path.exists(genbank):
        print(f"{rotulo:9s} sem GenBank de referência ({projeto}); nada a decidir")
        return 0

    auditoria = audit_genbank(genbank, ORTHOPOXVIRUS)
    if auditoria.clean:
        print(f"{rotulo:9s} já limpo ({len(auditoria.within)} táxons em {ORTHOPOXVIRUS.name}) — nada a fazer")
        return 0

    destino_dir = origem_dir + "-clean"
    destino = os.path.join(destino_dir, "dataset_final.fasta")

    if dry_run:
        print(f"{rotulo:9s} criaria {destino}")
        for acesso, info in sorted(auditoria.outside.items()):
            print(f"          └─ removeria {acesso} ({info['organism']})")
        return len(auditoria.outside)

    relatorio = clean_dataset(origem, destino, genbank=genbank, taxon=ORTHOPOXVIRUS)

    with open(os.path.join(destino_dir, "PROVENIENCIA.md"), "w", encoding="utf-8") as handle:
        handle.write(relatorio.as_markdown(COMANDO))

    print(f"{rotulo:9s} {relatorio.total_before} -> {len(relatorio.kept) + len(relatorio.unresolved)} "
          f"sequências   ({len(relatorio.removed)} removidas)   {destino}")
    for acesso, motivo in sorted(relatorio.removed.items()):
        print(f"          └─ {acesso}: {motivo}")
    if relatorio.unresolved:
        print(f"          └─ mantidas sem decisão: {', '.join(relatorio.unresolved)}")
    return len(relatorio.removed)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true",
                        help="mostra o que faria, sem escrever nada")
    args = parser.parse_args(argv)

    total = sum(processar(*c, args.dry_run) for c in CONJUNTOS)
    print(f"\nTOTAL de sequências {'a remover' if args.dry_run else 'removidas'}: {total}")
    print("Os conjuntos de origem não foram alterados.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
