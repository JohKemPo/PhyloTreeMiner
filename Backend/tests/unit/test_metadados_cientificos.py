"""D12 / D16 — extração de metadados e classificação país/região.

D12 (a-d) e D16 estão corrigidos (M1.7). A regra do domínio
(docs/science/03-metricas.md §5) é: um metadado ausente é ausente, não é um
valor inferido de outro campo — todo teste aqui verifica essa regra sendo
cumprida, não mais a caracterização do bug antigo.
"""
import pytest


# Todo valor distinto de `geo_loc_name` presente nos metadata.json dos 18
# projetos em BioComp_UFF/projects (varredura de 2026-08-21). Não é uma lista
# de países escolhida a dedo: é o domínio real que a aplicação precisa
# classificar. Serve de portão contra a regressão que originou D16 — uma
# tabela ajustada a um estudo só.
PAISES_PRESENTES_NOS_PROJETOS = [
    "Angola",
    "Australia",
    "Botswana",
    "Brazil",
    "Cambodia",
    "Canada",
    "Cape Verde",
    "Central African Republic",
    "Chile",
    "China",
    "Colombia",
    "Cook Islands",
    "Cote d'Ivoire",
    "Cuba",
    "Democratic Republic of the Congo",
    "Dominican Republic",
    "Ecuador",
    "Fiji",
    "French Guiana",
    "French Polynesia",
    "Gabon",
    "Germany",
    "Ghana",
    "Guatemala",
    "Haiti",
    "Honduras",
    "India",
    "Indonesia",
    "Israel",
    "Italy",
    "Jamaica",
    "Japan",
    "Kazakhstan",
    "Kenya",
    "Lithuania",
    "Malaysia",
    "Martinique",
    "Mexico",
    "Micronesia, Federated States of",
    "Morocco",
    "New Caledonia",
    "New Zealand",
    "Nicaragua",
    "Nigeria",
    "Pakistan",
    "Panama",
    "Peru",
    "Philippines",
    "Puerto Rico",
    "Russia",
    "Samoa",
    "Senegal",
    "Singapore",
    "Slovenia",
    "Solomon Islands",
    "South Korea",
    "Suriname",
    "Taiwan",
    "Tanzania",
    "Thailand",
    "Tonga",
    "USA",
    "Uganda",
    "United Arab Emirates",
    "United Kingdom",
    "Venezuela",
    "Viet Nam",
    "Zimbabwe",
]


def _chamar(app_module, *, annotations=None, qualifiers=None, accession="ACC1"):
    return app_module.get_node_information(
        annotations or {}, {}, qualifiers or {}, accession
    )


class TestAnoDerivado:
    def test_collection_date_e_usado_quando_existe(self, app_module):
        r = _chamar(app_module, qualifiers={"collection_date": ["1975-03-12"]})
        assert r["year"] == "1975"

    def test_d12a_ano_nao_e_mais_fabricado_da_cepa(self, app_module):
        """D12a corrigido: antes, sem collection_date, o código caía no nome
        da cepa e capturava os quatro primeiros dígitos — `0408151v` virava o
        ano 0408. Agora, sem collection_date, o ano é ausente."""
        r = _chamar(app_module, qualifiers={"strain": ["0408151v"]})
        assert r["year"] == "Unknown Date"


class TestPaisDerivado:
    def test_geo_loc_name_e_usado_quando_existe(self, app_module):
        r = _chamar(app_module, qualifiers={"geo_loc_name": ["Brazil: Sao Paulo"]})
        assert r["country"] == "Brazil"

    def test_d12b_pais_nao_e_mais_fabricado_da_cepa(self, app_module):
        """D12b corrigido: antes, sem geo_loc_name, uma regex de letras sobre
        `0408151v` devolvia `v` como país. Agora, sem geo_loc_name, o país é
        ausente."""
        r = _chamar(app_module, qualifiers={"strain": ["0408151v"]})
        assert r["country"] == "Unknown"


class TestOrganismo:
    def test_organism_e_usado_quando_existe(self, app_module):
        r = _chamar(app_module, annotations={"organism": "Variola virus"})
        assert r["lineage"] == "Variola virus"

    def test_d12c_fallback_para_source_agora_funciona(self, app_module):
        """C-5b / D12c corrigido: `.get("organism", 'Unknown')` devolvia a
        string 'Unknown', que é truthy — o `or` nunca disparava e `source`
        era ignorado. Agora o fallback resolve de verdade."""
        r = _chamar(app_module, annotations={"source": "Variola virus (smallpox)"})
        assert r["lineage"] == "Variola virus (smallpox)"


class TestPaisRegiao:
    """C-5d / D16 — fonte única em Backend/src/data/regions.json (corrigido).

    Antes: REGION_MAPPING tinha 14 países, todos do estudo de Zika/Singapura;
    97% dos táxons de VARV-49 caíam em 'Unknown'. Agora: ~120 países em
    sub-regiões UN M49, com aliases para nomenclatura histórica — necessário
    porque os isolados de Variola são de 1944-1977."""

    def test_pais_do_estudo_de_zika_mapeia(self, app_module):
        assert app_module.map_country_to_region("Brazil") == "South America"

    def test_pais_desconhecido_nao_quebra(self, app_module):
        r = app_module.map_country_to_region("Atlantis")
        assert r == "Unknown"

    def test_pais_ausente_nao_quebra(self, app_module):
        assert app_module.map_country_to_region("Unknown") == "Unknown"

    def test_string_vazia_nao_quebra(self, app_module):
        assert app_module.map_country_to_region("") == "Unknown"

    @pytest.mark.parametrize("pais,esperado", [
        ("Bangladesh", "Southern Asia"),
        ("India", "Southern Asia"),
        ("Somalia", "Eastern Africa"),
        ("Ethiopia", "Eastern Africa"),
        ("Botswana", "Southern Africa"),
        ("Afghanistan", "Southern Asia"),
        ("Pakistan", "Southern Asia"),
        ("Sudan", "Northern Africa"),
        ("Benin", "Western Africa"),
        ("Niger", "Western Africa"),
    ])
    def test_d16_paises_do_baseline_de_variola_agora_mapeiam(self, app_module, pais, esperado):
        """D16 corrigido: os países centrais da erradicação da varíola —
        ausentes da tabela antiga — agora resolvem para uma sub-região real."""
        assert app_module.map_country_to_region(pais) == esperado

    @pytest.mark.parametrize("nome_historico,esperado", [
        ("Dahomey", "Western Africa"),       # hoje Benin
        ("Zaire", "Middle Africa"),          # hoje RD Congo
        ("USSR", "Eastern Europe"),          # hoje Rússia
        ("Sumatra", "South-Eastern Asia"),   # hoje parte da Indonésia
        ("Negev", "Western Asia"),           # região histórica, hoje Israel
    ])
    def test_nomes_historicos_de_isolados_de_variola_resolvem(self, app_module, nome_historico, esperado):
        """Sem os aliases, todo isolado pré-independência do baseline de Li et
        al. (2007) cairia em Unknown — o alias é o que torna a correção útil
        para o dataset que ela existe para corrigir.

        'China Horn' (visto em BioComp_UFF/projects/.../raw_data_sequences.gb,
        strain 'China Horn 1948; Sabin Lab July 1948') foi deliberadamente
        excluído destes casos: não é um nome histórico de país, é a cepa
        'Horn' isolada na China — um artefato do regex antigo sobre `strain`
        que D12b remove. Adicioná-lo como alias repetiria o erro que esta
        correção existe para eliminar."""
        assert app_module.map_country_to_region(nome_historico) == esperado

    def test_resolucao_e_insensivel_a_caixa(self, app_module):
        assert app_module.map_country_to_region("usa") == "Northern America"
        assert app_module.map_country_to_region("USA") == "Northern America"

    @pytest.mark.parametrize("pais", PAISES_PRESENTES_NOS_PROJETOS)
    def test_todo_pais_presente_nos_projetos_mapeia(self, app_module, pais):
        """Nenhum país que aparece nos dados pode cair em Unknown.

        Medido antes da correção: a tabela antiga classificava 0% dos táxons
        de VARV-49, 40% de ZIKV-21 e 66,8% de ZIKV-480. Um país sem região
        vira uma fatia 'Unknown' nos painéis geográficos, que é indistinguível
        de metadado genuinamente ausente — por isso é falha, não aviso."""
        assert app_module.map_country_to_region(pais) != "Unknown"

    def test_tabela_cobre_o_dominio(self, app_module):
        import json
        import pathlib
        import src.app as A
        caminho = (pathlib.Path(A.__file__).resolve().parents[1]
                   / "src" / "data" / "regions.json")
        dados = json.loads(caminho.read_text(encoding="utf-8"))
        assert len(dados["regions"]) >= 100, (
            "a tabela de regiões encolheu — verifique se regions.json não foi sobrescrito"
        )


class TestHospedeiro:
    def test_d12d_hospedeiro_agora_e_normalizado(self, app_module):
        """D12d corrigido: variantes do mesmo hospedeiro com atributos
        estruturados anexados (sex/age/breed) contam como o mesmo hospedeiro."""
        a = _chamar(app_module, qualifiers={"host": ["Camelus dromedarius"]})
        b = _chamar(app_module, qualifiers={"host": ["Camelus dromedarius; sex: male"]})
        c = _chamar(app_module, qualifiers={"host": ["Camelus dromedarius; sex: female"]})
        assert a["host"] == b["host"] == c["host"] == "Camelus dromedarius"

    def test_d12d_nomes_comuns_distintos_nao_sao_unificados(self, app_module):
        """Unificar 'camel' com 'Camelus dromedarius' exigiria conhecimento
        taxonômico que não está no dado — a normalização só remove o que o
        GenBank marca explicitamente como atributo à parte (após ';')."""
        a = _chamar(app_module, qualifiers={"host": ["camel"]})
        b = _chamar(app_module, qualifiers={"host": ["Camelus dromedarius"]})
        assert a["host"] != b["host"]
