import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Card,
  Col,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";

import { API_BASE_URL } from "../../services/dataServices";

const { Text, Paragraph } = Typography;

/**
 * M3.3 — bootstrap (robustez amostral) e suporte metodológico (robustez entre
 * pipelines) lado a lado, para o MESMO clado.
 *
 * As duas rotas de origem (`/branch-support`, M3.1, e
 * `/methodological-support`, M3.3/M3.4) nunca normalizam nem misturam
 * métricas — este componente também não: cada linha mostra o valor bruto do
 * bootstrap com a métrica que o produziu, e o suporte metodológico como
 * fração M/M, sem converter um no outro. `clade_id` é a mesma bipartição
 * canônica (D3/D5) nas duas rotas — é por ele que as linhas são cruzadas.
 */
const MethodologicalSupport = ({ projectName }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bootstrap, setBootstrap] = useState(null);
  const [suporteMetodologicoPorAlinhador, setSuporteMetodologicoPorAlinhador] =
    useState({});

  useEffect(() => {
    if (!projectName) return;

    let cancelado = false;

    const carregar = async () => {
      setLoading(true);
      setError(null);
      try {
        const respBootstrap = await fetch(
          `${API_BASE_URL}/api/tree/${projectName}/branch-support`,
        );
        if (!respBootstrap.ok) {
          throw new Error(
            `Falha ao buscar suporte de ramo (HTTP ${respBootstrap.status})`,
          );
        }
        const dadosBootstrap = await respBootstrap.json();
        if (cancelado) return;
        setBootstrap(dadosBootstrap);

        const alinhadores = Array.from(
          new Set(
            (dadosBootstrap.arvores || [])
              .filter((a) => a.suporte_presente)
              .map((a) => a.alinhador),
          ),
        );

        const porAlinhador = {};
        for (const alinhador of alinhadores) {
          const resp = await fetch(
            `${API_BASE_URL}/api/tree/${projectName}/methodological-support?alinhador=${encodeURIComponent(alinhador)}`,
          );
          if (!resp.ok) continue;
          porAlinhador[alinhador] = await resp.json();
        }
        if (!cancelado) setSuporteMetodologicoPorAlinhador(porAlinhador);
      } catch (err) {
        if (!cancelado) setError(err.message);
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    carregar();
    return () => {
      cancelado = true;
    };
  }, [projectName]);

  // Junta cada ramo com bootstrap ao suporte metodológico do MESMO clade,
  // dentro do universo do alinhador que produziu aquele ramo — comparar
  // contra um universo de alinhador diferente misturaria conjuntos de dados.
  const linhas = useMemo(() => {
    if (!bootstrap) return [];
    const resultado = [];

    for (const arvore of bootstrap.arvores || []) {
      if (!arvore.suporte_presente) continue;
      const universo = suporteMetodologicoPorAlinhador[arvore.alinhador];
      if (!universo) continue;

      const porClade = new Map(universo.clados.map((c) => [c.clade_id, c]));

      for (const ramo of arvore.ramos) {
        const clado = porClade.get(ramo.clade_id);
        resultado.push({
          key: `${arvore.pipeline}_${ramo.clade_id}`,
          pipeline: arvore.pipeline,
          metodo: arvore.metodo,
          metricaId: arvore.metrica.id,
          metricaLabel: arvore.metrica.rotulo,
          limiarAlto: arvore.metrica.limiar_alto,
          nTaxa: ramo.n_taxa,
          bootstrap: ramo.valor,
          escala: ramo.escala,
          suporteMetodologico: clado ? clado.suporte : null,
          M: universo.M,
          nPipelinesQueRecuperam: clado ? clado.pipelines.length : null,
        });
      }
    }

    return resultado.sort((a, b) => (b.bootstrap ?? -1) - (a.bootstrap ?? -1));
  }, [bootstrap, suporteMetodologicoPorAlinhador]);

  const discordanciasAltoBootstrapBaixoSuporte = useMemo(
    () =>
      linhas.filter(
        (l) =>
          l.limiarAlto != null &&
          l.bootstrap >= l.limiarAlto &&
          l.suporteMetodologico != null &&
          l.suporteMetodologico < 1.0,
      ).length,
    [linhas],
  );

  if (!projectName) return null;

  if (loading) {
    return (
      <Card>
        <Spin tip="Carregando bootstrap e suporte metodológico..." />
      </Card>
    );
  }

  if (error) {
    return <Alert type="error" showIcon message="Erro" description={error} />;
  }

  if (!bootstrap || linhas.length === 0) {
    return (
      <Alert
        type="info"
        showIcon
        message="Sem bootstrap para cruzar com suporte metodológico"
        description={
          bootstrap
            ? "Nenhuma árvore deste projeto tem bootstrap gravado (RAxML-NG sem --bs-trees, ou reexecução anterior a DEC-064)."
            : "Nada carregado ainda."
        }
      />
    );
  }

  const colunas = [
    { title: "Pipeline", dataIndex: "pipeline", key: "pipeline", width: 150, ellipsis: true },
    {
      title: "Bootstrap",
      key: "bootstrap",
      width: 130,
      sorter: (a, b) => (a.bootstrap ?? -1) - (b.bootstrap ?? -1),
      render: (_, r) => (
        <Tooltip title={`${r.metricaLabel} (escala ${r.escala[0]}-${r.escala[1]})`}>
          <Text strong={r.limiarAlto != null && r.bootstrap >= r.limiarAlto}>
            {r.bootstrap.toFixed(1)}
          </Text>{" "}
          <Text type="secondary" style={{ fontSize: 11 }}>
            ({r.metricaId})
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Suporte metodológico",
      key: "suporte_metodologico",
      width: 190,
      sorter: (a, b) =>
        (a.suporteMetodologico ?? -1) - (b.suporteMetodologico ?? -1),
      render: (_, r) =>
        r.suporteMetodologico == null ? (
          <Text type="secondary">não medido</Text>
        ) : (
          <Space size={4}>
            <Text>
              {r.nPipelinesQueRecuperam}/{r.M} (
              {(r.suporteMetodologico * 100).toFixed(0)}%)
            </Text>
            {r.limiarAlto != null &&
              r.bootstrap >= r.limiarAlto &&
              r.suporteMetodologico < 1.0 && (
                <Tooltip title="Bootstrap alto, mas nem todo pipeline recupera este clado — a discordância que o argumento do artigo mede.">
                  <Tag color="warning" style={{ marginInlineEnd: 0 }}>
                    discordante
                  </Tag>
                </Tooltip>
              )}
          </Space>
        ),
    },
    { title: "n táxons", dataIndex: "nTaxa", key: "n_taxa", width: 90 },
  ];

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <Alert
        type="info"
        showIcon
        message="Bootstrap e suporte metodológico são grandezas ortogonais"
        description={
          <>
            <Paragraph style={{ marginBottom: 4 }}>
              {bootstrap.comparabilidade?.nota}
            </Paragraph>
            <Paragraph style={{ marginBottom: 0 }}>
              Suporte metodológico é a fração de pipelines (alinhador × método
              de inferência) que recuperam o mesmo clado — mede robustez
              metodológica, não amostral. Um clado com bootstrap máximo pode
              não ser recuperado por outros métodos, e vice-versa.
            </Paragraph>
          </>
        }
      />

      <Row gutter={16}>
        <Col>
          <Statistic title="Ramos com bootstrap" value={linhas.length} />
        </Col>
        <Col>
          <Statistic
            title="Bootstrap alto, sem unanimidade metodológica"
            value={discordanciasAltoBootstrapBaixoSuporte}
            valueStyle={
              discordanciasAltoBootstrapBaixoSuporte > 0
                ? { color: "#8A5D10" }
                : undefined
            }
          />
        </Col>
      </Row>

      <Table
        size="small"
        tableLayout="fixed"
        style={{ maxWidth: 700 }}
        columns={colunas}
        dataSource={linhas}
        pagination={{ pageSize: 15, showSizeChanger: true }}
      />
    </Space>
  );
};

export default MethodologicalSupport;
