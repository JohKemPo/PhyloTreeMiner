import React, { useMemo, useState, useEffect } from "react";
import { Layout, Spin, Alert, Table, Card, Button } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import GeographicDistribution from "./GeographicDistribution";
import TemporalInsights from "./TemporalInsights";
import OWIDAnalysisDashboard from "./OWIDAnalysisDashboard";

const { Content } = Layout;

const parseStrainFallback = (strainValue) => {
  if (!strainValue) return { geoFallback: null, dateFallback: null };

  // Garante que é uma string (trata caso venha como ["Brazil 1966..."])
  const strainStr = Array.isArray(strainValue) ? strainValue[0] : strainValue;
  if (typeof strainStr !== "string")
    return { geoFallback: null, dateFallback: null };

  let geoFallback = null;
  let dateFallback = null;

  // 1. Garimpar o Ano: Busca por 4 dígitos começando com 18, 19 ou 20
  // Ex: Pega "1948" de "China Horn 1948; Sabin Lab"
  const yearMatch = strainStr.match(/\b(18|19|20)\d{2}\b/);
  if (yearMatch) {
    dateFallback = yearMatch[0];
  }

  // 2. Garimpar a Localização: Busca o texto antes do ano (letras e espaços)
  // Ex: Pega "Germany" de "Germany-1958", "Brazil" de "Brazil 1966"
  const geoMatch = strainStr.match(/^([a-zA-Z\s]+)[-\s]*\b(18|19|20)\d{2}\b/);
  if (geoMatch && geoMatch[1]) {
    geoFallback = geoMatch[1].trim();
  } else if (!yearMatch) {
    // Se não tiver ano nenhum, chuta que a primeira palavra inteira (maior que 3 letras) é o local
    // Ex: "Kinshasa_variant_X" -> "Kinshasa"
    const firstWordMatch = strainStr.match(/^([a-zA-Z]{3,})/);
    if (firstWordMatch) geoFallback = firstWordMatch[1];
  }

  return { geoFallback, dateFallback };
};

const extractMeta = (metadata, key) => {
  if (!metadata) return null;

  if (key === "geoLoc") {
    return (
      metadata?.features?.[0]?.qualifiers?.geo_loc_name?.[0] ||
      metadata?.country ||
      null
    );
  }
  if (key === "date") {
    const raw = metadata?.features?.[0]?.qualifiers?.collection_date?.[0];

    if (!raw) return null;

    if (/^\d{4}/.test(raw)) {
      return raw.split("-")[0];
    }
    if (/^\d{2}-[a-zA-Z]{3}-\d{4}$/.test(raw)) {
      return raw.split("-")[2];
    }
    if (raw.includes("-")) {
      const parts = raw.split("-");
      const lastPart = parts[parts.length - 1];
      if (/^\d{4}$/.test(lastPart)) {
        return lastPart;
      }
    }

    return raw;
  }
  if (key === "isolate") {
    return (
      metadata?.features?.[0]?.qualifiers?.isolate?.[0] ||
      metadata?.strain ||
      metadata?.features?.[0]?.qualifiers?.strain?.[0] ||
      null
    );
  }
  if (key === "strain_raw") {
    return (
      metadata?.features?.[0]?.qualifiers?.strain || metadata?.strain || null
    );
  }

  return null;
};

const processPhylogeneticTree = (treeData) => {
  if (!treeData || treeData.length === 0) return [];

  const terminalsList = [];
  const metadataRegistry = {};

  const registerMetadata = (id, metadataObj) => {
    if (!id || id === "Unknown") return;

    if (!metadataRegistry[id]) {
      metadataRegistry[id] = {
        geoLoc: null,
        collectionDate: null,
        isolate: null,
      };
    }

    const extractedGeo = extractMeta(metadataObj, "geoLoc");
    const extractedDate = extractMeta(metadataObj, "date");
    const extractedIsolate = extractMeta(metadataObj, "isolate");

    const rawStrain = extractMeta(metadataObj, "strain_raw");
    const { geoFallback, dateFallback } = parseStrainFallback(rawStrain);
    const finalGeo = extractedGeo || geoFallback;
    const finalDate = dateFallback || extractedDate;

    if (!metadataRegistry[id].geoLoc && finalGeo)
      metadataRegistry[id].geoLoc = finalGeo;
    if (!metadataRegistry[id].collectionDate && finalDate)
      metadataRegistry[id].collectionDate = finalDate;
    if (!metadataRegistry[id].isolate && extractedIsolate)
      metadataRegistry[id].isolate = extractedIsolate;
  };

  const traverseTree = (node) => {
    if (!node || typeof node !== "object") return;

    if (node.data_terminals && typeof node.data_terminals === "object") {
      Object.entries(node.data_terminals).forEach(([id, meta]) => {
        registerMetadata(id, meta);
      });
    }

    if (node.data_terminals && Array.isArray(node.data_terminals)) {
      node.data_terminals.forEach((terminal) => {
        const metadata = terminal.metadata || {};
        const id = metadata.id || terminal.name || "Unknown";

        registerMetadata(id, metadata);

        terminalsList.push({
          raw: terminal,
          id: id,
          newick: terminal.newick,
        });
      });
    }

    if (node.metadata && (node.metadata.id || node.name)) {
      registerMetadata(node.metadata.id || node.name, node.metadata);
    }

    const ignoredKeys = [
      "List_terminals_hash",
      "metadata",
      "supports",
      "newick",
      "name",
    ];

    Object.keys(node).forEach((key) => {
      if (
        !ignoredKeys.includes(key) &&
        typeof node[key] === "object" &&
        node[key] !== null
      ) {
        traverseTree(node[key]);
      }
    });
  };

  const rootObj = treeData[0] || treeData;
  traverseTree(rootObj);

  const enrichedSequences = terminalsList.map((term) => {
    const meta = metadataRegistry[term.id] || {};
    return {
      ...term,
      geoLoc: meta.geoLoc || null,
      collectionDate: meta.collectionDate || null,
      isolate: meta.isolate || "Unknown",
    };
  });

  const uniqueSequences = Array.from(
    new Map(enrichedSequences.map((item) => [item.id, item])).values(),
  );

  return uniqueSequences;
};

const PhylogeneticInsights = ({ treeData, owidMetadata, loading, error }) => {
  const sequences = useMemo(
    () => processPhylogeneticTree(treeData),
    [treeData],
  );
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" tip="Loading data..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Erro"
        description={
          error.message || "An error occurred while loading the data."
        }
        type="error"
        showIcon
      />
    );
  }

  if (!treeData) {
    return (
      <Alert
        message="No data"
        description="No phylogenetic data available for analysis."
        type="warning"
        showIcon
      />
    );
  }

  const countryFilters = useMemo(() => {
    const countries = new Set(sequences.map((s) => s.geoLoc).filter(Boolean));
    return Array.from(countries)
      .sort()
      .map((c) => ({ text: c, value: c }));
  }, [sequences]);

  const dateFilters = useMemo(() => {
    const dates = new Set(
      sequences.map((s) => s.collectionDate).filter(Boolean),
    );
    return Array.from(dates)
      .sort()
      .map((d) => ({ text: d, value: d }));
  }, [sequences]);

  const accessionFilters = useMemo(() => {
    const accessions = new Set(
      sequences.map((s) => s.id).filter(Boolean)
    );
    return Array.from(accessions)
      .sort()
      .map((id) => ({ text: id, value: id }));
  }, [sequences]);

  const sequenceColumns = [
    {
      title: "Accession ID",
      dataIndex: "id",
      key: "id",
      width: "350px",
      sorter: (a, b) => (a.id || "").localeCompare(b.id || ""),
      filters: accessionFilters,
      filterSearch: true,
      onFilter: (value, record) => record.id === value,
    },
    {
      title: "Collection Date",
      dataIndex: "collectionDate",
      key: "collectionDate",
      width: "350px",
      filters: dateFilters,
      filterSearch: true,
      onFilter: (value, record) => record.collectionDate === value,
      render: (text) => text || "Unknown",
      sorter: (a, b) =>
        (a.collectionDate || "").localeCompare(b.collectionDate || ""),
    },
    {
      title: "Country",
      dataIndex: "geoLoc",
      key: "geoLoc",
      filters: countryFilters,
      filterSearch: true,
      onFilter: (value, record) => record.geoLoc === value,
      render: (text) => text || "Unknown",
      sorter: (a, b) => (a.geoLoc || "").localeCompare(b.geoLoc || ""),
    },
    {
      title: "NCBI Link",
      key: "link",
      align: "center",
      width: "250px",
      render: (_, record) => {
        const accession_id = record.id ? record.id.split(".")[0] : "";
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

  return (
    <Layout style={{ padding: "24px", background: "#fff" }}>
      <Content>
        <Card title="Sequences Dataset" style={{ marginBottom: 24 }}>
          <Table
            columns={sequenceColumns}
            dataSource={sequences.map((seq, index) => ({
              ...seq,
              key: seq.id || index,
            }))}
            // pagination={{ pageSize: 10 }}
            size="small"
            scroll={{ x: "max-content" }}
          />
        </Card>
        <GeographicDistribution sequences={sequences} />
        <TemporalInsights sequences={sequences} />
        {owidMetadata && <OWIDAnalysisDashboard analysisData={owidMetadata} />}
      </Content>
    </Layout>
  );
};

export default PhylogeneticInsights;
