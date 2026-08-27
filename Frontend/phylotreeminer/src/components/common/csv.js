/**
 * Leitura de CSV/TSV que respeita campo entre aspas.
 *
 * O visor de tabela dividia a linha por um regex de vírgula-ou-tab, o que
 * quebra em toda vírgula — **inclusive nas que estão dentro de um campo entre
 * aspas**. Os dados deste projeto têm exatamente isso: o campo `strain` do
 * GenBank traz coisas como `"Bangladesh 1974, nur islam"`, e cada itemset do
 * `all_results_fpmax.csv` é uma lista de clados separada por vírgula. Uma linha
 * assim produzia colunas a mais, e o excedente era descartado em silêncio.
 *
 * Fica em módulo próprio, e não junto do componente, por duas razões: o
 * `react-refresh` exige que um arquivo de componente exporte só componentes, e
 * um parser é o tipo de coisa que se testa sem montar tela nenhuma.
 */

/**
 * Divide uma linha em campos, no padrão RFC 4180.
 *
 * `""` dentro de um campo entre aspas é uma aspa literal — é o que o módulo
 * `csv` do Python faz, e o que `String.prototype.split` não faz.
 *
 * @param {string} linha
 * @param {string} separador `,` ou `\t`
 * @returns {string[]}
 */
export function dividirLinha(linha, separador) {
  const campos = [];
  let atual = '';
  let entreAspas = false;

  for (let i = 0; i < linha.length; i += 1) {
    const c = linha[i];
    if (entreAspas) {
      if (c === '"') {
        if (linha[i + 1] === '"') {
          atual += '"';
          i += 1;
        } else {
          entreAspas = false;
        }
      } else {
        atual += c;
      }
    } else if (c === '"') {
      entreAspas = true;
    } else if (c === separador) {
      campos.push(atual.trim());
      atual = '';
    } else {
      atual += c;
    }
  }
  campos.push(atual.trim());
  return campos;
}

/**
 * Tab quando houver mais tabs que vírgulas **fora de aspas**, decidido pela
 * primeira linha. Contar dentro das aspas faria um campo com vírgulas decidir
 * o separador do arquivo inteiro.
 *
 * @param {string} cabecalho
 * @returns {string}
 */
export function detectarSeparador(cabecalho) {
  const foraDeAspas = cabecalho.replace(/"[^"]*"/g, '');
  const virgulas = (foraDeAspas.match(/,/g) || []).length;
  const tabs = (foraDeAspas.match(/\t/g) || []).length;
  return tabs > virgulas ? '\t' : ',';
}
