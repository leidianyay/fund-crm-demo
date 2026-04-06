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
  Timeline,
  Modal,
  Form,
  Select,
  Input,
  Tooltip,
  Row,
  Col,
  Statistic,
  Alert,
  message,
  DatePicker,
} from 'antd'
import dayjs from 'dayjs'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  WalletOutlined,
  UserOutlined,
  FileTextOutlined,
  WarningOutlined,
  FundOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import { clientApi } from '../../api/clientApi'

import { followupApi } from '../../api/followupApi'
import { fundApi } from '../../api/fundApi'
import type { Customer, RiskAppetite } from '../../types/client'
import type { Holding } from '../../types/holding'
import type { FollowUp, FollowUpMethod, FollowUpIntent } from '../../types/followup'
import type { Product, RiskLevel, ProductType } from '../../types/fund'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

const RISK_APPETITE_TAG: Record<RiskAppetite, string> = {
  保守: 'green',
  稳健: 'green',
  平衡: 'amber',
  积极: 'red',
  激进: 'red',
}

const LEVEL_TAG_CLS: Record<string, string> = {
  普通: '',
  银卡: '',
  金卡: 'amber',
  钻石: 'blue',
}

const RISK_TAG: Record<RiskLevel, { cls: string; label: string }> = {
  1: { cls: 'green', label: 'R1 低风险' },
  2: { cls: 'green', label: 'R2 中低风险' },
  3: { cls: 'amber', label: 'R3 中风险' },
  4: { cls: 'red', label: 'R4 中高风险' },
  5: { cls: 'red', label: 'R5 高风险' },
}

const TYPE_TAG: Record<ProductType, string> = {
  股票型: 'red',
  混合型: 'blue',
  债券型: 'cyan',
  货币型: 'green',
  FOF: 'amber',
  QDII: 'blue',
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

const FOLLOW_UP_METHODS: FollowUpMethod[] = ['电话', '面访', '微信', '邮件', '视频会议']
const FOLLOW_UP_INTENTS: FollowUpIntent[] = ['推进中', '成功推荐', '暂无意向', '信息同步', '风险提示']

function fmt万(v: number) {
  if (v >= 1e8) return `${(v / 1e8).toFixed(2)} 亿`
  if (v >= 1e4) return `${(v / 1e4).toFixed(2)} 万`
  return v.toFixed(0)
}

function fmtDate(s?: string) {
  return s?.slice(0, 10) ?? '-'
}

function fmtDateTime(s?: string) {
  if (!s) return '-'
  const d = new Date(s)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${min}`
}

interface HoldingRow extends Holding {
  product?: Product
}

interface FollowUpFormValues {
  method: FollowUpMethod
  intent: FollowUpIntent
  intentScore?: 1 | 2 | 3 | 4 | 5
  content: string
  date?: dayjs.Dayjs
  nextFollowUpDate?: dayjs.Dayjs
  relatedProductIds?: string[]
  nextAction?: string
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [client, setClient] = useState<Customer | null>(null)
  const [holdings, setHoldings] = useState<HoldingRow[]>([])
  const [followups, setFollowups] = useState<FollowUp[]>([])
  const [allFunds, setAllFunds] = useState<Product[]>([])

  const [showModal, setShowModal] = useState(false)
  const [form] = Form.useForm<FollowUpFormValues>()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setNotFound(false)
    setError(null)

    Promise.all([
      clientApi.getById(id),
      clientApi.getHoldings(id),
      followupApi.list({ customerId: id }),
      fundApi.list(),
    ])
      .then(([clientRes, holdingsRes, followupsRes, fundsRes]) => {
        setClient(clientRes.data)

        const fMap: Record<string, Product> = {}
        fundsRes.data.forEach((f) => (fMap[f.id] = f))
        setAllFunds(fundsRes.data)

        const holdingRows: HoldingRow[] = holdingsRes.data.map((h) => ({
          ...h,
          product: fMap[h.productId],
        }))
        holdingRows.sort((a, b) => b.currentAmount - a.currentAmount)
        setHoldings(holdingRows)

        const sorted = [...followupsRes.data].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )
        setFollowups(sorted)
      })
      .catch((err) => {
        if (err?.status === 404) setNotFound(true)
        else setError('数据加载失败，请稍后重试')
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleAddFollowUp = async (values: FollowUpFormValues) => {
    if (!id) return
    setSubmitting(true)
    try {
      const res = await followupApi.create({
        customerId: id,
        method: values.method,
        intent: values.intent,
        intentScore: values.intentScore,
        content: values.content,
        timestamp: values.date ? values.date.toISOString() : new Date().toISOString(),
        nextFollowUpDate: values.nextFollowUpDate?.format('YYYY-MM-DD'),
        salesId: 'sales001',
        relatedProductIds: values.relatedProductIds ?? [],
        nextAction: values.nextAction,
      })
      setFollowups((prev) => [res.data, ...prev])
      if (client) {
        setClient({ ...client, lastFollowUpAt: res.data.timestamp })
      }
      setShowModal(false)
      form.resetFields()
      message.success('跟进记录已添加')
    } catch {
      message.error('添加失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Skeleton.Button active style={{ width: 80, marginBottom: 16 }} />
        <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #f3f4f6' }}>
          <Skeleton.Input active style={{ width: 180, height: 32, marginBottom: 10, display: 'block' }} />
          <Skeleton active paragraph={{ rows: 1 }} title={false} />
        </div>
        <Row gutter={[24, 24]}>
          <Col xs={24} xl={16}>
            <Card style={{ marginBottom: 20 }}>
              <Row gutter={24}>
                {[0, 1, 2, 3].map((i) => (
                  <Col span={6} key={i}>
                    <Skeleton.Input active style={{ width: '100%', height: 60 }} />
                  </Col>
                ))}
              </Row>
            </Card>
            <Card style={{ marginBottom: 20 }}>
              <Skeleton active paragraph={{ rows: 4 }} />
            </Card>
            <Card>
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
          </Col>
          <Col xs={24} xl={8}>
            <Card>
              <Skeleton active paragraph={{ rows: 8 }} />
            </Card>
          </Col>
        </Row>
      </div>
    )
  }

  if (notFound || !client) {
    return (
      <Result
        status="404"
        title="客户不存在"
        subTitle="未找到该客户，请检查链接是否正确"
        extra={
          <Button type="primary" onClick={() => navigate('/clients')}>
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

  const totalHoldingAmt = holdings.reduce((s, h) => s + h.currentAmount, 0)
  const totalCostAmt = holdings.reduce((s, h) => s + h.costAmount, 0)
  const overallProfitRate =
    totalCostAmt > 0 ? ((totalHoldingAmt - totalCostAmt) / totalCostAmt) * 100 : 0

  const today = new Date()
  const riskExpiry = new Date(client.riskExpiryDate)
  const isRiskExpired = riskExpiry < today
  const daysToRiskExpiry = Math.ceil((riskExpiry.getTime() - today.getTime()) / 86400000)

  const holdingColumns: ColumnsType<HoldingRow> = [
    {
      title: '基金名称',
      key: 'name',
      render: (_, row) =>
        row.product ? (
          <Button
            type="link"
            style={{ padding: 0 }}
            icon={<FundOutlined />}
            onClick={() => navigate(`/funds/${row.productId}`)}
          >
            {row.product.name}
          </Button>
        ) : (
          <Text type="secondary">{row.productId}</Text>
        ),
    },
    {
      title: '类型',
      key: 'type',
      width: 80,
      render: (_, row) =>
        row.product ? <Tag className={`soft-tag ${TYPE_TAG[row.product.type]}`}>{row.product.type}</Tag> : '-',
    },
    {
      title: '风险等级',
      key: 'riskLevel',
      width: 135,
      render: (_, row) =>
        row.product ? (
          <Tag className={`soft-tag ${RISK_TAG[row.product.riskLevel].cls}`}>
            {RISK_TAG[row.product.riskLevel].label}
          </Tag>
        ) : (
          '-'
        ),
    },
    {
      title: '最新净值',
      key: 'nav',
      width: 95,
      align: 'right',
      render: (_, row) => (row.product ? row.product.nav.toFixed(4) : '-'),
    },
    {
      title: '近1年收益',
      key: 'yield1y',
      width: 105,
      align: 'right',
      render: (_, row) => {
        if (!row.product) return '-'
        const v = row.product.yield1y
        const color = v > 0 ? '#ef4444' : v < 0 ? '#10b981' : '#6b7280'
        return (
          <Text strong style={{ color }}>
            {v > 0 ? '+' : ''}
            {v.toFixed(2)}%
          </Text>
        )
      },
      sorter: (a, b) => (a.product?.yield1y ?? 0) - (b.product?.yield1y ?? 0),
    },
    {
      title: '持仓市值',
      dataIndex: 'currentAmount',
      key: 'currentAmount',
      width: 120,
      align: 'right',
      render: (v: number) => <Text strong>{fmt万(v)}</Text>,
      sorter: (a, b) => a.currentAmount - b.currentAmount,
      defaultSortOrder: 'descend',
    },
    {
      title: '浮盈率',
      dataIndex: 'profitRate',
      key: 'profitRate',
      width: 95,
      align: 'right',
      render: (v: number) => {
        const color = v > 0 ? '#ef4444' : v < 0 ? '#10b981' : '#6b7280'
        return (
          <Text strong style={{ color }}>
            {v > 0 ? '+' : ''}
            {v.toFixed(2)}%
          </Text>
        )
      },
      sorter: (a, b) => a.profitRate - b.profitRate,
    },
    {
      title: '建仓日期',
      dataIndex: 'holdingSince',
      key: 'holdingSince',
      width: 105,
      render: fmtDate,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, row) => (
        <Button type="link" size="small" onClick={() => navigate(`/funds/${row.productId}`)}>
          查看基金
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/clients')}
        style={{ marginBottom: 16, paddingLeft: 0 }}
      >
        返回列表
      </Button>

      {isRiskExpired && (
        <Alert
          type="warning"
          icon={<WarningOutlined />}
          showIcon
          title="风险评测已过期"
          description={`该客户的风险评测于 ${fmtDate(client.riskExpiryDate)} 到期，请尽快安排重新评测，到期前无法向客户推荐新产品。`}
          style={{ marginBottom: 16 }}
          closable
        />
      )}
      {!isRiskExpired && daysToRiskExpiry <= 30 && (
        <Alert
          type="info"
          showIcon
          title={`风险评测将于 ${daysToRiskExpiry} 天后到期（${fmtDate(client.riskExpiryDate)}），请提前安排复测。`}
          style={{ marginBottom: 16 }}
          closable
        />
      )}

      {/* ── 客户 Header（无卡片，大字名字 + 优雅 Tag 行）── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 24,
          paddingBottom: 20,
          borderBottom: '1px solid #f3f4f6',
        }}
      >
        <div>
          <Space align="center" size={10} style={{ marginBottom: 8, flexWrap: 'wrap' }}>
            <Title level={3} style={{ margin: 0, fontSize: 24, fontWeight: 700, lineHeight: 1.2, color: '#0f172a' }}>
              {client.name}
            </Title>
            <Tag className={`soft-tag ${client.customerType === '机构' ? 'blue' : ''}`}>
              {client.customerType}
            </Tag>
            <Tag className={`soft-tag ${LEVEL_TAG_CLS[client.customerLevel] ?? ''}`}>
              {client.customerLevel}
            </Tag>
            <Tag className={`soft-tag ${RISK_APPETITE_TAG[client.riskAppetite]}`}>
              {client.riskAppetite}
            </Tag>
          </Space>
          <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
            {client.phone} · {client.region}
            {client.company ? ` · ${client.company}` : ''}
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
          新建跟进
        </Button>
      </div>

      {/* ── 主体两栏布局 ── */}
      <Row gutter={[24, 24]} align="top">
        {/* 左侧：资产概览 + 客户信息 + 持仓表格 */}
        <Col xs={24} xl={16}>
          {/* 资产概览 */}
          <Card bordered={false} className="crm-card" title={<Space><WalletOutlined /><span>资产概览</span></Space>} style={{ marginBottom: 20 }}>
            <Row gutter={24}>
              <Col span={6}>
                <Statistic title="持仓产品数" value={holdings.length} suffix="只" prefix={<WalletOutlined />} />
              </Col>
              <Col span={6}>
                <Statistic
                  title="持仓总市值"
                  value={totalHoldingAmt / 10000}
                  precision={2}
                  suffix="万"
                  styles={{ content: { color: '#2563eb' } }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="综合浮盈率"
                  value={overallProfitRate}
                  precision={2}
                  suffix="%"
                  styles={{ content: { color: overallProfitRate >= 0 ? '#ef4444' : '#10b981' } }}
                />
              </Col>
              <Col span={6}>
                <Statistic title="跟进记录数" value={followups.length} suffix="条" prefix={<FileTextOutlined />} />
              </Col>
            </Row>
          </Card>

          {/* 客户信息 */}
          <Card bordered={false} className="crm-card" title={<Space><UserOutlined /><span>客户信息</span></Space>} style={{ marginBottom: 20 }}>
            <Descriptions column={3} size="small" bordered>
              <Descriptions.Item label="联系电话">{client.phone}</Descriptions.Item>
              <Descriptions.Item label="所在城市">{client.region}</Descriptions.Item>
              <Descriptions.Item label="公司/机构">{client.company || '-'}</Descriptions.Item>
              <Descriptions.Item label="投资者分级">
                <Tag className={`soft-tag ${client.investorGrade === '专业投资者' ? 'green' : ''}`}>
                  {client.investorGrade}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="风险评测日期">{fmtDate(client.riskAssessedAt)}</Descriptions.Item>
              <Descriptions.Item label="风险评测到期">
                <Text style={{ color: isRiskExpired ? '#ef4444' : undefined }}>
                  {fmtDate(client.riskExpiryDate)}
                  {isRiskExpired && ' （已过期）'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="KYC 完成日期">{fmtDate(client.kycCompletedAt)}</Descriptions.Item>
              <Descriptions.Item label="最近跟进">
                {client.lastFollowUpAt ? fmtDate(client.lastFollowUpAt) : '未跟进'}
              </Descriptions.Item>
              <Descriptions.Item label="开户日期">{fmtDate(client.createdAt)}</Descriptions.Item>
              {client.tags.length > 0 && (
                <Descriptions.Item label="客户标签" span={3}>
                  <Space size={4} wrap>
                    {client.tags.map((t) => (
                      <Tag key={t} className="soft-tag">{t}</Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* 持仓详情 */}
          <Card
            bordered={false}
            className="crm-card"
            title={<Space><WalletOutlined /><span>持仓详情 ({holdings.length})</span></Space>}
          >
            {holdings.length > 0 && (
              <div
                style={{
                  marginBottom: 12,
                  padding: '8px 14px',
                  background: '#f8fafc',
                  borderRadius: 8,
                  display: 'inline-block',
                }}
              >
                <Text type="secondary">
                  持仓总市值：
                  <Text strong style={{ color: '#2563eb', marginLeft: 4 }}>
                    {fmt万(totalHoldingAmt)}
                  </Text>
                  ，综合浮盈率：
                  <Text
                    strong
                    style={{
                      color: overallProfitRate >= 0 ? '#ef4444' : '#10b981',
                      marginLeft: 4,
                    }}
                  >
                    {overallProfitRate >= 0 ? '+' : ''}
                    {overallProfitRate.toFixed(2)}%
                  </Text>
                </Text>
              </div>
            )}
            <Table<HoldingRow>
              className="fund-table"
              rowKey="id"
              dataSource={holdings}
              columns={holdingColumns}
              pagination={false}
              size="middle"
              scroll={{ x: 1000 }}
              locale={{ emptyText: '该客户暂无持仓记录' }}
              onRow={(row) => ({
                style: { cursor: 'pointer' },
                onClick: (e) => {
                  if (!(e.target as HTMLElement).closest('button')) {
                    navigate(`/funds/${row.productId}`)
                  }
                },
              })}
            />
          </Card>
        </Col>

        {/* 右侧：跟进记录 Timeline */}
        <Col xs={24} xl={8}>
          <Card
            bordered={false}
            className="crm-card"
            title={<Space><FileTextOutlined /><span>跟进记录 ({followups.length})</span></Space>}
            extra={
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
                新建
              </Button>
            }
            styles={{ body: { padding: '16px 20px', maxHeight: '72vh', overflowY: 'auto' } }}
          >
            {followups.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <UserOutlined style={{ fontSize: 32, display: 'block', marginBottom: 10, color: '#d1d5db' }} />
                <Text type="secondary" style={{ fontSize: 13 }}>暂无跟进记录，点击"新建"开始记录</Text>
              </div>
            ) : (
              <Timeline
                style={{ marginTop: 8 }}
                items={followups.map((fu) => ({
                  color:
                    fu.intent === '成功推荐'
                      ? '#10b981'
                      : fu.intent === '风险提示'
                        ? '#ef4444'
                        : '#2563eb',
                  children: (
                    <div style={{ paddingBottom: 12 }}>
                      <Text
                        style={{
                          fontSize: 11,
                          color: '#9ca3af',
                          display: 'block',
                          marginBottom: 6,
                          fontFamily: 'Roboto, sans-serif',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {fmtDateTime(fu.timestamp)}
                      </Text>
                      <Space size={4} wrap style={{ marginBottom: 8 }}>
                        <Tag className={`soft-tag ${METHOD_TAG[fu.method]}`}>{fu.method}</Tag>
                        <Tag className={`soft-tag ${INTENT_TAG[fu.intent]}`}>{fu.intent}</Tag>
                        {fu.intentScore && (
                          <Tooltip title={`意向评分：${fu.intentScore} / 5`}>
                            <Tag className="soft-tag amber">{fu.intentScore}/5</Tag>
                          </Tooltip>
                        )}
                      </Space>
                      <Paragraph
                        ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}
                        style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.6 }}
                      >
                        {fu.content}
                      </Paragraph>
                      {fu.relatedProductIds.length > 0 && (
                        <div style={{ marginTop: 6 }}>
                          <Text style={{ fontSize: 11, color: '#9ca3af' }}>涉及产品：</Text>
                          <Space size={4} wrap>
                            {fu.relatedProductIds.map((pid) => {
                              const fund = allFunds.find((f) => f.id === pid)
                              return fund ? (
                                <Button
                                  key={pid}
                                  type="link"
                                  size="small"
                                  style={{ padding: 0, height: 'auto', fontSize: 11, color: '#2563eb' }}
                                  onClick={() => navigate(`/funds/${pid}`)}
                                >
                                  {fund.name}
                                </Button>
                              ) : null
                            })}
                          </Space>
                        </div>
                      )}
                      {fu.nextAction && (
                        <div style={{ marginTop: 6 }}>
                          <Text style={{ fontSize: 11, color: '#9ca3af' }}>下一步：</Text>
                          <Text style={{ fontSize: 12, color: '#6b7280' }}>{fu.nextAction}</Text>
                        </div>
                      )}
                      {fu.nextFollowUpDate && (
                        <div style={{ marginTop: 4 }}>
                          <Text style={{ fontSize: 11, color: '#9ca3af' }}>计划跟进：</Text>
                          <Text style={{ fontSize: 12, color: '#6b7280' }}>{fmtDate(fu.nextFollowUpDate)}</Text>
                        </div>
                      )}
                    </div>
                  ),
                }))}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="新建跟进记录"
        open={showModal}
        onCancel={() => {
          setShowModal(false)
          form.resetFields()
        }}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddFollowUp}
          style={{ marginTop: 16 }}
          initialValues={{ date: dayjs() }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="method"
                label="跟进方式"
                rules={[{ required: true, message: '请选择跟进方式' }]}
              >
                <Select
                  placeholder="请选择"
                  options={FOLLOW_UP_METHODS.map((m) => ({ label: m, value: m }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="intent"
                label="意向状态"
                rules={[{ required: true, message: '请选择意向状态' }]}
              >
                <Select
                  placeholder="请选择"
                  options={FOLLOW_UP_INTENTS.map((i) => ({ label: i, value: i }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="intentScore" label="意向评分（可选）">
                <Select
                  placeholder="1=极低，5=极高"
                  allowClear
                  options={([1, 2, 3, 4, 5] as const).map((n) => ({
                    label: `${n} 分`,
                    value: n,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="date" label="跟进日期">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="content"
            label="跟进内容"
            rules={[{ required: true, message: '请填写跟进内容' }]}
          >
            <TextArea rows={4} placeholder="请描述本次跟进的主要内容..." showCount maxLength={500} />
          </Form.Item>

          <Form.Item name="relatedProductIds" label="关联产品（可选）">
            <Select
              mode="multiple"
              placeholder="选择本次跟进涉及的基金产品"
              options={allFunds.map((f) => ({
                label: `${f.name}（${f.code}）`,
                value: f.id,
              }))}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="nextFollowUpDate" label="下次跟进日期（可选）">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="nextAction" label="下一步行动（可选）">
                <Input placeholder="例：发送产品说明书" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setShowModal(false)
                  form.resetFields()
                }}
              >
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                提交
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
