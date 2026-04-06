import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { Empty } from 'antd'

export interface TrendItem {
  date: string
  count: number
}

interface TooltipPayload {
  value: number
  payload: TrendItem
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: '#fff',
        border: 'none',
        borderRadius: 12,
        padding: '10px 14px',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
      }}
    >
      <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div>
        跟进记录：
        <span style={{ color: '#2563eb', fontWeight: 600 }}>{payload[0].value} 条</span>
      </div>
    </div>
  )
}

interface Props {
  data: TrendItem[]
}

export function FollowUpTrendChart({ data }: Props) {
  if (!data.length) return <Empty description="暂无数据" />

  return (
    <div onMouseDown={(e) => e.preventDefault()}>
      <ResponsiveContainer width="100%" height={320} style={{ overflow: 'visible' }}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="followupBlue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.24} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#2563eb"
            strokeWidth={3}
            fill="url(#followupBlue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
