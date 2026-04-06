import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  ArrowRightOutlined,
  ClockCircleOutlined,
  FileAddOutlined,
  FundOutlined,
  RobotOutlined,
  SearchOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/es/table'

import { clientApi } from '../../api/clientApi'
import { followupApi } from '../../api/followupApi'
import { fundApi } from '../../api/fundApi'
import { holdingApi } from '../../api/holdingApi'
import type { Customer } from '../../types/client'
import type { FollowUp, FollowUpIntent, FollowUpMethod } from '../../types/followup'
import type { Product } from '../../types/fund'
import { parseIntent } from '../../utils/agentParser'
import type { DictationResult } from '../../utils/agentParser'

const { Paragraph, Text, Title } = Typography
const { TextArea } = Input

interface DictationPrefill {
  parsed: DictationResult
  matchedClient?: Customer
  matchedFunds: Product[]
}

interface DictationPreviewCardProps {
  prefill: DictationPrefill
  allClients: Customer[]
  allFunds: Product[]
  onConfirm: (values: Partial<FollowUpFormValues>) => void
}

type AssistantResult =
  | { kind: 'clients'; data: Customer[]; context: string }
  | { kind: 'funds'; data: Product[]; context: string }
  | { kind: 'recent_followups'; clients: Array<{ customer: Customer; lastDate: string; method: string }>; days: number }
  | { kind: 'dictation'; prefill: DictationPrefill }
  | { kind: 'error'; msg: string }
  | { kind: 'empty'; msg: string }

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  loading?: boolean
  result?: AssistantResult
}

interface FollowUpFormValues {
  customerId: string
  method: FollowUpMethod
  intent: FollowUpIntent
  intentScore?: 1 | 2 | 3 | 4 | 5
  content: string
  date?: Dayjs
  relatedProductIds?: string[]
  nextFollowUpDate?: Dayjs
  nextAction?: string
}

interface QuickAction {
  title: string
  description: string
  prompt: string
  icon: ReactNode
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    title: '客户持仓查询',
    description: '按客户查看其持有的基金产品',
    prompt: '张伟明买了哪些产品？',
    icon: <SearchOutlined />,
  },
  {
    title: '产品反查客户',
    description: '反查某只产品被哪些客户持有',
    prompt: '持有易方达蓝筹精选混合的客户有哪些？',
    icon: <FundOutlined />,
  },
  {
    title: '待跟进客户',
    description: '快速识别销售当天待办',
    prompt: '超过7天未跟进的客户有哪些？',
    icon: <ClockCircleOutlined />,
  },
  {
    title: '辅助录入',
    description: '口述一次沟通，自动预填表单',
    prompt: '今天下午和李建国通了电话，他对易方达蓝筹很感兴趣，下周三约好面谈，帮我生成一条跟进记录。',
    icon: <FileAddOutlined />,
  },
]

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

function normalizeFundKeyword(input: string) {
  return input
    .trim()
    .replace(/[（）()\-\s]/g, '')
    .replace(/基金|产品|一号|二号|三号|号/g, '')
    .toLowerCase()
}

function fuzzyMatchFund(keyword: string, funds: Product[]) {
  const rawValue = keyword.trim()
  const value = normalizeFundKeyword(rawValue)

  const exact =
    funds.find((item) => item.name === rawValue) ??
    funds.find((item) => item.code === rawValue)

  if (exact) return exact

  const normalizedMatched = funds.find((item) => {
    const normalizedName = normalizeFundKeyword(item.name)
    return normalizedName.includes(value) || value.includes(normalizedName)
  })

  if (normalizedMatched) return normalizedMatched

  return (
    funds.find((item) => item.name.includes(rawValue)) ??
    funds.find((item) => rawValue.includes(item.name.slice(0, 4)))
  )
}

function fuzzyMatchClient(keyword: string, clients: Customer[]) {
  const value = keyword.trim()
  return clients.find((item) => item.name === value) ?? clients.find((item) => item.name.includes(value))
}

function getRiskColor(value: string) {
  if (value.includes('保守')) return 'green'
  if (value.includes('稳健')) return 'cyan'
  if (value.includes('平衡')) return 'blue'
  if (value.includes('积极')) return 'orange'
  return 'red'
}

function ClientResultCard({ clients, context }: { clients: Customer[]; context: string }) {
  const navigate = useNavigate()

  if (!clients.length) {
    return <Empty description="未找到匹配客户" imageStyle={{ height: 40 }} />
  }

  return (
    <div>
      <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
        {context}，共 <Text strong>{clients.length}</Text> 位客户
      </Text>
      <List
        size="small"
        dataSource={clients}
        renderItem={(item) => (
          <List.Item
            style={{ padding: '8px 0' }}
            extra={
              <Button type="link" size="small" icon={<ArrowRightOutlined />} onClick={() => navigate(`/clients/${item.id}`)}>
                查看
              </Button>
            }
          >
            <List.Item.Meta
              avatar={<Avatar style={{ background: '#2563eb' }}>{item.name.slice(0, 1)}</Avatar>}
              title={<Text strong>{item.name}</Text>}
              description={
                <Space size={[6, 6]} wrap>
                  {item.company ? <Text type="secondary">{item.company}</Text> : null}
                  <Tag color={getRiskColor(item.riskAppetite)}>{item.riskAppetite}</Tag>
                  <Tag>{item.customerType}</Tag>
                  <Tag>{item.customerLevel}</Tag>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </div>
  )
}

function FundResultCard({ funds, context }: { funds: Product[]; context: string }) {
  const navigate = useNavigate()

  if (!funds.length) {
    return <Empty description="未找到匹配产品" imageStyle={{ height: 40 }} />
  }

  const columns: ColumnsType<Product> = [
    {
      title: '产品名称',
      dataIndex: 'name',
      key: 'name',
      render: (_value, row) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate(`/funds/${row.id}`)}>
          {row.name}
        </Button>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 92,
      render: (value: string) => <Tag>{value}</Tag>,
    },
    {
      title: '最新净值',
      dataIndex: 'nav',
      key: 'nav',
      width: 96,
      align: 'right',
      render: (value: number) => value.toFixed(4),
    },
    {
      title: '近1年收益',
      dataIndex: 'yield1y',
      key: 'yield1y',
      width: 110,
      align: 'right',
      render: (value: number) => (
        <Text style={{ color: value >= 0 ? '#16a34a' : '#dc2626' }}>{value >= 0 ? '+' : ''}{value.toFixed(2)}%</Text>
      ),
    },
    {
      title: '规模(亿)',
      dataIndex: 'aum',
      key: 'aum',
      width: 96,
      align: 'right',
      render: (value: number) => value.toFixed(1),
    },
  ]

  return (
    <div>
      <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
        {context}，共 <Text strong>{funds.length}</Text> 只产品
      </Text>
      <Table rowKey="id" className="fund-table" size="small" pagination={false} columns={columns} dataSource={funds} scroll={{ x: 520 }} />
    </div>
  )
}

function RecentFollowupsCard({ items, days }: { items: Array<{ customer: Customer; lastDate: string; method: string }>; days: number }) {
  const navigate = useNavigate()

  if (!items.length) {
    return <Empty description={`最近 ${days} 天暂无跟进记录`} imageStyle={{ height: 40 }} />
  }

  return (
    <div>
      <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
        最近 <Text strong>{days}</Text> 天内共 <Text strong>{items.length}</Text> 位客户有跟进记录
      </Text>
      <List
        size="small"
        dataSource={items}
        renderItem={(item) => (
          <List.Item
            style={{ padding: '8px 0' }}
            extra={
              <Button type="link" size="small" icon={<ArrowRightOutlined />} onClick={() => navigate(`/clients/${item.customer.id}`)}>
                查看
              </Button>
            }
          >
            <List.Item.Meta
              avatar={<Avatar style={{ background: '#16a34a' }}>{item.customer.name.slice(0, 1)}</Avatar>}
              title={<Space><Text strong>{item.customer.name}</Text><Tag>{item.method}</Tag></Space>}
              description={<Text type="secondary">最近跟进时间：{item.lastDate.slice(0, 10)}</Text>}
            />
          </List.Item>
        )}
      />
    </div>
  )
}

function DictationPreviewCard({
  prefill,
  allClients,
  allFunds,
  onConfirm,
}: DictationPreviewCardProps) {
  const [editingClient, setEditingClient] = useState(false)
  const [editingFunds, setEditingFunds] = useState(false)
  const [clientId, setClientId] = useState<string | undefined>(prefill.matchedClient?.id)
  const [fundIds, setFundIds] = useState<string[]>(prefill.matchedFunds.map((item) => item.id))

  const selectedClient = allClients.find((item) => item.id === clientId)
  const selectedFunds = allFunds.filter((item) => fundIds.includes(item.id))

  const handleConfirm = () => {
    onConfirm({
      customerId: clientId,
      method: prefill.parsed.method,
      content: prefill.parsed.rawInput,
      relatedProductIds: fundIds,
      nextAction: prefill.parsed.nextAction,
      date: dayjs(),
    })
  }

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Alert type="info" showIcon message="已识别为跟进录入任务" description="确认客户、产品与下一步动作后，即可一键写入跟进记录。" />
      <Descriptions bordered column={1} size="small" labelStyle={{ width: 108 }}>
        <Descriptions.Item label="识别客户">
          {editingClient ? (
            <Select
              autoFocus
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              placeholder="选择正确客户"
              value={clientId}
              onChange={(value) => {
                setClientId(value)
                setEditingClient(false)
              }}
              onBlur={() => setEditingClient(false)}
              options={allClients.map((item) => ({
                label: `${item.name} · ${item.company || item.region}`,
                value: item.id,
              }))}
            />
          ) : (
            <Tag color={selectedClient ? 'green' : 'orange'} style={{ cursor: 'pointer' }} onClick={() => setEditingClient(true)}>
              {selectedClient?.name || prefill.parsed.clientName || '点击选择客户'}
            </Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="沟通方式">
          {prefill.parsed.method || '未识别'}
        </Descriptions.Item>
        <Descriptions.Item label="关联产品">
          {editingFunds ? (
            <Select
              mode="multiple"
              autoFocus
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              placeholder="选择关联产品"
              value={fundIds}
              onChange={setFundIds}
              onBlur={() => setEditingFunds(false)}
              options={allFunds.map((item) => ({
                label: `${item.name} · ${item.code}`,
                value: item.id,
              }))}
            />
          ) : (
            <Space size={[6, 6]} wrap>
              {selectedFunds.length > 0 ? (
                selectedFunds.map((item) => (
                  <Tag key={item.id} color="blue" style={{ cursor: 'pointer' }} onClick={() => setEditingFunds(true)}>
                    {item.name}
                  </Tag>
                ))
              ) : (
                <Tag color="orange" style={{ cursor: 'pointer' }} onClick={() => setEditingFunds(true)}>
                  点击选择产品
                </Tag>
              )}
            </Space>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="下一步动作">
          {prefill.parsed.nextAction || '未识别'}
        </Descriptions.Item>
        <Descriptions.Item label="原始内容">
          {prefill.parsed.rawInput}
        </Descriptions.Item>
      </Descriptions>
      <div style={{ textAlign: 'right' }}>
        <Button type="primary" icon={<FileAddOutlined />} onClick={handleConfirm}>
          确认并录入
        </Button>
      </div>
    </Space>
  )
}

const MessageBubble = memo(function MessageBubble({
  msg,
  allClients,
  allFunds,
  onDictationConfirm,
}: {
  msg: ChatMessage
  allClients: Customer[]
  allFunds: Product[]
  onDictationConfirm: (values: Partial<FollowUpFormValues>) => void
}) {
  const isUser = msg.role === 'user'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 20,
      }}
    >
      <Avatar
        size={34}
        style={{
          background: isUser ? '#2563eb' : '#e0f2fe',
          color: isUser ? '#fff' : '#0369a1',
          flexShrink: 0,
          marginTop: 2,
        }}
        icon={isUser ? <UserOutlined /> : <RobotOutlined />}
      />

      <div style={{ width: 'min(820px, 100%)' }}>
        <div
          style={{
            background: isUser ? '#2563eb' : '#f8fafc',
            color: isUser ? '#fff' : '#0f172a',
            borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
            padding: '12px 14px',
            lineHeight: 1.7,
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
          }}
        >
          {msg.loading ? (
            <Space size={8}>
              <Spin size="small" />
              <Text type="secondary">正在识别意图并查询系统数据...</Text>
            </Space>
          ) : (
            msg.text
          )}
        </div>

        {!msg.loading && msg.result ? (
          <div style={{ marginTop: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
            {msg.result.kind === 'clients' ? <ClientResultCard clients={msg.result.data} context={msg.result.context} /> : null}
            {msg.result.kind === 'funds' ? <FundResultCard funds={msg.result.data} context={msg.result.context} /> : null}
            {msg.result.kind === 'recent_followups' ? <RecentFollowupsCard items={msg.result.clients} days={msg.result.days} /> : null}
            {msg.result.kind === 'dictation' ? <DictationPreviewCard prefill={msg.result.prefill} allClients={allClients} allFunds={allFunds} onConfirm={onDictationConfirm} /> : null}
            {msg.result.kind === 'error' ? <Alert type="error" showIcon message={msg.result.msg} /> : null}
            {msg.result.kind === 'empty' ? <Alert type="warning" showIcon message={msg.result.msg} /> : null}
          </div>
        ) : null}
      </div>
    </div>
  )
})
function FollowUpFormModal({
  open,
  onClose,
  initialValues,
  allClients,
  allFunds,
  allFollowUps,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  initialValues: Partial<FollowUpFormValues>
  allClients: Customer[]
  allFunds: Product[]
  allFollowUps: FollowUp[]
  onSuccess: (followup: FollowUp) => void
}) {
  const [form] = Form.useForm<FollowUpFormValues>()
  const [submitting, setSubmitting] = useState(false)

  const methodOptions = useMemo(() => {
    const values = Array.from(new Set(allFollowUps.map((item) => item.method)))
    return values.map((value) => ({ label: value, value }))
  }, [allFollowUps])

  const intentOptions = useMemo(() => {
    const values = Array.from(new Set(allFollowUps.map((item) => item.intent)))
    return values.map((value) => ({ label: value, value }))
  }, [allFollowUps])

  useEffect(() => {
    if (!open) return
    form.resetFields()
    form.setFieldsValue({
      date: dayjs(),
      intent: intentOptions[0]?.value,
      ...initialValues,
    })
  }, [form, initialValues, intentOptions, open])

  const handleSubmit = async (values: FollowUpFormValues) => {
    setSubmitting(true)
    try {
      const result = await followupApi.create({
        customerId: values.customerId,
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
      message.success('跟进记录已创建')
      onSuccess(result.data)
      onClose()
    } catch {
      message.error('提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="新建跟进记录" open={open} onCancel={onClose} footer={null} width={680} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="customerId" label="客户" rules={[{ required: true, message: '请选择客户' }]}>
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="选择客户"
                options={allClients.map((item) => ({ label: `${item.name} · ${item.company || item.region}`, value: item.id }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="date" label="跟进日期" rules={[{ required: true, message: '请选择跟进日期' }]}>
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="method" label="沟通方式" rules={[{ required: true, message: '请选择沟通方式' }]}>
              <Select placeholder="选择沟通方式" options={methodOptions} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="intent" label="跟进结果" rules={[{ required: true, message: '请选择跟进结果' }]}>
              <Select placeholder="选择跟进结果" options={intentOptions} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="content" label="跟进内容" rules={[{ required: true, message: '请输入跟进内容' }]}>
          <TextArea rows={4} placeholder="请输入本次跟进摘要" showCount maxLength={500} />
        </Form.Item>

        <Form.Item name="relatedProductIds" label="关联产品">
          <Select
            mode="multiple"
            showSearch
            optionFilterProp="label"
            placeholder="选择关联产品"
            options={allFunds.map((item) => ({ label: `${item.name} · ${item.code}`, value: item.id }))}
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="nextFollowUpDate" label="下次跟进日期">
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="nextAction" label="下一步动作">
              <Input placeholder="例如：发送产品说明书" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              保存记录
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default function AgentPage() {
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const workspaceHeight = 'clamp(620px, calc(100vh - 248px), 820px)'

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: '你好，我是销售工作台里的智能助手。你可以问我客户持仓、产品分布和近期跟进情况，也可以直接口述一段拜访内容，我会帮你生成跟进记录草稿。',
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [processing, setProcessing] = useState(false)

  const [allClients, setAllClients] = useState<Customer[]>([])
  const [allFunds, setAllFunds] = useState<Product[]>([])
  const [allFollowUps, setAllFollowUps] = useState<FollowUp[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [formInitialValues, setFormInitialValues] = useState<Partial<FollowUpFormValues>>({})

  const loadBaseData = useCallback(() => {
    setDataLoading(true)
    setDataError(false)

    Promise.all([clientApi.list(), fundApi.list(), followupApi.list()])
      .then(([clientRes, fundRes, followupRes]) => {
        setAllClients(clientRes.data)
        setAllFunds(fundRes.data)
        setAllFollowUps(followupRes.data)
        setDataLoaded(true)
      })
      .catch(() => setDataError(true))
      .finally(() => setDataLoading(false))
  }, [])

  useEffect(() => {
    loadBaseData()
  }, [loadBaseData])

  useEffect(() => {
    const container = chatContainerRef.current
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
    }
  }, [messages])

  const executeIntent = useCallback(
    async (input: string): Promise<{ text: string; result?: AssistantResult }> => {
      const intent = parseIntent(input)

      switch (intent.type) {
        case 'QUERY_CLIENTS_BY_FUND': {
          const matchedFund = fuzzyMatchFund(intent.fundName, allFunds)
          if (!matchedFund) {
            return {
              text: `没有找到名称包含“${intent.fundName}”的产品。`,
              result: { kind: 'empty', msg: `没有匹配到产品“${intent.fundName}”，可以换个简称再试。` },
            }
          }

          const holdingRes = await holdingApi.list({ productId: matchedFund.id })
          const customerIds = [...new Set(holdingRes.data.map((item) => item.customerId))]
          const matchedClients = allClients.filter((item) => customerIds.includes(item.id))

          return {
            text: `已为你查到持有“${matchedFund.name}”的客户。`,
            result: { kind: 'clients', data: matchedClients, context: `持有 ${matchedFund.name}` },
          }
        }

        case 'QUERY_FUNDS_BY_CLIENT': {
          const matchedClient = fuzzyMatchClient(intent.clientName, allClients)
          if (!matchedClient) {
            return {
              text: `没有找到名称包含“${intent.clientName}”的客户。`,
              result: { kind: 'empty', msg: `没有匹配到客户“${intent.clientName}”，可以换个完整姓名再试。` },
            }
          }

          const holdingRes = await holdingApi.list({ customerId: matchedClient.id })
          const productIds = [...new Set(holdingRes.data.map((item) => item.productId))]
          const matchedFunds = allFunds.filter((item) => productIds.includes(item.id))

          return {
            text: `已为你整理“${matchedClient.name}”当前持有的产品。`,
            result: { kind: 'funds', data: matchedFunds, context: `${matchedClient.name} 的持仓产品` },
          }
        }
        case 'QUERY_CLIENTS_BY_RISK': {
          const matchedClients = allClients.filter((item) => item.riskAppetite === intent.riskAppetite)
          return {
            text: `已筛出风险偏好为“${intent.riskAppetite}”的客户。`,
            result: { kind: 'clients', data: matchedClients, context: `风险偏好为 ${intent.riskAppetite}` },
          }
        }

        case 'QUERY_TOP_FUNDS': {
          const metricLabel = intent.metric === 'aum' ? '规模' : intent.metric === 'yield3y' ? '近3年收益' : '近1年收益'
          const sorted = [...allFunds].sort((a, b) => b[intent.metric] - a[intent.metric]).slice(0, intent.n)
          return {
            text: `已按 ${metricLabel} 排序，返回前 ${intent.n} 只产品。`,
            result: { kind: 'funds', data: sorted, context: `${metricLabel} Top ${intent.n}` },
          }
        }

        case 'QUERY_RECENT_FOLLOWUPS': {
          const sinceDate = new Date()
          sinceDate.setDate(sinceDate.getDate() - intent.days)
          const since = sinceDate.toISOString().slice(0, 10)
          const followupRes = await followupApi.list({ since })
          const latestByCustomer = new Map<string, FollowUp>()

          followupRes.data.forEach((item) => {
            const current = latestByCustomer.get(item.customerId)
            if (!current || item.timestamp > current.timestamp) {
              latestByCustomer.set(item.customerId, item)
            }
          })

          const clients = Array.from(latestByCustomer.values())
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
            .reduce<Array<{ customer: Customer; lastDate: string; method: string }>>((acc, item) => {
              const customer = allClients.find((current) => current.id === item.customerId)
              if (!customer) return acc
              acc.push({
                customer,
                lastDate: item.timestamp,
                method: item.method,
              })
              return acc
            }, [])

          return {
            text: `已为你整理最近 ${intent.days} 天内的跟进客户。`,
            result: { kind: 'recent_followups', clients, days: intent.days },
          }
        }

        case 'QUERY_OVERDUE_CLIENTS': {
          const overdueClients = allClients.filter((item) => {
            if (!item.lastFollowUpAt) return true
            const diffDays = Math.floor((Date.now() - new Date(item.lastFollowUpAt).getTime()) / (1000 * 60 * 60 * 24))
            return diffDays > intent.days
          })

          return {
            text: `已筛出超过 ${intent.days} 天未跟进的客户。`,
            result: { kind: 'clients', data: overdueClients, context: `超过 ${intent.days} 天未跟进` },
          }
        }

        case 'DICTATION_FOLLOWUP': {
          const matchedClient = intent.parsed.clientName ? fuzzyMatchClient(intent.parsed.clientName, allClients) : undefined
          const matchedFunds = intent.parsed.fundKeywords
            .map((keyword) => fuzzyMatchFund(keyword, allFunds))
            .filter((item): item is Product => Boolean(item))
            .filter((item, index, array) => array.findIndex((current) => current.id === item.id) === index)

          return {
            text: '我已经把这段口述识别成一条跟进记录草稿，请确认后写入系统。',
            result: { kind: 'dictation', prefill: { parsed: intent.parsed, matchedClient, matchedFunds } },
          }
        }

        case 'UNKNOWN':
        default:
          return {
            text: '我暂时没有识别出明确意图。你可以问我客户持仓、产品被谁持有、近期谁没有跟进，或者直接口述一段客户沟通内容。',
            result: { kind: 'empty', msg: '未识别到明确意图，可以点击上方推荐任务直接体验。' },
          }
      }
    },
    [allClients, allFunds],
  )

  const handleSend = useCallback(
    async (customText?: string) => {
      const query = (customText ?? inputValue).trim()
      if (!query || processing) return

      if (dataLoading || !dataLoaded) {
        message.warning('基础数据尚未加载完成，请稍后再试')
        return
      }

      setInputValue('')
      const userId = genId()
      const assistantId = genId()

      setMessages((prev) => [
        ...prev,
        { id: userId, role: 'user', text: query },
        { id: assistantId, role: 'assistant', text: '', loading: true },
      ])

      setProcessing(true)
      try {
        const response = await executeIntent(query)
        setMessages((prev) => prev.map((item) => (item.id === assistantId ? { ...item, ...response, loading: false } : item)))
      } catch (error) {
        setMessages((prev) =>
          prev.map((item) =>
            item.id === assistantId
              ? {
                  ...item,
                  text: '处理请求时出现异常，请稍后重试。',
                  result: { kind: 'error', msg: (error as Error).message || '未知错误' },
                  loading: false,
                }
              : item,
          ),
        )
      } finally {
        setProcessing(false)
      }
    },
    [dataLoaded, dataLoading, executeIntent, inputValue, processing],
  )

  const handleDictationConfirm = useCallback((values: Partial<FollowUpFormValues>) => {
    setFormInitialValues(values)
    setFormOpen(true)
  }, [])

  const handleFormSuccess = useCallback((followup: FollowUp) => {
    setAllFollowUps((prev) => [followup, ...prev])
    setMessages((prev) => [
      ...prev,
      {
        id: genId(),
        role: 'assistant',
        text: `跟进记录已创建，客户 ID 为 ${followup.customerId}，你可以继续追问这位客户的持仓或下次计划。`,
      },
    ])
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card className="crm-card" styles={{ body: { padding: 20 } }}>
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              <RobotOutlined style={{ marginRight: 10, color: '#2563eb' }} />
              智能助手
            </Title>
            <Paragraph style={{ margin: '6px 0 0', color: '#475569', fontSize: 14 }}>
              用自然语言查询客户与产品，或直接口述跟进内容生成记录草稿。
            </Paragraph>
          </div>
          <Space size={[8, 8]} wrap>
            {QUICK_ACTIONS.map((action) => (
              <span
                key={action.title}
                className="agent-top-chip"
                onClick={() => handleSend(action.prompt)}
              >
                {action.title}
              </span>
            ))}
          </Space>
        </Space>
      </Card>

      {dataError ? (
        <Alert
          type="error"
          showIcon
          message="基础数据加载失败"
          description="当前无法执行智能查询，请重新加载 Mock 数据后再试。"
          action={<Button size="small" danger onClick={loadBaseData} loading={dataLoading}>重新加载</Button>}
        />
      ) : null}

      <Row gutter={[16, 16]} align="stretch">
        <Col span={24} style={{ display: 'flex' }}>
          <Space direction="vertical" size={0} style={{ width: '100%', height: '100%', minHeight: 0, flex: 1 }}>
            <Card
              className="crm-card"
              style={{ height: workspaceHeight, minHeight: 0, maxHeight: workspaceHeight }}
              styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' } }}
            >
              <div style={{ padding: '18px 20px', borderBottom: '1px solid #eef2f7', background: '#fbfdff' }}>
                <Space direction="vertical" size={2}>
                  <Text strong style={{ color: '#0f172a' }}>会话工作区</Text>
                  <Text type="secondary" style={{ fontSize: 13 }}>支持自然语言查询、结果追问、客户与产品跳转，以及跟进记录辅助录入。</Text>
                </Space>
              </div>

              <div ref={chatContainerRef} style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '20px 20px 8px', background: '#fcfdff' }}>
                {dataLoading ? (
                  <div style={{ textAlign: 'center', paddingTop: 100 }}>
                    <Spin size="large" />
                    <div style={{ marginTop: 12, color: '#64748b', fontSize: 13 }}>正在加载客户、产品和跟进数据...</div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      allClients={allClients}
                      allFunds={allFunds}
                      onDictationConfirm={handleDictationConfirm}
                    />
                  ))
                )}
              </div>

              <div style={{ borderTop: '1px solid #eef2f7', padding: 16, background: '#fff' }}>
                <div className="agent-command-bar">
                  <div className="agent-command-bar__inner">
                    <Space.Compact className="agent-input-compact" style={{ width: '100%' }} size="middle">
                      <TextArea
                        className="agent-input"
                        value={inputValue}
                        onChange={(event) => setInputValue(event.target.value)}
                        placeholder="直接提问，例如“张伟明买了哪些产品？”或口述一段跟进内容，让助手帮你生成记录草稿。"
                        autoSize={{ minRows: 2, maxRows: 5 }}
                        onPressEnter={(event) => {
                          if (!event.shiftKey) {
                            event.preventDefault()
                            handleSend()
                          }
                        }}
                        disabled={processing || dataLoading || dataError}
                        style={{ borderRadius: '8px 0 0 8px' }}
                      />
                      <Button className="agent-send-btn" type="primary" icon={<SendOutlined />} onClick={() => handleSend()} loading={processing} disabled={!inputValue.trim() || dataLoading || dataError} style={{ height: 'auto', minWidth: 96, borderRadius: '14px' }}>
                        发送
                      </Button>
                    </Space.Compact>
                  </div>
                </div>
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>输入查询问题，或口述一次客户沟通内容，助手会自动识别意图并联动系统数据。</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>Enter 发送，Shift + Enter 换行</Text>
                </div>
                <Space size={[8, 8]} wrap style={{ marginTop: 10 }}>
                  {QUICK_ACTIONS.slice(0, 3).map((action) => (
                    <Tag
                      key={action.title}
                      className="agent-suggestion-chip"
                      onClick={() => handleSend(action.prompt)}
                    >
                      {action.title}
                    </Tag>
                  ))}
                </Space>
              </div>
            </Card>
          </Space>
        </Col>
      </Row>

      <FollowUpFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialValues={formInitialValues}
        allClients={allClients}
        allFunds={allFunds}
        allFollowUps={allFollowUps}
        onSuccess={handleFormSuccess}
      />
    </div>
  )
}
