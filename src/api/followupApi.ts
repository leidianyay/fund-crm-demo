import { httpClient } from './httpClient';
import type { FollowUp } from '../types/followup';
import type { Holding } from '../types/holding';

interface ListResponse<T> {
  data: T[];
  total: number;
}

interface SingleResponse<T> {
  data: T;
}

export interface FollowUpQuery {
  customerId?: string;
  method?: string;
  productId?: string;
  since?: string;
}

export interface HoldingQuery {
  fundId?: string;
  clientId?: string;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `?${qs}` : '';
}

export const followupApi = {
  list: (query: FollowUpQuery = {}) =>
    httpClient.get<ListResponse<FollowUp>>(`/api/followups${buildQuery(query as Record<string, string | undefined>)}`),

  getById: (id: string) =>
    httpClient.get<SingleResponse<FollowUp>>(`/api/followups/${id}`),

  create: (followup: Omit<FollowUp, 'id'>) =>
    httpClient.post<SingleResponse<FollowUp>>('/api/followups', followup),

  update: (id: string, followup: Partial<FollowUp>) =>
    httpClient.put<SingleResponse<FollowUp>>(`/api/followups/${id}`, followup),

  remove: (id: string) =>
    httpClient.delete<{ message: string }>(`/api/followups/${id}`),
};

export const holdingApi = {
  list: (query: HoldingQuery = {}) =>
    httpClient.get<ListResponse<Holding>>(`/api/holdings${buildQuery(query as Record<string, string | undefined>)}`),
};
