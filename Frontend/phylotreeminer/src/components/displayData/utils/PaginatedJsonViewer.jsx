import React, { useState, useEffect, useMemo } from "react";
import { Card, Button, Spin, message, Alert } from "antd";
import MetadataViewer from "./MetadataViewer";

const PaginatedJsonViewer = ({ filePath }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentData, setCurrentData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [totalItems, setTotalItems] = useState(1);

  useEffect(() => {
    if (!filePath) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const API_BASE_URL = "http://localhost:8000";
        const response = await fetch(
          `${API_BASE_URL}/api/file/paginated?path=${encodeURIComponent(filePath)}&index=${currentIndex}`,
        );

        if (!response.ok) {
          throw new Error("Falha ao carregar os dados paginados.");
        }

        const result = await response.json();
        setCurrentData(result.content);
        setTotalItems(result.totalItems);
      } catch (error) {
        console.error("Erro ao buscar página JSON:", error);
        message.error("Erro ao carregar o índice solicitado.");
        setCurrentData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filePath, currentIndex]);

  if (loading && !currentData) {
    return (
      <Card style={{ marginTop: "16px", padding: "50px", textAlign: "center" }}>
        <Spin size="large" tip="Carregando árvore..." />
      </Card>
    );
  }

  if (!currentData && !loading) {
    return (
      <Card
        style={{
          marginTop: "16px",
          padding: "16px",
          color: "#d32f2f",
          backgroundColor: "#ffebee",
        }}
      >
        <strong>Erro:</strong> Não foi possível processar os metadados ou o
        arquivo está vazio.
      </Card>
    );
  }

  const handlePrev = () => setCurrentIndex((prev) => Math.max(0, prev - 1));
  const handleNext = () =>
    setCurrentIndex((prev) => Math.min(totalItems - 1, prev + 1));

  return (
    <Card style={{ marginTop: "16px", padding: "16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          paddingBottom: "16px",
          borderBottom: "1px solid #eee",
        }}
      >
        <Button
          onClick={handlePrev}
          disabled={currentIndex === 0 || loading}
          style={{ padding: "6px 12px" }}
        >
          Back
        </Button>

        <span style={{ fontWeight: "bold" }}>
          Tree {currentIndex + 1} of {totalItems}
        </span>

        <Button
          onClick={handleNext}
          disabled={currentIndex === totalItems - 1 || loading}
          style={{ padding: "6px 12px" }}
        >
          Next
        </Button>
      </div>

      <Spin spinning={loading}>
        <div style={{ overflowX: "auto", maxHeight: "60vh" }}>
          {loading ? (
            <Alert
              message="Loading"
              description="This may take a while."
              type="info"
              showIcon
            />
          ) : (
            <MetadataViewer data={currentData} />
          )}
        </div>
      </Spin>
    </Card>
  );
};

export default PaginatedJsonViewer;
