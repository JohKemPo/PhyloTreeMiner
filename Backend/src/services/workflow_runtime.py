"""Estado de execução de workflow, compartilhado entre módulos (Arq-B/M5).

`running_workflows`, `manager` (`ProgressConnectionManager`) e
`active_watchers` eram variáveis globais de `app.py`, referenciadas por rotas
que hoje vivem em módulos diferentes (`routers/execution_router.py`,
`routers/system_router.py`, e ainda `/ws/system-performance` em `app.py`).
Extrair para cá é puramente estrutural — nenhum handler muda de
comportamento — e necessário porque mais de um módulo precisa do MESMO
dicionário/instância mutável, não de cópias (o mesmo raciocínio de D5 que já
guiava a extração de `ALIGNERS`: duas fontes de verdade sobre o mesmo estado).

Este módulo faz uma exceção pontual à regra "serviço não conhece FastAPI"
(docs/agents/03-backend-core.md §5): `ProgressConnectionManager` precisa do
tipo `WebSocket` para `.accept()`/`.send_json()` — é bookkeeping de conexão,
não decisão de status HTTP (nenhum `HTTPException`/`Request`/`Response` aqui).
"""
import asyncio
from typing import Dict, List

from fastapi import WebSocket

from src.logging_conf import obter_logger

logger = obter_logger(__name__)


class ProgressConnectionManager:
    """Gerencia as conexões de WebSocket por projeto."""
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, project_name: str, websocket: WebSocket):
        await websocket.accept()
        if project_name not in self.active_connections:
            self.active_connections[project_name] = []
        self.active_connections[project_name].append(websocket)
        logger.info("Cliente conectado ao projeto: %s", project_name)

    def disconnect(self, project_name: str, websocket: WebSocket):
        if project_name in self.active_connections:
            self.active_connections[project_name].remove(websocket)
            if not self.active_connections[project_name]:
                del self.active_connections[project_name]
        logger.info("Cliente desconectado do projeto: %s", project_name)

    async def broadcast(self, project_name: str, message: dict):
        """Envia uma mensagem JSON para todos os clientes de um projeto."""
        if project_name in self.active_connections:
            for connection in self.active_connections[project_name][:]:
                try:
                    await connection.send_json(message)
                except Exception:
                    self.active_connections[project_name].remove(connection)


manager = ProgressConnectionManager()
active_watchers: Dict[str, asyncio.Task] = {}
running_workflows: Dict[str, asyncio.subprocess.Process] = {}
