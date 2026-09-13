"""Caracterização de `/api/owid/metadata/` e `/api/tree/{p}/node/{node_id}`,
ANTES de movê-las de app.py para routers/tree_router.py +
services/tree_metadata_service.py (Arq-B/M5). Nenhuma das duas tinha
qualquer teste — nem contrato, nem golden.

`/api/tree/{p}/search-nodes` já tem golden
(`test_golden_endpoints.py::test_d13_nenhum_taxon_perde_metadado_por_truncamento`);
`/api/tree/{p}/insights` e `/api/tree/metadata/{p}` também. Não repetidos aqui.
"""
import pathlib

import pytest

PROJETO = "Variola_Yu_li_2007_noITRs_6seqs"


@pytest.fixture(scope="module")
def projeto_existe(request):
    import src.app as A
    p = pathlib.Path(A.PROJECTS_ROOT) / PROJETO
    if not p.is_dir():
        pytest.skip(f"projeto de referência {PROJETO} ausente")
    return p


@pytest.mark.golden
async def test_owid_metadata_dict_vazio_200(client):
    """CARACTERIZAÇÃO: `{}` é um payload degenerado (nenhuma sequência OWID
    reconhecida) mas válido — a análise não levanta, só relata zero dados."""
    r = await client.post("/api/owid/metadata/", json={})
    assert r.status_code == 200
    corpo = r.json()
    assert set(corpo.keys()) == {
        "analysis_metadata", "summary_statistics",
        "support_epidemiology_correlation", "sequence_analysis", "recommendations",
    }


@pytest.mark.golden
async def test_owid_metadata_json_invalido_400_nao_500(client):
    """C-2: o handler já tem `except HTTPException: raise` — mas um corpo que
    não é JSON válido tem de virar 400, não vazar como 500."""
    r = await client.post(
        "/api/owid/metadata/",
        content=b"isto nao e json",
        headers={"content-type": "application/json"},
    )
    assert r.status_code == 400


@pytest.mark.golden
async def test_node_details_existente(client, projeto_existe):
    r = await client.get(f"/api/tree/{PROJETO}/search-nodes")
    assert r.status_code == 200
    algum_id = r.json()[0]["accessionId"]

    r2 = await client.get(f"/api/tree/{PROJETO}/node/{algum_id}")
    assert r2.status_code == 200
    assert r2.json()["accessionId"] == algum_id


@pytest.mark.golden
async def test_node_details_inexistente_404(client, projeto_existe):
    r = await client.get(f"/api/tree/{PROJETO}/node/nao-existe-de-verdade")
    assert r.status_code == 404


@pytest.mark.golden
async def test_node_details_projeto_sem_metadata_404(client):
    r = await client.get("/api/tree/projeto-sem-metadata-nenhum/node/x")
    assert r.status_code == 404
