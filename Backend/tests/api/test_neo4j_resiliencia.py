"""M4.1 — Neo4j indisponível devolve 503 com Retry-After, não [] mudo nem 500 genérico."""
import pytest


@pytest.fixture
def neo4j_desconectado(app_module):
    """Força neo4j_service.connected = False para o teste, e restaura ao final."""
    from src.services.neo4j_services import neo4j_service
    original = neo4j_service.connected
    neo4j_service.connected = False
    yield neo4j_service
    neo4j_service.connected = original


async def _assert_503_sem_conexao(resposta):
    assert resposta.status_code == 503
    assert resposta.headers.get("Retry-After")
    corpo = resposta.json()
    assert corpo["detail"]["connected"] is False


async def test_neo4j_query_503(client, neo4j_desconectado):
    r = await client.post(
        "/api/neo4j/query",
        json={"query": "MATCH (n) RETURN n LIMIT 1"},
        headers={"x-user-id": "user-teste"},
    )
    await _assert_503_sem_conexao(r)


async def test_neo4j_graph_503(client, neo4j_desconectado):
    r = await client.post(
        "/api/neo4j/graph",
        json={"query": "MATCH (n) RETURN n LIMIT 1"},
        headers={"x-user-id": "user-teste"},
    )
    await _assert_503_sem_conexao(r)


async def test_cql_execute_503(client, neo4j_desconectado):
    r = await client.post(
        "/api/cql/execute",
        json={"query": "MATCH (n) RETURN n LIMIT 1"},
    )
    await _assert_503_sem_conexao(r)


async def test_cql_execute_batch_503(client, neo4j_desconectado):
    r = await client.post(
        "/api/cql/execute-batch",
        json={"queries": ["MATCH (n) RETURN n LIMIT 1"]},
    )
    await _assert_503_sem_conexao(r)


async def test_cql_batch_router_execute_batch_503(client, neo4j_desconectado):
    # O lifespan não roda sob ASGITransport (ver tests/conftest.py); sem isso
    # a dependência do serviço de lote falha antes de chegar ao meu 503.
    from src.services.cql_batch_service import init_cql_batch_service
    init_cql_batch_service()

    r = await client.post(
        "/api/cql-batch/execute-batch",
        json={"project_name": "projeto-teste", "cql_content": "MATCH (n) RETURN n;"},
    )
    await _assert_503_sem_conexao(r)
