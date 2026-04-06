import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { Empty } from 'antd'

export interface TopFundItem {
  name: string
  shortName: string
  holderCount: number
  totalAmount: number
}

interface TooltipPayload {
  name: string
  value: number
  payload: TopFundItem
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayload[]
}) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #f0f0f0',
        borderRadius: 6,
        padding: '8px 12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        maxWidth: 220,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 12 }}>{item.name}</div>
      <div style={{ color: '#6b7280', fontSize: 12 }}>
        持有客户：
        <span style={{ color: '#2563eb', fontWeight: 600 }}>{item.holderCount} 人</span>
      </div>
      <div style={{ color: '#6b7280', fontSize: 12 }}>
        持仓市值：
        <span style={{ color: '#10b981', fontWeight: 600 }}>
          {(item.totalAmount / 1e8).toFixed(2)} 亿元
        </span>
      </div>
    </div>
  )
}

const BAR_COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe']

interface Props {
  data: TopFundItem[]
}

export function TopHeldFundsChart({ data }: Props) {
  if (!data.length) return <Empty description="暂无数据" />

  return (
    <div onMouseDown={(e) => e.preventDefault()}>
      <ResponsiveContainer width="100%" height={240} style={{ overflow: 'visible' }}>
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 12, top: 8, bottom: 28 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
          <XAxis
            type="number"
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="shortName"
            width={116}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="holderCount" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {data.map((_, index) => (
              <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div
        style={{
          textAlign: 'center',
          fontSize: 11,
          color: '#8c8c8c',
          lineHeight: 1.4,
          marginTop: 4,
          paddingBottom: 2,
        }}
      >
        持有客户数（人）
      </div>
    </div>
  )
}
