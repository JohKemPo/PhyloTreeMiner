import { useState } from 'react';
import { Layout, Menu, Button, Typography, Space, Flex } from 'antd';
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  AppstoreOutlined,
  ContainerOutlined,
  SettingOutlined,
  ExperimentOutlined,
  CodeOutlined,
  SearchOutlined,
  BellOutlined,
  HomeOutlined,
  PartitionOutlined
} from '@ant-design/icons';
import { Link, useLocation, Outlet } from 'react-router-dom';


import { colors } from './themes'
import Logo from './pages/componentsHomepage/logo';

const { Header, Content, Sider, Footer } = Layout;
const { Title } = Typography;

function App() {
  const [collapsed, setCollapsed] = useState(false);

  const location = useLocation();

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };


  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: <Link to="/">Home</Link> },
    { key: '/Dashboards', icon: <AppstoreOutlined />, label: <Link to="/Dashboards">Dashboard</Link> },
    { key: '/projects', icon: <ContainerOutlined />, label: <Link to="/projects">Projects</Link> },
    { key: '/pipelines', icon: <PartitionOutlined />, label: <Link to="/pipelines">Pipelines</Link> },
    // { key: '/scripts', icon: <CodeOutlined />, label: <Link to="/scripts">Scripts</Link> },
    { type: 'divider' },
    { key: '/settings', icon: <SettingOutlined />, label: <Link to="/settings">Configurações</Link> },
  ];

  const currentPage = menuItems.find(item => item.key === location.pathname);
  const pageTitle = currentPage ? currentPage.label.props.children : 'Dashboard';
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
        <a href='/'>
        
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
          <Logo size='30px'/>
          {!collapsed && (
            <Title level={4} style={{ color: colors.textDark, marginBottom: 0, marginLeft: '12px', whiteSpace: 'nowrap' }}>
              PhyloTreeMiner
            </Title>
          )}
        </div>
        </a>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          // onClick={(e) => setCurrentView(e.key)}
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
          {/* {renderContent()} */}
          <Outlet />
          <Footer style={{ textAlign: 'center', backgroundColor: colors.background, color: colors.textMedium }}>
            PhyloTreeMiner ©{new Date().getFullYear()} Created by PhyloTreeMiner@UFF
          </Footer>
        </Content>

      </Layout>
    </Layout>
  );
}

export default App;

