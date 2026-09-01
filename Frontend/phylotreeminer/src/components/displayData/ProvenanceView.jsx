import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Empty,
  Input,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  AuditOutlined,
  BranchesOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloudServerOutlined,
  CopyOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  FileProtectOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import { STATUS_MAP, formatarDuracao } from "../../constants/executionStatus";
import { API_BASE_URL } from "../../services/dataServices";
import JsonViewer from "./utils/JsonViewer";

const { Title, Text, Paragraph } = Typography;

const copiar = async (texto, rotulo = "Valor") => {
  try {
    await navigator.clipboard.writeText(texto);
    message.success(`${rotulo} copiado.`);
  } catch {
    message.error("O navegador bloqueou o acesso à área de transferência.");
  }
};

/** Monospace com botão de copiar — usado para run_id, commits e hashes. */
const CampoMonoCopiavel = ({ valor, truncarEm, rotulo }) => {
  if (!valor) return <Text type="secondary">—</Text>;
  const exibido =
    truncarEm && valor.length > truncarEm ? `${valor.slice(0, truncarEm)}…` : valor;
  return (
    <Space size={4}>
      <Tooltip title={valor}>
        <Text code style={{ fontSize: 12 }}>
          {exibido}
        </Text>
      </Tooltip>
      <Tooltip title="Copiar">
        <Button
          type="text"
          size="small"
          icon={<CopyOutlined />}
          onClick={() => copiar(valor, rotulo)}
        />
      </Tooltip>
    </Space>
  );
};

const formatarData = (iso) => (iso ? new Date(iso).toLocaleString("pt-BR") : "—");

const humanizarChave = (chave) =>
  chave.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/**
 * Proveniência e reprodutibilidade de uma execução — leitura analítica do
 * `manifest.json` que o pipeline grava desde M2.5 (DEC-027).
 *
 * Não recalcula nada: cada campo vem direto do manifesto, que é a fonte
 * declarada pelo próprio pipeline. Um projeto sem manifesto (nunca executado,
 * ou executado antes de M2.5) não tem proveniência para mostrar — a tela diz
 * isso explicitamente em vez de inventar zeros.
 */
const ProvenanceView = ({ projectName }) => {
  const [manifest, setManifest] = useState(null);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [semManifesto, setSemManifesto] = useState(false);
  const [filtroSaidas, setFiltroSaidas] = useState("");
  const [atualizadoEm, setAtualizadoEm] = useState(null);

  const carregar = useCallback(async () => {
    if (!projectName) return;
    setLoading(true);
    setErro(null);
    setSemManifesto(false);

    try {
      const detailsRes = await fetch(`${API_BASE_URL}/projects/details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([projectName]),
      });
      const detailsData = detailsRes.ok ? await detailsRes.json() : {};
      setDetails(detailsData[projectName] || null);

      const manifestPath = `${projectName}/out/outputs/manifest.json`;
      const manifestRes = await fetch(
        `${API_BASE_URL}/api/file/paginated?path=${encodeURIComponent(manifestPath)}&index=0`,
      );

      if (manifestRes.status === 404) {
        setSemManifesto(true);
        setManifest(null);
      } else if (!manifestRes.ok) {
        const corpo = await manifestRes.json().catch(() => ({}));
        throw new Error(corpo.detail || `HTTP ${manifestRes.status}`);
      } else {
        const resultado = await manifestRes.json();
        setManifest(resultado.content);
      }
      setAtualizadoEm(new Date());
    } catch (error) {
      setErro(error.message || "Falha ao carregar proveniência.");
    } finally {
      setLoading(false);
    }
  }, [projectName]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const duracaoSegundos = useMemo(() => {
    if (!manifest?.started_at_utc) return null;
    const inicio = new Date(manifest.started_at_utc);
    if (!manifest.finished_at_utc) return null;
    const fim = new Date(manifest.finished_at_utc);
    return Math.max(Math.round((fim - inicio) / 1000), 0);
  }, [manifest]);

  const reposSujos = useMemo(() => {
    if (!manifest?.git) return [];
    return Object.entries(manifest.git).filter(([, info]) => info?.dirty);
  }, [manifest]);

  const ferramentas = useMemo(() => {
    if (!manifest) return [];
    const disponiveis = manifest.tools_available || {};
    const invocadas = manifest.tools_invoked || {};
    const nomes = new Set([...Object.keys(disponiveis), ...Object.keys(invocadas)]);
    return Array.from(nomes)
      .sort()
      .map((nome) => {
        const invocada = invocadas[nome];
        const runs = invocada?.runs || [];
        const resumoPartes = [invocada?.model, invocada?.estrategia, invocada?.bootstrap].filter(
          Boolean,
        );
        return {
          key: nome,
          nome,
          versaoDisponivel: disponiveis[nome] || null,
          foiInvocada: Boolean(invocada),
          execucoes: runs.length,
          resumo: resumoPartes.join(" · "),
          detalhes: invocada
            ? Object.entries(invocada).filter(([chave]) => chave !== "runs")
            : [],
          runs,
        };
      });
  }, [manifest]);

  const entradas = useMemo(
    () => Object.entries(manifest?.inputs_sha256 || {}).map(([caminho, hash]) => ({ caminho, hash })),
    [manifest],
  );

  const saidas = useMemo(() => {
    const todas = Object.entries(manifest?.outputs_sha256 || {}).map(([caminho, hash]) => ({
      caminho,
      hash,
    }));
    if (!filtroSaidas) return todas;
    const alvo = filtroSaidas.toLowerCase();
    return todas.filter((item) => item.caminho.toLowerCase().includes(alvo));
  }, [manifest, filtroSaidas]);

  if (!projectName) {
    return (
      <Empty description="Selecione um projeto para ver sua proveniência." />
    );
  }

  if (loading && !manifest && !semManifesto) {
    return (
      <div style={{ textAlign: "center", padding: 50 }}>
        <Spin size="large" tip="Carregando proveniência…" />
      </div>
    );
  }

  if (erro) {
    return (
      <Alert
        type="error"
        showIcon
        message="Não foi possível carregar a proveniência"
        description={erro}
        action={
          <Button size="small" onClick={carregar}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  const statusInfo = STATUS_MAP[details?.state] || STATUS_MAP.unknown;

  const cabecalho = (
    <Row justify="space-between" align="middle" gutter={[16, 16]}>
      <Col>
        <Title level={3} style={{ marginBottom: 0 }}>
          <AuditOutlined /> Provenance
        </Title>
        <Text type="secondary">{projectName}</Text>
      </Col>
      <Col>
        <Space direction="vertical" align="end" size={4}>
          <Button icon={<ReloadOutlined />} onClick={carregar} loading={loading}>
            Atualizar
          </Button>
          {atualizadoEm && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Atualizado às {atualizadoEm.toLocaleTimeString("pt-BR")}
            </Text>
          )}
        </Space>
      </Col>
    </Row>
  );

  if (semManifesto) {
    return (
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        {cabecalho}
        <Alert
          type="warning"
          showIcon
          message="Este projeto não tem manifesto de execução"
          description={
            <Paragraph style={{ marginBottom: 0 }}>
              Proveniência (versão do código, ambiente, sementes e hashes de
              arquivo) só existe a partir do manifesto que o pipeline grava
              desde M2.5. Projetos nunca executados, ou executados antes
              dessa correção, não têm esse registro — não é um erro de
              carregamento, é ausência real do dado.
              {details?.state && (
                <>
                  {" "}
                  Estado atual pelo log:{" "}
                  <Tag color={statusInfo.color} icon={statusInfo.icon}>
                    {statusInfo.text}
                  </Tag>
                </>
              )}
            </Paragraph>
          }
        />
      </Space>
    );
  }

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      {cabecalho}

      {reposSujos.length > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message="Execução feita com alterações não commitadas"
          description={
            <>
              Esta execução não é reproduzível a partir de um checkout limpo:{" "}
              {reposSujos.map(([repo]) => (
                <Tag key={repo} color="orange">
                  {repo}
                </Tag>
              ))}
              {" "}estava(m) com mudanças não versionadas no momento da execução.
            </>
          }
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Status"
              valueRender={() => (
                <Tag color={statusInfo.color} icon={statusInfo.icon} style={{ fontSize: 13 }}>
                  {statusInfo.text}
                </Tag>
              )}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Duração"
              value={formatarDuracao(duracaoSegundos)}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Artefatos com hash"
              value={entradas.length + saidas.length}
              prefix={<FileProtectOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Repositórios sujos"
              value={reposSujos.length}
              valueStyle={{ color: reposSujos.length > 0 ? "#faad14" : "#52c41a" }}
              prefix={reposSujos.length > 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Identidade da execução" size="small">
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="Run ID">
            <CampoMonoCopiavel valor={manifest.run_id} rotulo="run_id" />
          </Descriptions.Item>
          <Descriptions.Item label="Versão do manifesto">
            {manifest.manifest_version ?? "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Início (UTC)">
            {formatarData(manifest.started_at_utc)}
          </Descriptions.Item>
          <Descriptions.Item label="Fim (UTC)">
            {formatarData(manifest.finished_at_utc)}
          </Descriptions.Item>
          <Descriptions.Item label="Arquivo de log" span={2}>
            <Text code>{manifest.log_file || "—"}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title={
          <Space>
            <BranchesOutlined />
            <span>Código (git)</span>
          </Space>
        }
        size="small"
      >
        <Table
          size="small"
          pagination={false}
          rowKey={([repo]) => repo}
          dataSource={Object.entries(manifest.git || {})}
          columns={[
            { title: "Repositório", render: ([repo]) => <Text strong>{repo}</Text> },
            { title: "Branch", render: ([, info]) => info?.branch || "—" },
            {
              title: "Commit",
              render: ([, info]) =>
                info?.commit ? (
                  <CampoMonoCopiavel valor={info.commit} truncarEm={12} rotulo="commit" />
                ) : (
                  "—"
                ),
            },
            {
              title: "Estado",
              render: ([, info]) =>
                info?.dirty ? (
                  <Tag color="orange">com alterações não commitadas</Tag>
                ) : (
                  <Tag color="green">limpo</Tag>
                ),
            },
          ]}
        />
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <CloudServerOutlined />
                <span>Ambiente de execução</span>
              </Space>
            }
            size="small"
            style={{ height: "100%" }}
          >
            {manifest.environment ? (
              <Descriptions bordered size="small" column={1}>
                {Object.entries(manifest.environment).map(([chave, valor]) => (
                  <Descriptions.Item key={chave} label={humanizarChave(chave)}>
                    {String(valor)}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            ) : (
              <Empty description="Ambiente não registrado." />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <SafetyCertificateOutlined />
                <span>Sementes e parâmetros de determinismo</span>
              </Space>
            }
            size="small"
            style={{ height: "100%" }}
          >
            {manifest.reproducibility && Object.keys(manifest.reproducibility).length > 0 ? (
              <Descriptions bordered size="small" column={1}>
                {Object.entries(manifest.reproducibility).map(([chave, valor]) => (
                  <Descriptions.Item key={chave} label={humanizarChave(chave)}>
                    {String(valor)}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            ) : (
              <Empty description="Nenhum parâmetro de determinismo declarado nesta execução." />
            )}
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <Space>
            <ExperimentOutlined />
            <span>Ferramentas</span>
            <Badge count={ferramentas.filter((f) => f.foiInvocada).length} showZero color="#52c41a" />
          </Space>
        }
        size="small"
      >
        <Table
          size="small"
          rowKey="key"
          dataSource={ferramentas}
          pagination={false}
          columns={[
            { title: "Ferramenta", dataIndex: "nome" },
            {
              title: "Versão disponível",
              dataIndex: "versaoDisponivel",
              render: (v) => v || <Text type="secondary">não detectada</Text>,
            },
            {
              title: "Invocada nesta execução",
              dataIndex: "foiInvocada",
              render: (v, r) =>
                v ? (
                  <Tag color="blue">{r.execucoes} execução(ões)</Tag>
                ) : (
                  <Tag>não</Tag>
                ),
            },
            { title: "Modelo / estratégia", dataIndex: "resumo" },
          ]}
          expandable={{
            rowExpandable: (r) => r.foiInvocada,
            expandedRowRender: (r) => (
              <Space direction="vertical" style={{ width: "100%" }}>
                {r.detalhes.length > 0 && (
                  <Space wrap>
                    {r.detalhes.map(([chave, valor]) => (
                      <Tag key={chave}>
                        {humanizarChave(chave)}: {String(valor)}
                      </Tag>
                    ))}
                  </Space>
                )}
                {r.runs.map((run, i) => (
                  <div key={i}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      → {run.saida}
                    </Text>
                    <pre
                      style={{
                        margin: "4px 0 0",
                        fontSize: 12,
                        background: "#fafafa",
                        padding: 8,
                        borderRadius: 4,
                        overflowX: "auto",
                      }}
                    >
                      {(run.command || []).join(" ")}
                    </pre>
                  </div>
                ))}
              </Space>
            ),
          }}
        />
      </Card>

      <Card
        title={
          <Space>
            <DatabaseOutlined />
            <span>Integridade dos artefatos (SHA-256)</span>
          </Space>
        }
        size="small"
      >
        <Collapse
          defaultActiveKey={entradas.length > 0 ? ["entradas"] : []}
          items={[
            {
              key: "entradas",
              label: `Entradas (${entradas.length})`,
              children: (
                <Table
                  size="small"
                  rowKey="caminho"
                  dataSource={entradas}
                  pagination={false}
                  columns={[
                    {
                      title: "Caminho",
                      dataIndex: "caminho",
                      render: (v) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
                    },
                    {
                      title: "SHA-256",
                      dataIndex: "hash",
                      render: (v) => <CampoMonoCopiavel valor={v} truncarEm={16} rotulo="hash" />,
                    },
                  ]}
                />
              ),
            },
            {
              key: "saidas",
              label: `Saídas (${saidas.length}${filtroSaidas ? ` de ${Object.keys(manifest.outputs_sha256 || {}).length}` : ""})`,
              children: (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Input.Search
                    allowClear
                    placeholder="Filtrar por caminho"
                    value={filtroSaidas}
                    onChange={(e) => setFiltroSaidas(e.target.value)}
                    style={{ maxWidth: 320 }}
                  />
                  <Table
                    size="small"
                    rowKey="caminho"
                    dataSource={saidas}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    columns={[
                      {
                        title: "Caminho",
                        dataIndex: "caminho",
                        render: (v) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
                      },
                      {
                        title: "SHA-256",
                        dataIndex: "hash",
                        render: (v) => <CampoMonoCopiavel valor={v} truncarEm={16} rotulo="hash" />,
                      },
                    ]}
                  />
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Card title="Parâmetros do workflow" size="small">
        {manifest.params ? (
          <JsonViewer data={manifest.params} nomeArquivo="params" />
        ) : (
          <Empty description="Parâmetros não registrados." />
        )}
      </Card>

      <Collapse
        items={[
          {
            key: "bruto",
            label: "Manifesto bruto",
            children: <JsonViewer data={manifest} nomeArquivo="manifest.json" />,
          },
        ]}
      />
    </Space>
  );
};

export default ProvenanceView;
