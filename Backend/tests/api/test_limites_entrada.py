"""M4.6 — tetos de entrada em `/upload-data` e em `retmax` do NCBI (S-5)."""
import io
import zipfile

import pytest


@pytest.fixture(autouse=True)
def data_root_isolado(app_module, tmp_path, monkeypatch):
    """`/upload-data` grava em `DATA_ROOT` — nunca no `BioComp_UFF/data` real."""
    monkeypatch.setattr(app_module, "DATA_ROOT", str(tmp_path))


@pytest.mark.security
async def test_upload_acima_do_teto_de_bytes_413(client, app_module, monkeypatch):
    monkeypatch.setattr(app_module, "MAX_UPLOAD_BYTES", 10)
    conteudo = b">seq1\nACGTACGTACGT\n"
    r = await client.post(
        "/upload-data",
        data={"name": "projeto-teste"},
        files={"files": ("seq.fasta", conteudo, "text/plain")},
    )
    assert r.status_code == 413


@pytest.mark.security
async def test_upload_acima_do_teto_de_arquivos_413(client, app_module, monkeypatch):
    monkeypatch.setattr(app_module, "MAX_UPLOAD_FILES", 1)
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
