export type FollowUpMethod = '电话' | '面访' | '微信' | '邮件' | '视频会议';
export type FollowUpIntent = '推进中' | '成功推荐' | '暂无意向' | '信息同步' | '风险提示';

export interface FollowUp {
  id: string;
  customerId: string;
  method: FollowUpMethod;
  intent: FollowUpIntent;
  /** 意向评分（1=极低 ~ 5=极高），结构化补充 intent 的量化维度 */
  intentScore?: 1 | 2 | 3 | 4 | 5;
  /** 跟进内容摘要 */
  content: string;
  timestamp: string;
  /** 下次跟进计划日期 */
  nextFollowUpDate?: string;
  salesId: string;
  /** 本次跟进涉及的产品 ID 列表 */
  relatedProductIds: string[];
  /** 下一步行动描述 */
  nextAction?: string;
}
