import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, Empty, Select, Space, Typography } from "antd";
import { useSearchParams } from "react-router-dom";

import ProvenanceView from "../components/displayData/ProvenanceView";
import { fetchProjects } from "../services/dataServices";

const { Title } = Typography;

/**
 * Entrada global da tela de proveniência (menu lateral). Chega aqui sem
 * projeto (escolhe pela lista) ou com `?project=nome` — é o link que o menu
 * de ações de cada projeto usa para pular direto para o dele.
 */
const ProvenancePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const projetoNaUrl = searchParams.get("project");

  const [selecionado, setSelecionado] = useState(projetoNaUrl || null);

  const { data: projetos = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

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
            placeholder="Select a project"
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
        <Empty description="Select a project to see the provenance and reproducibility of its run." />
      )}
    </div>
  );
};

export default ProvenancePage;
