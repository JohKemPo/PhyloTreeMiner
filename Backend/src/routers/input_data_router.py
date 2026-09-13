# routers/input_data_router.py — dados de entrada (Arq-B/M5).
#
# Movidas de app.py sem mudar comportamento: `/dataFolders`, `/browse`,
# `/inputs_data`, `/api/file/paginated`, `/file`, `/upload-data`,
# `/uploaded-data`.
#
# `/file` e o corpo de `/api/file/paginated` continuam com a maior parte da
# lógica aqui no router mesmo (não em services/): validação (403/404/400/413)
# e a leitura/truncamento estão profundamente entrelaçados com HTTPException
# em cada ramo, e separar mais teria sido reescrever a função, não movê-la —
# fora do que esta fatia autoriza. `json_root_kind`/`get_json_total_items`
# (sem HTTPException) foram para services/json_preview_service.py.
#
# `MAX_UPLOAD_BYTES`/`MAX_UPLOAD_FILES`/`MAX_ZIP_EXPANSION_RATIO` são
# constantes de módulo (como já eram em app.py) para que
# `tests/api/test_limites_entrada.py` continue podendo
# `monkeypatch.setattr(<este módulo>, "MAX_UPLOAD_BYTES", ...)` — o teste foi
# atualizado para apontar aqui em vez de `app_module` (a rota mudou de
# módulo).
import json
import mimetypes
import os
from typing import List

import ijson
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse

from src import config as cfg
from src.config import get_settings
from src.logging_conf import obter_logger
from src.schemas import FileSystemItem, Project
from src.seguranca import limitar_taxa, resolve_within
from src.services import browse_service as bs
from src.services import json_preview_service as jps
from src.services import upload_service as us

router = APIRouter()
logger = obter_logger(__name__)

_settings = get_settings()
MAX_JSON_INLINE_BYTES = _settings.max_json_inline_bytes
MAX_UPLOAD_BYTES = _settings.max_upload_bytes
MAX_UPLOAD_FILES = _settings.max_upload_files
MAX_ZIP_EXPANSION_RATIO = _settings.max_zip_expansion_ratio

#: Extensões de sequência/alinhamento: como o `.cql`, um prefixo continua útil
#: para pré-visualização. O alinhamento MAFFT-iterativo de VARV-49 já passa de
#: 11 MB, e VARV-121 (283 874 colunas) passa disso com folga.
EXTENSOES_SEQUENCIA_TRUNCAVEL = (".fasta", ".fa", ".fas", ".faa", ".aln", ".clustal")


@router.get("/dataFolders", response_model=List[Project])
async def get_data_folders():
    """
    Lista os diretórios de dados disponíveis.

    Returns:
        List[Project]: Diretórios de dados, com:
            - **name**: Nome da pasta
            - **last_modified**: Data da última modificação
    """
    return bs.listar_pastas_de_dados(cfg.DATA_ROOT)


@router.get("/browse", response_model=List[FileSystemItem])
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
    requested_path = resolve_within(cfg.PROJECTS_ROOT, path)

    if not os.path.exists(requested_path) or not os.path.isdir(requested_path):
        raise HTTPException(status_code=404, detail="Caminho não encontrado ou não é um diretório.")

    return bs.listar_itens_do_diretorio(requested_path, cfg.PROJECTS_ROOT)


@router.get("/inputs_data", response_model=List[FileSystemItem])
async def inputs_data_path(path: str = Query("", description="O caminho relativo a ser explorado. Ex: 'meu_projeto/Trees'")):
    """

    """
    if not bs.inputs_data_existe(cfg.PATH_BASE_WORKFLOW):
        raise HTTPException(status_code=404, detail="Caminho não encontrado ou não é um diretório.")

    return bs.listar_inputs_data(cfg.PATH_BASE_WORKFLOW, cfg.PROJECTS_ROOT)


@router.get("/api/file/paginated")
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
    full_path = resolve_within(cfg.PROJECTS_ROOT, path)
    if not os.path.isfile(full_path):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")

    try:
        kind = jps.json_root_kind(full_path)

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
            except json.JSONDecodeError:
                # Arquivo corrompido é 400, não 500: o problema está no arquivo,
                # e o explorador precisa poder dizer isso a quem clicou nele.
                logger.warning("JSON inválido em '%s'", full_path, exc_info=True)
                raise HTTPException(status_code=400,
                                    detail="O arquivo não contém JSON válido.")
            return {"content": conteudo, "currentIndex": 0, "totalItems": 1, "kind": kind}

        prefixo = "item.item" if kind == "array_of_arrays" else "item"
        try:
            total_items = jps.get_json_total_items(full_path, prefixo)
        except ijson.JSONError:
            logger.warning("JSON inválido em '%s'", full_path, exc_info=True)
            raise HTTPException(status_code=400,
                                detail="O arquivo não contém JSON válido.")

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
    except Exception:
        logger.exception("Erro ao ler JSON de forma paginada em '%s'", full_path)
        raise HTTPException(status_code=500, detail="Erro ao ler JSON de forma paginada.")


@router.get("/file")
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
    full_path = resolve_within(cfg.PROJECTS_ROOT, path)
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
    except Exception:
        logger.exception("Erro ao ler arquivo '%s'", full_path)
        raise HTTPException(status_code=500, detail="Erro ao ler arquivo.")

    raise HTTPException(status_code=415, detail="Tipo de arquivo não suportado para pré-visualização.")


@router.post("/upload-data", dependencies=[Depends(limitar_taxa("upload-data"))])
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
        return await us.processar_upload(
            name, files, cfg.DATA_ROOT,
            MAX_UPLOAD_BYTES, MAX_UPLOAD_FILES, MAX_ZIP_EXPANSION_RATIO,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro durante o upload para o projeto '%s'", name)
        raise HTTPException(status_code=500, detail="Erro durante o upload.")


@router.get("/uploaded-data", response_model=List[Project])
async def get_uploaded_data():
    """
    Lista todos os conjuntos de dados enviados via upload.
    """
    return bs.listar_uploaded_data(cfg.DATA_ROOT)
