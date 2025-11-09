import { useState } from 'react';
import { Layout, Row, Col, Card, Typography, Upload, Button, Tabs} from 'antd';
import { ExperimentOutlined, ShareAltOutlined, InboxOutlined } from '@ant-design/icons';

import PhylogeneticTreeViewer from '../components/analysis/PhylogeneticTreeViewer'
import MSAViewer from '../components/analysis/MSAViewer';
import InsightsPanelAntd from '../components/analysis/InsightsPanelAntd';
import GraphVisualization from '../components/analysis/GraphVisualization';

import { fetchNcbiInfo } from '../services/dataServices';

const { Content } = Layout;
const { Title } = Typography;
const { Dragger } = Upload;

const AnalysisPage = () => {
      const [selectedFile, setSelectedFile] = useState(null);
      const [selectedNode, setSelectedNode] = useState(null);
      const [insights, setInsights] = useState(null);
      const [isLoading, setIsLoading] = useState(false);


      const processFile = (file) => {
            const reader = new FileReader();
            reader.onload = e => {
                  const content = e.target.result;
                  const extension = file.name.split('.').pop().toLowerCase();
                  let type;

                  if (['nwk', 'newick', 'nexus', 'tree','tre'].includes(extension)) {
                        type = 'tree';
                  } else if (['fasta', 'fa', 'fas', 'aln', 'clustal'].includes(extension)) {
                        type = 'alignment';
                  } else {
                        alert('File type not supported for this view.');
                        return;
                  }

                  setSelectedFile({
                        name: file.name,
                        content: content,
                        type: type,
                  });
            };
            reader.readAsText(file);
      };


      const draggerProps = {
            name: 'file',
            multiple: false,
            accept: ".nexus,.nwk,.newick,.tree,.fasta,.fa,.fas,.aln,.clustal",
            beforeUpload: (file) => {
                  processFile(file);
                  return false; 
            },
            onDrop: (e) => {
                  if (e.dataTransfer.files.length > 0) {
                        processFile(e.dataTransfer.files[0]);
                  }
            },
      };

      const handleNodeClick = async (nodeData) => {
            setSelectedNode(nodeData);
            if (!nodeData.name || nodeData.name.toLowerCase().includes('inner')) {
                  setInsights(null);
                  return;
            }

            setIsLoading(true);
            // console.log("Buscando dados para:", nodeData.name);
            try {
                  const data = await fetchNcbiInfo(nodeData.name);
                  setInsights(data);
            } catch (error) {
                  console.error('Erro ao buscar informações do NCBI:', error);
                  setInsights(null);
            } finally {
                  setIsLoading(false);
            }
      };

      const renderViewer = () => {
            if (!selectedFile) {
                  return (
                        <Dragger {...draggerProps} style={{ padding: '20px' }}>
                              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                              <p className="ant-upload-text">Click or drag a file into this area</p>
                              <p className="ant-upload-hint">
                                    Support for tree (.nexus, .nwk) and alignment (.fasta, .aln) files.
                              </p>
                        </Dragger>
                  );
            }

            if (selectedFile.type === 'tree') {
                  return (
                        <PhylogeneticTreeViewer
                              data={selectedFile.content}
                              onNodeClick={handleNodeClick}
                        />
                  );
            }

            if (selectedFile.type === 'alignment') {
                  return (
                        <MSAViewer
                              data={selectedFile.content}
                              onSequenceSelect={(seq) => console.log('Selected seq:', seq)}
                        />
                  );
            }
      };


       const tabItems = [
            {
                  key: 'phylogenetic',
                  label: <><ExperimentOutlined /> Phylogenetic Analysis</>,
                  children: (
                        <Row gutter={[16, 16]}>
                              <Col xs={24} lg={18} style={{ display: 'flex' }}>
                                    <Card 
                                      style={{ width: '100%' }}
                                      extra={
                                        selectedFile && ( 
                                          <Button onClick={() => setSelectedFile(null)}>
                                            Upload New File
                                          </Button>
                                        )
                                      }
                                    >
                                          <div style={{ height: '65vh' }}>
                                                {renderViewer()}
                                          </div>
                                    </Card>
                              </Col>
                              <Col xs={24} lg={6}>
                                    <InsightsPanelAntd
                                          selectedNode={selectedNode}
                                          insights={insights}
                                          isLoading={isLoading}
                                    />
                              </Col>
                        </Row>
                  ),
            },
            {
                  key: 'graph',
                  label: <><ShareAltOutlined /> Graph Visualization</>,
                  children: <GraphVisualization />,
            },
      ];

      return (
            <Layout>
                  <Content style={{ padding: '24px', backgroundColor: "#ffffff", borderRadius: 8 }}>
                        <Title level={3}>Analysis Panel</Title>
                        <Tabs defaultActiveKey="phylogenetic" items={tabItems} />
                  </Content>
            </Layout>
      );
};

export default AnalysisPage;