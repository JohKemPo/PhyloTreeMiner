import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Card,
  Table,
  Tag,
  Spin,
  Alert,
  Typography,
  Space,
  Statistic,
  Row,
  Col,
  Progress,
  Collapse,
  List,
  Button,
  Flex,
  InputNumber,
} from "antd";
import { ClusterOutlined, ExperimentOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;
const { Panel } = Collapse;

const TreePatternAnalysis = ({ projectName }) => {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [thresholdMin, setThresholdMin] = useState(0.2);
  const [thresholdMax, setThresholdMax] = useState(0.6);

  const analysisCache = useRef(new Map());

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const cacheKey = `${projectName}_${thresholdMin}_${thresholdMax}`;

      if (analysisCache.current.has(cacheKey)) {
        setAnalysisData(analysisCache.current.get(cacheKey));
        setLoading(false);
        return;
      }

      const response = await fetch(
        `http://localhost:8000/api/tree/pattern-analysis/${projectName}?min_support=${thresholdMin}&max_support=${thresholdMax}`
      );

      if (!response.ok) throw new Error("Failed to load analysis");

      const data = await response.json();

      analysisCache.current.set(cacheKey, data);
      setAnalysisData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectName) {
      fetchAnalysis();
    }
  }, [projectName, thresholdMin, thresholdMax]);

  if (loading) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", padding: "40px" }}
      >
        <Spin size="large" tip="Analyzing tree patterns..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Analysis Error"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={fetchAnalysis}>
            Try Again
          </Button>
        }
      />
    );
  }

  if (!analysisData || Object.keys(analysisData).length === 0) {
    return (
      <Alert
        message="No Data Available"
        description="Pattern analysis returned no data."
        type="info"
        showIcon
      />
    );
  }

  const {
    unique_signatures,
    quasi_invariant_patterns,
    pattern_statistics,
    tree_coverage,
  } = analysisData;

  const patternColumns = [
    {
      title: "Pattern",
      dataIndex: "node_names",
      key: "pattern",
      render: (nodes) => (
        <Space direction="vertical" size="small">
          {nodes.map((node, index) => (
            <Tag key={index} color="blue">
              {node}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Support",
      dataIndex: "support",
      key: "support",
      render: (support) => `${(support * 100).toFixed(1)}%`,
      sorter: (a, b) => a.support - b.support,
    },
    {
      title: "Size",
      dataIndex: "size",
      key: "size",
      sorter: (a, b) => a.size - b.size,
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Flex justify="space-between" align="center">
        <Title level={2}>Tree Pattern Analysis</Title>
        {/* <Button size="small" onClick={fetchAnalysis}>
          Reload Analysis
        </Button> */}
        <Space
          direction="vertical"
          style={{
            padding: 12,
            marginTop: 16,
          }}
        >
          <Title level={5} style={{ margin: 0 }}>
            Support Threshold
          </Title>
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Space direction="vertical" size={2}>
              <Text type="secondary" strong style={{ fontSize: 12 }}>
                Min
              </Text>
              <InputNumber
                value={thresholdMin}
                min={0.1}
                max={1.0}
                step={0.1}
                onChange={setThresholdMin}
                style={{ width: 100 }}
              />
            </Space>
            <Space direction="vertical" size={2}>
              <Text type="secondary" strong style={{ fontSize: 12 }}>
                Max
              </Text>
              <InputNumber
                value={thresholdMax}
                min={0.1}
                max={1.0}
                step={0.1}
                onChange={setThresholdMax}
                style={{ width: 100 }}
              />
            </Space>
          </Space>
        </Space>
      </Flex>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Patterns (clades or subtrees)"
              value={pattern_statistics.total_patterns}
              prefix={<ClusterOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Unique Signatures"
              value={pattern_statistics.unique_signatures_count}
              valueStyle={{ color: "#cf1322" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Quasi-Invariant Patterns"
              value={pattern_statistics.quasi_invariant_count}
              valueStyle={{ color: "#389e0d" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Average Size"
              value={pattern_statistics.avg_pattern_size.toFixed(2)}
              suffix="Terminal (nodes)"
            />
          </Card>
        </Col>
      </Row>

      {/* <Card title="Pattern Size Distribution" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          {Object.entries(pattern_statistics.size_distribution).map(
            ([size, count]) => (
              <Col key={size} span={6}>
                <Text strong>{size} Terminals (nodes): </Text>
                <Text>{count} patterns</Text>
                <Progress
                  percent={Math.round(
                    (count / pattern_statistics.total_patterns) * 100
                  )}
                  size="small"
                />
              </Col>
            )
          )}
        </Row>
      </Card> */}

      <Collapse style={{ marginBottom: 24 }}>
        <Panel
          header={`Unique Signatures  (${unique_signatures.length})`}
          key="1"
        >
          <Table
            columns={patternColumns}
            dataSource={unique_signatures.map((item, index) => ({
              ...item,
              key: index,
            }))}
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </Panel>
      </Collapse>

      <Collapse style={{ marginBottom: 24 }}>
        <Panel
          header={`Quasi-Invariant Patterns (${quasi_invariant_patterns.length})`}
          key="2"
        >
          <Table
            columns={patternColumns}
            dataSource={quasi_invariant_patterns.map((item, index) => ({
              ...item,
              key: index,
            }))}
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </Panel>
      </Collapse>

      <Card title="Coverage per Tree">
        <List
          dataSource={Object.entries(tree_coverage)}
          renderItem={([treeName, stats]) => (
            <List.Item>
              <List.Item.Meta
                title={treeName}
                description={
                  <Space direction="vertical">
                    <Text>Pattern: {stats.pattern_count}</Text>
                    <Text>
                      Average support: {(stats.avg_support * 100).toFixed(1)}%
                    </Text>
                    <Text>
                      Size: {stats.size_range.min}-{stats.size_range.max}{" "}
                      Terminal(s) (avg: {stats.size_range.avg.toFixed(1)})
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

export default TreePatternAnalysis;
