"""Lógica de negócio das rotas de projeto/execução (Arq-B/M5).

Movido de `app.py` — cópia literal de `parse_log_line`, `stream_workflow_output`,
`log_watcher` e da lógica de `run`/`rerun`/`can-rerun`/exclusão/listagem de
projetos. Refatoração pura, sem mudança de comportamento.

Serviço não conhece FastAPI (docs/agents/03-backend-core.md §5): nada de
`HTTPException`/`Request`/`Response` aqui — a validação e os códigos de status
ficam em `routers/execution_router.py`. As poucas exceções levantadas abaixo
(`FileNotFoundError`, `OSError`) são as mesmas que o código original deixava
subir; o router as traduz.
"""
import asyncio
import datetime
import glob
import json
import os
import re
import shutil
from typing import Dict, List, Optional, Tuple

from src.logging_conf import obter_logger
from src.schemas import Project, ProjectDetails
from src.services.execution_state import resolver_estado
from src.services.workflow_runtime import manager, active_watchers, running_workflows

logger = obter_logger(__name__)

NOME_PROJETO_VALIDO = re.compile(r'^[A-Za-z0-9_-]+$')


def parse_log_line(line: str) -> dict:
    """Analisa uma linha de log e a converte em um dicionário estruturado."""
    match = re.match(r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) - (INFO|WARNING|ERROR) - (.*)", line)
    if match:
        return {"timestamp": match.group(1), "level": match.group(2), "message": match.group(3).strip()}
    return {"timestamp": datetime.datetime.now().isoformat(), "level": "RAW", "message": line.strip()}


#: Uma linha de stderr só é erro se ela se declarar erro. Sem isto, a barra de
#: progresso do `tqdm` — que sai em stderr — era transmitida como ERROR (D22).
_NIVEL_ERRO_STDERR = re.compile(r"\b(ERROR|CRITICAL|Traceback|Exception|Error:)\b")


async def stream_workflow_output(project_name: str, process) -> None:
    """
    Lê stdout/stderr de um processo e analisa o progresso real
    """
    logger.info("Iniciando streaming de saída para o projeto: %s", project_name)

    tqdm_regex = re.compile(r"(\d+)\s*%\s*\|")
    step_regex = re.compile(r"STEP:\s*(.*)")
    progress_regex = re.compile(r"Progress:\s*(\d+)%")

    async def consumir_stdout():
        # `readline()` até `b''` (EOF de verdade) — sem timeout, sem poll. O
        # laço só termina quando o pipe fecha, então nada do que o processo
        # ainda tinha para escrever fica preso no buffer (M4.11).
        while True:
            stdout_line = await process.stdout.readline()
            if not stdout_line:
                break

            line_str = stdout_line.decode('utf-8', errors='ignore').strip()

            tqdm_match = tqdm_regex.search(line_str)
            if tqdm_match:
                percentage = int(tqdm_match.group(1))

                await manager.broadcast(project_name, {
                    "type": "tqdm_update",
                    "payload": {"percentage": percentage, "details": line_str}
                })

            step_match = step_regex.search(line_str)
            if step_match:
                current_step = step_match.group(1).strip()
                await manager.broadcast(project_name, {
                    "type": "step_update",
                    "payload": {"step": current_step}
                })

            progress_match = progress_regex.search(line_str)
            if progress_match:
                percentage = int(progress_match.group(1))

                await manager.broadcast(project_name, {
                    "type": "tqdm_update",
                    "payload": {"percentage": percentage, "details": line_str}
                })

            else:
                parsed_line = parse_log_line(line_str)
                await manager.broadcast(project_name, {
                    "type": "progress_update",
                    "payload": parsed_line
                })

    async def consumir_stderr():
        while True:
            stderr_line = await process.stderr.readline()
            if not stderr_line:
                break

            line_str = stderr_line.decode('utf-8', errors='ignore').strip()

            # D22 — stderr NÃO é sinônimo de erro. O `tqdm` escreve a barra
            # de progresso ali, e rotular tudo como ERROR fazia uma execução
            # saudável chegar ao usuário como enxurrada de erros. A barra
            # vira progresso; o resto vira aviso, não erro.
            tqdm_match = tqdm_regex.search(line_str)
            if tqdm_match:
                percentage = int(tqdm_match.group(1))
                await manager.broadcast(project_name, {
                    "type": "tqdm_update",
                    "payload": {"percentage": percentage, "details": line_str}
                })
            else:
                await manager.broadcast(project_name, {
                    "type": "progress_update",
                    "payload": {
                        "level": "ERROR" if _NIVEL_ERRO_STDERR.search(line_str) else "WARNING",
                        "message": line_str,
                        "timestamp": datetime.datetime.now().isoformat()
                    }
                })

    # Uma task por stream, e uma terceira aguardando o processo terminar — as
    # duas primeiras drenam stdout/stderr até EOF antes que a terceira feche
    # o ciclo com o código de saída.
    await asyncio.gather(consumir_stdout(), consumir_stderr())
    return_code = await process.wait()

    logger.info("Workflow do projeto %s concluído com código de saída: %s", project_name, return_code)

    final_message = {
        "timestamp": datetime.datetime.now().isoformat()
    }

    if return_code == 0:
        final_message["type"] = "workflow_complete"
        final_message["message"] = f"Project workflow {project_name} completed successfully."
    else:
        final_message["type"] = "workflow_failed"
        final_message["message"] = f"Project workflow {project_name} failed with exit code {return_code}."

    await manager.broadcast(project_name, final_message)

    if project_name in running_workflows:
        del running_workflows[project_name]


async def log_watcher(project_name: str, projects_root: str) -> None:
    """Observa um arquivo de log e transmite novas linhas via WebSocket. (Para logs antigos)"""
    logger.info("Iniciando observador para o projeto: %s", project_name)

    project_path = os.path.join(projects_root, project_name)
    outputs_dir = os.path.join(project_path, "out", "outputs")
    log_path = None

    retries = 10
    while retries > 0:
        if os.path.isdir(outputs_dir):
            log_files = glob.glob(os.path.join(outputs_dir, "*.log"))
            if log_files:
                log_path = max(log_files, key=os.path.getmtime)
                break
        await asyncio.sleep(1)
        retries -= 1

    if not log_path:
        await manager.broadcast(project_name, {"type": "error", "message": f"Arquivo de log não encontrado em {outputs_dir}."})
        return

    try:
        with open(log_path, "r", encoding='utf-8', errors='ignore') as f:
            logger.info("Lendo histórico do log: %s", log_path)
            for line in f:
                parsed_line = parse_log_line(line)
                await manager.broadcast(project_name, {
                    "type": "progress_update",
                    "payload": parsed_line
                })
            await manager.broadcast(project_name, {
                "type": "history_complete",
                "message": f"Histórico do log do projeto {project_name} carregado."
            })
    except Exception as e:
        await manager.broadcast(project_name, {"type": "error", "message": f"Erro no observador de log: {e}"})
    finally:
        logger.info("Observador de histórico para o projeto %s concluído.", project_name)
        if project_name in active_watchers:
            del active_watchers[project_name]


def nome_de_projeto_valido(project_name: str) -> bool:
    return bool(NOME_PROJETO_VALIDO.match(project_name))


def preparar_configuracao_run(project_name: str, config_dict: dict, projects_root: str, data_root: str) -> str:
    """Reescreve os caminhos de `config_dict` para o layout de disco esperado
    pelo workflow, e devolve o JSON serializado (o que o comando `-cw` recebe)."""
    data_input_folder = config_dict['tree_config']['input_path']
    data_input_folder = data_input_folder.split('/')[-1]

    config_dict['output_log'] = os.path.join(projects_root, project_name, 'out')
    config_dict['tree_config']['input_path'] = os.path.join(data_root, data_input_folder)
    config_dict['tree_config']['output_path'] = os.path.join(projects_root, project_name, 'out')
    config_dict['subtree_config']['input_path'] = os.path.join(projects_root, project_name, 'out', 'Trees')
    config_dict['subtree_config']['output_path'] = os.path.join(projects_root, project_name, 'out')
    config_dict['subtree_config']['subtree_miner_configs']['output_path'] = os.path.join(projects_root, project_name, 'out')

    return json.dumps(config_dict)


def montar_comando(workflow_script_path: str, config_str: str) -> List[str]:
    return ["python3", workflow_script_path, "-cw", config_str]


async def iniciar_subprocesso(command: List[str], cwd: str):
    """Wrapper fino sobre `asyncio.create_subprocess_exec`."""
    return await asyncio.create_subprocess_exec(
        *command,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=cwd,
    )


def registrar_execucao(project_name: str, process) -> None:
    """Registra o processo em `running_workflows` e dispara o streaming."""
    running_workflows[project_name] = process
    asyncio.create_task(stream_workflow_output(project_name, process))


def ler_config_backup(config_backup_path: str) -> dict:
    with open(config_backup_path, 'r') as f:
        return json.load(f)


def pode_rerun(project_path: str, config_backup_path: str) -> Tuple[bool, Optional[str]]:
    """Verifica se um projeto pode ser reexecutado (tem configurações salvas)."""
    if not os.path.isdir(project_path):
        return False, "Projeto não encontrado"
    if not os.path.exists(config_backup_path):
        return False, "Configurações não salvas"
    return True, None


def excluir_projeto(project_path: str) -> None:
    """Remove o diretório do projeto. Não passa por lixeira; `OSError` sobe
    para o router decidir o status (M4.?)."""
    shutil.rmtree(project_path)


def listar_projetos(projects_root: str) -> List[Project]:
    """Lista todos os projetos disponíveis no sistema."""
    projects = []
    for project_name in sorted(os.listdir(projects_root)):
        full_path = os.path.join(projects_root, project_name)
        if not os.path.isdir(full_path):
            continue

        # D22 — a duração vem do manifesto quando ele existe, e do log recortado
        # POR EXECUÇÃO quando não existe. A conta anterior ia do primeiro ao
        # último carimbo do arquivo, e como o pipeline abre o log em `append`
        # com nome por dia, ela somava execuções distintas mais o intervalo
        # ocioso entre elas: 1 960 s onde a última execução levou 396 s.
        estado = resolver_estado(full_path, em_execucao=project_name in running_workflows)

        projects.append(Project(
            name=project_name,
            last_modified=datetime.datetime.fromtimestamp(os.path.getmtime(full_path)),
            duration=estado.duracao_s,
            duration_note=estado.duracao_motivo,
            duration_source=estado.fonte,
            run_id=estado.run_id,
        ))

    return projects


def obter_status_projetos(projects_root: str) -> Dict[str, str]:
    """Consulta o status atual de todos os projetos."""
    statuses = {}
    for project_name in os.listdir(projects_root):
        project_path = os.path.join(projects_root, project_name)
        if not os.path.isdir(project_path):
            continue
        statuses[project_name] = resolver_estado(
            project_path, em_execucao=project_name in running_workflows).estado
    return statuses


def obter_detalhes_projetos(project_names: List[str], projects_root: str) -> Dict[str, ProjectDetails]:
    """Obtém detalhes dos projetos especificados."""
    details = {}
    for project_name in project_names:
        project_path = os.path.join(projects_root, project_name)
        estado = resolver_estado(project_path,
                                 em_execucao=project_name in running_workflows)

        # D22 — `progress` deixa de ser 0 por padrão. Era 0 em 21 de 21
        # projetos porque os três regex que o alimentavam procuravam texto que
        # nunca chega ao arquivo lido: o `tqdm` escreve em stderr, `Progress: N%`
        # não é emitido por ninguém, e os `STEP:` vão para o log, não para o
        # stdout. Um zero indistinguível de "não começou" é pior que um `null`,
        # e a contagem de árvores é um número que existe de verdade.
        details[project_name] = ProjectDetails(
            input_file=estado.arquivo_entrada,
            current_step=estado.etapa,
            progress=estado.progresso,
            trees_built=estado.arvores,
            state=estado.estado,
            runs_in_log=estado.execucoes_no_log,
        )

    return details
