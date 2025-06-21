from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Literal, Optional, Any
import os, datetime, mimetypes, asyncio, re, psutil, json
import glob

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PATH_BASE_WORKFLOW = os.path.abspath(os.path.join(BASE_DIR, "../../BioComp_UFF"))
DATA_ROOT = os.path.join(PATH_BASE_WORKFLOW, "data")
PROJECTS_ROOT = os.path.join(PATH_BASE_WORKFLOW, "projects")

WORKFLOW_SCRIPT_PATH = os.path.join(PATH_BASE_WORKFLOW, "workflow.py")

if not os.path.exists(PROJECTS_ROOT) or not os.path.isdir(PROJECTS_ROOT):
    raise RuntimeError(f"O diretório base de projetos não foi encontrado em: {PROJECTS_ROOT}")

if not os.path.exists(WORKFLOW_SCRIPT_PATH):
     raise RuntimeError(f"O script do workflow não foi encontrado em: {WORKFLOW_SCRIPT_PATH}")


app = FastAPI()

# --- Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Modelos Pydantic ---
class Project(BaseModel):
    name: str = Field(..., description="Nome do projeto.")
    last_modified: datetime.datetime = Field(..., description="Data da última modificação do diretório do projeto.")

class FileSystemItem(BaseModel):
    name: str = Field(..., description="Nome do arquivo ou diretório.")
    path: str = Field(..., description="Caminho relativo ao diretório de projetos.")
    type: Literal["file", "directory"] = Field(..., description="Tipo do item (arquivo ou diretório).")
    size: int = Field(..., description="Tamanho do item em bytes.")
    last_modified: datetime.datetime = Field(..., description="Data da última modificação.")

class ProjectDetails(BaseModel):
    input_file: Optional[str] = None
    current_step: Optional[str] = None
    
class WorkflowConfig(BaseModel):
    """Modelo para as configurações do workflow enviadas pelo frontend."""
    configs: Dict[str, Any] = Field(..., description="Dicionário de configurações para o workflow.")



# --- WebSocket para Monitoramento de Progresso ---
class ProgressConnectionManager:
    """Gerencia as conexões de WebSocket por projeto."""
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, project_name: str, websocket: WebSocket):
        await websocket.accept()
        if project_name not in self.active_connections:
            self.active_connections[project_name] = []
        self.active_connections[project_name].append(websocket)
        print(f"Cliente conectado ao projeto: {project_name}")

    def disconnect(self, project_name: str, websocket: WebSocket):
        if project_name in self.active_connections:
            self.active_connections[project_name].remove(websocket)
            if not self.active_connections[project_name]:
                del self.active_connections[project_name]
        print(f"Cliente desconectado do projeto: {project_name}")

    async def broadcast(self, project_name: str, message: dict):
        """Envia uma mensagem JSON para todos os clientes de um projeto."""
        if project_name in self.active_connections:
            # Itera sobre uma cópia para evitar problemas ao remover itens durante a iteração
            for connection in self.active_connections[project_name][:]:
                try:
                    await connection.send_json(message)
                except Exception:
                    # Remove a conexão se houver erro ao enviar
                    self.active_connections[project_name].remove(connection)

manager = ProgressConnectionManager()
active_watchers: Dict[str, asyncio.Task] = {}
running_workflows: Dict[str, asyncio.subprocess.Process] = {}

# --- Funções Auxiliares para o Workflow ---

def parse_log_line(line: str) -> dict:
    """Analisa uma linha de log e a converte em um dicionário estruturado."""
    match = re.match(r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) - (INFO|WARNING|ERROR) - (.*)", line)
    if match:
        return {"timestamp": match.group(1), "level": match.group(2), "message": match.group(3).strip()}
    return {"timestamp": datetime.datetime.now().isoformat(), "level": "RAW", "message": line.strip()}

async def stream_workflow_output(project_name: str, process: asyncio.subprocess.Process):
    """
    Lê stdout/stderr de um processo, analisa o progresso de múltiplos tqdms
    e transmite um progresso combinado via WebSocket.
    """
    print(f"Iniciando streaming de saída para o projeto: {project_name}")
    tqdm_regex = re.compile(r"(\d+)\s*%\s*\|")

    current_stage = 1
    last_percentage = 0
    total_stages = 2

    while True:
        if process.returncode is not None:
            break
        
        try:
            stdout_line = await asyncio.wait_for(process.stdout.readline(), timeout=0.1)
            if stdout_line:
                line_str = stdout_line.decode('utf-8', errors='ignore').strip()
                tqdm_match = tqdm_regex.search(line_str)
                
                if tqdm_match:
                    percentage = int(tqdm_match.group(1))

                    if percentage < last_percentage and current_stage < total_stages:
                        current_stage += 1
                    
                    stage_progress = percentage / total_stages
                    completed_stages_progress = (current_stage - 1) * (100 / total_stages)
                    
                    total_progress = int(completed_stages_progress + stage_progress)
                    
                    total_progress = min(total_progress, 100)
                    last_percentage = percentage

                    await manager.broadcast(project_name, {
                        "type": "tqdm_update",
                        "payload": {"percentage": total_progress, "details": line_str}
                    })
                else:
                    parsed_line = parse_log_line(line_str)
                    await manager.broadcast(project_name, {"type": "progress_update", "payload": parsed_line})

        except asyncio.TimeoutError:
            pass 

        try:
            stderr_line = await asyncio.wait_for(process.stderr.readline(), timeout=0.1)
            if stderr_line:
                line_str = stderr_line.decode('utf-8', errors='ignore').strip()
                await manager.broadcast(project_name, {
                    "type": "progress_update",
                    "payload": {"level": "ERROR", "message": line_str, "timestamp": datetime.datetime.now().isoformat()}
                })
        except asyncio.TimeoutError:
            pass

    return_code = await process.wait()
    print(f"Workflow do projeto {project_name} concluído com código de saída: {return_code}")

    final_message = {
        "timestamp": datetime.datetime.now().isoformat()
    }
    if return_code == 0:
        final_message["type"] = "workflow_complete"
        final_message["message"] = f"Workflow do projeto {project_name} foi concluído com sucesso."
    else:
        final_message["type"] = "workflow_failed"
        final_message["message"] = f"Workflow do projeto {project_name} falhou com código de saída {return_code}."
    
    await manager.broadcast(project_name, final_message)
    
    if project_name in running_workflows:
        del running_workflows[project_name]


# --- Endpoints HTTP ---

@app.post("/projects/{project_name}/run", status_code=202)
async def run_workflow(project_name: str, workflow_config: WorkflowConfig):
    """
    Inicia a execução do workflow para um projeto específico.
    """
    project_path = os.path.abspath(os.path.join(PROJECTS_ROOT, project_name))
    print(project_path)
    # if not project_path.startswith(PROJECTS_ROOT) or not os.path.isdir(project_path):
    #     raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    # if project_name in running_workflows:
        # raise HTTPException(status_code=409, detail=f"O workflow para o projeto '{project_name}' já está em execução.")

    config_dict = workflow_config.configs
    data_input_folder = config_dict['tree_config']['input_path']
    data_input_folder = data_input_folder.split('/')[-1]
    
    config_dict['output_log'] = os.path.join(PROJECTS_ROOT,project_name,'out')
    config_dict['tree_config']['input_path'] = os.path.join(DATA_ROOT,data_input_folder)
    config_dict['tree_config']['output_path'] = os.path.join(PROJECTS_ROOT,project_name,'out') 
    config_dict['subtree_config']['input_path'] = os.path.join(PROJECTS_ROOT,project_name,'out','Trees')
    config_dict['subtree_config']['output_path'] = os.path.join(PROJECTS_ROOT,project_name,'out')
    config_dict['subtree_config']['subtree_miner_configs']['output_path'] = os.path.join(PROJECTS_ROOT,project_name,'out')
    
    config_str = json.dumps(workflow_config.configs)
    
    
    command = [
        "python3",
        WORKFLOW_SCRIPT_PATH,
        "-cw",
        config_str
    ]

    print(f"Executando comando para o projeto '{project_name}': {' '.join(command)}")

    try:
        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=PATH_BASE_WORKFLOW 
        )

        running_workflows[project_name] = process
        asyncio.create_task(stream_workflow_output(project_name, process))

        return {"message": f"Workflow para o projeto '{project_name}' iniciado com sucesso."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falha ao iniciar o workflow: {e}")


@app.get("/projects", response_model=List[Project])
async def get_projects():
    """
    Retorna uma lista de todos os projetos disponíveis, ordenados por nome.
    """
    projects = []
    for project_name in sorted(os.listdir(PROJECTS_ROOT)):
        full_path = os.path.join(PROJECTS_ROOT, project_name)
        if os.path.isdir(full_path):
            projects.append(Project(
                name=project_name,
                last_modified=datetime.datetime.fromtimestamp(os.path.getmtime(full_path))
            ))
    return projects

@app.get("/dataFolders", response_model=List[Project])
async def get_data_folders():
    """
    Retorna uma lista de todos os diretorios de dados disponíveis, ordenados por nome.
    """
    data_folders = []
    for data_folder in sorted(os.listdir(DATA_ROOT)):
        full_path = os.path.join(DATA_ROOT, data_folder)
        if os.path.isdir(full_path):
            data_folders.append(Project(
                name=data_folder,
                last_modified=datetime.datetime.fromtimestamp(os.path.getmtime(full_path))
                
            ))
    return data_folders

@app.get("/browse", response_model=List[FileSystemItem])
async def browse_path(path: str = Query("", description="O caminho relativo a ser explorado. Ex: 'meu_projeto/Trees'")):
    """
    Lista o conteúdo de um diretório específico dentro da pasta de projetos.
    Por segurança, impede o acesso a diretórios fora da pasta 'PROJECTS_ROOT'.
    """
    requested_path = os.path.abspath(os.path.join(PROJECTS_ROOT, path))

    if not requested_path.startswith(PROJECTS_ROOT):
        raise HTTPException(status_code=403, detail="Acesso negado: tentativa de acessar um caminho inválido.")

    if not os.path.exists(requested_path) or not os.path.isdir(requested_path):
        raise HTTPException(status_code=404, detail="Caminho não encontrado ou não é um diretório.")

    items = []
    for item_name in sorted(os.listdir(requested_path)):
        full_item_path = os.path.join(requested_path, item_name)
        relative_item_path = os.path.relpath(full_item_path, PROJECTS_ROOT)
        
        item_type = "directory" if os.path.isdir(full_item_path) else "file"
        
        items.append(FileSystemItem(
            name=item_name,
            path=relative_item_path.replace("\\", "/"),
            type=item_type,
            size=os.path.getsize(full_item_path),
            last_modified=datetime.datetime.fromtimestamp(os.path.getmtime(full_item_path))
        ))
    return items

@app.get("/inputs_data", response_model=List[FileSystemItem])
async def inputs_data_path(path: str = Query("", description="O caminho relativo a ser explorado. Ex: 'meu_projeto/Trees'")):
    """
    Lista o conteúdo de um diretório específico dentro da pasta de projetos.
    Por segurança, impede o acesso a diretórios fora da pasta 'PROJECTS_ROOT'.
    """
    requested_path = os.path.abspath(os.path.join(PATH_BASE_WORKFLOW, 'data'))

    if not os.path.exists(requested_path) or not os.path.isdir(requested_path):
        raise HTTPException(status_code=404, detail="Caminho não encontrado ou não é um diretório.")

    items = []
    for item_name in sorted(os.listdir(requested_path)):
        full_item_path = os.path.join(requested_path, item_name)
        relative_item_path = os.path.relpath(full_item_path, PROJECTS_ROOT)
        
        item_type = "directory" if os.path.isdir(full_item_path) else "file"
        
        items.append(FileSystemItem(
            name=item_name,
            path=relative_item_path.replace("\\", "/"), 
            type=item_type,
            size=os.path.getsize(full_item_path),
            last_modified=datetime.datetime.fromtimestamp(os.path.getmtime(full_item_path))
        ))
    return items

@app.get("/file")
async def get_file_content(path: str = Query(..., description="Caminho relativo do arquivo.")):
    """
    Retorna o conteúdo de um arquivo. Para imagens, retorna o arquivo diretamente.
    Para texto, retorna o conteúdo como JSON.
    """
    full_path = os.path.abspath(os.path.join(PROJECTS_ROOT, path))
    if not full_path.startswith(PROJECTS_ROOT):
        raise HTTPException(status_code=403, detail="Acesso negado.")
    if not os.path.isfile(full_path):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")

    mime_type, _ = mimetypes.guess_type(full_path)
    if mime_type and mime_type.startswith("image/"):
        return FileResponse(full_path)
    
    text_extensions = [".txt", ".log", ".cql", ".nexus", ".md", ".json"]
    if any(full_path.endswith(ext) for ext in text_extensions):
        try:
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            return {"content": content, "type": "text"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erro ao ler arquivo: {e}")

    raise HTTPException(status_code=415, detail="Tipo de arquivo não suportado para pré-visualização.")

@app.get("/")
async def read_root():
    return {"message": "Bem-vindo à API FastAPI!"}

@app.get("/projects/status")
async def get_projects_status():
    """Retorna o status de todos os projetos."""
    statuses = {}
    for project_name in os.listdir(PROJECTS_ROOT):
        project_path = os.path.join(PROJECTS_ROOT, project_name)
        if os.path.isdir(project_path):
            if project_name in running_workflows:
                statuses[project_name] = "running"
                continue 

            outputs_dir = os.path.join(project_path, "out", "outputs")
            if not os.path.exists(outputs_dir):
                statuses[project_name] = "idle"
                continue

            log_files = glob.glob(os.path.join(outputs_dir, "*.log"))
            if log_files:
                latest_log = max(log_files, key=os.path.getmtime)
                with open(latest_log, 'r', encoding='utf-8', errors='ignore') as f:
                    log_content = f.read()

                if ("Histograma de frequência processado" in log_content):
                    statuses[project_name] = "completed"
                elif "ERROR" in log_content:
                    statuses[project_name] = "failed"
                else:
                    statuses[project_name] = "idle"
            else:
                statuses[project_name] = "idle"
    return statuses

@app.post("/projects/details", response_model=Dict[str, ProjectDetails])
async def get_projects_details(project_names: List[str]):
    """
    Para uma lista de projetos, lê o último log de cada um e extrai
    informações como o arquivo de input e a última etapa registrada.
    """
    details = {}
    for project_name in project_names:
        project_path = os.path.join(PROJECTS_ROOT, project_name)
        outputs_dir = os.path.join(project_path, "out", "outputs")

        input_file = "Não encontrado"
        current_step = "Não iniciada"

        if os.path.exists(outputs_dir):
            log_files = glob.glob(os.path.join(outputs_dir, "*.log"))
            if log_files:
                latest_log = max(log_files, key=os.path.getmtime)
                with open(latest_log, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = reversed(f.readlines())

                input_file_regex = re.compile(r"Iniciando processamento do arquivo:\s*(.*)")
                step_regex = re.compile(r"ETAPA:\s*(.*)")

                found_input = False
                found_step = False

                for line in lines:
                    if not found_step:
                        match = step_regex.search(line)
                        if match:
                            current_step = match.group(1).strip()
                            found_step = True

                    if not found_input:
                        match = input_file_regex.search(line)
                        if match:
                            input_file = os.path.basename(match.group(1).strip())
                            found_input = True
                    
                    if found_input and found_step:
                        break
        
        details[project_name] = ProjectDetails(input_file=input_file, current_step=current_step)
        
    return details

# --- WebSocket Endpoints ---

async def log_watcher(project_name: str):
    """Observa um arquivo de log e transmite novas linhas via WebSocket. (Para logs antigos)"""
    print(f"Iniciando observador para o projeto: {project_name}")
    
    project_path = os.path.join(PROJECTS_ROOT, project_name)
    outputs_dir = os.path.join(project_path, "out", "outputs")
    log_path = None
    
    # Procura pelo log mais recente
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
            print(f"Lendo histórico do log: {log_path}")
            # Envia todo o conteúdo histórico do log de uma vez
            for line in f:
                parsed_line = parse_log_line(line)
                await manager.broadcast(project_name, {
                    "type": "progress_update",
                    "payload": parsed_line
                })
            # Informa que o histórico foi enviado
            await manager.broadcast(project_name, {
                "type": "history_complete",
                "message": f"Histórico do log do projeto {project_name} carregado."
            })
            # O watcher para de observar ativamente, pois o streaming ao vivo é feito por outra função
    except Exception as e:
        await manager.broadcast(project_name, {"type": "error", "message": f"Erro no observador de log: {e}"})
    finally:
        print(f"Observador de histórico para o projeto {project_name} concluído.")
        if project_name in active_watchers:
            del active_watchers[project_name]

@app.websocket("/ws/progress/{project_name}")
async def websocket_progress_endpoint(websocket: WebSocket, project_name: str):
    await manager.connect(project_name, websocket)
    
    # Se um workflow NÃO estiver rodando, inicia o log_watcher para ver o histórico.
    if project_name not in running_workflows and project_name not in active_watchers:
        task = asyncio.create_task(log_watcher(project_name))
        active_watchers[project_name] = task

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(project_name, websocket)


# --- Performance Watcher (código original mantido) ---
performance_clients: List[WebSocket] = []
performance_watcher_task: asyncio.Task = None

async def performance_watcher():
    """Coleta e transmite métricas de performance do sistema."""
    NETWORK_MAX_BPS = 10**9

    while True:
        if not performance_clients:
            break

        cpu_usage = psutil.cpu_percent(interval=1)
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

    global performance_watcher_task
    performance_watcher_task = None
    print("Observador de performance encerrado.")

@app.websocket("/ws/system-performance")
async def websocket_performance_endpoint(websocket: WebSocket):
    global performance_watcher_task
    await websocket.accept()
    performance_clients.append(websocket)

    if performance_watcher_task is None or performance_watcher_task.done():
        print("Iniciando observador de performance.")
        performance_watcher_task = asyncio.create_task(performance_watcher())
    
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        performance_clients.remove(websocket)
        print("Cliente de performance desconectado.")
