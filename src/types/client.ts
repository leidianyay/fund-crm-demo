export type CustomerType = '个人' | '机构';
export type CustomerLevel = '普通' | '银卡' | '金卡' | '钻石';
export type InvestorGrade = '普通投资者' | '专业投资者';
export type RiskAppetite = '保守' | '稳健' | '平衡' | '积极' | '激进';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  company: string;
  /** 所在城市 */
  region: string;

  customerType: CustomerType;
  customerLevel: CustomerLevel;
  /** 投资者分级（对应适当性管理办法） */
  investorGrade: InvestorGrade;
  riskAppetite: RiskAppetite;

  /** 风险评测完成日期 */
  riskAssessedAt: string;
  /** 风险评测到期日（通常为评测日 +1 年），到期须重测方可继续推荐产品 */
  riskExpiryDate: string;
  /** KYC 完成日期 */
  kycCompletedAt: string;
  /** 最近跟进时间（冗余缓存，驱动"待跟进"预警） */
  lastFollowUpAt?: string;

  tags: string[];
  assignedSalesId: string;
  createdAt: string;
}
