import React, { useEffect, useMemo, useState } from "react";
import { Alert, Select, Space, Tag, Tooltip, Typography } from "antd";
import { InfoCircleOutlined, WarningOutlined } from "@ant-design/icons";

const { Text } = Typography;
const { Option } = Select;

const API_BASE_URL = "http://localhost:8000";

/**
 * Escolha do alinhador múltiplo, com aviso de viabilidade.
 *
 * A política é **avisar, não bloquear**. Cada alinhador aparece com o estado
 * que tem para *este* conjunto, e o inviável mostra o motivo — mas continua
 * selecionável.
 *
 * A razão de não bloquear: bloquear remove agência de quem sabe o que está
 * fazendo, e os limites declarados são conservadores, alguns nem medidos ainda.
 * A razão de não substituir em silêncio, que seria a outra saída fácil: é
 * exatamente o defeito D1 — o pipeline trocava Clustal Omega por MAFFT
 * mantendo o nome de arquivo, e metade dos "pipelines" dos experimentos de
 * Variola viraram cópias byte a byte sem que ninguém percebesse. Informar antes
 * é o meio-termo que preserva as duas coisas.
 */
const AlignerSelect = ({ value, onChange, datasetPath }) => {
  const [alinhadores, setAlinhadores] = useState([]);
  const [viabilidade, setViabilidade] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let cancelado = false;
    fetch(`${API_BASE_URL}/api/aligners`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => !cancelado && setAlinhadores(d.aligners || []))
      .catch((e) => !cancelado && setErro(e.message));
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (!datasetPath) {
      setViabilidade(null);
      return undefined;
    }
    let cancelado = false;
    fetch(`${API_BASE_URL}/api/aligners/viability?path=${encodeURIComponent(datasetPath)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => !cancelado && setViabilidade(d))
      .catch(() => !cancelado && setViabilidade(null));
    return () => {
      cancelado = true;
    };
  }, [datasetPath]);

  const porChave = useMemo(() => {
    const mapa = {};
    (viabilidade?.aligners || []).forEach((v) => {
      mapa[v.aligner] = v;
    });
    return mapa;
  }, [viabilidade]);

  const escolhido = porChave[value];
  const inviavelEscolhido = escolhido && !escolhido.viable;

  if (erro) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Não foi possível listar os alinhadores"
        description={`${erro}. A escolha continua disponível, sem verificação de viabilidade.`}
      />
    );
  }

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={6}>
      <Select
        value={value}
        onChange={onChange}
        style={{ width: "100%" }}
        optionLabelProp="label"
      >
        {alinhadores.map((a) => {
          const v = porChave[a.key];
          const inviavel = v && !v.viable;
          const ausente = !a.installed;
          return (
            <Option key={a.key} value={a.key} label={a.label}>
              <Space>
                <span style={{ opacity: inviavel || ausente ? 0.55 : 1 }}>{a.label}</span>
                {a.version && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {a.version}
                  </Text>
                )}
                {ausente && <Tag color="default">não instalado</Tag>}
                {!ausente && inviavel && <Tag color="warning">acima do limite</Tag>}
              </Space>
            </Option>
          );
        })}
      </Select>

      {viabilidade && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          <InfoCircleOutlined />{" "}
          {viabilidade.dataset.n_sequences} sequências, maior com{" "}
          {viabilidade.dataset.max_sequence_bp.toLocaleString("pt-BR")} pb
          {viabilidade.machine?.memory_bytes && (
            <>
              {" · esta máquina: "}
              {(viabilidade.machine.memory_bytes / 1e9).toFixed(0)} GB
              {viabilidade.machine.cpu_count
                ? `, ${viabilidade.machine.cpu_count} núcleos`
                : ""}
            </>
          )}
        </Text>
      )}

      {inviavelEscolhido && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message={`${
            alinhadores.find((a) => a.key === value)?.label || value
          } pode não concluir neste conjunto`}
          description={
            <>
              <div>{escolhido.reasons.join(" · ")}</div>
              {escolhido.estimated_bytes && (
                <div style={{ marginTop: 6 }}>
                  Requisito estimado:{" "}
                  <strong>
                    ~{(escolhido.estimated_bytes / 1e9).toFixed(1)} GB
                  </strong>
                  {escolhido.available_bytes && (
                    <>
                      {" · disponível aqui: "}
                      {(escolhido.available_bytes / 1e9).toFixed(0)} GB
                    </>
                  )}
                  {!escolhido.estimate_is_fitted && (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {" "}
                      (ordem de grandeza; a curva ainda não foi ajustada)
                    </Text>
                  )}
                </div>
              )}
              <div style={{ marginTop: 6 }}>
                Este limite é <strong>desta máquina</strong>, não da ferramenta — numa
                máquina com mais memória o mesmo conjunto pode concluir.
              </div>
              <div style={{ marginTop: 6 }}>
                A escolha continua sua — a execução <strong>não</strong> troca de alinhador
                por conta própria. Se falhar, o motivo fica registrado no manifesto.
              </div>
            </>
          }
        />
      )}

      {escolhido && !escolhido.installed && (
        <Alert
          type="error"
          showIcon
          message="Ferramenta ausente nesta máquina"
          description="Rode `bash scripts/check_dependencies.sh --install` antes de executar o experimento."
        />
      )}
    </Space>
  );
};

export default AlignerSelect;
