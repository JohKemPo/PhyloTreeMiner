"""Biblioteca de alinhadores exposta à interface — D1.

A política é **avisar, não bloquear**. O endpoint devolve, para um conjunto
concreto, quais alinhadores são viáveis e **por que** os outros não são; a
interface esmaece o inviável mostrando o motivo, e a escolha continua de quem
configura.

Bloquear removeria agência de quem sabe o que está fazendo — e os limites são
conservadores, alguns nem medidos. Substituir em silêncio é o defeito D1, que
custou metade do delineamento dos experimentos de *Variola*.
"""
import pytest


class TestBiblioteca:
    async def test_lista_os_tres_alinhadores(self, client):
        r = await client.get("/api/aligners")
        assert r.status_code == 200
        chaves = {a["key"] for a in r.json()["aligners"]}
        assert chaves == {"mafft", "clustalo", "muscle"}

    async def test_cada_limite_vem_com_motivo(self, client):
        """Limite sem explicação vira superstição — este projeto já carregou um
        limite de 20 kb que ninguém sabia de onde vinha."""
        r = await client.get("/api/aligners")
        for a in r.json()["aligners"]:
            if a["max_sequence_bp"] or a["max_sequences"]:
                assert a["note"].strip(), f"{a['key']} tem limite sem motivo"

    async def test_declara_instalacao_e_versao(self, client):
        r = await client.get("/api/aligners")
        for a in r.json()["aligners"]:
            assert isinstance(a["installed"], bool)
            assert a["version"] is None or isinstance(a["version"], str)


@pytest.fixture
def dados(tmp_path, app_module, monkeypatch):
    raiz = tmp_path / "data"
    curto = raiz / "curto"
    longo = raiz / "longo"
    curto.mkdir(parents=True)
    longo.mkdir(parents=True)
    (curto / "dataset_final.fasta").write_text(
        ">a\n" + "ACGT" * 100 + "\n>b\n" + "ACGT" * 100 + "\n", encoding="utf-8")
    # Uma sequência acima do limite do Clustal Omega (20 kb).
    (longo / "dataset_final.fasta").write_text(
        ">a\n" + "ACGT" * 10_000 + "\n>b\n" + "ACGT" * 10_000 + "\n", encoding="utf-8")
    monkeypatch.setattr(app_module, "DATA_ROOT", str(raiz))
    return raiz


class TestViabilidade:
    async def test_conjunto_curto_nao_dispara_aviso(self, client, dados):
        r = await client.get("/api/aligners/viability", params={"path": "curto"})
        assert r.status_code == 200
        corpo = r.json()
        assert corpo["dataset"]["n_sequences"] == 2
        instalados = [a for a in corpo["aligners"] if a["installed"]]
        assert instalados, "nenhum alinhador instalado nesta máquina"
        for a in instalados:
            assert a["viable"], f"{a['aligner']}: {a['reasons']}"

    async def test_sequencia_longa_reprova_clustalo_com_motivo(self, client, dados):
        r = await client.get("/api/aligners/viability", params={"path": "longo"})
        assert r.status_code == 200
        por_chave = {a["aligner"]: a for a in r.json()["aligners"]}
        assert por_chave["clustalo"]["viable"] is False
        assert por_chave["clustalo"]["reasons"], "recusa sem motivo não serve para avisar"
        assert por_chave["mafft"]["viable"] is True

    async def test_mede_a_maior_sequencia_e_nao_a_media(self, client, dados):
        """É uma sequência só que estoura a memória do alinhador."""
        r = await client.get("/api/aligners/viability", params={"path": "longo"})
        assert r.json()["dataset"]["max_sequence_bp"] == 40_000

    async def test_a_politica_declarada_e_avisar(self, client, dados):
        r = await client.get("/api/aligners/viability", params={"path": "curto"})
        assert r.json()["policy"] == "warn"

    async def test_aceita_arquivo_alem_de_diretorio(self, client, dados):
        r = await client.get("/api/aligners/viability",
                             params={"path": "curto/dataset_final.fasta"})
        assert r.status_code == 200
        assert r.json()["dataset"]["n_sequences"] == 2

    async def test_caminho_fora_da_raiz_e_403(self, client, dados):
        r = await client.get("/api/aligners/viability", params={"path": "../../etc"})
        assert r.status_code in (403, 404)

    async def test_caminho_inexistente_e_404(self, client, dados):
        r = await client.get("/api/aligners/viability", params={"path": "nao_existe"})
        assert r.status_code == 404

    async def test_fasta_vazio_e_400(self, client, dados, tmp_path):
        vazio = tmp_path / "data" / "vazio"
        vazio.mkdir()
        (vazio / "dataset_final.fasta").write_text("", encoding="utf-8")
        r = await client.get("/api/aligners/viability", params={"path": "vazio"})
        assert r.status_code == 400
