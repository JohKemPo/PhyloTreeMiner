# routers/ncbi_router.py
#
# `/download`, `/download-accessions`, `/search-species`, `/email` e
# `/set-email` foram movidas de app.py para cá (Arq-B/M5) — mesmo prefixo
# `/api/ncbi`, mesmo padrão das rotas que já existiam aqui (`/info`, `/blast`).
import asyncio
import re
from fastapi import APIRouter, Depends, Form, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional
from Bio import Entrez, SeqIO
from Bio.Blast import NCBIWWW

from src.config import DATA_ROOT, NCBI_WORK_DIR, get_settings
from src.logging_conf import obter_logger
from src.seguranca import exigir_admin
from src.services.ncbi_acquisition import NCBIAcquisition

Entrez.email = "seu.email@exemplo.com"

router = APIRouter()
logger = obter_logger(__name__)

#: M4.6: teto contra busca desproporcional ao NCBI (src/config.py).
NCBI_RETMAX_MAXIMO = get_settings().ncbi_retmax_maximo

# Singleton do módulo (Arq-B/M5) — antes vivia em app.py; movido para cá
# porque as rotas que o usam (`/download`, `/download-accessions`,
# `/search-species`) também vieram. `tests/api/test_ncbi_thread.py` monkeypatcha
# métodos DESTA instância via `app_module.ncbi_service` — mutação de atributo
# de instância, não de nome de módulo, então o mesmo objeto reexportado em
# app.py continua sendo o que esta rota usa de verdade.
ncbi_service = NCBIAcquisition(
    email="seu_email@example.com",
    work_dir=NCBI_WORK_DIR,
    data_root=DATA_ROOT
)

class NCBIInfoRequest(BaseModel):
    identifier: str

class BLASTRequest(BaseModel):
    sequence: str
    database: str = "nr"
    program: str = "blastn"

class NCBIDownloadRequest(BaseModel):
    query: str = Field(..., description="Query de busca no NCBI")
    species_name: Optional[str] = Field(None, description="Nome personalizado para a espécie (opcional)")
    retmax: int = Field(100, le=NCBI_RETMAX_MAXIMO, description="Número máximo de sequências para download")
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
    retmax: int = Field(10, le=NCBI_RETMAX_MAXIMO, description="Número máximo de resultados")


@router.post("/download")
async def ncbi_download_sequences(request: NCBIDownloadRequest):
    try:
        result = await asyncio.to_thread(
            ncbi_service.download_sequences,
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
    except Exception:
        logger.exception("Erro no download NCBI por busca (query='%s')", request.query)
        raise HTTPException(status_code=500, detail="Erro no download.")

@router.post("/download-accessions")
async def ncbi_download_by_accessions(request: NCBIAccessionRequest):
    """
    Baixa sequências do NCBI baseado em números de acesso.
    """
    try:
        result = await asyncio.to_thread(
            ncbi_service.download_from_accessions,
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
    except Exception:
        logger.exception("Erro no download NCBI por acessos %s", request.accessions)
        raise HTTPException(status_code=500, detail="Erro no download.")

@router.post("/search-species")
async def ncbi_search_species(request: NCBISearchRequest):
    """
    Busca espécies no NCBI para autocompletar.
    """
    try:
        species_list = await asyncio.to_thread(
            ncbi_service.search_species,
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
    except Exception:
        logger.exception("Erro na busca de espécies no NCBI (query='%s')", request.query)
        raise HTTPException(status_code=500, detail="Erro na busca.")

@router.get("/email")
async def get_ncbi_email():
    """
    Retorna o email configurado para o NCBI.
    """
    return {"email": Entrez.email}

@router.post("/set-email", dependencies=[Depends(exigir_admin)])
async def set_ncbi_email(email: str = Form(...)):
    """
    Define o email para consultas ao NCBI.
    """
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        raise HTTPException(status_code=400, detail="Formato de email inválido")

    Entrez.email = email
    return {"success": True, "message": f"Email configurado: {email}"}

def fetch_ncbi_info_sync(genbank_id: str):
    """Função síncrona para buscar dados no NCBI."""
    try:
        handle = Entrez.esearch(db="nucleotide", term=genbank_id, retmax=1)
        search_results = Entrez.read(handle)
        handle.close()
        
        if not search_results['IdList']:
            return {'error': 'Sequência não encontrada no NCBI'}

        uid = search_results['IdList'][0]
        handle = Entrez.efetch(db="nucleotide", id=uid, rettype="gb", retmode="text")
        record = SeqIO.read(handle, "genbank")
        handle.close()

        return {
            'genbank_id': genbank_id,
            'description': record.description,
            'species': record.annotations.get('organism', 'Desconhecido'),
            'taxonomy': '; '.join(record.annotations.get('taxonomy', [])),
            'length': len(record.seq)
        }
    except Exception as e:
        logger.exception("Erro ao contatar NCBI (id='%s')", genbank_id)
        raise RuntimeError("Erro ao contatar NCBI.") from e

@router.post("/info")
async def get_ncbi_info(request_data: NCBIInfoRequest):
    """Busca informações de uma sequência no NCBI de forma não-bloqueante."""
    if not request_data.identifier:
        raise HTTPException(status_code=400, detail="Identificador não fornecido")
    
    try:
        info = await asyncio.to_thread(fetch_ncbi_info_sync, request_data.identifier)
        if "error" in info:
            raise HTTPException(status_code=404, detail=info["error"])
        return info
    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro ao buscar informações NCBI (id='%s')", request_data.identifier)
        raise HTTPException(status_code=500, detail="Erro ao buscar informações no NCBI.")

def run_blast_task(project_name: str, sequence: str, database: str, program: str):
    """
    Função síncrona que executa o BLAST e envia o resultado via WebSocket.
    ATENÇÃO: Isso pode ser MUITO LENTO.
    """
    logger.info("Iniciando BLAST para o projeto %s...", project_name)
    try:
        result_handle = NCBIWWW.qblast(program, database, sequence)
        blast_result = result_handle.read()

        logger.info("BLAST para %s concluído.", project_name)

    except Exception:
        logger.exception("Erro no BLAST para %s", project_name)

@router.post("/blast/{project_name}")
async def run_blast(project_name: str, request_data: BLASTRequest, background_tasks: BackgroundTasks):
    """
    Inicia uma busca BLAST em segundo plano.
    """
    if not request_data.sequence:
        raise HTTPException(status_code=400, detail="Sequência não fornecida")

    background_tasks.add_task(
        run_blast_task,
        project_name,
        request_data.sequence,
        request_data.database,
        request_data.program
    )

    return {"message": f"Análise BLAST para o projeto '{project_name}' iniciada em segundo plano. Você será notificado quando estiver pronta."}