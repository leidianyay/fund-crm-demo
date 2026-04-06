import type { ProductType, RiskLevel } from './fund';
import type { Customer, RiskAppetite } from './client';
import type { Holding } from './holding';
import type { FollowUp } from './followup';

/** Dashboard 页面所需的全量汇总数据 */
export interface DashboardSummary {
  /** 在售产品数量 */
  activeProductCount: number;
  /** 客户总数 */
  totalCustomerCount: number;
  /** 本月新增跟进记录数 */
  monthlyFollowUpCount: number;
  /** 超过 30 天未跟进的客户数 */
  overdueCustomerCount: number;

  /** 各产品类型规模分布（饼图） */
  aumByProductType: Array<{ type: ProductType; aum: number }>;
  /** 近 7 天每日跟进数量（折线图） */
  dailyFollowUpTrend: Array<{ date: string; count: number }>;
  /** 客户风险偏好分布（柱状图） */
  customerRiskDistribution: Array<{ riskAppetite: RiskAppetite; count: number }>;
  /** 最近跟进的 5 位客户（快速入口） */
  recentlyFollowedCustomers: Array<{ customer: Customer; lastFollowUp: FollowUp }>;
}

/** 持仓 + 产品摘要聚合（客户详情页持仓列表用） */
export interface HoldingWithProduct extends Holding {
  product: {
    id: string;
    code: string;
    name: string;
    type: ProductType;
    nav: number;
    yield1y: number;
    riskLevel: RiskLevel;
    status: string;
  };
}

/** 持仓 + 客户摘要聚合（产品详情页持仓客户列表用） */
export interface HoldingWithCustomer extends Holding {
  customer: Pick<Customer, 'id' | 'name' | 'company' | 'customerLevel' | 'riskAppetite'>;
}
