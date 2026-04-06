import { useState, useEffect, useCallback } from 'react'
import {
  Drawer,
  Typography,
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
  UserOutlined,
  FileTextOutlined,
  WalletOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import { fundApi } from '../../api/fundApi'
import { holdingApi } from '../../api/holdingApi'
import { clientApi } from '../../api/clientApi'
import { followupApi } from '../../api/followupApi'
import type { Product, RiskLevel, ProductStatus } from '../../types/fund'
import type { Holding } from '../../types/holding'
import type { Customer } from '../../types/client'
import type { FollowUp, FollowUpMethod, FollowUpIntent } from '../../types/followup'

const { Text, Paragraph } = Typography

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

interface Props {
  fundId: string | null
  onClose: () => void
}

export default function FundDetailDrawer({ fundId, onClose }: Props) {
  const navigate = useNavigate()
  const open = Boolean(fundId)

  const [fund, setFund] = useState<Product | null>(null)
  const [holders, setHolders] = useState<HolderRow[]>([])
  const [followups, setFollowups] = useState<FollowUp[]>([])
  const [clientMap, setClientMap] = useState<Record<string, Customer>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(() => {
    if (!fundId) return
    setLoading(true)
    setError(null)

    Promise.all([
      fundApi.getById(fundId),
      holdingApi.list({ productId: fundId }),
      clientApi.list(),
      followupApi.list({ productId: fundId }),
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
        setError(err?.status === 404 ? '该基金产品不存在' : '加载失败，请稍后重试')
      })
      .finally(() => setLoading(false))
  }, [fundId])

  useEffect(() => {
    if (fundId) {
      loadData()
    } else {
      setFund(null)
      setHolders([])
      setFollowups([])
    }
  }, [fundId, loadData])

  const totalHoldingAmt = holders.reduce((s, h) => s + h.currentAmount, 0)

  const holderColumns: ColumnsType<HolderRow> = [
    {
      title: '客户',
      key: 'name',
      render: (_, row) =>
        row.customer ? (
          <span
            style={{ color: '#0f172a', fontWeight: 500, cursor: 'pointer' }}
            onClick={() => { onClose(); navigate(`/clients/${row.customerId}`) }}
          >
            {row.customer.name}
          </span>
        ) : (
          <span style={{ color: '#94a3b8' }}>{row.customerId}</span>
        ),
    },
    {
      title: '风险偏好',
      key: 'riskAppetite',
      width: 80,
      render: (_, row) => row.customer?.riskAppetite ?? '-',
    },
    {
      title: '持仓市值',
      dataIndex: 'currentAmount',
      key: 'currentAmount',
      width: 110,
      align: 'right',
      render: (v: number) => <span style={{ fontWeight: 600 }}>{fmt万(v)}</span>,
    },
    {
      title: '浮盈率',
      dataIndex: 'profitRate',
      key: 'profitRate',
      width: 90,
      align: 'right',
      render: (v: number) => {
        const color = v > 0 ? '#dc2626' : v < 0 ? '#16a34a' : '#64748b'
        return (
          <span style={{ color, fontWeight: 500 }}>
            {v > 0 ? '+' : ''}{v.toFixed(2)}%
          </span>
        )
      },
    },
  ]

  const riskInfo = fund ? RISK_TAG[fund.riskLevel] : null
  const statusCls = fund ? STATUS_TAG[fund.status] : ''

  function renderContent() {
    if (loading) {
      return (
        <>
          <Row gutter={16} style={{ marginBottom: 20 }}>
            {[0, 1, 2, 3].map((i) => (
              <Col span={12} key={i} style={{ marginBottom: i >= 2 ? 0 : 16 }}>
                <Skeleton.Input active style={{ width: '100%', height: 64, borderRadius: 6 }} />
              </Col>
            ))}
          </Row>
          <Skeleton active paragraph={{ rows: 4 }} style={{ marginBottom: 20 }} />
          <Skeleton active paragraph={{ rows: 4 }} />
        </>
      )
    }

    if (error) {
      return (
        <Result
          status="error"
          title="加载失败"
          subTitle={error}
          extra={<Button onClick={loadData}>重试</Button>}
        />
      )
    }

    if (!fund) return null

    return (
      <>
        <Row gutter={16} style={{ marginBottom: 20 }}>
          {[
            { label: '最新净值', value: fund.nav.toFixed(4), icon: <WalletOutlined /> },
            { label: '近1年收益', value: `${fund.yield1y >= 0 ? '+' : ''}${fund.yield1y.toFixed(2)}%`, color: fund.yield1y >= 0 ? '#dc2626' : '#16a34a' },
            { label: '近3年收益', value: `${fund.yield3y >= 0 ? '+' : ''}${fund.yield3y.toFixed(2)}%`, color: fund.yield3y >= 0 ? '#dc2626' : '#16a34a' },
            { label: '基金规模', value: `${fund.aum.toFixed(1)} 亿` },
          ].map((item, i) => (
            <Col span={12} key={item.label} style={{ marginBottom: i >= 2 ? 0 : 16 }}>
              <div style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: (item as any).color ?? '#0f172a', fontFamily: "'DIN Alternate', 'Roboto', sans-serif" }}>
                {(item as any).icon && <span style={{ marginRight: 4, fontSize: 14, color: '#94a3b8' }}>{(item as any).icon}</span>}
                {item.value}
              </div>
            </Col>
          ))}
        </Row>

        <Descriptions column={2} size="small" style={{ marginBottom: 20 }}>
          <Descriptions.Item label="产品类型">{fund.type}</Descriptions.Item>
          <Descriptions.Item label="基金经理">{fund.manager}</Descriptions.Item>
          <Descriptions.Item label="成立日期">{fmtDate(fund.inceptionDate)}</Descriptions.Item>
          <Descriptions.Item label="最大回撤">
            <span style={{ color: '#dc2626' }}>{fund.maxDrawdown.toFixed(2)}%</span>
          </Descriptions.Item>
          <Descriptions.Item label="申购费率">{fund.subscriptionFeeRate}%</Descriptions.Item>
          <Descriptions.Item label="赎回费率">{fund.redemptionFeeRate}%</Descriptions.Item>
          <Descriptions.Item label="最低申购" span={2}>
            {fund.minSubscription >= 1000
              ? `${fund.minSubscription.toLocaleString()} 元`
              : `${fund.minSubscription} 元`}
          </Descriptions.Item>
          <Descriptions.Item label="业绩比较基准" span={2}>
            <Tooltip title={fund.benchmark}>
              <Text ellipsis style={{ maxWidth: 280, display: 'inline-block' }}>
                {fund.benchmark}
              </Text>
            </Tooltip>
          </Descriptions.Item>
        </Descriptions>

        <Tabs
          size="small"
          items={[
            {
              key: 'holders',
              label: <Space size={4}><UserOutlined />持有客户 ({holders.length})</Space>,
              children: (
                <>
                  {holders.length > 0 && (
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                      合计持仓市值：
                      <span style={{ color: '#2563eb', fontWeight: 600 }}>{fmt万(totalHoldingAmt)}</span>
                    </div>
                  )}
                  <Table<HolderRow>
                    className="fund-table"
                    rowKey="id"
                    dataSource={holders}
                    columns={holderColumns}
                    pagination={false}
                    size="small"
                    locale={{ emptyText: '暂无客户持有该产品' }}
                  />
                </>
              ),
            },
            {
              key: 'followups',
              label: <Space size={4}><FileTextOutlined />相关跟进 ({followups.length})</Space>,
              children:
                followups.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 13 }}>
                    暂无与该产品相关的跟进记录
                  </div>
                ) : (
                  <Timeline
                    style={{ marginTop: 12 }}
                    items={followups.map((fu) => ({
                      color: '#2563eb',
                      children: (
                        <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 12, marginBottom: 4 }}>
                          <Space size={6} style={{ marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: '#94a3b8' }}>{fmtDate(fu.timestamp)}</span>
                            <Tag className={`soft-tag ${METHOD_TAG[fu.method]}`}>{fu.method}</Tag>
                            <Tag className={`soft-tag ${INTENT_TAG[fu.intent]}`}>{fu.intent}</Tag>
                            {clientMap[fu.customerId] && (
                              <span
                                style={{ color: '#2563eb', cursor: 'pointer', fontSize: 12 }}
                                onClick={() => { onClose(); navigate(`/clients/${fu.customerId}`) }}
                              >
                                {clientMap[fu.customerId].name}
                              </span>
                            )}
                          </Space>
                          <Paragraph
                            ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}
                            style={{ margin: 0, fontSize: 12, color: '#374151' }}
                          >
                            {fu.content}
                          </Paragraph>
                        </div>
                      ),
                    }))}
                  />
                ),
            },
          ]}
        />
      </>
    )
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      styles={{ wrapper: { width: 600 } }}
      destroyOnHidden
      title={
        fund && !loading && !error ? (
          <Space size={10}>
            <span style={{ fontWeight: 600 }}>{fund.name}</span>
            <span style={{ fontFamily: "'SF Mono', 'Roboto Mono', monospace", fontSize: 13, color: '#64748b' }}>{fund.code}</span>
            {statusCls ? <Tag className={`soft-tag ${statusCls}`}>{fund.status}</Tag> : <Tag className="soft-tag">{fund.status}</Tag>}
            {riskInfo && <Tag className={`soft-tag ${riskInfo.cls}`}>{riskInfo.label}</Tag>}
          </Space>
        ) : (
          '基金详情'
        )
      }
      extra={
        fund && !loading && !error ? (
          <Button
            type="primary"
            ghost
            size="small"
            icon={<ArrowRightOutlined />}
            onClick={() => { onClose(); navigate(`/funds/${fund.id}`) }}
          >
            完整详情
          </Button>
        ) : null
      }
    >
      {renderContent()}
    </Drawer>
  )
}
