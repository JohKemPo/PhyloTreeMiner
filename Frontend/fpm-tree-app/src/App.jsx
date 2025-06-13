import React, { useState } from 'react';
import { Layout, Menu, Button, Typography, Space, Avatar, Flex, Result } from 'antd';
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  AppstoreOutlined,
  ContainerOutlined,
  SettingOutlined,
  ExperimentOutlined,
  CodeOutlined,
  GlobalOutlined,
  SearchOutlined,
  BellOutlined,
  UserOutlined
} from '@ant-design/icons';
import ProjectExplorer from './components/displayData/projectExplorer';
import TestPage from './pages/testPage';


import { colors } from './themes'
import SystemPerformanceMonitor from './components/displayData/systemPerformancerMonitor';
import ProjectGallery from './components/displayData/projectsGallery';
import ProjectDetailView from './components/displayData/projectDetailsView';
import ProjectPage from './pages/projectsPage';


const { Header, Content, Sider, Footer } = Layout;
const { Title } = Typography;

const menuItems = [
  { key: '1', icon: <AppstoreOutlined />, label: 'Dashboard' },
  { key: '2', icon: <ExperimentOutlined />, label: 'Pipelines' },
  { key: '3', icon: <ContainerOutlined />, label: 'Projects' },
  { key: '4', icon: <CodeOutlined />, label: 'Scripts' },
  // { key: '5', icon: <GlobalOutlined />, label: 'Geolocalização' },
  { type: 'divider' },
  { key: '6', icon: <SettingOutlined />, label: 'Configurações' },
];

const PlaceholderContent = ({ page }) => (
  <div style={{ padding: 50, textAlign: 'center', minHeight: '80vh' }}>
    <Title level={2}>Página de {page}</Title>
    <p>O conteúdo específico para {page}.</p>
    <Result
      status="404"
      title="404"
      subTitle="Sorry, the page you visited does not exist."
    // extra={<Button type="primary">Back Home</Button>}
    />

  </div>
);


function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState('1');

  const currentPage = menuItems.find(item => item.key === currentView);
  const pageTitle = currentPage ? currentPage.label : 'Dashboard';

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };


  const renderContent = () => {
    switch (currentView) {
      case '1':
        return (
          <div>
            {/* <Title level={3}>Dashboard</Title> */}
            {/* {[1].map(i => <ProjectExplorer key={i} index={i} />)} */}
            <PlaceholderContent page="Dashboard" />
            {/* <ProjectExplorer /> */}
            <TestPage />
          </div>
        );
      case '2':
        return (
          <div>
            {/* <Title level={3}>Pipelines</Title> */}
            <PlaceholderContent page="Pipelines" />
            {/* <SystemPerformanceMonitor /> */}
          </div>
        )
      case '3':
        return (
          <div>
            {/* <Title level={3}>Jobs</Title> */}
            {/* <PlaceholderContent page="Jobs"/>; */}
            {/* {selectedProject ? (
              <ProjectDetailView
                projectName={selectedProject}
                onBack={() => handleProjectSelect(null)}
              />
            ) : (
              )} */}

              <ProjectPage/>
              {/* <ProjectExplorer/> */}
          </div>
        )
      case '4':
        return (
          <div>
            {/* <Title level={3}>Scripts</Title> */}
            {/* <PlaceholderContent page="Scripts" />; */}

              <SystemPerformanceMonitor/>
          </div>
        )
      // case '5':
      //   return (
      //     <div>
      //       {/* <Title level={3}>Geolocalização</Title> */}
      //       <PlaceholderContent page="Geolocalização" />;
      //     </div>
      //   )
      case '6':
        return (
          <div>
            {/* <Title level={3}>Configurações</Title> */}
            <PlaceholderContent page="Configurações" />;
          </div>
        )
      default:
        return (
          <div>
            {/* <Title level={3}>Dashboard</Title> */}
            <PlaceholderContent page="Dashboard" />;
          </div>
        )
    }
  };

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={250}
        style={{
          backgroundColor: colors.white,
          borderRight: `1px solid ${colors.border}`,
          transition: 'all 0.2s',
        }}
      >
        <div
          className="logo-container"
          style={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 10px',
            backgroundColor: colors.white,
          }}
        >
          <ExperimentOutlined style={{ fontSize: '24px', color: colors.primary }} />
          {!collapsed && (
            <Title level={4} style={{ color: colors.textDark, marginBottom: 0, marginLeft: '12px', whiteSpace: 'nowrap' }}>
              PhyloPipeline
            </Title>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[currentView]}
          onClick={(e) => setCurrentView(e.key)}
          items={menuItems}
          style={{ borderRight: 0, backgroundColor: colors.white }}
        />
      </Sider>
      <Layout style={{ backgroundColor: colors.background }}>
        <Header
          style={{
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: colors.white,
            borderBottom: `1px solid ${colors.border}`,
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Flex justify='space-between' align='center' style={{ width: '100%' }}>

            <Space align="center" size="middle">
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={toggleCollapsed}
                style={{ fontSize: '16px' }}
              />
              <Title level={3} style={{ marginBottom: 0 }}>
                {pageTitle}
              </Title>
            </Space>
            <Space align="center" size="middle">
              <Button shape="circle" icon={<SearchOutlined />} />
              <Button shape="circle" icon={<BellOutlined />} />
            </Space>
          </Flex>



        </Header>

        <Content
          style={{
            overflow: 'auto',
            flex: '1 1 auto',
            padding: '24px',
          }}
        >
          {renderContent()}
          <Footer style={{ textAlign: 'center', backgroundColor: colors.background, color: colors.textMedium }}>
            PhyloPipeline ©{new Date().getFullYear()} Created by JohKemPo
          </Footer>
        </Content>

      </Layout>
    </Layout>
  );
}

export default App;

