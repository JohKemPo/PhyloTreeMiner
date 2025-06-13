from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Literal
import os, datetime, mimetypes, asyncio, re, psutil
import glob

# --- Configuração de Segurança ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PATH_BASE_WORKFLOW = os.path.abspath(os.path.join(BASE_DIR, "../../BioComp_UFF"))
PROJECTS_ROOT = os.path.join(PATH_BASE_WORKFLOW, "projects")

if not os.path.exists(PROJECTS_ROOT) or not os.path.isdir(PROJECTS_ROOT):
    raise RuntimeError(f"O diretório base de projetos não foi encontrado em: {PROJECTS_ROOT}")


app = FastAPI()

# --- Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Project(BaseModel):
    name: str = Field(..., description="Nome do projeto.")
    last_modified: datetime.datetime = Field(..., description="Data da última modificação do diretório do projeto.")

class FileSystemItem(BaseModel):
    name: str = Field(..., description="Nome do arquivo ou diretório.")
    path: str = Field(..., description="Caminho relativo ao diretório de projetos.")
    type: Literal["file", "directory"] = Field(..., description="Tipo do item (arquivo ou diretório).")
    size: int = Field(..., description="Tamanho do item em bytes.")
    last_modified: datetime.datetime = Field(..., description="Data da última modificação.")


# --- Endpoints HTTP ---

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
        if os.path.isdir(os.path.join(PROJECTS_ROOT, project_name)):
            if project_name in active_watchers and not active_watchers[project_name].done():
                statuses[project_name] = "running"
            else:
                outputs_dir = os.path.join(PROJECTS_ROOT, project_name, "out", "outputs")
                log_files = glob.glob(os.path.join(outputs_dir, "*.log")) if os.path.exists(outputs_dir) else []
                if log_files:
                    latest_log = max(log_files, key=os.path.getmtime)
                    with open(latest_log, 'r', encoding='utf-8', errors='ignore') as f:
                        if "Histograma de frequência processado" in f.read():
                            statuses[project_name] = "completed"
                        else:
                            statuses[project_name] = "idle" # Pode ter falhado ou estar aguardando
                else:
                    statuses[project_name] = "idle"
    return statuses

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

def parse_log_line(line: str) -> dict:
    """Analisa uma linha de log e a converte em um dicionário estruturado."""
    match = re.match(r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) - (INFO|WARNING|ERROR) - (.*)", line)
    if match:
        return {"timestamp": match.group(1), "level": match.group(2), "message": match.group(3).strip()}
    return {"timestamp": datetime.datetime.now().isoformat(), "level": "RAW", "message": line.strip()}

async def log_watcher(project_name: str):
    """Observa um arquivo de log e transmite novas linhas via WebSocket."""
    print(f"Iniciando observador para o projeto: {project_name}")
    
    project_path = os.path.join(PROJECTS_ROOT, project_name)
    # ... (código para aguardar a criação da pasta mantido) ...
    
    log_path = None
    outputs_dir = os.path.join(project_path, "out", "outputs")
    # ... (código para encontrar o arquivo de log mantido) ...
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
            print(f"Iniciando leitura do log: {log_path}")
            
            # CORREÇÃO: Lógica de leitura unificada em um único loop.
            # Este loop lê o histórico e continua observando novas linhas.
            while project_name in manager.active_connections:
                line = f.readline()
                if not line:
                    # Chegou ao final do arquivo, aguarda por novas linhas
                    await asyncio.sleep(1)
                    continue
                
                # Encontrou uma linha (seja do histórico ou nova), envia para o cliente
                parsed_line = parse_log_line(line)
                await manager.broadcast(project_name, {
                    "type": "progress_update",
                    "payload": parsed_line
                })

                # Verifica se o workflow foi concluído
                if "Histograma de frequência processado" in parsed_line["message"]:
                    await manager.broadcast(project_name, {
                        "type": "workflow_complete",
                        "message": f"Workflow do projeto {project_name} foi concluído.",
                        "timestamp": datetime.datetime.now().isoformat()
                    })
                    break  # Encerra o observador
    except Exception as e:
        await manager.broadcast(project_name, {"type": "error", "message": f"Erro no observador de log: {e}"})
    finally:
        print(f"Encerrando observador para o projeto: {project_name}")
        if project_name in active_watchers:
            del active_watchers[project_name]

@app.websocket("/ws/progress/{project_name}")
async def websocket_progress_endpoint(websocket: WebSocket, project_name: str):
    await manager.connect(project_name, websocket)
    
    if project_name not in active_watchers:
        task = asyncio.create_task(log_watcher(project_name))
        active_watchers[project_name] = task

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(project_name, websocket)

performance_clients: List[WebSocket] = []
performance_watcher_task: asyncio.Task = None

async def performance_watcher():
    """Coleta e transmite métricas de performance do sistema."""
    # last_net_io = psutil.net_io_counters()
    # Limite hipotético de 1 Gbps para cálculo de porcentagem de rede
    NETWORK_MAX_BPS = 10**9

    while True:
        if not performance_clients:
            break # Encerra se não houver mais clientes

        # Coleta de métricas
        cpu_usage = psutil.cpu_percent(interval=1)
        memory_info = psutil.virtual_memory()
        disk_info = psutil.disk_usage('/')
        
        # Cálculo de Rede
        await asyncio.sleep(1)
        # current_net_io = psutil.net_io_counters()
        # bytes_sent = current_net_io.bytes_sent - last_net_io.bytes_sent
        # bytes_recv = current_net_io.bytes_recv - last_net_io.bytes_recv
        # total_bytes = bytes_sent + bytes_recv
        # network_usage = min(100, (total_bytes / NETWORK_MAX_BPS) * 100)
        # print(network_usage)
        # last_net_io = current_net_io

        message = {
            "cpu": cpu_usage,
            "memory": memory_info.percent,
            "disk": disk_info.percent,
        }
        
        # Broadcast para todos os clientes de performance
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

    # Inicia o observador se for o primeiro cliente
    if performance_watcher_task is None:
        print("Iniciando observador de performance.")
        performance_watcher_task = asyncio.create_task(performance_watcher())
    
    try:
        while True:
            await websocket.receive_text() # Apenas para manter a conexão viva
    except WebSocketDisconnect:
        performance_clients.remove(websocket)
        print("Cliente de performance desconectado.")
