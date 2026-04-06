import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Typography,
  Table,
  Tag,
  Space,
  Select,
  Row,
  Col,
  Card,
  Button,
  Input,
  Result,
  Tooltip,
  Badge,
  Modal,
  Form,
  message,
} from 'antd'
import { ReloadOutlined, SearchOutlined, PlusOutlined, FilterOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import { clientApi } from '../../api/clientApi'
import { holdingApi } from '../../api/holdingApi'
import type { Customer, CustomerType, RiskAppetite } from '../../types/client'

interface NewClientFormValues {
  name: string
  phone: string
  company: string
  region: string
  customerType: CustomerType
  riskAppetite: RiskAppetite
}

const { Title, Text } = Typography

const RISK_APPETITE_OPTIONS: RiskAppetite[] = ['保守', '稳健', '平衡', '积极', '激进']
const CUSTOMER_TYPE_OPTIONS: CustomerType[] = ['个人', '机构']

const RISK_TAG_CLS: Record<RiskAppetite, string> = {
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

function fmtDate(s?: string) {
  if (!s) return '-'
  return s.slice(0, 10)
}

function daysSince(dateStr?: string): number {
  if (!dateStr) return 999
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

export default function ClientList() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Customer[]>([])
  const [holdingCounts, setHoldingCounts] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)

  const [nameKeyword, setNameKeyword] = useState('')
  const [filterType, setFilterType] = useState<CustomerType | undefined>()
  const [filterRisk, setFilterRisk] = useState<RiskAppetite | undefined>()

  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm] = Form.useForm<NewClientFormValues>()
  const [addSubmitting, setAddSubmitting] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(
    async (keyword?: string) => {
      setLoading(true)
      setError(null)
      try {
        const [clientRes, holdingRes] = await Promise.all([
          clientApi.list({ customerType: filterType, riskAppetite: filterRisk }),
          holdingApi.list(),
        ])

        let data = clientRes.data
        const kw = (keyword ?? nameKeyword).trim().toLowerCase()
        if (kw) {
          data = data.filter(
            (c) =>
              c.name.toLowerCase().includes(kw) || c.company.toLowerCase().includes(kw),
          )
        }
        setClients(data)

        const counts: Record<string, number> = {}
        holdingRes.data.forEach((h) => {
          counts[h.customerId] = (counts[h.customerId] || 0) + 1
        })
        setHoldingCounts(counts)
      } catch {
        setError('数据加载失败，请稍后重试')
      } finally {
        setLoading(false)
      }
    },
    [filterType, filterRisk, nameKeyword],
  )

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSearch = (value: string) => {
    setNameKeyword(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchData(value), 300)
  }

  const handleReset = () => {
    setNameKeyword('')
    setFilterType(undefined)
    setFilterRisk(undefined)
  }

  const activeFilterCount = [nameKeyword, filterType, filterRisk].filter(Boolean).length
  const hasFilter = activeFilterCount > 0

  const handleAddClient = async (values: NewClientFormValues) => {
    setAddSubmitting(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const res = await clientApi.create({
        ...values,
        company: values.company || '',
        customerLevel: '普通',
        investorGrade: '普通投资者',
        riskAssessedAt: today,
        riskExpiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
        kycCompletedAt: today,
        tags: [],
        assignedSalesId: 'sales001',
        createdAt: new Date().toISOString(),
      })
      setClients((prev) => [res.data, ...prev])
      message.success(`客户「${res.data.name}」已成功添加`)
      setShowAddModal(false)
      addForm.resetFields()
    } catch {
      message.error('添加失败，请重试')
    } finally {
      setAddSubmitting(false)
    }
  }

  const columns: ColumnsType<Customer> = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 90,
      render: (name: string, record) => (
        <span
          style={{ color: '#0f172a', fontWeight: 500, cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/clients/${record.id}`)
          }}
        >
          {name}
        </span>
      ),
    },
    {
      title: '公司/机构',
      dataIndex: 'company',
      key: 'company',
      render: (v: string) => v || <span style={{ color: '#94a3b8' }}>个人</span>,
    },
    {
      title: '城市',
      dataIndex: 'region',
      key: 'region',
      width: 70,
      render: (v: string) => <span style={{ color: '#475569' }}>{v}</span>,
    },
    {
      title: '类型',
      dataIndex: 'customerType',
      key: 'customerType',
      width: 65,
      render: (v: CustomerType) => <Tag className={`soft-tag ${v === '机构' ? 'blue' : ''}`}>{v}</Tag>,
    },
    {
      title: '级别',
      dataIndex: 'customerLevel',
      key: 'customerLevel',
      width: 80,
      render: (v: string) => {
        const cls = LEVEL_TAG_CLS[v] ?? ''
        return <Tag className={`soft-tag ${cls}`}>{v}</Tag>
      },
    },
    {
      title: '风险偏好',
      dataIndex: 'riskAppetite',
      key: 'riskAppetite',
      width: 90,
      render: (v: RiskAppetite) => <Tag className={`soft-tag ${RISK_TAG_CLS[v]}`}>{v}</Tag>,
    },
    {
      title: '持仓数',
      key: 'holdingCount',
      width: 75,
      align: 'center',
      render: (_, record) => {
        const count = holdingCounts[record.id] || 0
        return count > 0 ? (
          <span style={{ fontWeight: 500, color: '#2563eb' }}>{count}</span>
        ) : (
          <span style={{ color: '#cbd5e1' }}>-</span>
        )
      },
      sorter: (a, b) => (holdingCounts[a.id] || 0) - (holdingCounts[b.id] || 0),
    },
    {
      title: '最近跟进',
      dataIndex: 'lastFollowUpAt',
      key: 'lastFollowUpAt',
      width: 120,
      render: (v?: string) => {
        const days = daysSince(v)
        const color = days > 30 ? '#dc2626' : days > 14 ? '#d97706' : '#16a34a'
        return (
          <Tooltip title={v ? `${days} 天前` : '从未跟进'}>
            <span style={{ color, fontWeight: 500 }}>{v ? fmtDate(v) : '未跟进'}</span>
          </Tooltip>
        )
      },
      sorter: (a, b) => {
        const da = a.lastFollowUpAt ? new Date(a.lastFollowUpAt).getTime() : 0
        const db = b.lastFollowUpAt ? new Date(b.lastFollowUpAt).getTime() : 0
        return da - db
      },
      defaultSortOrder: 'ascend',
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => (
        <Space size={4} wrap>
          {tags.slice(0, 2).map((t) => (
            <Tag key={t} className="soft-tag" style={{ fontSize: 11 }}>
              {t}
            </Tag>
          ))}
          {tags.length > 2 && (
            <Tooltip title={tags.slice(2).join('、')}>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                +{tags.length - 2}
              </span>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_, record) => (
        <span
          style={{ color: '#2563eb', cursor: 'pointer', fontSize: 13 }}
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/clients/${record.id}`)
          }}
        >
          查看详情
        </span>
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
          <Button type="primary" icon={<ReloadOutlined />} onClick={() => fetchData()}>
            重新加载
          </Button>
        }
      />
    )
  }

  return (
    <div>
      <div className="dashboard-header" style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>客户管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddModal(true)}>
          新增客户
        </Button>
      </div>

      {/* 筛选区 */}
      <Card bordered={false} className="crm-card" style={{ marginBottom: 20 }}>
        <Row gutter={[16, 12]} align="middle">
          <Col>
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder="搜索姓名或公司"
              style={{ width: 210 }}
              value={nameKeyword}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </Col>
          <Col>
            <Space size={6}>
              <Text style={{ color: '#64748b', fontSize: 13 }}>类型：</Text>
              <Select
                allowClear
                placeholder="全部"
                style={{ width: 100 }}
                value={filterType}
                onChange={setFilterType}
                options={CUSTOMER_TYPE_OPTIONS.map((t) => ({ label: t, value: t }))}
              />
            </Space>
          </Col>
          <Col>
            <Space size={6}>
              <Text style={{ color: '#64748b', fontSize: 13 }}>风险偏好：</Text>
              <Select
                allowClear
                placeholder="全部"
                style={{ width: 110 }}
                value={filterRisk}
                onChange={setFilterRisk}
                options={RISK_APPETITE_OPTIONS.map((r) => ({ label: r, value: r }))}
              />
            </Space>
          </Col>
          <Col>
            <Tooltip title={hasFilter ? `清除 ${activeFilterCount} 个筛选条件` : '清除所有筛选'}>
              <Badge count={activeFilterCount} size="small" offset={[-4, 4]}>
                <Button
                  onClick={handleReset}
                  icon={<FilterOutlined />}
                  danger={hasFilter}
                >
                  重置
                </Button>
              </Badge>
            </Tooltip>
          </Col>
        </Row>
      </Card>

      {/* 数据表格 */}
      <Card bordered={false} className="crm-card" styles={{ body: { padding: '0 24px 16px' } }}>
        <Table<Customer>
          className="fund-table"
          rowKey="id"
          loading={loading}
          dataSource={clients}
          columns={columns}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
          scroll={{ x: 1000 }}
          size="middle"
          locale={{
            emptyText:
              nameKeyword || filterType || filterRisk ? '没有符合条件的客户' : '暂无客户数据',
          }}
          rowClassName={(record) =>
            daysSince(record.lastFollowUpAt) > 30 ? 'row-overdue' : ''
          }
          onRow={(record) => ({
            style: { cursor: 'pointer' },
            onClick: (e) => {
              if (!(e.target as HTMLElement).closest('span[style*="cursor: pointer"]')) {
                navigate(`/clients/${record.id}`)
              }
            },
          })}
        />
      </Card>

      {/* 新增客户弹窗 */}
      <Modal
        title="新增客户"
        open={showAddModal}
        onCancel={() => { setShowAddModal(false); addForm.resetFields() }}
        footer={null}
        width={560}
        destroyOnClose
      >
        <Form
          form={addForm}
          layout="vertical"
          onFinish={handleAddClient}
          style={{ marginTop: 16 }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请填写姓名' }]}>
                <Input placeholder="请输入客户姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="联系电话" rules={[{ required: true, message: '请填写联系电话' }]}>
                <Input placeholder="请输入手机号" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="customerType" label="客户类型" rules={[{ required: true, message: '请选择客户类型' }]}>
                <Select placeholder="请选择" options={CUSTOMER_TYPE_OPTIONS.map((t) => ({ label: t, value: t }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="riskAppetite" label="风险偏好" rules={[{ required: true, message: '请选择风险偏好' }]}>
                <Select placeholder="请选择" options={RISK_APPETITE_OPTIONS.map((r) => ({ label: r, value: r }))} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="company" label="公司/机构">
                <Input placeholder="个人客户可不填" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="region" label="所在城市" rules={[{ required: true, message: '请填写城市' }]}>
                <Input placeholder="如：上海" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setShowAddModal(false); addForm.resetFields() }}>取消</Button>
              <Button type="primary" htmlType="submit" loading={addSubmitting}>确认添加</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
