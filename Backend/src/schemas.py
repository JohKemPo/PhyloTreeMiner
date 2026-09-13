"""Modelos Pydantic de request/response compartilhados entre routers (Arq-B/M5).

Movidos de `app.py`, byte a byte. `Project`/`FileSystemItem`/`ProjectDetails`/
`WorkflowConfig` são usados por rotas que hoje vivem em módulos diferentes
(`routers/execution_router.py` e, ainda, `app.py`) — um só lugar para o
contrato evita duas definições da mesma forma de resposta divergirem.
"""
import datetime
from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field


class Project(BaseModel):
    name: str = Field(..., description="Nome do projeto.")
    last_modified: datetime.datetime = Field(..., description="Data da última modificação do diretório do projeto.")
    duration: Optional[int] = Field(None, description="Duração da ÚLTIMA execução, em segundos. `null` quando indeterminada — nunca 0 (D22).")
    duration_note: Optional[str] = Field(None, description="Por que a duração é `null`. Preenchido sempre que ela for.")
    duration_source: str = Field("nenhuma", description="De onde veio: `manifesto` (declarado pelo pipeline), `log` (reconstruído) ou `nenhuma`.")
    run_id: Optional[str] = Field(None, description="Identificador da execução, quando há manifesto.")


class FileSystemItem(BaseModel):
    name: str = Field(..., description="Nome do arquivo ou diretório.")
    path: str = Field(..., description="Caminho relativo ao diretório de projetos.")
    type: Literal["file", "directory"] = Field(..., description="Tipo do item (arquivo ou diretório).")
    size: int = Field(..., description="Tamanho do item em bytes.")
    last_modified: datetime.datetime = Field(..., description="Data da última modificação.")


class ProjectDetails(BaseModel):
    input_file: Optional[str] = None
    current_step: Optional[str] = None
    progress: Optional[int] = Field(None, ge=0, le=100,
        description="Percentual, **só quando calculável**. `null` é indeterminado — antes de D22 este campo era 0 em 21 de 21 projetos, o que é indistinguível de 'não começou'.")
    trees_built: int = Field(0, description="Árvores presentes em `out/Trees/`. Contagem real, é o que substitui a barra falsa.")
    state: str = Field("never_run", description="Mesmo estado devolvido por `/projects/status`.")
    runs_in_log: int = Field(0, description="Quantas execuções o arquivo de log concatena. `> 1` significa que o log mistura execuções.")


class WorkflowConfig(BaseModel):
    """Modelo para as configurações do workflow enviadas pelo frontend."""
    configs: Dict[str, Any] = Field(..., description="Dicionário de configurações para o workflow.")
