import { httpClient, buildQuery } from './httpClient';
import type { ListResponse } from './httpClient';
import type { Holding } from '../types/holding';

export interface HoldingQuery {
  productId?: string;
  customerId?: string;
}

/**
 * 持仓通用查询接口（支持按产品或客户双向过滤）
 * - ProductDetail 用 productId 查"哪些客户持有该产品"
 * - CustomerDetail 用 customerId 查"该客户持有哪些产品"（也可通过 clientApi.getHoldings）
 */
export const holdingApi = {
  list: (query: HoldingQuery = {}) =>
    httpClient.get<ListResponse<Holding>>(
      `/api/holdings${buildQuery(query as Record<string, string | undefined>)}`,
    ),
};
