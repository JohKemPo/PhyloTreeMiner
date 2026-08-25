#!/usr/bin/env python
"""
Gera o dataset de referência versionado — M2.6.

Publica em `Backend/tests/data/reference/` o que o portão científico precisa
para rodar em qualquer máquina, em segundos:

    README.md          proveniência: de onde veio, com que ferramentas, e o que falta
    accessions.txt     os 49 acessos, com a classificação de cada um
    expected.json      o invariante declarado, e o M alvo
    trees/*.nexus      as árvores de referência (dezenas de KB)
    MANIFEST.sha256    hash de tudo acima

**O conjunto de referência é o VARV-49** — o único taxonomicamente limpo
(49/49 *Orthopoxvirus*) e o único com delineamento defensável: 45 VARV contra
CMLV/CPXV/TATV, que é a replicação de Li *et al.* (2007).

Uso:

    cd BioComp_UFF && python ../docs/science/scripts/gerar_dataset_referencia.py
"""

import hashlib
import json
import os
import shutil
import sys

sys.path.insert(0, os.path.abspath("."))

from workflow.stability.case_study import build_classifier
from workflow.stability.stability import StabilityAnalyzer, TreeSet

PROJETO = "projects/Variola_Yu_li_2007"
DESTINO = "../Backend/tests/data/reference"

#: Os seis táxons do clado P-II — África Ocidental mais o isolado brasileiro de
#: 1966. A assinatura de que o *alastrim minor* sul-americano descende da
#: varíola oeste-africana. Ver `01-revisao-variola §4.3`.
CLADO_P2 = [
    "DQ441416",  # Benin, Dahomey 1968
    "DQ441419",  # Brasil 1966 (São Paulo)
    "DQ441426",  # Guiné 1969
    "DQ441434",  # Níger 1969 (importação da Nigéria)
    "DQ441437",  # Serra Leoa 1969
    "DQ441447",  # Reino Unido 1952 (Butler)
]

#: Alinhadores e métodos que o portão **completo** exige. Hoje o artefato tem 4
#: pipelines efetivos; o M alvo só é alcançável depois da reexecução na máquina
#: de validação, com a biblioteca completa. Decisão do usuário, 2026-08-25.
M_ALVO = {
    "aligners": ["mafft"],
    "inference": ["fasttree", "iqtree", "raxml", "nj_distance", "upgma_distance"],
    "aligners_excluded": {
        "clustalo": ("Inviável neste conjunto: morto pelo OOM killer em sequências longas. "
                     "Decisão do usuário em 2026-08-25: fora de M."),
        "muscle": ("Inviável neste conjunto: **medido em 2026-08-25**, consumiu 19,4 GB e "
                   "foi morto pelo OOM killer em 52 sequências de até 228 kb."),
    },
    "note": ("Para o VARV-49, **MAFFT é o único alinhador viável** — os outros dois foram "
             "medidos e estouram a memória em genomas de ~230 kb. Logo, o fator alinhador "
             "não existe neste conjunto, e o invariante do baseline sempre foi sobre os "
             "métodos de inferência, nunca sobre alinhadores: os 4/4 de Li et al. são "
             "FastTree, IQ-TREE, NJ e UPGMA, todos sobre o mesmo alinhamento. "
             "O fator alinhador pertence a um conjunto de sequências curtas — o Zika-21, "
             "onde os três rodam (medido: 4,9 s / 34,5 s / 64,0 s)."),
}


def sha256(caminho):
    d = hashlib.sha256()
    with open(caminho, "rb") as f:
        for bloco in iter(lambda: f.read(1 << 20), b""):
            d.update(bloco)
    return d.hexdigest()


def main():
    diretorio_arvores = os.path.join(PROJETO, "out", "Trees")
    if not os.path.isdir(diretorio_arvores):
        print(f"Projeto de referência ausente: {diretorio_arvores}")
        return 1

    tree_set = TreeSet.from_directory(diretorio_arvores)
    alinhamento = os.path.join(PROJETO, "out", "tmp", "dataset_final_mafft.aln")
    classificar = build_classifier(alinhamento if os.path.exists(alinhamento) else None)

    taxa = sorted(tree_set.taxa)
    externo = sorted(t for t in taxa if classificar(t) != "VARV")
    varv = sorted(t for t in taxa if classificar(t) == "VARV")

    analisador = StabilityAnalyzer(tree_set)
    universais = {frozenset(r.taxa) for r in analisador.consensus_clades(1.0)}

    p2 = frozenset(CLADO_P2)
    ext = frozenset(externo)
    aninhada = p2 | ext

    os.makedirs(os.path.join(DESTINO, "trees"), exist_ok=True)

    # ------------------------------------------------------------------ #
    # árvores de referência
    # ------------------------------------------------------------------ #
    copiadas = []
    for nome in sorted(os.listdir(diretorio_arvores)):
        if nome.endswith(".nexus"):
            shutil.copy2(os.path.join(diretorio_arvores, nome),
                         os.path.join(DESTINO, "trees", nome))
            copiadas.append(nome)

    # ------------------------------------------------------------------ #
    # accessions.txt
    # ------------------------------------------------------------------ #
    with open(os.path.join(DESTINO, "accessions.txt"), "w", encoding="utf-8") as f:
        f.write("# Dataset de referência do PhyloTreeMiner — VARV-49\n")
        f.write("# acesso\tgrupo\n")
        for t in taxa:
            grupo = "outgroup" if t in ext else ("P-II" if t in p2 else "VARV")
            f.write(f"{t}\t{grupo}\n")

    # ------------------------------------------------------------------ #
    # expected.json — o invariante
    # ------------------------------------------------------------------ #
    esperado = {
        "dataset": "VARV-49",
        "source_project": PROJETO,
        "n_taxa": len(taxa),
        "composition": {"VARV": len(varv), "outgroup": len(ext)},
        "outgroup": externo,
        "tolerance": {
            "mode": "invariant_only",
            "rationale": (
                "O portão afirma o invariante biológico e NÃO a topologia completa. "
                "D17 mediu RF = 8 entre duas execuções com a mesma semente, variando só "
                "a paralelização: exigir topologia idêntica reprovaria por troca de máquina, "
                "que não é mudança de biologia. Os hashes de topologia são registrados como "
                "impressão digital do ambiente — mudança neles é sinal para investigar, "
                "não reprovação."
            ),
        },
        "invariants": [
            {
                "id": "monofilia_varv",
                "description": (
                    "Nenhum não-VARV cai dentro de VARV. Sob semântica de bipartição, "
                    "isto é a MESMA afirmação que 'o grupo externo é monofilético': a "
                    "bipartição é não ordenada, e o lado menor — o representante canônico "
                    "— é o grupo externo de 4 táxons."
                ),
                "bipartition": externo,
                "required_support": "all",
            },
            {
                "id": "clado_p2",
                "description": (
                    "Clado P-II de Esposito et al. (2006) e Li et al. (2007): África "
                    "Ocidental mais o isolado brasileiro de 1966 (São Paulo). É a "
                    "assinatura de que o alastrim minor sul-americano descende da varíola "
                    "oeste-africana."
                ),
                "bipartition": sorted(CLADO_P2),
                "required_support": "all",
            },
            {
                "id": "p2_basal",
                "description": (
                    "Bipartição aninhada de 10 táxons — os 4 do grupo externo mais os 6 de "
                    "P-II, contra os outros 39 VARV. Posiciona P-II como linhagem basal de "
                    "VARV, que é a topologia publicada."
                ),
                "bipartition": sorted(aninhada),
                "required_support": "all",
            },
        ],
        "target_M": M_ALVO,
        "target_M_size": len(M_ALVO["aligners"]) * len(M_ALVO["inference"]),
        "aligner_factor_present": len(M_ALVO["aligners"]) > 1,
        "present_pipelines": sorted(tree_set.trees),
        "note_on_M": (
            "O M alvo exige a biblioteca completa e só é alcançável depois da reexecução "
            "na máquina de validação. Decisão do usuário em 2026-08-25. Até lá, o portão "
            "rápido confere o invariante sobre os pipelines presentes e devolve código 2 "
            "— invariante válido, M incompleto."
        ),
    }
    with open(os.path.join(DESTINO, "expected.json"), "w", encoding="utf-8") as f:
        json.dump(esperado, f, indent=2, ensure_ascii=False, sort_keys=True)
        f.write("\n")

    # ------------------------------------------------------------------ #
    # README de proveniência
    # ------------------------------------------------------------------ #
    presentes = {i: (i in universais) for i, nome in
                 [(ext, "monofilia_varv"), (p2, "clado_p2"), (aninhada, "p2_basal")]}
    todas_ok = all(presentes.values())

    readme = f"""# Dataset de referência — VARV-49

Replicação de **Li Y, Carroll DS, Gardner SN, Walsh MC, Vitalis EA, Damon IK.
*On the origin of smallpox: correlating variola phylogenics with historical
smallpox records.* PNAS 2007;104(40):15787-92.**
[doi:10.1073/pnas.0609268104](https://doi.org/10.1073/pnas.0609268104) · PMID 17901212

**Gerado por** `docs/science/scripts/gerar_dataset_referencia.py`.
**Não editar à mão** — regenerar.

## Por que este conjunto

Dos quatro experimentos de *Variola* do projeto, o VARV-49 é o único com
delineamento defensável **e** o único taxonomicamente limpo:

| Conjunto | Composição | Fora de *Orthopoxvirus* |
|---|---|---|
| **VARV-49** | 45 VARV + 2 CMLV + 1 CPXV + 1 TATV | **0 de 49** |
| VARV-52 | 48 VARV + externo | 1 |
| VARV-121 | 77 VARV + 23 MPXV + … | 4 |
| VARV-6 | 4 VARV + externo | 1 de 6 |

Conferido por `docs/science/scripts/auditar_taxonomia.py`.

## O que o portão afirma

Só o **invariante biológico** — não a topologia completa. A razão está em
`expected.json`, campo `tolerance.rationale`: exigir topologia idêntica
reprovaria por troca de máquina, e [D17](../../../../docs/science/02-defeitos-que-alteram-resultado.md#d17)
mediu RF = 8 entre execuções com a mesma semente variando só a paralelização.

| Invariante | Táxons | Verificado neste artefato |
|---|---:|---|
| Monofilia de VARV | 4 (grupo externo) | {"sim" if presentes[ext] else "NÃO"} |
| Clado P-II | 6 | {"sim" if presentes[p2] else "NÃO"} |
| P-II basal | 10 | {"sim" if presentes[aninhada] else "NÃO"} |

{"Os três invariantes são recuperados por **todos** os pipelines presentes." if todas_ok else "**ATENÇÃO: algum invariante não é universal neste artefato.**"}

## O que ainda falta

As árvores aqui vêm do artefato **anterior à reexecução** e têm **{len(tree_set.trees)}
pipelines efetivos**. O M alvo declarado é de {len(M_ALVO["aligners"])} alinhadores ×
{len(M_ALVO["inference"])} métodos, alcançável só depois de reexecutar na máquina de
validação com a biblioteca completa.

Até lá, `make reference-check` devolve **código 2**: invariante válido, M incompleto.

⚠️ **Divergência de versão a resolver antes da reexecução:** os logs destas
árvores registram FastTree 2.2.0 e RAxML-NG 1.2.2; a máquina de desenvolvimento
tem 2.1.11 e 1.1.0.

## Conferir

```bash
make reference-check          # rápido, sobre estas árvores; roda em qualquer lugar
make reference-check-full     # reexecuta o pipeline; máquina de validação
```
"""
    with open(os.path.join(DESTINO, "README.md"), "w", encoding="utf-8") as f:
        f.write(readme)

    # ------------------------------------------------------------------ #
    # MANIFEST.sha256
    # ------------------------------------------------------------------ #
    linhas = []
    for raiz, _, arquivos in os.walk(DESTINO):
        for nome in sorted(arquivos):
            if nome == "MANIFEST.sha256":
                continue
            caminho = os.path.join(raiz, nome)
            rel = os.path.relpath(caminho, DESTINO)
            linhas.append(f"{sha256(caminho)}  {rel}")
    with open(os.path.join(DESTINO, "MANIFEST.sha256"), "w", encoding="utf-8") as f:
        f.write("\n".join(sorted(linhas)) + "\n")

    print(f"Dataset de referência gerado em {DESTINO}")
    print(f"  {len(taxa)} táxons ({len(varv)} VARV + {len(ext)} grupo externo)")
    print(f"  {len(copiadas)} árvores, {len(tree_set.trees)} pipelines efetivos")
    print(f"  invariantes verificados: {sum(presentes.values())} de 3")
    print(f"  M alvo: {esperado['target_M_size']} pipelines (exige reexecução)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
