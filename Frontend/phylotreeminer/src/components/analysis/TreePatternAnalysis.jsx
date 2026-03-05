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
  Collapse,
  List,
  Button,
  Flex,
  InputNumber,
  Tooltip,
  Popover,
  Badge,
  Dropdown,
} from "antd";
import {
  ClusterOutlined,
  InfoCircleOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import TableExporter from "../../utils/TableExporter";

const { Title, Text } = Typography;
const { Panel } = Collapse;

const TreePatternAnalysis = ({ projectName }) => {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rareThreshold, setRareThreshold] = useState(0.3);
  const [robustThreshold, setRobustThreshold] = useState(0.4);
  const [method_sensitive_signatures, setMethod_sensitive_signatures] =
    useState({});
  const [topologically_robust, setTopologically_robust] = useState({});
  const [pattern_statistics, setPattern_statistics] = useState({});
  const [tree_coverage, setTree_coverage] = useState({});

  const analysisCache = useRef(new Map());

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const cacheKey = `${projectName}_${rareThreshold}_${robustThreshold}`;

      if (analysisCache.current.has(cacheKey)) {
        setAnalysisData(analysisCache.current.get(cacheKey));
        setLoading(false);
        return;
      }

      const response = await fetch(
        `http://localhost:8000/api/tree/pattern-analysis/${projectName}?rare_threshold=${rareThreshold}&robust_threshold=${robustThreshold}`,
      );
      if (!response.ok) throw new Error("Failed to load analysis");

      const data = await response.json();

      analysisCache.current.set(cacheKey, data);
      setAnalysisData(data);
      setMethod_sensitive_signatures(data.method_sensitive_signatures);
      setTopologically_robust(data.topologically_robust);
      setPattern_statistics(data.pattern_statistics);
      setTree_coverage(data.tree_coverage);
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
  }, [projectName, rareThreshold, robustThreshold]);

  const sharedSensitiveSequences = useMemo(() => {
    if (
      !method_sensitive_signatures ||
      !Array.isArray(method_sensitive_signatures)
    )
      return [];
    const counts = {};
    method_sensitive_signatures.forEach((item) => {
      const uniqueInRow = new Set(item.terminals || []);
      uniqueInRow.forEach((taxa) => {
        counts[taxa] = (counts[taxa] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([taxa, count]) => ({ taxa, count }));
  }, [method_sensitive_signatures]);

  const sharedRobustSequences = useMemo(() => {
    if (!topologically_robust || !Array.isArray(topologically_robust))
      return [];
    const counts = {};
    topologically_robust.forEach((item) => {
      const uniqueInRow = new Set(item.terminals || []);
      uniqueInRow.forEach((taxa) => {
        counts[taxa] = (counts[taxa] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .filter(([_, count]) => count > 1)
      .map(([taxa, count]) => ({ taxa, count }));
  }, [topologically_robust]);

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

  const patternColumns = [
    {
      title: "Clades/Subtrees",
      dataIndex: "node_names",
      key: "pattern",
      render: (nodes) => {
        if (!nodes || nodes.length === 0) return "-";

        const maxVisible = 3;
        const visibleNodes = nodes.slice(0, maxVisible);
        const hiddenNodes = nodes.slice(maxVisible);

        return (
          <Space size={[0, 4]} wrap>
            {visibleNodes.map((node, index) => (
              <Tag key={index} color="blue">
                {node}
              </Tag>
            ))}
            {hiddenNodes.length > 0 && (
              <Popover
                content={
                  <div
                    style={{
                      maxWidth: 400,
                      maxHeight: 600,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "4px",
                      overflow: "auto",
                    }}
                  >
                    {hiddenNodes.map((node, index) => (
                      <Tag key={index} color="blue">
                        {node}
                      </Tag>
                    ))}
                  </div>
                }
                title="Clades/Subtrees adicionais"
                trigger="hover"
              >
                <Tag
                  color="blue"
                  style={{ cursor: "pointer", borderStyle: "dashed" }}
                >
                  + {hiddenNodes.length} mais...
                </Tag>
              </Popover>
            )}
          </Space>
        );
      },
    },
    {
      title: (
        <Space>
          Support
          <Tooltip title="Percentage of trees (methods) where this clade was recovered.">
            <InfoCircleOutlined />
          </Tooltip>
        </Space>
      ),
      dataIndex: "support",
      key: "support",
      render: (support) => `${(support * 100).toFixed(1)}%`,
      sorter: (a, b) => a.support - b.support,
    },
    {
      title: "Size (Nodes)",
      dataIndex: "size",
      key: "size",
      sorter: (a, b) => a.size - b.size,
    },
  ];

  const expandedRowRender = (record) => {
    return (
      <div style={{ padding: "10px 20px", backgroundColor: "#f9f9f9" }}>
        <Text strong>Taxa (Sequences) in this pattern:</Text>
        <div
          style={{
            marginTop: 8,
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          {record.terminals?.map((taxa, idx) => (
            <Tag key={idx}>
              {
                <a
                  href={`https://www.ncbi.nlm.nih.gov/nuccore/${taxa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    icon={<ExportOutlined />}
                    size="small"
                    type="link"
                    style={{ fontSize: 10 }}
                  >
                    {taxa}
                  </Button>
                </a>
              }
            </Tag>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: "24px" }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Title level={2}>Tree Pattern Analysis</Title>
        <Space direction="vertical" style={{ padding: 12 }}>
          <Title strong level={4} style={{ margin: 0 }}>
            Thresholds
          </Title>
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Space direction="vertical" size={2}>
              <Text type="secondary" strong style={{ fontSize: 12 }}>
                Sensitive (Max %)
              </Text>
              <InputNumber
                value={rareThreshold}
                min={0.1}
                max={1.0}
                step={0.1}
                onChange={setRareThreshold}
                style={{ width: 100 }}
              />
            </Space>
            <Space direction="vertical" size={2}>
              <Text type="secondary" strong style={{ fontSize: 12 }}>
                Robust (Min %)
              </Text>
              <InputNumber
                value={robustThreshold}
                min={0.1}
                max={1.0}
                step={0.1}
                onChange={setRobustThreshold}
                style={{ width: 100 }}
              />
            </Space>
          </Space>
        </Space>
      </Flex>

      <Alert
        message="Phylogenetic Interpretation"
        description={
          <ul style={{ paddingLeft: 20, marginBottom: 0 }}>
            <li>
              <b>Topologically Robust Clades (High Support): </b>
              Strong evolutionary relationships. These groups appear in most
              trees, regardless of the aligner or algorithm used (e.g., NJ,
              UPGMA, ML).
            </li>
            <li>
              <b>Method-Sensitive Clades (Low Support):</b>
              Clusters Unstable. They form only under very specific evolutionary
              algorithms or premises. They may indicate regions that are
              difficult to resolve or noise in the alignment.
            </li>
          </ul>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
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
        <Col span={6}>
          <Card>
            <Statistic
              title="Method-Sensitive Clades"
              value={method_sensitive_signatures.length}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Robust Evolutionary Clades"
              value={topologically_robust.length}
              valueStyle={{ color: "#389e0d" }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}></Row>

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
          header={`Method-Sensitive Clades (Support ≤ ${(rareThreshold * 100).toFixed(0)}%)`}
          key="1"
        >
          {sharedSensitiveSequences.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Dropdown
                placement="topLeft"
                trigger={["hover"]}
                popupRender={() => (
                  <div
                    style={{
                      backgroundColor: "#fff",
                      padding: "8px",
                      borderRadius: "8px",
                      boxShadow:
                        "0 6px 16px 0 rgba(0,0,0,0.08), 0 3px 6px -4px rgba(0,0,0,0.12)",
                      border: "1px solid #0B7DCF34",
                      width: "600px",
                    }}
                  >
                    <div
                      style={{
                        marginBottom: 12,
                        borderBottom: "1px solid #f0f0f0",
                        paddingBottom: 8,
                      }}
                    >
                      <Text strong>Shared Sequences in Sensitive Patterns</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Ranked by frequency across patterns
                      </Text>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "16px",
                        maxHeight: "200px",
                        overflowY: "auto",
                        padding: "4px",
                      }}
                    >
                      {sharedSensitiveSequences.map(({ taxa, count }) => (
                        <Badge
                          key={taxa}
                          count={count}
                          size="small"
                          color="blue"
                          offset={[2, 2]}
                        >
                          <Tag
                            color="geekblue"
                            variant="filled"
                            style={{ marginRight: 0 }}
                          >
                            <a
                              href={`https://www.ncbi.nlm.nih.gov/nuccore/${taxa}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button
                                icon={<ExportOutlined />}
                                size="small"
                                type="link"
                                style={{ fontSize: 10 }}
                              >
                                {taxa}
                              </Button>
                            </a>
                          </Tag>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              >
                {/* Gatilho do Dropdown */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "4px 8px",
                    backgroundColor: "#108FE938",
                    border: "1px solid #0B7DCF34",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  <Space>
                    <InfoCircleOutlined style={{ color: "#126BCA" }} />
                    <Text style={{ color: "#126BCA" }}>
                      View Shared Sequences ({sharedSensitiveSequences.length})
                    </Text>
                  </Space>
                </div>
              </Dropdown>
            </div>
          )}

          <TableExporter
            columns={patternColumns}
            dataSource={method_sensitive_signatures}
            filename="MethodSensitiveSignatures.csv"
          />
          <Table
            columns={patternColumns}
            dataSource={method_sensitive_signatures.map((item, index) => ({
              ...item,
              key: index,
            }))}
            expandable={{ expandedRowRender }}
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </Panel>
      </Collapse>

      <Collapse style={{ marginBottom: 24 }}>
        <Panel
          header={`Topologically Robust Clades (Support ≥ ${(robustThreshold * 100).toFixed(0)}%)`}
          key="2"
        >
          {sharedRobustSequences.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Dropdown
                placement="topLeft"
                trigger={["hover"]}
                popupRender={() => (
                  <div
                    style={{
                      backgroundColor: "#fff",
                      padding: "8px",
                      borderRadius: "8px",
                      boxShadow:
                        "0 6px 16px 0 rgba(0,0,0,0.08), 0 3px 6px -4px rgba(0,0,0,0.12)",
                      border: "1px solid #0B7DCF34",
                      width: "600px",
                    }}
                  >
                    <div
                      style={{
                        marginBottom: 12,
                        borderBottom: "1px solid #f0f0f0",
                        paddingBottom: 8,
                      }}
                    >
                      <Text strong>Shared Sequences in Sensitive Patterns</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Ranked by frequency across patterns
                      </Text>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "16px",
                        maxHeight: "200px",
                        overflowY: "auto",
                        padding: "4px",
                      }}
                    >
                      {sharedRobustSequences.map(({ taxa, count }) => (
                        <Badge
                          key={taxa}
                          count={count}
                          size="small"
                          color="green"
                          offset={[2, 2]}
                        >
                          <Tag
                            color="green"
                            variant="filled"
                            style={{ marginRight: 0 }}
                          >
                            <a
                              href={`https://www.ncbi.nlm.nih.gov/nuccore/${taxa}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button
                                icon={<ExportOutlined />}
                                size="small"
                                type="link"
                                style={{ fontSize: 10 }}
                              >
                                {taxa}
                              </Button>
                            </a>
                          </Tag>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              >
                {/* Gatilho do Dropdown */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "4px 8px",
                    backgroundColor: "#10E96A38",
                    border: "1px solid #0ED46156",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  <Space>
                    <InfoCircleOutlined style={{ color: "#457A10" }} />
                    <Text style={{ color: "#457A10" }}>
                      View Shared Sequences ({sharedSensitiveSequences.length})
                    </Text>
                  </Space>
                </div>
              </Dropdown>
            </div>
          )}
          <TableExporter
            columns={patternColumns}
            dataSource={topologically_robust}
            filename="TopologicallyRobustSignatures.csv"
          />
          <Table
            columns={patternColumns}
            dataSource={topologically_robust.map((item, index) => ({
              ...item,
              key: index,
            }))}
            expandable={{ expandedRowRender }}
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </Panel>
      </Collapse>

      <Card title="Coverage per Tree" style={{ marginBottom: 8 }}>
        <Alert
          message="Methodological Performance Analysis"
          description={
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li>
                <b>Pattern Count:</b> The total number of clades (patterns)
                identified in this specific tree.
                {/* A highly discrepant number may
                indicate that the algorithm forces unrealistic groupings or,
                conversely, fails to properly resolve the topology. */}
              </li>
              <li>
                <b>Average Support:</b> Indicates the overall reliability of
                this tree's topology.
                {/* Higher values mean that the clades
                produced by this method are strongly supported by the other
                trees in the project. */}
              </li>
              <li>
                <b>Size Range:</b> Shows the range of recovered clade sizes.
                {/* It
                helps determine whether the method performs better at resolving
                small, recent groups (smaller sizes) or only major ancestral
                divisions (larger sizes). */}
              </li>
            </ul>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
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
