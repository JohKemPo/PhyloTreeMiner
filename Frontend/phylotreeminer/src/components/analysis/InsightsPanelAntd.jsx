import { Card, Typography, Tag, Divider, Spin, Button, Empty } from 'antd';
import { InfoCircleOutlined, SearchOutlined, LoadingOutlined, BookOutlined, GlobalOutlined, ExportOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const InsightsPanelAntd = ({ selectedNode, insights, isLoading }) => {

  if (!selectedNode) {
    return (
      <Card title={<><InfoCircleOutlined /> Node Insights</>} style={{ height: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Empty description="Click on a node in the tree to see decorated information" />
        </div>
      </Card>
    );
  }

  return (
    <Card title={<><InfoCircleOutlined /> Node Insights: <Text strong>{selectedNode.name}</Text></>} style={{ height: '100%', overflowY: 'auto' }}>
      <Title level={5}>Description:</Title>
      <Paragraph>
        {/* Profundidade: <Tag color="blue">{selectedNode.depth}</Tag>
        <br />
        Descendentes: <Tag color="green">{selectedNode.children || 0}</Tag>
        <br />
        {selectedNode.data?.length && (
          <>Comprimento do Ramo: <Tag>{selectedNode.data.length.toFixed(4)}</Tag></>
        )} */}
        {insights?.description}
      </Paragraph>

      <Divider />

      <Title level={5}>NCBI Information</Title>
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
          <Paragraph>Looking for information...</Paragraph>
        </div>
      ) : insights ? (
        <>
          {insights.species && <Paragraph><strong>Species:</strong> <i>{insights.species}</i></Paragraph>}
          {insights.taxonomy && (
            <div>
              <Paragraph strong>Taxonomic Lineage:</Paragraph>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {insights.taxonomy.split(';').map((taxon, index) => (
                  <Tag key={index}>{taxon.trim()}</Tag>
                ))}
              </div>
            </div>
          )}
          {insights.genbank_id && (
            <Paragraph style={{marginTop: '16px'}}>
              <strong>GenBank ID:</strong> <Tag color="purple">{insights.genbank_id}</Tag>
              <a href={`https://www.ncbi.nlm.nih.gov/nuccore/${insights.genbank_id}`} target="_blank" rel="noopener noreferrer">
                <Button icon={<ExportOutlined />} size="small" type="link" />
              </a>
            </Paragraph>
          )}
          {insights.pubmed_links?.length > 0 && (
             <div>
                <Paragraph strong>Publications:</Paragraph>
                {insights.pubmed_links.slice(0, 3).map((link, index) => (
                    <Button key={index} icon={<BookOutlined />} block style={{ marginBottom: 8, textAlign: 'left' }} href={link.url} target="_blank">
                        {link.title}
                    </Button>
                ))}
             </div>
          )}
        </>
      ) : (
        <Paragraph>No information found on NCBI.</Paragraph>
      )}

      <Divider />
      
      {/* <Title level={5}>Análise BLAST</Title>
      <Button icon={<SearchOutlined />} block>
        Executar BLASTn (Lógica a ser implementada)
      </Button>
      */}
    </Card>
  );
};

export default InsightsPanelAntd;