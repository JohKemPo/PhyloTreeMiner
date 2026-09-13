"""M4.6 — tetos de entrada em `/upload-data` e em `retmax` do NCBI (S-5)."""
import io
import zipfile

import pytest

import importlib

from src import config as _config
# `routers/__init__.py` faz `from .input_data_router import router as input_data_router`,
# o que sombreia `src.routers.input_data_router` (o MÓDULO) com o objeto
# `APIRouter` no namespace do pacote `src.routers` — tanto `from src.routers
# import input_data_router` quanto `import src.routers.input_data_router as x`
# resolvem essa sombra (a forma "as" com nome pontuado também encadeia
# atributos). `importlib.import_module` busca direto em `sys.modules`, sem
# passar pelo `__dict__` do pacote.
_input_data_router = importlib.import_module("src.routers.input_data_router")


@pytest.fixture(autouse=True)
def data_root_isolado(app_module, tmp_path, monkeypatch):
    """`/upload-data` grava em `DATA_ROOT` — nunca no `BioComp_UFF/data` real.

    Arq-B/M5: a rota foi para `routers/input_data_router.py`, que lê
    `DATA_ROOT` via `cfg.DATA_ROOT` (acesso qualificado a `src.config`, em
    tempo de chamada) — o isolamento é feito ali, não em `app_module`."""
    monkeypatch.setattr(_config, "DATA_ROOT", str(tmp_path))


@pytest.mark.security
async def test_upload_acima_do_teto_de_bytes_413(client, app_module, monkeypatch):
    # `MAX_UPLOAD_BYTES` é constante de módulo em routers/input_data_router.py
    # (computada uma vez, como já era em app.py) — patch aqui, não em app_module.
    monkeypatch.setattr(_input_data_router, "MAX_UPLOAD_BYTES", 10)
    conteudo = b">seq1\nACGTACGTACGT\n"
    r = await client.post(
        "/upload-data",
        data={"name": "projeto-teste"},
        files={"files": ("seq.fasta", conteudo, "text/plain")},
    )
    assert r.status_code == 413


@pytest.mark.security
async def test_upload_acima_do_teto_de_arquivos_413(client, app_module, monkeypatch):
    monkeypatch.setattr(_input_data_router, "MAX_UPLOAD_FILES", 1)
    arquivos = [("files", (f"seq{i}.fasta", b">s\nACGT\n", "text/plain")) for i in range(2)]
    r = await client.post("/upload-data", data={"name": "projeto-teste"}, files=arquivos)
    assert r.status_code == 413


@pytest.mark.security
async def test_zip_com_razao_de_expansao_suspeita_400(client):
    """1 MB de zeros comprime para poucos bytes — razão bem acima de 100x."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("bomba.fasta", b"\x00" * (1024 * 1024))
    zip_bytes = buffer.getvalue()

    r = await client.post(
        "/upload-data",
        data={"name": "projeto-teste"},
        files={"files": ("bomba.zip", zip_bytes, "application/zip")},
    )
    assert r.status_code == 400


@pytest.mark.security
async def test_multiplos_zips_honestos_somam_acima_do_teto_400(client, app_module, monkeypatch):
    """R1 (DEC-067) — o teto de descompressão é do upload inteiro, não por ZIP.

    Cada ZIP isolado passa a triagem de razão (bem abaixo de 100x) e, sozinho,
    fica sob o teto — mas juntos excedem. Antes da correção, cada ZIP
    reiniciava `bytes_descomprimidos_reais` em 0 e todos passavam com 200.
    """
    monkeypatch.setattr(_input_data_router, "MAX_UPLOAD_BYTES", 3000)

    arquivos = []
    for i in range(3):
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr(f"seq{i}.fasta", b"\x00" * 1200)  # descomprime ~1200 B, comprime a poucas dezenas
        arquivos.append(("files", (f"honesto{i}.zip", buffer.getvalue(), "application/zip")))

    r = await client.post("/upload-data", data={"name": "projeto-teste"}, files=arquivos)

    assert r.status_code == 400, (
        f"esperado 400 (soma descomprimida 3600 B > teto 3000 B), veio {r.status_code}: {r.text}"
    )


@pytest.mark.security
async def test_zip_legitimo_passa(client):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("seq.fasta", b">seq1\nACGTACGTACGT\n")
    zip_bytes = buffer.getvalue()

    r = await client.post(
        "/upload-data",
        data={"name": "projeto-teste-legitimo"},
        files={"files": ("dados.zip", zip_bytes, "application/zip")},
    )
    assert r.status_code == 200


@pytest.mark.security
@pytest.mark.parametrize("rota,campo", [
    ("/api/ncbi/download", "retmax"),
    ("/api/ncbi/search-species", "retmax"),
])
async def test_retmax_acima_do_teto_422(client, rota, campo):
    payload = {"query": "zika virus", campo: 10_000}
    r = await client.post(rota, json=payload)
    assert r.status_code == 422
