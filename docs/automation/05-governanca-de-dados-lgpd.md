# Governança de dados, LGPD e ética em pesquisa

[← Automação](README.md)

> **Natureza deste documento.** É orientação de engenharia e de processo, escrita para que agentes e desenvolvedores tomem decisões defensáveis por padrão. **Não é parecer jurídico.** Decisões sobre base legal, consentimento, e submissão a comitê de ética são da instituição (UFF): encarregado/DPO, orientador e CEP/CONEP. Onde este documento diz "consultar", consultar é o passo, não uma formalidade.

## 1. Por que isso é material para este projeto

O PhyloTreeMiner é apresentado como ferramenta de **vigilância genômica / saúde pública**. Três fatos do código tornam a governança de dados uma exigência concreta, não um capítulo decorativo:

1. O backend extrai e indexa `host`, `isolate`, `collection_date`, país e região por sequência — e classifica explicitamente hospedeiro humano (`homo sapiens` em `genericOWIDAnalyzer.py:478`). **Hospedeiro humano + geografia fina + data + identificador de isolado é uma combinação com potencial de reidentificação** em coortes pequenas.
2. Existe um **demo alcançável pela internet** (`phylotreeminer.ic.uff.br`, numa máquina da universidade) e, no código, **nenhuma rota exige autenticação** — inclusive `upload_data` (`app.py:1904`), que aceita FASTA/ZIP arbitrários. Isto é: terceiros podem enviar dados que você não escolheu receber.
3. O isolamento por usuário é um **UUID auto-declarado** via header `X-User-ID` (`neo4j_router.py:17`), gerado no navegador. É um identificador pseudonimizado sem política de retenção nem caminho de exclusão.

**Contexto decidido pelo usuário ([DEC-004](07-log-de-execucao.md)): não haverá login.** O demo existe para avaliação por bancas durante a submissão do artigo, e um avaliador precisa conseguir *rodar* o pipeline — fechar a escrita atrás de credencial destruiria o propósito. Isso **desloca** a estratégia de governança, não a dispensa: se o controle não pode ser "quem entra", ele passa a ser **o que se aceita, por quanto tempo, e com que aviso**. Na prática:

- o próprio README já declara que a ferramenta é *exclusivamente para demonstração e não deve executar pipelines de produção* — o trabalho de governança é tornar essa frase **operante** (aviso na interface antes do envio, limites técnicos, TTL curto) em vez de decorativa;
- **dado sensível real não deve ser processado no demo, por decisão de projeto.** Análise de dado identificável pertence a ambiente controlado (art. 13), não a uma URL aberta — e a fase futura de infra plugável (usuário conecta a própria nuvem ou roda local) é exatamente o caminho arquitetural para isso;
- as rotas **administrativas** (reconfigurar conexão, e afins) continuam precisando de token de operador: elas não servem ao avaliador e são o vetor de SSRF.

Um revisor de Nature em tema de saúde pública pergunta por *data availability*, ética e privacidade. Um relato de que "os dados são públicos do GenBank" só é suficiente se for verdade para **todo** dado que o sistema trata — e hoje não é, por causa de (2) e (3).

## 2. Inventário de dados (manter atualizado — dono: [A8](../agents/08-dados-e-governanca.md))

| # | Dado | Origem | É dado pessoal? | Sensível? | Risco |
|---|---|---|---|---|---|
| D1 | Sequências e metadados de nucleotídeos (accession, organismo, país, data) | NCBI/INSDC, público | Em regra **não** | — | Baixo |
| D2 | `host = Homo sapiens` + `isolate` + `collection_date` + geografia fina | NCBI, público | **Possivelmente sim**, por reidentificação em coorte pequena | Se vinculável a pessoa natural: **dado genético → sensível** (LGPD art. 5º, II) | **Alto** — é o cerne científico da ferramenta |
| D3 | Nomes/e-mails de submissores em registros GenBank | NCBI, público | **Sim** (dado pessoal de pesquisadores) | Não | Baixo-médio (não republicar em massa) |
| D4 | `NCBI_EMAIL` (exigido pelo Entrez) | operador | **Sim** | Não | Baixo — usar e-mail **institucional**, nunca pessoal; há transferência internacional implícita |
| D5 | `X-User-ID` (UUID do navegador) + partição de grafo associada | usuário do demo | **Sim** (pseudonimizado) | Não | Médio — sem retenção nem exclusão (art. 18) |
| D6 | Arquivos enviados por terceiros no demo | usuário do demo | **Desconhecido — é o problema** | Potencialmente sensível | **Alto** — recepção involuntária de dado clínico |
| D7 | Logs de servidor (IP, rota, `str(e)` com paths) | infra | **Sim** (IP) | Não | Médio — `S-4` vaza estrutura interna |
| D8 | Strings de localidade enviadas ao Nominatim pelo navegador | derivado de D1/D2 | Indireto | Não | Médio — divulgação a terceiro + violação da política de uso do OSM |

## 3. Enquadramento legal aplicável (para consulta e redação, não para autodecidir)

**LGPD — Lei nº 13.709/2018:**
- **Art. 5º, II** — dado genético e dado referente à saúde são **dados pessoais sensíveis** quando vinculados a pessoa natural. É o eixo de D2/D6.
- **Art. 5º, III e XI + art. 12** — dado **anonimizado** sai do escopo da lei, *salvo* se a anonimização puder ser revertida com esforços razoáveis. Pseudonimização (D5) **não** é anonimização.
- **Art. 5º, XVIII** — a UFF se enquadra como **órgão de pesquisa**, o que habilita as bases dos artigos seguintes.
- **Art. 7º, IV** — tratamento para realização de estudos por órgão de pesquisa, "garantida, sempre que possível, a anonimização".
- **Art. 11, II, "c"** — para dados **sensíveis**, estudos por órgão de pesquisa, "sendo assegurada, sempre que possível, a anonimização".
- **Art. 13** — estudos em **saúde pública**: acesso a bases de dados pessoais tratado exclusivamente dentro do órgão, para a finalidade da pesquisa, em **ambiente controlado e seguro**, com anonimização ou pseudonimização sempre que possível. *Um demo público na internet sem autenticação é o oposto de ambiente controlado.*
- **Art. 18** — direitos do titular: confirmação, acesso, correção, anonimização/eliminação, portabilidade. Hoje **não há mecanismo** para atender a nenhum deles sobre D5/D6.
- **Art. 46** — medidas de segurança técnicas e administrativas. Os itens `S-1`..`S-5` da auditoria são literalmente isso.
- **Art. 48** — incidente com risco relevante: comunicar ANPD e titular. Exige saber **o que** havia no sistema, ou seja, exige o inventário da §2.

**Ética em pesquisa (Brasil):** pesquisa com seres humanos ou material biológico humano passa por CEP/CONEP (Res. CNS 466/2012; 510/2016 para ciências humanas e sociais; 441/2011 para biorrepositórios). Uso exclusivo de **bases públicas anônimas** normalmente não caracteriza pesquisa com seres humanos, mas **essa avaliação é do CEP, não do agente nem do desenvolvedor** — e a resposta deve ser documentada por escrito para o artigo.

**Acesso ao patrimônio genético:** Lei nº 13.123/2015 e Decreto nº 8.772/2016 exigem cadastro no **SisGen** para acesso a patrimônio genético brasileiro. A aplicabilidade a *informação de sequência digital já publicada* é matéria em disputa. Se houver qualquer material biológico coletado no Brasil na cadeia dos dados, **consultar a instituição antes de submeter**.

**Fora do Brasil:** se o demo atender visitantes da UE, GDPR entra em cena (art. 9 para categorias especiais; art. 89 para salvaguardas de pesquisa). Publicar em revista internacional torna a pergunta provável na revisão.

## 4. Princípios operacionais (o que o código deve fazer)

1. **Minimização.** Não colete, não persista e não indexe campo que a análise não usa. Se `isolate` não entra em nenhuma métrica, não vá para o Neo4j.
2. **Anonimização por padrão nos artefatos.** Fixtures, snapshots, exemplos de documentação e figuras usam o dataset de referência público — nunca um dump de execução real.
3. **Separação de ambientes.** Demo público ≠ ambiente de pesquisa. Análise de dado sensível pertence a ambiente controlado (art. 13), não a uma URL aberta.
4. **Retenção finita e provada.** Todo diretório de upload e toda partição de grafo por `X-User-ID` tem TTL, com job de purga **testado**. "Nunca apagamos" não é política, é acúmulo de risco.
5. **Direitos do titular executáveis.** Precisa existir caminho técnico para eliminar tudo associado a um `X-User-ID` e a um upload. Se não existe endpoint, existe pelo menos procedimento documentado.
6. **Nunca logue conteúdo.** Log registra evento, identificador de correlação e tamanho — não payload, não conteúdo de FASTA, não header de sequência, não `str(e)` cru.
7. **Sem segredo e sem dado real no repositório.** `.env` fora do versionamento (`.env.example` já existe); `Backend/src/temp_ncbi/` ignorado; nenhum `.gb`/`.fasta` de execução comitado.
8. **Terceiros são divulgação.** Enviar string ao Nominatim ou e-mail ao Entrez é compartilhamento com terceiro em outro país. Faça no servidor, com cache, com `User-Agent` identificando o projeto — e documente.
9. **Aviso antes do upload.** Enquanto o demo aceitar arquivos, a interface deve dizer, antes do envio: finalidade, retenção, e **"não envie dados identificáveis de pacientes"**. É controle de baixo custo e alto efeito sobre D6.

## 5. Controles priorizados (o que fazer, em ordem)

| # | Controle | Onda | Item da auditoria |
|---|---|---|---|
| G1 | Inventário da §2 escrito e mantido | W0 | *(novo)* |
| G2 | Nenhum dado pessoal em fixture/snapshot/repo | W0 | *(novo)* |
| G3 | Token de operador nas rotas **administrativas** (reconfigurar conexão e afins); escrita de usuário permanece anônima com limites rígidos — sem login, por [DEC-004](07-log-de-execucao.md) | W1 | `S-5` |
| G4 | Limite de tamanho/tipo de upload + nome sanitizado + streaming em vez de `file.read()` em memória + rate limiting | W1 | `S-2`, `S-5` |
| G5 | Parar de vazar `str(e)`; logging estruturado sem conteúdo | W1 | `S-4` |
| G6 | **Aviso operante antes do envio** ("não envie dados identificáveis de pacientes"; finalidade; retenção) + termos de uso do demo, tornando vinculante o que o README já declara | W1 | *(novo)* — controle central agora que não há login |
| G7 | TTL + purga de uploads e de partições por `X-User-ID`, com teste | W2/W5 | `B-11` (caches sem teto) |
| G8 | Geocoding server-side com `User-Agent` e cache; assets Leaflet locais | W5 | `F-9`, `M-1` |
| G9 | Procedimento de atendimento a direitos do titular (art. 18), documentado | W7 | *(novo)* |
| G10 | Declaração de ética/LGPD + parecer do CEP (ou justificativa de não aplicabilidade) para o artigo | W7 | *(novo)* |
| G11 | Verificação SisGen/Nagoya, se aplicável | W7 | *(novo)* |

## 6. Checklist por lote (todo agente responde antes de reportar)

- [ ] Nenhum dado pessoal real entrou em arquivo versionado (fixture, snapshot, exemplo, figura).
- [ ] Nenhum segredo, credencial ou path absoluto de máquina foi comitado.
- [ ] Nenhum log novo registra conteúdo de arquivo, header de sequência ou payload de requisição.
- [ ] Nenhum campo pessoal novo passou a ser persistido/indexado sem necessidade analítica.
- [ ] Nenhum envio novo a serviço de terceiro foi introduzido sem estar documentado aqui.
- [ ] Se toquei em upload/identificação/retenção: revisei §4 e §5 e apontei o impacto no relatório.

## 7. Gatilhos de parada imediata

Pare e devolva ao usuário — sem "consertar por conta" — se encontrar:

- Dado clínico ou identificável de pessoa em qualquer lugar do repositório, de um dump ou de um diretório de upload.
- Segredo real comitado (nesse caso: **rotacionar** é o primeiro passo, remover do histórico é o segundo).
- Evidência de que o demo público recebeu dados sensíveis de terceiros (aciona a análise dos arts. 46/48).
- Necessidade de decidir base legal, consentimento, ou submissão a CEP. Isso é decisão institucional.
