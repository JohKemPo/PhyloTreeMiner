#!/usr/bin/env python
"""Varredura de D13 — quanto metadado o índice descartava por rótulo truncado.

Produz a evidência citada em DEC-019: para cada projeto, qual árvore vem
primeiro no `metadata.json`, quantos táxons dela chegam sem metadado, quais se
recuperam ao percorrer as árvores seguintes, e a partir de que árvore o
conjunto fica completo.

    cd Backend && python scripts/varredura_rotulos_truncados.py
    cd Backend && python scripts/varredura_rotulos_truncados.py VARV-6 Variola_Yu_li_2007

Sem argumentos, varre os projetos cujo `metadata.json` tem menos de 100 MB —
os grandes levam ~10 s cada e devem ser pedidos pelo nome.
"""
import os
import sys
import time

import ijson

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                    "..", "..", "BioComp_UFF", "projects")
LIMITE_PADRAO_MB = 100


def _riqueza(node):
    md = node.get("metadata") or {}
    return (len(md.get("features") or []), len(md.get("annotations") or {}))


def _por_arvore(path):
    """[(nome da árvore, {rótulo: riqueza})] na ordem do arquivo."""
    resultado = []
    with open(path, "rb") as f:
        for base in ijson.items(f, "item.item"):
            if not isinstance(base, dict):
                continue
            for nome, conteudo in base.items():
                rotulos = {}
                for subarvore in conteudo.values():
                    if isinstance(subarvore, dict) and "data_terminals" in subarvore:
                        for node in subarvore["data_terminals"]:
                            rotulo = node.get("newick")
                            if rotulo:
                                rotulos[rotulo] = max(_riqueza(node), rotulos.get(rotulo, (0, 0)))
                resultado.append((nome, rotulos))
    return resultado


def relatorio(nome_projeto, path):
    t0 = time.perf_counter()
    arvores = _por_arvore(path)
    if not arvores:
        print(f"{nome_projeto}: sem árvores")
        return

    primeira_nome, primeira = arvores[0]
    vazios = sorted(r for r, riq in primeira.items() if riq == (0, 0))

    melhor, completo_em = {}, None
    for i, (_, rotulos) in enumerate(arvores, start=1):
        for rotulo, riq in rotulos.items():
            acesso = rotulo.split(".")[0]
            if acesso not in melhor or riq > melhor[acesso][0]:
                melhor[acesso] = (riq, rotulo)
        if completo_em is None and melhor and all(riq > (0, 0) for riq, _ in melhor.values()):
            completo_em = i

    recuperados = sorted(
        acesso for acesso, (riq, _) in melhor.items()
        if any(r.split(".")[0] == acesso and riq_p == (0, 0) for r, riq_p in primeira.items())
    )

    print(f"{nome_projeto}")
    print(f"  árvores={len(arvores)}  leitura completa={time.perf_counter() - t0:.2f}s"
          f"  1a árvore={primeira_nome}")
    print(f"  táxons={len(primeira)}  sem metadado lendo só a 1a árvore={len(vazios)} {vazios}")
    print(f"  recuperados percorrendo as demais={len(recuperados)} {recuperados}")
    print(f"  conjunto completo a partir da árvore #{completo_em}\n")


def main(argv):
    raiz = os.path.normpath(RAIZ)
    if argv:
        alvos = argv
    else:
        alvos = []
        for nome in sorted(os.listdir(raiz)):
            p = os.path.join(raiz, nome, "out", "outputs", "metadata.json")
            if os.path.exists(p) and os.path.getsize(p) < LIMITE_PADRAO_MB * 1024 * 1024:
                alvos.append(nome)
        print(f"varrendo {len(alvos)} projetos com metadata.json < {LIMITE_PADRAO_MB} MB "
              f"(passe nomes como argumento para incluir os grandes)\n")

    for nome in alvos:
        p = os.path.join(raiz, nome, "out", "outputs", "metadata.json")
        if not os.path.exists(p):
            print(f"{nome}: metadata.json ausente\n")
            continue
        relatorio(nome, p)


if __name__ == "__main__":
    main(sys.argv[1:])
