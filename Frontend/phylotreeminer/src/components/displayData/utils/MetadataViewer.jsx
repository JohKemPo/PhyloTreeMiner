import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  Table,
  Tag,
  Typography,
  Descriptions,
  List,
  Input,
  Empty,
  Divider,
  Space,
} from "antd";
import {
  SearchOutlined,
  ClusterOutlined,
  ExportOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const MetadataViewer = ({ data }) => {
  const [selectedNodeKey, setSelectedNodeKey] = useState(null);
  const [searchText, setSearchText] = useState("");

  const normalizedData =
    Array.isArray(data) && Array.isArray(data[0])
      ? data[0]
      : Array.isArray(data)
        ? data
        : [data];

  const { datasetName, innerNodes, nodeKeys } = useMemo(() => {
    if (!normalizedData || normalizedData.length === 0 || !normalizedData[0]) {
      return { datasetName: null, innerNodes: {}, nodeKeys: [] };
    }

    const datasetObj = normalizedData[0];
    const entries = Object.entries(datasetObj);

    if (entries.length === 0) {
      return { datasetName: null, innerNodes: {}, nodeKeys: [] };
    }

    const [key, value] = entries[0];
    return {
      datasetName: key,
      innerNodes: value || {},
      nodeKeys: Object.keys(value || {}),
    };
  }, [normalizedData]);

  const filteredNodes = useMemo(() => {
    if (!searchText) return nodeKeys;
    return nodeKeys.filter((key) =>
      key.toLowerCase().includes(searchText.toLowerCase()),
    );
  }, [nodeKeys, searchText]);

  useEffect(() => {
    if (
      filteredNodes.length > 0 &&
      (!selectedNodeKey || !filteredNodes.includes(selectedNodeKey))
    ) {
      setSelectedNodeKey(filteredNodes[0]);
    }
  }, [filteredNodes, selectedNodeKey]);

  if (!datasetName) {
    return (
      <Empty description="Nenhum metadado disponível para visualização." />
    );
  }

  const selectedNodeData = selectedNodeKey ? innerNodes[selectedNodeKey] : null;
  const terminals = selectedNodeData?.data_terminals || [];
  const accessionFilters = useMemo(() => {
    if (!terminals) return [];
    const accessions = new Set(
      terminals.map((s) => s.metadata?.id || s.newick).filter(Boolean),
    );
    return Array.from(accessions)
      .sort()
      .map((id) => ({ text: id, value: id }));
  }, [terminals]);

  const dateFilters = useMemo(() => {
    if (!terminals) return [];
    const dates = new Set(
      terminals.map((s) => s.metadata?.annotations?.date).filter(Boolean),
    );
    return Array.from(dates)
      .sort()
      .map((d) => ({ text: d, value: d }));
  }, [terminals]);

  const organismFilters = useMemo(() => {
    if (!terminals) return [];
    const organisms = new Set(
      terminals.map((s) => s.metadata?.annotations?.organism).filter(Boolean),
    );
    return Array.from(organisms)
      .sort()
      .map((o) => ({ text: o, value: o }));
  }, [terminals]);

  const moleculeFilters = useMemo(() => {
    if (!terminals) return [];
    const molecules = new Set(
      terminals.map((s) => s.metadata?.annotations?.molecule_type).filter(Boolean),
    );
    return Array.from(molecules)
      .sort()
      .map((m) => ({ text: m, value: m }));
  }, [terminals]);

  const terminalColumns = [
    {
      title: "Accession Id",
      key: "id",
      filters: accessionFilters,
      filterSearch: true,
      onFilter: (value, record) => {
        const id = record.metadata?.id || record.newick;
        return id === value;
      },
      render: (_, record) => (
        <Tag color="blue">{record.metadata?.id || record.newick || "N/A"}</Tag>
      ),
      sorter: (a, b) => {
        const idA = a.metadata?.id || a.newick || "";
        const idB = b.metadata?.id || b.newick || "";
        return idA.localeCompare(idB);
      },
    },
    {
      title: "Organism",
      key: "organism",
      filters: organismFilters,
      filterSearch: true,
      onFilter: (value, record) => record.metadata?.annotations?.organism === value,
      render: (_, record) => record.metadata?.annotations?.organism || "N/A",
      sorter: (a, b) => {
        const orgA = a.metadata?.annotations?.organism || "";
        const orgB = b.metadata?.annotations?.organism || "";
        return orgA.localeCompare(orgB);
      },
    },
    {
      title: "Molecule Type",
      key: "molecule_type",
      filters: moleculeFilters,
      onFilter: (value, record) => record.metadata?.annotations?.molecule_type === value,
      render: (_, record) => record.metadata?.annotations?.molecule_type || "N/A",
      sorter: (a, b) => {
        const molA = a.metadata?.annotations?.molecule_type || "";
        const molB = b.metadata?.annotations?.molecule_type || "";
        return molA.localeCompare(molB);
      },
    },
    {
      title: "Collection Date",
      key: "date",
      filters: dateFilters,
      filterSearch: true,
      onFilter: (value, record) => record.metadata?.annotations?.date === value,
      render: (_, record) => record.metadata?.annotations?.date || "N/A",
      sorter: (a, b) => {
        const dateA = a.metadata?.annotations?.date || "";
        const dateB = b.metadata?.annotations?.date || "";
        return dateA.localeCompare(dateB);
      },
    },
    // {
    //   title: "Hash do Terminal",
    //   dataIndex: "terminal_hash",
    //   key: "terminal_hash",
    //   ellipsis: true,
    // },
    {
      title: "NCBI Link",
      key: "link",
      align: "center",
      render: (_, record) => {
        const accession_id = record.metadata?.id || record.newick;
        if (!accession_id || accession_id === "Unknown") return "-";

        return (
          <a
            href={`https://www.ncbi.nlm.nih.gov/nuccore/${accession_id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button icon={<ExportOutlined />} size="small" type="link">
              More info
            </Button>
          </a>
        );
      },
    },
  ];

  const renderTerminalDetails = (record) => {
    const annotations = record.metadata?.annotations || {};
    const taxonomy = annotations.taxonomy
      ? annotations.taxonomy.join(" > ")
      : "N/A";
    const references = annotations.references || [];

    return (
      <Descriptions
        title="Resume Info"
        size="small"
        bordered
        column={1}
        style={{ backgroundColor: "#fafafa", padding: "16px" }}
      >
        <Descriptions.Item label="Description">
          {record.metadata?.description || "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Taxonomy">{taxonomy}</Descriptions.Item>
        <Descriptions.Item label="Topology">
          {annotations.topology || "N/A"}
        </Descriptions.Item>
        {references.length > 0 && (
          <Descriptions.Item label="Reference">
            <Text strong>{references[0].title}</Text> <br />
            <Text type="secondary">{references[0].journal}</Text>
          </Descriptions.Item>
        )}
      </Descriptions>
    );
  };

  return (
    <div style={{ padding: "8px", width: " 95%" }}>
      <div style={{ marginBottom: "24px" }}>
        <Title level={4} style={{ margin: 0 }}>
          {datasetName}
        </Title>
        <Text type="secondary">
          Subtree and Terminal Explorer ({nodeKeys.length} internal nodes found)
        </Text>
      </div>

      <Row gutter={24}>
        <Col span={8}>
          <Card
            style={{
              padding: 0,
              height: "50vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ padding: "16px", borderBottom: "1px solid #f0f0f0" }}>
              <Input
                placeholder="Search"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </div>
            <div style={{ flex: 1, overflow: "auto", maxHeight: 420 }}>
              <List
                size="small"
                dataSource={filteredNodes}
                renderItem={(item) => (
                  <List.Item
                    onClick={() => setSelectedNodeKey(item)}
                    style={{
                      cursor: "pointer",
                      padding: "12px 24px",
                      backgroundColor:
                        selectedNodeKey === item ? "#e6f4ff" : "transparent",
                      borderRight:
                        selectedNodeKey === item
                          ? "3px solid #1677ff"
                          : "3px solid transparent",
                      transition: "all 0.2s",
                    }}
                  >
                    <Space>
                      <ClusterOutlined
                        style={{
                          color:
                            selectedNodeKey === item ? "#1677ff" : "#8c8c8c",
                        }}
                      />
                      <Text strong={selectedNodeKey === item}>{item}</Text>
                    </Space>
                  </List.Item>
                )}
                locale={{ emptyText: "No nodes found." }}
              />
            </div>
          </Card>
        </Col>

        <Col span={16}>
          {selectedNodeData ? (
            <Card style={{ height: "50vh", width: "100%", overflowY: "auto" }}>
              <Row
                align="middle"
                justify="space-between"
                style={{ marginBottom: "24px" }}
              >
                <Col>
                  <Title level={5} style={{ margin: 0 }}>
                    Subtree Details:{" "}
                    <Text type="secondary">{selectedNodeKey}</Text>
                  </Title>
                </Col>
                <Col>
                  <Space>
                    <Text type="secondary">Supports:</Text>
                    {selectedNodeData.supports &&
                    selectedNodeData.supports.length > 0 ? (
                      selectedNodeData.supports.map((sup, i) => (
                        <Tag key={i} color="blue" style={{ margin: 0 }}>
                          {sup}
                        </Tag>
                      ))
                    ) : (
                      <Text disabled>N/A</Text>
                    )}
                  </Space>
                </Col>
              </Row>

              <Divider orientation="left" plain>
                Information
              </Divider>

              <Table
                dataSource={selectedNodeData.data_terminals || []}
                columns={terminalColumns}
                rowKey={(record) => record.terminal_hash || record.newick}
                expandable={{
                  expandedRowRender: renderTerminalDetails,
                }}
                pagination={{ pageSize: 5, showSizeChanger: false }}
                size="small"
                bordered
              />
            </Card>
          ) : (
            <Card
              style={{
                height: "60vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Empty description="Select a subtreefrom the list to the side to view the details." />
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default MetadataViewer;
