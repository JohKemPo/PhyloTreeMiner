"""M4.8 — `psutil.cpu_percent(interval=1)` bloqueava o event loop por 1s a
cada ciclo do `performance_watcher`, com todo cliente WS conectado. A troca
para `interval=None` + `asyncio.sleep(1)` não deve travar outras rotas.
"""
import asyncio
import time


class _ClienteWSFalso:
    async def send_json(self, msg):
        pass


async def test_rota_simples_responde_com_watcher_ativo(client, app_module):
    # A task tem que nascer na própria corrotina do teste, sem `yield` de
    # fixture nem `await` intermediário antes da requisição cronometrada: tanto
    # um `sleep(0)` quanto o boundary de uma fixture async cedem o loop, e
    # nesse intervalo a task já roda seu ciclo bloqueante inteiro sozinha —
    # sem concorrência com a requisição, escondendo a regressão que este teste
    # existe para pegar. `asyncio.wait_for` também não serve de guarda: o timer
    # só dispara quando o loop volta a rodar, e um `time.sleep` síncrono trava
    # o loop inteiro, timer incluso. A medição tem que ser a duração real.
    app_module.performance_clients.clear()
    app_module.performance_clients.append(_ClienteWSFalso())
    task = asyncio.create_task(app_module.performance_watcher())
    try:
        inicio = time.monotonic()
        r = await client.head("/")
        duracao = time.monotonic() - inicio

        assert r.status_code == 200
        assert duracao < 0.5, (
            f"HEAD / levou {duracao:.2f}s com o watcher ativo — "
            "event loop bloqueado (regressão para psutil.cpu_percent(interval=1))"
        )
    finally:
        app_module.performance_clients.clear()
        task.cancel()
