import React from 'react';
import { Card, Row, Col, Typography, Statistic, Alert, Spin, Space, Divider, Progress, Collapse } from 'antd';
import PhylogeneticTreeViewer from './PhylogeneticTreeViewer';

const { Title, Text } = Typography;
const { Panel } = Collapse;

const TreeComparisonViewer = ({ tree1, tree2, tree1Name, tree2Name, comparisonData, metadata }) => {
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
              <PhylogeneticTreeViewer data={tree1} metadata={metadata} />
            </div>
          </Card>
        </Col>
        
        <Col span={12}>
          <Card title={`Tree 2: ${tree2Name}`} size="small">
            <div style={{ height: '400px' }}>
              <PhylogeneticTreeViewer data={tree2} metadata={metadata} />
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

      <Title level={4}>Distance Metrics</Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Robinson-Foulds Distance"
              value={comparisonData.rf_distance}
              valueStyle={{ color: comparisonData.rf_distance > 0 ? '#cf1322' : '#3f8600' }}
            />
            <Text type="secondary">
              {comparisonData.comparison_notes?.rf_interpretation || 'Measures topological differences between trees'}
            </Text>
          </Card>
        </Col>
        
        <Col span={8}>
          <Card>
            <Statistic
              title="Quartet Distance"
              value={comparisonData.quartet_distance === -1 ? '--' : comparisonData.quartet_distance}
              valueStyle={{ color: comparisonData.quartet_distance > 0 ? '#cf1322' : '#3f8600' }}
            />
            <Text type="secondary">
              {comparisonData.comparison_notes?.quartet_interpretation || 'Based on discordant quartets'}
            </Text>
          </Card>
        </Col>
        
        <Col span={8}>
          <Card>
            <Statistic
              title="Common Clades"
              value={comparisonData.common_clades}
              valueStyle={{ color: '#3f8600' }}
            />
            <Text type="secondary">Clades shared between trees</Text>
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
