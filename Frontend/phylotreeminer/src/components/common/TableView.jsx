import { Table, Alert, Space, Input, Button, Typography, Tag } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import { dividirLinha, detectarSeparador } from './csv';

const { Text } = Typography;

/**
 * Visor de `.csv` e `.tsv`.
 *
 * O parser anterior dividia a linha por um regex de vírgula-ou-tab. Ele quebra em toda
 * vírgula, inclusive nas que estão **dentro de um campo entre aspas** — e os
 * dados deste projeto têm exatamente isso: o campo `strain` do GenBank traz
 * coisas como `"Bangladesh 1974, nur islam"`, e os itemsets do FPMax são listas
 * de clados separadas por vírgula. Uma linha assim virava colunas a mais, e o
 * excedente era **descartado em silêncio** por `values[i] || ''`.
 *
 * Além disso ordenava tudo como texto — `support` 10 vinha antes de 9 — e não
 * dizia quantas linhas havia.
 */

const ehNumero = (v) => v !== '' && v != null && !Number.isNaN(Number(v));

const TableView = ({ content, fileName }) => {
  const [busca, setBusca] = useState('');
  const [analise, setAnalise] = useState({ colunas: [], linhas: [], avisos: [], separador: ',' });
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!content) return;
    try {
      const linhasTexto = content.replace(/\r/g, '').trim().split('\n').filter((l) => l.length);
      if (!linhasTexto.length) throw new Error('O arquivo está vazio.');

      const separador = detectarSeparador(linhasTexto[0]);
      const cabecalhos = dividirLinha(linhasTexto[0], separador);
      const avisos = [];

      // Cabeçalho repetido colidiria silenciosamente ao indexar por nome —
      // a coluna seguinte sobrescreveria a anterior.
      const vistos = new Set();
      const chaves = cabecalhos.map((h, i) => {
        const base = h || `coluna_${i + 1}`;
        if (vistos.has(base)) {
          avisos.push(`Cabeçalho repetido: "${base}" aparece mais de uma vez; foi desambiguado.`);
          let n = 2;
          while (vistos.has(`${base} (${n})`)) n += 1;
          const unico = `${base} (${n})`;
          vistos.add(unico);
          return unico;
        }
        vistos.add(base);
        return base;
      });

      let irregulares = 0;
      const linhas = linhasTexto.slice(1).map((texto, indice) => {
        const valores = dividirLinha(texto, separador);
        if (valores.length !== cabecalhos.length) irregulares += 1;
        const registro = { key: indice, __linha: indice + 2 };
        chaves.forEach((chave, i) => { registro[chave] = valores[i] ?? ''; });
        return registro;
      });

      if (irregulares) {
        avisos.push(
          `${irregulares} linha(s) têm um número de campos diferente do cabeçalho ` +
          `(${cabecalhos.length}). Antes isso era descartado sem aviso.`
        );
      }

      const colunas = chaves.map((chave) => {
        // Coluna numérica ordena por número. Como texto, "10" vinha antes de "9".
        const amostra = linhas.slice(0, 50).map((l) => l[chave]).filter((v) => v !== '');
        const numerica = amostra.length > 0 && amostra.every(ehNumero);
        return {
          title: chave,
          dataIndex: chave,
          key: chave,
          align: numerica ? 'right' : 'left',
          sorter: numerica
            ? (a, b) => Number(a[chave] || 0) - Number(b[chave] || 0)
            : (a, b) => String(a[chave]).localeCompare(String(b[chave]), 'pt-BR'),
          render: (v) => (v === '' ? <Text type="secondary">—</Text> : v),
        };
      });

      setAnalise({ colunas, linhas, avisos, separador });
      setErro(null);
    } catch (e) {
      setErro(`Não foi possível interpretar o arquivo como tabela: ${e.message}`);
    }
  }, [content]);

  const filtradas = useMemo(() => {
    const alvo = busca.trim().toLowerCase();
    if (!alvo) return analise.linhas;
    return analise.linhas.filter((l) =>
      Object.entries(l).some(
        ([k, v]) => !k.startsWith('__') && k !== 'key' && String(v).toLowerCase().includes(alvo)
      )
    );
  }, [analise.linhas, busca]);

  const baixar = () => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'tabela.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (erro) {
    return <Alert message="Erro de formato" description={erro} type="error" showIcon />;
  }

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
        <Space wrap size={[6, 6]}>
          <Tag>{analise.colunas.length} colunas</Tag>
          <Tag>{analise.linhas.length.toLocaleString('pt-BR')} linhas</Tag>
          <Tag>{analise.separador === '\t' ? 'separador: tab' : 'separador: vírgula'}</Tag>
          {busca && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {filtradas.length.toLocaleString('pt-BR')} correspondem
            </Text>
          )}
        </Space>
        <Space size={4}>
          <Input.Search
            allowClear
            size="small"
            placeholder="buscar na tabela"
            style={{ width: 220 }}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <Button size="small" icon={<DownloadOutlined />} onClick={baixar} />
        </Space>
      </Space>

      {/* Linha irregular deixa de ser descartada em silêncio. */}
      {analise.avisos.map((aviso) => (
        <Alert key={aviso} type="warning" showIcon message={aviso} />
      ))}

      <Table
        columns={analise.colunas}
        dataSource={filtradas}
        size="small"
        scroll={{ x: 'max-content', y: '55vh' }}
        bordered
        pagination={{
          size: 'small',
          showSizeChanger: true,
          defaultPageSize: 50,
          pageSizeOptions: [25, 50, 100, 500],
          showTotal: (total) => `${total.toLocaleString('pt-BR')} linhas`,
        }}
      />
    </Space>
  );
};

export default TableView;
