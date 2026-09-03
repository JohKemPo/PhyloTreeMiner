"""Oráculo independente do suporte de ramo (M3.1, zona sagrada).

A rota `/api/tree/{projeto}/branch-support` lê o suporte com **Biopython**
(`Bio.Phylo`, `.confidence`) e identifica o ramo com a bipartição canônica de
`workflow.stability.clade_identity`. Este oráculo lê os **mesmos arquivos** com
**dendropy**, que tem parser próprio e representação própria de bipartição, e
confronta valor a valor.

Se as duas leituras concordam em todos os ramos das árvores de referência, o
número que a API devolve não é artefato do parser nem da forma de identificar o
ramo. Nenhuma linha de código de produção é importada aqui: o oráculo reimplementa
a leitura do zero, que é a única forma de ele valer alguma coisa.
"""

import pathlib

import pytest

dendropy = pytest.importorskip("dendropy")

PROJETOS = ("Variola_VARV49_reexec_20260901", "Variola_VARV121_reexec_20260901")

#: Só os métodos que produzem suporte: nas árvores de distância o rótulo de nó
#: interno é `InnerNN` (nome, não suporte), e o oráculo tem de constatar isso.
COM_SUPORTE = ("iqtree", "fasttree")


def _sufixo_de_versao(nome: str) -> str:
    """Reimplementa a normalização de D13 sem importar o submódulo."""
    nome = nome.strip().strip("'\"")
    if "." in nome:
        cabeca, _, cauda = nome.rpartition(".")
        if cauda.isdigit() or cauda == "":
            return cabeca
    return nome


def _bipartes_dendropy(caminho: str):
    """`frozenset(taxa do lado menor) -> suporte`, lido só com dendropy.

    dendropy guarda o rótulo de nó interno em `node.label`; o suporte só é
    considerado quando esse rótulo é numérico — que é a mesma decisão que o
    Biopython toma ao promover rótulo numérico a `.confidence`, e é o que
    impede `Inner45` de virar número.
    """
    arvore = dendropy.Tree.get(path=caminho, schema="nexus",
                               preserve_underscores=True)
    todos = frozenset(_sufixo_de_versao(t.label) for t in arvore.taxon_namespace)

    resultado = {}
    for no in arvore.preorder_node_iter():
        if no.is_leaf():
            continue
        lado = frozenset(_sufixo_de_versao(folha.taxon.label)
                         for folha in no.leaf_iter() if folha.taxon)
        outro = todos - lado
        if len(lado) < 2 or len(outro) < 2:
            continue
        chave = min((lado, outro), key=lambda s: (len(s), sorted(s)))

        valor = None
        rotulo = no.label
        if rotulo is not None:
            try:
                valor = float(rotulo)
            except ValueError:
                valor = None
        resultado.setdefault(chave, valor)
    return resultado


def _bipartes_api(bloco):
    return {frozenset(r["taxa"]): r["valor"] for r in bloco["ramos"]}


@pytest.fixture(scope="module")
def modulo(app_module):
    from src import suporte_de_ramo
    return suporte_de_ramo


def _arvores(projects_root, projeto):
    d = pathlib.Path(projects_root) / projeto / "out" / "Trees"
    if not d.is_dir():
        pytest.skip(f"projeto de referência {projeto} ausente")
    return d


@pytest.mark.parametrize("projeto", PROJETOS)
@pytest.mark.parametrize("pipeline", ["mafft", "mafft_iterative"])
@pytest.mark.parametrize("metodo", COM_SUPORTE)
def test_suporte_bate_com_dendropy(modulo, projects_root, projeto, pipeline, metodo):
    d = _arvores(projects_root, projeto)
    caminho = d / f"tree_dataset_final_{pipeline}_{metodo}.nexus"
    if not caminho.is_file():
        pytest.skip(f"{caminho.name} ausente")

    bloco = modulo.ler_suporte_de_arquivo(str(caminho))
    esperado = {k: v for k, v in _bipartes_dendropy(str(caminho)).items() if v is not None}
    obtido = _bipartes_api(bloco)

    assert obtido, "a API não devolveu ramo nenhum"
    assert set(obtido) == set(esperado), (
        f"{caminho.name}: bipartições divergem — "
        f"só na API: {len(set(obtido) - set(esperado))}, "
        f"só no dendropy: {len(set(esperado) - set(obtido))}"
    )
    divergentes = {k for k in obtido if abs(obtido[k] - esperado[k]) > 1e-9}
    assert not divergentes, (
        f"{caminho.name}: {len(divergentes)} ramos com suporte divergente; "
        f"exemplo: {[(sorted(k)[:3], obtido[k], esperado[k]) for k in list(divergentes)[:3]]}"
    )


@pytest.mark.parametrize("projeto", PROJETOS)
@pytest.mark.parametrize("metodo", ["nj_distance", "upgma_distance", "raxml"])
def test_dendropy_confirma_ausencia_de_suporte(modulo, projects_root, projeto, metodo):
    """O oráculo tem de concordar também quando não há suporte nenhum.

    É o caso em que um leitor descuidado inventaria número: NJ/UPGMA trazem
    `InnerNN` no rótulo, e o RAxML destes artefatos é anterior a M3.2.
    """
    d = _arvores(projects_root, projeto)
    caminho = d / f"tree_dataset_final_mafft_{metodo}.nexus"
    if not caminho.is_file():
        pytest.skip(f"{caminho.name} ausente")

    numericos = [v for v in _bipartes_dendropy(str(caminho)).values() if v is not None]
    assert numericos == [], "pré-condição: dendropy não deve achar suporte aqui"

    bloco = modulo.ler_suporte_de_arquivo(str(caminho))
    assert bloco["ramos"] == []
    assert bloco["suporte_presente"] is False


def test_fbp_do_raxml_bate_com_dendropy(modulo):
    """Mesma confrontação na fixture real de RAxML-NG com FBP."""
    caminho = (pathlib.Path(__file__).resolve().parents[1]
               / "data" / "suporte" / "tree_dataset_final_mafft_raxml.nexus")

    bloco = modulo.ler_suporte_de_arquivo(str(caminho))
    esperado = {k: v for k, v in _bipartes_dendropy(str(caminho)).items() if v is not None}
    obtido = _bipartes_api(bloco)

    assert obtido
    assert set(obtido) == set(esperado)
    assert all(abs(obtido[k] - esperado[k]) < 1e-9 for k in obtido)
