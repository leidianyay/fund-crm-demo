import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          const matches = (needles: string[]) => needles.some((needle) => id.includes(needle))

          if (
            id.includes('/react/') ||
            id.includes('\\react\\') ||
            id.includes('react-dom') ||
            id.includes('react-router') ||
            id.includes('scheduler')
          ) {
            return 'react-vendor'
          }

          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) {
            return 'chart-vendor'
          }

          if (matches([
            'antd/es/date-picker',
            'antd/lib/date-picker',
            'rc-picker',
            'dayjs',
          ])) {
            return 'antd-date'
          }

          if (matches([
            'antd/es/table',
            'antd/lib/table',
            'rc-table',
            'rc-pagination',
          ])) {
            return 'antd-table'
          }

          if (matches([
            'antd/es/select',
            'antd/lib/select',
            'rc-select',
            'rc-virtual-list',
            '@rc-component/trigger',
          ])) {
            return 'antd-select'
          }

          if (id.includes('@ant-design/icons')) {
            return 'antd-icons'
          }

          if (matches([
            '@ant-design/cssinjs',
            '@ant-design/cssinjs-utils',
            '@ant-design/colors',
            '@ant-design/fast-color',
            'stylis',
          ])) {
            return 'antd-style'
          }

          if (matches([
            'antd/es/layout',
            'antd/lib/layout',
            'antd/es/menu',
            'antd/lib/menu',
            'rc-menu',
            'rc-overflow',
          ])) {
            return 'antd-layout'
          }

          if (matches([
            'antd/es/form',
            'antd/lib/form',
            'antd/es/input',
            'antd/lib/input',
            'antd/es/input-number',
            'antd/lib/input-number',
            'rc-field-form',
            'rc-input',
            'rc-input-number',
            'rc-textarea',
          ])) {
            return 'antd-form'
          }

          if (matches([
            'antd/es/modal',
            'antd/lib/modal',
            'antd/es/drawer',
            'antd/lib/drawer',
            'antd/es/tooltip',
            'antd/lib/tooltip',
            'antd/es/popover',
            'antd/lib/popover',
            'rc-dialog',
            'rc-drawer',
            'rc-tooltip',
          ])) {
            return 'antd-overlay'
          }

          if (matches([
            'antd/es/alert',
            'antd/lib/alert',
            'antd/es/result',
            'antd/lib/result',
            'antd/es/spin',
            'antd/lib/spin',
            'antd/es/skeleton',
            'antd/lib/skeleton',
            'antd/es/empty',
            'antd/lib/empty',
            'antd/es/progress',
            'antd/lib/progress',
          ])) {
            return 'antd-feedback'
          }

          if (matches([
            'antd/es/button',
            'antd/lib/button',
            'antd/es/card',
            'antd/lib/card',
            'antd/es/grid',
            'antd/lib/grid',
            'antd/es/tag',
            'antd/lib/tag',
            'antd/es/typography',
            'antd/lib/typography',
          ])) {
            return 'antd-basic'
          }

          if (matches([
            'antd',
            'rc-',
            '@rc-component',
            'rc-util',
          ])) {
            return 'antd-core'
          }
        },
      },
    },
  },
})
