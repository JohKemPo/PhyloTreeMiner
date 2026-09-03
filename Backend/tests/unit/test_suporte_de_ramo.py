"""M3.1 — o suporte de ramo chega ao usuário com o método e a métrica juntos.

O que estes testes protegem não é "o número está certo" (isso é o oráculo em
`tests/oracle/test_oraculo_suporte_dendropy.py`), e sim **que o número nunca
viaja sozinho**: FBP e UFBoot saem na mesma escala 0-100 sem serem a mesma
métrica, e o suporte local do FastTree é 0-1 e mede outra coisa (DEC-064). Um
payload que os misturasse seria pior que um payload sem suporte nenhum.
"""

import os
import pathlib

import pytest

BACKEND = pathlib.Path(__file__).resolve().parents[2]
FIXTURES = BACKEND / "tests" / "data" / "suporte"


@pytest.fixture(scope="module")
def modulo(app_module):
    # Importa via app_module para herdar o sys.path que põe BioComp_UFF no ar.
    from src import suporte_de_ramo
    return suporte_de_ramo


@pytest.fixture(scope="module")
def trees_varv49(app_module):
    d = pathlib.Path(app_module.PROJECTS_ROOT) / "Variola_VARV49_reexec_20260901" / "out" / "Trees"
    if not d.is_dir():
        pytest.skip("projeto de referência VARV-49 ausente")
    return d


def _por_arquivo(resultado):
    return {a["arquivo"]: a for a in resultado["arvores"]}


# --------------------------------------------------------------------------- #
# Leitura de árvore real
# --------------------------------------------------------------------------- #

def test_ufboot_lido_de_arvore_real_de_iqtree(modulo, trees_varv49):
    """UFBoot sai do Nexus real de IQ-TREE, na escala e com a métrica certas."""
    bloco = modulo.ler_suporte_de_arquivo(
        str(trees_varv49 / "tree_dataset_final_mafft_iqtree.nexus"))

    assert bloco["metodo"] == "iqtree"
    assert bloco["metrica"]["id"] == "ufboot"
    assert bloco["metrica"]["escala_max"] == 100.0
    assert bloco["suporte_presente"] is True
    assert bloco["ramos_com_suporte"] == 46
    assert all(0.0 <= r["valor"] <= 100.0 for r in bloco["ramos"])
    # Pelo menos um ramo abaixo de 100: uma árvore em que tudo fosse 100 não
    # distinguiria "suporte lido" de "constante escrita por engano".
    assert min(r["valor"] for r in bloco["ramos"]) < 100.0


def test_suporte_local_lido_de_arvore_real_de_fasttree(modulo, trees_varv49):
    """O suporte do FastTree é 0-1 e **não** é reescalado para 0-100."""
    bloco = modulo.ler_suporte_de_arquivo(
        str(trees_varv49 / "tree_dataset_final_mafft_fasttree.nexus"))

    assert bloco["metodo"] == "fasttree"
    assert bloco["metrica"]["id"] == "sh_local"
    assert bloco["metrica"]["escala_max"] == 1.0
    assert bloco["ramos_com_suporte"] == 46
    assert all(0.0 <= r["valor"] <= 1.0 for r in bloco["ramos"])
    assert all(r["escala"] == [0.0, 1.0] for r in bloco["ramos"])


def test_fbp_lido_de_saida_real_do_raxml_ng(modulo):
    """FBP do RAxML-NG (fixture gerada pelo inferidor — ver o README ao lado)."""
    bloco = modulo.ler_suporte_de_arquivo(
        str(FIXTURES / "tree_dataset_final_mafft_raxml.nexus"))

    assert bloco["metodo"] == "raxml"
    assert bloco["metrica"]["id"] == "fbp"
    assert bloco["metrica"]["escala_max"] == 100.0
    assert bloco["suporte_presente"] is True
    assert bloco["ramos_com_suporte"] >= 1
    assert all(r["metrica"] == "fbp" and r["metodo"] == "raxml" for r in bloco["ramos"])


# --------------------------------------------------------------------------- #
# O achado que não pode ser perdido: as três métricas não se confundem
# --------------------------------------------------------------------------- #

def test_tres_metodos_nao_se_confundem_no_payload(modulo, trees_varv49):
    """UFBoot, suporte local e FBP saem etiquetados, cada um com sua escala."""
    blocos = [
        modulo.ler_suporte_de_arquivo(str(trees_varv49 / "tree_dataset_final_mafft_iqtree.nexus")),
        modulo.ler_suporte_de_arquivo(str(trees_varv49 / "tree_dataset_final_mafft_fasttree.nexus")),
        modulo.ler_suporte_de_arquivo(str(FIXTURES / "tree_dataset_final_mafft_raxml.nexus")),
    ]

    metricas = {b["metodo"]: b["metrica"]["id"] for b in blocos}
    assert metricas == {"iqtree": "ufboot", "fasttree": "sh_local", "raxml": "fbp"}

    # Nenhum ramo, de nenhuma das três, chega sem dizer de onde veio.
    for bloco in blocos:
        for ramo in bloco["ramos"]:
            assert ramo["metrica"] == bloco["metrica"]["id"]
            assert ramo["metodo"] == bloco["metodo"]
            assert ramo["escala"] == [bloco["metrica"]["escala_min"],
                                      bloco["metrica"]["escala_max"]]

    # E as escalas continuam distintas: 0-100 para UFBoot/FBP, 0-1 para o local.
    escalas = {b["metrica"]["id"]: b["metrica"]["escala_max"] for b in blocos}
    assert escalas == {"ufboot": 100.0, "fbp": 100.0, "sh_local": 1.0}


def test_ufboot_e_fbp_nao_compartilham_limiar(modulo):
    """Mesma escala, limiares separados — é o achado de DEC-064 em código."""
    ufboot = modulo.metrica_do_metodo("iqtree")
    fbp = modulo.metrica_do_metodo("raxml")

    assert ufboot.escala_max == fbp.escala_max == 100.0
    assert ufboot.id != fbp.id
    assert ufboot.natureza != fbp.natureza
    # O limiar do UFBoot (95, o do portão de M3) não pode vazar para o FBP.
    assert ufboot.limiar_alto == 95.0
    assert fbp.limiar_alto is None


def test_nenhum_valor_normalizado_no_payload(modulo, trees_varv49):
    """Não existe campo de valor normalizado — normalizar convida à comparação."""
    resultado = modulo.ler_suporte_do_projeto(str(trees_varv49))
    assert resultado["comparabilidade"]["entre_metodos"] is False
    assert resultado["comparabilidade"]["valores_normalizados"] is False

    proibidos = {"valor_normalizado", "normalizado", "support", "suporte_normalizado"}
    for arvore in resultado["arvores"]:
        for ramo in arvore["ramos"]:
            assert not (proibidos & set(ramo)), f"campo proibido em {arvore['arquivo']}"


# --------------------------------------------------------------------------- #
# Casos-limite
# --------------------------------------------------------------------------- #

def test_metodo_de_distancia_nao_devolve_suporte_zero(modulo, trees_varv49):
    """NJ/UPGMA: `metrica` nula com motivo — nunca `0` (regra 5)."""
    for nome in ("tree_dataset_final_mafft_nj_distance.nexus",
                 "tree_dataset_final_mafft_upgma_distance.nexus"):
        bloco = modulo.ler_suporte_de_arquivo(str(trees_varv49 / nome))
        assert bloco["metrica"] is None
        assert bloco["metrica_ausente_porque"]
        assert bloco["ramos"] == []
        assert bloco["suporte_presente"] is False
        assert bloco["ramos_internos"] > 0  # a árvore existe; o suporte é que não


def test_rotulo_inner_nao_vira_suporte(modulo, trees_varv49):
    """`Inner45` é nome de nó, não suporte — e não pode virar número.

    As árvores de distância trazem `InnerNN` no rótulo de nó interno. Um leitor
    que caísse de `.confidence` para `.name` inventaria suporte onde não há.
    """
    from Bio import Phylo
    caminho = trees_varv49 / "tree_dataset_final_mafft_nj_distance.nexus"

    arvore = Phylo.read(str(caminho), "nexus")
    internos = [c for c in arvore.find_clades() if not c.is_terminal()]
    # Pré-condição do teste: os rótulos `InnerNN` de fato estão lá.
    assert any((c.name or "").startswith("Inner") for c in internos)
    assert all(c.confidence is None for c in internos)

    bloco = modulo.ler_suporte_de_arquivo(str(caminho))
    assert bloco["ramos_com_suporte"] == 0
    assert bloco["ramos"] == []


def test_arvore_sem_bootstrap_nao_quebra_e_avisa(modulo, trees_varv49):
    """RAxML anterior a M3.2: método declara FBP, artefato não traz nenhum."""
    bloco = modulo.ler_suporte_de_arquivo(
        str(trees_varv49 / "tree_dataset_final_mafft_raxml.nexus"))

    assert bloco["metrica"]["id"] == "fbp"      # o método declara a métrica
    assert bloco["suporte_presente"] is False   # o artefato não a traz
    assert bloco["ramos"] == []
    assert bloco["ramos_sem_suporte"] == bloco["ramos_internos"] > 0
    assert bloco["resumo"] is None
    assert any("M3.2" in a for a in bloco["avisos"])


def test_folhas_e_raiz_nunca_aparecem_como_ramo(modulo, trees_varv49):
    """Folha e clado universal não são bipartição informativa (D3)."""
    from Bio import Phylo
    caminho = trees_varv49 / "tree_dataset_final_mafft_iqtree.nexus"
    arvore = Phylo.read(str(caminho), "nexus")
    n_taxa = len(arvore.get_terminals())

    bloco = modulo.ler_suporte_de_arquivo(str(caminho))
    for ramo in bloco["ramos"]:
        assert 2 <= ramo["n_taxa"] <= n_taxa - 2
    # 47 nós internos no arquivo, 46 bipartições informativas: o clado
    # universal (a raiz de escrita) sai, e é assim que tem de ser.
    assert bloco["ramos_internos"] == 46


def test_politomia_nao_quebra_a_leitura(modulo, trees_varv49):
    """As árvores de VARV-49 têm uma politomia; ela não pode derrubar a rota."""
    from Bio import Phylo
    caminho = trees_varv49 / "tree_dataset_final_mafft_iqtree.nexus"
    arvore = Phylo.read(str(caminho), "nexus")
    politomias = [c for c in arvore.find_clades()
                  if not c.is_terminal() and len(c.clades) > 2]
    assert politomias, "pré-condição: a árvore de referência tem politomia"

    bloco = modulo.ler_suporte_de_arquivo(str(caminho))
    assert bloco["ramos_com_suporte"] == 46


def test_mrbayes_declara_posterior_e_o_artefato_nao_a_traz(modulo, app_module):
    """Confirma, em artefato real, a suspeita registrada na ficha de método.

    O MrBayes produz probabilidade posterior em princípio, mas
    `_clean_mrbayes_tree` apaga os colchetes antes da extração — hipótese que a
    ficha de chamada por método registrou sem confirmar. Aqui ela é confirmada
    pelo lado do consumidor: a métrica é declarada, o artefato não a traz, e o
    usuário é avisado em vez de receber silêncio.
    """
    caminho = (pathlib.Path(app_module.PROJECTS_ROOT) / "Teste_Neo4j" / "out"
               / "Trees" / "tree_dataset_test_mafft_mrbayes.nexus")
    if not caminho.is_file():
        pytest.skip("artefato de MrBayes ausente")

    bloco = modulo.ler_suporte_de_arquivo(str(caminho))
    assert bloco["metodo"] == "mrbayes"
    assert bloco["metrica"]["id"] == "posterior"
    assert bloco["suporte_presente"] is False
    assert bloco["ramos"] == []
    assert bloco["avisos"]


def test_metodo_desconhecido_nao_ganha_metrica(modulo, tmp_path):
    """Nome de arquivo irreconhecível: sem método não há métrica."""
    origem = FIXTURES / "tree_dataset_final_mafft_raxml.nexus"
    destino = tmp_path / "tree_dataset_final_mafft_metodonovo.nexus"
    destino.write_text(origem.read_text(encoding="utf-8"), encoding="utf-8")

    bloco = modulo.ler_suporte_de_arquivo(str(destino))
    assert bloco["metodo"] == "unknown"
    assert bloco["metrica"] is None
    assert bloco["ramos"] == []
    # Os valores existem no arquivo, e é exatamente por isso que o aviso importa.
    assert any("não tem métrica de suporte declarada" in a for a in bloco["avisos"])


def test_identidade_de_clado_junta_metodos_apesar_de_d13(modulo, trees_varv49):
    """O mesmo ramo tem o mesmo `clade_id` em IQ-TREE e em FastTree.

    É o que torna a comparação de suportes possível em M3.3/M3.4 — e só é
    verdade porque a identidade passa por `strip_accession_version` (D13) e
    pela bipartição canônica (D3), reutilizadas do submódulo.
    """
    iq = modulo.ler_suporte_de_arquivo(
        str(trees_varv49 / "tree_dataset_final_mafft_iqtree.nexus"))
    ft = modulo.ler_suporte_de_arquivo(
        str(trees_varv49 / "tree_dataset_final_mafft_fasttree.nexus"))

    ids_iq = {r["clade_id"] for r in iq["ramos"]}
    ids_ft = {r["clade_id"] for r in ft["ramos"]}
    comuns = ids_iq & ids_ft

    assert comuns, "nenhum ramo em comum: a identidade de clado não está juntando"
    # Nenhum rótulo com sufixo de versão sobrou na identidade.
    for ramo in iq["ramos"]:
        assert all("." not in t for t in ramo["taxa"])
