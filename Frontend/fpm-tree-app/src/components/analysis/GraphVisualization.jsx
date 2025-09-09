import { useEffect, useRef, useState } from "react";
import { Network } from "vis-network";
import { DataSet } from "vis-data";
import {
  Card,
  Button,
  Tag,
  Input,
  Form,
  Modal,
  Spin,
  Row,
  Col,
  Typography,
  Empty,
  Divider,
  Space,
  Popover,
  notification,
  Select,
} from "antd";
import {
  InfoCircleOutlined,
  PlayCircleOutlined,
  SettingOutlined,
  DatabaseOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ReadOutlined,
  FullscreenOutlined,
} from "@ant-design/icons";
import QueryResultTable from "./QueryResultTable";
import JsonViewer from "./JsonViewer";
import PhylogeneticQueriesDocumentation from "../../pages/docs/PhylogeneticQueriesDocumentation";

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const GraphVisualization = () => {
  const networkRef = useRef(null);
  const networkInstance = useRef(null);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [queryResults, setQueryResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(false);
  const [customQuery, setCustomQuery] = useState("");
  const [predefinedQueries, setPredefinedQueries] = useState({});
  const [selectedNode, setSelectedNode] = useState(null);
  const [viewMode, setViewMode] = useState("initial");

  const [connectionDetails, setConnectionDetails] = useState({
    connected: false,
    uri: "Loading...",
    username: "Loading...",
  });
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
  const [form] = Form.useForm();

  const [isModalVisible, setIsModalVisible] = useState(false);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const networkOptions = {
    nodes: {
      shape: "dot",
      size: 20,
      font: {
        size: 14,
        color: "#333333",
      },
      borderWidth: 2,
      shadow: true,
      color: {
        border: "#2B7CE9",
        background: "#97C2FC",
        highlight: {
          border: "#2B7CE9",
          background: "#D2E5FF",
        },
      },
    },
    edges: {
      width: 2,
      color: { color: "#848484" },
      shadow: true,
      smooth: {
        type: "continuous",
      },
      arrows: {
        to: { enabled: true, scaleFactor: 1, type: "arrow" },
      },
      font: {
        size: 12,
        align: "middle",
      },
    },
    physics: {
      enabled: true,
      stabilization: { iterations: 100 },
      barnesHut: {
        gravitationalConstant: -2000,
        centralGravity: 0.3,
        springLength: 95,
        springConstant: 0.04,
        damping: 0.09,
      },
    },
    interaction: {
      hover: true,
      tooltipDelay: 200,
      hideEdgesOnDrag: false,
      hideNodesOnDrag: false,
    },
    layout: {
      improvedLayout: true,
    },
  };

  useEffect(() => {
    const API_URL = "http://localhost:8000/api/neo4j";

    const checkConnection = async () => {
      try {
        checkConnectionStatus();
        const response = await fetch(`${API_URL}/status`);
        const data = await response.json();
        setConnectionStatus(data.connected);
      } catch (error) {
        console.error("Erro ao verificar status:", error);
        setConnectionStatus(false);
      }
    };

    const checkConnectionStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/status`);
        const data = await response.json();
        setConnectionDetails(data);
      } catch (error) {
        console.error("Erro ao verificar status:", error);
        setConnectionDetails({
          connected: false,
          uri: "Não foi possível obter",
          username: "Não foi possível obter",
        });
      }
    };

    const loadPredefinedQueries = async () => {
      try {
        const response = await fetch(`${API_URL}/predefined-queries`);
        if (!response.ok)
          throw new Error("Falha ao buscar consultas predefinidas");
        const data = await response.json();
        if (data.success) {
          setPredefinedQueries(data.queries);
        }
      } catch (error) {
        console.error(error);
      }
    };

    checkConnection();
    loadPredefinedQueries();

    return () => {
      if (networkInstance.current) {
        networkInstance.current.destroy();
        networkInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
      if (networkInstance.current) {
        networkInstance.current.destroy();
        networkInstance.current = null;
      }
      return;
    }

    if (networkRef.current) {
      if (networkInstance.current) {
        networkInstance.current.destroy();
        networkInstance.current = null;
      }

      const nodes = new DataSet(
        graphData.nodes.map((node) => {
          let label = node.label;
          let titleContent = `<b>${node.label}</b>`;

          if (node.properties && node.properties.name) {
            label = node.properties.name;
          }

          if (
            node.label === "Metadata" &&
            node.properties &&
            node.properties.value
          ) {
            try {
              const metadata = JSON.parse(node.properties.value);
              label = metadata.name || metadata.id || "Metadata";
              titleContent += `<br><b>ID:</b> ${metadata.id || "N/A"}`;
              titleContent += `<br><b>Organism:</b> ${
                metadata.metadata?.annotations?.organism || "N/A"
              }`;
            } catch (e) {
              label = "Metadata";
              titleContent += `<br><b>Value:</b> [JSON muito grande]`;
            }
          }

          if (node.properties) {
            const simpleProps = Object.entries(node.properties)
              .filter(
                ([key, value]) =>
                  key !== "value" &&
                  typeof value === "string" &&
                  value.length < 50
              )
              .map(([key, value]) => `<b>${key}:</b> ${value}`)
              .join("<br>");

            if (simpleProps) {
              titleContent += `<br>${simpleProps}`;
            }
          }

          return {
            id: node.id,
            label: label.length > 30 ? label.substring(0, 30) + "..." : label,
            title: titleContent,
            properties: node.properties,
            originalLabel: node.label,
          };
        })
      );

      const edges = new DataSet(
        graphData.edges.map((edge) => ({
          id: edge.id,
          from: edge.from,
          to: edge.to,
          label: edge.label,
          title: `<b>${edge.label}</b> relationship`,
        }))
      );

      networkInstance.current = new Network(
        networkRef.current,
        { nodes, edges },
        networkOptions
      );

      if (!networkInstance.current) {
        networkInstance.current = new Network(
          networkRef.current,
          { nodes, edges },
          networkOptions
        );

        networkInstance.current.on("click", (params) => {
          if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const nodeData = graphData.nodes.find((n) => n.id === nodeId);
            setSelectedNode(nodeData);
          } else {
            setSelectedNode(null);
          }
        });
      }

      setTimeout(() => {
        if (networkInstance.current) {
          networkInstance.current.fit();
        }
      }, 100);
    }

    return () => {
      if (networkInstance.current) {
        networkInstance.current.destroy();
        networkInstance.current = null;
      }
    };
  }, [graphData]);

  const handleConnectionUpdate = async (values) => {
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/neo4j/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Falha ao conectar");
      }

      const data = await response.json();
      notification.success({ message: data.message });
      setIsConfigModalVisible(false);
      checkConnectionStatus();
    } catch (error) {
      notification.error({
        message: "Erro de Conexão",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const executeQuery = async (query, isGraphQuery = false) => {
    if (!query.trim()) return;
    setIsLoading(true);
    setQueryResults(null);
    setSelectedNode(null);
    if (isGraphQuery) setGraphData({ nodes: [], edges: [] });

    setViewMode(isGraphQuery ? "graph" : "table");

    try {
      const endpoint = isGraphQuery ? "/api/neo4j/graph" : "/api/neo4j/query";
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) throw new Error(`Erro na API: ${response.statusText}`);
      const data = await response.json();
      if (data.success) {
        if (isGraphQuery) {
          setGraphData(data.data || { nodes: [], edges: [] });
        } else {
          setQueryResults(data.results);
        }
      } else {
        throw new Error(data.detail || "A resposta da API indicou um erro.");
      }
    } catch (error) {
      Modal.error({
        title: "Erro ao Executar Consulta",
        content: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fitNetwork = () => networkInstance.current?.fit();
  const zoomIn = () =>
    networkInstance.current?.moveTo({
      scale: networkInstance.current.getScale() * 1.2,
    });
  const zoomOut = () =>
    networkInstance.current?.moveTo({
      scale: networkInstance.current.getScale() * 0.8,
    });

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card
            title="Graph Control Panel"
            style={{ marginBottom: 16 }}
            extra={
              <Button
                type="primary"
                icon={<ReadOutlined />}
                onClick={showModal}
              >
                Reference Guide
              </Button>
            }
          >
            <Paragraph>
              Status:{" "}
              <Tag
                icon={<DatabaseOutlined />}
                color={connectionStatus ? "success" : "error"}
              >
                {connectionStatus ? "Connected" : "Desconnected"}
              </Tag>
              <Popover
                content={
                  <div>
                    <p>
                      <strong>URI:</strong> {connectionDetails.uri}
                    </p>
                    <p>
                      <strong>User:</strong> {connectionDetails.username}
                    </p>
                  </div>
                }
                title="Connection Details"
              >
                <Button
                  shape="circle"
                  icon={<InfoCircleOutlined />}
                  size="small"
                  style={{ marginLeft: 8 }}
                />
              </Popover>
              <Button
                shape="circle"
                icon={<SettingOutlined />}
                size="small"
                style={{ marginLeft: 4 }}
                onClick={() => setIsConfigModalVisible(true)}
              />
            </Paragraph>

            <Divider />
            <Paragraph strong>Custom Query</Paragraph>
            <TextArea
              rows={5}
              placeholder="MATCH (n) RETURN n LIMIT 25"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
            />
            <Space style={{ marginTop: 16 }}>
              <Button
                type="primary"
                icon={isLoading ? <Spin /> : <PlayCircleOutlined />}
                onClick={() => executeQuery(customQuery, true)}
                disabled={isLoading || !customQuery.trim()}
              >
                View Graph
              </Button>
              <Button
                icon={isLoading ? <Spin /> : <PlayCircleOutlined />}
                onClick={() => executeQuery(customQuery, false)}
                disabled={isLoading || !customQuery.trim()}
              >
                View Results (Table)
              </Button>
            </Space>
          </Card>

          <Card title="Predefined Queries" style={{ heigh: "100%" }}>
            <div
              style={{
                minHeight: "300px",
                overflowY: "auto",
                paddingRight: "10px",
              }}
            >
              <Space direction="vertical" style={{ width: "100%" }}>
                {Object.entries(predefinedQueries).map(([key, query]) => (
                  <Card
                    key={key}
                    size="small"
                    hoverable
                    onClick={() => {
                      executeQuery(
                        query.query,
                        query.type === "graph" ? true : false
                      );
                      setCustomQuery(query.query);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <Typography.Text strong>{query.name}</Typography.Text>
                    <Typography.Paragraph
                      type="secondary"
                      style={{ marginBottom: 0, marginTop: 4 }}
                    >
                      {query.description}
                    </Typography.Paragraph>
                  </Card>
                ))}
              </Space>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          {viewMode === "initial" && (
            <Card style={{ height: "725px" }}>
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Empty description="Run a query to view the graph or table" />
              </div>
            </Card>
          )}

          {isLoading && (
            <Card style={{ height: "725px" }}>
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Spin size="large" />
              </div>
            </Card>
          )}

          {!isLoading && viewMode === "graph" && (
            <Card
              title="Graph Viewer"
              extra={
                <Space>
                  <Space>
                    <InfoCircleOutlined />
                    <Text type="warning" style={{ marginRight: 24 }}>
                      Select a node for more information
                    </Text>
                  </Space>
                  <Text>
                    {(graphData.nodes || []).length} Nodes,{" "}
                    {(graphData.edges || []).length} Edges
                  </Text>
                  <Button
                    icon={<ZoomInOutlined />}
                    onClick={zoomIn}
                    disabled={!graphData.nodes || graphData.nodes.length === 0}
                  />
                  <Button
                    icon={<ZoomOutOutlined />}
                    onClick={zoomOut}
                    disabled={!graphData.nodes || graphData.nodes.length === 0}
                  />
                  <Button
                    icon={<FullscreenOutlined />}
                    onClick={fitNetwork}
                    disabled={!graphData.nodes || graphData.nodes.length === 0}
                  />
                </Space>
              }
              style={{ height: "100%" }}
            >
              <div style={{ height: "410px", width: "100%" }}>
                <div
                  ref={networkRef}
                  style={{ height: "100%", width: "100%" }}
                />
              </div>
              {selectedNode && (
                <Card title="Selected Node" style={{ marginTop: 16 }}>
                  <Paragraph>
                    <strong>Type:</strong> <Tag>{selectedNode.label}</Tag>
                  </Paragraph>
                  <Paragraph>
                    <strong>ID:</strong> {selectedNode.id}
                  </Paragraph>
                  {selectedNode.properties && selectedNode.properties.name && (
                    <Paragraph>
                      <strong>Name:</strong> {selectedNode.properties.name}
                    </Paragraph>
                  )}
                  <Paragraph strong>Properties:</Paragraph>
                  <JsonViewer
                    data={selectedNode.properties}
                    style={{ maxHeight: "300px", overflow: "auto" }}
                  />
                </Card>
              )}
            </Card>
          )}

          {!isLoading && viewMode === "table" && (
            <Card title="Query Results" style={{ height: "100%" }}>
              {queryResults && queryResults.length > 0 ? (
                <QueryResultTable results={queryResults} />
              ) : (
                <Empty description="The query returned no results." />
              )}
            </Card>
          )}
        </Col>
      </Row>
      <Modal
        title="Cypher Queries Documentation"
        visible={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width="90%"
        style={{ top: 20 }}
      >
        <PhylogeneticQueriesDocumentation />
      </Modal>

      <Modal
        title="Settings of Neo4j connection"
        open={isConfigModalVisible}
        onCancel={() => setIsConfigModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleConnectionUpdate}
          initialValues={{
            uri: connectionDetails.uri,
            username: connectionDetails.username,
          }}
        >
          <Form.Item
            name="uri"
            label="URI of connection"
            rules={[{ required: true, message: "Por favor, insira o URI" }]}
          >
            <Input placeholder="neo4j+s://exemplo.databases.neo4j.io" />
          </Form.Item>
          <Form.Item
            name="username"
            label="User"
            rules={[{ required: true, message: "Please enter username" }]}
          >
            <Input placeholder="neo4j" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Please enter password" }]}
          >
            <Input.Password placeholder="Password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={isLoading} block>
              Connect
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default GraphVisualization;
