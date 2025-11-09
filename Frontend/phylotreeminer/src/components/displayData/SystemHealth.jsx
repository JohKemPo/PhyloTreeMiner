import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Progress,
  Alert,
  Button,
  Space,
  Typography,
  Spin,
  Divider,
  List,
  Badge,
  Flex,
} from "antd";
import {
  DashboardOutlined,
  ProjectOutlined,
  FileTextOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const SystemHealth = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const API_BASE_URL = "http://localhost:8000";

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/system/health`);
      if (!response.ok) {
        throw new Error("Falha ao carregar dados de saúde do sistema");
      }
      const data = await response.json();
      setHealthData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();

    const interval = setInterval(fetchHealthData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "running":
        return "blue";
      case "completed":
        return "green";
      case "failed":
        return "red";
      case "idle":
        return "default";
      default:
        return "gray";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "running":
        return <SyncOutlined spin />;
      case "completed":
        return <CheckCircleOutlined />;
      case "failed":
        return <CloseCircleOutlined />;
      case "idle":
        return <ClockCircleOutlined />;
      default:
        return <ExclamationCircleOutlined />;
    }
  };

  const columns = [
    {
      title: "Projeto",
      dataIndex: "name",
      key: "name",
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Status",
      dataIndex: "process_running",
      key: "status",
      render: (running, record) => (
        <Tag
          color={getStatusColor(running ? "running" : record.status)}
          icon={getStatusIcon(running ? "running" : record.status)}
        >
          {running ? "Executando" : record.status}
        </Tag>
      ),
    },
    {
      title: "Logs",
      dataIndex: "log_files",
      key: "logs",
      render: (files) => (
        <Text type="secondary">{files?.length || 0} arquivo(s)</Text>
      ),
    },
    {
      title: "Última Modificação",
      dataIndex: "log_modified",
      key: "modified",
      render: (date) => (date ? new Date(date).toLocaleString() : "N/A"),
    },
    {
      title: "Ações",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<FileTextOutlined />}
            disabled={!record.has_outputs}
          >
            Ver Logs
          </Button>
        </Space>
      ),
    },
  ];

  if (loading && !healthData) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Carregando status do sistema...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Erro"
        description={error}
        type="error"
        action={
          <Button size="small" onClick={fetchHealthData}>
            Tentar Novamente
          </Button>
        }
      />
    );
  }

  const tableData = healthData
    ? Object.entries(healthData.projects_status || {}).map(
        ([name, status]) => ({
          key: name,
          name,
          ...status,
        })
      )
    : [];

  const runningCount = tableData.filter((item) => item.process_running).length;
  const completedCount = tableData.filter(
    (item) => item.status === "completed"
  ).length;
  const failedCount = tableData.filter(
    (item) => item.status === "failed"
  ).length;
  const idleCount = tableData.filter((item) => item.status === "idle").length;

  return (
    <div style={{ padding: "24px" }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Flex horizontal justify="space-between">
            <Title level={2}>
              <DashboardOutlined /> Saúde do Sistema (Alpha)
            </Title>
            <Flex vertical>
              <Button
                icon={<SyncOutlined />}
                onClick={fetchHealthData}
                loading={loading}
                style={{ width: "260px", marginBottom: "8px" }}
              >
                Atualizar
              </Button>
              <Text type="secondary">
                Última atualização:{" "}
                {healthData?.timestamp
                  ? new Date(healthData.timestamp).toLocaleString()
                  : "N/A"}
              </Text>
            </Flex>
          </Flex>
        </Col>

        <Col span={6}>
          <Card>
            <Statistic
              title="Projetos em Execução"
              value={runningCount}
              valueStyle={{ color: "#1890ff" }}
              prefix={<SyncOutlined spin />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Projetos Concluídos"
              value={completedCount}
              valueStyle={{ color: "#52c41a" }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Projetos com Falha"
              value={failedCount}
              valueStyle={{ color: "#ff4d4f" }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Projetos Inativos"
              value={idleCount}
              valueStyle={{ color: "#d9d9d9" }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>

        {runningCount > 0 && (
          <Col span={24}>
            <Card
              title={
                <Space>
                  <SyncOutlined spin />
                  <span>Workflows em Execução</span>
                  <Badge count={runningCount} showZero={false} />
                </Space>
              }
              type="inner"
            >
              <List
                dataSource={tableData.filter((item) => item.process_running)}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <SyncOutlined spin style={{ color: "#1890ff" }} />
                      }
                      title={item.name}
                      description={
                        <Space direction="vertical" size="small">
                          <Text>PID: {item.pid || "N/A"}</Text>
                          <Text type="secondary">
                            Logs: {item.log_files?.length || 0} arquivo(s)
                          </Text>
                        </Space>
                      }
                    />
                    
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        )}

        <Col span={24}>
          <Card
            title={
              <Space>
                <ProjectOutlined />
                <span>Todos os Projetos</span>
                <Badge count={tableData.length} showZero />
              </Space>
            }
          >
            <Table
              columns={columns}
              dataSource={tableData}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 800 }}
              expandable={{
                expandedRowRender: (record) => (
                  <div style={{ margin: 0 }}>
                    <Text strong>Detalhes:</Text>
                    <Divider style={{ margin: "8px 0" }} />
                    <Space direction="vertical">
                      <Text>Existe: {record.exists ? "Sim" : "Não"}</Text>
                      <Text>
                        Tem outputs: {record.has_outputs ? "Sim" : "Não"}
                      </Text>
                      <Text>
                        Processo ativo: {record.process_running ? "Sim" : "Não"}
                      </Text>
                      {record.latest_log && (
                        <Text>Log principal: {record.latest_log}</Text>
                      )}
                      {record.log_size && (
                        <Text>
                          Tamanho do log: {(record.log_size / 1024).toFixed(2)}{" "}
                          KB
                        </Text>
                      )}
                    </Space>
                  </div>
                ),
                rowExpandable: (record) => record.has_outputs,
              }}
            />
          </Card>
        </Col>

        <Col span={24}>
          <Card title="Informações do Sistema">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="Workflows Ativos"
                  value={healthData?.running_workflows?.length || 0}
                  prefix={<SyncOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Total de Projetos"
                  value={tableData.length}
                  prefix={<ProjectOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Tempo do Servidor"
                  value={
                    healthData?.timestamp
                      ? new Date(healthData.timestamp).toLocaleTimeString()
                      : "N/A"
                  }
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SystemHealth;
