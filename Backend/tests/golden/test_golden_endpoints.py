"""Golden snapshots dos endpoints pesados.

Estes snapshots caracterizam o comportamento ATUAL, bugs inclusive. Servem para
provar que uma refatoração não mudou comportamento. Quando um snapshot muda, ou
a mudança era esperada e há parecer no ledger, ou existe regressão.

Defeitos conhecidos que estes snapshots congelam — ver
docs/science/02-defeitos-que-alteram-resultado.md:
  D4  `support` no CSV do FPMax é o limiar da varredura   (pipeline — bloqueado)
  D5  identidade de clado de 16 bits e dependente de ordem  (pipeline — bloqueado)
  D13 rótulos de táxon truncados no arquivo gravado         (pipeline — bloqueado)

Corrigidos em M1 e agora verificados como invariante, não congelados:
  D7  truncamento silencioso por `max_pattern_size`
  D8  `tree_coverage` atribuía padrões a uma única árvore
  D9  `unique_signatures_count` era sempre 0
  D13 a leitura descartava o registro íntegro do GenBank (metade backend)
"""
import pathlib

import pytest

PROJETO = "Variola_Yu_li_2007_noITRs_6seqs"

#: Projetos que os documentos científicos citam pelo nome e que os oráculos
#: precisam encontrar. `Zika_21seq_validacao` é o conjunto de validação do
#: workflow (ver docs/skills/validar-workflow) e só existe depois da primeira
#: execução, por isso não entra aqui.
PROJETOS_DE_REFERENCIA = {
    "Variola_Yu_li_2007",                 # VARV-49, baseline de referência
    "Variola_Yu_li_2007_200seq",          # VARV-121, escala
    "Variola_Yu_li_2007_noITRs_6seqs",    # VARV-6, demo didático
    "test_variola_noITRs_57_Complete",    # VARV-52
    "Zika_Virus_Singapura_Large_21seq",   # conjunto de validação, modo auto
    "Zika_Virus_Singapura_Large_480seq",  # ZIKV-480, escala em nº de táxons
}


@pytest.fixture(scope="module")
def projeto_existe(request):
    import src.app as A
    p = pathlib.Path(A.PROJECTS_ROOT) / PROJETO
    if not p.is_dir():
        pytest.skip(f"projeto de referência {PROJETO} ausente")
    return p


@pytest.mark.golden
async def test_pattern_analysis(client, projeto_existe, snapshot):
    r = await client.get(f"/api/tree/pattern-analysis/{PROJETO}")
    assert r.status_code == 200
    snapshot("pattern_analysis_varv6", r.json())


@pytest.mark.golden
async def test_d7_truncamento_e_declarado(client, projeto_existe):
    """D7 corrigido: o payload declara o filtro e o que ele descartou."""
    r = await client.get(f"/api/tree/pattern-analysis/{PROJETO}")
    stats = r.json()["pattern_statistics"]
    for campo in ("patterns_in_source", "discarded_by_size", "discarded_sizes",
                  "unreadable_rows", "size_filter"):
        assert campo in stats, f"campo {campo} sumiu do payload"
    assert (stats["total_patterns"] + stats["discarded_by_size"]
            + stats["unreadable_rows"]) == stats["patterns_in_source"], (
        "a contabilidade não fecha: linhas do CSV != mantidos + descartados + ilegíveis"
    )


@pytest.mark.golden
async def test_d7_varv121_expoe_os_oito_padroes_maiores(client):
    """Em VARV-121 o teto de 100 itens descartava 8 de 20 padrões — justamente
    os de 118 a 120 itens, que carregam mais conteúdo filogenético."""
    import src.app as A
    if not (pathlib.Path(A.PROJECTS_ROOT) / "Variola_Yu_li_2007_200seq").is_dir():
        pytest.skip("VARV-121 ausente")
    r = await client.get("/api/tree/pattern-analysis/Variola_Yu_li_2007_200seq")
    stats = r.json()["pattern_statistics"]
    assert stats["discarded_by_size"] == 8
    assert min(stats["discarded_sizes"]) >= 100


@pytest.mark.golden
async def test_d8_cobertura_lista_todas_as_arvores(client, projeto_existe):
    """D8 corrigido: um clado conservado ocorre em várias árvores; o mapa é
    um-para-muitos e a cobertura precisa listar todas as que existem em disco."""
    r = await client.get(f"/api/tree/pattern-analysis/{PROJETO}")
    cobertura = r.json()["tree_coverage"]
    em_disco = len(list((projeto_existe / "out" / "Trees").glob("*.nexus")))
    assert len(cobertura) == em_disco, (
        f"cobertura lista {len(cobertura)} árvores; existem {em_disco} em disco"
    )


@pytest.mark.golden
async def test_d9_numeros_falsos_removidos(client, projeto_existe):
    """D9 corrigido: `unique_signatures_count` era 0 por construção e
    `quasi_invariant_count` duplicava `topologically_robust`."""
    r = await client.get(f"/api/tree/pattern-analysis/{PROJETO}")
    corpo = r.json()
    stats = corpo["pattern_statistics"]
    assert "unique_signatures_count" not in stats
    assert "quasi_invariant_count" not in stats
    assert stats["method_sensitive_count"] == len(corpo["method_sensitive_signatures"])
    assert stats["topologically_robust_count"] == len(corpo["topologically_robust"])


@pytest.mark.golden
async def test_insights(client, projeto_existe, snapshot):
    r = await client.get(f"/api/tree/{PROJETO}/insights")
    assert r.status_code == 200
    snapshot("insights_varv6", r.json())


@pytest.mark.golden
async def test_metadata_estrutura(client, projeto_existe, snapshot):
    """O payload completo tem centenas de KB e carrega caminhos absolutos da
    máquina onde o projeto foi gerado — não é versionável. Caracteriza-se a
    estrutura, não o conteúdo bruto."""
    r = await client.get(f"/api/tree/metadata/{PROJETO}")
    assert r.status_code in (200, 202)
    corpo = r.json()

    def resumir(o):
        if isinstance(o, dict):
            return {"tipo": "dict", "chaves": sorted(map(str, o))[:40],
                    "n": len(o)}
        if isinstance(o, list):
            return {"tipo": "list", "n": len(o),
                    "primeiro": resumir(o[0]) if o else None}
        return {"tipo": type(o).__name__}

    snapshot("metadata_estrutura_varv6", resumir(corpo))


@pytest.mark.golden
@pytest.mark.xfail(strict=True, reason="D15 — o metadata.json gravado pelo pipeline "
                                       "embute o caminho absoluto da máquina de origem; "
                                       "a sanitização na leitura é lote da trilha T2")
async def test_metadata_nao_vaza_caminho_do_servidor(client, projeto_existe):
    """Os metadados carregam mensagens de erro com o caminho absoluto da máquina
    de origem (`/home/<usuario>/...`). Isso é divulgação de informação e, num
    snapshot versionado, é dado de terceiro no repositório."""
    r = await client.get(f"/api/tree/metadata/{PROJETO}")
    import re
    vazados = set(re.findall(r"/home/[^\"\\ ]+", r.text))
    assert not vazados, (
        f"resposta expõe caminho absoluto do servidor: {sorted(vazados)[:2]}"
    )


@pytest.mark.golden
async def test_d13_ainda_trunca_no_arquivo_gravado_pelo_pipeline(client, projeto_existe):
    """D13 na origem: o pipeline grava, para cada rótulo truncado, um registro
    de erro em vez do metadado. Isso continua verdadeiro no arquivo em disco —
    a correção está no submódulo, congelado (DEC-011). O que mudou é a leitura:
    o backend reencontra o registro íntegro pelo acesso, o que
    `test_d13_nenhum_taxon_perde_metadado_por_truncamento` verifica."""
    import re
    r = await client.get(f"/api/tree/metadata/{PROJETO}")
    ausentes = set(re.findall(r"Acesso (\S+) não encontrado", r.text))
    assert ausentes, "pipeline corrigido — remova este teste e atualize os snapshots"
    assert all(a.endswith(".") and len(a) == 10 for a in ausentes), (
        f"metadado ausente por motivo diferente de truncamento: {ausentes}"
    )


@pytest.mark.golden
async def test_d13_nenhum_taxon_perde_metadado_por_truncamento(client, projeto_existe):
    """Portão de regressão de D13, metade backend.

    A primeira árvore do metadata.json de VARV-6 é `clustalo_raxml`, com 3 dos
    6 rótulos truncados e sem `features`. Lendo só essa árvore — o
    comportamento anterior — NC_001611 (genoma de referência de Variola),
    NC_008030 e NC_008291 (os dois grupos externos) chegavam à API sem
    organismo, país, hospedeiro nem data. O metadado real estava no arquivo o
    tempo todo, sob o rótulo íntegro, numa árvore adiante."""
    r = await client.get(f"/api/tree/{PROJETO}/search-nodes")
    assert r.status_code == 200
    nos = {n["accessionId"]: n for n in r.json()}

    assert len(nos) == 6, f"um nó por acesso; veio {sorted(nos)}"
    sem_organismo = sorted(a for a, n in nos.items() if n["lineage"] == "Unknown")
    assert not sem_organismo, f"táxons sem organismo: {sem_organismo}"

    assert nos["NC_001611"]["lineage"] == "Variola virus"
    # Grupos externos do baseline de Li et al. (2007): antes vinham como
    # "Unknown" e eram indistinguíveis dos genomas de Variola no painel.
    assert nos["NC_008291"]["lineage"] == "Taterapox virus"
    assert nos["NC_008030"]["lineage"] == "Nile crocodilepox virus"
    # Único registro do conjunto com geografia e data estruturadas.
    assert nos["NC_008030"]["country"] == "Zimbabwe"
    assert nos["NC_008030"]["region"] == "Eastern Africa"
    assert nos["NC_008030"]["year"] == "2001"
    assert nos["NC_008030"]["host"] == "Nile crocodile"


@pytest.mark.golden
async def test_projects_listing(client, snapshot):
    """A listagem reflete o que existe em disco, e `BioComp_UFF/projects/` é
    gitignored — o conjunto de projetos é **local de cada máquina**. Congelar a
    lista inteira num snapshot faria o portão de sanidade falhar na máquina de
    validação por um motivo que não é defeito nenhum.

    O que se congela é o subconjunto que **precisa** existir: os conjuntos de
    referência citados nos documentos científicos e o conjunto de validação. Um
    projeto a mais é normal; um destes a menos é problema."""
    r = await client.get("/projects")
    assert r.status_code == 200
    nomes = sorted(p["name"] for p in r.json())

    presentes = sorted(n for n in nomes if n in PROJETOS_DE_REFERENCIA)
    snapshot("projects_nomes", presentes)

    ausentes = sorted(PROJETOS_DE_REFERENCIA - set(nomes))
    assert not ausentes, (
        f"projetos de referência ausentes nesta máquina: {ausentes}. "
        f"Sem eles, os testes golden e os oráculos não têm o que comparar."
    )


@pytest.mark.golden
async def test_gen_plot(client, projeto_existe):
    """A figura em si não é snapshot (binário instável entre versões do
    matplotlib); o que se caracteriza é que o endpoint responde e devolve
    imagem."""
    r = await client.get(f"/api/gen_plot/{PROJETO}")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith(("image/", "application/json"))
