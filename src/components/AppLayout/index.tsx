import { Suspense, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Spin, Typography, theme } from 'antd'
import {
  DashboardOutlined,
  FundOutlined,
  TeamOutlined,
  FileTextOutlined,
  RobotOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'

const { Sider, Content } = Layout
const { Text } = Typography

type MenuItem = Required<MenuProps>['items'][number]

const menuItems: MenuItem[] = [
  {
    key: '/',
    icon: <DashboardOutlined />,
    label: '数据概览',
  },
  {
    key: '/funds',
    icon: <FundOutlined />,
    label: '基金产品',
  },
  {
    key: '/clients',
    icon: <TeamOutlined />,
    label: '客户管理',
  },
  {
    key: '/followups',
    icon: <FileTextOutlined />,
    label: '跟进记录',
  },
  {
    key: '/agent',
    icon: <RobotOutlined />,
    label: '智能助手',
  },
]

function getSelectedKey(pathname: string): string {
  if (pathname.startsWith('/funds')) return '/funds'
  if (pathname.startsWith('/clients')) return '/clients'
  if (pathname.startsWith('/followups')) return '/followups'
  if (pathname.startsWith('/agent')) return '/agent'
  return '/'
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = theme.useToken()

  const selectedKey = getSelectedKey(location.pathname)

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key)
  }

  const routeFallback = (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Spin size="large" tip="页面加载中..." />
    </div>
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={240}
        style={{
          background: token.colorBgContainer,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div
            style={{
              padding: collapsed ? '24px 0' : '24px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 12,
              overflow: 'hidden',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: token.colorPrimary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              <FundOutlined />
            </div>
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: token.colorTextHeading, whiteSpace: 'nowrap' }}>
                  渠道销售中台
                </div>
                <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                  Products & Clients
                </Text>
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflow: 'hidden', paddingBottom: 48 }}>
            <Menu
              className="sidebar-menu"
              mode="inline"
              selectedKeys={[selectedKey]}
              items={menuItems}
              onClick={handleMenuClick}
              style={{ border: 'none' }}
            />
          </div>

        </div>
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'margin-left 0.2s' }}>
        <Content
          key={selectedKey}
          className="page-content-enter"
          style={{
            margin: 0,
            padding: '24px 32px',
            background: '#f8fafc',
            minHeight: '100vh',
          }}
        >
          <Suspense fallback={routeFallback}>
            <Outlet />
          </Suspense>
        </Content>
      </Layout>
    </Layout>
  )
}
