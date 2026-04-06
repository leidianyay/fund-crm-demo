import { Suspense, lazy, useEffect, useState } from 'react'
import {
  Card,
  Col,
  Row,
  Typography,
  Spin,
  Table,
  Tag,
  Button,
  Alert,
  Skeleton,
} from 'antd'
import { useNavigate } from 'react-router-dom'
import {
  RiseOutlined,
  TeamOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { fundApi } from '../../api/fundApi'
import { clientApi } from '../../api/clientApi'
import { followupApi } from '../../api/followupApi'
import type { Product } from '../../types/fund'
import type { Customer } from '../../types/client'
import type { FollowUp } from '../../types/followup'
import type { AumByTypeItem } from './AumByTypeChart'
import type { TrendItem } from './FollowUpTrendChart'

const AumByTypeChart = lazy(() =>
  import('./AumByTypeChart').then((module) => ({ default: module.AumByTypeChart })),
)

const FollowUpTrendChart = lazy(() =>
  import('./FollowUpTrendChart').then((module) => ({ default: module.FollowUpTrendChart })),
)

const { Title, Text } = Typography

const TODAY = new Date('2026-04-02')

const SALES_NAMES: Record<string, string> = {
  sales001: '林晓菲',
  sales002: '吴丹宁',
  sales003: '陈米娜',
}

function calcAumByType(funds: Product[]): AumByTypeItem[] {
  const map: Record<string, number> = {}
  for (const f of funds) {
    map[f.type] = (map[f.type] ?? 0) + f.aum
  }
  return Object.entries(map)
    .map(([type, aum]) => ({ type, aum: Math.round(aum * 10) / 10 }))
    .sort((a, b) => b.aum - a.aum)
}

function calcFollowUpTrend(followups: FollowUp[]): TrendItem[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(TODAY)
    d.setDate(d.getDate() - 6 + i)
    const dateStr = d.toISOString().slice(0, 10)
    const label = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const count = followups.filter((f) => f.timestamp.startsWith(dateStr)).length
    return { date: label, count }
  })
}

function calcOverdueClients(clients: Customer[]): Customer[] {
  return clients.filter((c) => {
    if (!c.lastFollowUpAt) return true
    const days = Math.floor(
      (TODAY.getTime() - new Date(c.lastFollowUpAt).getTime()) / (1000 * 60 * 60 * 24),
    )
    return days > 7
  })
}

function calcMonthlyFollowUps(followups: FollowUp[]): number {
  const prefix = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}`
  return followups.filter((f) => f.timestamp.startsWith(prefix)).length
}

interface RiskAlert {
  name: string
  type: string
  daysLeft: number
}

function calcRiskAlerts(clients: Customer[]): RiskAlert[] {
  const alerts: RiskAlert[] = []
  for (const c of clients) {
    const expiryDate = new Date(c.riskExpiryDate)
    const daysLeft = Math.floor((expiryDate.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24))
    if (daysLeft <= 30) {
      alerts.push({
        name: c.name,
        type: daysLeft <= 0 ? '风险测评已过期' : '风险测评即将到期',
        daysLeft,
      })
    }
  }
  return alerts.sort((a, b) => a.daysLeft - b.daysLeft)
}

// 趋势指示器

function Trend({ positive, delta, note }: { positive: boolean; delta: string; note: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
      <span style={{ color: positive ? '#16a34a' : '#ef4444', display: 'flex', alignItems: 'center', gap: 2 }}>
        {positive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
        {delta}
      </span>
      <span style={{ color: '#94a3b8' }}>{note}</span>
    </div>
  )
}

// 跟进记录行类型

interface RecentRecord {
  followUp: FollowUp
  client?: Customer
}

const INTENT_TAG_STYLE: Record<string, string> = {
  推进中: 'blue',
  成功推荐: 'green',
  暂无意向: 'amber',
  信息同步: 'cyan',
  风险提示: 'red',
}

// 主组件

export default function Dashboard() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [funds, setFunds] = useState<Product[]>([])
  const [clients, setClients] = useState<Customer[]>([])
  const [followups, setFollowups] = useState<FollowUp[]>([])

  useEffect(() => {
    let cancelled = false

    Promise.all([
      fundApi.list(),
      clientApi.list(),
      followupApi.list(),
    ])
      .then(([fundsRes, clientsRes, followupsRes]) => {
        if (cancelled) return
        setFunds(fundsRes.data)
        setClients(clientsRes.data)
        setFollowups(followupsRes.data)
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message ?? '加载失败，请刷新后重试')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // 聚合数据

  const activeProductCount = funds.filter((f) => String(f.status) === '在售').length
  const totalCustomers = clients.length
  const monthlyFollowUps = calcMonthlyFollowUps(followups)
  const overdueClients = calcOverdueClients(clients)

  const aumByType = calcAumByType(funds)
  const trendData = calcFollowUpTrend(followups)
  const riskAlerts = calcRiskAlerts(clients)

  const recentRecords: RecentRecord[] = [...followups]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6)
    .map((fu) => ({
      followUp: fu,
      client: clients.find((c) => c.id === fu.customerId),
    }))

  // 指标卡片配置

  const metrics = [
    {
      title: '在售产品数',
      value: activeProductCount,
      delta: `${funds.length} 只在管`,
      positive: true,
      note: '当前货架',
      icon: <RiseOutlined />,
    },
    {
      title: '客户总数',
      value: totalCustomers,
      delta: `机构 ${clients.filter((c) => c.customerType === '机构').length}`,
      positive: true,
      note: `个人 ${clients.filter((c) => c.customerType === '个人').length}`,
      icon: <TeamOutlined />,
    },
    {
      title: '本月新增跟进',
      value: monthlyFollowUps,
      delta: `累计 ${followups.length}`,
      positive: true,
      note: '条跟进记录',
      icon: <FileTextOutlined />,
    },
    {
      title: '待跟进客户',
      value: overdueClients.length,
      delta: `${riskAlerts.length} 条`,
      positive: false,
      note: '合规预警',
      icon: <ClockCircleOutlined />,
    },
  ]

  // 跟进表格列

  const followupColumns: ColumnsType<RecentRecord> = [
    {
      title: '客户',
      key: 'client',
      render: (_: unknown, record: RecentRecord) => (
        <div>
          <div
            style={{ fontWeight: 500, color: '#0f172a', cursor: 'pointer' }}
            onClick={() => navigate(`/clients/${record.followUp.customerId}`)}
          >
            {record.client?.name ?? record.followUp.customerId}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: '#94a3b8' }}>
            负责人：{SALES_NAMES[record.client?.assignedSalesId ?? ''] ?? '--'}
          </div>
        </div>
      ),
    },
    {
      title: '跟进事项',
      key: 'topic',
      ellipsis: true,
      render: (_: unknown, record: RecentRecord) => (
        <Text style={{ fontSize: 13 }} ellipsis={{ tooltip: record.followUp.nextAction }}>
          {record.followUp.nextAction ?? record.followUp.content?.slice(0, 30) ?? '--'}
        </Text>
      ),
    },
    {
      title: '时间',
      key: 'time',
      width: 120,
      render: (_: unknown, record: RecentRecord) => {
        const d = new Date(record.followUp.timestamp)
        return (
          <Text type="secondary" style={{ fontSize: 13 }}>
            {`${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`}
          </Text>
        )
      },
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: unknown, record: RecentRecord) => {
        const intent = record.followUp.intent
        const cls = INTENT_TAG_STYLE[intent] ?? 'blue'
        return <Tag className={`soft-tag ${cls}`}>{intent}</Tag>
      },
    },
  ]

  const chartFallback = (
    <Spin style={{ display: 'block', textAlign: 'center', padding: '80px 0' }} />
  )

  // 渲染

  if (error) {
    return (
      <Alert
        type="error"
        message="加载失败"
        description={error}
        showIcon
        action={
          <Button size="small" onClick={() => window.location.reload()}>
            刷新
          </Button>
        }
      />
    )
  }

  return (
    <div>
      <Title level={3} style={{ margin: '0 0 24px' }}>数据概览</Title>

      {/* 核心指标卡片 */}
      <Row gutter={[20, 20]}>
        {metrics.map((metric) => (
          <Col xs={24} sm={12} lg={6} key={metric.title}>
            <Card bordered={false} className="crm-card">
              {loading ? (
                <Skeleton active paragraph={{ rows: 2 }} />
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <Text style={{ color: '#64748b' }}>{metric.title}</Text>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#475569',
                        fontSize: 16,
                      }}
                    >
                      {metric.icon}
                    </div>
                  </div>
                  <div style={{ fontSize: 30, fontWeight: 600, color: '#0f172a', marginBottom: 12, fontFamily: "'DIN Alternate', 'Roboto', sans-serif" }}>
                    {metric.value}
                  </div>
                  <Trend positive={metric.positive} delta={metric.delta} note={metric.note} />
                </>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      {/* 图表区域：趋势图 + 产品分布图 */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={16}>
          <Card bordered={false} className="crm-card">
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Title level={4} style={{ marginBottom: 4, marginTop: 0 }}>近 7 天渠道触达趋势</Title>
                <Text style={{ color: '#64748b' }}>按天查看客户拜访、电话沟通和产品推荐的完成次数</Text>
              </div>
              <Tag className="soft-tag blue">销售节奏</Tag>
            </div>
            {loading ? (
              <Spin style={{ display: 'block', textAlign: 'center', padding: '80px 0' }} />
            ) : (
              <Suspense fallback={chartFallback}>
                <FollowUpTrendChart data={trendData} />
              </Suspense>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card bordered={false} className="crm-card" style={{ height: '100%' }}>
            <div style={{ marginBottom: 24 }}>
              <Title level={4} style={{ marginBottom: 4, marginTop: 0 }}>在售产品类型分布</Title>
              <Text style={{ color: '#64748b' }}>帮助销售快速判断当前货架结构与主推方向</Text>
            </div>
            {loading ? (
              <Spin style={{ display: 'block', textAlign: 'center', padding: '80px 0' }} />
            ) : (
              <Suspense fallback={chartFallback}>
                <AumByTypeChart data={aumByType} />
              </Suspense>
            )}
          </Card>
        </Col>
      </Row>

      {/* 跟进表格 + 合规预警 */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={16}>
          <Card bordered={false} className="crm-card">
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Title level={4} style={{ marginBottom: 4, marginTop: 0 }}>最近跟进动态</Title>
                <Text style={{ color: '#64748b' }}>按时间倒序展示最新跟进记录与待确认事项</Text>
              </div>
            </div>
            {loading ? (
              <Skeleton active paragraph={{ rows: 5 }} />
            ) : (
              <Table<RecentRecord>
                className="fund-table"
                columns={followupColumns}
                dataSource={recentRecords}
                rowKey={(r) => r.followUp.id}
                pagination={false}
                locale={{ emptyText: '暂无跟进记录' }}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card bordered={false} className="crm-card alert-card" style={{ height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb',
                  fontSize: 20,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                <SafetyCertificateOutlined />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#2563eb' }}>销售提醒</div>
                <Title level={4} style={{ marginBottom: 0, marginTop: 4 }}>客户适当性预警</Title>
              </div>
            </div>

            {loading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : riskAlerts.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <Text type="secondary">所有客户合规状态正常</Text>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {riskAlerts.map((alert) => (
                  <div
                    key={alert.name}
                    style={{
                      borderRadius: 16,
                      background: 'rgba(255,255,255,0.75)',
                      padding: 16,
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 500, color: '#0f172a', marginBottom: 4 }}>
                      {alert.name}
                    </div>
                    <div style={{ fontSize: 14, color: '#64748b' }}>{alert.type}</div>
                    <div style={{ marginTop: 8 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          borderRadius: 999,
                          background: alert.daysLeft <= 0 ? '#fef2f2' : '#fff7ed',
                          padding: '4px 12px',
                          fontSize: 12,
                          fontWeight: 500,
                          color: alert.daysLeft <= 0 ? '#dc2626' : '#ea580c',
                        }}
                      >
                        {alert.daysLeft <= 0
                          ? `已过期 ${Math.abs(alert.daysLeft)} 天`
                          : `${alert.daysLeft} 天后到期`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 24 }}>
              <Button type="primary" size="large" block style={{ borderRadius: 12, height: 44 }} onClick={() => navigate('/clients')}>
                查看全部客户
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
