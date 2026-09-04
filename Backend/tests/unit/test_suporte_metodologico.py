"""M3.3 — `suporte_metodologico.ler_suporte_metodologico_do_projeto`.

Não é um oráculo novo: `StabilityAnalyzer.clade_records()` já é a função
oráculo-validada (dendropy, 1682 testes/0 divergências, DEC-069) por trás do
gate de M3.4. O que estes testes travam é a **serialização** — que o módulo
não perde, duplica nem recalcula nada em relação a uma chamada direta da
mesma classe sobre o mesmo `TreeSet`.
"""

import pathlib

import pytest

PROJETO = "Variola_VARV52_reexec_20260903"


@pytest.fixture(scope="module")
def modulo(app_module):
    # Importa via app_module para herdar o sys.path que põe BioComp_UFF no ar.
    from src import suporte_metodologico
    return suporte_metodologico


@pytest.fixture(scope="module")
def stability(app_module):
    from workflow.stability.stability import StabilityAnalyzer, TreeSet
    return StabilityAnalyzer, TreeSet


@pytest.fixture(scope="module")
def canonical_item_id(app_module):
    from workflow.stability.clade_identity import canonical_item_id as fn
    return fn


@pytest.fixture(scope="module")
def dir_trees(projects_root):
    caminho = projects_root / PROJETO / "out" / "Trees"
    if not caminho.is_dir():
        pytest.skip("projeto de referência VARV-52 ausente")
    return str(caminho)


def test_M_e_pipelines_batem_com_o_universo_em_disco(modulo, stability, dir_trees):
    _, TreeSet = stability
    resultado = modulo.ler_suporte_metodologico_do_projeto(dir_trees)
    universo = TreeSet.from_directory(dir_trees)

    assert resultado["M"] == len(universo)
    assert resultado["pipelines"] == sorted(universo.labels.keys())


def test_suporte_por_clado_e_identico_a_chamada_direta_do_analisador(
    modulo, stability, canonical_item_id, dir_trees
):
    """A serialização não pode divergir de uma chamada direta da mesma classe."""
    StabilityAnalyzer, TreeSet = stability
    resultado = modulo.ler_suporte_metodologico_do_projeto(dir_trees)

    universo = TreeSet.from_directory(dir_trees)
    esperado = {
        canonical_item_id(registro.taxa): registro.support
        for registro in StabilityAnalyzer(universo).clade_records()
    }

    assert resultado["n_clados"] == len(esperado)
    for clado in resultado["clados"]:
        assert clado["suporte"] == pytest.approx(esperado[clado["clade_id"]])
        assert clado["n_taxa"] == len(clado["taxa"])
        assert set(clado["pipelines"]) <= set(resultado["pipelines"])


def test_alinhador_restringe_o_universo(modulo, stability, dir_trees):
    _, TreeSet = stability
    universo = TreeSet.from_directory(dir_trees)
    algum_alinhador = next(iter({lbl.aligner for lbl in universo.labels.values()}))

    resultado = modulo.ler_suporte_metodologico_do_projeto(dir_trees, alinhador=algum_alinhador)

    assert resultado["alinhador"] == algum_alinhador
    assert resultado["M"] < len(universo)
    assert all(p.startswith(f"{algum_alinhador}_") for p in resultado["pipelines"])


def test_alinhador_inexistente_levanta_value_error(modulo, dir_trees):
    with pytest.raises(ValueError, match="Nenhum pipeline"):
        modulo.ler_suporte_metodologico_do_projeto(dir_trees, alinhador="inexistente")


def test_clade_id_casa_com_o_de_suporte_de_ramo(modulo, dir_trees, app_module):
    """O mesmo clado tem o mesmo `clade_id` nas duas rotas de M3 (contrato de junção)."""
    from src.suporte_de_ramo import ler_suporte_do_projeto

    metodologico = modulo.ler_suporte_metodologico_do_projeto(dir_trees)
    bootstrap = ler_suporte_do_projeto(dir_trees)

    ids_metodologicos = {c["clade_id"] for c in metodologico["clados"]}
    ids_bootstrap = {r["clade_id"] for a in bootstrap["arvores"] for r in a["ramos"]}

    # Todo ramo com bootstrap tem de aparecer no universo de suporte
    # metodológico (o inverso não vale: um clado pode não existir em nenhuma
    # árvore com bootstrap, ex.: NJ/UPGMA).
    assert ids_bootstrap <= ids_metodologicos
