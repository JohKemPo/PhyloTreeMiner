"""M4.11 — `stream_workflow_output` reescrito com duas tasks + leitura até EOF.

Antes: o laço quebrava assim que `process.returncode is not None`, descartando
o que ainda estivesse no buffer, e fazia busy-poll com `wait_for(timeout=0.1)`
mesmo sem nada para ler. Um processo real (`asyncio.create_subprocess_exec` de
um script Python simples) que emite N linhas e sai tem que ver as N chegarem
ao broadcast — nenhuma perdida.
"""
import asyncio
import sys
import textwrap

import pytest


@pytest.fixture
def script_de_n_linhas(tmp_path):
    def _cria(n: int) -> str:
        caminho = tmp_path / "processo_falso.py"
        caminho.write_text(textwrap.dedent(f"""
            for i in range({n}):
                print(f"linha {{i}}")
            raise SystemExit(0)
        """), encoding="utf-8")
        return str(caminho)
    return _cria


async def test_todas_as_linhas_chegam_ao_broadcast_sem_perda(app_module, script_de_n_linhas):
    n = 50
    script = script_de_n_linhas(n)

    mensagens = []

    async def broadcast_falso(project_name, message):
        mensagens.append(message)

    original_broadcast = app_module.manager.broadcast
    app_module.manager.broadcast = broadcast_falso
    try:
        process = await asyncio.create_subprocess_exec(
            sys.executable, script,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await asyncio.wait_for(
            app_module.stream_workflow_output("projeto-teste-stream", process), timeout=10
        )
    finally:
        app_module.manager.broadcast = original_broadcast

    linhas_recebidas = [
        m["payload"]["message"] for m in mensagens if m.get("type") == "progress_update"
    ]
    esperadas = [f"linha {i}" for i in range(n)]
    assert linhas_recebidas == esperadas

    finais = [m for m in mensagens if m["type"] == "workflow_complete"]
    assert len(finais) == 1


async def test_processo_com_saida_nao_zero_ainda_drena_o_buffer(app_module, tmp_path):
    script = tmp_path / "processo_falha.py"
    script.write_text(textwrap.dedent("""
        import sys
        for i in range(20):
            print(f"linha {i}")
        sys.exit(1)
    """), encoding="utf-8")

    mensagens = []

    async def broadcast_falso(project_name, message):
        mensagens.append(message)

    original_broadcast = app_module.manager.broadcast
    app_module.manager.broadcast = broadcast_falso
    try:
        process = await asyncio.create_subprocess_exec(
            sys.executable, str(script),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await asyncio.wait_for(
            app_module.stream_workflow_output("projeto-teste-stream-falha", process), timeout=10
        )
    finally:
        app_module.manager.broadcast = original_broadcast

    linhas_recebidas = [
        m["payload"]["message"] for m in mensagens if m.get("type") == "progress_update"
    ]
    assert linhas_recebidas == [f"linha {i}" for i in range(20)]

    finais = [m for m in mensagens if m["type"] == "workflow_failed"]
    assert len(finais) == 1
