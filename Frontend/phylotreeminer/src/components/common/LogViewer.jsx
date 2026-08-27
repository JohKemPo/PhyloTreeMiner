import { useMemo, useState, useRef, useEffect } from "react";
import { Input, Space, Tag, Button, Typography, Empty, Tooltip } from "antd";
import {
  DownOutlined,
  UpOutlined,
  DownloadOutlined,
  CopyOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

/**
 * Visor de `.log` e `.txt`.
 *
 * O que havia era um `<pre>` com o arquivo inteiro dentro. Num log de execução
 * do pipeline — 200 KB, ~2 500 linhas — isso significa achar um erro rolando a
 * tela com o olho, sem número de linha para citar e sem forma de filtrar. E o
 * navegador monta todos os nós de uma vez.
 *
 * Três coisas mudam:
 *
 * 1. **A linha tem número.** É o que permite dizer "linha 1 843" a outra pessoa,
 *    e é o que o log do pipeline não oferecia.
 * 2. **O nível é lido do próprio registro**, no formato que o pipeline grava
 *    (`... - ERROR - ...`), e vira filtro. `STEP:` ganha destaque próprio porque
 *    é o que marca as etapas do workflow.
 * 3. **Só o que está à vista é montado.** O corte é explícito e diz quanto
 *    ficou de fora — nada é escondido em silêncio.
 */

const NIVEIS = {
  ERROR: { cor: "#cf1322", fundo: "rgba(207,19,34,.08)" },
  WARNING: { cor: "#d46b08", fundo: "rgba(212,107,8,.08)" },
  INFO: { cor: "#595959", fundo: "transparent" },
  STEP: { cor: "#1d5e77", fundo: "rgba(29,94,119,.07)" },
};

const LINHAS_POR_PAGINA = 1000;

/** `2026-08-26 15:28:24,453 - INFO - mensagem` */
const REGISTRO = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) - (\w+) - (.*)$/;

function classificar(texto) {
  const achado = REGISTRO.exec(texto);
  if (!achado) return { carimbo: null, nivel: null, mensagem: texto };
  const [, carimbo, nivel, mensagem] = achado;
  // `STEP:` é uma etapa do workflow, não um INFO qualquer — é o que se procura
  // quando se quer saber onde a execução estava.
  const efetivo = mensagem.startsWith("STEP:") ? "STEP" : nivel;
  return { carimbo, nivel: efetivo, mensagem };
}

const LogViewer = ({ content, fileName }) => {
  const [busca, setBusca] = useState("");
  const [nivelAtivo, setNivelAtivo] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [indiceOcorrencia, setIndiceOcorrencia] = useState(0);
  const corpoRef = useRef(null);

  const linhas = useMemo(() => {
    if (!content) return [];
    return content.replace(/\n$/, "").split("\n").map((texto, i) => ({
      numero: i + 1,
      ...classificar(texto),
      texto,
    }));
  }, [content]);

  const contagem = useMemo(() => {
    const c = { ERROR: 0, WARNING: 0, STEP: 0, INFO: 0 };
    linhas.forEach((l) => {
      if (l.nivel && c[l.nivel] !== undefined) c[l.nivel] += 1;
    });
    return c;
  }, [linhas]);

  const filtradas = useMemo(() => {
    const alvo = busca.trim().toLowerCase();
    return linhas.filter(
      (l) =>
        (!nivelAtivo || l.nivel === nivelAtivo) &&
        (!alvo || l.texto.toLowerCase().includes(alvo))
    );
  }, [linhas, busca, nivelAtivo]);

  // Voltar à primeira página ao mudar o recorte: manter a página 7 de um
  // resultado que agora tem 2 mostraria uma tela vazia sem explicação.
  useEffect(() => {
    setPagina(1);
    setIndiceOcorrencia(0);
  }, [busca, nivelAtivo]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / LINHAS_POR_PAGINA));
  const visiveis = filtradas.slice(
    (pagina - 1) * LINHAS_POR_PAGINA,
    pagina * LINHAS_POR_PAGINA
  );

  const irPara = (delta) => {
    if (!filtradas.length) return;
    const proximo =
      (indiceOcorrencia + delta + filtradas.length) % filtradas.length;
    setIndiceOcorrencia(proximo);
    setPagina(Math.floor(proximo / LINHAS_POR_PAGINA) + 1);
    requestAnimationFrame(() => {
      const alvo = corpoRef.current?.querySelector(
        `[data-linha="${filtradas[proximo].numero}"]`
      );
      alvo?.scrollIntoView({ block: "center" });
    });
  };

  const baixar = () => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "log.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!linhas.length) return <Empty description="Arquivo vazio." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Space wrap size={[8, 8]} style={{ justifyContent: "space-between", width: "100%" }}>
        <Space wrap size={[6, 6]}>
          {Object.entries(contagem).map(([nivel, n]) =>
            n > 0 ? (
              <Tag
                key={nivel}
                color={nivelAtivo === nivel ? NIVEIS[nivel].cor : undefined}
                style={{ cursor: "pointer", userSelect: "none" }}
                onClick={() => setNivelAtivo(nivelAtivo === nivel ? null : nivel)}
              >
                {nivel} · {n}
              </Tag>
            ) : null
          )}
          <Text type="secondary" style={{ fontSize: 12 }}>
            {linhas.length.toLocaleString("pt-BR")} linhas
          </Text>
        </Space>

        <Space size={4}>
          <Input.Search
            allowClear
            size="small"
            placeholder="buscar no log"
            style={{ width: 220 }}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <Tooltip title="ocorrência anterior">
            <Button size="small" icon={<UpOutlined />} onClick={() => irPara(-1)} disabled={!filtradas.length} />
          </Tooltip>
          <Tooltip title="próxima ocorrência">
            <Button size="small" icon={<DownOutlined />} onClick={() => irPara(1)} disabled={!filtradas.length} />
          </Tooltip>
          <Tooltip title="copiar o que está filtrado">
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => navigator.clipboard?.writeText(filtradas.map((l) => l.texto).join("\n"))}
            />
          </Tooltip>
          <Tooltip title="baixar o arquivo inteiro">
            <Button size="small" icon={<DownloadOutlined />} onClick={baixar} />
          </Tooltip>
        </Space>
      </Space>

      {(busca || nivelAtivo) && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {filtradas.length.toLocaleString("pt-BR")} de{" "}
          {linhas.length.toLocaleString("pt-BR")} linhas
          {filtradas.length > 0 && ` · ocorrência ${indiceOcorrencia + 1}`}
        </Text>
      )}

      <div
        ref={corpoRef}
        style={{
          maxHeight: "65vh",
          overflow: "auto",
          border: "1px solid #f0f0f0",
          borderRadius: 6,
          fontFamily: "'SFMono-Regular', Consolas, Menlo, monospace",
          fontSize: 12.5,
          lineHeight: 1.55,
        }}
      >
        {visiveis.length === 0 ? (
          <Empty
            style={{ padding: 32 }}
            description="Nenhuma linha corresponde ao filtro."
          />
        ) : (
          visiveis.map((l) => {
            const estilo = l.nivel ? NIVEIS[l.nivel] : null;
            const atual = filtradas[indiceOcorrencia]?.numero === l.numero;
            return (
              <div
                key={l.numero}
                data-linha={l.numero}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "1px 8px",
                  background: atual
                    ? "rgba(250,173,20,.18)"
                    : estilo?.fundo || "transparent",
                }}
              >
                <span
                  style={{
                    color: "#bfbfbf",
                    minWidth: "4.5ch",
                    textAlign: "right",
                    userSelect: "none",
                    flex: "none",
                  }}
                >
                  {l.numero}
                </span>
                <span
                  style={{
                    color: estilo?.cor || "#262626",
                    fontWeight: l.nivel === "ERROR" || l.nivel === "STEP" ? 600 : 400,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {l.texto}
                </span>
              </div>
            );
          })
        )}
      </div>

      {totalPaginas > 1 && (
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {/* O corte é dito em voz alta: um visor que mostra 1 000 de 2 500
                linhas sem avisar é pior que um que mostra tudo devagar. */}
            linhas {(pagina - 1) * LINHAS_POR_PAGINA + 1}–
            {Math.min(pagina * LINHAS_POR_PAGINA, filtradas.length)} de{" "}
            {filtradas.length.toLocaleString("pt-BR")}
          </Text>
          <Space size={4}>
            <Button size="small" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>
              anterior
            </Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {pagina} / {totalPaginas}
            </Text>
            <Button
              size="small"
              disabled={pagina === totalPaginas}
              onClick={() => setPagina(pagina + 1)}
            >
              próxima
            </Button>
          </Space>
        </Space>
      )}
    </div>
  );
};

export default LogViewer;
