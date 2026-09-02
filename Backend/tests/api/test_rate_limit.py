"""M4.7 — rate limiting anônimo por IP nas rotas de escrita (S-5/DEC-004)."""
import pytest

import src.seguranca as seguranca_module


@pytest.fixture(autouse=True)
def limite_baixo_e_isolado(monkeypatch):
    """N pequeno para não precisar de N+1 requisições reais na suíte inteira,
    e contador limpo entre casos — o dicionário do limitador é module-level."""
    monkeypatch.setattr(seguranca_module, "RATE_LIMITE_MAX_REQUISICOES", 3)
    monkeypatch.setattr(seguranca_module, "RATE_LIMITE_JANELA_SEGUNDOS", 60.0)
    seguranca_module.resetar_limitador()
    yield
    seguranca_module.resetar_limitador()


@pytest.fixture(autouse=True)
def data_root_isolado(app_module, tmp_path, monkeypatch):
    monkeypatch.setattr(app_module, "DATA_ROOT", str(tmp_path))


async def test_upload_data_429_apos_n_mais_1(client):
    payload = {"name": "projeto-rate"}
    arquivo = {"files": ("s.fasta", b">s\nACGT\n", "text/plain")}
    respostas = [await client.post("/upload-data", data=payload, files=arquivo) for _ in range(3)]
    assert all(r.status_code != 429 for r in respostas)

    r_extra = await client.post("/upload-data", data=payload, files=arquivo)
    assert r_extra.status_code == 429
    assert r_extra.headers.get("Retry-After")


async def test_cql_batch_429_apos_n_mais_1(client):
    # O lifespan não roda sob ASGITransport (ver tests/conftest.py); sem isso a
    # dependência do serviço de lote falha antes de chegar no rate limiter.
    from src.services.cql_batch_service import init_cql_batch_service
    init_cql_batch_service()

    payload = {"project_name": "projeto-rate", "cql_content": "MATCH (n) RETURN n LIMIT 1;"}
    respostas = [await client.post("/api/cql-batch/execute-batch", json=payload) for _ in range(3)]
    assert all(r.status_code != 429 for r in respostas)

    r_extra = await client.post("/api/cql-batch/execute-batch", json=payload)
    assert r_extra.status_code == 429
    assert r_extra.headers.get("Retry-After")


async def test_contadores_de_rotas_diferentes_sao_isolados(client):
    """Esgotar `/upload-data` não deve afetar `/projects/{nome}/run`."""
    payload = {"name": "projeto-rate"}
    arquivo = {"files": ("s.fasta", b">s\nACGT\n", "text/plain")}
    for _ in range(4):
        await client.post("/upload-data", data=payload, files=arquivo)

    r = await client.post("/projects/projeto-inexistente/run", json={"configs": {}})
    assert r.status_code != 429
