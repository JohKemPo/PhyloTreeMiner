from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query, Response, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel, Field

from typing import List, Dict, Literal, Optional, Any, Tuple
import os, datetime, mimetypes, asyncio, re, psutil, json, ijson, random, glob, zipfile 
import pandas as pd
from collections import defaultdict, Counter
import threading
import numpy as np

from Bio import SeqIO, Entrez
from io import StringIO, BytesIO
from dendropy import Tree, TreeList, TaxonNamespace
from dendropy.calculate import treecompare

from src.routers.neo4j_router import router as neo4j_router
from src.routers.ncbi_router import router as ncbi_router
from src.routers.cql_router import router as cql_router
from src.routers.cql_batch_router import router as cql_batch_router
from src.services.neo4j_services import neo4j_service
from src.services.ncbi_acquisition import NCBIAcquisition
from src.services.genericOWIDAnalyzer import GenericOWIDAnalyzer
from src.services.cql_batch_service import init_cql_batch_service

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PATH_BASE_WORKFLOW = os.path.abspath(os.path.join(BASE_DIR, "../../BioComp_UFF"))
DATA_ROOT = os.path.join(PATH_BASE_WORKFLOW, "data")
PROJECTS_ROOT = os.path.join(PATH_BASE_WORKFLOW, "projects")

WORKFLOW_SCRIPT_PATH = os.path.join(PATH_BASE_WORKFLOW, "workflow.py")

NCBI_WORK_DIR = os.path.join(BASE_DIR, "temp_ncbi")
os.makedirs(NCBI_WORK_DIR, exist_ok=True)

if not os.path.exists(PROJECTS_ROOT) or not os.path.isdir(PROJECTS_ROOT):
    raise RuntimeError(f"O diretório base de projetos não foi encontrado em: {PROJECTS_ROOT}")

if not os.path.exists(WORKFLOW_SCRIPT_PATH):
     raise RuntimeError(f"O script do workflow não foi encontrado em: {WORKFLOW_SCRIPT_PATH}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await neo4j_service.connect()
    init_cql_batch_service()
    yield 
    await neo4j_service.close()

app = FastAPI(lifespan=lifespan)

metadata_cache: Dict[str, Any] = {}
cache_lock = threading.Lock()
json_count_cache = {}
json_count_lock = threading.Lock()

ncbi_service = NCBIAcquisition(
    email="seu_email@example.com",  
    work_dir=NCBI_WORK_DIR,
    data_root=DATA_ROOT
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



app.include_router(
    neo4j_router,
    prefix="/api/neo4j",
    tags=["Neo4j"]
)

app.include_router(
    cql_router,
    prefix="/api/cql",
    tags=["cql"]
) 

app.include_router(
    cql_batch_router,
    prefix="/api/cql-batch", 
    tags=["CQL Batch"]
)

app.include_router(
    ncbi_router,
    prefix="/api/ncbi",
    tags=["NCBI"]
)

class Project(BaseModel):
    name: str = Field(..., description="Nome do projeto.")
    last_modified: datetime.datetime = Field(..., description="Data da última modificação do diretório do projeto.")
    duration: Optional[int] = Field(None, description="Duração do último processo em segundos.")

class FileSystemItem(BaseModel):
    name: str = Field(..., description="Nome do arquivo ou diretório.")
    path: str = Field(..., description="Caminho relativo ao diretório de projetos.")
    type: Literal["file", "directory"] = Field(..., description="Tipo do item (arquivo ou diretório).")
    size: int = Field(..., description="Tamanho do item em bytes.")
    last_modified: datetime.datetime = Field(..., description="Data da última modificação.")

class ProjectDetails(BaseModel):
    input_file: Optional[str] = None
    current_step: Optional[str] = None
    progress: Optional[int] = Field(0, ge=0, le=100, description="Progresso atual em porcentagem")
    
class WorkflowConfig(BaseModel):
    """Modelo para as configurações do workflow enviadas pelo frontend."""
    configs: Dict[str, Any] = Field(..., description="Dicionário de configurações para o workflow.")

class NCBIDownloadRequest(BaseModel):
    query: str = Field(..., description="Query de busca no NCBI")
    species_name: Optional[str] = Field(None, description="Nome personalizado para a espécie (opcional)")
    retmax: int = Field(100, description="Número máximo de sequências para download")
    initial_min_length: Optional[int] = Field(None, description="Comprimento mínimo inicial (bp)")
    refined_min_length: Optional[int] = Field(None, description="Comprimento mínimo refinado (bp)")
    utr5_end: Optional[int] = Field(None, description="Posição final do UTR 5'")
    utr3_start: Optional[int] = Field(None, description="Posição inicial do UTR 3'")
    similarity_threshold: Optional[float] = Field(None, description="Threshold de similaridade para remoção de duplicatas")

class NCBIAccessionRequest(BaseModel):
    accessions: List[str] = Field(..., description="Lista de números de acesso")
    species_name: Optional[str] = Field(None, description="Nome personalizado para a espécie (opcional)")
    initial_min_length: Optional[int] = Field(None, description="Comprimento mínimo inicial (bp)")
    refined_min_length: Optional[int] = Field(None, description="Comprimento mínimo refinado (bp)")
    utr5_end: Optional[int] = Field(None, description="Posição final do UTR 5'")
    utr3_start: Optional[int] = Field(None, description="Posição inicial do UTR 3'")
    similarity_threshold: Optional[float] = Field(None, description="Threshold de similaridade para remoção de duplicatas")

class NCBISearchRequest(BaseModel):
    query: str = Field(..., description="Termo para busca de espécies")
    retmax: int = Field(10, description="Número máximo de resultados")

class TreeAnalysisRequest(BaseModel):
    min_support: float = Field(0.1, description="Suporte mínimo para considerar padrões")
    max_support: float = Field(0.9, description="Suporte máximo para considerar padrões quase-invariantes")
    min_pattern_size: int = Field(2, description="Tamanho mínimo dos padrões")
    max_pattern_size: int = Field(10, description="Tamanho máximo dos padrões")

class PatternAnalysisResult(BaseModel):
    unique_signatures: List[Dict]
    quasi_invariant_patterns: List[Dict]
    pattern_statistics: Dict
    tree_coverage: Dict
    
    
#  WebSocket para Monitoramento de Progresso 
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
            for connection in self.active_connections[project_name][:]:
                try:
                    await connection.send_json(message)
                except Exception:
                    self.active_connections[project_name].remove(connection)

manager = ProgressConnectionManager()
active_watchers: Dict[str, asyncio.Task] = {}
running_workflows: Dict[str, asyncio.subprocess.Process] = {}


def parse_log_line(line: str) -> dict:
    """Analisa uma linha de log e a converte em um dicionário estruturado."""
    match = re.match(r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) - (INFO|WARNING|ERROR) - (.*)", line)
    if match:
        return {"timestamp": match.group(1), "level": match.group(2), "message": match.group(3).strip()}
    return {"timestamp": datetime.datetime.now().isoformat(), "level": "RAW", "message": line.strip()}

async def stream_workflow_output(project_name: str, process: asyncio.subprocess.Process):
    """
    Lê stdout/stderr de um processo e analisa o progresso real
    """
    print(f"Iniciando streaming de saída para o projeto: {project_name}")
    
    tqdm_regex = re.compile(r"(\d+)\s*%\s*\|")
    step_regex = re.compile(r"STEP:\s*(.*)")
    progress_regex = re.compile(r"Progress:\s*(\d+)%")
    
    current_step = "Starting..."
    last_percentage = 0

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
                    last_percentage = percentage
                    
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
                    last_percentage = percentage
                    
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

        except asyncio.TimeoutError:
            pass 

        try:
            stderr_line = await asyncio.wait_for(process.stderr.readline(), timeout=0.1)
            if stderr_line:
                line_str = stderr_line.decode('utf-8', errors='ignore').strip()
                await manager.broadcast(project_name, {
                    "type": "progress_update",
                    "payload": {
                        "level": "ERROR", 
                        "message": line_str, 
                        "timestamp": datetime.datetime.now().isoformat()
                    }
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
        final_message["message"] = f"Project workflow {project_name} completed successfully."
    else:
        final_message["type"] = "workflow_failed"
        final_message["message"] = f"Project workflow {project_name} failed with exit code {return_code}."
    
    await manager.broadcast(project_name, final_message)
    
    if project_name in running_workflows:
        del running_workflows[project_name]

@app.post("/projects/{project_name}/run", status_code=202)
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
    project_path = os.path.abspath(os.path.join(PROJECTS_ROOT, project_name))
    print(project_path)
    # if not project_path.startswith(PROJECTS_ROOT) or not os.path.isdir(project_path):
    #     raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    # if project_name in running_workflows:
    #     raise HTTPException(status_code=409, detail=f"O workflow para o projeto '{project_name}' já está em execução.")

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

@app.post("/projects/{project_name}/rerun", status_code=202)
async def rerun_workflow(project_name: str):
    """
    Re-executa um workflow existente usando as configurações salvas.
    """
    project_path = os.path.abspath(os.path.join(PROJECTS_ROOT, project_name))
    config_backup_path = os.path.join(project_path, "out", "outputs", "config_backup.json")
    
    if not project_path.startswith(PROJECTS_ROOT) or not os.path.isdir(project_path):
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    
    if not os.path.exists(config_backup_path):
        raise HTTPException(status_code=404, detail="Arquivo de configuração não encontrado para este projeto.")
    
    if project_name in running_workflows:
        raise HTTPException(status_code=409, detail=f"O workflow para o projeto '{project_name}' já está em execução.")

    try:
        with open(config_backup_path, 'r') as f:
            saved_config = json.load(f)
        
        command = [
            "python3",
            WORKFLOW_SCRIPT_PATH,
            "-cw",
            json.dumps(saved_config)
        ]

        print(f"Reexecutando projeto '{project_name}': {' '.join(command)}")
        
        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=PATH_BASE_WORKFLOW 
        )

        running_workflows[project_name] = process
        asyncio.create_task(stream_workflow_output(project_name, process))

        return {"message": f"Workflow do projeto '{project_name}' reexecutado com sucesso."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falha ao reexecutar o workflow: {e}")

@app.get("/projects/{project_name}/can-rerun")
async def can_rerun_project(project_name: str):
    """
    Verifica se um projeto pode ser reexecutado (tem configurações salvas).
    """
    project_path = os.path.abspath(os.path.join(PROJECTS_ROOT, project_name))
    config_backup_path = os.path.join(project_path, "out", "outputs", "config_backup.json")
    
    if not project_path.startswith(PROJECTS_ROOT) or not os.path.isdir(project_path):
        return {"can_rerun": False, "reason": "Projeto não encontrado"}
    
    if not os.path.exists(config_backup_path):
        return {"can_rerun": False, "reason": "Configurações não salvas"}
    
    return {"can_rerun": True}

@app.get("/projects", response_model=List[Project])
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
    projects = []
    now = datetime.datetime.now()
    today = now.date()
    timestamp_regex = re.compile(r"^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3})")

    for project_name in sorted(os.listdir(PROJECTS_ROOT)):
        full_path = os.path.join(PROJECTS_ROOT, project_name)
        if not os.path.isdir(full_path):
            continue

        duration_seconds = None
        log_dir = os.path.join(PROJECTS_ROOT, project_name, "out/outputs")

        log_files = glob.glob(os.path.join(log_dir, "*.log"))
        if log_files:
            latest_log = max(log_files, key=os.path.getmtime)
            
            try:
                with open(latest_log, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = [line for line in f if line.strip()] 
                
                if lines:
                    first_match = timestamp_regex.match(lines[0])
                    if first_match:
                        first_line_time = datetime.datetime.strptime(first_match.group(1), "%Y-%m-%d %H:%M:%S,%f")
                        
                        if project_name in running_workflows:
                            duration_seconds = int((now - first_line_time).total_seconds())
                        else:
                            last_match = timestamp_regex.match(lines[-1])
                            if last_match:
                                last_line_time = datetime.datetime.strptime(last_match.group(1), "%Y-%m-%d %H:%M:%S,%f")
                                duration_seconds = int((last_line_time - first_line_time).total_seconds())
            except Exception:
                duration_seconds = None

        projects.append(Project(
            name=project_name,
            last_modified=datetime.datetime.fromtimestamp(os.path.getmtime(full_path)),
            duration=duration_seconds
        ))
            
    return projects

@app.post("/api/owid/metadata/")
async def get_owid_metadata(request: Request):
    try:
        data = await request.json()
        analyzer = GenericOWIDAnalyzer(data)
        report = analyzer.generate_comprehensive_report()
        return JSONResponse(content=report)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao processar JSON: {str(e)}")

def build_metadata_index(metadata_path):

    nodes = []
    node_index = {}

    host_index = defaultdict(list)
    lineage_index = defaultdict(list)

    hosts_count = defaultdict(int)
    country_count = defaultdict(int)
    timeline_count = defaultdict(int)

    unique_lineages = set()

    for node in iter_metadata_nodes(metadata_path):

        _, annotations, features, qualifiers = get_metadata_node(node)
        accession=node['newick'].split('.')[0]
        info = get_node_information(annotations, features, qualifiers, accession=accession)

        nodes.append(info)
        node_index[info["accessionId"]] = info

        host_index[info["host"]].append(info)
        lineage_index[info["lineage"]].append(info)

        hosts_count[info["host"]] += 1
        country_count[info["country"]] += 1
        timeline_count[info["year"]] += 1

        if info["lineage"]:
            unique_lineages.add(info["lineage"])

    insights = {
        "metrics": {
            "totalNodes": len(nodes),
            "uniqueLineages": len(unique_lineages),
            "uniqueHosts": len(hosts_count),
            "timeSpan": f"{min([y for y in timeline_count.keys() if y != 'Unknown Date'], default='N/A')} - {max([y for y in timeline_count.keys() if y != 'Unknown Date'], default='N/A')}"
        },
        "hostData": [{"name": k, "value": v} for k, v in hosts_count.items()],
        "countryData": [{"country": k, "count": v} for k, v in country_count.items()],
        "timelineData": [
            {"year": k, "count": v}
            for k, v in sorted(timeline_count.items())
        ],
    }

    return {
        "nodes": nodes,
        "node_index": node_index,
        "host_index": host_index,
        "lineage_index": lineage_index,
        "filters": {
            "hosts": sorted(host_index.keys()),
            "lineages": sorted(lineage_index.keys()),
        },
        "insights": insights,
    }

def get_metadata_cache(metadata_path: str):

    file_mtime = os.path.getmtime(metadata_path)

    with cache_lock:

        cache_entry = metadata_cache.get(metadata_path)

        # cache existe e arquivo NÃO mudou
        if cache_entry and cache_entry["mtime"] == file_mtime:
            return cache_entry["data"]

        print(" Building metadata cache...")

        data = build_metadata_index(
            metadata_path
        )

        metadata_cache[metadata_path] = {
            "mtime": file_mtime,
            "data": data
        }

        return data
    
def iter_metadata_nodes(file_path: str, only_first: bool = True, iter_tree: bool = False):
    accessions = set()
    
    with open(file_path, 'rb') as f:
        for base_node in ijson.items(f, 'item.item'): 
            if isinstance(base_node, dict):
                if iter_tree: 
                    yield base_node
                    continue
                for tree_name, tree_content in base_node.items():
                    for subtree_name, subtree_content in tree_content.items():
                        if isinstance(subtree_content, dict) and 'data_terminals' in subtree_content:
                            for node in subtree_content['data_terminals']:
                                accession = node['newick']
                                if accession and accession not in accessions:
                                    accessions.add(accession)
                                    yield node
                                
            # elif isinstance(base_node, list):
            #     for n in base_node:
            #         yield n
                    
            if only_first: break
                    
def get_metadata_node(node: dict): 
    """
    Extrai campos 
    """
    metadata = node.get('metadata',{})
    features_list = metadata.get("features") or []
    features = features_list[0] if features_list else {}
    annotations = metadata.get('annotations',{})
    qualifiers = features.get('qualifiers',{})
    
    return  metadata, annotations, features, qualifiers
    


def get_node_information (annotations, features, qualifiers, accession: str):
    """
    Retorna informações do nó
    
    Return
    ----
    accessionId,
    lineage,
    host,
    country,
    year
    """
    accessionIdAux = annotations.get('accessions',['Unknown'])
    accessionId = accessionIdAux[0] if isinstance(accessionIdAux, list) else accessionIdAux
    if accessionId == 'Unknown':
        accessionId = accession
        
    lineage = annotations.get("organism", 'Unknown') or annotations.get("source", 'Unknown')

    isolate = qualifiers.get("", ["Unknown"])

    host_list = qualifiers.get("host", ["Unknown"])
    host = host_list[0] if isinstance(host_list, list) else host_list

    geo_loc = qualifiers.get("geo_loc_name", [None])[0]
    
    strain_info = qualifiers.get("strain", [""])[0]
    if not geo_loc:
        # Fallback: Tenta extrair do 'strain' via Regex se geo_loc_name falhar
        # Regex para buscar algo como "Brazil/2016" ou "[Brazil 2016]"
        match = re.search(r'([a-zA-Z\s]+)', strain_info)
        country = match.group(1).strip() if match else "Unknown"
    else:
        # geo_loc_name geralmente vem como "Country: State/City"
        country = geo_loc.split(':')[0].strip()


    coll_date = qualifiers.get("collection_date", [None])[0]
    raw_date = coll_date if coll_date else strain_info
    
    
    year = "Unknown Date"
    if raw_date:
        year_match = re.search(r'\d{4}', raw_date)
        year = year_match.group(0) if year_match else "Unknown Date"
        
    return {
        "accessionId":accessionId,
        "lineage":lineage,
        "host":host,
        "country":country,
        "year":year,
        "isolate": isolate
    }

@app.get("/api/tree/{project_name}/search-nodes")
async def search_tree_nodes(
    project_name: str,
):
    """Retorna apenas os IDs dos nós que correspondem aos filtros."""
    metadata_path = os.path.join(PROJECTS_ROOT, project_name, 'out', 'outputs', "metadata.json")
    if not os.path.exists(metadata_path):
        raise HTTPException(status_code=404, detail="Metadata not found")

    try:
        cache = get_metadata_cache(metadata_path)
        nodes = cache["nodes"]

        return nodes

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tree/{project_name}/node/{node_id}")
async def get_node_details(project_name: str, node_id: str):
    """Busca os detalhes de um único nó."""
    metadata_path = os.path.join(PROJECTS_ROOT, project_name, 'out', 'outputs', "metadata.json")
    if not os.path.exists(metadata_path):
        raise HTTPException(status_code=404, detail="Metadata not found")

    try:

        cache = get_metadata_cache(metadata_path)

        node = cache["node_index"].get(node_id)

        if not node:
            raise HTTPException(status_code=404, detail="Node not found in metadata")

        return node
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tree/{project_name}/insights")
async def get_tree_insights(project_name: str):
    """Processa agregações e métricas de forma iterativa no servidor."""
    metadata_path = os.path.join(PROJECTS_ROOT, project_name, 'out', 'outputs', "metadata.json")
    if not os.path.exists(metadata_path):
        raise HTTPException(status_code=404, detail="Metadata not found")

    total_nodes = 0
    hosts_count = {}
    country_count = {}
    timeline_count = {}
    unique_lineages = set()

    try:

        cache = get_metadata_cache(metadata_path)

        return cache["insights"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tree/metadata/{project_name}", status_code=202)
async def get_tree_metadata(project_name: str):
    """
    Obtém metadados para os nós de uma árvore filogenética.
    """
    project_path = os.path.join(PROJECTS_ROOT, project_name)
    metadata_path = os.path.join(project_path,'out','outputs',"metadata.json")
    
    if not os.path.exists(metadata_path):
        raise HTTPException(status_code=404, detail="Metadata file not found")
    
    try:
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        
        # with open(os.path.join(project_path,'out','outputs',"metadata_filtered.json"), 'w') as f:
        #      json.dump([metadata[0][0]], f, indent=2)

        return [metadata[0][0]]
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading metadata: {e}")

@app.get("/dataFolders", response_model=List[Project])
async def get_data_folders():
    """
    Lista os diretórios de dados disponíveis.

    Returns:
        List[Project]: Diretórios de dados, com:
            - **name**: Nome da pasta
            - **last_modified**: Data da última modificação
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
    Explora o conteúdo de um diretório dentro da pasta de projetos.

    Args:
        path (str): Caminho relativo ao `PROJECTS_ROOT`.

    Returns:
        List[FileSystemItem]: Lista de itens encontrados, incluindo:
            - **name**: Nome do arquivo ou pasta
            - **path**: Caminho relativo ao projeto
            - **type**: "file" ou "directory"
            - **size**: Tamanho em bytes
            - **last_modified**: Data da última modificação

    Raises:
        HTTPException 403: Tentativa de acessar diretórios fora de `PROJECTS_ROOT`.
        HTTPException 404: Caminho inexistente ou não é diretório.
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


def get_json_total_items(file_path: str):
    """
    Obtém o total de itens de um JSON iterável.
    Usa cache baseado no tempo de modificação do arquivo para evitar reprocessamento.
    """
    file_mtime = os.path.getmtime(file_path)
    
    with json_count_lock:
        cache_entry = json_count_cache.get(file_path)
        
        if cache_entry and cache_entry["mtime"] == file_mtime:
            return cache_entry["total_items"]
    
    print(f"    Construindo cache de contagem para {file_path}...")
    total = 0
    with open(file_path, 'rb') as f:
        for _ in ijson.items(f, 'item.item'):
            total += 1
            
    with json_count_lock:
        json_count_cache[file_path] = {
            "mtime": file_mtime,
            "total_items": total
        }
        
    return total

@app.get("/api/file/paginated")
async def get_paginated_json(
    path: str = Query(..., description="Caminho relativo do arquivo."),
    index: int = Query(0, description="Índice do item no array JSON (0-based).")
):
    """
    Retorna apenas o item específico do array JSON usando leitura iterativa e cache de contagem.
    """
    full_path = os.path.abspath(os.path.join(PROJECTS_ROOT, path))
    
    if not full_path.startswith(PROJECTS_ROOT):
        raise HTTPException(status_code=403, detail="Acesso negado.")
    if not os.path.isfile(full_path):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")

    try:
        total_items = get_json_total_items(full_path)
        
        if total_items == 0:
            raise HTTPException(status_code=404, detail="O arquivo JSON está vazio ou não é um array válido.")
        if index >= total_items or index < 0:
            raise HTTPException(status_code=404, detail=f"Índice {index} fora dos limites (0 a {total_items - 1}).")

        target_item = None
        
        with open(full_path, 'rb') as f:
            for i, item in enumerate(ijson.items(f, 'item.item')):
                if i == index:
                    target_item = item
                    break 
        
        if target_item is None:
            raise HTTPException(status_code=404, detail="Índice não encontrado no arquivo.")
            
        return {
            "content": target_item,
            "currentIndex": index,
            "totalItems": total_items
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao ler JSON de forma paginada: {e}")

@app.get("/file")
async def get_file_content(path: str = Query(..., description="Caminho relativo do arquivo.")):
    """
    Retorna o conteúdo de um arquivo para pré-visualização no frontend.

    Args:
        path (str): Caminho relativo ao arquivo.

    Returns:
        dict: Conteúdo do arquivo em texto, incluindo:
            - **content**: Conteúdo em string
            - **type**: Tipo interpretado (newick, fasta, clustal, table, text, json)

        FileResponse: Caso o arquivo seja uma imagem.

    Raises:
        HTTPException 403: Acesso negado (fora de PROJECTS_ROOT).
        HTTPException 404: Arquivo não encontrado.
        HTTPException 415: Tipo de arquivo não suportado.
        HTTPException 500: Erro ao abrir ou processar arquivo.
    """
    full_path = os.path.abspath(os.path.join(PROJECTS_ROOT, path))
    if not full_path.startswith(PROJECTS_ROOT):
        raise HTTPException(status_code=403, detail="Acesso negado.")
    if not os.path.isfile(full_path):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")

    file_type = "unsupported"
    content = ""

    try:
        if os.path.getsize(full_path) == 0:
            raise HTTPException(status_code=400, detail="O arquivo selecionado está vazio (0 bytes) no servidor.")

        mime_type, _ = mimetypes.guess_type(full_path)
        if mime_type and mime_type.startswith("image/"):
            return FileResponse(full_path)

        with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        if any(full_path.endswith(ext) for ext in [".newick", ".nwk", ".tree", ".nexus"]):
            file_type = "newick"
        elif any(full_path.endswith(ext) for ext in [".fasta", ".fa", ".fas", ".faa"]):
            file_type = "fasta"
        elif any(full_path.endswith(ext) for ext in [".aln", ".clustal"]):
            file_type = "clustal"
        elif any(full_path.endswith(ext) for ext in [".csv", ".tsv"]):
            file_type = "table"
        elif any(full_path.endswith(ext) for ext in [".log", ".txt"]):
            file_type = "text"
        elif full_path.endswith(".cql"):
            file_type = "cql"
            content = content.replace('\\"', '"').replace('\\\\', '\\')
        elif full_path.endswith(".json"):
            file_type = "json"
            try:
                parsed_json = json.loads(content)
                return {"content": parsed_json[0], "type": file_type}
            except json.JSONDecodeError:
                pass 
        
        if file_type != "unsupported":
             return {"content": content, "type": file_type}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao ler arquivo: {e}")

    raise HTTPException(status_code=415, detail="Tipo de arquivo não suportado para pré-visualização.")


@app.head("/")
def read_root_head():
    return Response(content="Bem-vindo à API FastAPI!",status_code=200)

@app.get("/projects/status")
async def get_projects_status():
    """
    Consulta o status atual de todos os projetos.

    Returns:
        dict: Dicionário com `{project_name: status}`, onde status pode ser:
            - **running**: Workflow em execução
            - **completed**: Workflow concluído
            - **failed**: Erro durante execução
            - **idle**: Nenhum processo em andamento
    """
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

                if ("Completed successfully!" in log_content):
                    statuses[project_name] = "completed"
                elif "ERROR" in log_content and "Completed successfully!" not in log_content:
                    statuses[project_name] = "failed"
                else:
                    statuses[project_name] = "idle"
            else:
                statuses[project_name] = "idle"
    return statuses

@app.post("/projects/details", response_model=Dict[str, ProjectDetails])
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
    details = {}
    for project_name in project_names:
        project_path = os.path.join(PROJECTS_ROOT, project_name)
        outputs_dir = os.path.join(project_path, "out", "outputs")

        input_file = "Not found"
        current_step = "Not started"
        current_progress = 0

        if project_name in running_workflows:
            current_step = "Running..."
            current_progress = 0 

        if os.path.exists(outputs_dir):
            log_files = glob.glob(os.path.join(outputs_dir, "*.log"))
            if log_files:
                latest_log = max(log_files, key=os.path.getmtime)
                with open(latest_log, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = reversed(f.readlines())

                input_file_regex = re.compile(r"Iniciando processamento do arquivo:\s*(.*)")
                step_regex = re.compile(r"STEP:\s*(.*)")
                progress_regex = re.compile(r"(\d+)\s*%\s*\|")

                found_input = False
                found_step = False

                for line in lines:
                    if not found_step:
                        match = step_regex.search(line)
                        if match:
                            current_step = match.group(1).strip()
                            found_step = True
                            
                    progress_match = progress_regex.search(line)
                    if progress_match:
                        current_progress = int(progress_match.group(1))

                    if not found_input:
                        match = input_file_regex.search(line)
                        if match:
                            input_file = match.group(1).strip()
                            found_input = True
                    
                    if found_input and found_step:
                        break
        
        details[project_name] = ProjectDetails(
            input_file=input_file, 
            current_step=current_step,
            progress=current_progress
        )
        
    return details

def extract_trees_from_nexus(nexus_content: str, taxon_namespace: TaxonNamespace = None) -> List[Tree]:
    """
    Extrai árvores do conteúdo Nexus usando processamento em memória
    """
    try:
        if taxon_namespace:
            trees = TreeList.get_from_string(
                nexus_content, 
                'nexus', 
                taxon_namespace=taxon_namespace,
                rooting='force-unrooted'
            )
        else:
            trees = TreeList.get_from_string(
                nexus_content, 
                'nexus', 
                rooting='force-unrooted'
            )
        
        return trees
        
    except Exception as e:
        raise ValueError(f"Failed to parse Nexus content: {str(e)}")

def align_taxon_namespaces(tree1: Tree, tree2: Tree) -> Tuple[Tree, Tree]:
    """
    Alinha os taxon namespaces das duas árvores preservando todas as informações
    """
    unified_ns = TaxonNamespace()
    
    taxon_map = {}
    for tree in [tree1, tree2]:
        for taxon in tree.taxon_namespace:
            if taxon.label not in taxon_map:
                new_taxon = unified_ns.new_taxon(label=taxon.label)
                taxon_map[taxon.label] = new_taxon
    
    # Clonar árvores com novo namespace
    tree1_aligned = tree1.__class__(tree1)
    tree2_aligned = tree2.__class__(tree2)
    
    # Substituir taxon namespace
    tree1_aligned.taxon_namespace = unified_ns
    tree2_aligned.taxon_namespace = unified_ns
    
    # Mapear todos os nós para os novos táxons
    for tree in [tree1_aligned, tree2_aligned]:
        for node in tree.leaf_node_iter():
            if node.taxon is not None and node.taxon.label in taxon_map:
                node.taxon = taxon_map[node.taxon.label]
    
    return tree1_aligned, tree2_aligned

def calculate_rf_distance(tree1: Tree, tree2: Tree) -> int:
    """
    Calcula a distância Robinson-Foulds
    """
    tree1.encode_bipartitions()
    tree2.encode_bipartitions()
    return treecompare.symmetric_difference(tree1, tree2)

def make_tree_binary(tree: Tree) -> Tree:
    """
    Resolve politomias aleatoriamente para tornar a árvore binária
    Retorna uma nova árvore com estrutura binária
    """
    new_tree = tree.__class__(tree)
    
    for node in list(new_tree.internal_nodes()):
        children = node.child_nodes()
        if len(children) > 2:
            random.shuffle(children)
            
            while len(children) > 1:
                child1 = children.pop(0)
                child2 = children.pop(0)
                
                new_node = new_tree.node_factory()
                new_node.add_child(child1)
                new_node.add_child(child2)
                
                new_node.edge.length = 1e-6
                
                children.append(new_node)
            
            node.set_children(children)
    
    return new_tree

def calculate_quartet_distance(tree1: Tree, tree2: Tree) -> int:
    """
    Calcula a distância Quartet corretamente para árvores não binárias
    """
    n_taxa = len(tree1.taxon_namespace)
    
    if not get_tree_statistics(tree1)['is_binary'] or not get_tree_statistics(tree2)['is_binary']:
        tree1_binary = make_tree_binary(tree1)
        tree2_binary = make_tree_binary(tree2)
        
        #TODO: Tratar caso de arvores nao-binarias
        return -1
    
    if n_taxa <= 25:
        try:
            return treecompare.quartet_distance(tree1, tree2)
        except:
            return exact_quartet_distance(tree1, tree2)
    else:
        return approximate_quartet_distance(tree1, tree2, sample_size=min(1000, n_taxa * 10))

def exact_quartet_distance(tree1: Tree, tree2: Tree) -> int:
    """
    Calcula a distância Quartet exata para árvores pequenas
    """
    taxa = sorted([taxon.label for taxon in tree1.taxon_namespace])
    if len(taxa) < 4:
        return 0
    
    quartet_distance = 0
    from itertools import combinations
    all_quartets = list(combinations(taxa, 4))
    
    for quartet_taxa in all_quartets:
        try:
            quartet_set = set(quartet_taxa)
            quartet1 = tree1.quartet(*quartet_set)
            quartet2 = tree2.quartet(*quartet_set)
            
            if quartet1 != quartet2:
                quartet_distance += 1
        except Exception:
            quartet_distance += 1
    
    return quartet_distance

def approximate_quartet_distance(tree1: Tree, tree2: Tree, sample_size: int = 1000) -> int:
    """
    Calcula uma aproximação da distância Quartet com amostragem mais inteligente
    """
    taxa = sorted([taxon.label for taxon in tree1.taxon_namespace])
    if len(taxa) < 4:
        return 0
    
    quartet_distance = 0
    n_taxa = len(taxa)
    
    for _ in range(sample_size):
        try:
            strata_size = max(1, n_taxa // 4)
            strata_indices = np.random.choice(range(n_taxa), strata_size, replace=False)
            strata_taxa = [taxa[i] for i in strata_indices]
            
            remaining_taxa = list(set(taxa) - set(strata_taxa))
            if len(remaining_taxa) < 4 - len(strata_taxa):
                continue
                
            additional_taxa = np.random.choice(remaining_taxa, 4 - len(strata_taxa), replace=False)
            sampled_taxa = list(strata_taxa) + list(additional_taxa)
            
            quartet_set = set(sampled_taxa)
            quartet1 = tree1.quartet(*quartet_set)
            quartet2 = tree2.quartet(*quartet_set)
            
            if quartet1 != quartet2:
                quartet_distance += 1
        except Exception as e:
            if "quartet" in str(e).lower() or "taxon" in str(e).lower():
                quartet_distance += 1
    
    total_quartets = n_taxa * (n_taxa-1) * (n_taxa-2) * (n_taxa-3) // 24
    if total_quartets > 0 and sample_size > 0:
        return int((quartet_distance / sample_size) * total_quartets)
    return 0

def count_non_trivial_bipartitions(tree: Tree) -> int:
    """
    Conta o número de bipartições não triviais em uma árvore
    """
    tree.encode_bipartitions()
    count = 0
    for edge in tree.postorder_edge_iter():
        if edge.bipartition and not edge.bipartition.is_trivial():
            count += 1
    return count

def find_common_clades(tree1: Tree, tree2: Tree) -> Tuple[int, List[str]]:
    """
    Encontra clados comuns entre duas árvores usando comparação de bipartições
    """
    common_clades = 0
    common_clade_descriptions = []
    
    tree1.encode_bipartitions()
    tree2.encode_bipartitions()
    
    bipartitions1 = set()
    for edge in tree1.postorder_edge_iter():
        if edge.bipartition and not edge.bipartition.is_trivial():
            bipartitions1.add(edge.bipartition.split_bitmask)
    
    bipartitions2 = set()
    for edge in tree2.postorder_edge_iter():
        if edge.bipartition and not edge.bipartition.is_trivial():
            bipartitions2.add(edge.bipartition.split_bitmask)
    
    common_bipartitions = bipartitions1.intersection(bipartitions2)
    common_clades = len(common_bipartitions)
    
    return common_clades, common_clade_descriptions

def find_conflicting_clades(tree1: Tree, tree2: Tree) -> Tuple[int, List[str]]:
    """
    Encontra clados conflitantes entre duas árvores
    """
    conflicting_clades = 0
    
    tree1.encode_bipartitions()
    tree2.encode_bipartitions()
    
    bipartitions1 = set()
    bipartitions2 = set()
    
    for edge in tree1.postorder_edge_iter():
        if edge.bipartition and not edge.bipartition.is_trivial():
            bipartitions1.add(edge.bipartition.split_bitmask)
    
    for edge in tree2.postorder_edge_iter():
        if edge.bipartition and not edge.bipartition.is_trivial():
            bipartitions2.add(edge.bipartition.split_bitmask)
    
    conflicting_clades = len(bipartitions1.symmetric_difference(bipartitions2))
    
    return conflicting_clades, []

def get_tree_statistics(tree: Tree) -> Dict:
    """
    Obtém estatísticas detalhadas de uma árvore com detecção precisa de binariedade
    """
    nodes = 0
    leaves = 0
    internal_nodes = 0
    politomy_count = 0
    non_binary_nodes = []

    for node in tree:
        nodes += 1
        if node.is_leaf():
            leaves += 1
        else:
            internal_nodes += 1
            if len(node.child_nodes()) > 2:
                politomy_count += 1
                non_binary_nodes.append(node.label)

    branch_lengths = []
    for edge in tree.postorder_edge_iter():
        if edge.length is not None:
            branch_lengths.append(edge.length)

    avg_branch_length = sum(branch_lengths) / len(branch_lengths) if branch_lengths else 0

    return {
        'total_nodes': nodes,
        'leaf_nodes': leaves,
        'internal_nodes': internal_nodes,
        'avg_branch_length': round(avg_branch_length, 6),
        'tree_length': round(tree.length(), 6),
        'is_binary': politomy_count == 0,
        'politomy_count': politomy_count,
        'non_binary_nodes': non_binary_nodes
    }

def calculate_similarity(tree1: Tree, tree2: Tree, common_clades: int) -> float:
    """
    Calcula score de similaridade corretamente para árvores não binárias
    """
    tree1_bipartitions = count_non_trivial_bipartitions(tree1)
    tree2_bipartitions = count_non_trivial_bipartitions(tree2)
    
    min_bipartitions = min(tree1_bipartitions, tree2_bipartitions)
    
    if min_bipartitions == 0:
        return 0.0
    
    return (common_clades / min_bipartitions) * 100


def check_consistency(rf_distance, quartet_distance, num_taxa):
    max_rf = 2 * (num_taxa - 3)
    max_quartet = num_taxa * (num_taxa-1) * (num_taxa-2) * (num_taxa-3) // 24
    
    normalized_rf = rf_distance / max_rf
    normalized_quartet = quartet_distance / max_quartet
    
    if abs(normalized_rf - normalized_quartet) > 0.5:
        return "Inconsistent results: RF and Quartet metrics show significant discrepancy"
    else:
        return "Results are consistent"

@app.post("/api/tree/compare")
async def compare_trees(tree_data: dict):
    """
    Compara duas árvores filogenéticas no formato Nexus
    """
    try:
        tree1_nexus = tree_data.get('tree1')
        tree2_nexus = tree_data.get('tree2')
        
        if not tree1_nexus or not tree2_nexus:
            raise HTTPException(status_code=400, detail="Both tree1 and tree2 content are required")
        
        trees1 = extract_trees_from_nexus(tree1_nexus)
        if len(trees1) == 0:
            raise HTTPException(status_code=400, detail="No trees found in tree1 Nexus content")
        
        taxon_namespace = trees1[0].taxon_namespace
        
        trees2 = extract_trees_from_nexus(tree2_nexus, taxon_namespace)
        if len(trees2) == 0:
            raise HTTPException(status_code=400, detail="No trees found in tree2 Nexus content")
        
        tree1 = trees1[0]
        tree2 = trees2[0]
        
        tree1.is_rooted = False
        tree2.is_rooted = False
        
        if tree1.taxon_namespace is not tree2.taxon_namespace:
            tree1, tree2 = align_taxon_namespaces(tree1, tree2)
        
        rf_distance = calculate_rf_distance(tree1, tree2)
        quartet_distance = calculate_quartet_distance(tree1, tree2)
        common_clades, common_clade_descriptions = find_common_clades(tree1, tree2)
        conflicting_clades, conflicting_descriptions = find_conflicting_clades(tree1, tree2)
        
        tree1_stats = get_tree_statistics(tree1)
        tree2_stats = get_tree_statistics(tree2)
        
        similarity_score = calculate_similarity(tree1, tree2, common_clades)
        
        return {
            'rf_distance': rf_distance,
            'quartet_distance': quartet_distance,
            'common_clades': common_clades,
            'conflicting_clades': conflicting_clades,
            'similarity_score': round(similarity_score, 2),
            'tree1_stats': tree1_stats,
            'tree2_stats': tree2_stats,
            'taxon_count': len(tree1.taxon_namespace),
            'comparison_notes': {
                'consistency': check_consistency(rf_distance,quartet_distance,len(tree1.taxon_namespace)),
                'rf_interpretation': interpret_rf_distance(rf_distance, tree1_stats['leaf_nodes']),
                'quartet_interpretation': interpret_quartet_distance(quartet_distance, tree1_stats['leaf_nodes']),
                'similarity_interpretation': interpret_similarity(similarity_score)
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error comparing trees: {str(e)}")


def interpret_rf_distance(rf_distance: int, num_taxa: int) -> str:
    """Interpret the RF distance"""
    max_rf = 2 * (num_taxa - 3) if num_taxa > 3 else 0
    if max_rf == 0:
        return "Identical trees or too small for RF comparison"
    
    normalized_rf = rf_distance / max_rf
    if normalized_rf < 0.1:
        return "Trees are very similar"
    elif normalized_rf < 0.3:
        return "Trees are similar with small differences"
    elif normalized_rf < 0.6:
        return "Trees are moderately different"
    else:
        return "Trees are very different"


def interpret_quartet_distance(qd: int, num_taxa: int) -> str:
    """Interpret the Quartet distance"""
    max_qd = num_taxa * (num_taxa-1) * (num_taxa-2) * (num_taxa-3) // 24 if num_taxa >= 4 else 0
    if max_qd == 0:
        return "Not applicable (fewer than 4 taxa)"
    
    normalized_qd = qd / max_qd
    if normalized_qd < 0 :
        return "Non-binary trees detected"
    elif normalized_qd < 0.1:
        return "Low quartet discordance"
    elif normalized_qd < 0.3:
        return "Moderate quartet discordance"
    elif normalized_qd < 0.6:
        return "High quartet discordance"
    else:
        return "Very high quartet discordance"


def interpret_similarity(similarity: float) -> str:
    """Interpret the similarity score"""
    if similarity > 90:
        return "Trees are nearly identical"
    elif similarity > 70:
        return "Trees are very similar"
    elif similarity > 50:
        return "Trees are moderately similar"
    elif similarity > 30:
        return "Trees have limited similarity"
    else:
        return "Trees are very different"


@app.get("/api/tree/pattern-analysis/{project_name}")
async def analyze_tree_patterns(
    project_name: str,
    rare_threshold: float = Query(0.3, ge=0.0, le=1.0),
    robust_threshold: float = Query(0.6, ge=0.0, le=1.0),
    min_pattern_size: int = Query(2, ge=1),
    max_pattern_size: int = Query(100, ge=1)
):
    """
    Analisa padrões de assinatura única e padrões quase-invariantes em todas as árvores de um projeto.
    """
    try:
        project_path = os.path.join(PROJECTS_ROOT, project_name)
        
        fpmax_path = os.path.join(project_path, "out", "outputs", "all_results_fpmax.csv")
        metadata_path = os.path.join(project_path, "out", "outputs", "metadata.json")
        
        if not os.path.exists(fpmax_path):
            raise HTTPException(status_code=404, detail="Arquivo FPMax não encontrado")
        if not os.path.exists(metadata_path):
            raise HTTPException(status_code=404, detail="Arquivo de metadados não encontrado")
        
        fpmax_df = pd.read_csv(fpmax_path)
               
        hash_subtrees_infos = dict()
        analysis_result = dict()
        
        for metadata in iter_metadata_nodes(metadata_path, iter_tree=True):
            hash_subtrees_infos.update(get_hash_to_subtree(metadata))
        
        analysis_result = analyze_patterns(
            fpmax_df=fpmax_df, 
            rare_threshold=rare_threshold, 
            robust_threshold=robust_threshold, 
            min_size=min_pattern_size, 
            max_size=max_pattern_size, 
            hash_to_subtree_info=hash_subtrees_infos
        )
        
        return analysis_result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na análise: {str(e)}")

def get_hash_to_subtree(metadata):
    """_summary_

    Args:
        metadata (_type_): _description_

    Returns:
        _type_: _description_
    """
    hash_to_subtree_info = {}
    if isinstance(metadata, dict):
        for tree_name, subtrees in metadata.items():
            for subtree_name, subtree_info in subtrees.items():
                terminals = [d.get("newick", "Unknown") for d in subtree_info.get('data_terminals', [])]
                    
                hash_to_subtree_info[subtree_info['List_terminals_hash']] = {
                    "tree_name": tree_name,
                    "subtree_name": subtree_name,
                    "terminals": terminals, 
                    "nodes": {}
                }
                
                get_newick = lambda h: next((d["newick"] for d in  subtree_info['data_terminals'] if d["terminal_hash"] == h), None)
                for terminal_hash in subtree_info['Terminals']:
                    hash_to_subtree_info[subtree_info['List_terminals_hash']]['nodes'][terminal_hash] = get_newick(terminal_hash)
    return hash_to_subtree_info

def analyze_patterns(fpmax_df, rare_threshold, robust_threshold, min_size, max_size, hash_to_subtree_info = {}):
    """
    Analisa padrões do DataFrame FPMax e metadados.
    """
    def parse_frozenset(fset_str):
        try:
            cleaned = fset_str.replace('frozenset({', '').replace('})', '')
            items = cleaned.split(', ')
            return set(int(item) for item in items if item.strip())
        except:
            return set()  
    
    patterns = []
    for _, row in fpmax_df.iterrows():
        try:
            itemset = parse_frozenset(row['itemsets'])
            support = row['support']
            
            if min_size <= len(itemset) <= max_size:
                patterns.append({
                    'itemset': itemset,
                    'support': support,
                    'size': len(itemset)
                })
        except Exception as e:
            continue
    
    # Encontrar padrões únicos (baixo suporte)
    unique_signatures = []
    
    method_sensitive_signatures = []
    topologically_robust = []
    
    for pattern in patterns:
        node_names = []
        terminals_involved = set()
        
        for h in pattern['itemset']:
            if h in hash_to_subtree_info:
                node_names.append(hash_to_subtree_info[h]["subtree_name"])
                terminals_involved.update(hash_to_subtree_info[h]["terminals"])
            else:
                node_names.append(f"Unknown_{h}")
        
        pattern_data = {
            'pattern': list(pattern['itemset']),
            'node_names': node_names,
            'terminals': list(terminals_involved), # Nova informação adicionada
            'support': pattern['support'],
            'size': pattern['size']
        }

        if pattern['support'] <= rare_threshold:
            method_sensitive_signatures.append(pattern_data)
        elif pattern['support'] >= robust_threshold:
            topologically_robust.append(pattern_data)
    
    # Encontrar padrões quase-invariantes (alto suporte)
    quasi_invariant = []
    for pattern in patterns:
        if pattern['support'] >= robust_threshold:
            node_names = []
            for h in pattern['itemset']:
                if h in hash_to_subtree_info:
                    node_names.append(hash_to_subtree_info[h]["subtree_name"])
                else:
                    node_names.append(f"Unknown_{h}")
            
            quasi_invariant.append({
                'pattern': list(pattern['itemset']),
                'node_names': node_names,
                'support': pattern['support'],
                'size': pattern['size']
            })
    
    pattern_sizes = [p['size'] for p in patterns]
    support_values = [p['support'] for p in patterns]
    
    statistics = {
        'total_patterns': len(patterns),
        'unique_signatures_count': len(unique_signatures),
        'quasi_invariant_count': len(quasi_invariant),
        'avg_pattern_size': sum(pattern_sizes) / len(pattern_sizes) if pattern_sizes else 0,
        'avg_support': sum(support_values) / len(support_values) if support_values else 0,
        'size_distribution': dict(Counter(pattern_sizes)),
        'support_distribution': {
            'low': len([s for s in support_values if s <= 0.3]),
            'medium': len([s for s in support_values if 0.3 < s <= 0.7]),
            'high': len([s for s in support_values if s > 0.7])
        }
    }
    
    tree_coverage = analyze_tree_coverage(patterns, hash_to_subtree_info)
    
    return {
        'method_sensitive_signatures': method_sensitive_signatures,
        'topologically_robust': topologically_robust,
        'pattern_statistics': statistics, 
        'tree_coverage': tree_coverage
    }

def analyze_tree_coverage(patterns, hash_to_subtree_info):
    """
    Analisa a cobertura dos padrões nas árvores.
    """
    tree_patterns = defaultdict(list)

    for pattern in patterns:
        for h in pattern['itemset']:
            if h in hash_to_subtree_info:
                tree_info = hash_to_subtree_info[h]
                tree_name = tree_info["tree_name"]
                
                tree_patterns[tree_name].append({
                    'pattern_hash': h,
                    'support': pattern['support'],
                    'size': pattern['size']
                })
    
    coverage_stats = {}
    for tree_name, patterns in tree_patterns.items():
        coverage_stats[tree_name] = {
            'pattern_count': len(patterns),
            'avg_support': sum(p['support'] for p in patterns) / len(patterns) if patterns else 0,
            'size_range': {
                'min': min(p['size'] for p in patterns) if patterns else 0,
                'max': max(p['size'] for p in patterns) if patterns else 0,
                'avg': sum(p['size'] for p in patterns) / len(patterns) if patterns else 0
            }
        }
    
    return coverage_stats

#  WebSocket Endpoints 

async def log_watcher(project_name: str):
    """Observa um arquivo de log e transmite novas linhas via WebSocket. (Para logs antigos)"""
    print(f"Iniciando observador para o projeto: {project_name}")
    
    project_path = os.path.join(PROJECTS_ROOT, project_name)
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
            print(f"Lendo histórico do log: {log_path}")
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
        print(f"Observador de histórico para o projeto {project_name} concluído.")
        if project_name in active_watchers:
            del active_watchers[project_name]
            

@app.post("/api/ncbi/download")
async def ncbi_download_sequences(request: NCBIDownloadRequest):
    try:
        result = ncbi_service.download_sequences(
            query=request.query,
            species_name=request.species_name,  
            retmax=request.retmax,
            initial_min_length=request.initial_min_length,
            refined_min_length=request.refined_min_length,
            utr5_end=request.utr5_end,
            utr3_start=request.utr3_start,
            similarity_threshold=request.similarity_threshold
        )
        
        if result["success"]:
            return {
                "success": True,
                "message": f"Download concluído: {result['count']} sequências de {result['species']}",
                "data": result
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no download: {str(e)}")
    
@app.post("/api/ncbi/download-accessions")
async def ncbi_download_by_accessions(request: NCBIAccessionRequest):
    """
    Baixa sequências do NCBI baseado em números de acesso.
    """
    try:
        result = ncbi_service.download_from_accessions(
            accessions=request.accessions,
            species_name=request.species_name,
            initial_min_length=request.initial_min_length,
            refined_min_length=request.refined_min_length,
            utr5_end=request.utr5_end,
            utr3_start=request.utr3_start,
            similarity_threshold=request.similarity_threshold
        )
        
        if result["success"]:
            return {
                "success": True,
                "message": f"Download concluído: {result['count']} sequências de {result['species']}",
                "data": result
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no download: {str(e)}")
    
@app.post("/api/ncbi/search-species")
async def ncbi_search_species(request: NCBISearchRequest):
    """
    Busca espécies no NCBI para autocompletar.
    """
    try:
        species_list = ncbi_service.search_species(
            query=request.query,
            retmax=request.retmax
        )
        
        return {
            "success": True,
            "count": len(species_list),
            "species": species_list
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na busca: {str(e)}")

@app.get("/api/ncbi/email")
async def get_ncbi_email():
    """
    Retorna o email configurado para o NCBI.
    """
    return {"email": Entrez.email}

@app.post("/api/ncbi/set-email")
async def set_ncbi_email(email: str = Form(...)):
    """
    Define o email para consultas ao NCBI.
    """
    try:
        if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            raise HTTPException(status_code=400, detail="Formato de email inválido")
        
        Entrez.email = email
        ncbi_service = NCBIAcquisition(
            email=email,
            work_dir=NCBI_WORK_DIR,
            data_root=DATA_ROOT
        )
        
        return {"success": True, "message": f"Email configurado: {email}"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao configurar email: {str(e)}")
    
@app.post("/upload-data")
async def upload_data(
    name: str = Form(..., description="Nome da pasta onde os dados serão salvos"),
    files: List[UploadFile] = File(..., description="Arquivos para upload (FASTA, ZIP)")
):
    """
    Faz upload de arquivos para análise, concatenando sequências em um único arquivo FASTA.
    
    Args:
        name (str): Nome da pasta onde os dados serão salvos
        files (List[UploadFile]): Arquivos para upload (FASTA ou ZIP com FASTA)
    
    Returns:
        dict: Mensagem de sucesso com informações do upload
    """
    try:
        if not name or not re.match(r'^[a-zA-Z0-9_-]+$', name):
            raise HTTPException(status_code=400, detail="Nome inválido. Use apenas letras, números, hífens e underscores.")
        
        target_dir = os.path.join(DATA_ROOT, name)
        os.makedirs(target_dir, exist_ok=True)
        
        final_fasta_path = os.path.join(target_dir, "concatenated_sequences.fasta")
        all_sequences = []
        processed_files = []
        
        for uploaded_file in files:
            file_content = await uploaded_file.read()
            
            if uploaded_file.filename.endswith('.zip'):
                with zipfile.ZipFile(BytesIO(file_content), 'r') as zip_ref:
                    zip_files = zip_ref.namelist()
                    fasta_files = [f for f in zip_files if f.lower().endswith(('.fasta', '.fa', '.fas', '.faa',''))]
                    
                    for fasta_file in fasta_files:
                        with zip_ref.open(fasta_file) as f:
                            content = f.read().decode('utf-8', errors='ignore')
                            sequences = list(SeqIO.parse(StringIO(content), "fasta"))
                            all_sequences.extend(sequences)
                            processed_files.append(fasta_file)
            
            elif uploaded_file.filename.lower().endswith(('.fasta', '.fa', '.fas', '.faa')):
                content = file_content.decode('utf-8', errors='ignore')
                sequences = list(SeqIO.parse(StringIO(content), "fasta"))
                all_sequences.extend(sequences)
                processed_files.append(uploaded_file.filename)
            
            else:
                other_file_path = os.path.join(target_dir, uploaded_file.filename)
                with open(other_file_path, 'wb') as f:
                    f.write(file_content)
                processed_files.append(uploaded_file.filename)
        
        if all_sequences:
            with open(final_fasta_path, 'w') as output_handle:
                SeqIO.write(all_sequences, output_handle, "fasta")
        
        return {
            "message": "Upload realizado com sucesso",
            "folder_name": name,
            "processed_files": processed_files,
            "total_sequences": len(all_sequences),
            "output_file": "concatenated_sequences.fasta" if all_sequences else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro durante o upload: {str(e)}")

@app.get("/uploaded-data", response_model=List[Project])
async def get_uploaded_data():
    """
    Lista todos os conjuntos de dados enviados via upload.
    """
    uploaded_folders = []
    for folder_name in sorted(os.listdir(DATA_ROOT)):
        full_path = os.path.join(DATA_ROOT, folder_name)
        if os.path.isdir(full_path):
            fasta_files = glob.glob(os.path.join(full_path, "*.fasta")) + \
                         glob.glob(os.path.join(full_path, "*.fa")) + \
                         glob.glob(os.path.join(full_path, "*.fas")) + \
                         glob.glob(os.path.join(full_path, "*")) + \
                         glob.glob(os.path.join(full_path, "*.faa"))
            
            if fasta_files:
                uploaded_folders.append(Project(
                    name=folder_name,
                    last_modified=datetime.datetime.fromtimestamp(os.path.getmtime(full_path))
                ))
    
    return uploaded_folders
            

@app.websocket("/ws/progress/{project_name}")
async def websocket_progress_endpoint(websocket: WebSocket, project_name: str):
    """
    WebSocket para monitorar em tempo real o progresso de execução de um workflow.

    - Conecta clientes ao projeto especificado.
    - Envia logs e atualizações de progresso.
    - Permite acompanhar execução mesmo após início.

    Args:
        project_name (str): Nome do projeto.
    """
    await manager.connect(project_name, websocket)
    
    if project_name not in running_workflows and project_name not in active_watchers:
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
    """
    WebSocket para monitoramento de métricas do sistema em tempo real.

    Retorna periodicamente:
        - **cpu**: Uso de CPU em porcentagem
        - **memory**: Uso de memória RAM em porcentagem
        - **disk**: Uso de disco em porcentagem
    """
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

@app.get("/api/system/health")
async def system_health():
    """Retorna status detalhado de todos os projetos e processos"""
    health_status = {
        "timestamp": datetime.datetime.now().isoformat(),
        "running_workflows": list(running_workflows.keys()),
        "projects_status": {}
    }
    
    for project_name in os.listdir(PROJECTS_ROOT):
        project_path = os.path.join(PROJECTS_ROOT, project_name)
        if os.path.isdir(project_path):
            status = await get_detailed_project_status(project_name)
            health_status["projects_status"][project_name] = status
    
    return health_status

async def get_detailed_project_status(project_name: str) -> Dict:
    """Obtém status detalhado de um projeto específico"""
    project_path = os.path.join(PROJECTS_ROOT, project_name)
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