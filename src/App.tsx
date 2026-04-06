import { RouterProvider } from 'react-router-dom'
import { ConfigProvider, App as AntdApp, Empty } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import router from './router'

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      renderEmpty={() => (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          imageStyle={{ height: 60, opacity: 0.45 }}
          description={<span style={{ color: '#9ca3af', fontSize: 13 }}>暂无数据</span>}
        />
      )}
      theme={{
        token: {
          // 主色 + semantic 颜色（现代金融 SaaS 色系）
          colorPrimary: '#2563eb',
          colorSuccess: '#10b981',
          colorWarning: '#f59e0b',
          colorError: '#ef4444',

          // 背景层次
          colorBgLayout: '#f8fafc',
          colorBgContainer: '#ffffff',
          colorBgElevated: '#ffffff',

          // 边框
          colorBorder: '#e2e8f0',
          colorBorderSecondary: '#f1f5f9',

          // 文字层次（4 级）
          colorText: '#0f172a',
          colorTextSecondary: '#64748b',
          colorTextTertiary: '#cbd5e1',
          colorTextDescription: '#6b7280',

          // 圆角（现代化放大）
          borderRadius: 8,
          borderRadiusLG: 12,
          borderRadiusSM: 6,

          // 字体
          fontSize: 14,
          fontSizeSM: 12,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif",

          // 阴影（弥散阴影，去除生硬感）
          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03), 0 1px 6px -1px rgba(0,0,0,0.02), 0 2px 4px 0 rgba(0,0,0,0.02)',
          boxShadowSecondary: '0 4px 16px 0 rgba(0,0,0,0.06)',
        },
        components: {
          Layout: {
            siderBg: '#ffffff',
            headerBg: '#ffffff',
            bodyBg: '#f8fafc',
          },
          Menu: {
            itemBorderRadius: 8,
            itemColor: '#4b5563',
            itemHoverBg: '#f1f5f9',
            itemHoverColor: '#0f172a',
            itemSelectedBg: 'rgba(37, 99, 235, 0.08)',
            itemSelectedColor: '#2563eb',
            itemHeight: 40,
            activeBarWidth: 0,
          },
          Card: {
            paddingLG: 24,
          },
          Table: {
            headerBg: '#f8fafc',
            headerColor: '#6b7280',
            headerSplitColor: 'transparent',
            rowHoverBg: '#f9fafb',
            fontSize: 13,
            cellPaddingBlock: 11,
            borderColor: '#f0f0f0',
          },
          Tag: {
            borderRadius: 6,
            fontSize: 12,
          },
          Descriptions: {
            labelBg: '#fafafa',
          },
          Form: {
            labelColor: '#4b5563',
            labelFontSize: 13,
            verticalLabelPadding: '0 0 6px',
          },
          Input: {
            activeShadow: '0 0 0 3px rgba(37, 99, 235, 0.12)',
            activeBorderColor: '#2563eb',
            hoverBorderColor: '#cbd5e1',
          },
          Select: {
            optionSelectedBg: '#eff6ff',
          },
          DatePicker: {
            activeShadow: '0 0 0 3px rgba(37, 99, 235, 0.12)',
          },
          InputNumber: {
            activeShadow: '0 0 0 3px rgba(37, 99, 235, 0.12)',
          },
          Modal: {
            titleFontSize: 16,
          },
          Statistic: {
            contentFontSize: 28,
          },
        },
      }}
    >
      <AntdApp>
        <RouterProvider router={router} />
      </AntdApp>
    </ConfigProvider>
  )
}
