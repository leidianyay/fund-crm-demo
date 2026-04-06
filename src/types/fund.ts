export type ProductType = '股票型' | '债券型' | '混合型' | '货币型' | 'FOF' | 'QDII';
export type ProductStatus = '在售' | '募集中' | '暂停申购' | '封闭期' | '已到期';
export type RiskLevel = 1 | 2 | 3 | 4 | 5;
export type ShareClass = 'A' | 'C' | 'E' | 'I';

export interface Product {
  id: string;
  code: string;
  name: string;
  type: ProductType;
  status: ProductStatus;
  riskLevel: RiskLevel;
  shareClass?: ShareClass;

  /** 最新净值 */
  nav: number;
  /** 净值日期 */
  navDate?: string;
  /** 近 1 年收益率（%） */
  yield1y: number;
  /** 近 3 年收益率（%） */
  yield3y: number;
  /** 近 1 年最大回撤（%，负值），风险能力的核心指标 */
  maxDrawdown: number;
  /** 业绩比较基准，用于评估基金经理超额收益 */
  benchmark: string;
  /** 规模（亿元） */
  aum: number;

  manager: string;
  inceptionDate: string;
  /** 最低申购金额（元） */
  minSubscription: number;
  /** 申购费率（%） */
  subscriptionFeeRate: number;
  /** 赎回费率（%，持有不足 1 年适用） */
  redemptionFeeRate: number;
}
