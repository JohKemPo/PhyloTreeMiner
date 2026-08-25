import json
import pathlib

from ete3 import Tree, TreeStyle, NodeStyle, TextFace, CircleFace

_REGIONS_PATH = pathlib.Path(__file__).resolve().parents[1] / "data" / "regions.json"


def _load_region_index(path=_REGIONS_PATH):
    """Índice país -> região, case-insensitive, com resolução de alias.

    Fonte única de verdade (D16): substitui a tabela antiga que só cobria os
    14 países do estudo de Zika. Os aliases existem porque os isolados de
    Variola são de 1944-1977 e trazem nomes de países da época (ex.: Dahomey,
    Zaire, USSR).
    """
    dados = json.loads(path.read_text(encoding="utf-8"))
    unknown = dados.get("unknown_label", "Unknown")

    paises = dict(dados.get("regions", {}))
    paises.update(dados.get("regions_extra", {}))
    indice = {nome.strip().lower(): regiao for nome, regiao in paises.items()}

    aliases = {alias.strip().lower(): canonico
               for alias, canonico in dados.get("aliases", {}).items()}

    return indice, aliases, unknown


_REGION_INDEX, _COUNTRY_ALIASES, _UNKNOWN_REGION = _load_region_index()


def map_country_to_region(country: str) -> str:
    """Mapeia o país extraído para a região/sub-região correspondente.

    Busca case-insensitive: primeiro o nome direto, depois via alias
    histórico. País ausente ou desconhecido nunca é inferido — devolve
    "Unknown" (regra de 03-metricas.md §5: metadado ausente é ausente).
    """
    if not country or country == "Unknown":
        return _UNKNOWN_REGION

    chave = country.strip().lower()

    regiao = _REGION_INDEX.get(chave)
    if regiao is not None:
        return regiao

    canonico = _COUNTRY_ALIASES.get(chave)
    if canonico is not None:
        return _REGION_INDEX.get(canonico.strip().lower(), _UNKNOWN_REGION)

    return _UNKNOWN_REGION

def render_annotated_tree(tree_file, metadata_dict, output_file="tree_plot.png"):
    """
    Renderiza a árvore filogenética com metadados customizados.
    
    Parâmetros:
    - tree_file: Caminho para o arquivo .nwk
    - metadata_dict: Dicionário onde a chave é o nome do nó na árvore (geralmente Accession ID) 
                     e o valor é o dicionário retornado por `get_node_information`.
    """
    # 1. Carregar a árvore
    # format=0 lê a árvore de forma flexível (suporta nomes de nós internos e folhas)
    t = Tree(tree_file, format=0) 

    # 2. Definir o mapeamento de cores para os clusters (Localização)
    # Paleta agrupada por continente (mesma família de matiz, variando em
    # luminosidade) para que a região exata seja secundária e o continente
    # seja reconhecível à primeira vista.
    color_map = {
        "Northern Africa": "#D35400", "Western Africa": "#E67E22",
        "Middle Africa": "#CA6F1E", "Eastern Africa": "#A04000",
        "Southern Africa": "#935116",
        "Western Asia": "#8E44AD", "Central Asia": "#A569BD",
        "Southern Asia": "#6C3483", "Eastern Asia": "#5B2C6F",
        "South-Eastern Asia": "#7D3C98",
        "Eastern Europe": "#2471A3", "Northern Europe": "#1B4F72",
        "Southern Europe": "#2E86C1", "Western Europe": "#21618C",
        "Northern America": "#117864", "Central America": "#148F77",
        "Caribbean": "#1E8449", "South America": "#0B5345",
        "Oceania": "#B7950B",
        "Unknown": "#BDC3C7"
    }

    # 3. Configurar o estilo geral da árvore
    ts = TreeStyle()
    ts.show_leaf_name = False # Desabilitamos o padrão para criar o nosso customizado
    ts.show_branch_support = False # Desabilitamos o padrão para customizar a posição das métricas
    
    # Adicionar barra de escala no fundo (como na imagem: 0.02)
    ts.show_scale = True

    # 4. Iterar sobre os nós para aplicar estilos e faces
    for node in t.traverse():
        if node.is_leaf():
            resultado = next((item for item in metadata_dict if item["accessionId"] == node.name.split('.')[0]), None)
            # Buscar os metadados do nó atual
            # Presume-se que node.name corresponde ao accessionId do seu script
            meta = {
                "accessionId": resultado['accessionId'],
                "region": resultado['region'],
                "year": resultado['year'],
                "country": resultado['country']
            }
            
            # --- Adicionar o círculo colorido (Cluster) ---
            node_color = color_map.get(meta["region"], color_map["Unknown"])
            # radius ajusta o tamanho da bolinha
            circle = CircleFace(radius=0.1, color=node_color, style="circle")
            # position="branch-right" coloca na ponta do ramo
            node.add_face(circle, column=0, position="branch-right")
            
            # --- Adicionar o texto: <Accession ID> <Geo Loc> <Collection Date> ---
            label_text = f"  {meta['accessionId']} {meta['country']} {meta['year']}"
            text_face = TextFace(label_text, fsize=1, fgcolor="black")
            node.add_face(text_face, column=1, position="branch-right")
            
            # Estilo básico para remover a "bolinha" padrão do ETE3 no nó folha
            nstyle = NodeStyle()
            nstyle["size"] = 0 
            node.set_style(nstyle)

        else:
            # --- Adicionar métricas (Valores de Suporte / Bootstrap) ---
            # Softwares como IQ-TREE frequentemente exportam suportes duplos (SH-aLRT/UFboot) 
            # ex: "100/100" como nome do nó interno no formato Newick.
            # Se for um valor numérico simples, o ETE3 armazena em node.support.
            
            support_val = ""
            if node.name and "/" in str(node.name): 
                support_val = node.name
            elif hasattr(node, "support") and node.support is not None:
                # Arredonda se for float
                support_val = f"{node.support:g}" 

            if support_val:
                support_face = TextFace(f"{support_val}", fsize=1, fgcolor="#444444")
                # Posiciona acima do ramo
                node.add_face(support_face, column=0, position="branch-top")
                
            nstyle = NodeStyle()
            nstyle["size"] = 0 # Esconder nós internos
            node.set_style(nstyle)

    # 5. Renderizar
    t.render(output_file, w=1280, h=720, dpi=300, units="px", tree_style=ts)
    print(f"Árvore renderizada com sucesso em: {output_file}")