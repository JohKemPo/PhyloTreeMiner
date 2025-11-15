import { useEffect, useRef, useState } from 'react'
import { Button, Card, Space, Typography, Slider, Alert, Tag, Flex } from 'antd';
import { ZoomInOutlined, ZoomOutOutlined, EyeOutlined, BgColorsOutlined } from '@ant-design/icons';

const { Text } = Typography;

const MSAViewer = ({ data, onSequenceSelect }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [conservationData, setConservationData] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [colorScheme, setColorScheme] = useState('nucleotide');
  const [zoom, setZoom] = useState(1);
  const [showConsensus, setShowConsensus] = useState(true);
  const [error, setError] = useState(null);
  const [scrollPosition, setScrollPosition] = useState({ top: 0, left: 0 });
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });

  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const scrollStartRef = useRef({ top: 0, left: 0 });

  const nucleotideColors = {
    'A': '#FF6B6B',
    'T': '#4ECDC4',
    'G': '#45B7D1',
    'C': '#96CEB4',
    'U': '#4ECDC4',
    '-': '#E0E0E0',
    'N': '#FFA07A'
  }

  const aminoacidColors = {
    'A': '#C8C8C8', 'R': '#145AFF', 'N': '#00DCDC', 'D': '#E60A0A',
    'C': '#E6E600', 'Q': '#00DCDC', 'E': '#E60A0A', 'G': '#EBEBEB',
    'H': '#8282D2', 'I': '#0F820F', 'L': '#0F820F', 'K': '#145AFF',
    'M': '#E6E600', 'F': '#3232AA', 'P': '#DC9682', 'S': '#FA9600',
    'T': '#FA9600', 'W': '#B45AB4', 'Y': '#3232AA', 'V': '#0F820F',
    '-': '#E0E0E0', 'X': '#BEA06E'
  }

  useEffect(() => {
    if (!data) return;
    try {
      const parsedSequences = universalAlignmentParser(data);
      if (parsedSequences.length > 0) {
        setSequences(parsedSequences);
        setConservationData(calculateConservation(parsedSequences));
      }
      setError(null);
    } catch (err) {
      setError('Erro ao analisar o arquivo de alinhamento: ' + err.message);
    }
  }, [data]);

  useEffect(() => {
    const animationFrameId = requestAnimationFrame(renderAlignment);
    return () => cancelAnimationFrame(animationFrameId);
  }, [sequences, colorScheme, zoom, showConsensus, scrollPosition, conservationData]);



  const calculateConservation = (seqs) => {
    if (!seqs || seqs.length === 0) return [];
    const maxLength = Math.max(...seqs.map(s => s.sequence.length));
    const conservationScores = [];
    for (let i = 0; i < maxLength; i++) {
      const counts = {};
      let total = 0, gaps = 0;
      seqs.forEach(seq => {
        const char = seq.sequence[i] || '-';
        if (char === '-') gaps++;
        else counts[char] = (counts[char] || 0) + 1;
        total++;
      });
      let entropy = 0;
      const nonGapTotal = total - gaps;
      if (nonGapTotal > 0) {
        Object.values(counts).forEach(count => {
          const p = count / nonGapTotal;
          if (p > 0) entropy -= p * Math.log2(p);
        });
      }
      const maxEntropy = colorScheme === 'nucleotide' ? 2 : 4.3;
      const conservation = Math.max(0, 1 - (entropy / maxEntropy));
      conservationScores.push({ gap: gaps / total, conservation });
    }
    return conservationScores;
  };


  const universalAlignmentParser = (fileContent) => {
    const lines = fileContent.trim().split('\n');

    if (lines[0].toUpperCase().includes('CLUSTAL')) {
      const sequenceData = {};
      const sequenceLines = lines.slice(1).filter(line =>
        line.trim() && !line.startsWith('*') && !line.startsWith(':') && !line.startsWith('.')
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

      const parsedSequences = Object.entries(sequenceData).map(([id, sequence]) => ({ id, sequence }));
      if (parsedSequences.length === 0) throw new Error('Formato CLUSTAL inválido ou sem sequências.');
      return parsedSequences;

    } else {
      const sequences = [];
      let currentSeq = null;
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('>')) {
          if (currentSeq) sequences.push(currentSeq);
          currentSeq = { id: trimmedLine.substring(1), sequence: '' };
        } else if (currentSeq && trimmedLine) {
          currentSeq.sequence += trimmedLine.toUpperCase();
        }
      }
      if (currentSeq) sequences.push(currentSeq);

      if (sequences.length === 0) throw new Error('Nenhuma sequência FASTA válida encontrada.');
      return sequences;
    }
  };

  const handleMouseDown = (e) => {
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY };
    scrollStartRef.current = { ...scrollPosition };
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
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

      const newScrollLeft = Math.max(0, Math.min(scrollStartRef.current.left - dx, maxScrollLeft));
      const newScrollTop = Math.max(0, Math.min(scrollStartRef.current.top - dy, maxScrollTop));

      setScrollPosition({ top: newScrollTop, left: newScrollLeft });
    });
  };

  const handleMouseUpOrLeave = () => {
    if (isPanning) {
      setIsPanning(false);
      if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
    }
  };

  const calculateConsensus = () => {
    if (sequences.length === 0) return '';

    const maxLength = Math.max(...sequences.map(s => s.sequence.length));
    let consensus = '';

    for (let i = 0; i < maxLength; i++) {
      const counts = {};
      sequences.forEach(seq => {
        const char = seq.sequence[i] || '-';
        counts[char] = (counts[char] || 0) + 1;
      });

      let maxCount = 0;
      let consensusChar = '-';
      Object.entries(counts).forEach(([char, count]) => {
        if (count > maxCount && char !== '-') {
          maxCount = count;
          consensusChar = char;
        }
      });

      if (maxCount / sequences.length > 0.5) {
        consensus += consensusChar;
      } else {
        consensus += '.';
      }
    }
    return consensus;
  };

  const renderAlignment = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || sequences.length === 0) return;

    const ctx = canvas.getContext('2d');
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
    const alignmentHeight = canvas.height - topReservedSpace - bottomReservedSpace;

    const totalContentWidth = labelWidth + (conservationData.length * charWidth);
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
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.rect(labelWidth, 0, canvas.width - labelWidth, topReservedSpace - spacing);
    ctx.clip();
    for (let i = 0; i < conservationData.length; i++) {
      const x = labelWidth + (i * charWidth) - currentScrollLeft;
      if (x < labelWidth - charWidth || x > canvas.width) continue;

      const dataPoint = conservationData[i];
      ctx.fillStyle = 'rgba(42, 157, 143, 0.6)';
      ctx.fillRect(x, topReservedSpace - spacing - (dataPoint.conservation * conservationBarHeight), charWidth, dataPoint.conservation * conservationBarHeight);
      ctx.fillStyle = 'rgb(0, 0, 0,0.6)';

      ctx.fillRect(x, topReservedSpace - spacing - (dataPoint.gap * conservationBarHeight), charWidth, 1);

      if ((i + 1) % 10 === 1 || (charWidth > 10 && (i + 1) % 5 === 1)) {
        ctx.fillStyle = '#333';
        ctx.font = '10px sans-serif';
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
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1;
    ctx.textAlign = 'right';

    const axisX = labelWidth - 8;

    ctx.beginPath();
    ctx.moveTo(axisX, rulerHeight);
    ctx.lineTo(axisX, topReservedSpace - spacing);
    ctx.stroke();

    const tickCount = 2;
    for (let i = 0; i <= tickCount; i++) {
      const value = i / tickCount;
      const yPos = topReservedSpace - spacing - (value * conservationBarHeight);

      ctx.beginPath();
      ctx.moveTo(axisX, yPos);
      ctx.lineTo(axisX - 4, yPos);
      ctx.stroke();

      ctx.fillStyle = '#333';
      ctx.font = '10px sans-serif';
      ctx.fillText(value.toFixed(1), axisX - 8, yPos + 3);
    }


    ctx.restore();

    // Legenda de Conservação
    ctx.fillStyle = 'rgba(42, 157, 143, 0.6)';
    ctx.fillRect(5, rulerHeight + 5, 10, 10);
    ctx.fillStyle = '#333';
    ctx.font = '10px sans-serif';
    ctx.fillText('Conservation', 20, rulerHeight + 13);

    // Legenda de Gaps
    ctx.fillStyle = 'rgb(0,0,0, 0.6)';
    ctx.fillRect(5, rulerHeight + 25, 10, 10);
    ctx.fillStyle = '#333';
    ctx.fillText('Gaps', 20, rulerHeight + 33);

    ctx.save();
    ctx.rect(labelWidth, topReservedSpace, canvas.width - labelWidth, alignmentHeight);
    ctx.clip();
    const visibleSeqs = Math.ceil(alignmentHeight / charHeight) + 1;
    for (let i = 0; i < visibleSeqs; i++) {
      const seqIdx = startSeq + i;
      if (seqIdx >= sequences.length) break;
      const seq = sequences[seqIdx];
      const y = topReservedSpace + (i * charHeight) + offsetY;
      for (let j = 0; j < conservationData.length; j++) {
        const x = labelWidth + (j * charWidth) - currentScrollLeft;
        if (x < labelWidth - charWidth || x > canvas.width) continue;

        const char = seq.sequence[j] || '-';
        const colors = colorScheme === 'nucleotide' ? nucleotideColors : aminoacidColors;
        ctx.fillStyle = colors[char] || '#F3F4F6';
        ctx.fillRect(x, y, charWidth, charHeight);

        if (zoom > 0.5) {
          ctx.fillStyle = '#000';
          ctx.font = `${10 * zoom}px monospace`;
          ctx.fillText(char, x + charWidth * 0.3, y + charHeight * 0.7);
        }
      }
    }
    ctx.restore();

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, topReservedSpace, labelWidth, alignmentHeight);
    for (let i = 0; i < visibleSeqs; i++) {
      const seqIdx = startSeq + i;
      if (seqIdx >= sequences.length) break;
      const seq = sequences[seqIdx];
      const y = topReservedSpace + (i * charHeight) + offsetY;
      ctx.fillStyle = '#374151';
      ctx.font = '12px monospace';

      let originalPos = -1;
      for (let k = 0; k < startChar; k++) {
        if (seq.sequence[k] !== '-') originalPos++;
      }
      ctx.fillText(`${seq.id.substring(0, 15)}`, 5, y + charHeight * 0.7);
      ctx.fillStyle = '#888';
      ctx.fillText(`(${originalPos + 1})`, labelWidth - 30, y + charHeight * 0.7);
    }

    if (showConsensus) {
      const y = topReservedSpace + alignmentHeight + 20;
      const consensus = calculateConsensus();
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(0, y, labelWidth, charHeight);
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('Consensus', 5, y + charHeight * 0.7);
      for (let j = 0; j < conservationData.length; j++) {
        const x = labelWidth + (j * charWidth) - currentScrollLeft;
        if (x < labelWidth - charWidth || x > canvas.width) continue;
        const char = consensus[j] || '-';
        ctx.fillStyle = '#E5E7EB';
        ctx.fillRect(x, y, charWidth, charHeight);
        ctx.fillStyle = '#000';
        ctx.font = `bold ${10 * zoom}px monospace`;
        ctx.fillText(char, x + charWidth * 0.3, y + charHeight * 0.7);
      }
    }

    const minimapY = canvas.height - minimapHeight - 5;
    const minimapWidth = canvas.width - labelWidth;
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(labelWidth, minimapY + 10, minimapWidth, minimapHeight);

    if (totalContentWidth > 0) {
      const visibleRatio = (canvas.width - labelWidth) / totalContentWidth;
      const scrollRatio = currentScrollLeft / totalContentWidth;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(
        labelWidth + (scrollRatio * minimapWidth),
        minimapY + 10,
        visibleRatio * minimapWidth,
        minimapHeight
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
      const charIdx = Math.floor((x - labelWidth + scrollPosition.left) / charWidth);
      const seqIdx = Math.floor((y + scrollPosition.top) / charHeight);

      if (seqIdx < sequences.length && onSequenceSelect) {
        onSequenceSelect({
          sequence: sequences[seqIdx],
          position: charIdx
        });
      }
    }
  };

  // const handleScroll = (e) => {
  //   requestAnimationFrame(() => {
  //     setScrollPosition({ top: e.target.scrollTop, left: e.target.scrollLeft });
  //   });
  // };

  if (error) {
    return <Alert message="Erro" description={error} type="error" showIcon />;
  };

  return (
    <Card
      title="Alignment"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      styles={{ flex: 1, overflow: 'hidden', padding: '16px' }}
      extra={
        <Flex align="center" gap="large">
          <Space>
            <Text strong><BgColorsOutlined /></Text>
            <Button onClick={() => setColorScheme('nucleotide')} type={colorScheme === 'nucleotide' ? 'primary' : 'default'} size="small">Nucleotídeo</Button>
            {/* <Button onClick={() => setColorScheme('aminoacid')} type={colorScheme === 'aminoacid' ? 'primary' : 'default'} size="small">Aminoácido</Button> */}
          </Space>
          <Button icon={<EyeOutlined />} onClick={() => setShowConsensus(!showConsensus)} type={showConsensus ? 'primary' : 'default'} size="small">
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
              style={{ width: '120px' }}
            />
            <ZoomInOutlined />
          </Space>
        </Flex>
      }
    >
      <div
        ref={containerRef}
        style={{ height: '42vh', width: '100%', overflow: 'hidden' }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          style={{ cursor: 'grab' }}
        />
      </div>
      <div style={{ paddingTop: '16px' }}>
        <Tag>Sequences: {sequences.length}</Tag>
        <Tag>Length: {sequences.length > 0 ? sequences[0].sequence.length : 0}</Tag>
      </div>
      <span style={{color:'white', fontSize:'8@px'}}>By Aissa S. Cezario Desiderio</span>
    </Card>
  );
};

export default MSAViewer;

