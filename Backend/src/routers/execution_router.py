# routers/execution_router.py — rotas de projeto/execução (Arq-B/M5).
#
# Movidas de app.py sem mudar comportamento: `/projects` (lista), `/projects/status`,
# `/projects/details`, `/projects/{nome}/run`, `/projects/{nome}/rerun`,
# `/projects/{nome}/can-rerun`, `DELETE /projects/{nome}` e o WebSocket
# `/ws/progress/{nome}`. A lógica de negócio mora em
# services/execution_service.py; este módulo só valida e traduz para HTTP —
# nome de projeto, existência, conflito (409), status (403/404/500).
import asyncio
import json
import os
from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect

from src import config as cfg
from src.logging_conf import obter_logger
from src.schemas import Project, ProjectDetails, WorkflowConfig
from src.seguranca import limitar_taxa, resolve_within, fechar_se_origem_nao_permitida
from src.services import execution_service as svc
from src.services.execution_state import resolver_estado
from src.services.workflow_runtime import manager, active_watchers, running_workflows

router = APIRouter()
logger = obter_logger(__name__)


@router.post("/projects/{project_name}/run", status_code=202, dependencies=[Depends(limitar_taxa("projects-run"))])
async def run_workflow(project_name: str, workflow_config: WorkflowConfig):
    """
    Inicia a execução do workflow de análise para um projeto específico.

    Args:
        project_name (str): Nome do projeto já existente na pasta de projetos.
        workflow_config (WorkflowConfig): Configurações do workflow enviadas pelo frontend.
            O dicionário deve conter os parâmetros de entrada, saída e ajustes necessários.

    Returns:
        dict: Mensagem confirmando a execução do workflow.

    Raises:
        HTTPException 404: Se o projeto não for encontrado.
        HTTPException 409: Se já houver um workflow em execução para o mesmo projeto.
        HTTPException 500: Se ocorrer falha ao iniciar o processo.
    """
    if not svc.nome_de_projeto_valido(project_name):
        raise HTTPException(status_code=400, detail="Nome de projeto inválido.")
    project_path = resolve_within(cfg.PROJECTS_ROOT, project_name)
    if not os.path.isdir(project_path):
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    if project_name in running_workflows:
        raise HTTPException(status_code=409, detail=f"O workflow para o projeto '{project_name}' já está em execução.")

    config_dict = workflow_config.configs
    config_str = svc.preparar_configuracao_run(project_name, config_dict, cfg.PROJECTS_ROOT, cfg.DATA_ROOT)
    command = svc.montar_comando(cfg.WORKFLOW_SCRIPT_PATH, config_str)

    logger.info("Executando comando para o projeto '%s': %s", project_name, ' '.join(command))

    try:
        process = await svc.iniciar_subprocesso(command, cwd=cfg.PATH_BASE_WORKFLOW)
        svc.registrar_execucao(project_name, process)
        return {"message": f"Workflow para o projeto '{project_name}' iniciado com sucesso."}

    except HTTPException:
        raise
    except Exception:
        logger.exception("Falha ao iniciar o workflow do projeto '%s'", project_name)
        raise HTTPException(status_code=500, detail="Falha ao iniciar o workflow.")


@router.post("/projects/{project_name}/rerun", status_code=202, dependencies=[Depends(limitar_taxa("projects-rerun"))])
async def rerun_workflow(project_name: str):
    """
    Re-executa um workflow existente usando as configurações salvas.
    """
    if not svc.nome_de_projeto_valido(project_name):
        raise HTTPException(status_code=400, detail="Nome de projeto inválido.")
    project_path = resolve_within(cfg.PROJECTS_ROOT, project_name)
    config_backup_path = os.path.join(project_path, "out", "outputs", "config_backup.json")

    if not os.path.isdir(project_path):
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    if not os.path.exists(config_backup_path):
        raise HTTPException(status_code=404, detail="Arquivo de configuração não encontrado para este projeto.")

    if project_name in running_workflows:
        raise HTTPException(status_code=409, detail=f"O workflow para o projeto '{project_name}' já está em execução.")

    try:
        saved_config = svc.ler_config_backup(config_backup_path)
        command = svc.montar_comando(cfg.WORKFLOW_SCRIPT_PATH, json.dumps(saved_config))

        logger.info("Reexecutando projeto '%s': %s", project_name, ' '.join(command))

        process = await svc.iniciar_subprocesso(command, cwd=cfg.PATH_BASE_WORKFLOW)
        svc.registrar_execucao(project_name, process)

        return {"message": f"Workflow do projeto '{project_name}' reexecutado com sucesso."}

    except HTTPException:
        raise
    except Exception:
        logger.exception("Falha ao reexecutar o workflow do projeto '%s'", project_name)
        raise HTTPException(status_code=500, detail="Falha ao reexecutar o workflow.")


@router.get("/projects/{project_name}/can-rerun")
async def can_rerun_project(project_name: str):
    """
    Verifica se um projeto pode ser reexecutado (tem configurações salvas).
    """
    if not svc.nome_de_projeto_valido(project_name):
        raise HTTPException(status_code=400, detail="Nome de projeto inválido.")
    project_path = resolve_within(cfg.PROJECTS_ROOT, project_name)
    config_backup_path = os.path.join(project_path, "out", "outputs", "config_backup.json")

    pode, motivo = svc.pode_rerun(project_path, config_backup_path)
    if not pode:
        return {"can_rerun": False, "reason": motivo}
    return {"can_rerun": True}


@router.delete("/projects/{project_name}", status_code=200)
async def delete_project(project_name: str):
    """
    Exclui permanentemente um projeto e todos os artefatos em `out/`.

    Não é reversível: `shutil.rmtree` não passa por lixeira, e não há backup
    automático. Recusa projetos em execução — inclusive os lançados por fora
    da API (CLI), que `resolver_estado` passou a reconhecer como vivos via
    checagem de processo no sistema operacional (DEC-053), não só pelo dict
    `running_workflows`.

    Raises:
        HTTPException 400: Nome de projeto inválido.
        HTTPException 404: Projeto não encontrado.
        HTTPException 409: Projeto em execução.
        HTTPException 500: Falha ao remover o diretório.
    """
    if not svc.nome_de_projeto_valido(project_name):
        raise HTTPException(status_code=400, detail="Nome de projeto inválido.")
    project_path = resolve_within(cfg.PROJECTS_ROOT, project_name)

    if not os.path.isdir(project_path):
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    estado = resolver_estado(project_path, em_execucao=project_name in running_workflows)
    if estado.estado == "running":
        raise HTTPException(
            status_code=409,
            detail=f"O projeto '{project_name}' está em execução; não pode ser excluído.",
        )

    try:
        svc.excluir_projeto(project_path)
    except OSError:
        logger.exception("Falha ao excluir o projeto '%s'", project_name)
        raise HTTPException(status_code=500, detail="Falha ao excluir o projeto.")

    return {"message": f"Projeto '{project_name}' excluído com sucesso."}


@router.get("/projects", response_model=List[Project])
async def get_projects():
    """
    Lista todos os projetos disponíveis no sistema.

    Returns:
        List[Project]: Lista de projetos, incluindo:
            - **name**: Nome do projeto
            - **last_modified**: Data da última modificação do diretório
            - **duration**: Duração do último processo (em segundos), se disponível

    Observação:
        A duração é calculada a partir dos arquivos de log, caso existam.
    """
    return svc.listar_projetos(cfg.PROJECTS_ROOT)


@router.get("/projects/status")
async def get_projects_status():
    """
    Consulta o status atual de todos os projetos.

    Returns:
        dict: Dicionário com `{project_name: status}`. Enumeração **fechada**
        (D22 — antes, `idle` era o ramo `else` do parse e a interface o
        mostrava como "Waiting", tornando um projeto que rodou 8 h e morreu no
        meio indistinguível de um nunca executado):

            - **running**: processo vivo agora
            - **completed**: terminou e declarou conclusão
            - **failed**: terminou com erro registrado
            - **interrupted**: começou, não concluiu, e não há processo vivo
            - **never_run**: nenhum vestígio de execução
            - **unknown**: há vestígio, e ele não permite decidir
    """
    return svc.obter_status_projetos(cfg.PROJECTS_ROOT)


@router.post("/projects/details", response_model=Dict[str, ProjectDetails])
async def get_projects_details(project_names: List[str]):
    """
    Obtém detalhes dos projetos especificados.

    Args:
        project_names (List[str]): Lista com os nomes dos projetos.

    Returns:
        Dict[str, ProjectDetails]: Detalhes de cada projeto:
            - **input_file**: Arquivo de entrada identificado no log
            - **current_step**: Última etapa registrada no log
    """
    return svc.obter_detalhes_projetos(project_names, cfg.PROJECTS_ROOT)


@router.websocket("/ws/progress/{project_name}")
async def websocket_progress_endpoint(websocket: WebSocket, project_name: str):
    """
    WebSocket para monitorar em tempo real o progresso de execução de um workflow.

    - Conecta clientes ao projeto especificado.
    - Envia logs e atualizações de progresso.
    - Permite acompanhar execução mesmo após início.

    Args:
        project_name (str): Nome do projeto.
    """
    if await fechar_se_origem_nao_permitida(websocket):
        return

    await manager.connect(project_name, websocket)

    if project_name not in running_workflows and project_name not in active_watchers:
        task = asyncio.create_task(svc.log_watcher(project_name, cfg.PROJECTS_ROOT))
        active_watchers[project_name] = task

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(project_name, websocket)
