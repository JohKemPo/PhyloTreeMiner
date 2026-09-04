"""Leitura e exposição do suporte metodológico entre pipelines (M3.3/M3.4).

Este módulo é a metade `Backend/` que faltava para colocar bootstrap e suporte
metodológico lado a lado (M3, "Bootstrap × robustez metodológica"). O suporte
de ramo (`suporte_de_ramo.py`, M3.1) mede robustez **amostral** dentro de um
único pipeline; este módulo mede robustez **metodológica**: a fração de
pipelines (combinações alinhador × método de inferência) que recuperam o mesmo
clado, definição de `03-metricas.md §4.1` e o próprio argumento do artigo.

**Nenhuma fórmula nova aqui.** `sup(b) = |{p : b ∈ B(T_p)}| / M` já é
`workflow.stability.stability.StabilityAnalyzer.clade_records()` — a mesma
classe que `docs/science/scripts/resultado_principal.py` usa para o gate de
M3.4 (oráculo dendropy: 1682 testes, 0 divergências, DEC-069) e que
`audit_variola.py` usa para a auditoria histórica. Este módulo é uma camada de
serialização sobre uma função já oráculo-validada, não uma segunda
implementação — por isso não carrega oráculo próprio (ver nota em
`Backend/tests/unit/test_suporte_metodologico.py`).

`clade_id` é o `canonical_item_id` da mesma bipartição canônica (D3/D5) que
`suporte_de_ramo.py` usa para os ramos de bootstrap — o mesmo clado tem o
mesmo `clade_id` nas duas rotas, e é por ele que o cliente cruza bootstrap com
suporte metodológico.
"""

from __future__ import annotations

import os
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional

from workflow.stability.clade_identity import canonical_digest, canonical_item_id
from workflow.stability.stability import PipelineLabel, StabilityAnalyzer, TreeSet

__all__ = [
    "NOTA_SUPORTE_METODOLOGICO",
    "ler_suporte_metodologico_do_projeto",
]

NOTA_SUPORTE_METODOLOGICO = (
    "Suporte metodológico mede quantos pipelines (alinhador × método de "
    "inferência) recuperam o MESMO clado — robustez metodológica, ortogonal "
    "ao bootstrap (robustez amostral dentro de um único pipeline). Os dois "
    "não são a mesma grandeza e um valor alto do outro não implica nada "
    "sobre este (ver /branch-support). A unidade de comparação é a "
    "bipartição não enraizada canônica (D3): árvores com raiz trifurcante "
    "de escrita (FastTree/IQ-TREE/RAxML-NG/NJ) não são comparadas por clado "
    "enraizado, que mediria a convenção do arquivo, não a topologia."
)


@dataclass(frozen=True)
class _CladoServico:
    clade_id: int
    digest: str
    n_taxa: int
    taxa: List[str]
    pipelines: List[str]
    suporte: float


def _carregar_universo(dir_trees: str, alinhador: Optional[str]) -> TreeSet:
    """Carrega o `TreeSet` do projeto, opcionalmente restrito a um alinhador.

    Sem `alinhador`, o universo é **todos** os pipelines em `out/Trees` — o
    mesmo "universo todos" que `audit_variola.py`/`resultado_principal.py`
    reportam como secundário. Com `alinhador`, restringe ao braço daquele
    alinhador (ex.: `mafft`) — o universo **principal** do gate de M3.4, onde
    só o método de inferência varia.
    """
    universo = TreeSet.from_directory(dir_trees)
    if alinhador is None:
        return universo

    nomes = [n for n, lbl in universo.labels.items() if lbl.aligner == alinhador]
    if not nomes:
        raise ValueError(
            f"Nenhum pipeline do alinhador '{alinhador}' encontrado em {dir_trees!r}."
        )
    trees = {n: universo.trees[n] for n in nomes}
    labels = {n: universo.labels[n] for n in nomes}
    # Os rótulos de terminal já foram normalizados por `TreeSet.from_directory`
    # (D13); reconstituir sem normalizador de novo evita normalizar duas vezes.
    return TreeSet(trees, labels, normalizer=None)


def ler_suporte_metodologico_do_projeto(dir_trees: str,
                                        alinhador: Optional[str] = None) -> Dict[str, Any]:
    """Suporte metodológico de todos os clados distintos de um `out/Trees`.

    Parameters
    ----------
    dir_trees : str
        Diretório `out/Trees` do projeto.
    alinhador : str or None, optional
        Restringe o universo a um alinhador só (ex.: ``"mafft"``). ``None``
        (padrão) usa todos os pipelines em disco.

    Return
    ------
    dict
        ``{"pipelines": [...], "M": int, "clados": [...], "nota": str}``.

    Raises
    ------
    ValueError
        Se `alinhador` não corresponder a nenhum pipeline em disco, ou se dois
        arquivos do universo escolhido designarem o mesmo pipeline (D19).
    """
    universo = _carregar_universo(dir_trees, alinhador)
    analisador = StabilityAnalyzer(universo)

    clados = [
        _CladoServico(
            clade_id=canonical_item_id(registro.taxa),
            digest=canonical_digest(registro.taxa),
            n_taxa=registro.size,
            taxa=sorted(registro.taxa),
            pipelines=sorted(registro.pipelines),
            suporte=registro.support,
        )
        for registro in analisador.clade_records()
    ]

    return {
        "pipelines": sorted(universo.labels.keys()),
        "alinhador": alinhador,
        "M": len(universo),
        "n_clados": len(clados),
        "clados": [asdict(c) for c in clados],
        "nota": NOTA_SUPORTE_METODOLOGICO,
    }
