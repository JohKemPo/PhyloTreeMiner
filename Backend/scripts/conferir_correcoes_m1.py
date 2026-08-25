#!/usr/bin/env python
"""
Confere, num projeto recém-executado, se as correções de M1 e M2.5 materializaram.

M1 corrigiu o **pipeline**; os artefatos antigos seguem com os números errados.
Este script é o que responde "a reexecução produziu mesmo o número certo?" —
sem depender de ler o código, só olhando o que foi gravado em disco.

    cd Backend && python scripts/conferir_correcoes_m1.py <projeto> [<projeto_antigo>]

Com dois projetos, imprime a comparação lado a lado. Sai com código 1 se alguma
verificação falhar.
"""

import json
import os
import re
import sys

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                    "..", "..", "BioComp_UFF", "projects")

OK, FALHA, INFO = "  ok  ", " FALHA", "  --  "
_falhas = 0


def checar(condicao, titulo, detalhe=""):
    global _falhas
    if condicao is None:
        print(f"[{INFO}] {titulo}   {detalhe}")
        return
    if not condicao:
        _falhas += 1
    print(f"[{OK if condicao else FALHA}] {titulo}   {detalhe}")


def caminho(projeto, *partes):
    return os.path.join(RAIZ, projeto, "out", *partes)


# --------------------------------------------------------------------------- #
# M2.5 — manifesto
# --------------------------------------------------------------------------- #

def conferir_manifesto(projeto):
    print("\n── M2.5 · manifesto de execução (D11, D17) ──")
    p = caminho(projeto, "outputs", "manifest.json")
    if not os.path.exists(p):
        checar(False, "manifest.json existe", p)
        return None
    with open(p, encoding="utf-8") as handle:
        m = json.load(handle)

    checar(bool(m.get("run_id")), "run_id gravado", m.get("run_id", "")[:12])
    checar(bool(m.get("finished_at_utc")), "execução concluída (finished_at preenchido)",
           str(m.get("finished_at_utc")))
    repr_ = m.get("reproducibility", {})
    checar(repr_.get("random_seed") is not None, "semente fixada",
           f"seed={repr_.get('random_seed')} raxml={repr_.get('raxml_threads')} "
           f"iqtree={repr_.get('iqtree_threads')}")
    ferramentas = m.get("tools_available", {})
    presentes = {k: v for k, v in ferramentas.items() if v}
    checar(len(presentes) >= 4, "versões de ferramenta capturadas",
           ", ".join(f"{k} {v}" for k, v in sorted(presentes.items())))
    ausentes = sorted(k for k, v in ferramentas.items() if not v)
    checar(None, "ferramentas ausentes declaradas como null", ", ".join(ausentes) or "nenhuma")
    for nome, estado in m.get("git", {}).items():
        checar(bool(estado.get("commit")), f"commit de {nome}",
               f"{(estado.get('commit') or '')[:8]} ({estado.get('branch')}, "
               f"{'sujo' if estado.get('dirty') else 'limpo'})")
    checar(bool(m.get("inputs_sha256")), "entradas com SHA-256",
           f"{len(m.get('inputs_sha256', {}))} arquivo(s)")
    checar(bool(m.get("outputs_sha256")), "saídas com SHA-256",
           f"{len(m.get('outputs_sha256', {}))} arquivo(s)")
    absolutos = [k for k in list(m.get("inputs_sha256", {})) + list(m.get("outputs_sha256", {}))
                 if os.path.isabs(k)]
    checar(not absolutos, "nenhum caminho absoluto no manifesto (D15)",
           ", ".join(absolutos[:2]) or "—")
    return m


# --------------------------------------------------------------------------- #
# M1.1 — FPMax
# --------------------------------------------------------------------------- #

def conferir_fpmax(projeto, rotulo="depois"):
    print(f"\n── M1.1 · CSV do FPMax ({rotulo}) ──")
    p = caminho(projeto, "outputs", "all_results_fpmax.csv")
    if not os.path.exists(p):
        checar(False, "all_results_fpmax.csv existe", p)
        return None
    import pandas as pd
    frame = pd.read_csv(p)
    colunas = set(frame.columns)

    novas = {"support", "min_support_threshold", "max_support_threshold", "n_trees"}
    tem_novas = novas <= colunas
    checar(tem_novas, "colunas de M1.1 presentes",
           ", ".join(sorted(colunas - {"Unnamed: 0"})))

    frame["_I"] = frame["itemsets"].map(
        lambda s: frozenset(int(x) for x in re.findall(r"\d+", s.split("({")[1])))
    duplicados = len(frame) - frame["_I"].nunique()
    checar(duplicados == 0, "uma linha por itemset",
           f"{len(frame)} linhas, {frame['_I'].nunique()} itemsets distintos")

    if tem_novas:
        acima = frame[frame["max_support_threshold"] > frame["support"] + 1e-9]
        checar(acima.empty, "nenhum limiar acima do suporte real", f"{len(acima)} violação(ões)")
        frageis = set(frame.loc[frame["support"] <= 0.3, "_I"])
        robustos = set(frame.loc[frame["support"] >= 0.6, "_I"])
        checar(not (frageis & robustos), "nenhum padrão frágil E robusto ao mesmo tempo",
               f"{len(frageis)} frágeis, {len(robustos)} robustos")
    else:
        por_itemset = frame.groupby("_I")["support"].nunique()
        checar(None, "itemsets com mais de um 'suporte' (semântica antiga)",
               f"{int((por_itemset > 1).sum())} de {len(por_itemset)}")
    return frame


# --------------------------------------------------------------------------- #
# M1.2 — identidade de clado
# --------------------------------------------------------------------------- #

def conferir_identidade(projeto, rotulo="depois"):
    print(f"\n── M1.2 · identidade de clado no metadata.json ({rotulo}) ──")
    p = caminho(projeto, "outputs", "metadata.json")
    if not os.path.exists(p):
        checar(False, "metadata.json existe", p)
        return None
    import ijson
    ids, legados, arvores = set(), set(), 0
    tem_legado = False
    with open(p, "rb") as handle:
        for base in ijson.items(handle, "item.item"):
            if not isinstance(base, dict):
                continue
            for _, subarvores in base.items():
                arvores += 1
                for sub in subarvores.values():
                    if isinstance(sub, dict) and "List_terminals_hash" in sub:
                        ids.add(sub["List_terminals_hash"])
                        if "List_terminals_hash_legacy" in sub:
                            tem_legado = True
                            legados.add(sub["List_terminals_hash_legacy"])

    checar(tem_legado, "`List_terminals_hash_legacy` gravado ao lado do canônico",
           f"{len(legados)} valores legados" if tem_legado else "ausente — artefato anterior a M1.2")
    maiores = [i for i in ids if i > 2 ** 16]
    checar(bool(maiores), "identidade fora do espaço de 16 bits",
           f"{len(maiores)} de {len(ids)} itens acima de 65 536")
    seguro_js = all(i <= 2 ** 53 - 1 for i in ids)
    checar(seguro_js, "identidade exata em JavaScript (≤ 2^53−1)",
           f"máximo {max(ids) if ids else 0}")
    if tem_legado:
        checar(len(ids) <= len(legados), "canônica não fragmenta mais que a legada",
               f"{len(ids)} canônicos contra {len(legados)} legados")
    print(f"       {arvores} árvores, {len(ids)} clados distintos")
    return ids


# --------------------------------------------------------------------------- #
# M1.3 — RF por bipartição
# --------------------------------------------------------------------------- #

def conferir_rf(projeto):
    print("\n── M1.3 · RF por bipartição ──")
    diretorio = caminho(projeto, "Trees")
    if not os.path.isdir(diretorio):
        checar(False, "diretório de árvores existe", diretorio)
        return
    sys.path.insert(0, os.path.abspath(os.path.join(RAIZ, "..")))
    from workflow.stability.stability import StabilityAnalyzer, TreeSet
    tree_set = TreeSet.from_directory(diretorio)
    analisador = StabilityAnalyzer(tree_set)
    n = tree_set.n_taxa
    contagens = analisador.bipartition_counts()
    checar(not analisador.rooted, "unidade de comparação é a bipartição", "rooted=False")
    checar(all(v <= n - 3 for v in contagens.values()),
           "|B(T)| ≤ n − 3 em todo pipeline",
           f"n={n}, |B| entre {min(contagens.values())} e {max(contagens.values())}")
    matriz = analisador.rf_matrix()
    diagonal = all(matriz[a][a] == 0 for a in matriz)
    checar(diagonal, "diagonal da RF é zero", "")
    universais = analisador.consensus_clades(1.0)
    print(f"       {len(tree_set)} pipelines, {len(universais)} bipartições universais")


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    projeto = argv[0]
    print(f"═══ {projeto} ═══")
    conferir_manifesto(projeto)
    conferir_fpmax(projeto)
    conferir_identidade(projeto)
    conferir_rf(projeto)

    if len(argv) > 1:
        antigo = argv[1]
        print(f"\n\n═══ {antigo} (artefato anterior, para comparação) ═══")
        conferir_fpmax(antigo, rotulo="antes")
        conferir_identidade(antigo, rotulo="antes")

    print(f"\n{'TUDO VERDE' if not _falhas else str(_falhas) + ' VERIFICAÇÃO(ÕES) FALHOU/FALHARAM'}")
    return 1 if _falhas else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
