import { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  Space,
  Typography,
  Slider,
  Alert,
  Tag,
  Flex,
} from "antd";
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  EyeOutlined,
  BgColorsOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import Layout from "antd/es/layout/layout";
import EntropyChart from "./msaComponents/EntropyChart";
import MultiQCStats from "./msaComponents/MultiQCStats";
import { sortSequencesBySimilarity } from "./utils/bioUtils";

const { Text } = Typography;

const MSAViewer = ({ data, onSequenceSelect }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [conservationData, setConservationData] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [colorScheme, setColorScheme] = useState("nucleotide");
  const [zoom, setZoom] = useState(1);
  const [showConsensus, setShowConsensus] = useState(true);
  const [error, setError] = useState(null);
  const [scrollPosition, setScrollPosition] = useState({ top: 0, left: 0 });
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });
  const [reportData, setReportData] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const scrollStartRef = useRef({ top: 0, left: 0 });

  const universalAlignmentParser = (fileContent) => {
    const lines = fileContent.trim().split("\n");

    if (lines[0].toUpperCase().includes("CLUSTAL")) {
      const sequenceData = {};
      const sequenceLines = lines
        .slice(1)
        .filter(
          (line) =>
            line.trim() &&
            !line.startsWith("*") &&
            !line.startsWith(":") &&
            !line.startsWith("."),
        );

      for (const line of sequenceLines) {
        const parts = line.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
          const id = parts[0];
          const seqPart = parts[1];
          if (sequenceData[id]) {
            sequenceData[id] += seqPart;
          } else {
            sequenceData[id] = seqPart;
          }
        }
      }

      const parsedSequences = Object.entries(sequenceData).map(
        ([id, sequence]) => ({ id, sequence }),
      );
      if (parsedSequences.length === 0)
        throw new Error("Formato CLUSTAL inválido ou sem sequências.");
      return parsedSequences;
    } else {
      const sequences = [];
      let currentSeq = null;
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith(">")) {
          if (currentSeq) sequences.push(currentSeq);

          const header = trimmedLine.substring(1).trim();

          const [id, ...rest] = header.split(" ");
          const subtitle = rest.join(" ");

          currentSeq = {
            id: id,
            subtitle: subtitle,
            sequence: "",
          };
        } else if (currentSeq && trimmedLine) {
          currentSeq.sequence += trimmedLine.toUpperCase();
        }
      }
      if (currentSeq) sequences.push(currentSeq);

      if (sequences.length === 0)
        throw new Error("Nenhuma sequência FASTA válida encontrada.");
      return sequences;
    }
  };

  const nucleotideColors = {
    A: "#FF8686",
    T: "#4ECDC4",
    G: "#45B7D1",
    C: "#96CEB4",
    U: "#4ECDC4",
    "-": "#E0E0E0",
    N: "#FFA07A",
  };

  useEffect(() => {
    if (!data) return;
    try {
      // 1. Parse do arquivo
      const parsedResults = universalAlignmentParser(data);

      if (parsedResults.length > 0) {
        // 2. Agrupamento por Similaridade (Executa apenas quando 'data' muda)
        const sorted = sortSequencesBySimilarity(parsedResults);

        // 3. Cálculo de Conservação baseado no novo dataset
        const conservation = calculateConservation(sorted);

        // 4. Atualização Única de Estados
        setSequences(sorted);
        setConservationData(conservation);

        // 5. Geração do Report (QC)
        generateReport(sorted, conservation);
      }
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Erro ao analisar o arquivo: " + err.message);
    }
  }, [data]);

  useEffect(() => {
    const animationFrameId = requestAnimationFrame(renderAlignment);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    sequences,
    colorScheme,
    zoom,
    showConsensus,
    scrollPosition,
    conservationData,
  ]);

  const calculateConservation = (seqs) => {
    if (!seqs || seqs.length === 0) return [];
    const maxLength = Math.max(...seqs.map((s) => s.sequence.length));
    const conservationScores = [];
    for (let i = 0; i < maxLength; i++) {
      const counts = {};
      let total = 0,
        gaps = 0;
      seqs.forEach((seq) => {
        const char = seq.sequence[i] || "-";
        if (char === "-") gaps++;
        else counts[char] = (counts[char] || 0) + 1;
        total++;
      });
      let entropy = 0;
      const nonGapTotal = total - gaps;
      if (nonGapTotal > 0) {
        Object.values(counts).forEach((count) => {
          const p = count / nonGapTotal;
          if (p > 0) entropy -= p * Math.log2(p);
        });
      }
      const maxEntropy = colorScheme === "nucleotide" ? 2 : 4.3;
      const conservation = Math.max(0, 1 - entropy / maxEntropy);
      conservationScores.push({ gap: gaps / total, conservation });
    }
    return conservationScores;
  };

  const handleMouseDown = (e) => {
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY };
    scrollStartRef.current = { ...scrollPosition };
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
  };

  const handleMouseMove = (e) => {
    if (!isPanning) return;

    requestAnimationFrame(() => {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;

      const container = containerRef.current;
      if (!container) return;

      const maxScrollLeft = contentSize.width - container.clientWidth;
      const maxScrollTop = contentSize.height - container.clientHeight;

      const newScrollLeft = Math.max(
        0,
        Math.min(scrollStartRef.current.left - dx, maxScrollLeft),
      );
      const newScrollTop = Math.max(
        0,
        Math.min(scrollStartRef.current.top - dy, maxScrollTop),
      );

      setScrollPosition({ top: newScrollTop, left: newScrollLeft });
    });
  };

  const handleMouseUpOrLeave = () => {
    if (isPanning) {
      setIsPanning(false);
      if (canvasRef.current) canvasRef.current.style.cursor = "grab";
    }
  };

  const calculateConsensus = () => {
    if (sequences.length === 0) return "";

    const maxLength = Math.max(...sequences.map((s) => s.sequence.length));
    let consensus = "";

    for (let i = 0; i < maxLength; i++) {
      const counts = {};
      sequences.forEach((seq) => {
        const char = seq.sequence[i] || "-";
        counts[char] = (counts[char] || 0) + 1;
      });

      let maxCount = 0;
      let consensusChar = "-";
      Object.entries(counts).forEach(([char, count]) => {
        if (count > maxCount && char !== "-") {
          maxCount = count;
          consensusChar = char;
        }
      });

      if (maxCount / sequences.length > 0.5) {
        consensus += consensusChar;
      } else {
        consensus += ".";
      }
    }
    return consensus;
  };

  const renderAlignment = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || sequences.length === 0) return;

    const ctx = canvas.getContext("2d");
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const charWidth = 12 * zoom;
    const charHeight = 20 * zoom;
    const labelWidth = 150;
    const rulerHeight = 20;
    const conservationBarHeight = 40;
    const minimapHeight = 40;
    const consensusHeight = showConsensus ? charHeight : 0;
    const topReservedSpace = rulerHeight + conservationBarHeight + 20;
    const bottomReservedSpace = minimapHeight + consensusHeight + 20;
    const alignmentHeight =
      canvas.height - topReservedSpace - bottomReservedSpace;

    const totalContentWidth = labelWidth + conservationData.length * charWidth;
    const totalContentHeight = sequences.length * charHeight;

    setContentSize({ width: totalContentWidth, height: totalContentHeight });

    const maxScrollLeft = Math.max(0, totalContentWidth - canvas.width);
    const maxScrollTop = Math.max(0, totalContentHeight - alignmentHeight);
    const currentScrollLeft = Math.min(scrollPosition.left, maxScrollLeft);
    const currentScrollTop = Math.min(scrollPosition.top, maxScrollTop);
    const spacing = 10;
    const startChar = Math.floor(currentScrollLeft / charWidth);
    const startSeq = Math.floor(currentScrollTop / charHeight);
    const offsetX = -(currentScrollLeft % charWidth);
    const offsetY = -(currentScrollTop % charHeight);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.rect(
      labelWidth,
      0,
      canvas.width - labelWidth,
      topReservedSpace - spacing,
    );
    ctx.clip();
    for (let i = 0; i < conservationData.length; i++) {
      const x = labelWidth + i * charWidth - currentScrollLeft;
      if (x < labelWidth - charWidth || x > canvas.width) continue;

      const dataPoint = conservationData[i];
      ctx.fillStyle = "rgba(42, 157, 143, 0.6)";
      ctx.fillRect(
        x,
        topReservedSpace -
          spacing -
          dataPoint.conservation * conservationBarHeight,
        charWidth,
        dataPoint.conservation * conservationBarHeight,
      );
      ctx.fillStyle = "rgb(0, 0, 0,0.6)";

      ctx.fillRect(
        x,
        topReservedSpace - spacing - dataPoint.gap * conservationBarHeight,
        charWidth,
        1,
      );

      if ((i + 1) % 10 === 1 || (charWidth > 10 && (i + 1) % 5 === 1)) {
        ctx.fillStyle = "#333";
        ctx.font = "10px sans-serif";
        ctx.fillText(String(i + 1), x, rulerHeight - 5);
      }
    }
    ctx.restore();

    // ctx.fillStyle = '#FFFECAFF';
    // ctx.font = '10px sans-serif';
    // ctx.fillText('1.0', labelWidth - 25, rulerHeight + 5);
    // ctx.fillText('0.5', labelWidth - 25, rulerHeight + conservationBarHeight / 2);
    // ctx.fillText('0.0', labelWidth - 25, topReservedSpace - 2);

    ctx.save();
    ctx.strokeStyle = "#aaa";
    ctx.lineWidth = 1;
    ctx.textAlign = "right";

    const axisX = labelWidth - 8;

    ctx.beginPath();
    ctx.moveTo(axisX, rulerHeight);
    ctx.lineTo(axisX, topReservedSpace - spacing);
    ctx.stroke();

    const tickCount = 2;
    for (let i = 0; i <= tickCount; i++) {
      const value = i / tickCount;
      const yPos = topReservedSpace - spacing - value * conservationBarHeight;

      ctx.beginPath();
      ctx.moveTo(axisX, yPos);
      ctx.lineTo(axisX - 4, yPos);
      ctx.stroke();

      ctx.fillStyle = "#333";
      ctx.font = "10px sans-serif";
      ctx.fillText(value.toFixed(1), axisX - 8, yPos + 3);
    }

    ctx.restore();

    // Legenda de Conservação
    ctx.fillStyle = "rgba(42, 157, 143, 0.6)";
    ctx.fillRect(5, rulerHeight + 5, 10, 10);
    ctx.fillStyle = "#333";
    ctx.font = "10px sans-serif";
    ctx.fillText("Conservation", 20, rulerHeight + 13);

    // Legenda de Gaps
    ctx.fillStyle = "rgb(0,0,0, 0.6)";
    ctx.fillRect(5, rulerHeight + 25, 10, 10);
    ctx.fillStyle = "#333";
    ctx.fillText("Gaps", 20, rulerHeight + 33);

    ctx.save();
    ctx.rect(
      labelWidth,
      topReservedSpace,
      canvas.width - labelWidth,
      alignmentHeight,
    );
    ctx.clip();
    const visibleSeqs = Math.ceil(alignmentHeight / charHeight) + 1;
    for (let i = 0; i < visibleSeqs; i++) {
      const seqIdx = startSeq + i;
      if (seqIdx >= sequences.length) break;
      const seq = sequences[seqIdx];
      const y = topReservedSpace + i * charHeight + offsetY;
      for (let j = 0; j < conservationData.length; j++) {
        const x = labelWidth + j * charWidth - currentScrollLeft;
        if (x < labelWidth - charWidth || x > canvas.width) continue;

        const char = seq.sequence[j] || "-";
        const colors =
          colorScheme === "nucleotide" ? nucleotideColors : aminoacidColors;
        ctx.fillStyle = colors[char] || "#F3F4F6";
        ctx.fillRect(x, y, charWidth, charHeight);

        if (zoom > 0.5) {
          ctx.fillStyle = "#000";
          ctx.font = `${10 * zoom}px monospace`;
          ctx.fillText(char, x + charWidth * 0.3, y + charHeight * 0.7);
        }
      }
    }
    ctx.restore();

    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, topReservedSpace, labelWidth, alignmentHeight);
    for (let i = 0; i < visibleSeqs; i++) {
      const seqIdx = startSeq + i;
      if (seqIdx >= sequences.length) break;
      const seq = sequences[seqIdx];
      const y = topReservedSpace + i * charHeight + offsetY;
      ctx.fillStyle = "#374151";
      ctx.font = "12px monospace";

      let originalPos = -1;
      for (let k = 0; k < startChar; k++) {
        if (seq.sequence[k] !== "-") originalPos++;
      }
      ctx.fillText(`${seq.id.substring(0, 15)}`, 5, y + charHeight * 0.7);
      ctx.fillStyle = "#888";
      ctx.fillText(
        `(${originalPos + 1})`,
        labelWidth - 30,
        y + charHeight * 0.7,
      );
    }

    if (showConsensus) {
      const y = topReservedSpace + alignmentHeight + 20;
      const consensus = calculateConsensus();
      ctx.fillStyle = "#fafafa";
      ctx.fillRect(0, y, labelWidth, charHeight);
      ctx.fillStyle = "#374151";
      ctx.font = "bold 12px monospace";
      ctx.fillText("Consensus", 5, y + charHeight * 0.7);
      for (let j = 0; j < conservationData.length; j++) {
        const x = labelWidth + j * charWidth - currentScrollLeft;
        if (x < labelWidth - charWidth || x > canvas.width) continue;
        const char = consensus[j] || "-";
        ctx.fillStyle = "#E5E7EB";
        ctx.fillRect(x, y, charWidth, charHeight);
        ctx.fillStyle = "#000";
        ctx.font = `bold ${10 * zoom}px monospace`;
        ctx.fillText(char, x + charWidth * 0.3, y + charHeight * 0.7);
      }
    }

    const minimapY = canvas.height - minimapHeight - 5;
    const minimapWidth = canvas.width - labelWidth;
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(labelWidth, minimapY + 10, minimapWidth, minimapHeight);

    if (totalContentWidth > 0) {
      const visibleRatio = (canvas.width - labelWidth) / totalContentWidth;
      const scrollRatio = currentScrollLeft / totalContentWidth;

      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.fillRect(
        labelWidth + scrollRatio * minimapWidth,
        minimapY + 10,
        visibleRatio * minimapWidth,
        minimapHeight,
      );
    }
  };

  const handleCanvasClick = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const charWidth = 12 * zoom;
    const charHeight = 20 * zoom;
    const labelWidth = 150;

    if (x > labelWidth) {
      const charIdx = Math.floor(
        (x - labelWidth + scrollPosition.left) / charWidth,
      );
      const seqIdx = Math.floor((y + scrollPosition.top) / charHeight);

      if (seqIdx < sequences.length && onSequenceSelect) {
        onSequenceSelect({
          sequence: sequences[seqIdx],
          position: charIdx,
        });
      }
    }
  };

  const generateReport = (seqs, conservation) => {
    const len = seqs[0].sequence.length;
    const gcContents = seqs.map((s) => {
      const gc = (s.sequence.match(/[GC]/g) || []).length;
      return (gc / s.sequence.length) * 100;
    });

    const avgIdentity = calculateAverageIdentity(seqs);
    const totalGapScore = conservation.reduce((a, b) => a + b.gap, 0);

    setReportData({
      avgGC: (gcContents.reduce((a, b) => a + b, 0) / seqs.length).toFixed(2),
      avgIdentity: (avgIdentity * 100).toFixed(2),
      gapContent: ((totalGapScore / len) * 100).toFixed(2),
    });
  };

  const calculateAverageIdentity = (seqs) => {
    if (seqs.length < 2) return 1;
    // Amostragem simples para performance (comparando pares adjacentes)
    let totalId = 0;
    for (let i = 0; i < seqs.length - 1; i++) {
      let matches = 0;
      for (let j = 0; j < seqs[i].sequence.length; j++) {
        if (seqs[i].sequence[j] === seqs[i + 1].sequence[j]) matches++;
      }
      totalId += matches / seqs[i].sequence.length;
    }
    return totalId / (seqs.length - 1);
  };

  const downloadAlignmentSingleCapture = () => {
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = `MSA_single_alignment_export_${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const downloadAlignmentCompleteCapture = () => {
    if (sequences.length === 0) return;

    // --- Configurações do Wrap Mode ---
    const basesPerLine = 60; // Quantas bases por bloco (igual ao padrão FASTA)
    const charWidth = 24; // Largura fixa para exportação nítida
    const charHeight = 18; // Altura da linha da sequência
    const labelWidth = 200; // Espaço para o ID da sequência
    const blockPadding = 30; // Espaço entre os blocos verticais

    const totalBases = sequences[0].sequence.length;
    const numBlocks = Math.ceil(totalBases / basesPerLine);
    const sequencesPerBlock = sequences.length;

    // Cálculo da altura de um bloco (Sequências + Margem)
    const blockHeight = sequencesPerBlock * charHeight + blockPadding;

    // Dimensões finais do Canvas
    const canvasWidth = labelWidth + basesPerLine * charWidth + 50;
    const canvasHeight = numBlocks * blockHeight + 50;

    const offCanvas = document.createElement("canvas");
    offCanvas.width = canvasWidth;
    offCanvas.height = canvasHeight;
    const ctx = offCanvas.getContext("2d");

    // Fundo Branco
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Iterar por cada bloco (segmento da sequência)
    for (let b = 0; b < numBlocks; b++) {
      const startBase = b * basesPerLine;
      const endBase = Math.min(startBase + basesPerLine, totalBases);
      const blockYOffset = b * blockHeight + 20;

      // Desenhar cada sequência dentro deste bloco
      sequences.forEach((seq, i) => {
        const y = blockYOffset + i * charHeight;

        // 1. Nome da Sequência e Coordenadas (Ex: 156-208)
        ctx.fillStyle = "#333333";
        ctx.font = "italic 11px Arial";
        const rangeText = `${startBase + 1}-${endBase}`;
        ctx.fillText(seq.id.substring(0, 25), 10, y + charHeight * 0.7);
        ctx.fillText(rangeText, labelWidth - 40, y + charHeight * 0.7);

        // 2. Desenhar as Bases do Segmento
        for (let j = startBase; j < endBase; j++) {
          const char = seq.sequence[j] || "-";
          const x = labelWidth + (j - startBase) * charWidth;

          // Usar o esquema de cores atual do seu código
          const colors =
            colorScheme === "nucleotide" ? nucleotideColors : aminoacidColors;
          ctx.fillStyle = colors[char] || "#F3F4F6";

          // Desenha o box colorido
          ctx.fillRect(x, y, charWidth, charHeight);

          // Desenha a letra
          ctx.fillStyle = "#000000";
          ctx.font = "bold 10px Monospace";
          ctx.textAlign = "center";
          ctx.fillText(char, x + charWidth / 2, y + charHeight * 0.7);
          ctx.textAlign = "left";
        }
      });

      // Linha separadora discreta entre blocos
      ctx.strokeStyle = "#eeeeee";
      ctx.beginPath();
      ctx.moveTo(10, blockYOffset + blockHeight - 10);
      ctx.lineTo(canvasWidth - 10, blockYOffset + blockHeight - 10);
      ctx.stroke();
    }

    // Executar Download
    const link = document.createElement("a");
    link.download = `MSA_complete_alignment_wrapped_${Date.now()}.png`;
    link.href = offCanvas.toDataURL("image/png");
    link.click();
  };

  return (
    <Layout>
      <Card
        title="Alignment"
        style={{ height: "100%", display: "flex", flexDirection: "column" }}
        styles={{ flex: 1, overflow: "hidden", padding: "16px" }}
        extra={
          <Flex align="center" gap="large">
            <Space>
              <Text strong>
                <BgColorsOutlined />
              </Text>
              <Button
                onClick={() => setColorScheme("nucleotide")}
                type={colorScheme === "nucleotide" ? "primary" : "default"}
                size="small"
              >
                Nucleotídeo
              </Button>

              <Button
                icon={<DownloadOutlined />}
                onClick={downloadAlignmentSingleCapture}
                type="default"
                size="small"
              >
                Export current capture 
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={downloadAlignmentCompleteCapture}
                type="default"
                size="small"
              >
                Export complete capture 
              </Button>
            </Space>
            <Button
              icon={<EyeOutlined />}
              onClick={() => setShowConsensus(!showConsensus)}
              type={showConsensus ? "primary" : "default"}
              size="small"
            >
              Consensus
            </Button>
            <Space>
              <ZoomOutOutlined />
              <Slider
                value={zoom}
                onChange={setZoom}
                min={0.5}
                max={2}
                step={0.1}
                style={{ width: "120px" }}
              />
              <ZoomInOutlined />
            </Space>
          </Flex>
        }
      >
        {error && (
          <Alert
            message="Erro"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {!error && sequences.length > 0 && (
          <>
            <div
              ref={containerRef}
              style={{ height: "45vh", width: "100%", overflow: "hidden" }}
            >
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                style={{ cursor: "grab" }}
              />
            </div>
            <div style={{ paddingTop: "16px" }}>
              <Tag>Sequences: {sequences.length}</Tag>
              <Tag>
                Length:{" "}
                {sequences.length > 0 ? sequences[0].sequence.length : 0}
              </Tag>
            </div>
            <span style={{ color: "white", fontSize: "8@px" }}>
              By Aissa S. Cezario Desiderio
            </span>
            {reportData && (
              <Card
                size="small"
                title="Quality Report (QC Summary)"
                style={{ marginTop: 16 }}
              >
                <Flex justify="space-around">
                  <div style={{ textAlign: "center" }}>
                    <Text type="secondary">Average</Text>
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: "bold",
                        color:
                          reportData.avgIdentity > 70 ? "#52c41a" : "#faad14",
                      }}
                    >
                      {reportData.avgIdentity}%
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <Text type="secondary">GC Content</Text>
                    {/* No FastQC, conteúdo GC (módulo "Conteúdo GC por sequência")Mede a porcentagem de bases de guanina (G) e citosina (C) em cada sequência lida. */}
                    <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                      {reportData.avgGC}%
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <Text type="secondary">Total Gaps</Text>
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: "bold",
                        color: reportData.gapContent > 20 ? "#ff4d4f" : "#333",
                      }}
                    >
                      {reportData.gapContent}%
                    </div>
                  </div>
                </Flex>
                {/* <EntropyChart
                  data={conservationData.map((d, i) => ({ ...d, index: i }))}
                /> */}
                <MultiQCStats sequences={sequences} />
              </Card>
            )}
          </>
        )}
      </Card>
    </Layout>
  );
};

export default MSAViewer;
