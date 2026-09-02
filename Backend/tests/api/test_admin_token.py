"""M4.4 — `ADMIN_TOKEN` protege `/api/ncbi/set-email` e `/neo4j/connect` (S-5/DEC-004)."""
import pytest


@pytest.fixture
def admin_token(monkeypatch):
    monkeypatch.setenv("ADMIN_TOKEN", "segredo-de-teste")
    return "segredo-de-teste"


ROTAS = [
    ("post", "/api/ncbi/set-email", {"data": {"email": "teste@exemplo.com"}}),
    ("post", "/api/neo4j/connect", {"json": {"uri": "bolt://localhost:7687", "username": "neo4j"}}),
]


@pytest.mark.security
@pytest.mark.parametrize("metodo,rota,kwargs", ROTAS)
async def test_sem_header_401(client, admin_token, metodo, rota, kwargs):
    r = await getattr(client, metodo)(rota, **kwargs)
    assert r.status_code == 401


@pytest.mark.security
@pytest.mark.parametrize("metodo,rota,kwargs", ROTAS)
async def test_token_errado_401(client, admin_token, metodo, rota, kwargs):
    r = await getattr(client, metodo)(rota, headers={"X-Admin-Token": "errado"}, **kwargs)
    assert r.status_code == 401


@pytest.mark.security
async def test_sem_admin_token_configurado_recusa_por_padrao(client, monkeypatch):
    """Sem ADMIN_TOKEN no ambiente, a rota nunca fica aberta por omissão."""
    monkeypatch.delenv("ADMIN_TOKEN", raising=False)
    r = await client.post(
        "/api/ncbi/set-email",
        headers={"X-Admin-Token": "qualquer-coisa"},
        data={"email": "teste@exemplo.com"},
    )
    assert r.status_code == 401


@pytest.mark.security
async def test_token_correto_set_email_passa(client, admin_token):
    r = await client.post(
        "/api/ncbi/set-email",
        headers={"X-Admin-Token": admin_token},
        data={"email": "teste@exemplo.com"},
    )
    assert r.status_code != 401


@pytest.mark.security
async def test_token_correto_neo4j_connect_passa(client, admin_token):
    r = await client.post(
        "/api/neo4j/connect",
        headers={"X-Admin-Token": admin_token},
        json={"uri": "bolt://localhost:7687", "username": "neo4j"},
    )
    assert r.status_code != 401
