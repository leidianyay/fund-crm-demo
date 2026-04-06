import { Empty } from 'antd'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

export interface AumByTypeItem {
  type: string
  aum: number
}

const TYPE_COLORS: Record<string, string> = {
  混合型: '#2563eb',
  股票型: '#3b82f6',
  债券型: '#6366f1',
  货币型: '#60a5fa',
  FOF: '#818cf8',
  QDII: '#93c5fd',
}

const DEFAULT_COLORS = ['#2563eb', '#3b82f6', '#6366f1', '#60a5fa', '#818cf8', '#93c5fd']

interface Props {
  data: AumByTypeItem[]
}

export function AumByTypeChart({ data }: Props) {
  if (!data.length) return <Empty description="暂无数据" />

  return (
    <div onMouseDown={(event) => event.preventDefault()}>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="aum"
              nameKey="type"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={3}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.type}
                  fill={TYPE_COLORS[entry.type] ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => {
                const numericValue = typeof value === 'number' ? value : Number(value ?? 0)
                return [`${numericValue.toFixed(1)} 亿元`, '规模']
              }}
              contentStyle={{
                border: 'none',
                borderRadius: 12,
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.map((item, index) => (
          <div
            key={item.type}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: TYPE_COLORS[item.type] ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length],
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 14, color: '#475569' }}>{item.type}</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>
              {item.aum.toFixed(1)} 亿元
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
