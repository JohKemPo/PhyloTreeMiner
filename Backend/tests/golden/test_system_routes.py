"""Caracterização das rotas de sistema, ANTES de movê-las para routers/system.py
(Arq-B/M5). Não havia snapshot nem teste de contrato para `HEAD /` nem para
`/api/system/health` — a regra 4 do CLAUDE.md exige caracterizar antes de mover.

`/api/aligners` e `/api/aligners/viability` já têm cobertura extensa de
contrato em tests/api/test_alinhadores.py (todo campo, toda branch de status),
escrita antes deste lote — não duplicada aqui.
"""
import pathlib

import pytest


@pytest.mark.golden
async def test_head_raiz(client):
    """CARACTERIZAÇÃO: `HEAD /` responde 200. O corpo declarado no handler
    (`Response(content="Bem-vindo à API FastAPI!", ...)`) é descartado pelo
    protocolo HTTP em respostas de HEAD — o que se observa aqui é status e
    ausência de corpo, não o texto."""
    r = await client.head("/")
    assert r.status_code == 200
    assert r.content == b""


@pytest.mark.golden
async def test_system_health_estrutura(client, app_module, snapshot):
    """`/api/system/health` varre `PROJECTS_ROOT` a cada chamada — o conjunto de
    projetos é local de cada máquina (mesmo motivo de `test_projects_listing`).
    Snapshot da ESTRUTURA de cada entrada (as mesmas quatro chaves sempre
    presentes), não da lista de projetos em si; `timestamp` e
    `running_workflows` são removidos por serem voláteis por natureza."""
    r = await client.get("/api/system/health")
    assert r.status_code == 200
    corpo = r.json()

    assert set(corpo.keys()) == {"timestamp", "running_workflows", "projects_status"}
    assert corpo["running_workflows"] == [], (
        "nenhum workflow deveria estar rodando durante o teste"
    )

    projetos_em_disco = {
        p.name for p in pathlib.Path(app_module.PROJECTS_ROOT).iterdir() if p.is_dir()
    }
    assert set(corpo["projects_status"].keys()) == projetos_em_disco

    formas = set()
    for status in corpo["projects_status"].values():
        formas.add(tuple(sorted(status.keys())))
    # Toda entrada tem a MESMA forma-base; `latest_log`/`log_size`/`log_modified`
    # só aparecem quando há log (chaves opcionais, não uma quarta forma fixa).
    base = {"exists", "has_outputs", "log_files", "process_running"}
    for forma in formas:
        assert base <= set(forma), f"entrada sem as chaves-base: {forma}"

    snapshot("system_health_formas", sorted(str(f) for f in formas))
