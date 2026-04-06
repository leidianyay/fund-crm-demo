import type { Product, ProductType, ProductStatus, RiskLevel } from './fund';
import type { Customer, CustomerType, CustomerLevel, RiskAppetite } from './client';
import type { FollowUp, FollowUpMethod, FollowUpIntent } from './followup';

// ─── 产品 DTO ──────────────────────────────────────────────────────────────

export type CreateProductDTO = Omit<Product, 'id'>;
export type UpdateProductDTO = Partial<Omit<Product, 'id'>>;

export interface ProductListQuery {
  type?: ProductType;
  status?: ProductStatus;
  riskLevel?: RiskLevel;
}

// ─── 客户 DTO ──────────────────────────────────────────────────────────────

export type CreateCustomerDTO = Omit<Customer, 'id' | 'createdAt'>;
export type UpdateCustomerDTO = Partial<Omit<Customer, 'id' | 'createdAt'>>;

export interface CustomerListQuery {
  customerType?: CustomerType;
  customerLevel?: CustomerLevel;
  riskAppetite?: RiskAppetite;
  tag?: string;
}

// ─── 跟进记录 DTO ──────────────────────────────────────────────────────────

/** 新建跟进：id 由后端生成，禁止客户端传入 */
export type CreateFollowUpDTO = Omit<FollowUp, 'id'>;

/** 编辑跟进：customerId 和 salesId 不可修改 */
export type UpdateFollowUpDTO = Partial<Omit<FollowUp, 'id' | 'customerId' | 'salesId'>>;

export interface FollowUpListQuery {
  customerId?: string;
  method?: FollowUpMethod;
  intent?: FollowUpIntent;
  productId?: string;
  /** ISO 日期，仅返回该时间点之后的记录 */
  since?: string;
}

// ─── 持仓 DTO ──────────────────────────────────────────────────────────────

export interface HoldingQuery {
  productId?: string;
  customerId?: string;
}
