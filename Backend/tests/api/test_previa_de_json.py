"""Pré-visualização de JSON no explorador de arquivos.

O explorador precisa abrir três coisas de formas diferentes: o `metadata.json`,
que é uma lista de listas de árvores e chega a gigabytes; e o `manifest.json` e
o `config_backup.json`, que são objetos de poucos KB.

Antes, a paginação era fixa no prefixo `item.item`: **todo JSON com raiz de
objeto respondia 404 dizendo que o arquivo estava vazio** — o oposto do que
acontecia —, e `/file` respondia 500, porque a leitura fazia `parsed_json[0]`
supondo que todo JSON fosse lista.
"""
import json

import pytest


@pytest.fixture
def projeto_json(tmp_path, app_module, monkeypatch):
    """Um projeto de mentira com um JSON de cada forma."""
    raiz = tmp_path / "projetos"
    saida = raiz / "proj" / "out" / "outputs"
    saida.mkdir(parents=True)

    (saida / "manifest.json").write_text(
        json.dumps({"run_id": "abc123", "reproducibility": {"random_seed": 12345}}),
        encoding="utf-8")
    (saida / "lista.json").write_text(json.dumps([{"a": 1}, {"a": 2}, {"a": 3}]),
                                      encoding="utf-8")
    (saida / "metadata.json").write_text(json.dumps([[{"arvore1": {}}, {"arvore2": {}}]]),
                                         encoding="utf-8")
    (saida / "vazio.json").write_text("", encoding="utf-8")

    monkeypatch.setattr(app_module, "PROJECTS_ROOT", str(raiz))
    return raiz


class TestFormaDaRaiz:
    def test_reconhece_as_tres_formas(self, app_module, projeto_json):
        base = projeto_json / "proj" / "out" / "outputs"
        assert app_module.json_root_kind(str(base / "manifest.json")) == "object"
        assert app_module.json_root_kind(str(base / "lista.json")) == "array"
        assert app_module.json_root_kind(str(base / "metadata.json")) == "array_of_arrays"

    def test_arquivo_vazio_nao_quebra(self, app_module, projeto_json):
        base = projeto_json / "proj" / "out" / "outputs"
        assert app_module.json_root_kind(str(base / "vazio.json")) == "empty"

    def test_deteccao_le_so_o_primeiro_token(self, app_module, projeto_json):
        """A detecção é barata de propósito — lê dois eventos, não o arquivo —,
        então ela reconhece a forma da raiz mesmo num arquivo corrompido. Quem
        recusa o malformado é a leitura, com 400."""
        base = projeto_json / "proj" / "out" / "outputs"
        (base / "quebrado.json").write_text("{isto nao e json", encoding="utf-8")
        assert app_module.json_root_kind(str(base / "quebrado.json")) == "object"

    def test_lixo_sem_estrutura_e_invalido(self, app_module, projeto_json):
        base = projeto_json / "proj" / "out" / "outputs"
        (base / "lixo.json").write_text("!!! nada aqui", encoding="utf-8")
        assert app_module.json_root_kind(str(base / "lixo.json")) == "invalid"


class TestPreviaPaginada:
    async def test_objeto_vem_inteiro_e_sem_paginacao(self, client, projeto_json):
        """O caso do manifesto: um objeto não tem página 2."""
        r = await client.get("/api/file/paginated",
                             params={"path": "proj/out/outputs/manifest.json"})
        assert r.status_code == 200, r.text
        corpo = r.json()
        assert corpo["kind"] == "object"
        assert corpo["totalItems"] == 1
        assert corpo["content"]["run_id"] == "abc123"
        assert corpo["content"]["reproducibility"]["random_seed"] == 12345

    async def test_lista_pagina_por_elemento(self, client, projeto_json):
        r = await client.get("/api/file/paginated",
                             params={"path": "proj/out/outputs/lista.json", "index": 1})
        assert r.status_code == 200
        corpo = r.json()
        assert corpo["kind"] == "array"
        assert corpo["totalItems"] == 3
        assert corpo["content"] == {"a": 2}

    async def test_metadata_continua_paginando_por_arvore(self, client, projeto_json):
        """Portão de regressão: o caminho que já funcionava não pode mudar."""
        r = await client.get("/api/file/paginated",
                             params={"path": "proj/out/outputs/metadata.json"})
        assert r.status_code == 200
        corpo = r.json()
        assert corpo["kind"] == "array_of_arrays"
        assert corpo["totalItems"] == 2
        assert "arvore1" in corpo["content"]

    async def test_indice_fora_dos_limites_e_404(self, client, projeto_json):
        r = await client.get("/api/file/paginated",
                             params={"path": "proj/out/outputs/lista.json", "index": 99})
        assert r.status_code == 404
        assert "limites" in r.json()["detail"]

    async def test_json_grande_demais_e_recusado_com_413(self, client, projeto_json,
                                                         app_module, monkeypatch):
        """"Grande demais" precisa ser um erro próprio: um `f.read()` num
        metadata.json de 3,2 GB derruba o processo."""
        monkeypatch.setattr(app_module, "MAX_JSON_INLINE_BYTES", 10)
        r = await client.get("/api/file/paginated",
                             params={"path": "proj/out/outputs/manifest.json"})
        assert r.status_code == 413
        assert "grande demais" in r.json()["detail"]


    async def test_json_malformado_responde_400(self, client, projeto_json):
        base = projeto_json / "proj" / "out" / "outputs"
        (base / "quebrado.json").write_text("{isto nao e json", encoding="utf-8")
        r = await client.get("/api/file/paginated",
                             params={"path": "proj/out/outputs/quebrado.json"})
        assert r.status_code == 400
        assert "válido" in r.json()["detail"]


class TestLeituraDireta:
    async def test_file_devolve_o_objeto_como_esta(self, client, projeto_json):
        """Antes devolvia `parsed_json[0]` e respondia 500 para qualquer objeto."""
        r = await client.get("/file", params={"path": "proj/out/outputs/manifest.json"})
        assert r.status_code == 200, r.text
        corpo = r.json()
        assert corpo["type"] == "json"
        assert corpo["content"]["run_id"] == "abc123"

    async def test_arquivo_grande_e_recusado_antes_de_ler(self, client, projeto_json,
                                                          app_module, monkeypatch):
        monkeypatch.setattr(app_module, "MAX_JSON_INLINE_BYTES", 10)
        r = await client.get("/file", params={"path": "proj/out/outputs/manifest.json"})
        assert r.status_code == 413
        assert "paginated" in r.json()["detail"]
