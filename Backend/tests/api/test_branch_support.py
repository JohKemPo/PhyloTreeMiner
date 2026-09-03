"""M3.1 — a rota `/api/tree/{projeto}/branch-support`.

O contrato que estes testes travam: nenhum valor de suporte sai da API sem o
método e a métrica que o produziram, e método sem métrica devolve `null` com
motivo, não `0`.
"""

import pytest

PROJETO = "Variola_VARV49_reexec_20260901"


@pytest.fixture(scope="module")
def projeto_existe(projects_root):
    if not (projects_root / PROJETO / "out" / "Trees").is_dir():
        pytest.skip("projeto de referência VARV-49 ausente")
    return PROJETO


async def test_rota_devolve_suporte_com_metrica_por_ramo(client, projeto_existe):
    r = await client.get(f"/api/tree/{PROJETO}/branch-support",
                         params={"tree": "tree_dataset_final_mafft_iqtree.nexus"})
    assert r.status_code == 200
    corpo = r.json()

    assert corpo["projeto"] == PROJETO
    assert len(corpo["arvores"]) == 1
    arvore = corpo["arvores"][0]

    assert arvore["metodo"] == "iqtree"
    assert arvore["metrica"]["id"] == "ufboot"
    assert arvore["ramos"], "a árvore de IQ-TREE tem de trazer ramos com suporte"

    ramo = arvore["ramos"][0]
    assert set(ramo) >= {"clade_id", "valor", "metrica", "metodo", "escala", "taxa"}
    assert ramo["metrica"] == "ufboot"
    assert ramo["metodo"] == "iqtree"


async def test_rota_lista_todas_as_arvores_do_projeto(client, projeto_existe):
    r = await client.get(f"/api/tree/{PROJETO}/branch-support")
    assert r.status_code == 200
    corpo = r.json()

    metodos = {a["metodo"] for a in corpo["arvores"]}
    assert {"iqtree", "fasttree", "raxml", "nj_distance", "upgma_distance"} <= metodos

    # A nota de não-comparabilidade acompanha a resposta inteira.
    assert corpo["comparabilidade"]["entre_metodos"] is False
    assert "não são comparáveis" in corpo["comparabilidade"]["nota"].lower()


async def test_metodo_sem_suporte_devolve_null_e_nao_zero(client, projeto_existe):
    r = await client.get(f"/api/tree/{PROJETO}/branch-support",
                         params={"tree": "tree_dataset_final_mafft_nj_distance.nexus"})
    assert r.status_code == 200
    arvore = r.json()["arvores"][0]

    assert arvore["metrica"] is None
    assert arvore["metrica_ausente_porque"]
    assert arvore["ramos"] == []
    assert arvore["suporte_presente"] is False
    # Nenhum `0` disfarçado de suporte em lugar nenhum do bloco.
    assert arvore["resumo"] is None


async def test_arvore_sem_bootstrap_responde_200_com_aviso(client, projeto_existe):
    """Árvore de RAxML anterior a M3.2 não derruba a rota."""
    r = await client.get(f"/api/tree/{PROJETO}/branch-support",
                         params={"tree": "tree_dataset_final_mafft_raxml.nexus"})
    assert r.status_code == 200
    arvore = r.json()["arvores"][0]

    assert arvore["metrica"]["id"] == "fbp"
    assert arvore["suporte_presente"] is False
    assert arvore["avisos"]


async def test_projeto_inexistente_404(client):
    r = await client.get("/api/tree/projeto-que-nao-existe/branch-support")
    assert r.status_code == 404


async def test_arvore_inexistente_404(client, projeto_existe):
    r = await client.get(f"/api/tree/{PROJETO}/branch-support",
                         params={"tree": "nao_existe.nexus"})
    assert r.status_code == 404


async def test_travessia_de_caminho_recusada(client, projeto_existe):
    r = await client.get(f"/api/tree/{PROJETO}/branch-support",
                         params={"tree": "../../../../etc/passwd"})
    assert r.status_code in (403, 404)
