import type { FollowUpMethod } from '../types/followup'

// ─── Intent Types ──────────────────────────────────────────────────────────

export type QueryIntent =
  | { type: 'QUERY_CLIENTS_BY_FUND'; fundName: string }
  | { type: 'QUERY_FUNDS_BY_CLIENT'; clientName: string }
  | { type: 'QUERY_CLIENTS_BY_RISK'; riskAppetite: string }
  | { type: 'QUERY_TOP_FUNDS'; n: number; metric: 'yield1y' | 'yield3y' | 'aum' }
  | { type: 'QUERY_RECENT_FOLLOWUPS'; days: number }
  | { type: 'QUERY_OVERDUE_CLIENTS'; days: number }
  | { type: 'DICTATION_FOLLOWUP'; parsed: DictationResult }
  | { type: 'UNKNOWN'; raw: string }

export interface DictationResult {
  clientName?: string
  method?: FollowUpMethod
  fundKeywords: string[]
  nextAction?: string
  rawInput: string
}

// ─── Method Patterns ──────────────────────────────────────────────────────

const METHOD_PATTERNS: Array<{ method: FollowUpMethod; keywords: string[] }> = [
  { method: '视频会议', keywords: ['视频会议', '视频通话', '线上会议', '腾讯会议', '钉钉会议', 'zoom', 'teams'] },
  { method: '电话', keywords: ['打电话', '通了电话', '通电话', '电话沟通', '致电', '拨打', '接到电话', '电话联系', '通个电话'] },
  { method: '面访', keywords: ['面谈', '面访', '当面', '见面', '拜访', '约谈', '面聊', '上门', '见了一面', '约好面谈'] },
  { method: '微信', keywords: ['发微信', '微信沟通', '微信聊', '微信联系', '微信'] },
  { method: '邮件', keywords: ['发邮件', '电子邮件', '邮件沟通', '邮件', 'email'] },
]

// ─── Dictation Detection ─────────────────────────────────────────────────

const DICTATION_SIGNALS = [
  '电话', '面谈', '面访', '拜访', '微信', '邮件', '视频',
  '感兴趣', '约好', '下周', '下次', '跟进', '通了', '聊了',
  '沟通', '推荐', '告知', '分析', '介绍', '见了', '谈了',
  '约定', '拜托', '跟他', '跟她', '帮他', '帮她',
]

function isDictation(s: string): boolean {
  // Must have ≥2 dictation signals, enough length, and not look like a query
  const signalCount = DICTATION_SIGNALS.filter(k => s.includes(k)).length
  const isQuery = /持有|买了|哪些|几个|最高|最大|上周|近\d+天/.test(s)
  return signalCount >= 2 && s.length > 12 && !isQuery
}

// ─── Dictation Parser ────────────────────────────────────────────────────

function parseDictation(s: string): DictationResult {
  // Client name: 2-4 Chinese chars after relationship words
  let clientName: string | undefined
  const clientPatterns = [
    /(?:和|与|跟|给|向|为|约|见)\s*([\u4e00-\u9fa5]{2,4})(?:先生|女士|总|经理|董事长|老板)?/,
    /(?:今天|昨天|上午|下午|晚上|早上).*?(?:和|与|跟)\s*([\u4e00-\u9fa5]{2,4})/,
    /客户([\u4e00-\u9fa5]{2,4})/,
    /^([\u4e00-\u9fa5]{2,4})(?:今天|昨天|上午|下午)/,
  ]
  for (const p of clientPatterns) {
    const m = s.match(p)
    if (m?.[1]) {
      clientName = m[1]
      break
    }
  }

  // Method detection (order matters: more specific first)
  let method: FollowUpMethod | undefined
  for (const { method: met, keywords } of METHOD_PATTERNS) {
    if (keywords.some(k => s.toLowerCase().includes(k.toLowerCase()))) {
      method = met
      break
    }
  }
  // Fallback: lone "电话" keyword
  if (!method && s.includes('电话')) method = '电话'

  // Fund name keywords extraction
  const fundKeywords: string[] = []
  const fundPatternList = [
    // Well-known fund company names followed by fund name
    /(易方达|交银施罗德|交银|兴全|嘉实|中欧|南方|华夏|富国|博时|广发|工银瑞信|建信|招商|鹏华|汇添富|景顺长城|诺安|前海开源|华安|大成)([\u4e00-\u9fa5A-Za-z]{2,10})/g,
    // Fund type suffix patterns
    /([\u4e00-\u9fa5]{2,12}(?:混合|债券|股票|货币|精选|成长|蓝筹|医疗|新兴|合润|科技|消费|产业|指数|优选|增长|回报|平衡|收益))/g,
  ]
  for (const pattern of fundPatternList) {
    for (const fm of s.matchAll(pattern)) {
      fundKeywords.push(fm[0])
    }
  }

  // Next action detection
  let nextAction: string | undefined
  const nextPatterns = [
    /下周[一二三四五六日天]?([^，。！？\n，]{2,20})/,
    /下次([^，。！？\n，]{3,20})/,
    /计划([^，。！？\n，]{3,20})/,
    /约好([^，。！？\n，]{3,20})/,
    /约定了?([^，。！？\n，]{3,20})/,
    /准备([^，。！？\n，]{3,20})/,
  ]
  for (const pattern of nextPatterns) {
    const nm = s.match(pattern)
    if (nm) {
      nextAction = nm[0].slice(0, 30).replace(/[，。！？].*$/, '').trim()
      break
    }
  }

  return {
    clientName,
    method,
    fundKeywords: [...new Set(fundKeywords)],
    nextAction,
    rawInput: s,
  }
}

// ─── Main Intent Parser ──────────────────────────────────────────────────

export function parseIntent(input: string): QueryIntent {
  const s = input.trim()

  // "持有XX的客户有哪些"
  let m = s.match(/持有(.{2,15}?)(?:的客户|客户有|客户是)/)
  if (m) return { type: 'QUERY_CLIENTS_BY_FUND', fundName: m[1].trim() }

  // "XX买了/持有哪些基金/产品"
  m = s.match(/^([\u4e00-\u9fa5]{2,8})(买了|持有|购买了|投资了|的持仓)(?:哪些|什么)(基金|产品|fund)?/)
  if (m) return { type: 'QUERY_FUNDS_BY_CLIENT', clientName: m[1] }

  // "查一下XX的持仓" / "XX的基金"
  m = s.match(/(?:查(?:一下)?|看看)?([\u4e00-\u9fa5]{2,5})的(?:持仓|基金|产品|投资)/)
  if (m) return { type: 'QUERY_FUNDS_BY_CLIENT', clientName: m[1] }

  // "风险偏好/承受XX的客户"
  m = s.match(/(?:风险偏好|风险承受|风险等级|偏好|倾向)(保守|稳健|平衡|积极|激进)/)
  if (m) return { type: 'QUERY_CLIENTS_BY_RISK', riskAppetite: m[2] }

  // "保守/激进型客户"
  m = s.match(/(保守|稳健|平衡|积极|激进)(?:型|偏好)?的?客户/)
  if (m) return { type: 'QUERY_CLIENTS_BY_RISK', riskAppetite: m[1] }

  // "近N年收益最高的N支"
  m = s.match(/近(\d+)年.*?收益.*(最高|最好|排名前).*?(\d+)?支?/)
  if (m) {
    const years = parseInt(m[1])
    const n = m[3] ? parseInt(m[3]) : 3
    return { type: 'QUERY_TOP_FUNDS', n, metric: years >= 3 ? 'yield3y' : 'yield1y' }
  }

  // "收益最高的N支" (default 1y)
  m = s.match(/收益.*(最高|最好|最佳|排名前).{0,5}?(\d+)?支?/)
  if (m) {
    const n = m[2] ? parseInt(m[2]) : 3
    return { type: 'QUERY_TOP_FUNDS', n, metric: 'yield1y' }
  }

  // "规模最大的N支"
  m = s.match(/规模.*(最大|最多|最高).*?(\d+)?支?/)
  if (m) {
    const n = m[2] ? parseInt(m[2]) : 3
    return { type: 'QUERY_TOP_FUNDS', n, metric: 'aum' }
  }

  // "上周/近N天有跟进记录的客户"
  m = s.match(/(?:上周|近(\d+)天|最近(\d+)天).{0,10}(?:跟进|联系|沟通|记录)/)
  if (m) {
    const days = m[1] ? parseInt(m[1]) : m[2] ? parseInt(m[2]) : 7
    return { type: 'QUERY_RECENT_FOLLOWUPS', days }
  }

  // "超过N天未跟进 / N天没有跟进"
  m = s.match(/(?:超过|已?有)(\d+)天(?:未|没有?|没跟过)跟进/)
  if (!m) m = s.match(/(\d+)天没有?(?:联系|跟进|沟通)/)
  if (m) return { type: 'QUERY_OVERDUE_CLIENTS', days: parseInt(m[1]) }

  // Dictation detection (must come last)
  if (isDictation(s)) {
    return { type: 'DICTATION_FOLLOWUP', parsed: parseDictation(s) }
  }

  return { type: 'UNKNOWN', raw: s }
}
