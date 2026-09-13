# routers/system_router.py — rotas de sistema (Arq-B/M5).
#
# Movidas de app.py sem mudar comportamento: `HEAD /`, `GET /api/system/health`
# e `WS /ws/system-performance`. A lógica de negócio de `/api/system/health`
# mora em `services/system_service.py`; este módulo só traduz HTTP.
import asyncio
from typing import List

import psutil
from fastapi import APIRouter, Response, WebSocket, WebSocketDisconnect

from src import config as cfg
from src.logging_conf import obter_logger
from src.seguranca import fechar_se_origem_nao_permitida
from src.services.system_service import montar_system_health

router = APIRouter()
logger = obter_logger(__name__)


@router.head("/")
def read_root_head():
    return Response(content="Bem-vindo à API FastAPI!", status_code=200)


@router.get("/api/system/health")
async def system_health():
    """Retorna status detalhado de todos os projetos e processos"""
    return await montar_system_health(cfg.PROJECTS_ROOT)


# Estado do WebSocket de performance (Arq-B/M5): eram globais de app.py.
# `tests/api/test_event_loop.py` chama `app_module.performance_watcher()` e
# mutua `app_module.performance_clients` diretamente — ambos reexportados pelo
# mesmo objeto/lista em app.py, então continuam válidos depois da mudança.
performance_clients: List[WebSocket] = []
performance_watcher_task: asyncio.Task = None


async def performance_watcher():
    """Coleta e transmite métricas de performance do sistema."""
    NETWORK_MAX_BPS = 10**9

    while True:
        if not performance_clients:
            break

        # `interval=1` bloqueava o event loop inteiro por 1s a cada ciclo, com
        # todo cliente WS conectado (M4.8). `interval=None` não bloqueia — só
        # compara contra a chamada anterior — e o `sleep` abaixo mantém o ritmo.
        cpu_usage = psutil.cpu_percent(interval=None)
        memory_info = psutil.virtual_memory()
        disk_info = psutil.disk_usage('/')

        message = {
            "cpu": cpu_usage,
            "memory": memory_info.percent,
            "disk": disk_info.percent,
        }

        for client in performance_clients[:]:
            try:
                await client.send_json(message)
            except Exception:
                performance_clients.remove(client)

        await asyncio.sleep(1)

    global performance_watcher_task
    performance_watcher_task = None
    logger.info("Observador de performance encerrado.")

@router.websocket("/ws/system-performance")
async def websocket_performance_endpoint(websocket: WebSocket):
    """
    WebSocket para monitoramento de métricas do sistema em tempo real.

    Retorna periodicamente:
        - **cpu**: Uso de CPU em porcentagem
        - **memory**: Uso de memória RAM em porcentagem
        - **disk**: Uso de disco em porcentagem
    """
    global performance_watcher_task
    if await fechar_se_origem_nao_permitida(websocket):
        return

    await websocket.accept()
    performance_clients.append(websocket)

    if performance_watcher_task is None or performance_watcher_task.done():
        logger.info("Iniciando observador de performance.")
        performance_watcher_task = asyncio.create_task(performance_watcher())

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        performance_clients.remove(websocket)
        logger.info("Cliente de performance desconectado.")
