import React, { useState, useEffect } from "react";
import { Card, Button, Spin, message, Alert } from "antd";
import MetadataViewer from "./MetadataViewer";
import JsonViewer from "./JsonViewer";

const API_BASE_URL = "http://localhost:8000";

/**
 * Abre um JSON do explorador de arquivos.
 *
 * O backend devolve `kind`, que diz qual é a forma da raiz, e é isso que decide
 * a apresentação:
 *
 *   `array_of_arrays` — é o `metadata.json`: uma árvore por página, com o
 *                       visualizador de metadados e controles de navegação;
 *   `array`           — pagina por elemento, com o leitor genérico;
 *   `object`          — é o `manifest.json`, o `config_backup.json` e qualquer
 *                       arquivo de configuração: vem inteiro, sem paginação.
 *
 * Antes, este componente supunha que todo JSON fosse uma lista de árvores e
 * rotulava as páginas como "Tree N of M". Um manifesto abria como erro.
 */
const PaginatedJsonViewer = ({ filePath, fileName }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentData, setCurrentData] = useState(null);
  const [totalItems, setTotalItems] = useState(1);
  const [kind, setKind] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    setCurrentIndex(0);
  }, [filePath]);

  useEffect(() => {
    if (!filePath) return;

    const fetchData = async () => {
      setLoading(true);
      setErro(null);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/file/paginated?path=${encodeURIComponent(filePath)}&index=${currentIndex}`,
        );

        if (!response.ok) {
          // O backend explica o motivo — arquivo grande demais, índice fora dos
          // limites, arquivo vazio. Repetir a mensagem dele é mais útil que
          // inventar "falha ao carregar".
          let detalhe = `HTTP ${response.status}`;
          try {
            const corpo = await response.json();
            if (corpo?.detail) detalhe = corpo.detail;
          } catch {
            /* resposta sem corpo JSON */
          }
          throw new Error(detalhe);
        }

        const result = await response.json();
        setCurrentData(result.content);
        setTotalItems(result.totalItems ?? 1);
        setKind(result.kind ?? null);
      } catch (error) {
        console.error("Erro ao buscar JSON:", error);
        setErro(error.message);
        setCurrentData(null);
        message.error(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filePath, currentIndex]);

  if (loading && !currentData) {
    return (
      <Card style={{ marginTop: 16, padding: 50, textAlign: "center" }}>
        <Spin size="large" tip="Carregando…" />
      </Card>
    );
  }

  if (erro) {
    return (
      <Card style={{ marginTop: 16 }}>
        <Alert type="error" showIcon message="Não foi possível abrir o arquivo" description={erro} />
      </Card>
    );
  }

  if (!currentData) {
    return (
      <Card style={{ marginTop: 16 }}>
        <Alert type="warning" showIcon message="Arquivo sem conteúdo para exibir." />
      </Card>
    );
  }

  const ehMetadado = kind === "array_of_arrays";
  const paginado = totalItems > 1;
  const rotulo = ehMetadado ? "Árvore" : "Item";

  const handlePrev = () => setCurrentIndex((prev) => Math.max(0, prev - 1));
  const handleNext = () => setCurrentIndex((prev) => Math.min(totalItems - 1, prev + 1));

  return (
    <Card style={{ marginTop: 16 }}>
      {paginado && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            paddingBottom: 16,
            borderBottom: "1px solid #eee",
          }}
        >
          <Button onClick={handlePrev} disabled={currentIndex === 0 || loading}>
            Anterior
          </Button>
          <span style={{ fontWeight: 600 }}>
            {rotulo} {currentIndex + 1} de {totalItems}
          </span>
          <Button onClick={handleNext} disabled={currentIndex === totalItems - 1 || loading}>
            Próxima
          </Button>
        </div>
      )}

      <Spin spinning={loading}>
        <div style={{ overflowX: "auto" }}>
          {ehMetadado ? (
            <MetadataViewer data={currentData} />
          ) : (
            <JsonViewer data={currentData} nomeArquivo={fileName} />
          )}
        </div>
      </Spin>
    </Card>
  );
};

export default PaginatedJsonViewer;
