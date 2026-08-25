import React, { useMemo, useState } from "react";
import { Button, Input, Space, Tooltip, Typography, message } from "antd";
import {
  CaretDownOutlined,
  CaretRightOutlined,
  CopyOutlined,
  FileTextOutlined,
  PartitionOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

const MONO = "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace";

const COR = {
  chave: "#1d5e77",
  texto: "#2e6b4f",
  numero: "#8a5d10",
  booleano: "#8e3a2e",
  nulo: "#8a958e",
  meta: "#8a958e",
};

/** Rótulo do tipo, para quem lê um manifesto e quer saber o que é cada campo. */
function resumir(valor) {
  if (Array.isArray(valor)) return `[${valor.length}]`;
  if (valor && typeof valor === "object") {
    const n = Object.keys(valor).length;
    return `{${n}}`;
  }
  return null;
}

function Primitivo({ valor }) {
  if (valor === null) return <span style={{ color: COR.nulo, fontStyle: "italic" }}>null</span>;
  if (typeof valor === "boolean") return <span style={{ color: COR.booleano }}>{String(valor)}</span>;
  if (typeof valor === "number") return <span style={{ color: COR.numero }}>{valor}</span>;
  return <span style={{ color: COR.texto }}>&quot;{String(valor)}&quot;</span>;
}

/**
 * Um nó da árvore JSON. Ramos abrem e fecham; folhas mostram o valor.
 *
 * `profundidadeAberta` existe porque um manifesto tem uma dúzia de chaves de
 * primeiro nível e centenas de hashes dentro de `outputs_sha256`: abrir tudo
 * seria ilegível, e abrir nada obrigaria a clicar antes de ver qualquer coisa.
 */
function No({ chave, valor, nivel, profundidadeAberta, filtro }) {
  const ehRamo = valor !== null && typeof valor === "object";
  const [aberto, setAberto] = useState(nivel < profundidadeAberta);

  const entradas = useMemo(() => {
    if (!ehRamo) return [];
    return Array.isArray(valor)
      ? valor.map((v, i) => [String(i), v])
      : Object.entries(valor);
  }, [valor, ehRamo]);

  const casaFiltro = useMemo(() => {
    if (!filtro) return true;
    const alvo = filtro.toLowerCase();
    if (String(chave).toLowerCase().includes(alvo)) return true;
    try {
      return JSON.stringify(valor).toLowerCase().includes(alvo);
    } catch {
      return false;
    }
  }, [chave, valor, filtro]);

  if (!casaFiltro) return null;

  const recuo = { paddingLeft: nivel === 0 ? 0 : 14 };

  if (!ehRamo) {
    return (
      <div style={{ ...recuo, lineHeight: 1.7 }}>
        <span style={{ color: COR.chave, fontWeight: 600 }}>{chave}</span>
        <span style={{ color: COR.meta }}>: </span>
        <Primitivo valor={valor} />
      </div>
    );
  }

  return (
    <div style={recuo}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setAberto((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setAberto((v) => !v);
          }
        }}
        style={{ cursor: "pointer", lineHeight: 1.7, userSelect: "none" }}
      >
        {aberto ? <CaretDownOutlined /> : <CaretRightOutlined />}{" "}
        <span style={{ color: COR.chave, fontWeight: 600 }}>{chave}</span>{" "}
        <span style={{ color: COR.meta, fontSize: 12 }}>{resumir(valor)}</span>
      </div>
      {aberto &&
        entradas.map(([k, v]) => (
          <No
            key={k}
            chave={k}
            valor={v}
            nivel={nivel + 1}
            profundidadeAberta={profundidadeAberta}
            filtro={filtro}
          />
        ))}
    </div>
  );
}

/**
 * Leitor de JSON genérico do explorador de arquivos.
 *
 * Existe para que `manifest.json`, `config_backup.json` e qualquer outro JSON
 * de configuração sejam legíveis sem sair da aplicação. Antes, o explorador só
 * sabia abrir o `metadata.json`: todo JSON com raiz de objeto respondia 404
 * dizendo que o arquivo estava vazio.
 */
const JsonViewer = ({ data, nomeArquivo, profundidadeAberta = 2 }) => {
  const [bruto, setBruto] = useState(false);
  const [filtro, setFiltro] = useState("");

  const textoBruto = useMemo(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return "";
    }
  }, [data]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(textoBruto);
      message.success("JSON copiado.");
    } catch {
      message.error("O navegador bloqueou o acesso à área de transferência.");
    }
  };

  const entradas = useMemo(() => {
    if (data === null || typeof data !== "object") return null;
    return Array.isArray(data) ? data.map((v, i) => [String(i), v]) : Object.entries(data);
  }, [data]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
        <Space wrap>
          <Input.Search
            allowClear
            placeholder="Filtrar por chave ou valor"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            style={{ width: 260 }}
            size="small"
          />
          {nomeArquivo && (
            <Text type="secondary" style={{ fontFamily: MONO, fontSize: 12 }}>
              {nomeArquivo}
            </Text>
          )}
        </Space>
        <Space>
          <Tooltip title={bruto ? "Ver como árvore" : "Ver texto bruto"}>
            <Button
              size="small"
              icon={bruto ? <PartitionOutlined /> : <FileTextOutlined />}
              onClick={() => setBruto((v) => !v)}
            >
              {bruto ? "Árvore" : "Bruto"}
            </Button>
          </Tooltip>
          <Tooltip title="Copiar JSON">
            <Button size="small" icon={<CopyOutlined />} onClick={copiar}>
              Copiar
            </Button>
          </Tooltip>
        </Space>
      </Space>

      <div
        style={{
          fontFamily: MONO,
          fontSize: 13,
          maxHeight: "62vh",
          overflow: "auto",
          padding: 12,
          borderRadius: 6,
          border: "1px solid #f0f0f0",
        }}
      >
        {bruto || entradas === null ? (
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {textoBruto}
          </pre>
        ) : (
          entradas.map(([k, v]) => (
            <No
              key={k}
              chave={k}
              valor={v}
              nivel={0}
              profundidadeAberta={profundidadeAberta}
              filtro={filtro}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default JsonViewer;
