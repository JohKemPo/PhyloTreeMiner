#!/usr/bin/env python
"""
Portão científico — M2.7.

Verifica que o invariante do baseline de Li *et al.* (2007) continua sendo
recuperado. **É o gate de toda refatoração a partir de M2**: uma mudança que o
quebre é revertida, independentemente de quantos testes unitários passem.

## Dois níveis

    make reference-check        rápido, sobre as árvores versionadas em
                                Backend/tests/data/reference/. Roda em qualquer
                                máquina, em segundos, e é o portão do dia a dia.

    make reference-check-full   reexecuta o pipeline e confere o resultado novo.
                                Máquina de validação.

O rápido responde *"a refatoração preservou a biologia?"*. O completo responde
*"o pipeline ainda produz essa biologia?"*. São perguntas diferentes e as duas
precisam de resposta — mas só a primeira pode rodar em CI.

## Três códigos de saída, não dois

    0   invariante válido E M completo        — portão satisfeito
    2   invariante válido, M incompleto       — falta reexecutar
    1   invariante VIOLADO                    — sempre falha

O código 2 existe porque "ainda não terminamos" e "quebrou" são estados
diferentes, e colapsá-los ensinaria a ignorar o portão. Enquanto M2 está aberto,
2 é esperado; depois de fechado, 2 é regressão.
"""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.abspath("."))

from workflow.stability.stability import StabilityAnalyzer, TreeSet

REFERENCIA = "../Backend/tests/data/reference"

VERDE, VERMELHO, AMARELO, DIM, FIM = "\033[32m", "\033[31m", "\033[33m", "\033[2m", "\033[0m"


def carregar_esperado(diretorio):
    caminho = os.path.join(diretorio, "expected.json")
    if not os.path.exists(caminho):
        print(f"{VERMELHO}expected.json ausente em {diretorio}{FIM}")
        print("Gere com: python ../docs/science/scripts/gerar_dataset_referencia.py")
        return None
    with open(caminho, encoding="utf-8") as f:
        return json.load(f)


def conferir_invariantes(analisador, esperado):
    """Cada invariante contra as bipartições universais. Devolve (ok, linhas)."""
    universais = {frozenset(r.taxa) for r in analisador.consensus_clades(1.0)}
    todas = {frozenset(r.taxa): r for r in analisador.clade_records()}

    linhas = []
    ok = True
    for inv in esperado["invariants"]:
        alvo = frozenset(inv["bipartition"])
        registro = todas.get(alvo)
        universal = alvo in universais

        if universal:
            estado = f"{VERDE}✓{FIM}"
            detalhe = f"recuperado por todos os {len(analisador.tree_set)} pipelines"
        elif registro is not None:
            ok = False
            estado = f"{VERMELHO}✗{FIM}"
            n = len(registro.pipelines)
            detalhe = (f"{VERMELHO}recuperado por apenas {n} de "
                       f"{len(analisador.tree_set)}{FIM} — "
                       f"{', '.join(sorted(registro.pipelines))}")
        else:
            ok = False
            estado = f"{VERMELHO}✗{FIM}"
            detalhe = f"{VERMELHO}NÃO recuperado por nenhum pipeline{FIM}"

        linhas.append(f"  [{estado}] {inv['id']:18s} {len(alvo):3d} táxons   {detalhe}")
    return ok, linhas


def impressao_digital(analisador):
    """A topologia como fingerprint do ambiente — registrada, nunca usada para reprovar."""
    contagens = analisador.bipartition_counts()
    matriz = analisador.rf_matrix()
    nomes = sorted(matriz)
    distancias = [matriz[a][b] for i, a in enumerate(nomes) for b in nomes[i + 1:]
                  if matriz[a][b] is not None]
    return {
        "pipelines": nomes,
        "bipartitions_per_pipeline": contagens,
        "rf_min": round(min(distancias), 4) if distancias else None,
        "rf_max": round(max(distancias), 4) if distancias else None,
        "universal_bipartitions": len(analisador.consensus_clades(1.0)),
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dir", default=REFERENCIA, help="diretório do dataset de referência")
    parser.add_argument("--trees", help="conferir estas árvores em vez das de referência "
                                        "(usado pelo nível completo, após reexecutar)")
    parser.add_argument("--json", action="store_true", help="saída em JSON")
    args = parser.parse_args(argv)

    esperado = carregar_esperado(args.dir)
    if esperado is None:
        return 1

    diretorio_arvores = args.trees or os.path.join(args.dir, "trees")
    if not os.path.isdir(diretorio_arvores):
        print(f"{VERMELHO}Árvores ausentes: {diretorio_arvores}{FIM}")
        return 1

    tree_set = TreeSet.from_directory(diretorio_arvores)

    # M é comparado por NOME, não por contagem. O artefato atual tem 8 árvores,
    # das quais 4 são cópias byte a byte do braço clustalo (D1): contá-las faria
    # o portão declarar M completo sem que o RAxML tivesse rodado.
    alvo_nomes = {f"{a}_{m}" for a in esperado["target_M"]["aligners"]
                  for m in esperado["target_M"]["inference"]}
    presentes_nomes = set(tree_set.trees)
    no_alvo = sorted(alvo_nomes & presentes_nomes)
    faltando = sorted(alvo_nomes - presentes_nomes)
    fora_do_alvo = sorted(presentes_nomes - alvo_nomes)

    # O invariante é conferido sobre os pipelines DO ALVO que existem — não
    # sobre tudo o que há na pasta. Um braço que é cópia de outro não é um voto.
    if no_alvo:
        conferido = TreeSet({n: tree_set.trees[n] for n in no_alvo},
                            {n: tree_set.labels[n] for n in no_alvo},
                            normalizer=None)
    else:
        conferido = tree_set
    analisador = StabilityAnalyzer(conferido)

    invariantes_ok, linhas = conferir_invariantes(analisador, esperado)
    digital = impressao_digital(analisador)

    alvo = len(alvo_nomes)
    presentes = len(no_alvo)
    m_completo = not faltando

    if args.json:
        print(json.dumps({
            "invariants_ok": invariantes_ok,
            "M_present": presentes,
            "M_target": alvo,
            "M_complete": m_completo,
            "pipelines_in_target": no_alvo,
            "pipelines_missing": faltando,
            "pipelines_outside_target": fora_do_alvo,
            "fingerprint": digital,
        }, indent=2, ensure_ascii=False))
    else:
        print(f"\n{'═' * 67}")
        print(f"  PORTÃO CIENTÍFICO — {esperado['dataset']} "
              f"({esperado['n_taxa']} táxons)")
        print(f"{'═' * 67}")
        print(f"{DIM}  Li et al. (2007) PNAS 104:15787-92 · doi:10.1073/pnas.0609268104{FIM}\n")
        print(*linhas, sep="\n")
        print(f"\n  {DIM}impressão digital (registrada, não reprova):{FIM}")
        print(f"    pipelines conferidos ..... {presentes} de {alvo}")
        print(f"    bipartições universais ... {digital['universal_bipartitions']}")
        print(f"    RF entre pares ........... {digital['rf_min']} a {digital['rf_max']}")
        print()

    if args.json:
        # Em modo JSON, a saída é só o JSON: acrescentar prosa depois dele faria
        # `json.loads(stdout)` falhar em qualquer consumidor.
        return 1 if not invariantes_ok else (0 if m_completo else 2)

    if not invariantes_ok:
        print(f"{VERMELHO}✗ INVARIANTE VIOLADO — a mudança quebrou a biologia e deve ser revertida.{FIM}")
        return 1

    if fora_do_alvo:
        print(f"  {DIM}fora do alvo, ignorados: {', '.join(fora_do_alvo)}{FIM}")

    if not m_completo:
        print(f"{AMARELO}○ Invariante válido, mas M incompleto: {presentes} de {alvo} pipelines.{FIM}")
        print(f"{AMARELO}  Faltam: {', '.join(faltando)}{FIM}")
        print(f"{DIM}  {esperado['note_on_M']}{FIM}")
        return 2

    print(f"{VERDE}✓ Portão satisfeito: invariante válido em {presentes} de {alvo} pipelines.{FIM}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
