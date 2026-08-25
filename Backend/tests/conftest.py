import os
import sys
import json
import pathlib

import pytest

BACKEND_DIR = pathlib.Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

SNAPSHOT_DIR = pathlib.Path(__file__).parent / "golden" / "snapshots"


@pytest.fixture(scope="session")
def app_module():
    """Importa src.app uma vez. O lifespan (Neo4j) não roda: os testes usam
    ASGITransport, que não dispara startup."""
    import src.app as app_module
    return app_module


@pytest.fixture(scope="session")
def projects_root(app_module):
    return pathlib.Path(app_module.PROJECTS_ROOT)


@pytest.fixture
async def client(app_module):
    import httpx
    transport = httpx.ASGITransport(app=app_module.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


def _normalizar(valor):
    """Ordena listas para que o snapshot compare conteúdo, não ordem de iteração.

    A ordem de várias respostas depende de iteração sobre `set`/`dict` de
    strings, cujo hash é aleatorizado por processo (ver D14). A estabilidade da
    ordem é verificada separadamente em tests/oracle/test_determinismo.py."""
    if isinstance(valor, dict):
        return {k: _normalizar(valor[k]) for k in sorted(valor, key=str)}
    if isinstance(valor, list):
        itens = [_normalizar(v) for v in valor]
        return sorted(itens, key=lambda v: json.dumps(v, sort_keys=True, default=str))
    return valor


@pytest.fixture
def snapshot(request):
    """Compara contra o snapshot em disco; grava se UPDATE_SNAPSHOTS=1.

    O snapshot caracteriza o comportamento ATUAL, bugs inclusive. Quando um
    snapshot muda, ou a mudança era esperada e o parecer está no ledger, ou há
    regressão."""
    def _check(name, value):
        path = SNAPSHOT_DIR / f"{name}.json"
        payload = json.dumps(_normalizar(value), indent=2, sort_keys=True,
                             ensure_ascii=False, default=str)
        if os.getenv("UPDATE_SNAPSHOTS") == "1" or not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(payload + "\n", encoding="utf-8")
            if os.getenv("UPDATE_SNAPSHOTS") != "1":
                pytest.skip(f"snapshot {name} criado; rode de novo para comparar")
            return
        expected = path.read_text(encoding="utf-8").rstrip("\n")
        assert payload == expected, (
            f"snapshot '{name}' divergiu.\n"
            f"Se a mudança é esperada, registre o parecer no ledger e rode "
            f"UPDATE_SNAPSHOTS=1 pytest."
        )
    return _check


def pytest_report_header(config):
    return "PhyloTreeMiner — harness de verificação (M0)"
