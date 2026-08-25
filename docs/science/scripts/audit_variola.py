"""
Auditoria e reanálise dos experimentos de Variola do PhyloTreeMiner.

Reproduz **todos** os números citados em `docs/science/`. Não escreve nada
dentro de `BioComp_UFF/projects/**`: é somente leitura sobre os artefatos já
produzidos pelo workflow.

Uso
---
    cd BioComp_UFF
    python ../docs/science/scripts/audit_variola.py            # tudo
    python ../docs/science/scripts/audit_variola.py --secao 3  # só uma seção

Seções
------
1. Identidade dos alinhamentos e das árvores (o braço "clustalo" é espúrio)
2. Composição taxonômica e qualidade do alinhamento
3. Suporte de clado enraizado vs. bipartição não enraizada
4. Padrões maximais exatos sobre o reticulado de pipelines
5. Auditoria da identidade legada de 16 bits e do CSV do FPMax
6. Bootstrap (UFBoot) vs. suporte metodológico
7. Controle Zika: efeito real do alinhador
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import os
import re
import sys
from collections import Counter, defaultdict
from typing import Dict, FrozenSet, List, Optional, Set, Tuple

import pandas as pd
from Bio import Phylo

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))))) + "/BioComp_UFF")

from workflow.stability.case_study import build_classifier
from workflow.stability.stability import (StabilityAnalyzer, TreeSet,
                                          strip_accession_version)

#: Experimentos de Variola: rótulo, diretório do projeto, número de árvores em disco.
VARIOLA = [
    ("VARV-49",   "projects/Variola_Yu_li_2007",                   8),
    ("VARV-52",   "projects/test_variola_noITRs_57_Complete",      9),
    ("VARV-121",  "projects/Variola_Yu_li_2007_200seq",            8),
    ("VARV-6",    "projects/Variola_Yu_li_2007_noITRs_6seqs",     10),
]

#: Experimentos de Zika, usados como controle do fator alinhador.
ZIKA = [
    ("ZIKV-478", "projects/Zika_Virus_Singapura_Large_480seq"),
    ("ZIKV-20",  "projects/Zika_Virus_Singapura_Advanced_21seq"),
    ("ZIKV-11",  "projects/Zika_Virus_Singapura_Medium_11seq"),
]

#: Clado P-II de Li et al. (2007): variola da África Ocidental e da América do Sul.
P2_ACCESSIONS = frozenset({"DQ441416", "DQ441419", "DQ441426",
                           "DQ441434", "DQ441437", "DQ441447"})


# --------------------------------------------------------------------------- #
# Utilidades
# --------------------------------------------------------------------------- #

def canonical_split(taxa, all_taxa: FrozenSet[str]) -> Optional[FrozenSet[str]]:
    """
    Reduz um clado enraizado à sua bipartição não enraizada canônica.

    Um clado de uma árvore não enraizada só é comparável entre pipelines como
    bipartição: a raiz trifurcante que FastTree, IQ-TREE, RAxML e NJ escrevem no
    Newick é uma convenção de escrita, não uma hipótese biológica. Representa-se
    a bipartição pelo seu lado menor (desempate lexicográfico), de modo que dois
    enraizamentos distintos da mesma topologia produzam o mesmo objeto.

    Parameters
    ----------
    taxa : iterable of str
        Terminais descendentes do clado.
    all_taxa : frozenset of str
        Conjunto completo de terminais da árvore.

    Return
    ------
    frozenset of str or None
        Lado menor da bipartição, ou None se o split for trivial.
    """
    side = frozenset(taxa)
    other = all_taxa - side
    if len(side) < 2 or len(other) < 2:
        return None
    return min((side, other), key=lambda s: (len(s), sorted(s)))


def effective_pipelines(tree_set: TreeSet) -> List[str]:
    """
    Devolve os pipelines realmente distintos, descartando o braço "clustalo".

    Nos experimentos de Variola o Clustal Omega nunca executou: as sequências
    (~186 kb) excedem o limite de 20 000 pb de `_isExecutableByClustalO`, e o
    controlador substitui silenciosamente o alinhador por MAFFT mantendo o nome
    de arquivo `*_clustalo_*`. Manter os dois braços duplica o denominador do
    suporte sem acrescentar informação.

    Parameters
    ----------
    tree_set : TreeSet
        Conjunto de árvores carregado de `out/Trees`.

    Return
    ------
    list of str
        Rótulos dos pipelines mantidos, em ordem.
    """
    mafft = sorted(n for n in tree_set.trees if tree_set.labels[n].aligner == "mafft")
    return mafft or sorted(tree_set.trees)


def split_occurrences(analyzer: StabilityAnalyzer, all_taxa: FrozenSet[str],
                      pipelines: List[str]) -> Dict[FrozenSet[str], Set[str]]:
    """
    Mapeia cada bipartição não trivial ao conjunto de pipelines que a recuperam.

    Parameters
    ----------
    analyzer : StabilityAnalyzer
        Analisador já construído sobre o conjunto de árvores.
    all_taxa : frozenset of str
        Conjunto completo de terminais.
    pipelines : list of str
        Pipelines a considerar.

    Return
    ------
    dict
        Bipartição -> conjunto de pipelines.
    """
    occurrences: Dict[FrozenSet[str], Set[str]] = defaultdict(set)
    for name in pipelines:
        for clade in analyzer.clade_sets[name]:
            split = canonical_split(clade, all_taxa)
            if split is not None:
                occurrences[split].add(name)
    return dict(occurrences)


def read_fasta(path: str) -> Dict[str, str]:
    """Lê um FASTA/alinhamento e devolve accession -> sequência."""
    records: Dict[str, str] = {}
    name, buffer = None, []
    with open(path, encoding="utf-8") as handle:
        for line in handle:
            if line.startswith(">"):
                if name:
                    records[name] = "".join(buffer)
                name, buffer = line[1:].split()[0], []
            else:
                buffer.append(line.strip())
    if name:
        records[name] = "".join(buffer)
    return records


def md5(path: str) -> str:
    """Digest MD5 de um arquivo, em hexadecimal."""
    digest = hashlib.md5()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _header(title: str) -> None:
    print("\n" + "=" * 78)
    print(title)
    print("=" * 78)


# --------------------------------------------------------------------------- #
# Seção 1 — o braço "clustalo" é espúrio
# --------------------------------------------------------------------------- #

def secao1_alinhamentos_identicos() -> None:
    """Compara os digests dos alinhamentos e das árvores entre os dois braços."""
    _header("1. O braço 'clustalo' é espúrio (digests idênticos)")
    for label, project, _ in VARIOLA:
        mafft = os.path.join(project, "out", "Align", "dataset_final_mafft.aln")
        clustalo = os.path.join(project, "out", "Align", "dataset_final_clustalo.aln")
        if not (os.path.exists(mafft) and os.path.exists(clustalo)):
            continue
        same = md5(mafft) == md5(clustalo)
        print(f"  {label:10s} alinhamentos {'IDÊNTICOS' if same else 'distintos':10s} "
              f"({os.path.getsize(mafft) / 1e6:.1f} MB)")
        for method in ("fasttree", "iqtree", "nj_distance", "upgma_distance", "raxml"):
            a = os.path.join(project, "out", "Trees", f"tree_dataset_final_mafft_{method}.nexus")
            b = os.path.join(project, "out", "Trees", f"tree_dataset_final_clustalo_{method}.nexus")
            if os.path.exists(a) and os.path.exists(b):
                print(f"             árvore {method:16s} "
                      f"{'IDÊNTICA (byte a byte)' if md5(a) == md5(b) else 'difere'}")

    print("\n  Controle Zika (genomas ~10,6 kb, abaixo do limite do Clustal Omega):")
    for label, project in ZIKA:
        mafft = os.path.join(project, "out", "Align", "dataset_final_mafft.aln")
        clustalo = os.path.join(project, "out", "Align", "dataset_final_clustalo.aln")
        if os.path.exists(mafft) and os.path.exists(clustalo):
            same = md5(mafft) == md5(clustalo)
            print(f"  {label:10s} alinhamentos {'IDÊNTICOS' if same else 'DISTINTOS':10s}")


# --------------------------------------------------------------------------- #
# Seção 2 — composição e qualidade do alinhamento
# --------------------------------------------------------------------------- #

def secao2_composicao() -> None:
    """Tabula composição taxonômica e estatísticas de coluna do alinhamento."""
    _header("2. Composição taxonômica e qualidade do alinhamento")
    for label, project, _ in VARIOLA:
        path = os.path.join(project, "out", "Align", "dataset_final_mafft.aln")
        if not os.path.exists(path):
            continue
        records = read_fasta(path)
        classify = build_classifier(path)
        length = len(next(iter(records.values())))
        n = len(records)
        columns = list(zip(*records.values()))

        gaps = sum(column.count("-") for column in columns)
        constant = informative = singleton = very_gappy = 0
        for column in columns:
            gap = column.count("-")
            if gap / n > 0.5:
                very_gappy += 1
            counts = Counter(base for base in column if base != "-")
            if len(counts) <= 1:
                constant += 1
            elif sum(1 for v in counts.values() if v >= 2) >= 2:
                informative += 1
            else:
                singleton += 1

        composition = Counter(classify(strip_accession_version(k)) for k in records)
        print(f"  {label}  n={n}  comprimento do alinhamento={length:,}")
        print(f"      composição ............... {dict(composition)}")
        print(f"      fração de gaps ........... {gaps / (n * length):.3f}")
        print(f"      colunas >50% gap ......... {very_gappy:,} ({very_gappy / length:.1%})")
        print(f"      colunas constantes ....... {constant:,} ({constant / length:.1%})")
        print(f"      autapomórficas ........... {singleton:,} ({singleton / length:.1%})")
        print(f"      informativas p/ parcimônia {informative:,} ({informative / length:.2%})")


# --------------------------------------------------------------------------- #
# Seção 3 — enraizado vs. não enraizado
# --------------------------------------------------------------------------- #

def secao3_enraizamento() -> None:
    """Compara RF sobre clados enraizados e sobre bipartições."""
    _header("3. RF enraizada superestima a discordância entre métodos")
    for label, project, _ in VARIOLA + [(l, p, 0) for l, p in ZIKA[:1]]:
        trees_dir = os.path.join(project, "out", "Trees")
        if not os.path.isdir(trees_dir):
            continue
        tree_set = TreeSet.from_directory(trees_dir)
        # `rooted=True` é o comportamento ANTERIOR a M1.3, mantido aqui como
        # coluna "antes". O padrão do StabilityAnalyzer passou a ser bipartição.
        analyzer = StabilityAnalyzer(tree_set, rooted=True)
        producao = StabilityAnalyzer(tree_set)
        all_taxa = frozenset(tree_set.taxa)
        n = len(all_taxa)
        names = effective_pipelines(tree_set)
        rooted = analyzer.rf_matrix()
        producao_rf = producao.rf_matrix()
        # Reimplementação independente da bipartição, para conferir a produção.
        splits = {
            m: {canonical_split(c, all_taxa) for c in analyzer.clade_sets[m]} - {None}
            for m in names
        }
        print(f"  {label}  (n={n}, M efetivo={len(names)})")
        print(f"      {'par':40s} {'RF enraizada':>13s} {'RF bipartição':>14s} "
              f"{'produção':>10s} {'redução':>9s}")
        divergencias = 0
        for a, b in itertools.combinations(names, 2):
            r = rooted[a][b]
            u = (len(splits[a] - splits[b]) + len(splits[b] - splits[a])) / (2 * (n - 3))
            p = producao_rf[a][b]
            if p is None or abs(p - u) > 1e-9:
                divergencias += 1
            pair = f"{a.replace('mafft_', '')} vs {b.replace('mafft_', '')}"
            print(f"      {pair:40s} {r:13.4f} {u:14.4f} "
                  f"{'None' if p is None else format(p, '10.4f')} "
                  f"{(r - u) / r if r else 0:8.1%}")
        print(f"      produção x oráculo: {divergencias} divergência(s)")


# --------------------------------------------------------------------------- #
# Seção 4 — padrões maximais exatos
# --------------------------------------------------------------------------- #

def secao4_padroes_maximais() -> None:
    """Enumera o reticulado de padrões maximais sobre bipartições."""
    _header("4. Padrões maximais exatos (bipartições, pipelines efetivos)")
    for label, project, _ in VARIOLA:
        trees_dir = os.path.join(project, "out", "Trees")
        if not os.path.isdir(trees_dir):
            continue
        tree_set = TreeSet.from_directory(trees_dir)
        analyzer = StabilityAnalyzer(tree_set)
        classify = build_classifier(os.path.join(project, "out", "Align",
                                                 "dataset_final_mafft.aln"))
        all_taxa = frozenset(tree_set.taxa)
        names = effective_pipelines(tree_set)
        m = len(names)
        occurrences = split_occurrences(analyzer, all_taxa, names)
        profile = Counter(len(v) for v in occurrences.values())

        print(f"  {label}  M={m}  ({', '.join(x.replace('mafft_', '') for x in names)})")
        print(f"      bipartições distintas .... {len(occurrences)}")
        print(f"      perfil de suporte ........ {dict(sorted(profile.items(), reverse=True))}")

        # Reticulado: interseção dos splits de cada subconjunto de pipelines.
        lattice = {}
        for size in range(m, 1, -1):
            for combo in itertools.combinations(names, size):
                shared = set.intersection(*[
                    {s for s, v in occurrences.items() if p in v} for p in combo])
                if shared:
                    lattice[frozenset(combo)] = shared
        maximal = [(c, s) for c, s in lattice.items()
                   if not any(c < other and lattice[other] >= s for other in lattice)]
        for combo, shared in sorted(maximal, key=lambda x: (-len(x[0]), -len(x[1]))):
            print(f"      {len(combo)}/{m} (sup={len(combo) / m:.2f})  {len(shared):4d} bipartições"
                  f"  <- {sorted(x.replace('mafft_', '') for x in combo)}")

        # Clados de referência da literatura.
        varv = {t for t in all_taxa if classify(t) == "VARV"}
        mono = canonical_split(varv, all_taxa)
        print(f"      monofilia de VARV (n={len(varv)}) ... "
              f"{len(occurrences.get(mono, set()))}/{m}")
        present = P2_ACCESSIONS & all_taxa
        for split, pipes in occurrences.items():
            if present and present <= split and len(split) <= len(present) + 3:
                extras = sorted(split - present)
                print(f"      clado P-II |{len(split)}| ............. {len(pipes)}/{m}"
                      f"  extras={extras}")


# --------------------------------------------------------------------------- #
# Seção 5 — identidade legada e CSV do FPMax
# --------------------------------------------------------------------------- #

def _flatten(obj):
    """Percorre a estrutura aninhada de `metadata.json` devolvendo os dicionários."""
    if isinstance(obj, dict):
        yield obj
    elif isinstance(obj, list):
        for item in obj:
            yield from _flatten(item)


def secao5_fpmax() -> None:
    """Audita a identidade de 16 bits e a semântica da coluna `support`."""
    import json

    _header("5. Identidade legada de 16 bits e semântica do CSV do FPMax")
    for label, project, n_trees in VARIOLA:
        meta_path = os.path.join(project, "out", "outputs", "metadata.json")
        csv_path = os.path.join(project, "out", "outputs", "all_results_fpmax.csv")
        if not (os.path.exists(meta_path) and os.path.exists(csv_path)):
            continue

        hash_to_taxa: Dict[int, FrozenSet[str]] = {}
        hash_occurrences: Dict[int, Set[FrozenSet[str]]] = defaultdict(set)
        taxa_to_hashes: Dict[FrozenSet[str], Set[int]] = defaultdict(set)
        with open(meta_path, encoding="utf-8") as handle:
            for entry in _flatten(json.load(handle)):
                for _, subtrees in entry.items():
                    if not isinstance(subtrees, dict):
                        continue
                    for _, info in subtrees.items():
                        if not isinstance(info, dict) or "List_terminals_hash" not in info:
                            continue
                        taxa = frozenset(strip_accession_version(d["newick"])
                                         for d in info.get("data_terminals", []))
                        key = info["List_terminals_hash"]
                        hash_occurrences[key].add(taxa)
                        hash_to_taxa.setdefault(key, taxa)
                        taxa_to_hashes[taxa].add(key)

        colliding = [h for h, s in hash_occurrences.items() if len(s) > 1]
        fragmented = [t for t, h in taxa_to_hashes.items() if len(h) > 1]
        # Clado enraizado: é o objeto que a identidade legada codificava, e é
        # dele que esta seção fala. A RF corrigida (D3) usa bipartição.
        analyzer = StabilityAnalyzer(TreeSet.from_directory(
            os.path.join(project, "out", "Trees")), rooted=True)
        canonical = {r.taxa: r for r in analyzer.clade_records()}

        print(f"  {label}")
        print(f"      itens legados distintos .. {len(hash_occurrences)}")
        print(f"      clados canônicos ......... {len(canonical)}")
        print(f"      itens em colisão ......... {len(colliding)} "
              f"({len(colliding) / max(len(hash_occurrences), 1):.2%})")
        print(f"      clados fragmentados ...... {len(fragmented)} "
              f"({len(fragmented) / max(len(taxa_to_hashes), 1):.1%})")

        frame = pd.read_csv(csv_path)
        frame["S"] = frame["itemsets"].map(
            lambda s: frozenset(int(x) for x in re.findall(r"\d+", s.split("({")[1])))
        reported = defaultdict(set)
        for _, row in frame.iterrows():
            reported[row["S"]].add(round(row["support"], 2))
        ambiguous = [s for s, v in reported.items() if len(v) > 1]
        both = [s for s, v in reported.items()
                if any(x <= 0.3 for x in v) and any(x >= 0.4 for x in v)]
        print(f"      linhas no CSV ............ {len(frame)}  "
              f"(itemsets distintos: {frame['S'].nunique()})")
        print(f"      itemsets com >1 'support'  {len(ambiguous)}  "
              f"-> a coluna guarda o LIMIAR da varredura, não o suporte")
        print(f"      itemsets nas DUAS tabelas  {len(both)}  "
              f"(exibidos como frágeis E robustos ao mesmo tempo)")
        for itemset, sup in frame.groupby("S")["support"].max().items():
            k = min(i for i in range(1, n_trees + 1) if i / n_trees >= sup - 1e-9)
            resolved = [hash_to_taxa[h] for h in itemset if h in hash_to_taxa]
            real = Counter(len(canonical[t].pipelines) for t in resolved if t in canonical)
            print(f"        |I|={len(itemset):4d}  CSV={sup:.1f} -> real {k}/{n_trees}"
                  f"  suporte real dos clados: {dict(sorted(real.items(), reverse=True))}")


# --------------------------------------------------------------------------- #
# Seção 6 — bootstrap vs. suporte metodológico
# --------------------------------------------------------------------------- #

def secao6_bootstrap() -> None:
    """Cruza UFBoot do IQ-TREE com o suporte entre pipelines."""
    _header("6. UFBoot não prediz robustez metodológica")
    for label, project, _ in VARIOLA:
        contree = os.path.join(project, "out", "tmp",
                               "iqtree_tree_dataset_final_mafft_iqtree",
                               "tree_dataset_final_mafft_iqtree.contree")
        if not os.path.exists(contree):
            continue
        tree_set = TreeSet.from_directory(os.path.join(project, "out", "Trees"))
        analyzer = StabilityAnalyzer(tree_set)
        all_taxa = frozenset(tree_set.taxa)
        names = effective_pipelines(tree_set)
        m = len(names)
        occurrences = split_occurrences(analyzer, all_taxa, names)

        tree = next(Phylo.parse(contree, "newick"))
        for terminal in tree.get_terminals():
            terminal.name = strip_accession_version(terminal.name)

        rows: List[Tuple[float, int]] = []
        for clade in tree.get_nonterminals():
            split = canonical_split(
                (t.name for t in clade.get_terminals()), all_taxa)
            if split is None or clade.confidence is None:
                continue
            rows.append((clade.confidence, len(occurrences.get(split, set()))))
        if not rows:
            continue

        table = defaultdict(Counter)
        for boot, support in rows:
            band = ("100" if boot >= 100 else "95-99" if boot >= 95
                    else "70-94" if boot >= 70 else "<70")
            table[band][support] += 1

        print(f"  {label}  ({len(rows)} ramos com UFBoot, M={m})")
        print(f"      {'UFBoot':>8s} | " +
              " ".join(f"{k}/{m}".rjust(6) for k in range(m, 0, -1)) + "   total")
        for band in ("100", "95-99", "70-94", "<70"):
            counts = table[band]
            if not counts:
                continue
            print(f"      {band:>8s} | " +
                  " ".join(str(counts.get(k, 0)).rjust(6) for k in range(m, 0, -1)) +
                  f"   {sum(counts.values()):5d}")

        xs = [r[0] for r in rows]
        ys = [r[1] for r in rows]
        mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
        num = sum((a - mx) * (b - my) for a, b in zip(xs, ys))
        den = (sum((a - mx) ** 2 for a in xs) * sum((b - my) ** 2 for b in ys)) ** 0.5
        strong = [r for r in rows if r[0] >= 95]
        print(f"      correlação de Pearson .... {num / den if den else float('nan'):.3f}")
        print(f"      UFBoot >= 95 ............. {len(strong)} ramos; "
              f"{sum(1 for r in strong if r[1] == m)} universais, "
              f"{sum(1 for r in strong if r[1] == 1)} idiossincráticos")


# --------------------------------------------------------------------------- #
# Seção 7 — controle Zika
# --------------------------------------------------------------------------- #

def secao7_zika() -> None:
    """Mede o efeito real do alinhador onde o Clustal Omega de fato executou."""
    _header("7. Controle Zika: efeito real do alinhador")
    for label, project in ZIKA:
        trees_dir = os.path.join(project, "out", "Trees")
        if not os.path.isdir(trees_dir):
            continue
        tree_set = TreeSet.from_directory(trees_dir)
        analyzer = StabilityAnalyzer(tree_set)
        effects = analyzer.factor_effects()
        matrix = analyzer.rf_matrix()
        print(f"  {label}  n={tree_set.n_taxa}  M={len(tree_set)}")
        print(f"      RF | troca de alinhador ... média={effects['aligner']['mean']:.4f} "
              f"máx={effects['aligner']['max']:.4f}")
        print(f"      RF | troca de inferência .. média={effects['inference']['mean']:.4f} "
              f"máx={effects['inference']['max']:.4f}")
        for a in sorted(tree_set.trees):
            for b in sorted(tree_set.trees):
                if a < b and tree_set.labels[a].inference == tree_set.labels[b].inference:
                    print(f"        RF({a}, {b}) = {matrix[a][b]:.4f}")


SECOES = {
    1: secao1_alinhamentos_identicos,
    2: secao2_composicao,
    3: secao3_enraizamento,
    4: secao4_padroes_maximais,
    5: secao5_fpmax,
    6: secao6_bootstrap,
    7: secao7_zika,
}


def main(argv: Optional[List[str]] = None) -> int:
    """Ponto de entrada de linha de comando."""
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--secao", type=int, action="append", choices=sorted(SECOES),
                        help="Executa apenas a(s) seção(ões) indicada(s).")
    args = parser.parse_args(argv)
    for number in (args.secao or sorted(SECOES)):
        SECOES[number]()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
