"""D13 — rótulos de táxon truncados em 10 caracteres, metade backend.

IQ-TREE e RAxML consomem PHYLIP, cujo limite de nome é 10 caracteres. As
árvores que eles gravam trazem `NC_008030.` onde FastTree e as árvores de
distância trazem `NC_008030.1`. O pipeline que produz esses arquivos está no
submódulo e segue congelado (DEC-011); o que estes testes cobrem é o que o
backend faz ao ler artefatos já truncados:

  * `iter_metadata_nodes` deixa de descartar o registro íntegro do GenBank;
  * `/api/tree/compare` deixa de recusar todo par que envolva IQ-TREE ou RAxML.

A regra que governa a reconciliação: dois rótulos só são o mesmo táxon quando
compartilham o acesso e nenhum dos dois lados tem ambiguidade. Na dúvida, não
se funde — comparar clados errados é pior que recusar a comparação.
"""
import json

import pytest


# --------------------------------------------------------------------------
# accession_base — a normalização que faz os dois rótulos se reencontrarem
# --------------------------------------------------------------------------

class TestAccessionBase:
    @pytest.mark.parametrize("rotulo,esperado", [
        ("NC_008030.1", "NC_008030"),   # rótulo íntegro
        ("NC_008030.", "NC_008030"),    # truncado no 10º caractere
        ("DQ437591.1", "DQ437591"),     # já cabe em 10, nunca truncou
        ("L22579", "L22579"),           # sem versão
        ("", ""),
    ])
    def test_normaliza_para_o_acesso_sem_versao(self, app_module, rotulo, esperado):
        assert app_module.accession_base(rotulo) == esperado


# --------------------------------------------------------------------------
# canonical_label_map — quando reconciliar e, sobretudo, quando não
# --------------------------------------------------------------------------

def _arvore(app_module, newick):
    from dendropy import Tree
    # `preserve_underscores` porque o acesso do GenBank tem `_` no nome
    # (`NC_008030.1`) e o Newick, por padrão, o converteria em espaço.
    return Tree.get_from_string(newick, "newick", rooting="force-unrooted",
                                preserve_underscores=True)


class TestMapaDeRotulosCanonicos:
    def test_reconcilia_truncado_com_integro(self, app_module):
        t1 = _arvore(app_module, "(NC_008030.,NC_008291.,(A.1,B.1));")
        t2 = _arvore(app_module, "(NC_008030.1,NC_008291.1,(A.1,B.1));")
        mapa = app_module.canonical_label_map(t1, t2)
        assert mapa["NC_008030."] == "NC_008030.1"
        assert mapa["NC_008030.1"] == "NC_008030.1"

    def test_nao_faz_nada_quando_os_rotulos_ja_coincidem(self, app_module):
        """Par saudável não é tocado: é o que garante que os snapshots de
        FastTree x NJ continuem valendo."""
        t1 = _arvore(app_module, "(A.1,B.1,(C.1,D.1));")
        t2 = _arvore(app_module, "(A.1,C.1,(B.1,D.1));")
        assert app_module.canonical_label_map(t1, t2) is None

    def test_recusa_quando_dois_rotulos_da_mesma_arvore_dividem_o_acesso(self, app_module):
        """Duas versões do mesmo acesso na mesma árvore são táxons distintos.
        Fundi-los seria inventar um clado — o risco silencioso que D13
        descreve. Sem mapa, a comparação segue pelos rótulos originais."""
        t1 = _arvore(app_module, "(NC_008030.1,NC_008030.2,(A.1,B.1));")
        t2 = _arvore(app_module, "(NC_008030.,NC_008291.,(A.1,B.1));")
        assert app_module.canonical_label_map(t1, t2) is None

    def test_recusa_quando_os_conjuntos_de_acesso_diferem(self, app_module):
        """Árvores de conjuntos de táxons diferentes não se reconciliam por
        truncamento — a diferença é real."""
        t1 = _arvore(app_module, "(A.1,B.1,(C.1,D.1));")
        t2 = _arvore(app_module, "(A.1,B.1,(C.1,E.1));")
        assert app_module.canonical_label_map(t1, t2) is None

    def test_escolhe_o_rotulo_integro_como_canonico(self, app_module):
        """O canônico é o mais longo: o truncado é sempre prefixo do íntegro,
        então nunca se perde o sufixo de versão na saída."""
        t1 = _arvore(app_module, "(NC_001611.,A.1,B.1);")
        t2 = _arvore(app_module, "(NC_001611.1,A.1,B.1);")
        mapa = app_module.canonical_label_map(t1, t2)
        assert set(mapa.values()) == {"NC_001611.1", "A.1", "B.1"}


# --------------------------------------------------------------------------
# iter_metadata_nodes — o registro rico vence o truncado vazio
# --------------------------------------------------------------------------

def _terminal(rotulo, features=0, annotations=None):
    return {
        "newick": rotulo,
        "metadata": {
            "features": [{"qualifiers": {"host": [f"host de {rotulo}"]}}] * features,
            "annotations": annotations or {},
        },
    }


def _arquivo_metadata(tmp_path, arvores):
    """`metadata.json` sintético com a forma do arquivo real: uma lista externa,
    uma lista de árvores dentro, cada árvore com subárvores e `data_terminals`."""
    conteudo = [[
        {nome: {f"{nome}_Inner1": {"data_terminals": terminais}}}
        for nome, terminais in arvores
    ]]
    p = tmp_path / "metadata.json"
    p.write_text(json.dumps(conteudo), encoding="utf-8")
    return str(p)


class TestIterMetadataNodes:
    def test_recupera_o_registro_integro_de_arvore_posterior(self, app_module, tmp_path):
        """O caso de VARV-6: a primeira árvore do arquivo é de RAxML e traz o
        rótulo truncado sem `features`; o registro real está numa árvore
        adiante. Antes, só a primeira árvore era lida e o metadado sumia."""
        caminho = _arquivo_metadata(tmp_path, [
            ("raxml", [_terminal("NC_008030.", features=0),
                       _terminal("DQ437591.1", features=5)]),
            ("fasttree", [_terminal("NC_008030.1", features=347,
                                    annotations={"organism": "Nile crocodilepox virus"}),
                          _terminal("DQ437591.1", features=5)]),
        ])
        nos = list(app_module.iter_metadata_nodes(caminho))
        por_acesso = {app_module.accession_base(n["newick"]): n for n in nos}
        assert len(nos) == 2, "um nó por acesso, sem duplicar o truncado"
        assert por_acesso["NC_008030"]["newick"] == "NC_008030.1"
        assert (por_acesso["NC_008030"]["metadata"]["annotations"]["organism"]
                == "Nile crocodilepox virus")

    def test_para_na_primeira_arvore_quando_ela_ja_esta_completa(self, app_module, tmp_path):
        """Custo: quando nenhum táxon está vazio — todos os projetos de Zika e
        VARV-49 — não se lê uma árvore a mais que antes."""
        caminho = _arquivo_metadata(tmp_path, [
            ("fasttree", [_terminal("A.1", features=3), _terminal("B.1", features=3)]),
            ("raxml", [_terminal("A.", features=0), _terminal("B.", features=0)]),
        ])
        nos = list(app_module.iter_metadata_nodes(caminho))
        assert [n["newick"] for n in nos] == ["A.1", "B.1"]

    def test_ordem_e_a_de_primeira_aparicao(self, app_module, tmp_path):
        """Determinismo (04-rigor-cientifico §4): a ordem não pode depender de
        iteração sobre `set`/`dict` com hash aleatorizado."""
        caminho = _arquivo_metadata(tmp_path, [
            ("raxml", [_terminal("Z.", features=0), _terminal("A.", features=0)]),
            ("fasttree", [_terminal("Z.1", features=2), _terminal("A.1", features=2)]),
        ])
        for _ in range(3):
            nos = list(app_module.iter_metadata_nodes(caminho))
            assert [n["newick"] for n in nos] == ["Z.1", "A.1"]

    def test_terminal_sem_rotulo_e_ignorado(self, app_module, tmp_path):
        caminho = _arquivo_metadata(tmp_path, [
            ("fasttree", [_terminal("", features=1), _terminal("A.1", features=1)]),
        ])
        assert [n["newick"] for n in app_module.iter_metadata_nodes(caminho)] == ["A.1"]

    def test_iter_tree_percorre_todas_as_arvores(self, app_module, tmp_path):
        """`iter_tree=True` alimenta a análise de padrões, que precisa de todas
        as árvores (é o que D8 corrigiu). O ramo não pode parar na primeira."""
        caminho = _arquivo_metadata(tmp_path, [
            ("raxml", [_terminal("A.", features=0)]),
            ("fasttree", [_terminal("A.1", features=2)]),
            ("nj", [_terminal("A.1", features=2)]),
        ])
        arvores = list(app_module.iter_metadata_nodes(caminho, iter_tree=True))
        assert len(arvores) == 3


# --------------------------------------------------------------------------
# D4 — o payload declara se o CSV do FPMax é anterior à correção de M1.1
# --------------------------------------------------------------------------

class TestEsquemaDoCSVdoFPMax:
    """Os projetos em disco foram gerados antes de M1.1 e seu `support` é o
    limiar da varredura. Exibir isso como suporte, sem avisar, é repetir o
    defeito na leitura depois de tê-lo corrigido na escrita."""

    def _analisar(self, app_module, frame):
        return app_module.analyze_patterns(
            fpmax_df=frame, rare_threshold=0.3, robust_threshold=0.6,
            min_size=1, max_size=100, hash_to_subtree_info={},
        )["pattern_statistics"]["support_schema"]

    def test_csv_antigo_e_marcado_e_traz_aviso(self, app_module):
        import pandas as pd
        antigo = pd.DataFrame({
            "support": [0.1, 0.2],
            "itemsets": ["frozenset({1, 2})", "frozenset({1, 2})"],
        })
        esquema = self._analisar(app_module, antigo)
        assert esquema["corrected"] is False
        assert "limiar" in esquema["warning"].lower()
        assert "reexecute" in esquema["warning"].lower()

    def test_csv_corrigido_nao_traz_aviso(self, app_module):
        import pandas as pd
        novo = pd.DataFrame({
            "support": [0.5],
            "min_support_threshold": [0.3],
            "max_support_threshold": [0.5],
            "n_trees": [4],
            "itemsets": ["frozenset({1, 2})"],
        })
        esquema = self._analisar(app_module, novo)
        assert esquema["corrected"] is True
        assert esquema["warning"] is None
        assert "fração" in esquema["support_means"]
