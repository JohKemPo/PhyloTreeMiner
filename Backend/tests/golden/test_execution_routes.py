"""Caracterização das rotas de projeto/execução, ANTES de movê-las de app.py
para routers/execution_router.py + services/execution_service.py (Arq-B/M5).

`/projects` já tem golden (`test_golden_endpoints.py::test_projects_listing`).
`DELETE /projects/{nome}` já tem contrato extenso (`test_project_delete.py`).
`/projects/{nome}/run` tem contrato de segurança (`test_security_endpoints.py`,
`test_rate_limit.py`) cobrindo os caminhos de nome inválido — mas nenhum teste
cobria o CAMINHO FELIZ (202 + subprocess). `/projects/status`,
`/projects/details` e `/projects/{nome}/can-rerun` não tinham NENHUM teste de
endpoint (só `resolver_estado` isolado, em `tests/unit/test_execution_state.py`).
Este arquivo fecha essas lacunas antes da extração.

IMPORTANTE (Arq-B/M5): estes testes monkeypatcham `app_module.PROJECTS_ROOT`
enquanto o código ainda mora em app.py. Depois da extração para
routers/execution_router.py, o alvo do monkeypatch muda para
`src.config.PROJECTS_ROOT` (ver comentário em src/config.py) — o snapshot e as
asserções NÃO mudam, só onde o teste planta o `PROJECTS_ROOT` isolado.
"""
import asyncio
import json

import pytest

from src import config as _config


def _projeto(tmp_path, nome, linhas=None, manifesto=None, config_backup=None):
    raiz = tmp_path / nome
    outputs = raiz / "out" / "outputs"
    outputs.mkdir(parents=True)
    (raiz / "out" / "Trees").mkdir()
    if linhas is not None:
        (outputs / "log_setup_2026_8_26.log").write_text("\n".join(linhas) + "\n", encoding="utf-8")
    if manifesto is not None:
        (outputs / "manifest.json").write_text(json.dumps(manifesto), encoding="utf-8")
    if config_backup is not None:
        (outputs / "config_backup.json").write_text(json.dumps(config_backup), encoding="utf-8")
    return raiz


@pytest.fixture
def projetos(tmp_path, app_module, monkeypatch):
    """Dois projetos sintéticos: um nunca rodado, um concluído com config salva.

    Arq-B/M5: estas rotas foram para routers/execution_router.py, que lê
    `PROJECTS_ROOT` via `cfg.PROJECTS_ROOT` (acesso qualificado ao módulo
    `src.config`, em tempo de chamada) — o isolamento é feito ali, não em
    `app_module` (ver comentário em src/config.py)."""
    monkeypatch.setattr(_config, "PROJECTS_ROOT", str(tmp_path))
    _projeto(tmp_path, "nunca_rodou")
    _projeto(
        tmp_path, "concluido",
        linhas=["STEP: Completed successfully!"],
        config_backup={"configs": {"tree_config": {"input_path": "x"}}},
    )
    return tmp_path


class ProcessoFalso:
    """Substitui `asyncio.subprocess.Process`: EOF imediato em stdout/stderr,
    saída 0 — o suficiente para `stream_workflow_output` drenar e retornar
    sem depender de um processo real."""
    def __init__(self):
        self.stdout = _StreamFalso()
        self.stderr = _StreamFalso()

    async def wait(self):
        return 0


class _StreamFalso:
    async def readline(self):
        return b""


@pytest.mark.golden
async def test_projects_status_estados(client, projetos):
    r = await client.get("/projects/status")
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["nunca_rodou"] == "never_run"
    assert corpo["concluido"] == "completed"


@pytest.mark.golden
async def test_projects_details_campos(client, projetos):
    r = await client.post("/projects/details", json=["nunca_rodou", "concluido"])
    assert r.status_code == 200
    corpo = r.json()
    assert set(corpo.keys()) == {"nunca_rodou", "concluido"}
    assert corpo["nunca_rodou"]["state"] == "never_run"
    assert corpo["nunca_rodou"]["trees_built"] == 0
    assert corpo["concluido"]["state"] == "completed"


@pytest.mark.golden
async def test_can_rerun_com_config_salva(client, projetos):
    r = await client.get("/projects/concluido/can-rerun")
    assert r.status_code == 200
    assert r.json() == {"can_rerun": True}


@pytest.mark.golden
async def test_can_rerun_sem_config_salva(client, projetos):
    r = await client.get("/projects/nunca_rodou/can-rerun")
    assert r.status_code == 200
    assert r.json() == {"can_rerun": False, "reason": "Configurações não salvas"}


@pytest.mark.golden
async def test_can_rerun_projeto_inexistente(client, projetos):
    r = await client.get("/projects/nao-existe/can-rerun")
    assert r.status_code == 200
    assert r.json() == {"can_rerun": False, "reason": "Projeto não encontrado"}


@pytest.mark.golden
async def test_run_caminho_feliz_202(client, projetos, app_module, monkeypatch):
    """CARACTERIZAÇÃO: nenhum teste cobria o 202 de verdade — só os 400/403/404
    de nome inválido (test_security_endpoints.py). O subprocess é substituído;
    o que se caracteriza é a resposta HTTP e o registro em `running_workflows`."""
    async def fake_create_subprocess_exec(*args, **kwargs):
        return ProcessoFalso()

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_create_subprocess_exec)

    payload = {
        "configs": {
            "tree_config": {"input_path": "algum/dataset"},
            "subtree_config": {"subtree_miner_configs": {}},
        }
    }
    try:
        r = await client.post("/projects/nunca_rodou/run", json=payload)
        assert r.status_code == 202
        assert r.json() == {"message": "Workflow para o projeto 'nunca_rodou' iniciado com sucesso."}
        assert "nunca_rodou" in app_module.running_workflows
    finally:
        app_module.running_workflows.pop("nunca_rodou", None)


@pytest.mark.golden
async def test_run_projeto_ja_rodando_409(client, projetos, app_module):
    app_module.running_workflows["concluido"] = object()
    try:
        r = await client.post("/projects/concluido/run", json={
            "configs": {"tree_config": {"input_path": "x"},
                        "subtree_config": {"subtree_miner_configs": {}}}
        })
        assert r.status_code == 409
    finally:
        del app_module.running_workflows["concluido"]


@pytest.mark.golden
async def test_rerun_caminho_feliz_202(client, projetos, app_module, monkeypatch):
    async def fake_create_subprocess_exec(*args, **kwargs):
        return ProcessoFalso()

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_create_subprocess_exec)

    try:
        r = await client.post("/projects/concluido/rerun")
        assert r.status_code == 202
        assert r.json() == {"message": "Workflow do projeto 'concluido' reexecutado com sucesso."}
    finally:
        # `stream_workflow_output`, disparado via `create_task`, remove a
        # entrada sozinho ao terminar — mas de forma assíncrona, sem garantia
        # de ordem com o fim deste teste. Limpa explicitamente para não
        # vazar estado para o próximo teste (mesmo dict global).
        app_module.running_workflows.pop("concluido", None)


@pytest.mark.golden
async def test_rerun_sem_config_backup_404(client, projetos):
    r = await client.post("/projects/nunca_rodou/rerun")
    assert r.status_code == 404
