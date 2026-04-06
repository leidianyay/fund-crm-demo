import { httpClient, buildQuery } from './httpClient';
import type { ListResponse, SingleResponse } from './httpClient';
import type { Product } from '../types/fund';

export interface FundQuery {
  type?: string;
  status?: string;
  riskLevel?: number;
  name?: string;
}

export const fundApi = {
  list: (query: FundQuery = {}) =>
    httpClient.get<ListResponse<Product>>(
      `/api/funds${buildQuery(query as Record<string, string | number | undefined>)}`,
    ),

  getById: (id: string) =>
    httpClient.get<SingleResponse<Product>>(`/api/funds/${id}`),

  create: (fund: Omit<Product, 'id'>) =>
    httpClient.post<SingleResponse<Product>>('/api/funds', fund),

  update: (id: string, fund: Partial<Product>) =>
    httpClient.put<SingleResponse<Product>>(`/api/funds/${id}`, fund),

  remove: (id: string) =>
    httpClient.delete<{ message: string }>(`/api/funds/${id}`),
};
