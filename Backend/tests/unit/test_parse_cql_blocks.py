"""
C-5e — `parse_cql_blocks` cortava em todo `;`, mesmo dentro de string.

Caracterização: `.cql` reais de projetos Zika têm descrições do GenBank com
`;` literal (ex. "African green monkey kidney cells 1 time; serogroup:
Spondweni") e, em artefatos legados, aspas simples não escapadas dentro do
blob de metadata (ex. "Cote d'Ivoire") que fundiam duas instruções MERGE
consecutivas num único bloco corrompido — medido em
`Zika_Virus_Singapura_Medium_11seq/out/outputs/neo4j_commands_tree_dataset.cql`:
836 instruções esperadas (contagem de `;` de fechamento no texto bruto) viravam
804 blocos, 32 deles com duas instruções `MERGE (m:Metadata ...)` fundidas.

Não há oráculo de domínio (dendropy/ete3) aplicável — é um tokenizer de texto,
não um cálculo filogenético. O oráculo aqui é duplo: (1) a gramática do Cypher
em si — cada caso-limite abaixo é uma instrução Cypher real, e o corte correto
é o que qualquer parser Cypher produziria; (2) o parser "inteligente" do
frontend (`CQLExecutor.jsx::parseCQLBlocks`), uma segunda implementação
independente que usa a mesma regra de aspas/escape — os dois devem concordar.
"""
from src.services.cql_batch_service import CQLBatchService


service = CQLBatchService()


def test_ponto_e_virgula_dentro_de_string_dupla_nao_corta():
    """Descrição de GenBank com ';' literal — o caso real que motivou C-5e."""
    content = (
        'CREATE (m:Metadata {note: "African green monkey kidney cells 1 time; '
        'serogroup: Spondweni"}); '
        "MATCH (n) RETURN n;"
    )
    blocks = service.parse_cql_blocks(content)
    assert len(blocks) == 2
    assert "serogroup: Spondweni" in blocks[0]
    assert blocks[0].endswith(";")
    assert blocks[1] == "MATCH (n) RETURN n;"


def test_ponto_e_virgula_dentro_de_string_simples_nao_corta():
    content = "MERGE (t:Tree {name: 'a; b'}); MATCH (n) RETURN n;"
    blocks = service.parse_cql_blocks(content)
    assert len(blocks) == 2
    assert blocks[0] == "MERGE (t:Tree {name: 'a; b'});"


def test_aspas_duplas_dentro_de_string_simples_sao_literais():
    """JSON (aspas duplas) embutido dentro do blob Cypher (aspas simples)."""
    content = 'MERGE (m:Metadata {value: \'{"k": "v; w"}\'}); MATCH (n) RETURN n;'
    blocks = service.parse_cql_blocks(content)
    assert len(blocks) == 2
    assert blocks[0] == 'MERGE (m:Metadata {value: \'{"k": "v; w"}\'});'


def test_aspas_simples_escapada_nao_fecha_a_string():
    content = "MERGE (m:Metadata {value: 'Cote d\\'Ivoire; resto'}); MATCH (n) RETURN n;"
    blocks = service.parse_cql_blocks(content)
    assert len(blocks) == 2


def test_comentario_de_linha_e_removido():
    content = "// comentário solto\nMATCH (n) RETURN n; // outro comentário"
    blocks = service.parse_cql_blocks(content)
    assert blocks == ["MATCH (n) RETURN n;"]


def test_comentario_de_bloco_e_removido():
    content = "/* bloco\n de comentário */ MATCH (n) RETURN n;"
    blocks = service.parse_cql_blocks(content)
    assert blocks == ["MATCH (n) RETURN n;"]


def test_conteudo_vazio():
    assert service.parse_cql_blocks("") == []
    assert service.parse_cql_blocks("   \n  ") == []


def test_ultimo_bloco_sem_ponto_e_virgula_final_e_preservado():
    content = "MATCH (n) RETURN n;\nMATCH (m) RETURN m"
    blocks = service.parse_cql_blocks(content)
    assert len(blocks) == 2
    assert blocks[1] == "MATCH (m) RETURN m"


def test_dado_com_aspa_nao_escapada_ainda_funde_duas_instrucoes():
    """Documenta o limite do tokenizer: aspa simples não escapada dentro do
    blob (`'Cote d'Ivoire'`, sem `\\'`) é indistinguível do fechamento real da
    string Cypher — reproduz a fusão medida no bloco #10 de
    `Zika_Virus_Singapura_Medium_11seq/out/outputs/neo4j_commands_tree_dataset.cql`.
    Nenhum tokenizer resolve isso sem reescapar o dado na origem — ver DEC-052
    e o reparo aplicado aos 4 artefatos legados afetados. Este teste apenas
    prova que o backend concorda com o parser do frontend (mesma fusão),
    e não silenciosamente diverge dele."""
    bloco1 = (
        "MATCH (child:Subtree {name: 'x'})\n"
        "MERGE (m:Metadata {value: '{\"geo_loc_name\": [\"Cote d'Ivoire\"]}'})\n"
        "CREATE (child)-[:HAS_METADATA]->(m);"
    )
    bloco2 = (
        "MATCH (child:Subtree {name: 'x'})\n"
        "MERGE (m:Metadata {value: '{\"geo_loc_name\": [\"Cote d'Ivoire\"]}'})\n"
        "CREATE (child)-[:HAS_METADATA]->(m);"
    )
    content = bloco1 + "\n\n" + bloco2
    blocks = service.parse_cql_blocks(content)
    assert len(blocks) == 1  # funde: aspa não escapada quebra a string Cypher
