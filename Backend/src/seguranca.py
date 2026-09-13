"""Dependências de segurança compartilhadas do backend.

`exigir_admin` (M4.4) protege rotas de reconfiguração (S-5/DEC-004).
`limitar_taxa` (M4.7) limita anônimos nas rotas de escrita (S-5/DEC-004).
`resolve_within` (M4.?) barra path traversal; usado por várias rotas em
`app.py` e, a partir de Arq-B/M5, também pelos routers extraídos — mora aqui
(e não em `services/`) porque levanta `HTTPException`.
`fechar_se_origem_nao_permitida` (M4.5) reaproveita a allowlist de CORS para
o handshake de WebSocket, que `CORSMiddleware` não cobre.
"""
import os
import secrets
import time
from typing import Dict, Optional, Tuple

from fastapi import Header, HTTPException, Request, WebSocket

from src.config import get_settings, ALLOWED_ORIGINS


async def exigir_admin(x_admin_token: Optional[str] = Header(default=None)):
    """Compara `X-Admin-Token` contra a variável de ambiente `ADMIN_TOKEN`.

    Sem `ADMIN_TOKEN` configurado no ambiente, a rota é recusada — nunca fica
    aberta por omissão de configuração. `secrets.compare_digest` (B3 da
    revisão de M4.4) em vez de `!=`: comparação de string curto-circuita no
    primeiro byte divergente, o que vaza o tamanho do prefixo certo por
    tempo de resposta — pouco prático aqui, mas é o padrão para segredo.

    Compara **bytes**, não `str` (R2, DEC-067): `compare_digest` sobre `str`
    exige ASCII nos dois lados e levanta `TypeError` (não capturado, vira
    500) diante de qualquer byte > 0x7F — e um header HTTP chega decodificado
    em latin-1 pelo Starlette, então basta um `X-Admin-Token` com um byte alto
    para derrubar a rota administrativa. `.encode()` para UTF-8 nunca levanta
    para nenhum `str` de entrada, então a comparação em bytes é total.
    """
    admin_token = get_settings().admin_token
    if not admin_token or not x_admin_token:
        raise HTTPException(status_code=401, detail="Token de administrador ausente ou inválido.")
    if not secrets.compare_digest(x_admin_token.encode("utf-8"), admin_token.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Token de administrador ausente ou inválido.")


# M4.7: janela fixa por IP, em memória — sem Redis nem infraestrutura externa,
# como o lote pede. Não sobrevive a reinício nem a múltiplos workers, o que é
# aceitável para o vetor que fecha: abuso anônimo de um único processo.
RATE_LIMITE_MAX_REQUISICOES = 30
RATE_LIMITE_JANELA_SEGUNDOS = 60.0

_contadores: Dict[Tuple[str, str], Tuple[int, float]] = {}


def resetar_limitador() -> None:
    """Limpa os contadores — usado pelos testes, para isolar uma janela por caso."""
    _contadores.clear()


def limitar_taxa(chave: str):
    """Fábrica de dependency: a `chave` isola o contador por rota.

    `RATE_LIMITE_MAX_REQUISICOES`/`RATE_LIMITE_JANELA_SEGUNDOS` são lidos do
    módulo a cada chamada (não capturados no fechamento), para que os testes
    monkeypatchem o valor sem recriar a rota.
    """
    async def dependency(request: Request):
        ip = request.client.host if request.client else "desconhecido"
        agora = time.monotonic()
        contador_chave = (chave, ip)
        contagem, inicio_janela = _contadores.get(contador_chave, (0, agora))

        if agora - inicio_janela >= RATE_LIMITE_JANELA_SEGUNDOS:
            contagem, inicio_janela = 0, agora

        contagem += 1
        _contadores[contador_chave] = (contagem, inicio_janela)

        if contagem > RATE_LIMITE_MAX_REQUISICOES:
            retry_after = max(1, int(RATE_LIMITE_JANELA_SEGUNDOS - (agora - inicio_janela)))
            raise HTTPException(
                status_code=429,
                detail="Muitas requisições. Tente novamente mais tarde.",
                headers={"Retry-After": str(retry_after)},
            )

    return dependency


def resolve_within(base: str, *parts: str) -> str:
    """Resolve base/parts e garante que o resultado permanece dentro de base.

    Movido de `app.py` (Arq-B/M5), literal — nenhuma condição mudou."""
    base = os.path.abspath(base)
    target = os.path.abspath(os.path.join(base, *parts))
    try:
        if os.path.commonpath([base, target]) != base:
            raise HTTPException(status_code=403, detail="Acesso negado: caminho fora do diretório permitido.")
    except ValueError:
        raise HTTPException(status_code=403, detail="Acesso negado: caminho fora do diretório permitido.")
    return target


async def fechar_se_origem_nao_permitida(websocket: WebSocket) -> bool:
    """M4.5: reaproveita a allowlist de CORS para o handshake de WebSocket.

    `CORSMiddleware` não se aplica a WebSocket; sem esta checagem, qualquer
    origem se conecta. Fecha com 1008 (policy violation) antes de aceitar.
    Devolve True se a conexão foi fechada.

    Movido de `app.py` (Arq-B/M5): `/ws/progress/{project}` (agora em
    routers/execution_router.py) e `/ws/system-performance` (ainda em
    app.py) precisam do MESMO teste — daqui os dois.
    """
    origin = websocket.headers.get("origin")
    if origin not in ALLOWED_ORIGINS:
        await websocket.close(code=1008)
        return True
    return False
