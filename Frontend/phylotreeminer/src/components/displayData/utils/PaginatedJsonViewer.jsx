import React, { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Card, Button, Spin, message, Alert } from "antd";
import MetadataViewer from "./MetadataViewer";
import JsonViewer from "./JsonViewer";
import { httpGet } from "../../../services/http";

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

  useEffect(() => {
    setCurrentIndex(0);
  }, [filePath]);

  // O backend explica o motivo do erro no corpo (arquivo grande demais,
  // índice fora dos limites, arquivo vazio) — `httpGet` já promove
  // `detail`/`message` do corpo para `error.message` (ApiError).
  const {
    data: pagina,
    isFetching: loading,
    error,
  } = useQuery({
    queryKey: ["paginated-json", filePath, currentIndex],
    queryFn: () =>
      httpGet(
        `/api/file/paginated?path=${encodeURIComponent(filePath)}&index=${currentIndex}`,
      ),
    enabled: Boolean(filePath),
    retry: false,
    // Mantém a página anterior visível (com o overlay de `Spin`) enquanto a
    // próxima carrega — igual ao comportamento anterior, que só sobrescrevia
    // `currentData` depois do fetch resolver.
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (error) {
      console.error("Erro ao buscar JSON:", error);
      message.error(error.message);
    }
  }, [error]);

  const currentData = pagina?.content ?? null;
  const totalItems = pagina?.totalItems ?? 1;
  const kind = pagina?.kind ?? null;
  const erro = error?.message || null;

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
