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
  Tooltip,
  Badge,
  Input,
  Result,
} from 'antd'
import { ReloadOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import { fundApi } from '../../api/fundApi'
import type { Product, ProductType, ProductStatus, RiskLevel } from '../../types/fund'

const { Title, Text } = Typography

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

const STATUS_TAG: Record<ProductStatus, string> = {
  在售: 'green',
  募集中: 'blue',
  暂停申购: 'amber',
  封闭期: 'red',
  已到期: '',
}

const PRODUCT_TYPES: ProductType[] = ['股票型', '债券型', '混合型', '货币型', 'FOF', 'QDII']
const RISK_LEVELS: RiskLevel[] = [1, 2, 3, 4, 5]
const STATUSES: ProductStatus[] = ['在售', '募集中', '暂停申购', '封闭期', '已到期']

function HighlightText({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword.trim()) return <span>{text}</span>
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <mark
            key={i}
            style={{ background: '#fef3c7', padding: '0 2px', borderRadius: 3, fontWeight: 600 }}
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  )
}

function YieldCell({ value }: { value: number }) {
  if (value === 0) return <Text style={{ color: '#64748b' }}>0.00%</Text>
  const positive = value > 0
  return (
    <span style={{ color: positive ? '#dc2626' : '#16a34a', fontWeight: 500 }}>
      {positive ? '+' : ''}{value.toFixed(2)}%
    </span>
  )
}

export default function FundList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [nameKeyword, setNameKeyword] = useState(() => searchParams.get('q') ?? '')
  const [filterType, setFilterType] = useState<ProductType | undefined>(
    () => (searchParams.get('type') as ProductType) || undefined,
  )
  const [filterRisk, setFilterRisk] = useState<RiskLevel | undefined>(
    () => (searchParams.get('risk') ? (Number(searchParams.get('risk')) as RiskLevel) : undefined),
  )
  const [filterStatus, setFilterStatus] = useState<ProductStatus | undefined>(
    () => (searchParams.get('status') as ProductStatus) || undefined,
  )

  const syncFiltersToUrl = useCallback(
    (patch: Partial<Record<'q' | 'type' | 'risk' | 'status', string>>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          ;(Object.entries(patch) as [string, string][]).forEach(([k, v]) => {
            if (v) {
              next.set(k, v)
            } else {
              next.delete(k)
            }
          })
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const activeFilterCount = [nameKeyword, filterType, filterRisk, filterStatus].filter(Boolean).length
  const hasFilter = activeFilterCount > 0

  const [loading, setLoading] = useState(false)
  const [funds, setFunds] = useState<Product[]>([])
  const [error, setError] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchFunds = useCallback(
    async (name?: string) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fundApi.list({
          type: filterType,
          riskLevel: filterRisk,
          status: filterStatus,
          name: name ?? (nameKeyword || undefined),
        })
        setFunds(res.data)
      } catch {
        setError('数据加载失败，请检查网络后重试')
      } finally {
        setLoading(false)
      }
    },
    [filterType, filterRisk, filterStatus, nameKeyword],
  )

  useEffect(() => {
    fetchFunds()
  }, [fetchFunds])

  const handleNameSearch = (value: string) => {
    setNameKeyword(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchFunds(value)
      syncFiltersToUrl({ q: value })
    }, 300)
  }

  const handleTypeChange = (v: ProductType | undefined) => {
    setFilterType(v)
    syncFiltersToUrl({ type: v ?? '' })
  }

  const handleRiskChange = (v: RiskLevel | undefined) => {
    setFilterRisk(v)
    syncFiltersToUrl({ risk: v ? String(v) : '' })
  }

  const handleStatusChange = (v: ProductStatus | undefined) => {
    setFilterStatus(v)
    syncFiltersToUrl({ status: v ?? '' })
  }

  const handleReset = () => {
    setNameKeyword('')
    setFilterType(undefined)
    setFilterRisk(undefined)
    setFilterStatus(undefined)
    syncFiltersToUrl({ q: '', type: '', risk: '', status: '' })
  }

  const columns: ColumnsType<Product> = [
    {
      title: '基金代码',
      dataIndex: 'code',
      key: 'code',
      width: 110,
      render: (v: string) => (
        <span style={{ fontFamily: "'SF Mono', 'Roboto Mono', monospace", fontSize: 13, color: '#64748b' }}>
          <HighlightText text={v} keyword={nameKeyword} />
        </span>
      ),
    },
    {
      title: '基金名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <span
          style={{ color: '#0f172a', fontWeight: 500, cursor: 'pointer' }}
          onClick={(e) => { e.stopPropagation(); navigate(`/funds/${record.id}`) }}
        >
          <HighlightText text={name} keyword={nameKeyword} />
        </span>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 90,
      render: (v: ProductType) => <Tag className={`soft-tag ${TYPE_TAG[v]}`}>{v}</Tag>,
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      width: 130,
      render: (v: RiskLevel) => <Tag className={`soft-tag ${RISK_TAG[v].cls}`}>{RISK_TAG[v].label}</Tag>,
      sorter: (a, b) => a.riskLevel - b.riskLevel,
    },
    {
      title: '最新净值',
      dataIndex: 'nav',
      key: 'nav',
      width: 100,
      align: 'right',
      render: (v: number) => <span style={{ fontWeight: 500 }}>{v.toFixed(4)}</span>,
      sorter: (a, b) => a.nav - b.nav,
    },
    {
      title: '近1年收益',
      dataIndex: 'yield1y',
      key: 'yield1y',
      width: 110,
      align: 'right',
      render: (v: number) => <YieldCell value={v} />,
      sorter: (a, b) => a.yield1y - b.yield1y,
      defaultSortOrder: 'descend',
    },
    {
      title: '近3年收益',
      dataIndex: 'yield3y',
      key: 'yield3y',
      width: 110,
      align: 'right',
      render: (v: number) => <YieldCell value={v} />,
      sorter: (a, b) => a.yield3y - b.yield3y,
    },
    {
      title: '规模(亿)',
      dataIndex: 'aum',
      key: 'aum',
      width: 100,
      align: 'right',
      render: (v: number) => <span style={{ fontWeight: 500 }}>{v.toFixed(1)}</span>,
      sorter: (a, b) => a.aum - b.aum,
    },
    {
      title: '基金经理',
      dataIndex: 'manager',
      key: 'manager',
      width: 90,
      render: (v: string) => <span style={{ color: '#475569' }}>{v}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: ProductStatus) => {
        const cls = STATUS_TAG[v]
        return cls ? <Tag className={`soft-tag ${cls}`}>{v}</Tag> : <Tag className="soft-tag">{v}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 72,
      fixed: 'right',
      render: (_, record) => (
        <span
          style={{ color: '#2563eb', cursor: 'pointer', fontSize: 13 }}
          onClick={(e) => { e.stopPropagation(); navigate(`/funds/${record.id}`) }}
        >
          详情
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
          <Button type="primary" icon={<ReloadOutlined />} onClick={() => fetchFunds()}>
            重新加载
          </Button>
        }
      />
    )
  }

  return (
    <div>
      <div className="dashboard-header" style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>基金产品</Title>
      </div>

      {/* 筛选区 */}
      <Card bordered={false} className="crm-card" style={{ marginBottom: 20 }}>
        <Row gutter={[16, 12]} align="middle">
          <Col>
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder="搜索基金名称或代码"
              style={{ width: 220 }}
              value={nameKeyword}
              onChange={(e) => handleNameSearch(e.target.value)}
            />
          </Col>
          <Col>
            <Space size={6}>
              <Text style={{ color: '#64748b', fontSize: 13 }}>类型：</Text>
              <Select
                allowClear
                placeholder="全部"
                style={{ width: 120 }}
                value={filterType}
                onChange={handleTypeChange}
                options={PRODUCT_TYPES.map((t) => ({ label: t, value: t }))}
              />
            </Space>
          </Col>
          <Col>
            <Space size={6}>
              <Text style={{ color: '#64748b', fontSize: 13 }}>风险：</Text>
              <Select
                allowClear
                placeholder="全部"
                style={{ width: 140 }}
                value={filterRisk}
                onChange={handleRiskChange}
                options={RISK_LEVELS.map((r) => ({
                  label: RISK_TAG[r].label,
                  value: r,
                }))}
              />
            </Space>
          </Col>
          <Col>
            <Space size={6}>
              <Text style={{ color: '#64748b', fontSize: 13 }}>状态：</Text>
              <Select
                allowClear
                placeholder="全部"
                style={{ width: 110 }}
                value={filterStatus}
                onChange={handleStatusChange}
                options={STATUSES.map((s) => ({ label: s, value: s }))}
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
        <Table<Product>
          className="fund-table"
          rowKey="id"
          loading={loading}
          dataSource={funds}
          columns={columns}
          pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (t) => `共 ${t} 条` }}
          scroll={{ x: 1200 }}
          size="middle"
          locale={{
            emptyText: hasFilter ? (
              <Space direction="vertical" size={8} style={{ padding: '8px 0' }}>
                <span style={{ color: '#94a3b8' }}>没有符合条件的基金产品</span>
                <Button size="small" onClick={handleReset}>
                  清除筛选，查看全部
                </Button>
              </Space>
            ) : (
              '暂无基金产品数据'
            ),
          }}
          onRow={(record) => ({
            style: { cursor: 'pointer' },
            onClick: (e) => {
              if (!(e.target as HTMLElement).closest('span[style*="cursor: pointer"]')) {
                navigate(`/funds/${record.id}`)
              }
            },
          })}
        />
      </Card>
    </div>
  )
}
