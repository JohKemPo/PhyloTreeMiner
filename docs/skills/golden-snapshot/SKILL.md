---
name: golden-snapshot
description: Capturar, versionar e validar golden snapshots dos endpoints do PhyloTreeMiner antes de refatorar. Use sempre que for extrair serviço, mover código ou alterar caminho de análise — a regra do projeto é que refatoração estrutural sem snapshot é proibida.
---

# Golden snapshot — caracterizar antes de mover

Um golden snapshot registra a saída **atual** de um endpoint sobre uma entrada fixa. Ele não julga se a saída está certa: ele garante que a refatoração não a mudou. É a diferença entre refatorar e apostar.

## Quando usar

- **Obrigatório** antes de qualquer extração de serviço ou movimentação de código (`Arq-B`, `Arq-C`, onda W4).
- **Obrigatório** antes de mudança de performance (a saída precisa ficar idêntica).
- Antes de tocar a zona sagrada — aqui o snapshot caracteriza o comportamento *inclusive quando ele é errado*, para que o diff de resultado seja mensurável.

Endpoints prioritários: `/api/tree/compare`, `/api/tree/pattern-analysis`, `/api/gen_plot`, `/api/tree/metadata`, paginação de JSON.

## Procedimento

### 1. Fixar a entrada
Use o dataset de referência (`Backend/tests/data/reference/`). Nunca uma saída de execução real do usuário: além de irreprodutível, pode conter dado pessoal ([governança](../../automation/05-governanca-de-dados-lgpd.md)).

### 2. Normalizar a saída
Comparação frágil produz falso vermelho e ensina o time a ignorar a suíte.

- JSON: `json.dumps(payload, sort_keys=True, indent=2, ensure_ascii=False)`.
- Floats: arredonde para a precisão significativa **ou** compare campo a campo com `math.isclose(rel_tol=...)`, com a tolerância declarada no próprio teste.
- Remova campos voláteis (timestamp, caminho absoluto, `run_id`, duração) — e registre no teste **quais** foram removidos e por quê.
- **PNG (`gen_plot`) não se compara por bytes**: fonte e versão de Qt mudam a imagem. Compare dimensões, número de folhas anotadas, mapa de cores e hash do texto de anotação.

### 3. Escrever o teste
```python
# Backend/tests/golden/test_tree_compare.py
GOLDEN = Path(__file__).parent / "data" / "tree_compare.json"

@pytest.mark.asyncio
async def test_compare_golden(client, reference_trees):
    r = await client.post("/api/tree/compare", json=reference_trees)
    assert r.status_code == 200
    got = normalize(r.json())
    if os.getenv("UPDATE_GOLDEN"):          # atualização deliberada e explícita
        GOLDEN.write_text(got, encoding="utf-8")
    assert got == GOLDEN.read_text(encoding="utf-8")
```

### 4. Comentar o que o snapshot significa
```python
# CARACTERIZAÇÃO, não especificação.
# Registra o comportamento atual, incluindo o bug C-5a (quartet devolve -1 para
# árvore não-binária, fazendo check_consistency responder "Inconsistent").
# Atualizar deliberadamente quando C-5a for corrigido em W3.
```
Sem esse comentário, alguém no futuro tratará o bug como contrato.

### 5. Provar que o snapshot detecta mudança
Altere a lógica de propósito (uma constante, um sinal), rode o teste, confirme **vermelho**, desfaça. Snapshot que não pega mudança é CI verde vazia — risco `W0` registrado em [riscos](../../automation/06-riscos-e-rollback.md).

## Regra de atualização

Um golden snapshot só muda por **decisão explícita**, com justificativa no PR:

| Situação | Pode atualizar? |
|---|---|
| Refatoração / extração de serviço | **Não.** Snapshot diferente = a refatoração mudou comportamento |
| Otimização de performance | **Não.** Otimização preserva a saída |
| Correção de bug intencional | **Sim**, com o diff antes/depois no PR |
| Mudança na zona sagrada | **Sim**, mas só depois do parecer de [A6](../../agents/06-dominio-cientifico.md) e da decisão do usuário |
| "O teste está chato" | **Não.** |

## Entregável

No relatório: quais endpoints ganharam snapshot; o que foi normalizado/removido e por quê; a prova de que o snapshot fica vermelho quando a lógica muda; o comando de execução para o usuário e o resultado esperado.

## Neste ambiente

`pytest` não roda aqui. Escreva o teste, confira sintaxe (`python -m py_compile`), e entregue:

```bash
# WSL, com o ambiente do projeto ativo
cd Backend && python -m pytest tests/golden -v
UPDATE_GOLDEN=1 python -m pytest tests/golden   # apenas na primeira captura
```
