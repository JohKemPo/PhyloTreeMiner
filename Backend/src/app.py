from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query, Response, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel, Field

from typing import List, Dict, Literal, Optional, Any, Tuple
import os, sys, datetime, mimetypes, asyncio, re, psutil, json, ijson, random, glob, zipfile, shutil
import pandas as pd
from collections import defaultdict, Counter
import threading
import numpy as np

from Bio import SeqIO, Entrez, Phylo
from io import StringIO, BytesIO
from dendropy import Tree, TreeList, TaxonNamespace
from dendropy.calculate import treecompare

from src.routers.neo4j_router import router as neo4j_router
from src.routers.ncbi_router import router as ncbi_router
from src.routers.cql_router import router as cql_router
from src.routers.cql_batch_router import router as cql_batch_router
from src.services.neo4j_services import neo4j_service
from src.services.execution_state import resolver_estado
from src.services.ncbi_acquisition import NCBIAcquisition
from src.services.genericOWIDAnalyzer import GenericOWIDAnalyzer
from src.services.cql_batch_service import init_cql_batch_service
from src.utils.treePlot import render_annotated_tree, map_country_to_region

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PATH_BASE_WORKFLOW = os.path.abspath(os.path.join(BASE_DIR, "../../BioComp_UFF"))
DATA_ROOT = os.path.join(PATH_BASE_WORKFLOW, "data")
PROJECTS_ROOT = os.path.join(PATH_BASE_WORKFLOW, "projects")

WORKFLOW_SCRIPT_PATH = os.path.join(PATH_BASE_WORKFLOW, "workflow.py")

# O registro de alinhadores vive no submódulo, junto do código que os executa.
# Duplicar a tabela aqui criaria dois universos de verdade sobre os mesmos
# limites — que é exatamente o defeito D5, agora em outro assunto.
if PATH_BASE_WORKFLOW not in sys.path:
    sys.path.insert(0, PATH_BASE_WORKFLOW)
from workflow.alignment.aligners import (ALIGNERS, memoria_disponivel_bytes,
                                         viability as aligner_viability)

NCBI_WORK_DIR = os.path.join(BASE_DIR, "temp_ncbi")
os.makedirs(NCBI_WORK_DIR, exist_ok=True)

def resolve_within(base: str, *parts: str) -> str:
    """Resolve base/parts e garante que o resultado permanece dentro de base."""
    base = os.path.abspath(base)
    target = os.path.abspath(os.path.join(base, *parts))
    try:
        if os.path.commonpath([base, target]) != base:
            raise HTTPException(status_code=403, detail="Acesso negado: caminho fora do diretório permitido.")
    except ValueError:
        raise HTTPException(status_code=403, detail="Acesso negado: caminho fora do diretório permitido.")
    return target

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

_ORIGENS_PADRAO = "http://localhost:5173,http://127.0.0.1:5173"
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", _ORIGENS_PADRAO).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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

#: Uma linha de stderr só é erro se ela se declarar erro. Sem isto, a barra de
#: progresso do `tqdm` — que sai em stderr — era transmitida como ERROR (D22).
_NIVEL_ERRO_STDERR = re.compile(r"\b(ERROR|CRITICAL|Traceback|Exception|Error:)\b")


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

                # D22 — stderr NÃO é sinônimo de erro. O `tqdm` escreve a barra
                # de progresso ali, e rotular tudo como ERROR fazia uma execução
                # saudável chegar ao usuário como enxurrada de erros. A barra
                # vira progresso; o resto vira aviso, não erro.
                tqdm_match = tqdm_regex.search(line_str)
                if tqdm_match:
                    last_percentage = int(tqdm_match.group(1))
                    await manager.broadcast(project_name, {
                        "type": "tqdm_update",
                        "payload": {"percentage": last_percentage, "details": line_str}
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
    if not re.match(r'^[A-Za-z0-9_-]+$', project_name):
        raise HTTPException(status_code=400, detail="Nome de projeto inválido.")
    project_path = resolve_within(PROJECTS_ROOT, project_name)
    if not os.path.isdir(project_path):
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    if project_name in running_workflows:
        raise HTTPException(status_code=409, detail=f"O workflow para o projeto '{project_name}' já está em execução.")

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

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falha ao iniciar o workflow: {e}")

@app.post("/projects/{project_name}/rerun", status_code=202)
async def rerun_workflow(project_name: str):
    """
    Re-executa um workflow existente usando as configurações salvas.
    """
    if not re.match(r'^[A-Za-z0-9_-]+$', project_name):
        raise HTTPException(status_code=400, detail="Nome de projeto inválido.")
    project_path = resolve_within(PROJECTS_ROOT, project_name)
    config_backup_path = os.path.join(project_path, "out", "outputs", "config_backup.json")

    if not os.path.isdir(project_path):
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

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falha ao reexecutar o workflow: {e}")

@app.get("/projects/{project_name}/can-rerun")
async def can_rerun_project(project_name: str):
    """
    Verifica se um projeto pode ser reexecutado (tem configurações salvas).
    """
    if not re.match(r'^[A-Za-z0-9_-]+$', project_name):
        raise HTTPException(status_code=400, detail="Nome de projeto inválido.")
    project_path = resolve_within(PROJECTS_ROOT, project_name)
    config_backup_path = os.path.join(project_path, "out", "outputs", "config_backup.json")

    if not os.path.isdir(project_path):
        return {"can_rerun": False, "reason": "Projeto não encontrado"}
    
    if not os.path.exists(config_backup_path):
        return {"can_rerun": False, "reason": "Configurações não salvas"}
    
    return {"can_rerun": True}

@app.delete("/projects/{project_name}", status_code=200)
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
    if not re.match(r'^[A-Za-z0-9_-]+$', project_name):
        raise HTTPException(status_code=400, detail="Nome de projeto inválido.")
    project_path = resolve_within(PROJECTS_ROOT, project_name)

    if not os.path.isdir(project_path):
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    estado = resolver_estado(project_path, em_execucao=project_name in running_workflows)
    if estado.estado == "running":
        raise HTTPException(
            status_code=409,
            detail=f"O projeto '{project_name}' está em execução; não pode ser excluído.",
        )

    try:
        shutil.rmtree(project_path)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Falha ao excluir o projeto: {e}")

    return {"message": f"Projeto '{project_name}' excluído com sucesso."}

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
    for project_name in sorted(os.listdir(PROJECTS_ROOT)):
        full_path = os.path.join(PROJECTS_ROOT, project_name)
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

@app.post("/api/owid/metadata/")
async def get_owid_metadata(request: Request):
    try:
        data = await request.json()
        analyzer = GenericOWIDAnalyzer(data)
        report = analyzer.generate_comprehensive_report()
        return JSONResponse(content=report)
    except HTTPException:
        raise
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
        accession=accession_base(node['newick'])
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
    
def accession_base(label: str) -> str:
    """Acesso sem a versão.

    IQ-TREE e RAxML gravam o rótulo truncado em 10 caracteres pelo limite de
    nome do PHYLIP: `NC_008030.1` vira `NC_008030.` (D13). Os dois rótulos
    designam o mesmo registro do GenBank, e é por este acesso que os dois se
    reencontram."""
    return label.split('.')[0] if label else label


def _riqueza_metadado(node: dict) -> tuple:
    """Quanto metadado real o registro carrega. Ordena registros do mesmo
    acesso: o rótulo truncado vem sempre com `features` vazio."""
    metadata = node.get('metadata') or {}
    return (len(metadata.get('features') or []),
            len(metadata.get('annotations') or {}))


def iter_metadata_nodes(file_path: str, only_first: bool = True, iter_tree: bool = False):
    """Terminais do metadata.json, um por acesso, com o registro mais rico.

    D13 — o arquivo guarda cada terminal uma vez por árvore, e as árvores de
    IQ-TREE e RAxML trazem o rótulo truncado, sem `features`. Ler só a
    primeira árvore (o comportamento anterior) descartava metadado genuíno
    sempre que essa árvore era uma delas: em VARV-6 a primeira é
    `clustalo_raxml` e 3 dos 6 táxons — incluindo `NC_001611`, o genoma de
    referência de Variola — chegavam à API sem organismo, país, hospedeiro
    nem data.

    Por isso lê-se árvore a árvore, guardando o registro mais rico de cada
    acesso, e para-se na primeira árvore em que nenhum táxon esteja vazio.
    Quando a primeira árvore já está completa — o caso de todos os projetos
    de Zika e de VARV-49 — o custo é idêntico ao anterior.

    `only_first` não tem efeito: no código anterior o `continue` do ramo
    `iter_tree` pulava o `break`, e o ramo de terminais agora decide sozinho
    quando parar. Mantido só para não quebrar chamadas existentes.
    """
    if iter_tree:
        with open(file_path, 'rb') as f:
            for base_node in ijson.items(f, 'item.item'):
                if isinstance(base_node, dict):
                    yield base_node
        return

    # acesso -> (riqueza, ordem de primeira aparição, nó)
    melhores = {}

    with open(file_path, 'rb') as f:
        for base_node in ijson.items(f, 'item.item'):
            if not isinstance(base_node, dict):
                continue
            for tree_name, tree_content in base_node.items():
                for subtree_name, subtree_content in tree_content.items():
                    if isinstance(subtree_content, dict) and 'data_terminals' in subtree_content:
                        for node in subtree_content['data_terminals']:
                            rotulo = node.get('newick')
                            if not rotulo:
                                continue
                            acesso = accession_base(rotulo)
                            riqueza = _riqueza_metadado(node)
                            anterior = melhores.get(acesso)
                            if anterior is None:
                                melhores[acesso] = (riqueza, len(melhores), node)
                            elif riqueza > anterior[0]:
                                melhores[acesso] = (riqueza, anterior[1], node)

            if melhores and all(r > (0, 0) for r, _, _ in melhores.values()):
                break

    # Ordem de primeira aparição no arquivo: determinística, e a mesma que a
    # versão anterior produzia (04-rigor-cientifico §4).
    for _, (_, _, node) in sorted(melhores.items(), key=lambda kv: kv[1][1]):
        yield node


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
    


def get_node_information(annotations, features, qualifiers, accession: str):
    """
    Retorna informações do nó

    Return
    ----
    accessionId,
    lineage,
    host,
    country,
    year,
    pubmedId
    """
    accessionIdAux = annotations.get('accessions',['Unknown'])
    accessionId = accessionIdAux[0] if isinstance(accessionIdAux, list) else accessionIdAux
    if accessionId == 'Unknown':
        accessionId = accession
        
    lineage = annotations.get("organism") or annotations.get("source") or "Unknown"

    isolate = qualifiers.get("isolate", ["Unknown"])

    host_list = qualifiers.get("host", ["Unknown"])
    host_raw = host_list[0] if isinstance(host_list, list) else host_list
    # O GenBank permite anexar atributos estruturados após ';' (sex, age, breed).
    # Não faz parte do nome do organismo; mantê-los fragmenta hospedeiros
    # idênticos em entradas distintas (D12d).
    host = host_raw.split(';')[0].strip() if host_raw else host_raw

    # Um metadado ausente é ausente — não é inferido de outro campo (D12a/b).
    # `strain` é um identificador de isolado, não uma localização nem uma data;
    # extrair país/ano dele por regex já produziu falsos positivos (ex.:
    # "China Horn 1948; Sabin Lab" -> país "China Horn", que não existe).
    geo_loc = qualifiers.get("geo_loc_name", [None])[0]
    country = geo_loc.split(':')[0].strip() if geo_loc else "Unknown"

    region = map_country_to_region(country)

    coll_date = qualifiers.get("collection_date", [None])[0]
    year = "Unknown Date"
    if coll_date:
        year_match = re.search(r'\d{4}', coll_date)
        year = year_match.group(0) if year_match else "Unknown Date"

    # `references` já vem serializado pelo BioComp_UFF (workflow/utils/treeUtils.py,
    # seqrecord_to_serializable_dict) com o `pubmed_id` do artigo associado ao
    # registro do GenBank, quando o autor da submissão o declarou. Nem todo
    # registro tem: usa-se a primeira referência que de fato o traga.
    pubmed_id = None
    for referencia in annotations.get("references") or []:
        candidato = referencia.get("pubmed_id") if isinstance(referencia, dict) else None
        if candidato:
            pubmed_id = candidato
            break

    return {
        "accessionId":accessionId,
        "lineage":lineage,
        "host":host,
        "country":country,
        "region": region,
        "year":year,
        "isolate": isolate,
        "pubmedId": pubmed_id
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

    except HTTPException:
        raise
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tree/{project_name}/insights")
async def get_tree_insights(project_name: str):
    """Processa agregações e métricas de forma iterativa no servidor."""
    metadata_path = os.path.join(PROJECTS_ROOT, project_name, 'out', 'outputs', "metadata.json")
    if not os.path.exists(metadata_path):
        raise HTTPException(status_code=404, detail="Metadata not found")

    try:

        cache = get_metadata_cache(metadata_path)

        return cache["insights"]
    except HTTPException:
        raise
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
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading metadata: {e}")

@app.get("/api/gen_plot/{project_name}", status_code=200)
async def generate_tree_plot(project_name: str):
    project_path = os.path.join(PROJECTS_ROOT, project_name)    
    
    # Adicionado: Resolução do caminho da árvore (Ajuste a extensão/nome conforme seu pipeline)
    tree_path = os.path.join(project_path, 'out','Trees', 'tree_dataset_final_mafft_iqtree.nwk') 
    nexus_path = os.path.join(project_path, 'out','Trees', 'tree_dataset_final_mafft_iqtree.nexus') 
    plot_dir = os.path.join(project_path, 'out', 'outputs', "plot")
    plot_path = os.path.join(plot_dir, "arvore_anotada_final.png")
    metadata_path = os.path.join(project_path, 'out', 'outputs', "metadata.json")
    
    if not os.path.exists(metadata_path):
        raise HTTPException(status_code=404, detail="Metadata not found")
    

    if not os.path.exists(tree_path):
        if os.path.exists(nexus_path):
            try:
                print("Convertendo arquivo NEXUS para Newick...")
                Phylo.convert(nexus_path, 'nexus', tree_path, 'newick')
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Erro ao converter NEXUS para Newick: {str(e)}")
        else:
            raise HTTPException(status_code=404, detail="Tree files (.nwk or .nexus) not found")
        
    try:
        # Garante que o diretório de output do plot exista
        os.makedirs(plot_dir, exist_ok=True)
        
        # Puxa os dados cacheados/indexados
        cache = get_metadata_cache(metadata_path)
        node_index = cache["node_index"] # Utiliza o dicionário indexado pela chave para acesso O(1) no ETE3 (M4.12: era cache["nodes"], uma lista)

        # Otimização: Só gera a imagem se ela não existir ou se a árvore/metadados forem mais recentes
        # Para forçar a geração sempre, remova este if.
        if not os.path.exists(plot_path):
            # Chamada da função ETE3 desenvolvida anteriormente
            render_annotated_tree(
                tree_file=tree_path, 
                metadata_dict=node_index, 
                output_file=plot_path
            )

        # Retorna o arquivo binário da imagem gerada
        return FileResponse(plot_path, media_type="image/png")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar a visualização: {str(e)}")

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
    requested_path = resolve_within(PROJECTS_ROOT, path)

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


#: Acima disto, um JSON não é carregado inteiro na memória para pré-visualização.
#: Os `metadata.json` chegam a 3,2 GB — lê-los de uma vez derruba o processo.
MAX_JSON_INLINE_BYTES = 8 * 1024 * 1024

#: Extensões de sequência/alinhamento: como o `.cql`, um prefixo continua útil
#: para pré-visualização. O alinhamento MAFFT-iterativo de VARV-49 já passa de
#: 11 MB, e VARV-121 (283 874 colunas) passa disso com folga.
EXTENSOES_SEQUENCIA_TRUNCAVEL = (".fasta", ".fa", ".fas", ".faa", ".aln", ".clustal")


def json_root_kind(file_path: str) -> str:
    """
    Descobre a forma da raiz de um JSON sem carregá-lo.

    O explorador precisa abrir três coisas diferentes: o `metadata.json`, que é
    uma lista de listas de árvores e tem gigabytes; e os `manifest.json` e
    `config_backup.json`, que são objetos de poucos KB. Antes, a paginação era
    fixa no prefixo `item.item` e **todo JSON que não fosse lista de listas
    devolvia 404 dizendo que o arquivo estava vazio** — que é o oposto do que
    acontecia.

    Lê apenas os dois primeiros eventos do parser incremental, então o custo
    independe do tamanho do arquivo.

    Return
    ------
    str
        ``"object"``, ``"array_of_arrays"``, ``"array"``, ``"scalar"``,
        ``"empty"`` (arquivo vazio ou só espaços) ou ``"invalid"`` (não é JSON).
        Arquivo malformado é um estado próprio, e não um 500: o explorador
        precisa dizer ao usuário o que há de errado com o arquivo.
    """
    if os.path.getsize(file_path) == 0:
        return "empty"

    with open(file_path, 'rb') as f:
        eventos = ijson.parse(f)
        try:
            _, primeiro, _ = next(eventos)
        except StopIteration:
            return "empty"
        except ijson.JSONError:
            return "invalid"

        if primeiro == "start_map":
            return "object"
        if primeiro != "start_array":
            return "scalar"

        try:
            _, segundo, _ = next(eventos)
        except StopIteration:
            return "array"
        except ijson.JSONError:
            return "invalid"
        return "array_of_arrays" if segundo == "start_array" else "array"


def get_json_total_items(file_path: str, prefixo: str = "item.item"):
    """
    Obtém o total de itens de um JSON iterável.
    Usa cache baseado no tempo de modificação do arquivo para evitar reprocessamento.
    """
    file_mtime = os.path.getmtime(file_path)
    chave = (file_path, prefixo)

    with json_count_lock:
        cache_entry = json_count_cache.get(chave)

        if cache_entry and cache_entry["mtime"] == file_mtime:
            return cache_entry["total_items"]

    total = 0
    with open(file_path, 'rb') as f:
        for _ in ijson.items(f, prefixo):
            total += 1
            
    with json_count_lock:
        json_count_cache[chave] = {
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
    Devolve um JSON para pré-visualização, paginando quando ele é grande demais
    para caber numa resposta.

    A forma da raiz decide o modo (`json_root_kind`):

    ==================  ====================================================
    `kind`              Comportamento
    ==================  ====================================================
    `array_of_arrays`   `metadata.json` — pagina por árvore, um item por vez
    `array`             pagina por elemento
    `object`            devolve inteiro; é o caso de `manifest.json` e
                        `config_backup.json`, que têm poucos KB
    ==================  ====================================================

    O campo `kind` vai na resposta porque o cliente precisa dele para decidir se
    mostra controles de paginação e qual visualizador usar — um manifesto não é
    uma árvore.
    """
    full_path = resolve_within(PROJECTS_ROOT, path)
    if not os.path.isfile(full_path):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")

    try:
        kind = json_root_kind(full_path)

        if kind == "empty":
            raise HTTPException(status_code=404, detail="O arquivo JSON está vazio.")
        if kind == "invalid":
            raise HTTPException(status_code=400, detail="O arquivo não contém JSON válido.")

        if kind in ("object", "scalar"):
            tamanho = os.path.getsize(full_path)
            if tamanho > MAX_JSON_INLINE_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail=(f"JSON de {tamanho / 1e6:.1f} MB é grande demais para "
                            f"pré-visualização inteira (limite {MAX_JSON_INLINE_BYTES / 1e6:.0f} MB)."))
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    conteudo = json.load(f)
            except json.JSONDecodeError as e:
                # Arquivo corrompido é 400, não 500: o problema está no arquivo,
                # e o explorador precisa poder dizer isso a quem clicou nele.
                raise HTTPException(status_code=400,
                                    detail=f"O arquivo não contém JSON válido: {e}")
            return {"content": conteudo, "currentIndex": 0, "totalItems": 1, "kind": kind}

        prefixo = "item.item" if kind == "array_of_arrays" else "item"
        try:
            total_items = get_json_total_items(full_path, prefixo)
        except ijson.JSONError as e:
            raise HTTPException(status_code=400,
                                detail=f"O arquivo não contém JSON válido: {e}")

        if total_items == 0:
            raise HTTPException(status_code=404, detail="O arquivo JSON está vazio.")
        if index >= total_items or index < 0:
            raise HTTPException(status_code=404, detail=f"Índice {index} fora dos limites (0 a {total_items - 1}).")

        target_item = None

        with open(full_path, 'rb') as f:
            for i, item in enumerate(ijson.items(f, prefixo)):
                if i == index:
                    target_item = item
                    break

        if target_item is None:
            raise HTTPException(status_code=404, detail="Índice não encontrado no arquivo.")

        return {
            "content": target_item,
            "currentIndex": index,
            "totalItems": total_items,
            "kind": kind,
        }

    except HTTPException:
        raise
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
    full_path = resolve_within(PROJECTS_ROOT, path)
    if not os.path.isfile(full_path):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")

    file_type = "unsupported"
    content = ""

    try:
        tamanho = os.path.getsize(full_path)
        if tamanho == 0:
            raise HTTPException(status_code=400, detail="O arquivo selecionado está vazio (0 bytes) no servidor.")

        # .cql não é um documento estruturado como o JSON: um prefixo com blocos
        # Cypher completos ainda é útil para pré-visualização, então em vez de
        # recusar servimos os primeiros MAX_JSON_INLINE_BYTES e sinalizamos o corte.
        # Sequência/alinhamento (.fasta/.aln/...) é a mesma história: um prefixo
        # com os primeiros registros já é útil, e cortar não muda o arquivo em
        # disco — só a pré-visualização.
        eh_cql = full_path.endswith(".cql")
        eh_sequencia = full_path.endswith(EXTENSOES_SEQUENCIA_TRUNCAVEL)
        eh_json = full_path.endswith(".json")
        truncado = False

        if tamanho > MAX_JSON_INLINE_BYTES and not eh_cql and not eh_sequencia:
            # `f.read()` abaixo carrega o arquivo inteiro; com um metadata.json de
            # 3,2 GB isso derruba o processo. Quem é grande é servido paginado —
            # mas `/api/file/paginated` só sabe paginar JSON, então só se sugere
            # a saída para quem de fato pode usá-la.
            sugestao = " Use /api/file/paginated." if eh_json else ""
            raise HTTPException(
                status_code=413,
                detail=(f"Arquivo de {tamanho / 1e6:.1f} MB é grande demais para pré-visualização "
                        f"(limite {MAX_JSON_INLINE_BYTES / 1e6:.0f} MB).{sugestao}"))

        mime_type, _ = mimetypes.guess_type(full_path)
        if mime_type and mime_type.startswith("image/"):
            return FileResponse(full_path)

        with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
            if eh_cql and tamanho > MAX_JSON_INLINE_BYTES:
                content = f.read(MAX_JSON_INLINE_BYTES)
                truncado = True
                # Corta no último ';' fora de string para não entregar um bloco
                # Cypher pela metade — cada bloco cortado seria um comando inválido.
                ultimo_fim_de_bloco = content.rfind(";")
                if ultimo_fim_de_bloco != -1:
                    content = content[:ultimo_fim_de_bloco + 1]
            elif eh_sequencia and tamanho > MAX_JSON_INLINE_BYTES:
                content = f.read(MAX_JSON_INLINE_BYTES)
                truncado = True
                # Corta no último registro completo. Em FASTA isso é o '>' do
                # próximo cabeçalho (ainda incompleto); em Clustal/.aln, que não
                # tem um marcador de registro, a última linha inteira já basta —
                # o MSAViewer descarta linha incompleta (`parts.length < 2`).
                if full_path.endswith((".fasta", ".fa", ".fas", ".faa")):
                    ultimo_registro = content.rfind("\n>")
                    if ultimo_registro != -1:
                        content = content[:ultimo_registro]
                else:
                    ultima_linha = content.rfind("\n")
                    if ultima_linha != -1:
                        content = content[:ultima_linha]
            else:
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
                # Devolve o JSON como está. Antes era `parsed_json[0]`, o que supunha
                # que todo JSON fosse uma lista — e fazia `manifest.json` e
                # `config_backup.json`, que são objetos, responderem 500.
                return {"content": json.loads(content), "type": file_type}
            except json.JSONDecodeError:
                pass 
        
        if file_type != "unsupported":
            resultado = {"content": content, "type": file_type}
            if truncado:
                resultado["truncated"] = True
                resultado["total_bytes"] = tamanho
                resultado["preview_bytes"] = len(content.encode("utf-8", errors="ignore"))
            return resultado

    except HTTPException:
        raise
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
    statuses = {}
    for project_name in os.listdir(PROJECTS_ROOT):
        project_path = os.path.join(PROJECTS_ROOT, project_name)
        if not os.path.isdir(project_path):
            continue
        statuses[project_name] = resolver_estado(
            project_path, em_execucao=project_name in running_workflows).estado
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

def extract_trees_from_nexus(nexus_content: str) -> List[Tree]:
    """
    Extrai árvores do conteúdo Nexus usando processamento em memória

    Sempre no próprio namespace: reaproveitar o namespace de outra árvore
    aborta a leitura quando os rótulos divergem (D13). A reconciliação é feita
    depois, por `canonical_label_map` e `align_taxon_namespaces`.
    """
    try:
        trees = TreeList.get_from_string(
            nexus_content,
            'nexus',
            rooting='force-unrooted'
        )

        return trees

    except Exception as e:
        raise ValueError(f"Failed to parse Nexus content: {str(e)}")

def leaf_labels(tree: Tree) -> set:
    """Rótulos efetivamente usados pelas folhas — não os declarados no bloco
    `TaxLabels`, que em IQ-TREE e RAxML divergem deles (D13)."""
    return {node.taxon.label for node in tree.leaf_node_iter() if node.taxon is not None}


def canonical_label_map(tree1: Tree, tree2: Tree):
    """Reconcilia rótulos truncados entre duas árvores (D13).

    IQ-TREE e RAxML gravam `NC_008030.` onde FastTree e as árvores de
    distância gravam `NC_008030.1`. Sem reconciliar, as duas árvores não têm
    táxon nenhum em comum e a comparação é recusada — em VARV-6 isso derrubava
    24 dos 45 pares.

    Devolve `rótulo -> rótulo canônico`, ou `None` quando não há reconciliação
    a fazer ou quando ela não é segura. Nunca funde dois táxons distintos:
    se dois rótulos da mesma árvore compartilham o acesso, ou se os conjuntos
    de acessos diferem, devolve `None` e a comparação segue pelos rótulos
    originais — recusar é preferível a comparar clados errados.
    """
    rotulos1, rotulos2 = leaf_labels(tree1), leaf_labels(tree2)
    if rotulos1 == rotulos2:
        return None

    por_acesso = []
    for rotulos in (rotulos1, rotulos2):
        agrupado = defaultdict(list)
        for rotulo in rotulos:
            agrupado[accession_base(rotulo)].append(rotulo)
        if any(len(v) > 1 for v in agrupado.values()):
            return None
        por_acesso.append(agrupado)

    if set(por_acesso[0]) != set(por_acesso[1]):
        return None

    return {
        rotulo: max(por_acesso[0][acesso] + por_acesso[1][acesso],
                    key=lambda r: (len(r), r))
        for acesso in por_acesso[0]
        for rotulo in por_acesso[0][acesso] + por_acesso[1][acesso]
    }


def align_taxon_namespaces(tree1: Tree, tree2: Tree, label_map: dict = None) -> Tuple[Tree, Tree]:
    """
    Alinha os taxon namespaces das duas árvores preservando todas as informações
    """
    canonico = (lambda rotulo: label_map.get(rotulo, rotulo)) if label_map else (lambda rotulo: rotulo)
    unified_ns = TaxonNamespace()

    taxon_map = {}
    for tree in [tree1, tree2]:
        for taxon in tree.taxon_namespace:
            rotulo = canonico(taxon.label)
            if rotulo not in taxon_map:
                new_taxon = unified_ns.new_taxon(label=rotulo)
                taxon_map[rotulo] = new_taxon

    # Clonar árvores com novo namespace
    tree1_aligned = tree1.__class__(tree1)
    tree2_aligned = tree2.__class__(tree2)

    # Substituir taxon namespace
    tree1_aligned.taxon_namespace = unified_ns
    tree2_aligned.taxon_namespace = unified_ns

    # Mapear todos os nós para os novos táxons
    for tree in [tree1_aligned, tree2_aligned]:
        for node in tree.leaf_node_iter():
            if node.taxon is not None and canonico(node.taxon.label) in taxon_map:
                node.taxon = taxon_map[canonico(node.taxon.label)]
    
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

def calculate_quartet_distance(tree1: Tree, tree2: Tree) -> Tuple[Optional[int], Optional[str]]:
    """
    Distância quartet, ou `None` **com o motivo** quando ela é indefinida.

    Devolvia `-1` para árvore não binária, com um `TODO` — e `-1` é um número:
    ele descia para o payload, era dividido pelo máximo em
    `interpret_quartet_distance` e em `check_consistency`, e chegava à interface
    como se fosse uma distância. É a regra 5 do projeto: **"não aplicável" nunca
    é `0` nem `-1`**.

    Politomia não é ruído a resolver por sorteio. `make_tree_binary` existia
    logo acima e resolvia politomias **aleatoriamente** — duas chamadas dariam
    dois resultados. A resposta honesta é que a métrica não se aplica, e por quê.

    Return
    ------
    tuple of (int or None, str or None)
        Valor e motivo. O motivo só é preenchido quando o valor é `None`.
    """
    n_taxa = len(tree1.taxon_namespace)

    if n_taxa < 4:
        return None, f"indefinida com menos de 4 táxons (há {n_taxa})"

    nao_binarias = [nome for nome, arvore in (("1", tree1), ("2", tree2))
                    if not get_tree_statistics(arvore)['is_binary']]
    if nao_binarias:
        return None, ("a distância quartet exige árvores binárias, e a árvore "
                      f"{' e '.join(nao_binarias)} tem politomia. Resolver a "
                      "politomia por sorteio daria um número diferente a cada "
                      "chamada, então a métrica é declarada indefinida")

    if n_taxa <= 25:
        try:
            return treecompare.quartet_distance(tree1, tree2), None
        except Exception:
            return exact_quartet_distance(tree1, tree2), None

    return approximate_quartet_distance(
        tree1, tree2, sample_size=min(1000, n_taxa * 10)), None

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


def rf_maximo(num_taxa: int) -> int:
    """Máximo teórico da RF não enraizada: `2(n-3)`, e 0 quando não há o que comparar."""
    return 2 * (num_taxa - 3) if num_taxa > 3 else 0


def quartet_maximo(num_taxa: int) -> int:
    """Número de quartetos, `C(n,4)`. Zero abaixo de 4 táxons."""
    if num_taxa < 4:
        return 0
    return num_taxa * (num_taxa - 1) * (num_taxa - 2) * (num_taxa - 3) // 24


def check_consistency(rf_distance, quartet_distance, num_taxa):
    """
    Compara as duas métricas normalizadas — quando as duas existem.

    Dividia sem guarda nenhuma: com `num_taxa <= 3` os dois máximos são zero e a
    função levantava `ZeroDivisionError`; com a quartet indefinida, dividia
    `-1` e devolvia um veredito calculado sobre um sentinela.
    """
    max_rf = rf_maximo(num_taxa)
    max_quartet = quartet_maximo(num_taxa)

    if quartet_distance is None:
        return "Comparação entre métricas indisponível: a distância quartet não se aplica a este par"
    if max_rf == 0 or max_quartet == 0:
        return f"Comparação entre métricas indefinida com {num_taxa} táxons"

    normalized_rf = rf_distance / max_rf
    normalized_quartet = quartet_distance / max_quartet

    if abs(normalized_rf - normalized_quartet) > 0.5:
        return "Inconsistent results: RF and Quartet metrics show significant discrepancy"
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

        # Cada árvore é lida no próprio namespace. Impor o da primeira à
        # segunda fazia o dendropy abortar sempre que os rótulos divergiam,
        # e é assim que D13 derrubava metade das comparações de VARV-6.
        trees2 = extract_trees_from_nexus(tree2_nexus)
        if len(trees2) == 0:
            raise HTTPException(status_code=400, detail="No trees found in tree2 Nexus content")

        tree1 = trees1[0]
        tree2 = trees2[0]

        tree1.is_rooted = False
        tree2.is_rooted = False

        tree1, tree2 = align_taxon_namespaces(tree1, tree2, canonical_label_map(tree1, tree2))

        rotulos1, rotulos2 = leaf_labels(tree1), leaf_labels(tree2)
        if rotulos1 != rotulos2:
            somente1 = sorted(rotulos1 - rotulos2)
            somente2 = sorted(rotulos2 - rotulos1)
            raise HTTPException(
                status_code=400,
                detail=("Trees do not share the same taxon set; RF and quartet "
                        f"distances are undefined. Only in tree1: {somente1}. "
                        f"Only in tree2: {somente2}."))

        rf_distance = calculate_rf_distance(tree1, tree2)
        quartet_distance, quartet_motivo = calculate_quartet_distance(tree1, tree2)
        common_clades, common_clade_descriptions = find_common_clades(tree1, tree2)
        conflicting_clades, conflicting_descriptions = find_conflicting_clades(tree1, tree2)
        
        tree1_stats = get_tree_statistics(tree1)
        tree2_stats = get_tree_statistics(tree2)
        
        similarity_score = calculate_similarity(tree1, tree2, common_clades)
        
        n_taxa = len(tree1.taxon_namespace)
        max_rf = rf_maximo(n_taxa)
        max_quartet = quartet_maximo(n_taxa)

        return {
            'rf_distance': rf_distance,
            # O máximo e o normalizado saem daqui prontos. A interface os
            # recalculava por conta própria, e duas fórmulas para a mesma
            # grandeza divergem na primeira mudança — é D5 noutro assunto.
            'rf_max': max_rf,
            'rf_normalized': round(rf_distance / max_rf, 4) if max_rf else None,
            # `null` quando indefinida, **com o motivo ao lado** (regra 5).
            'quartet_distance': quartet_distance,
            'quartet_max': max_quartet or None,
            'quartet_normalized': (round(quartet_distance / max_quartet, 4)
                                   if quartet_distance is not None and max_quartet else None),
            'quartet_note': quartet_motivo,
            'common_clades': common_clades,
            'conflicting_clades': conflicting_clades,
            'similarity_score': round(similarity_score, 2),
            'tree1_stats': tree1_stats,
            'tree2_stats': tree2_stats,
            'taxon_count': n_taxa,
            'comparison_notes': {
                'consistency': check_consistency(rf_distance, quartet_distance, n_taxa),
                'rf_interpretation': interpret_rf_distance(rf_distance, tree1_stats['leaf_nodes']),
                'quartet_interpretation': interpret_quartet_distance(quartet_distance, tree1_stats['leaf_nodes']),
                'similarity_interpretation': interpret_similarity(similarity_score)
            }
        }
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error comparing trees: {str(e)}")


def interpret_rf_distance(rf_distance: int, num_taxa: int) -> str:
    """Interpret the RF distance"""
    max_rf = rf_maximo(num_taxa)
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


def interpret_quartet_distance(qd: Optional[int], num_taxa: int) -> str:
    """Interpret the Quartet distance. `qd` é `None` quando indefinida."""
    if qd is None:
        return "Distância quartet indefinida para este par"
    max_qd = quartet_maximo(num_taxa)
    if max_qd == 0:
        return "Not applicable (fewer than 4 taxa)"

    normalized_qd = qd / max_qd
    if normalized_qd < 0.1:
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
    min_pattern_size: int = Query(1, ge=1),
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
            merge_hash_to_subtree(hash_subtrees_infos, get_hash_to_subtree(metadata))
        
        analysis_result = analyze_patterns(
            fpmax_df=fpmax_df, 
            rare_threshold=rare_threshold, 
            robust_threshold=robust_threshold, 
            min_size=min_pattern_size, 
            max_size=max_pattern_size, 
            hash_to_subtree_info=hash_subtrees_infos
        )
        
        return analysis_result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na análise: {str(e)}")

def get_hash_to_subtree(metadata):
    """Mapeia hash de clado -> informação da subárvore.

    Um clado conservado aparece na MESMA posição de hash em várias árvores. O
    mapa é, portanto, um-para-muitos: `trees` guarda todas as árvores em que o
    clado ocorre. `tree_name`/`subtree_name` seguem existindo para compatibilidade
    e apontam para a primeira ocorrência em ordem estável.
    """
    hash_to_subtree_info = {}
    if isinstance(metadata, dict):
        for tree_name in sorted(metadata):
            subtrees = metadata[tree_name]
            for subtree_name in sorted(subtrees):
                subtree_info = subtrees[subtree_name]
                chave = subtree_info['List_terminals_hash']
                terminals = [d.get("newick", "Unknown")
                             for d in subtree_info.get('data_terminals', [])]

                entrada = hash_to_subtree_info.get(chave)
                if entrada is None:
                    entrada = {
                        "tree_name": tree_name,
                        "subtree_name": subtree_name,
                        "trees": {},
                        "terminals": terminals,
                        "nodes": {}
                    }
                    hash_to_subtree_info[chave] = entrada
                entrada["trees"][tree_name] = subtree_name

                get_newick = lambda h: next(
                    (d["newick"] for d in subtree_info['data_terminals']
                     if d["terminal_hash"] == h), None)
                for terminal_hash in subtree_info['Terminals']:
                    entrada['nodes'].setdefault(terminal_hash, get_newick(terminal_hash))
    return hash_to_subtree_info


def merge_hash_to_subtree(destino, origem):
    """Funde mapas preservando o um-para-muitos.

    `dict.update` faria a última árvore vencer e descartaria as demais — era o
    que perdia 50-62% das árvores no painel de cobertura.
    """
    for chave, entrada in origem.items():
        atual = destino.get(chave)
        if atual is None:
            destino[chave] = entrada
            continue
        atual["trees"].update(entrada["trees"])
        for h, newick in entrada["nodes"].items():
            atual["nodes"].setdefault(h, newick)
    return destino

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
    
    # D4 — até M1.1 o pipeline gravava o LIMIAR da varredura na coluna `support`,
    # e o mesmo itemset aparecia em várias linhas com "suportes" diferentes. Um CSV
    # gravado antes daquela correção não tem `min_support_threshold`; é por essa
    # ausência que se reconhece o artefato antigo. Ler os dois como se fossem a
    # mesma coisa é exibir o parâmetro da varredura como se fosse suporte.
    colunas = set(fpmax_df.columns)
    esquema_corrigido = 'min_support_threshold' in colunas

    patterns = []
    descartados = []
    ilegiveis = 0

    for _, row in fpmax_df.iterrows():
        try:
            itemset = parse_frozenset(row['itemsets'])
            support = row['support']
        except Exception:
            ilegiveis += 1
            continue

        if min_size <= len(itemset) <= max_size:
            patterns.append({
                'itemset': itemset,
                'support': support,
                'size': len(itemset)
            })
        else:
            descartados.append(len(itemset))
    
    method_sensitive_signatures = []
    topologically_robust = []
    
    for pattern in patterns:
        node_names = []
        terminals_by_node = {}

        for h in pattern['itemset']:
            if h in hash_to_subtree_info:
                name = hash_to_subtree_info[h]["subtree_name"]
                node_names.append(name)
                terminals_by_node[name] = hash_to_subtree_info[h]["terminals"]
            else:
                node_names.append(f"Unknown_{h}")

        pattern_data = {
            'pattern': list(pattern['itemset']),
            'node_names': node_names,
            'terminals_by_node': terminals_by_node,  # dict: node_name → [terminals]
            'terminals': list({t for seqs in terminals_by_node.values() for t in seqs}),  # mantém o total para compatibilidade
            'support': pattern['support'],
            'size': pattern['size']
        }

        if pattern['support'] <= rare_threshold:
            method_sensitive_signatures.append(pattern_data)
        elif pattern['support'] >= robust_threshold:
            topologically_robust.append(pattern_data)
    
    pattern_sizes = [p['size'] for p in patterns]
    support_values = [p['support'] for p in patterns]
    
    statistics = {
        'total_patterns': len(patterns),
        'patterns_in_source': int(len(fpmax_df)),
        'discarded_by_size': len(descartados),
        'discarded_sizes': sorted(descartados),
        'unreadable_rows': ilegiveis,
        'size_filter': {'min': min_size, 'max': max_size},
        'method_sensitive_count': len(method_sensitive_signatures),
        'topologically_robust_count': len(topologically_robust),
        'avg_pattern_size': sum(pattern_sizes) / len(pattern_sizes) if pattern_sizes else 0,
        'avg_support': sum(support_values) / len(support_values) if support_values else 0,
        'size_distribution': dict(Counter(pattern_sizes)),
        'support_schema': {
            'corrected': esquema_corrigido,
            'support_means': ('fração de árvores que contêm o padrão'
                              if esquema_corrigido
                              else 'LIMIAR da varredura do FPMax, não o suporte real'),
            'warning': (None if esquema_corrigido else
                        'Este projeto foi gerado antes da correção de D4 (M1.1). A coluna '
                        '`support` guarda o limiar da varredura, não a fração de árvores, e o '
                        'mesmo padrão pode aparecer em mais de uma linha. Reexecute o projeto '
                        'para obter os valores corretos.'),
        },
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
            if h not in hash_to_subtree_info:
                continue
            tree_info = hash_to_subtree_info[h]
            for tree_name in tree_info.get("trees") or {tree_info["tree_name"]: None}:
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
            
    except HTTPException:
        raise
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
            
    except HTTPException:
        raise
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
        
    except HTTPException:
        raise
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
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        raise HTTPException(status_code=400, detail="Formato de email inválido")

    Entrez.email = email
    return {"success": True, "message": f"Email configurado: {email}"}
    
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
                    fasta_files = [f for f in zip_files if f.lower().endswith(('.fasta', '.fa', '.fas', '.faa'))]
                    
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
                safe_name = os.path.basename(uploaded_file.filename or "")
                if not re.match(r'^[A-Za-z0-9._-]+$', safe_name):
                    raise HTTPException(status_code=400, detail="Nome de arquivo inválido.")
                other_file_path = resolve_within(target_dir, safe_name)
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
        
    except HTTPException:
        raise
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

def _dimensoes_do_fasta(caminho: str):
    """Número de sequências e comprimento da MAIOR delas, sem carregar o arquivo.

    O máximo, e não a média: é uma sequência só que estoura a memória do
    alinhador."""
    n = 0
    maior = 0
    atual = 0
    with open(caminho, "r", encoding="utf-8", errors="ignore") as f:
        for linha in f:
            if linha.startswith(">"):
                n += 1
                maior = max(maior, atual)
                atual = 0
            else:
                atual += len(linha.strip())
    return n, max(maior, atual)


@app.get("/api/aligners")
async def listar_alinhadores():
    """
    A biblioteca de alinhadores: o que existe, o que está instalado, e que
    limites cada um impõe.

    Serve à tela de configuração do experimento. O campo `note` é obrigatório
    na resposta porque limite sem motivo declarado vira superstição — e este
    projeto já carregou um limite de 20 kb que ninguém sabia de onde vinha.
    """
    return {
        "aligners": [
            {
                "key": a.key,
                "label": a.label,
                "binary": a.binary,
                "installed": a.installed(),
                "version": a.version(),
                "max_sequence_bp": a.max_sequence_bp,
                "max_sequences": a.max_sequences,
                "note": a.note,
            }
            for a in ALIGNERS.values()
        ]
    }


@app.get("/api/aligners/viability")
async def viabilidade_de_alinhadores(
    path: str = Query(..., description="Caminho relativo do FASTA ou do diretório de entrada, sob data/."),
):
    """
    Diz, para um conjunto concreto, quais alinhadores são viáveis e **por que**
    os outros não são.

    O veredito é **desta máquina**, não da ferramenta: `estimated_bytes` e
    `available_bytes` vêm separados para que a mensagem seja *"precisa de ~19 GB
    e há 31"* em vez de *"indisponível"*. A primeira é um requisito e diz o que
    mudaria a resposta; a segunda é um veto sem apelação, e esconde que noutra
    máquina seria possível ([R2](../../docs/respostasUteis/r2.md)).

    A política é **avisar, não bloquear**: a resposta traz `viable` e `reasons`,
    e a interface esmaece o inviável mostrando o motivo. Bloquear remove agência
    de quem sabe o que está fazendo; substituir em silêncio é o defeito D1, que
    custou metade do delineamento dos experimentos de *Variola*. Informar é o
    meio-termo que preserva as duas coisas.
    """
    alvo = resolve_within(DATA_ROOT, path)

    if os.path.isdir(alvo):
        fastas = sorted(
            os.path.join(alvo, f) for f in os.listdir(alvo)
            if f.endswith((".fasta", ".fa", ".fna"))
        )
        if not fastas:
            raise HTTPException(status_code=404, detail="Nenhum FASTA no diretório informado.")
    elif os.path.isfile(alvo):
        fastas = [alvo]
    else:
        raise HTTPException(status_code=404, detail="Caminho não encontrado.")

    n_total = 0
    maior_bp = 0
    for caminho in fastas:
        n, maior = _dimensoes_do_fasta(caminho)
        n_total += n
        maior_bp = max(maior_bp, maior)

    if n_total == 0:
        raise HTTPException(status_code=400, detail="O arquivo não contém nenhuma sequência.")

    vereditos = aligner_viability(n_total, maior_bp)

    return {
        "dataset": {
            "path": path,
            "files": [os.path.basename(f) for f in fastas],
            "n_sequences": n_total,
            "max_sequence_bp": maior_bp,
        },
        # O orçamento da máquina faz parte da resposta porque o veredito é dela,
        # não da ferramenta: o mesmo conjunto pode ser inviável aqui e viável
        # numa máquina maior. Ver docs/respostasUteis/r2.md.
        "machine": {
            "memory_bytes": memoria_disponivel_bytes(),
            "cpu_count": os.cpu_count(),
        },
        "aligners": [v.summary() for v in vereditos.values()],
        "policy": "warn",
    }


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