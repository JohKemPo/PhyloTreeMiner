import React, { useState, useEffect, useMemo } from "react";
import { Layout, Spin, Alert, Table, Card, Button, Space, Tag } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import GeographicDistribution from "./GeographicDistribution";
import TemporalInsights from "./TemporalInsights";
import OWIDAnalysisDashboard from "./OWIDAnalysisDashboard";
import TableExporter from "../../../utils/TableExporter";

const { Content } = Layout;

const PhylogeneticInsights = ({
  projectName,
  owidMetadata,
  loading: parentLoading,
  error: parentError,
}) => {
  const [insightsData, setInsightsData] = useState(null);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState(null);
  const [sequences, setSequences] = useState([]);
  const [isSequencesLoading, setIsSequencesLoading] = useState(false);

  useEffect(() => {
    const fetchInsights = async () => {
      if (!projectName) return;

      setIsInsightsLoading(true);
      setInsightsError(null);

      try {
        const response = await fetch(
          `http://localhost:8000/api/tree/${projectName}/insights`,
        );
        if (!response.ok)
          throw new Error("Falha ao buscar insights do projeto.");

        const data = await response.json();
        setInsightsData(data);
      } catch (err) {
        console.error("Erro ao carregar insights:", err);
        setInsightsError(err.message);
      } finally {
        setIsInsightsLoading(false);
      }
    };

    fetchInsights();
  }, [projectName]);

  useEffect(() => {
    const fetchSequences = async () => {
      if (!projectName) return;

      setIsSequencesLoading(true);

      try {
        const idsResponse = await fetch(
          `http://localhost:8000/api/tree/${projectName}/search-nodes`,
        );
        if (!idsResponse.ok)
          throw new Error("Falha ao buscar IDs das sequências.");

        const nodeIds = await idsResponse.json();

        setSequences(nodeIds);
      } catch (err) {
        console.error("Erro na orquestração de sequências:", err);
      } finally {
        setIsSequencesLoading(false);
      }
    };

    fetchSequences();
  }, [projectName]);

  const metrics = insightsData?.metrics || {
    totalNodes: 0,
    uniqueLineages: 0,
    uniqueHosts: 0,
    timeSpan: "N/A",
  };

  // Processamento de dados de cruzamento com OWID
  const timelineData = useMemo(() => {
    const baseTimeline = insightsData?.timelineData || [];
    if (!owidMetadata || Object.keys(owidMetadata).length === 0)
      return baseTimeline;

    return baseTimeline.map((item) => {
      const owidInfo = owidMetadata[item.year] || {};
      return {
        ...item,
        total_cases: owidInfo.total_cases || 0,
        new_cases: owidInfo.new_cases || 0,
      };
    });
  }, [insightsData, owidMetadata]);

  const countryData = useMemo(() => {
    const baseCountry = insightsData?.countryData || [];
    if (!owidMetadata || Object.keys(owidMetadata).length === 0)
      return baseCountry;

    return baseCountry.map((item) => {
      const owidInfo =
        Object.values(owidMetadata).find(
          (owidItem) => owidItem.location === item.country,
        ) || {};

      return {
        ...item,
        population: owidInfo.population || null,
        total_cases: owidInfo.total_cases || null,
      };
    });
  }, [insightsData, owidMetadata]);

  const countryFilters = useMemo(() => {
    const countries = new Set(sequences.map((s) => s.country).filter(Boolean));
    return Array.from(countries)
      .sort()
      .map((c) => ({ text: c, value: c }));
  }, [sequences]);

  const dateFilters = useMemo(() => {
    const dates = new Set(sequences.map((s) => s.year).filter(Boolean));
    return Array.from(dates)
      .sort()
      .map((d) => ({ text: d, value: d }));
  }, [sequences]);

  const accessionFilters = useMemo(() => {
    const accessions = new Set(
      sequences.map((s) => s.accessionId).filter(Boolean),
    );
    return Array.from(accessions)
      .sort()
      .map((accessionId) => ({ text: accessionId, value: accessionId }));
  }, [sequences]);

  const columns = useMemo(
    () => [
      {
        title: "Accession ID",
        dataIndex: "accessionId",
        key: "accessionId",
        width: "250px",
        sorter: (a, b) =>
          (a.accessionId || "").localeCompare(b.accessionId || ""),
        filters: accessionFilters,
        filterSearch: true,
        onFilter: (value, record) => record.accessionId === value,
        render: (text) => <Tag color="blue">{text}</Tag>,
      },
      {
        title: "Collection Date",
        dataIndex: "year",
        key: "year",
        width: "250px",
        filters: dateFilters,
        filterSearch: true,
        onFilter: (value, record) => record.year === value,
        render: (text) => (text === "Unknown Date" ? "-" : text),
        sorter: (a, b) => (a.year || "").localeCompare(b.year || ""),
      },
      {
        title: "Country",
        dataIndex: "country",
        key: "country",
        width: "150px",
        filters: countryFilters,
        filterSearch: true,
        onFilter: (value, record) => record.geoLoc === value,
        render: (text) => (text === "Unknown" ? "-" : text),
        sorter: (a, b) => (a.geoLoc || "").localeCompare(b.geoLoc || ""),
      },
      {
        title: "Host",
        dataIndex: "host",
        key: "host",
        width: "150px",
        render: (text) => (text === "Unknown" ? "-" : text),
      },
      {
        title: "Lineage",
        dataIndex: "lineage",
        key: "lineage",
        width: "150px",
        render: (text) => (text === "Unknown" ? "-" : text),
      },
      {
        title: "NCBI Link",
        key: "link",
        align: "center",
        width: "250px",
        render: (_, record) => {
          const accession_id =
            record.accessionId && record.accessionId !== "Unknown"
              ? record.accessionId.split(".")[0]
              : "";
          if (!accession_id) return "-";

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
    ],
    [accessionFilters, dateFilters, countryFilters],
  );

  const isLoading = parentLoading || isInsightsLoading || isSequencesLoading;
  const error = parentError || insightsError;

  if (isLoading) {
    return (
      <Layout style={{ padding: "24px", background: "#fff" }}>
        <Content
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 400,
          }}
        >
          <Spin size="large" tip="Loading phylogenetic insights..." />
        </Content>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout style={{ padding: "24px", background: "#fff" }}>
        <Content>
          <Alert
            message="Error Loading Insights"
            description={error}
            type="error"
            showIcon
          />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ padding: "24px", background: "#fff" }}>
      <Content>
        {/* Cards de Métricas */}
        {/* <Space size="middle" style={{ marginBottom: 24, width: "100%", flexWrap: "wrap" }}>
          <Card size="small" style={{ flex: 1, minWidth: 150 }}>
            <Statistic title="Total Nodes" value={metrics.totalNodes} />
          </Card>
          <Card size="small" style={{ flex: 1, minWidth: 150 }}>
            <Statistic title="Unique Lineages" value={metrics.uniqueLineages} />
          </Card>
          <Card size="small" style={{ flex: 1, minWidth: 150 }}>
            <Statistic title="Unique Hosts" value={metrics.uniqueHosts} />
          </Card>
          <Card size="small" style={{ flex: 1, minWidth: 150 }}>
            <Statistic title="Time Span" value={metrics.timeSpan} />
          </Card>
        </Space> */}

        <Card
          title={
            <Space>
              <span>Sequences Dataset</span>
              <Tag color="green">{sequences.length} sequences</Tag>
            </Space>
          }
          style={{ marginBottom: 24 }}
        >
          <TableExporter
            columns={columns}
            dataSource={sequences}
            filename="PhylogeneticInsights.csv"
          />
          <Table
            columns={columns}
            dataSource={sequences.map((seq, index) => ({
              ...seq,
              key: seq.id || index,
            }))}
            pagination={{
              showSizeChanger: true,
              showTotal: (total) => `${total} itens`,
            }}
            size="small"
            scroll={{ x: "max-content" }}
          />
        </Card>

        <GeographicDistribution
          sequences={sequences}
          countryData={countryData}
        />

        <TemporalInsights sequences={sequences} timelineData={timelineData} />

        {owidMetadata && Object.keys(owidMetadata).length > 0 && (
          <OWIDAnalysisDashboard analysisData={owidMetadata} />
        )}
      </Content>
    </Layout>
  );
};

const Statistic = ({ title, value }) => (
  <div>
    <div style={{ fontSize: 14, color: "#8c8c8c" }}>{title}</div>
    <div style={{ fontSize: 24, fontWeight: "bold" }}>{value}</div>
  </div>
);

export default PhylogeneticInsights;
