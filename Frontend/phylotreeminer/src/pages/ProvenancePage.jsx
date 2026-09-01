import React, { useEffect, useState } from "react";
import { Card, Empty, Select, Space, Typography } from "antd";
import { useSearchParams } from "react-router-dom";

import ProvenanceView from "../components/displayData/ProvenanceView";
import { API_BASE_URL } from "../services/dataServices";

const { Title } = Typography;

/**
 * Entrada global da tela de proveniência (menu lateral). Chega aqui sem
 * projeto (escolhe pela lista) ou com `?project=nome` — é o link que o menu
 * de ações de cada projeto usa para pular direto para o dele.
 */
const ProvenancePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const projetoNaUrl = searchParams.get("project");

  const [projetos, setProjetos] = useState([]);
  const [selecionado, setSelecionado] = useState(projetoNaUrl || null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/projects`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setProjetos)
      .catch(() => setProjetos([]));
  }, []);

  useEffect(() => {
    if (projetoNaUrl) setSelecionado(projetoNaUrl);
  }, [projetoNaUrl]);

  const handleChange = (nome) => {
    setSelecionado(nome);
    setSearchParams(nome ? { project: nome } : {});
  };

  return (
    <div>
      <Title level={3}>Provenance</Title>
      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Select
            showSearch
            allowClear
            placeholder="Selecione um projeto"
            style={{ width: "100%", maxWidth: 480 }}
            value={selecionado || undefined}
            onChange={handleChange}
            options={projetos.map((p) => ({ value: p.name, label: p.name }))}
          />
        </Space>
      </Card>

      {selecionado ? (
        <ProvenanceView projectName={selecionado} />
      ) : (
        <Empty description="Selecione um projeto para ver proveniência e reprodutibilidade da execução." />
      )}
    </div>
  );
};

export default ProvenancePage;
