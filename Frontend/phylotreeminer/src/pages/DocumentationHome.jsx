import React from 'react';
import { Layout, Input, Typography } from 'antd';
import WokflowDocsHome from './docs/WokflowDocsHome';

const { Content } = Layout;
const { Title, Text, Link } = Typography;
const { Search } = Input;

const DocumentationHome = () => {
  return (
    <Layout>
      <Content style={{ padding: '24px', backgroundColor: "#ffffff", borderRadius: 8, minHeight: '80vh', paddingTop: 16 }}>

        <WokflowDocsHome />
        <div style={{ maxWidth: '70vw', margin: 'auto' }}>
          
        </div>
      </Content>
    </Layout>
  );
};

export default DocumentationHome;