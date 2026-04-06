import { useState, useEffect } from 'react'
import {
  Typography,
  Card,
  Descriptions,
  Button,
  Table,
  Tag,
  Space,
  Skeleton,
  Result,
  Tabs,
  Timeline,
  Tooltip,
  Row,
  Col,
} from 'antd'
import {
  ArrowLeftOutlined,
  UserOutlined,
  FileTextOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import { fundApi } from '../../api/fundApi'
import { holdingApi } from '../../api/holdingApi'
import { clientApi } from '../../api/clientApi'
import { followupApi } from '../../api/followupApi'
import type { Product, RiskLevel, ProductStatus } from '../../types/fund'
import type { Holding } from '../../types/holding'
import type { Customer } from '../../types/client'
import type { FollowUp, FollowUpMethod, FollowUpIntent } from '../../types/followup'

const { Title, Text, Paragraph } = Typography

const RISK_TAG: Record<RiskLevel, { cls: string; label: string }> = {
  1: { cls: 'green', label: 'R1 低风险' },
  2: { cls: 'green', label: 'R2 中低风险' },
  3: { cls: 'amber', label: 'R3 中风险' },
  4: { cls: 'red', label: 'R4 中高风险' },
  5: { cls: 'red', label: 'R5 高风险' },
}

const STATUS_TAG: Record<ProductStatus, string> = {
  在售: 'green',
  募集中: 'blue',
  暂停申购: 'amber',
  封闭期: 'red',
  已到期: '',
}

const METHOD_TAG: Record<FollowUpMethod, string> = {
  电话: 'blue',
  面访: 'green',
  微信: 'cyan',
  邮件: 'amber',
  视频会议: 'blue',
}

const INTENT_TAG: Record<FollowUpIntent, string> = {
  推进中: 'blue',
  成功推荐: 'green',
  暂无意向: 'amber',
  信息同步: 'cyan',
  风险提示: 'red',
}

function fmt万(v: number) {
  if (v >= 1e8) return `${(v / 1e8).toFixed(2)} 亿`
  if (v >= 1e4) return `${(v / 1e4).toFixed(2)} 万`
  return v.toFixed(0)
}

function fmtDate(s: string) {
  return s?.slice(0, 10) ?? '-'
}

interface HolderRow extends Holding {
  customer?: Customer
}

export default function FundDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [fund, setFund] = useState<Product | null>(null)
  const [holders, setHolders] = useState<HolderRow[]>([])
  const [followups, setFollowups] = useState<FollowUp[]>([])
  const [clientMap, setClientMap] = useState<Record<string, Customer>>({})
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setNotFound(false)
    setError(null)

    Promise.all([
      fundApi.getById(id),
      holdingApi.list({ productId: id }),
      clientApi.list(),
      followupApi.list({ productId: id }),
    ])
      .then(([fundRes, holdingRes, clientRes, followupRes]) => {
        setFund(fundRes.data)

        const cMap: Record<string, Customer> = {}
        clientRes.data.forEach((c) => (cMap[c.id] = c))
        setClientMap(cMap)

        const holderRows: HolderRow[] = holdingRes.data.map((h) => ({
          ...h,
          customer: cMap[h.customerId],
        }))
        holderRows.sort((a, b) => b.currentAmount - a.currentAmount)
        setHolders(holderRows)

        setFollowups(followupRes.data)
      })
      .catch((err) => {
        if (err?.status === 404) setNotFound(true)
        else setError('数据加载失败，请稍后重试')
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div>
        <Skeleton.Button active style={{ width: 80, marginBottom: 16 }} />
        <Card bordered={false} className="crm-card" style={{ marginBottom: 20 }}>
          <Row gutter={24} style={{ marginBottom: 20 }}>
            {[0, 1, 2, 3].map((i) => (
              <Col span={6} key={i}>
                <Skeleton.Input active style={{ width: '100%', height: 60 }} />
              </Col>
            ))}
          </Row>
          <Skeleton active paragraph={{ rows: 4 }} />
        </Card>
        <Skeleton active paragraph={{ rows: 5 }} />
      </div>
    )
  }

  if (notFound || !fund) {
    return (
      <Result
        status="404"
        title="基金不存在"
        subTitle="未找到该基金产品，请检查链接是否正确"
        extra={
          <Button type="primary" onClick={() => navigate('/funds')}>
            返回列表
          </Button>
        }
      />
    )
  }

  if (error) {
    return (
      <Result
        status="500"
        title="加载失败"
        subTitle={error}
        extra={
          <Button type="primary" onClick={() => window.location.reload()}>
            刷新重试
          </Button>
        }
      />
    )
  }

  const totalHoldingAmt = holders.reduce((s, h) => s + h.currentAmount, 0)
  const riskInfo = RISK_TAG[fund.riskLevel]
  const statusCls = STATUS_TAG[fund.status]

  const holderColumns: ColumnsType<HolderRow> = [
    {
      title: '客户姓名',
      key: 'name',
      render: (_, row) =>
        row.customer ? (
          <span
            style={{ color: '#0f172a', fontWeight: 500, cursor: 'pointer' }}
            onClick={() => navigate(`/clients/${row.customerId}`)}
          >
            {row.customer.name}
          </span>
        ) : (
          <span style={{ color: '#94a3b8' }}>{row.customerId}</span>
        ),
    },
    {
      title: '客户类型',
      key: 'customerType',
      width: 90,
      render: (_, row) =>
        row.customer ? <Tag className={`soft-tag ${row.customer.customerType === '机构' ? 'blue' : ''}`}>{row.customer.customerType}</Tag> : '-',
    },
    {
      title: '风险偏好',
      key: 'riskAppetite',
      width: 90,
      render: (_, row) => row.customer?.riskAppetite ?? '-',
    },
    {
      title: '持仓市值',
      dataIndex: 'currentAmount',
      key: 'currentAmount',
      width: 130,
      align: 'right',
      render: (v: number) => <span style={{ fontWeight: 600, color: '#0f172a' }}>{fmt万(v)}</span>,
      sorter: (a, b) => a.currentAmount - b.currentAmount,
      defaultSortOrder: 'descend',
    },
    {
      title: '持有份额',
      dataIndex: 'shares',
      key: 'shares',
      width: 130,
      align: 'right',
      render: (v: number) => v.toLocaleString('zh-CN', { maximumFractionDigits: 2 }),
    },
    {
      title: '浮盈率',
      dataIndex: 'profitRate',
      key: 'profitRate',
      width: 100,
      align: 'right',
      render: (v: number) => {
        const color = v > 0 ? '#dc2626' : v < 0 ? '#16a34a' : '#64748b'
        return (
          <span style={{ color, fontWeight: 500 }}>
            {v > 0 ? '+' : ''}{v.toFixed(2)}%
          </span>
        )
      },
      sorter: (a, b) => a.profitRate - b.profitRate,
    },
    {
      title: '建仓日期',
      dataIndex: 'holdingSince',
      key: 'holdingSince',
      width: 110,
      render: (v: string) => <span style={{ color: '#475569' }}>{fmtDate(v)}</span>,
      sorter: (a, b) =>
        new Date(a.holdingSince).getTime() - new Date(b.holdingSince).getTime(),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, row) => (
        <span
          style={{ color: '#2563eb', cursor: 'pointer', fontSize: 13 }}
          onClick={() => navigate(`/clients/${row.customerId}`)}
        >
          查看客户
        </span>
      ),
    },
  ]

  return (
    <div>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/funds')}
        style={{ marginBottom: 16, paddingLeft: 0 }}
      >
        返回列表
      </Button>

      <Card bordered={false} className="crm-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Space size={12}>
            <Title level={4} style={{ margin: 0 }}>{fund.name}</Title>
            <span style={{ fontFamily: "'SF Mono', 'Roboto Mono', monospace", fontSize: 13, color: '#64748b' }}>
              {fund.code}
            </span>
            {statusCls ? <Tag className={`soft-tag ${statusCls}`}>{fund.status}</Tag> : <Tag className="soft-tag">{fund.status}</Tag>}
          </Space>
          <Tag className={`soft-tag ${riskInfo.cls}`}>{riskInfo.label}</Tag>
        </div>

        <Row gutter={24} style={{ marginBottom: 24 }}>
          {[
            { label: '最新净值', value: fund.nav.toFixed(4), icon: <WalletOutlined /> },
            { label: '近1年收益', value: `${fund.yield1y >= 0 ? '+' : ''}${fund.yield1y.toFixed(2)}%`, color: fund.yield1y >= 0 ? '#dc2626' : '#16a34a' },
            { label: '近3年收益', value: `${fund.yield3y >= 0 ? '+' : ''}${fund.yield3y.toFixed(2)}%`, color: fund.yield3y >= 0 ? '#dc2626' : '#16a34a' },
            { label: '基金规模', value: `${fund.aum.toFixed(1)} 亿元` },
          ].map((item) => (
            <Col span={6} key={item.label}>
              <div style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>{item.label}</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: (item as any).color ?? '#0f172a', fontFamily: "'DIN Alternate', 'Roboto', sans-serif" }}>
                {(item as any).icon && <span style={{ marginRight: 6, fontSize: 16, color: '#94a3b8' }}>{(item as any).icon}</span>}
                {item.value}
              </div>
            </Col>
          ))}
        </Row>

        <Descriptions column={3} size="small">
          <Descriptions.Item label="产品类型">{fund.type}</Descriptions.Item>
          <Descriptions.Item label="基金经理">{fund.manager}</Descriptions.Item>
          <Descriptions.Item label="成立日期">{fmtDate(fund.inceptionDate)}</Descriptions.Item>
          <Descriptions.Item label="最大回撤">
            <span style={{ color: '#dc2626' }}>{fund.maxDrawdown.toFixed(2)}%</span>
          </Descriptions.Item>
          <Descriptions.Item label="申购费率">{fund.subscriptionFeeRate}%</Descriptions.Item>
          <Descriptions.Item label="赎回费率">{fund.redemptionFeeRate}%</Descriptions.Item>
          <Descriptions.Item label="最低申购">
            {fund.minSubscription >= 1000
              ? `${fund.minSubscription.toLocaleString()} 元`
              : `${fund.minSubscription} 元`}
          </Descriptions.Item>
          {fund.shareClass && (
            <Descriptions.Item label="份额类别">{fund.shareClass} 类</Descriptions.Item>
          )}
          <Descriptions.Item label="业绩比较基准" span={fund.shareClass ? 1 : 2}>
            <Tooltip title={fund.benchmark}>
              <Text ellipsis style={{ maxWidth: 280, display: 'inline-block' }}>
                {fund.benchmark}
              </Text>
            </Tooltip>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card bordered={false} className="crm-card">
        <Tabs
          defaultActiveKey="holders"
          items={[
            {
              key: 'holders',
              label: <Space><UserOutlined />持有客户 ({holders.length})</Space>,
              children: (
                <div>
                  {holders.length > 0 && (
                    <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f8fafc', borderRadius: 12, display: 'inline-block' }}>
                      <span style={{ color: '#64748b', fontSize: 13 }}>
                        合计持仓市值：
                        <span style={{ color: '#2563eb', fontWeight: 600, marginLeft: 4 }}>{fmt万(totalHoldingAmt)}</span>
                        ，持有客户 {holders.length} 位
                      </span>
                    </div>
                  )}
                  <Table<HolderRow>
                    className="fund-table"
                    rowKey="id"
                    dataSource={holders}
                    columns={holderColumns}
                    pagination={false}
                    size="middle"
                    locale={{ emptyText: '暂无客户持有该产品' }}
                    onRow={(row) => ({
                      style: { cursor: 'pointer' },
                      onClick: (e) => {
                        const target = e.target as HTMLElement
                        if (target.tagName !== 'BUTTON' && !target.closest('button') && !target.closest('span[style*="cursor: pointer"]')) {
                          navigate(`/clients/${row.customerId}`)
                        }
                      },
                    })}
                  />
                </div>
              ),
            },
            {
              key: 'followups',
              label: <Space><FileTextOutlined />相关跟进 ({followups.length})</Space>,
              children: (
                <div>
                  {followups.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                      暂无与该产品相关的跟进记录
                    </div>
                  ) : (
                    <Timeline
                      style={{ marginTop: 16 }}
                      items={followups.map((fu) => {
                        const customer = clientMap[fu.customerId]
                        return {
                          color: '#2563eb',
                          children: (
                            <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 12, marginBottom: 4 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <Space size={8}>
                                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{fmtDate(fu.timestamp)}</span>
                                  <Tag className={`soft-tag ${METHOD_TAG[fu.method]}`}>{fu.method}</Tag>
                                  <Tag className={`soft-tag ${INTENT_TAG[fu.intent]}`}>{fu.intent}</Tag>
                                </Space>
                                {customer && (
                                  <span
                                    style={{ color: '#2563eb', cursor: 'pointer', fontSize: 13 }}
                                    onClick={() => navigate(`/clients/${fu.customerId}`)}
                                  >
                                    {customer.name}
                                  </span>
                                )}
                              </div>
                              <Paragraph
                                ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}
                                style={{ margin: 0, fontSize: 13, color: '#374151' }}
                              >
                                {fu.content}
                              </Paragraph>
                              {fu.nextAction && (
                                <div style={{ marginTop: 6 }}>
                                  <span style={{ fontSize: 12, color: '#94a3b8' }}>下一步：</span>
                                  <span style={{ fontSize: 12, color: '#475569' }}>{fu.nextAction}</span>
                                </div>
                              )}
                            </div>
                          ),
                        }
                      })}
                    />
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
