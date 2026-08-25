"""Oráculo independente para a reconciliação de rótulos truncados (D13).

Corrigir D13 fez `/api/tree/compare` aceitar 24 pares que antes recusava. Um
número novo que ninguém confere é pior que um erro conhecido: estes testes
recalculam a distância de Robinson-Foulds **fora do backend**, direto no
dendropy, a partir das strings Newick lidas dos próprios arquivos Nexus, e
exigem que a API concorde.

O oráculo normaliza os rótulos por conta própria — ele não importa nada de
`src.app` além do cliente HTTP —, de modo que um erro na normalização do
backend aparece como divergência, não como acordo entre duas cópias do mesmo
engano.
"""
import pathlib
import re

import pytest

from dendropy import Tree, TaxonNamespace
from dendropy.calculate import treecompare

PROJETO = "Variola_Yu_li_2007_noITRs_6seqs"

# Um par truncado x íntegro de cada método que consome PHYLIP, mais um par
# saudável de controle (nenhum rótulo truncado dos dois lados).
PARES = [
    ("tree_dataset_final_mafft_iqtree.nexus", "tree_dataset_final_mafft_fasttree.nexus"),
    ("tree_dataset_final_mafft_raxml.nexus", "tree_dataset_final_mafft_nj_distance.nexus"),
    ("tree_dataset_final_clustalo_iqtree.nexus", "tree_dataset_final_clustalo_raxml.nexus"),
    ("tree_dataset_final_mafft_fasttree.nexus", "tree_dataset_final_mafft_nj_distance.nexus"),
]


def _trees_dir():
    import src.app as A
    return pathlib.Path(A.PROJECTS_ROOT) / PROJETO / "out" / "Trees"


def _ler(nome):
    p = _trees_dir() / nome
    if not p.exists():
        pytest.skip(f"árvore de referência ausente: {nome}")
    return p.read_text(encoding="utf-8", errors="replace")


def _newick_do_nexus(conteudo: str) -> str:
    """Pega a string da árvore sem passar pelo leitor de Nexus — é justamente o
    bloco `TaxLabels`, que o leitor consulta, que vem truncado (D13)."""
    m = re.search(r"Tree\s+\w+\s*=\s*(\(.*?;)", conteudo, re.S | re.I)
    assert m, "árvore não encontrada no Nexus"
    return m.group(1)


def _sem_versao(newick: str) -> str:
    """Remove o sufixo de versão de todo rótulo de folha: `NC_008030.1` e o
    truncado `NC_008030.` viram ambos `NC_008030`."""
    return re.sub(r"([A-Za-z]+[_A-Za-z0-9]*)\.\d*(?=[,\):])", r"\1", newick)


def _rf_pelo_oraculo(nexus1: str, nexus2: str) -> int:
    ns = TaxonNamespace()
    t1 = Tree.get_from_string(_sem_versao(_newick_do_nexus(nexus1)), "newick",
                              taxon_namespace=ns, rooting="force-unrooted",
                              preserve_underscores=True)
    t2 = Tree.get_from_string(_sem_versao(_newick_do_nexus(nexus2)), "newick",
                              taxon_namespace=ns, rooting="force-unrooted",
                              preserve_underscores=True)
    t1.encode_bipartitions()
    t2.encode_bipartitions()
    return treecompare.symmetric_difference(t1, t2)


@pytest.mark.oracle
@pytest.mark.parametrize("a,b", PARES)
async def test_rf_da_api_concorda_com_dendropy(client, a, b):
    nexus1, nexus2 = _ler(a), _ler(b)
    r = await client.post("/api/tree/compare", json={"tree1": nexus1, "tree2": nexus2})
    assert r.status_code == 200, r.text
    assert r.json()["rf_distance"] == _rf_pelo_oraculo(nexus1, nexus2), (
        f"RF da API diverge do dendropy para {a} x {b}"
    )


@pytest.mark.oracle
@pytest.mark.parametrize("a,b", PARES)
async def test_o_oraculo_ve_seis_taxons_como_a_api(client, a, b):
    """Se a normalização fundisse táxons distintos, o oráculo veria menos de 6
    folhas — o modo de falha silencioso que D13 descreve."""
    ns = TaxonNamespace()
    for nome in (a, b):
        t = Tree.get_from_string(_sem_versao(_newick_do_nexus(_ler(nome))), "newick",
                                 taxon_namespace=ns, rooting="force-unrooted",
                                 preserve_underscores=True)
        assert len(t.leaf_nodes()) == 6
    assert len(ns) == 6, f"rótulos não reconciliados entre {a} e {b}: {[x.label for x in ns]}"


@pytest.mark.oracle
async def test_arvore_contra_si_mesma_tem_rf_zero_no_par_truncado(client):
    """Piso da métrica no arquivo que antes nem era aceito."""
    nexus = _ler("tree_dataset_final_mafft_iqtree.nexus")
    r = await client.post("/api/tree/compare", json={"tree1": nexus, "tree2": nexus})
    assert r.status_code == 200
    assert r.json()["rf_distance"] == 0
