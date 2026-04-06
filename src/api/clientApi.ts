import { httpClient, buildQuery } from './httpClient';
import type { ListResponse, SingleResponse } from './httpClient';
import type { Customer } from '../types/client';
import type { Holding } from '../types/holding';

export interface ClientQuery {
  customerType?: string;
  riskAppetite?: string;
  tag?: string;
}

export const clientApi = {
  list: (query: ClientQuery = {}) =>
    httpClient.get<ListResponse<Customer>>(
      `/api/clients${buildQuery(query as Record<string, string | undefined>)}`,
    ),

  getById: (id: string) =>
    httpClient.get<SingleResponse<Customer>>(`/api/clients/${id}`),

  create: (client: Omit<Customer, 'id'>) =>
    httpClient.post<SingleResponse<Customer>>('/api/clients', client),

  update: (id: string, client: Partial<Customer>) =>
    httpClient.put<SingleResponse<Customer>>(`/api/clients/${id}`, client),

  remove: (id: string) =>
    httpClient.delete<{ message: string }>(`/api/clients/${id}`),

  getHoldings: (id: string) =>
    httpClient.get<ListResponse<Holding>>(`/api/clients/${id}/holdings`),
};
