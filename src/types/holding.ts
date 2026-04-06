export interface Holding {
  id: string;
  customerId: string;
  productId: string;
  /** 持有份额（基础数据，基金以份额计价） */
  shares: number;
  /** 当前持仓市值（元），= shares × currentNav，随净值每日变化 */
  currentAmount: number;
  /** 原始投入金额（元） */
  costAmount: number;
  /** 买入时净值（用于计算加权平均成本） */
  costNav: number;
  /** 建仓日期 */
  holdingSince: string;
  /**
   * 持仓浮盈率（%），= (currentAmount - costAmount) / costAmount × 100
   * 注意：此字段为冗余缓存值，真实系统中应在视图层实时计算，不应持久化存储。
   */
  profitRate: number;
}
