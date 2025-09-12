import React from 'react';
import { Layout, Spin, Alert } from 'antd';
import GeographicDistribution from './GeographicDistribution';
import TemporalInsights from './TemporalInsights';

const { Content } = Layout;

const PhylogeneticInsights = ({ treeData, loading, error }) => {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="Carregando dados..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Erro"
        description={error.message || "Ocorreu um erro ao carregar os dados."}
        type="error"
        showIcon
      />
    );
  }

  if (!treeData) {
    return (
      <Alert
        message="Sem dados"
        description="Nenhum dado filogenético disponível para análise."
        type="warning"
        showIcon
      />
    );
  }

  return (
    <Layout style={{ padding: '24px', background: '#fff' }}>
      <Content>
        <GeographicDistribution treeData={treeData} />
        <TemporalInsights treeData={treeData} />
      </Content>
    </Layout>
  );
};

export default PhylogeneticInsights;    