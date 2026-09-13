"""Configuração centralizada do backend (Arq-B, M5).

Antes desta extração, cada módulo lia `os.getenv`/`os.environ` para o que
precisava — CORS em `app.py:102`, `ADMIN_TOKEN` em `seguranca.py`, as três
credenciais do Neo4j em `services/neo4j_services.py`, `LOG_LEVEL` em
`logging_conf.py`, e um punhado de tetos de upload/JSON como constantes
soltas em `app.py`. É o mesmo defeito de D5 (duas fontes de verdade), agora
em configuração, em vez de em dado científico.

`Settings` reúne tudo num só lugar, lido uma vez. **Todo valor-padrão aqui é
idêntico ao que o `os.getenv(..., padrão)` correspondente já usava** — esta
é uma extração pura (regra 4/6 do CLAUDE.md), nenhum comportamento observável
muda. `pydantic-settings` casa `CORS_ORIGINS` (variável de ambiente) com
`cors_origins` (campo) sem diferenciar maiúscula/minúscula — é o padrão da
biblioteca, não precisa de alias explícito.

Serviço não conhece FastAPI (docs/agents/03-backend-core.md §5): este módulo
não importa `fastapi` nem levanta `HTTPException` — só valores.
"""
import os
import sys
from pathlib import Path
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_REPO_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",  # o .env do projeto tem outras chaves além destas.
    )

    # CORS (era app.py:102).
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Autenticação administrativa (era seguranca.py, M4.4).
    admin_token: Optional[str] = None

    # Nível de log (era logging_conf.py).
    log_level: str = "INFO"

    # Credenciais Neo4j (eram services/neo4j_services.py).
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_username: str = "neo4j"
    neo4j_password: Optional[str] = None

    # Tetos de upload e de pré-visualização de JSON (M4.6, eram constantes
    # soltas em app.py). Configuráveis por env a partir de agora, mas com o
    # mesmo valor-padrão de antes — não é uma folga nova, é o mesmo teto.
    max_upload_bytes: int = 200 * 1024 * 1024
    max_upload_files: int = 50
    max_zip_expansion_ratio: int = 100
    max_json_inline_bytes: int = 8 * 1024 * 1024

    # Teto de resultados por busca no NCBI (era app.py:180, M4.6).
    ncbi_retmax_maximo: int = 500

    @property
    def allowed_origins(self) -> List[str]:
        """Mesma lógica de `app.py:102`: split por vírgula, tiras vazias fora."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


def get_settings() -> Settings:
    """Lê o ambiente (e o `.env`) a cada chamada — **sem** cache.

    `exigir_admin` (seguranca.py) chama isto a cada requisição, e os testes
    de M4.4 (`test_admin_token.py`) usam `monkeypatch.setenv`/`delenv` por
    caso — exatamente como o `os.getenv("ADMIN_TOKEN")` original, que também
    lia o ambiente a cada chamada, sem cache. Um `lru_cache` aqui congelaria
    o primeiro valor lido e quebraria esses testes silenciosamente. Os
    chamadores que só precisam ler uma vez (CORS em app.py, o singleton do
    Neo4j) já fazem isso no próprio call site, no momento certo.
    """
    return Settings()


# Lista de origens já resolvida, para módulos que só precisam LER (ex.:
# `seguranca.fechar_se_origem_nao_permitida`, para o handshake de WebSocket).
# Mesma fonte de `Settings.allowed_origins` — não uma segunda tabela.
ALLOWED_ORIGINS = get_settings().allowed_origins


# ---------------------------------------------------------------------------
# Caminhos derivados do layout do repositório (Arq-B/M5).
#
# Antes computados em app.py. Movidos para cá porque, a partir deste marco,
# mais de um módulo precisa do mesmo PROJECTS_ROOT (app.py continua usando o
# seu, e os routers extraídos precisam do dele) — duplicar a derivação
# reabriria o defeito D5 (duas fontes de verdade), agora sobre um caminho em
# vez de um número. Nenhuma linha abaixo mudou de comportamento: é a mesma
# sequência de `os.path.join`/checagens que vivia em app.py:35-79.
#
# Convenção de teste (Arq-B/M5): `app.py` faz `from src.config import
# PROJECTS_ROOT` e os testes que o isolam usam `monkeypatch.setattr(app_module,
# "PROJECTS_ROOT", ...)` — funciona porque só código DENTRO de app.py lê esse
# nome. Um router/serviço extraído que precisar isolar PROJECTS_ROOT por teste
# deve importar o MÓDULO (`from src import config`) e ler `config.PROJECTS_ROOT`
# em tempo de chamada, não o nome solto — só assim
# `monkeypatch.setattr(config, "PROJECTS_ROOT", ...)` (um único ponto,
# `src.config`) alcança todo mundo. Ver routers/execution_router.py.
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PATH_BASE_WORKFLOW = os.path.abspath(os.path.join(BASE_DIR, "../../BioComp_UFF"))
DATA_ROOT = os.path.join(PATH_BASE_WORKFLOW, "data")
PROJECTS_ROOT = os.path.join(PATH_BASE_WORKFLOW, "projects")
WORKFLOW_SCRIPT_PATH = os.path.join(PATH_BASE_WORKFLOW, "workflow.py")
NCBI_WORK_DIR = os.path.join(BASE_DIR, "temp_ncbi")
os.makedirs(NCBI_WORK_DIR, exist_ok=True)

# O registro de alinhadores (workflow.alignment.aligners), suporte_de_ramo,
# suporte_metodologico e ncbi_acquisition reusam `workflow.*` do submódulo —
# precisam de PATH_BASE_WORKFLOW no sys.path antes de serem importados. Como
# app.py importa `src.config` antes de qualquer um desses, fazer o insert
# aqui garante a ordem sem depender de uma linha solta em app.py.
if PATH_BASE_WORKFLOW not in sys.path:
    sys.path.insert(0, PATH_BASE_WORKFLOW)

if not os.path.exists(PROJECTS_ROOT) or not os.path.isdir(PROJECTS_ROOT):
    raise RuntimeError(f"O diretório base de projetos não foi encontrado em: {PROJECTS_ROOT}")

if not os.path.exists(WORKFLOW_SCRIPT_PATH):
    raise RuntimeError(f"O script do workflow não foi encontrado em: {WORKFLOW_SCRIPT_PATH}")
