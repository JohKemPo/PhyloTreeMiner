import React from 'react';
import { Card, Row, Col, Typography, Statistic, Alert, Spin, Space, Divider, Progress, Collapse, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import PhylogeneticTreeViewer from './PhylogeneticTreeViewer';

const { Title, Text } = Typography;
const { Panel } = Collapse;

const TreeComparisonViewer = ({ tree1, tree2, tree1Name, tree2Name, comparisonData, projectName }) => {
  if (!comparisonData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <Spin size="large" />
        <Text style={{ marginLeft: 16 }}>Calculating tree distances...</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <Title level={3}>Phylogenetic Tree Comparison</Title>
      
      <Row gutter={[24, 24]}>
        <Col span={12}>
          <Card title={`Tree 1: ${tree1Name}`} size="small">
            <div style={{ height: '400px' }}>
              <PhylogeneticTreeViewer data={tree1} projectName={projectName} />
            </div>
          </Card>
        </Col>
        
        <Col span={12}>
          <Card title={`Tree 2: ${tree2Name}`} size="small">
            <div style={{ height: '400px' }}>
              <PhylogeneticTreeViewer data={tree2} projectName={projectName} />
            </div>
          </Card>
        </Col>
      </Row>

      <Divider />

      {/* Similarity Score */}
      <Card style={{ marginBottom: 24 }}>
        <Title level={4}>Overall Similarity</Title>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Progress 
            percent={comparisonData.similarity_score} 
            status={comparisonData.similarity_score > 70 ? 'success' : comparisonData.similarity_score > 50 ? 'normal' : 'exception'}
            format={percent => `${percent}%`}
          />
          <Text type="secondary">
            {comparisonData.comparison_notes?.similarity_interpretation || 'Similarity analysis'}
          </Text>
        </Space>
      </Card>

      <Title level={4}>Métricas de distância</Title>
      {/* D24 — `consistency` existia no payload desde sempre e nunca era
          exibido. Um veredito que ninguém vê é um veredito que ninguém confere,
          e foi o que permitiu que ele passasse anos dividindo um sentinela. */}
      {comparisonData.comparison_notes?.consistency && (
        <Alert
          type={
            comparisonData.comparison_notes.consistency.startsWith('Inconsistent')
              ? 'warning'
              : comparisonData.quartet_distance == null
                ? 'info'
                : 'success'
          }
          showIcon
          style={{ marginBottom: 16 }}
          message="Concordância entre as duas métricas"
          description={comparisonData.comparison_notes.consistency}
        />
      )}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title={
                <Space size={4}>
                  Robinson-Foulds
                  <Tooltip title="Número de bipartições presentes numa árvore e não na outra. O máximo não enraizado é 2(n−3).">
                    <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                  </Tooltip>
                </Space>
              }
              value={comparisonData.rf_distance}
              suffix={
                comparisonData.rf_max
                  ? <Text type="secondary" style={{ fontSize: 14 }}>{` / ${comparisonData.rf_max}`}</Text>
                  : null
              }
              valueStyle={{ color: comparisonData.rf_distance > 0 ? '#cf1322' : '#3f8600' }}
            />
            {/* O normalizado vem do backend. A interface o recalculava, e duas
                fórmulas para a mesma grandeza divergem na primeira mudança. */}
            {comparisonData.rf_normalized != null && (
              <Progress
                percent={Math.round(comparisonData.rf_normalized * 100)}
                size="small"
                showInfo={false}
                strokeColor={comparisonData.rf_normalized > 0.3 ? '#cf1322' : '#3f8600'}
                style={{ marginBottom: 4 }}
              />
            )}
            <Text type="secondary">
              {comparisonData.comparison_notes?.rf_interpretation || 'Diferença topológica entre as árvores'}
            </Text>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title={
                <Space size={4}>
                  Quartet
                  <Tooltip title="Quartetos de táxons com topologia diferente entre as duas árvores. Exige árvores binárias.">
                    <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                  </Tooltip>
                </Space>
              }
              /* D24 — o backend devolvia -1 para árvore não binária, e o -1 era
                 dividido pelo máximo em dois lugares. Agora é `null` com motivo:
                 indefinido é um estado, não um número. */
              value={comparisonData.quartet_distance == null ? 'indefinida' : comparisonData.quartet_distance}
              suffix={
                comparisonData.quartet_distance != null && comparisonData.quartet_max
                  ? <Text type="secondary" style={{ fontSize: 14 }}>{` / ${comparisonData.quartet_max}`}</Text>
                  : null
              }
              valueStyle={
                comparisonData.quartet_distance == null
                  ? { color: '#8c8c8c', fontSize: 20 }
                  : { color: comparisonData.quartet_distance > 0 ? '#cf1322' : '#3f8600' }
              }
            />
            {comparisonData.quartet_note ? (
              <Alert
                type="info"
                showIcon
                style={{ marginTop: 8 }}
                message="Por que não se aplica"
                description={<Text style={{ fontSize: 12 }}>{comparisonData.quartet_note}</Text>}
              />
            ) : (
              <Text type="secondary">
                {comparisonData.comparison_notes?.quartet_interpretation || 'Baseada em quartetos discordantes'}
              </Text>
            )}
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Clados em comum"
              value={comparisonData.common_clades}
              suffix={
                comparisonData.common_clades + comparisonData.conflicting_clades > 0
                  ? <Text type="secondary" style={{ fontSize: 14 }}>
                      {` / ${comparisonData.common_clades + comparisonData.conflicting_clades}`}
                    </Text>
                  : null
              }
              valueStyle={{ color: '#3f8600' }}
            />
            <Text type="secondary">Clados compartilhados pelas duas árvores</Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Conflicting Clades"
              value={comparisonData.conflicting_clades}
              valueStyle={{ color: comparisonData.conflicting_clades > 0 ? '#cf1322' : '#3f8600' }}
            />
            <Text type="secondary">Clades present in only one tree</Text>
          </Card>
        </Col>
        
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Taxa"
              value={comparisonData.taxon_count}
              valueStyle={{ color: '#1890ff' }}
            />
            <Text type="secondary">Number of species/sequences analyzed</Text>
          </Card>
        </Col>
        
        <Col span={8}>
          <Card>
            <Statistic
              title="Similarity"
              value={comparisonData.similarity_score}
              suffix="%"
              valueStyle={{ color: comparisonData.similarity_score > 70 ? '#3f8600' : comparisonData.similarity_score > 50 ? '#faad14' : '#cf1322' }}
            />
            <Text type="secondary">Percentage of shared clades</Text>
          </Card>
        </Col>
      </Row>

      <Divider />

      <Title level={4}>Detailed Tree Statistics</Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title={`Tree 1 - ${tree1Name}`}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text><strong>Total nodes:</strong> {comparisonData.tree1_stats?.total_nodes}</Text>
              <Text><strong>Leaves:</strong> {comparisonData.tree1_stats?.leaf_nodes}</Text>
              <Text><strong>Internal nodes:</strong> {comparisonData.tree1_stats?.internal_nodes}</Text>
              <Text><strong>Average branch length:</strong> {comparisonData.tree1_stats?.avg_branch_length?.toFixed(6)}</Text>
              <Text><strong>Total tree length:</strong> {comparisonData.tree1_stats?.tree_length?.toFixed(6)}</Text>
            </Space>
          </Card>
        </Col>
        
        <Col span={12}>
          <Card title={`Tree 2 - ${tree2Name}`}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text><strong>Total nodes:</strong> {comparisonData.tree2_stats?.total_nodes}</Text>
              <Text><strong>Leaves:</strong> {comparisonData.tree2_stats?.leaf_nodes}</Text>
              <Text><strong>Internal nodes:</strong> {comparisonData.tree2_stats?.internal_nodes}</Text>
              <Text><strong>Average branch length:</strong> {comparisonData.tree2_stats?.avg_branch_length?.toFixed(6)}</Text>
              <Text><strong>Total tree length:</strong> {comparisonData.tree2_stats?.tree_length?.toFixed(6)}</Text>
            </Space>
          </Card>
        </Col>
      </Row>

      <Collapse ghost style={{ marginBottom: 24 }}>
        <Panel header="Metric Interpretation" key="1">
          <Space direction="horizontal" style={{ width: '100%' }}>
            <Alert
              message="Robinson-Foulds Distance"
              description={
                <Text>
                  Measures the number of bipartitions that differ between trees. 
                  Value 0 indicates identical trees. The larger the value, the more different the trees are.
                </Text>
              }
              type="info"
              showIcon
            />
            
            <Alert
              message="Quartet Distance"
              description={
                <Text>
                  Measures the number of taxon quartets with different topologies between trees.
                  It is more sensitive to local topological differences.
                </Text>
              }
              type="info"
              showIcon
            />
            
            <Alert
              message="Similarity"
              description={
                <Text>
                  Percentage of clades shared between the trees. 
                  Values above 70% indicate high similarity, while below 30% indicate very different trees.
                </Text>
              }
              type="info"
              showIcon
            />
          </Space>
        </Panel>
      </Collapse>
      <Space direction="horizontal">

      {comparisonData.conflicting_clades > 0 && (
        <>
          <Divider />
          <Alert
            message="Detected Incongruences"
            description={
              <Space direction="vertical">
                <Text>
                  {comparisonData.conflicting_clades} clades with topological conflict were found between the trees.
                  This indicates that these trees have significant differences in their phylogenetic structure.
                </Text>
                <Text type="secondary">
                  Conflicting clades are those present in only one of the trees, suggesting differences 
                  in phylogenetic inference or in the data used.
                </Text>
              </Space>
            }
            type="warning"
            showIcon
            style={{height:'150px'}}
          />
        </>
      )}

      {comparisonData.common_clades > 0 && (
        <>
          <Divider />
          <Alert
            message="Consistent Clades"
            description={
              <Text>
                {comparisonData.common_clades} clades are shared between the trees, indicating 
                consistent aspects of the inferred phylogeny.
              </Text>
            }
            type="success"
            showIcon
            style={{height:'150px'}}
          />
        </>
      )}
      </Space>
    </div>
  );
};

export default TreeComparisonViewer;
