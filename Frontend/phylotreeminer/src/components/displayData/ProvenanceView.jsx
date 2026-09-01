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
  FileTextOutlined,
  PartitionOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import { STATUS_MAP, formatarDuracao } from "../../constants/executionStatus";
import { API_BASE_URL } from "../../services/dataServices";
import JsonViewer from "./utils/JsonViewer";

const { Title, Text, Paragraph } = Typography;

const copiar = async (texto, rotulo = "Value") => {
  try {
    await navigator.clipboard.writeText(texto);
    message.success(`${rotulo} copied.`);
  } catch {
    message.error("The browser blocked access to the clipboard.");
  }
};

/** Monospace with a copy button — used for run_id, commits and hashes. */
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
      <Tooltip title="Copy">
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

const formatarData = (iso) => (iso ? new Date(iso).toLocaleString("en-US") : "—");

const humanizarChave = (chave) =>
  chave.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/** Same label treatment as "Review Final Settings" in pipelineConfigurator.jsx. */
/** Above this many entries, a nested object's table gets a max height and scroll. */
const LIMIAR_ROLAGEM = 15;

const capitalizarPalavras = (chave) =>
  chave.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Renders a parameter value in the same format as the pre-run summary
 * (`pipelineConfigurator.jsx`, "Review Final Settings" step): boolean becomes
 * Yes/No, array becomes one line per item, object becomes a nested
 * `Descriptions`. The original version didn't recurse into an object inside
 * an object — this one does, because `manifest.params` has more than one
 * level (`tree_config.subtree_config...`), which the live form never had.
 */
const renderValorParametro = (valor) => {
  if (typeof valor === "boolean") return valor ? "Yes" : "No";
  if (valor === null || valor === undefined || valor === "") {
    return <Text type="secondary">—</Text>;
  }
  if (Array.isArray(valor)) {
    if (valor.length === 0) return <Text type="secondary">None</Text>;
    return (
      <div>
        {valor.map((item, i) => (
          <div key={i} style={{ marginBottom: 4 }}>
            {typeof item === "object" && item !== null
              ? renderValorParametro(item)
              : String(item)}
          </div>
        ))}
      </div>
    );
  }
  if (typeof valor === "object") {
    const entradas = Object.entries(valor);
    const tabela = (
      <Descriptions column={1} bordered size="small" style={{ marginTop: 8 }}>
        {entradas.map(([chave, filho]) => (
          <Descriptions.Item key={chave} label={capitalizarPalavras(chave)}>
            {renderValorParametro(filho)}
          </Descriptions.Item>
        ))}
      </Descriptions>
    );
    // outputs_sha256 of a large run can pass 200 entries — without a cap,
    // the table tanks the performance of the whole page.
    if (entradas.length > LIMIAR_ROLAGEM) {
      return (
        <div style={{ maxHeight: 420, overflow: "auto", border: "1px solid #f0f0f0" }}>
          {tabela}
        </div>
      );
    }
    return tabela;
  }
  return String(valor);
};

/**
 * Provenance and reproducibility of a run — an analytical reading of the
 * `manifest.json` the pipeline has written since M2.5 (DEC-027).
 *
 * Nothing here is recomputed: every field comes straight from the manifest,
 * which is the source declared by the pipeline itself. A project with no
 * manifest (never run, or run before M2.5) has no provenance to show — the
 * screen says so explicitly instead of inventing zeros.
 */
const ProvenanceView = ({ projectName }) => {
  const [manifest, setManifest] = useState(null);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [semManifesto, setSemManifesto] = useState(false);
  const [filtroSaidas, setFiltroSaidas] = useState("");
  const [paramsBruto, setParamsBruto] = useState(false);
  const [manifestoResumo, setManifestoResumo] = useState(true);
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
      setErro(error.message || "Failed to load provenance.");
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
      <Empty description="Select a project to see its provenance." />
    );
  }

  if (loading && !manifest && !semManifesto) {
    return (
      <div style={{ textAlign: "center", padding: 50 }}>
        <Spin size="large" tip="Loading provenance…" />
      </div>
    );
  }

  if (erro) {
    return (
      <Alert
        type="error"
        showIcon
        message="Could not load provenance"
        description={erro}
        action={
          <Button size="small" onClick={carregar}>
            Try again
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
            Refresh
          </Button>
          {atualizadoEm && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Updated at {atualizadoEm.toLocaleTimeString("en-US")}
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
          message="This project has no execution manifest"
          description={
            <Paragraph style={{ marginBottom: 0 }}>
              Provenance (code version, environment, seeds and file hashes)
              only exists from the manifest the pipeline has written since
              M2.5. Projects never run, or run before that fix, don't have
              this record — this isn't a loading error, it's a genuine
              absence of data.
              {details?.state && (
                <>
                  {" "}
                  Current state from the log:{" "}
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
          message="This run was made with uncommitted changes"
          description={
            <>
              This run is not reproducible from a clean checkout:{" "}
              {reposSujos.map(([repo]) => (
                <Tag key={repo} color="orange">
                  {repo}
                </Tag>
              ))}
              {" "}had unversioned changes at the time of the run.
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
              title="Duration"
              value={formatarDuracao(duracaoSegundos)}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Hashed artifacts"
              value={entradas.length + saidas.length}
              prefix={<FileProtectOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Dirty repositories"
              value={reposSujos.length}
              valueStyle={{ color: reposSujos.length > 0 ? "#faad14" : "#52c41a" }}
              prefix={reposSujos.length > 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Run identity" size="small">
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="Run ID">
            <CampoMonoCopiavel valor={manifest.run_id} rotulo="run_id" />
          </Descriptions.Item>
          <Descriptions.Item label="Manifest version">
            {manifest.manifest_version ?? "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Started (UTC)">
            {formatarData(manifest.started_at_utc)}
          </Descriptions.Item>
          <Descriptions.Item label="Finished (UTC)">
            {formatarData(manifest.finished_at_utc)}
          </Descriptions.Item>
          <Descriptions.Item label="Log file" span={2}>
            <Text code>{manifest.log_file || "—"}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title={
          <Space>
            <BranchesOutlined />
            <span>Code (git)</span>
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
            { title: "Repository", render: ([repo]) => <Text strong>{repo}</Text> },
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
              title: "State",
              render: ([, info]) =>
                info?.dirty ? (
                  <Tag color="orange">uncommitted changes</Tag>
                ) : (
                  <Tag color="green">clean</Tag>
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
                <span>Execution environment</span>
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
              <Empty description="Environment not recorded." />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <SafetyCertificateOutlined />
                <span>Seeds and determinism parameters</span>
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
              <Empty description="No determinism parameter declared for this run." />
            )}
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <Space>
            <ExperimentOutlined />
            <span>Tools</span>
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
            { title: "Tool", dataIndex: "nome" },
            {
              title: "Available version",
              dataIndex: "versaoDisponivel",
              render: (v) => v || <Text type="secondary">not detected</Text>,
            },
            {
              title: "Invoked in this run",
              dataIndex: "foiInvocada",
              render: (v, r) =>
                v ? (
                  <Tag color="blue">{r.execucoes} run(s)</Tag>
                ) : (
                  <Tag>no</Tag>
                ),
            },
            { title: "Model / strategy", dataIndex: "resumo" },
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
            <span>Artifact integrity (SHA-256)</span>
          </Space>
        }
        size="small"
      >
        <Collapse
          defaultActiveKey={entradas.length > 0 ? ["entradas"] : []}
          items={[
            {
              key: "entradas",
              label: `Inputs (${entradas.length})`,
              children: (
                <Table
                  size="small"
                  rowKey="caminho"
                  dataSource={entradas}
                  pagination={false}
                  columns={[
                    {
                      title: "Path",
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
              label: `Outputs (${saidas.length}${filtroSaidas ? ` of ${Object.keys(manifest.outputs_sha256 || {}).length}` : ""})`,
              children: (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Input.Search
                    allowClear
                    placeholder="Filter by path"
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
                        title: "Path",
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

      <Card
        title="Workflow parameters"
        size="small"
        extra={
          manifest.params && (
            <Tooltip title={paramsBruto ? "View as summary" : "View raw JSON"}>
              <Button
                size="small"
                icon={paramsBruto ? <PartitionOutlined /> : <FileTextOutlined />}
                onClick={() => setParamsBruto((v) => !v)}
              >
                {paramsBruto ? "Summary" : "Raw"}
              </Button>
            </Tooltip>
          )
        }
      >
        {manifest.params ? (
          paramsBruto ? (
            <JsonViewer data={manifest.params} nomeArquivo="params" />
          ) : (
            <Descriptions bordered column={1} size="small">
              {Object.entries(manifest.params).map(([chave, valor]) => (
                <Descriptions.Item key={chave} label={capitalizarPalavras(chave)}>
                  {renderValorParametro(valor)}
                </Descriptions.Item>
              ))}
            </Descriptions>
          )
        ) : (
          <Empty description="No parameters recorded." />
        )}
      </Card>

      <Collapse
        items={[
          {
            key: "bruto",
            label: "Raw manifest",
            extra: (
              <Tooltip title={manifestoResumo ? "View raw JSON" : "View as summary"}>
                <Button
                  size="small"
                  icon={manifestoResumo ? <FileTextOutlined /> : <PartitionOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setManifestoResumo((v) => !v);
                  }}
                >
                  {manifestoResumo ? "Raw" : "Summary"}
                </Button>
              </Tooltip>
            ),
            children: manifestoResumo ? (
              <Descriptions bordered column={1} size="small">
                {Object.entries(manifest).map(([chave, valor]) => (
                  <Descriptions.Item key={chave} label={capitalizarPalavras(chave)}>
                    {renderValorParametro(valor)}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            ) : (
              <JsonViewer data={manifest} nomeArquivo="manifest.json" />
            ),
          },
        ]}
      />
    </Space>
  );
};

export default ProvenanceView;
