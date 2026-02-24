import React from "react";
import { Table, Progress, Typography, Tooltip, Space } from "antd"; // Adicionado Tooltip e Space
import { InfoCircleOutlined } from "@ant-design/icons"; // Adicionado ícone de informação

const { Text } = Typography;

const MultiQCStats = ({ sequences }) => {
  // Helper para renderizar o cabeçalho com Tooltip
  const ColumnTitle = ({ title, tooltip }) => (
    <Space size={4}>
      <Text>{title}</Text>
      <Tooltip title={tooltip} placement="top">
        <InfoCircleOutlined style={{ fontSize: '12px', color: '#8c8c8c', cursor: 'help' }} />
      </Tooltip>
    </Space>
  );

  const calculateMetrics = (seq) => {
    const s = seq.toUpperCase();
    const total = s.length;
    const g = (s.match(/G/g) || []).length;
    const c = (s.match(/C/g) || []).length;
    const gaps = (s.match(/-/g) || []).length;
    const nonGaps = total - gaps;

    return {
      gc: total > 0 ? (((g + c) / total) * 100).toFixed(1) : 0,
      aligned: total > 0 ? ((nonGaps / total) * 100).toFixed(1) : 0,
      gapPercent: total > 0 ? ((gaps / total) * 100).toFixed(1) : 0,
    };
  };

  const columns = [
    {
      title: "Sample Name",
      dataIndex: "id",
      key: "id",
      width: 180,
      fixed: "left",
      render: (_, record) => (
        <div>
          <Text strong>{record.id}</Text>
          <br />
          <Text type="secondary">{record.subtitle}</Text>
        </div>
      ),
    },
    {
      title: (
        <ColumnTitle 
          title="% mRNA / % rRNA" 
          tooltip="Indica a eficiência da captura de transcritos. Em RNA-Seq, geralmente queremos um alto % de mRNA e baixo rRNA (que é ruído)." 
        />
      ),
      key: "gc",
      width: 170,
      render: (_, record) => {
        const { gc } = calculateMetrics(record.sequence);
        return (
          <Progress
            percent={parseFloat(gc)}
            strokeColor="#96CEB4"
            format={() => `${gc}%`}
          />
        );
      },
    },
    {
      title: (
        <ColumnTitle 
          title="% Aligned" 
          tooltip="Mostra a porcentagem de leituras que mapearam com sucesso no genoma de referência. Valores baixos podem indicar contaminação ou má qualidade do sequenciamento." 
        />
      ),
      key: "aligned",
      width: 170,
      render: (_, record) => {
        const { aligned } = calculateMetrics(record.sequence);
        return (
          <Progress
            percent={parseFloat(aligned)}
            strokeColor="#B2D8B2"
            format={() => `${aligned}%`}
          />
        );
      },
    },
    {
      title: (
        <ColumnTitle 
          title="Insert Size" 
          tooltip="Representa o comprimento médio do fragmento de DNA entre os adaptadores. É crucial para bibliotecas paired-end." 
        />
      ),
      key: "gaps",
      width: 170,
      render: (_, record) => {
        const { gapPercent } = calculateMetrics(record.sequence);
        return (
          <Progress
            percent={parseFloat(gapPercent)}
            strokeColor="#B2C2D8"
            format={() => `${gapPercent}%`}
          />
        );
      },
    },
    {
      title: (
        <ColumnTitle 
          title="% Dups" 
          tooltip="Mede a taxa de duplicatas de PCR. Níveis muito altos sugerem baixa diversidade na biblioteca inicial." 
        />
      ),
      key: "len",
      width: 100,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Simulação de Dups baseada em Gaps para visualização */}
            {/* <Progress 
                percent={Math.random() * 30} 
                size="small" 
                strokeColor="#EBCB8B" 
                showInfo={false}
                style={{ width: 50 }}
            /> */}
            <Text type="secondary">{record.sequence.length} bp</Text>
        </div>
      ),
    },
  ];

  return (
    <div style={{ marginTop: 24 }}>
      <Table
        dataSource={sequences}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        size="small"
        bordered
        scroll={{ x: "max-content" }}
      />
    </div>
  );
};

export default MultiQCStats;