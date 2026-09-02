"""M4.5 — os dois WebSocket fecham com 1008 quando a origem não está em ALLOWED_ORIGINS.

`CORSMiddleware` não protege WebSocket; a allowlist é reaproveitada manualmente
em `_fechar_se_origem_nao_permitida` (`app.py`). Usa `TestClient` (síncrono),
porque `httpx.AsyncClient` não fala o protocolo de WebSocket.
"""
import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect


@pytest.fixture
def origem_permitida(app_module):
    return app_module.ALLOWED_ORIGINS[0]


def test_progress_recusa_origem_fora_da_allowlist(app_module):
    with TestClient(app_module.app) as tc:
        with pytest.raises(WebSocketDisconnect) as exc_info:
            with tc.websocket_connect(
                "/ws/progress/qualquer-projeto",
                headers={"origin": "http://evil.example.com"},
            ):
                pass
        assert exc_info.value.code == 1008


def test_progress_aceita_origem_da_allowlist(app_module, origem_permitida):
    with TestClient(app_module.app) as tc:
        with tc.websocket_connect(
            "/ws/progress/qualquer-projeto",
            headers={"origin": origem_permitida},
        ) as ws:
            ws.close()


def test_performance_recusa_origem_fora_da_allowlist(app_module):
    with TestClient(app_module.app) as tc:
        with pytest.raises(WebSocketDisconnect) as exc_info:
            with tc.websocket_connect(
                "/ws/system-performance",
                headers={"origin": "http://evil.example.com"},
            ):
                pass
        assert exc_info.value.code == 1008


def test_performance_aceita_origem_da_allowlist(app_module, origem_permitida):
    with TestClient(app_module.app) as tc:
        with tc.websocket_connect(
            "/ws/system-performance",
            headers={"origin": origem_permitida},
        ) as ws:
            ws.close()
