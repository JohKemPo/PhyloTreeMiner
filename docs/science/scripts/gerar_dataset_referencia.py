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

#: Reexecução limpa de 2026-09-01, com D25 corrigido (stability.py reconhece
#: mafft_iterative) e M1.3 confirmado contra o oráculo dendropy (45 pares, 0
#: divergências). Antes de DEC-062 este apontava para o artefato anterior à
#: reexecução (Variola_Yu_li_2007), que nunca teve os dois braços do MAFFT.
PROJETO = "projects/Variola_VARV49_reexec_20260901"
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
#: de validação, com a biblioteca completa.
#:
#: **Revisto em 2026-08-27 (DEC-050).** A versão anterior dizia que o MAFFT era
#: o único alinhador viável e que, portanto, **o fator alinhador não existia no
#: VARV-49**. As duas afirmações caíram:
#:
#: - o motivo declarado para excluir Clustal e MUSCLE estava **errado no
#:   mecanismo** — ver `aligners_excluded` abaixo;
#: - e o fator passou a existir, porque ele deixou de exigir **duas
#:   ferramentas**: são duas **estratégias do MAFFT**, progressiva contra
#:   iterativa, sobre o mesmo binário. Onde só o MAFFT roda, o fator continua
#:   existindo.
M_ALVO = {
    "aligners": ["mafft", "mafft_iterative"],
    "inference": ["fasttree", "iqtree", "raxml", "nj_distance", "upgma_distance"],
    "aligners_excluded": {
        "clustalo": ("Não termina: **medido em 2026-08-27** sobre 52 sequências de até "
                     "228 kb, passou de 1 h sem concluir, com pico de RSS de apenas "
                     "220 MB. É limite de **tempo**, não de memória — a afirmação "
                     "anterior, de que era morto pelo OOM killer neste porte, foi "
                     "retratada em DEC-050. O código 137 que a sustentava veio do "
                     "Zika479, 478 sequências curtas, que é outro regime."),
        "muscle": ("**Recusa por projeto**: o MUSCLE 5.3 responde `Too long, not "
                   "appropriate for global alignment` em 0,06 s. A medição anterior "
                   "(19,4 GB e OOM) era do **3.8.1551** e não transferia para o 5 — "
                   "mesmo veredito, mecanismo diferente."),
    },
    "note": ("O fator alinhador **existe** no VARV-49: são duas estratégias do MAFFT, "
             "`--maxiterate 0` contra `--maxiterate 1000`, sobre o mesmo binário e a "
             "mesma versão. O que muda é o algoritmo, que é o contraste que E4 quer — "
             "e é o único par que roda tanto aqui quanto no Zika-21. "
             "O invariante do baseline continua sendo sobre **topologia**: os clados de "
             "Li et al. têm de sobreviver à troca de método e à troca de estratégia de "
             "alinhamento."),
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

    # Limpa antes de copiar: sem isto, árvores de uma fonte anterior (ex.: o
    # braço clustalo do artefato contaminado que precedeu D6/M2.2) sobrevivem
    # indefinidamente em `trees/`, mesmo quando `present_pipelines` já não as
    # lista — silenciosamente ignoradas pelo portão, mas nunca removidas.
    shutil.rmtree(os.path.join(DESTINO, "trees"), ignore_errors=True)
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

As árvores aqui vêm da reexecução de 2026-09-01 (`Variola_VARV49_reexec_20260901`,
com [D25](../../../../docs/science/02-defeitos-que-alteram-resultado.md#d25) corrigido)
e têm **{len(tree_set.trees)} pipelines efetivos**. O M alvo declarado é de
{len(M_ALVO["aligners"])} alinhadores × {len(M_ALVO["inference"])} métodos — falta só
o braço `raxml` de `mafft_iterative` completar a biblioteca (`mafft_raxml` já presente).

Até lá, `make reference-check` devolve **código 2**: invariante válido, M incompleto.

As divergências de versão entre máquina de desenvolvimento e de validação (FastTree,
RAxML-NG) foram investigadas e resolvidas — ver [DEC-043](../../../../docs/automation/07-log-de-execucao.md)
e [DEC-044](../../../../docs/automation/07-log-de-execucao.md). As versões usadas nesta
reexecução são as pinadas em `environment.yml`.

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
