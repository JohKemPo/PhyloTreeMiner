"""Golden do núcleo de comparação de árvores: RF, quartet, clados em comum."""
import itertools
import pathlib
import re

import pytest

PROJETO = "Variola_Yu_li_2007_noITRs_6seqs"


def _trees_dir():
    import src.app as A
    return pathlib.Path(A.PROJECTS_ROOT) / PROJETO / "out" / "Trees"


def _ler(nome):
    p = _trees_dir() / nome
    if not p.exists():
        pytest.skip(f"árvore de referência ausente: {nome}")
    return p.read_text(encoding="utf-8", errors="replace")


@pytest.fixture(scope="module")
def par_saudavel():
    """FastTree x NJ — ambos gravam TaxLabels íntegros (ver D13)."""
    return (_ler("tree_dataset_final_mafft_fasttree.nexus"),
            _ler("tree_dataset_final_mafft_nj_distance.nexus"))


@pytest.mark.golden
async def test_compare_fasttree_vs_nj(client, par_saudavel, snapshot):
    t1, t2 = par_saudavel
    r = await client.post("/api/tree/compare", json={"tree1": t1, "tree2": t2})
    assert r.status_code == 200
    snapshot("compare_fasttree_nj_varv6", r.json())


@pytest.mark.golden
async def test_compare_arvore_consigo_mesma(client, par_saudavel, snapshot):
    """Piso da métrica: uma árvore contra si mesma tem RF 0."""
    t1, _ = par_saudavel
    r = await client.post("/api/tree/compare", json={"tree1": t1, "tree2": t1})
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["rf_distance"] == 0, "RF de uma árvore consigo mesma deve ser 0"
    snapshot("compare_identidade_varv6", corpo)


@pytest.mark.golden
async def test_compare_exige_as_duas_arvores(client):
    r = await client.post("/api/tree/compare", json={"tree1": "x"})
    assert r.status_code == 400


@pytest.mark.golden
def test_d13_taxlabels_truncados_em_10_caracteres():
    """D13 — IQ-TREE e RAxML gravam TaxLabels truncados em 10 caracteres
    (limite de nome do PHYLIP), divergindo dos rótulos usados na própria
    string da árvore. Este teste caracteriza o defeito: quando o pipeline for
    corrigido, ele falha e deve ser removido junto com a atualização dos
    snapshots."""
    d = _trees_dir()
    if not d.is_dir():
        pytest.skip("projeto de referência ausente")
    truncados = {}
    for f in sorted(d.glob("*.nexus")):
        m = re.search(r"TaxLabels([^;]*)", f.read_text(errors="replace"))
        if not m:
            continue
        n = sum(1 for lbl in m.group(1).split() if len(lbl) == 10 and lbl.endswith("."))
        if n:
            truncados[f.name] = n
    metodos = {m for nome in truncados for m in ("iqtree", "raxml") if m in nome}
    assert truncados, (
        "nenhum rótulo truncado encontrado — D13 pode ter sido corrigido; "
        "remova este teste e atualize os snapshots"
    )
    assert metodos <= {"iqtree", "raxml"}, (
        f"truncamento se espalhou para além de IQ-TREE/RAxML: {truncados}"
    )


@pytest.mark.golden
@pytest.mark.slow
async def test_todos_os_pares_comparam_apesar_do_truncamento(client):
    """Portão de regressão de D13, metade backend.

    Antes: o namespace de táxons da primeira árvore era imposto à segunda, e o
    dendropy abortava sempre que os rótulos divergiam — 24 dos 45 pares de
    VARV-6 (53%) eram recusados, todos os que envolviam IQ-TREE ou RAxML.
    Agora cada árvore é lida no próprio namespace e os rótulos truncados são
    reconciliados pelo acesso antes de alinhar.

    O pipeline continua gravando `TaxLabels` truncados (submódulo, DEC-011);
    o que este teste garante é que o backend sabe lê-los."""
    d = _trees_dir()
    if not d.is_dir():
        pytest.skip("projeto de referência ausente")
    arvores = sorted(d.glob("*.nexus"))
    falhas = []
    for a, b in itertools.combinations(arvores, 2):
        r = await client.post("/api/tree/compare", json={
            "tree1": a.read_text(errors="replace"),
            "tree2": b.read_text(errors="replace")})
        if r.status_code != 200:
            falhas.append((a.stem, b.stem, r.status_code, r.json().get("detail")))
    total = len(arvores) * (len(arvores) - 1) // 2
    assert not falhas, f"{len(falhas)}/{total} pares não comparam: {falhas[:3]}"


@pytest.mark.golden
async def test_par_truncado_devolve_o_conjunto_real_de_taxons(client):
    """A reconciliação não pode inflar o namespace: sem ela, `NC_008030.` e
    `NC_008030.1` seriam dois táxons e a árvore de 6 folhas passaria a
    declarar 9, o que distorce toda métrica normalizada por número de
    táxons."""
    r = await client.post("/api/tree/compare", json={
        "tree1": _ler("tree_dataset_final_mafft_iqtree.nexus"),
        "tree2": _ler("tree_dataset_final_mafft_fasttree.nexus")})
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["taxon_count"] == 6
    assert corpo["tree1_stats"]["leaf_nodes"] == 6
    assert corpo["tree2_stats"]["leaf_nodes"] == 6


@pytest.mark.golden
async def test_conjuntos_de_taxons_diferentes_sao_recusados(client):
    """Reconciliar por acesso não pode virar licença para comparar árvores de
    conjuntos diferentes: RF e quartet não estão definidas nesse caso. Antes,
    o dendropy recusava por efeito colateral do namespace compartilhado; agora
    a recusa é explícita."""
    nexus = ("#NEXUS\nBegin Taxa;\n Dimensions NTax=4;\n"
             " TaxLabels A.1 B.1 C.1 {quarto};\nEnd;\n"
             "Begin Trees;\n Tree tree1=(A.1,B.1,(C.1,{quarto}));\nEnd;\n")
    r = await client.post("/api/tree/compare", json={
        "tree1": nexus.format(quarto="D.1"),
        "tree2": nexus.format(quarto="E.1")})
    assert r.status_code == 400
    assert "taxon set" in r.json()["detail"]
