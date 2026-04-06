import { useState, useEffect } from 'react'
import {
  Typography,
  Button,
  Table,
  Tag,
  Space,
  Modal,
  Form,
  Select,
  Input,
  Row,
  Col,
  Tooltip,
  Popconfirm,
  message,
  Card,
  Result,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import { followupApi } from '../../api/followupApi'
import { clientApi } from '../../api/clientApi'
import { fundApi } from '../../api/fundApi'
import type { FollowUp, FollowUpMethod, FollowUpIntent } from '../../types/followup'
import type { Customer } from '../../types/client'
import type { Product } from '../../types/fund'
import { DatePicker } from 'antd'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

const METHOD_TAG_CLS: Record<FollowUpMethod, string> = {
  电话: 'blue',
  面访: 'green',
  微信: 'cyan',
  邮件: 'amber',
  视频会议: 'blue',
}

const INTENT_TAG_CLS: Record<FollowUpIntent, string> = {
  推进中: 'blue',
  成功推荐: 'green',
  暂无意向: 'amber',
  信息同步: 'cyan',
  风险提示: 'red',
}

const FOLLOW_UP_METHODS: FollowUpMethod[] = ['电话', '面访', '微信', '邮件', '视频会议']
const FOLLOW_UP_INTENTS: FollowUpIntent[] = ['推进中', '成功推荐', '暂无意向', '信息同步', '风险提示']

function fmtDate(s?: string) {
  return s?.slice(0, 10) ?? '-'
}

function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date('2026-04-02')
}

interface FollowUpFormValues {
  customerId: string
  method: FollowUpMethod
  intent: FollowUpIntent
  intentScore?: 1 | 2 | 3 | 4 | 5
  content: string
  date?: dayjs.Dayjs
  relatedProductIds?: string[]
  nextFollowUpDate?: dayjs.Dayjs
  nextAction?: string
}

export default function FollowUpList() {
  const navigate = useNavigate()

  const [followups, setFollowups] = useState<FollowUp[]>([])
  const [allClients, setAllClients] = useState<Customer[]>([])
  const [allFunds, setAllFunds] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filterCustomerId, setFilterCustomerId] = useState<string | undefined>()
  const [filterMethod, setFilterMethod] = useState<string | undefined>()
  const [filterIntent, setFilterIntent] = useState<string | undefined>()
  const [filterSince, setFilterSince] = useState<string | undefined>()

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm<FollowUpFormValues>()
  const [submitting, setSubmitting] = useState(false)

  const loadData = () => {
    setLoading(true)
    setError(null)
    Promise.all([followupApi.list(), clientApi.list(), fundApi.list()])
      .then(([fuRes, clientRes, fundRes]) => {
        setFollowups(fuRes.data)
        setAllClients(clientRes.data)
        setAllFunds(fundRes.data)
      })
      .catch((e: Error) => setError(e.message ?? '数据加载失败，请稍后重试'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const clientMap: Record<string, Customer> = Object.fromEntries(
    allClients.map((c) => [c.id, c]),
  )
  const fundMap: Record<string, Product> = Object.fromEntries(
    allFunds.map((f) => [f.id, f]),
  )

  const filtered = followups
    .filter((fu) => {
      if (filterCustomerId && fu.customerId !== filterCustomerId) return false
      if (filterMethod && fu.method !== filterMethod) return false
      if (filterIntent && fu.intent !== filterIntent) return false
      if (filterSince && fu.timestamp < filterSince) return false
      return true
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const today = '2026-04-02'

  const openCreateModal = () => {
    setEditingId(null)
    form.resetFields()
    form.setFieldsValue({ date: dayjs(today) })
    setShowModal(true)
  }

  const openEditModal = (fu: FollowUp) => {
    setEditingId(fu.id)
    form.setFieldsValue({
      customerId: fu.customerId,
      method: fu.method,
      intent: fu.intent,
      intentScore: fu.intentScore,
      content: fu.content,
      date: dayjs(fu.timestamp.slice(0, 10)),
      relatedProductIds: fu.relatedProductIds,
      nextFollowUpDate: fu.nextFollowUpDate ? dayjs(fu.nextFollowUpDate) : undefined,
      nextAction: fu.nextAction,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    form.resetFields()
  }

  const handleSubmit = async (values: FollowUpFormValues) => {
    setSubmitting(true)
    try {
      if (editingId) {
        const res = await followupApi.update(editingId, {
          method: values.method,
          intent: values.intent,
          intentScore: values.intentScore,
          content: values.content,
          timestamp: values.date ? values.date.toISOString() : undefined,
          relatedProductIds: values.relatedProductIds ?? [],
          nextFollowUpDate: values.nextFollowUpDate?.format('YYYY-MM-DD') || undefined,
          nextAction: values.nextAction || undefined,
        })
        setFollowups((prev) =>
          prev.map((fu) => (fu.id === editingId ? res.data : fu)),
        )
        message.success('跟进记录已更新')
      } else {
        const res = await followupApi.create({
          customerId: values.customerId,
          method: values.method,
          intent: values.intent,
          intentScore: values.intentScore,
          content: values.content,
          timestamp: values.date ? values.date.toISOString() : new Date().toISOString(),
          salesId: 'sales001',
          relatedProductIds: values.relatedProductIds ?? [],
          nextFollowUpDate: values.nextFollowUpDate?.format('YYYY-MM-DD') || undefined,
          nextAction: values.nextAction || undefined,
        })
        setFollowups((prev) => [res.data, ...prev])
        message.success('跟进记录已添加')
      }
      closeModal()
    } catch {
      message.error('操作失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await followupApi.remove(id)
      setFollowups((prev) => prev.filter((fu) => fu.id !== id))
      message.success('已删除')
    } catch {
      message.error('删除失败，请重试')
    }
  }

  const clearFilters = () => {
    setFilterCustomerId(undefined)
    setFilterMethod(undefined)
    setFilterIntent(undefined)
    setFilterSince(undefined)
  }

  const hasFilters = !!(filterCustomerId || filterMethod || filterIntent || filterSince)

  const columns: ColumnsType<FollowUp> = [
    {
      title: '客户',
      key: 'customer',
      width: 96,
      render: (_, row) => {
        const c = clientMap[row.customerId]
        return c ? (
          <span
            style={{ color: '#0f172a', fontWeight: 500, cursor: 'pointer' }}
            onClick={() => navigate(`/clients/${row.customerId}`)}
          >
            {c.name}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            {row.customerId}
          </span>
        )
      },
    },
    {
      title: '方式',
      dataIndex: 'method',
      key: 'method',
      width: 84,
      render: (v: FollowUpMethod) => <Tag className={`soft-tag ${METHOD_TAG_CLS[v]}`}>{v}</Tag>,
    },
    {
      title: '意向状态',
      key: 'intent',
      width: 116,
      render: (_, row) => (
        <Space size={4}>
          <Tag className={`soft-tag ${INTENT_TAG_CLS[row.intent]}`}>{row.intent}</Tag>
          {row.intentScore != null && (
            <Tooltip title={`意向评分：${row.intentScore} / 5`}>
              <Tag className="soft-tag amber" style={{ fontSize: 11 }}>
                {row.intentScore}/5
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '跟进内容',
      dataIndex: 'content',
      key: 'content',
      width: 220,
      render: (v: string) => (
        <Paragraph
          style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}
          ellipsis={{ rows: 2, tooltip: v }}
        >
          {v}
        </Paragraph>
      ),
    },
    {
      title: '涉及产品',
      dataIndex: 'relatedProductIds',
      key: 'products',
      width: 110,
      render: (ids: string[]) => {
        if (!ids || !ids.length)
          return <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
        const visible = ids.slice(0, 2)
        const rest = ids.length - 2
        return (
          <Space size={2} wrap>
            {visible.map((id) => {
              const f = fundMap[id]
              return f ? (
                <span
                  key={id}
                  style={{ color: '#2563eb', cursor: 'pointer', fontSize: 12 }}
                  onClick={() => navigate(`/funds/${id}`)}
                >
                  {f.name.length > 6 ? f.name.slice(0, 6) + '...' : f.name}
                </span>
              ) : null
            })}
            {rest > 0 && (
              <Tag className="soft-tag" style={{ fontSize: 11 }}>+{rest}</Tag>
            )}
          </Space>
        )
      },
    },
    {
      title: '跟进时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 88,
      render: (v: string) => <span style={{ color: '#475569' }}>{fmtDate(v)}</span>,
      sorter: (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: '下次跟进',
      dataIndex: 'nextFollowUpDate',
      key: 'nextFollowUpDate',
      width: 88,
      render: (v?: string) => {
        if (!v) return <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
        const overdue = isOverdue(v)
        return (
          <Tooltip title={overdue ? '已逾期，请尽快跟进' : undefined}>
            <span
              style={{
                fontSize: 13,
                color: overdue ? '#dc2626' : '#475569',
                fontWeight: overdue ? 600 : 400,
              }}
            >
              {overdue && '⚠ '}
              {fmtDate(v)}
            </span>
          </Tooltip>
        )
      },
    },
    {
      title: '下一步行动',
      dataIndex: 'nextAction',
      key: 'nextAction',
      width: 110,
      render: (v?: string) =>
        v ? (
          <Text style={{ fontSize: 13 }} ellipsis={{ tooltip: v }}>
            {v}
          </Text>
        ) : (
          <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 92,
      fixed: 'right',
      render: (_, row) => (
        <Space size={0}>
          <span
            style={{ color: '#2563eb', cursor: 'pointer', fontSize: 13 }}
            onClick={() => openEditModal(row)}
          >
            <EditOutlined /> 编辑
          </span>
          <Popconfirm
            title="确认删除"
            description="删除后无法恢复，确认删除该跟进记录？"
            onConfirm={() => handleDelete(row.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <span style={{ color: '#dc2626', cursor: 'pointer', fontSize: 13, marginLeft: 12 }}>
              <DeleteOutlined />
            </span>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  if (error && !loading) {
    return (
      <Result
        status="500"
        title="加载失败"
        subTitle={error}
        extra={
          <Button type="primary" icon={<ReloadOutlined />} onClick={loadData}>
            重新加载
          </Button>
        }
      />
    )
  }

  return (
    <div>
      <div className="dashboard-header" style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>跟进记录</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          新增跟进
        </Button>
      </div>

      {/* 筛选栏 */}
      <Card bordered={false} className="crm-card" style={{ marginBottom: 20 }}>
        <Space wrap size={12}>
          <Select
            placeholder="筛选客户"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 160 }}
            value={filterCustomerId}
            onChange={setFilterCustomerId}
            options={allClients.map((c) => ({
              label: c.name,
              value: c.id,
            }))}
          />
          <Select
            placeholder="跟进方式"
            allowClear
            style={{ width: 120 }}
            value={filterMethod}
            onChange={setFilterMethod}
            options={FOLLOW_UP_METHODS.map((m) => ({ label: m, value: m }))}
          />
          <Select
            placeholder="意向状态"
            allowClear
            style={{ width: 120 }}
            value={filterIntent}
            onChange={setFilterIntent}
            options={FOLLOW_UP_INTENTS.map((i) => ({ label: i, value: i }))}
          />
          <Space size={4}>
            <Text style={{ color: '#64748b', fontSize: 13 }}>从</Text>
            <Input
              type="date"
              style={{ width: 140 }}
              value={filterSince ?? ''}
              onChange={(e) =>
                setFilterSince(e.target.value || undefined)
              }
            />
            <Text style={{ color: '#64748b', fontSize: 13 }}>起</Text>
          </Space>
          {hasFilters && (
            <Button size="small" onClick={clearFilters}>
              清空筛选
            </Button>
          )}
          {hasFilters && (
            <Text style={{ fontSize: 13, color: '#94a3b8' }}>
              共 {filtered.length} 条结果
            </Text>
          )}
        </Space>
      </Card>

      {/* 数据表格 */}
      <Card bordered={false} className="crm-card" styles={{ body: { padding: '0 24px 16px' } }}>
        <Table<FollowUp>
          className="fund-table"
          rowKey="id"
          tableLayout="fixed"
          loading={loading}
          dataSource={filtered}
          columns={columns}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `共 ${total} 条`,
          }}
          size="middle"
          scroll={{ x: 1000 }}
          locale={{ emptyText: hasFilters ? '没有符合条件的跟进记录' : '暂无跟进记录' }}
        />
      </Card>

      {/* 新建 / 编辑弹窗 */}
      <Modal
        title={editingId ? '编辑跟进记录' : '新建跟进记录'}
        open={showModal}
        onCancel={closeModal}
        footer={null}
        width={640}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="customerId"
            label="客户"
            rules={[{ required: true, message: '请选择客户' }]}
          >
            <Select
              placeholder="请选择客户"
              showSearch
              optionFilterProp="label"
              disabled={!!editingId}
              options={allClients.map((c) => ({
                label: `${c.name}（${c.company || c.region}）`,
                value: c.id,
              }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="method"
                label="跟进方式"
                rules={[{ required: true, message: '请选择跟进方式' }]}
              >
                <Select
                  placeholder="请选择"
                  options={FOLLOW_UP_METHODS.map((m) => ({
                    label: m,
                    value: m,
                  }))}
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
                  options={FOLLOW_UP_INTENTS.map((i) => ({
                    label: i,
                    value: i,
                  }))}
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
            <TextArea
              rows={4}
              placeholder="请描述本次跟进的主要内容..."
              showCount
              maxLength={500}
            />
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
                (option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="nextFollowUpDate" label="计划跟进日期（可选）">
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
              <Button onClick={closeModal}>取消</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingId ? '保存修改' : '提交'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
