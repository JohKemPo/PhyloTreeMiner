"""Caracterização de `/dataFolders`, `/inputs_data` e `/uploaded-data`, ANTES
de movê-las de app.py para routers/input_data_router.py (Arq-B/M5). Nenhuma
das três tinha qualquer teste — `/browse`, `/file`, `/api/file/paginated` e
`/upload-data` já têm cobertura extensa de contrato
(tests/api/test_security_endpoints.py, test_previa_de_json.py,
test_limites_entrada.py, test_upload_seguranca.py, test_rate_limit.py) e não
são repetidos aqui.

CARACTERIZAÇÃO, não especificação: `/inputs_data` ignora o parâmetro `path` e
sempre lista `PATH_BASE_WORKFLOW/data` (bug real, registrado para a fila de
triagem — não corrigido nesta fatia, que é refatoração pura).
"""
import json

import pytest

from src import config as _config


@pytest.fixture
def raiz_isolada(tmp_path, app_module, monkeypatch):
    """Isola DATA_ROOT e PROJECTS_ROOT num diretório descartável — as três
    rotas listam diretórios de verdade, e não devem varrer os dados reais.

    Arq-B/M5: as três rotas foram para routers/input_data_router.py, que lê
    DATA_ROOT/PROJECTS_ROOT via `cfg.*` (acesso qualificado a `src.config`,
    em tempo de chamada) — o isolamento é feito ali, não em `app_module`."""
    data_root = tmp_path / "data"
    projects_root = tmp_path / "projects"
    data_root.mkdir()
    projects_root.mkdir()
    (data_root / "conjunto_a").mkdir()
    (data_root / "conjunto_a" / "seqs.fasta").write_text(">a\nACGT\n", encoding="utf-8")
    (data_root / "conjunto_vazio").mkdir()
    monkeypatch.setattr(_config, "DATA_ROOT", str(data_root))
    monkeypatch.setattr(_config, "PROJECTS_ROOT", str(projects_root))
    return data_root, projects_root


@pytest.mark.golden
async def test_data_folders_lista_diretorios(client, raiz_isolada):
    r = await client.get("/dataFolders")
    assert r.status_code == 200
    nomes = sorted(p["name"] for p in r.json())
    assert nomes == ["conjunto_a", "conjunto_vazio"]


@pytest.mark.golden
async def test_inputs_data_ignora_o_parametro_path(client, raiz_isolada):
    """CARACTERIZAÇÃO do bug: `path=qualquer-coisa` não muda a resposta —
    a rota sempre lista PATH_BASE_WORKFLOW/data, nunca PROJECTS_ROOT."""
    r1 = await client.get("/inputs_data", params={"path": ""})
    r2 = await client.get("/inputs_data", params={"path": "isto-nao-existe"})
    assert r1.status_code == r2.status_code == 200
    assert r1.json() == r2.json()


@pytest.mark.golden
async def test_uploaded_data_so_lista_pasta_com_algum_arquivo(client, raiz_isolada):
    """`conjunto_vazio` (sem nenhum arquivo) fica de fora — a rota só lista
    pastas em que `glob` encontrou pelo menos um item."""
    r = await client.get("/uploaded-data")
    assert r.status_code == 200
    nomes = sorted(p["name"] for p in r.json())
    assert nomes == ["conjunto_a"]
