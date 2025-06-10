import { Layout, Menu, Input, Dropdown } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import React from 'react'

const { Sider, Header, Content } = Layout

const menuItems = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'pipelines', label: 'Pipelines' },
  { key: 'scripts', label: 'Scripts' },
  { key: 'geo', label: 'Geolocaliza\u00e7\u00e3o' },
  { key: 'settings', label: 'Configura\u00e7\u00f5es' },
]

const userMenu: MenuProps['items'] = [
  { key: 'profile', label: 'Perfil' },
  { key: 'logout', label: 'Logout' },
]

const DashboardLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div style={{ color: 'white', margin: 16, fontWeight: 'bold' }}>FPM Tree</div>
        <Menu theme="dark" mode="inline" items={menuItems} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', paddingInline: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Input.Search placeholder="Search" style={{ maxWidth: 300 }} />
          <Dropdown menu={{ items: userMenu }}>
            <span style={{ cursor: 'pointer' }}>
              Dr. Rafael Silva <UserOutlined />
            </span>
          </Dropdown>
        </Header>
        <Content style={{ padding: 24, background: '#fff' }}>{children}</Content>
      </Layout>
    </Layout>
  )
}

export default DashboardLayout
