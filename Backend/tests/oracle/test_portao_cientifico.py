"""Portão científico — M2.7.

O invariante do baseline de Li *et al.* (2007) é o gate de toda refatoração a
partir de M2: uma mudança que o quebre é revertida, independentemente de quantos
testes unitários passem.

Estes testes garantem que **o portão existe e funciona** — que ele detecta
violação, que não confunde "incompleto" com "quebrado", e que o dataset de
referência está íntegro. O portão em si roda por `make reference-check`.
"""
import hashlib
import json
import pathlib
import subprocess
import sys

import pytest

RAIZ = pathlib.Path(__file__).resolve().parents[3]
REFERENCIA = RAIZ / "Backend" / "tests" / "data" / "reference"
SCRIPT = RAIZ / "docs" / "science" / "scripts" / "reference_check.py"
SUBMODULO = RAIZ / "BioComp_UFF"


pytestmark = pytest.mark.oracle


@pytest.fixture(scope="module")
def esperado():
    caminho = REFERENCIA / "expected.json"
    if not caminho.exists():
        pytest.skip("dataset de referência ausente; rode `make reference-dataset`")
    return json.loads(caminho.read_text(encoding="utf-8"))


class TestDatasetDeReferencia:

    def test_os_quatro_arquivos_existem(self):
        for nome in ("README.md", "accessions.txt", "expected.json", "MANIFEST.sha256"):
            assert (REFERENCIA / nome).exists(), f"{nome} ausente"
        assert (REFERENCIA / "trees").is_dir()

    def test_manifesto_confere(self):
        """Se um arquivo mudou sem o manifesto ser regenerado, a proveniência
        deixou de valer — e um dataset de referência sem proveniência é tão
        indefensável quanto um contaminado."""
        manifesto = (REFERENCIA / "MANIFEST.sha256").read_text(encoding="utf-8")
        divergentes = []
        for linha in manifesto.strip().split("\n"):
            digest, rel = linha.split("  ", 1)
            caminho = REFERENCIA / rel
            assert caminho.exists(), f"{rel} está no manifesto e não existe"
            atual = hashlib.sha256(caminho.read_bytes()).hexdigest()
            if atual != digest:
                divergentes.append(rel)
        assert not divergentes, f"arquivos alterados sem regenerar o manifesto: {divergentes}"

    def test_composicao_e_a_do_baseline(self, esperado):
        """45 VARV contra CMLV/CPXV/TATV — a replicação de Li et al. (2007)."""
        assert esperado["n_taxa"] == 49
        assert esperado["composition"]["VARV"] == 45
        assert esperado["composition"]["outgroup"] == 4

    def test_tolerancia_e_declarada_com_motivo(self, esperado):
        """Tolerância sem justificativa é o mesmo defeito do limite de 20 kb do
        Clustal Omega: um número que ninguém sabe de onde veio."""
        assert esperado["tolerance"]["mode"] == "invariant_only"
        assert len(esperado["tolerance"]["rationale"]) > 100
        assert "D17" in esperado["tolerance"]["rationale"] or "paraleliza" in esperado["tolerance"]["rationale"]

    def test_os_tres_invariantes_estao_declarados(self, esperado):
        ids = {i["id"] for i in esperado["invariants"]}
        assert ids == {"monofilia_varv", "clado_p2", "p2_basal"}
        for inv in esperado["invariants"]:
            assert inv["bipartition"], f"{inv['id']} sem bipartição"
            assert inv["description"].strip(), f"{inv['id']} sem descrição"

    def test_clado_p2_tem_os_seis_taxons_da_literatura(self, esperado):
        p2 = next(i for i in esperado["invariants"] if i["id"] == "clado_p2")
        assert set(p2["bipartition"]) == {
            "DQ441416", "DQ441419", "DQ441426", "DQ441434", "DQ441437", "DQ441447"
        }

    def test_p2_basal_e_a_uniao_de_p2_com_o_grupo_externo(self, esperado):
        por_id = {i["id"]: set(i["bipartition"]) for i in esperado["invariants"]}
        assert por_id["p2_basal"] == por_id["clado_p2"] | por_id["monofilia_varv"]
        assert len(por_id["p2_basal"]) == 10


class TestPortao:

    def _rodar(self, *args):
        return subprocess.run(
            [sys.executable, str(SCRIPT), *args],
            cwd=str(SUBMODULO), capture_output=True, text=True)

    def test_invariante_vale_no_artefato_de_referencia(self):
        r = self._rodar("--json")
        assert r.returncode in (0, 2), r.stderr
        corpo = json.loads(r.stdout)
        assert corpo["invariants_ok"] is True

    def test_codigo_2_significa_incompleto_e_nao_quebrado(self):
        """Colapsar "ainda não terminamos" com "quebrou" ensinaria a ignorar o
        portão. São estados diferentes e códigos diferentes."""
        r = self._rodar("--json")
        corpo = json.loads(r.stdout)
        if not corpo["M_complete"]:
            assert r.returncode == 2
            assert corpo["invariants_ok"] is True

    def test_registra_a_impressao_digital_sem_reprovar(self):
        """A topologia é registrada como fingerprint do ambiente. Mudança nela é
        sinal para investigar, não reprovação — D17 mediu RF = 8 entre execuções
        com a mesma semente."""
        r = self._rodar("--json")
        digital = json.loads(r.stdout)["fingerprint"]
        assert digital["universal_bipartitions"] > 0
        assert digital["rf_min"] is not None
        assert digital["bipartitions_per_pipeline"]

    def test_detecta_invariante_violado(self, tmp_path, esperado):
        """O portão precisa reprovar de verdade. Constrói-se um conjunto onde o
        clado P-II não existe, e ele tem de sair com código 1."""
        arvores = tmp_path / "trees"
        arvores.mkdir()
        taxa = sorted({t for i in esperado["invariants"] for t in i["bipartition"]})
        # Duas topologias em estrela: nenhuma bipartição informativa, logo
        # nenhum invariante recuperado.
        estrela = "(" + ",".join(taxa) + ");"
        for nome in ("tree_dataset_final_mafft_fasttree.nexus",
                     "tree_dataset_final_mafft_iqtree.nexus"):
            (arvores / nome).write_text(
                f"#NEXUS\nBegin Trees;\n Tree t={estrela}\nEnd;\n", encoding="utf-8")

        r = self._rodar("--trees", str(arvores))
        assert r.returncode == 1, f"o portão não reprovou: {r.stdout}"
        assert "VIOLADO" in r.stdout
