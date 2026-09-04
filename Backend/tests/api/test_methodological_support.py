"""M3.3 — a rota `/api/tree/{projeto}/methodological-support`.

O contrato que estes testes travam: o suporte metodológico nunca é confundido
com bootstrap (rotas e campos distintos), `M` é o tamanho real do universo em
disco, e um alinhador inexistente é 404 — nunca uma lista vazia silenciosa.
"""

import pytest

PROJETO = "Variola_VARV52_reexec_20260903"


@pytest.fixture(scope="module")
def projeto_existe(projects_root):
    if not (projects_root / PROJETO / "out" / "Trees").is_dir():
        pytest.skip("projeto de referência VARV-52 ausente")
    return PROJETO


async def test_rota_devolve_suporte_por_clado(client, projeto_existe):
    r = await client.get(f"/api/tree/{PROJETO}/methodological-support")
    assert r.status_code == 200
    corpo = r.json()

    assert corpo["projeto"] == PROJETO
    assert corpo["M"] == len(corpo["pipelines"])
    assert corpo["n_clados"] == len(corpo["clados"])
    assert corpo["clados"], "conjunto de referência tem de ter clados recuperados"

    clado = corpo["clados"][0]
    assert set(clado) >= {"clade_id", "digest", "n_taxa", "taxa", "pipelines", "suporte"}
    assert 0.0 <= clado["suporte"] <= 1.0


async def test_alinhador_restringe_o_universo(client, projeto_existe):
    todos = (await client.get(f"/api/tree/{PROJETO}/methodological-support")).json()
    algum = next(iter({p.split("_", 1)[0] for p in todos["pipelines"]}))

    r = await client.get(f"/api/tree/{PROJETO}/methodological-support",
                         params={"alinhador": algum})
    assert r.status_code == 200
    corpo = r.json()

    assert corpo["alinhador"] == algum
    assert corpo["M"] < todos["M"]


async def test_alinhador_inexistente_404(client, projeto_existe):
    r = await client.get(f"/api/tree/{PROJETO}/methodological-support",
                         params={"alinhador": "clustalo-que-nao-existe"})
    assert r.status_code == 404


async def test_projeto_inexistente_404(client):
    r = await client.get("/api/tree/projeto-que-nao-existe/methodological-support")
    assert r.status_code == 404


async def test_travessia_de_caminho_recusada(client, projeto_existe):
    r = await client.get("/api/tree/../../../etc/methodological-support")
    assert r.status_code in (403, 404)
