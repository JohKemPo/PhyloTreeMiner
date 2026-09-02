"""S-2 pelos endpoints: traversal, nome de projeto e upload."""
import pytest

TRAVERSAL = ["../../etc", "../..", "/etc", "a/../../../etc"]

# `..%2F..` chega ao servidor como literal (o cliente escapa o %), então não é
# traversal nesta camada — mas também não pode devolver conteúdo.
LITERAIS_SUSPEITOS = ["..%2F..%2Fetc", "....//....//etc"]


@pytest.mark.security
@pytest.mark.parametrize("path", TRAVERSAL)
async def test_browse_recusa_traversal(client, path):
    r = await client.get("/browse", params={"path": path})
    assert r.status_code == 403, f"esperado 403 para {path!r}, veio {r.status_code}"


@pytest.mark.security
@pytest.mark.parametrize("path", TRAVERSAL)
async def test_file_recusa_traversal(client, path):
    r = await client.get("/file", params={"path": path})
    assert r.status_code == 403, f"esperado 403 para {path!r}, veio {r.status_code}"


@pytest.mark.security
@pytest.mark.parametrize("path", TRAVERSAL)
async def test_paginated_recusa_traversal(client, path):
    r = await client.get("/api/file/paginated", params={"path": path, "page": 1})
    assert r.status_code == 403, f"esperado 403 para {path!r}, veio {r.status_code}"


@pytest.mark.security
@pytest.mark.parametrize("path", LITERAIS_SUSPEITOS)
async def test_literais_suspeitos_nunca_devolvem_conteudo(client, path):
    for rota in ("/browse", "/file"):
        r = await client.get(rota, params={"path": path})
        assert r.status_code != 200, f"{rota} devolveu 200 para {path!r}"


@pytest.mark.security
@pytest.mark.parametrize("nome", ["../outro", "a/b", "nome com espaco", "x;rm -rf"])
async def test_run_recusa_nome_de_projeto_invalido(client, nome):
    r = await client.post(f"/projects/{nome}/run", json={"configs": {}})
    assert r.status_code in (400, 403, 404), (
        f"nome inválido {nome!r} devolveu {r.status_code}; esperado 400/403/404"
    )
    assert r.status_code != 202, "workflow iniciado com nome de projeto inválido"


@pytest.mark.security
async def test_set_email_invalido_devolve_400_e_nao_500(client, monkeypatch):
    """C-2: o try/except que envolve a validação converte o 400 em 500.

    Desde M4.4 a rota exige X-Admin-Token; o teste autentica para exercitar a
    validação em si, não o gate de admin (coberto por test_admin_token.py).
    """
    monkeypatch.setenv("ADMIN_TOKEN", "segredo-de-teste")
    r = await client.post(
        "/api/ncbi/set-email",
        headers={"X-Admin-Token": "segredo-de-teste"},
        data={"email": "nao-e-email"},
    )
    assert r.status_code == 400, (
        f"esperado 400, veio {r.status_code}. Um HTTPException levantado dentro de "
        f"try/except Exception vira 500 sem o padrão `except HTTPException: raise`."
    )


@pytest.mark.security
async def test_set_email_nao_vaza_excecao_interna(client, monkeypatch):
    monkeypatch.setenv("ADMIN_TOKEN", "segredo-de-teste")
    r = await client.post(
        "/api/ncbi/set-email",
        headers={"X-Admin-Token": "segredo-de-teste"},
        data={"email": "x"},
    )
    corpo = r.text.lower()
    for vazamento in ("traceback", "file \"/", "/home/"):
        assert vazamento not in corpo, f"resposta vaza interno: {vazamento!r}"
