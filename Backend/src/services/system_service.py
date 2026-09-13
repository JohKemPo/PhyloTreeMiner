"""Lógica de negócio das rotas de sistema (Arq-B/M5).

Movido de `app.py` (`system_health`/`get_detailed_project_status`), cópia
literal — refatoração pura, sem mudança de comportamento. `PROJECTS_ROOT`
deixa de ser lido de uma variável global do módulo chamador e passa a
chegar por parâmetro: serviço não conhece FastAPI nem o módulo que o chama
(docs/agents/03-backend-core.md §5), só recebe o que precisa.
"""
import datetime
import glob
import os
from typing import Dict

from src.services.workflow_runtime import running_workflows


async def get_detailed_project_status(project_name: str, projects_root: str) -> Dict:
    """Obtém status detalhado de um projeto específico."""
    project_path = os.path.join(projects_root, project_name)
    outputs_dir = os.path.join(project_path, "out", "outputs")

    status = {
        "exists": os.path.exists(project_path),
        "has_outputs": os.path.exists(outputs_dir),
        "log_files": [],
        "process_running": project_name in running_workflows
    }

    if os.path.exists(outputs_dir):
        log_files = glob.glob(os.path.join(outputs_dir, "*.log"))
        status["log_files"] = [os.path.basename(f) for f in log_files]

        if log_files:
            latest_log = max(log_files, key=os.path.getmtime)
            status["latest_log"] = os.path.basename(latest_log)
            status["log_size"] = os.path.getsize(latest_log)
            status["log_modified"] = datetime.datetime.fromtimestamp(os.path.getmtime(latest_log)).isoformat()

    return status


async def montar_system_health(projects_root: str) -> Dict:
    """Retorna status detalhado de todos os projetos e processos."""
    health_status = {
        "timestamp": datetime.datetime.now().isoformat(),
        "running_workflows": list(running_workflows.keys()),
        "projects_status": {}
    }

    for project_name in os.listdir(projects_root):
        project_path = os.path.join(projects_root, project_name)
        if os.path.isdir(project_path):
            status = await get_detailed_project_status(project_name, projects_root)
            health_status["projects_status"][project_name] = status

    return health_status
