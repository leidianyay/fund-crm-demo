export interface ListResponse<T> {
  data: T[];
  total: number;
}

export interface SingleResponse<T> {
  data: T;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `?${qs}` : '';
}

const MSW_RETRY_ATTEMPTS = 6;
const MSW_RETRY_DELAY_MS = 600;

/**
 * MSW Service Worker 在首次加载 / 强刷新时存在短暂的"已注册但未控制页面"窗口期。
 * 在此期间 /api/* 请求会穿透到 Vite dev server，返回 SPA 的 index.html。
 * 检测到响应不是 JSON 时，等待 SW 就绪后自动重试，最多 3 次。
 */
async function request<T>(url: string, options?: RequestInit, attempt = 0): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    if (attempt < MSW_RETRY_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, MSW_RETRY_DELAY_MS));
      return request<T>(url, options, attempt + 1);
    }
    throw new ApiError(503, 'Mock Service Worker 尚未就绪，请刷新页面重试');
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(response.status, errorBody.message ?? response.statusText);
  }

  return response.json() as Promise<T>;
}

export const httpClient = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: unknown) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(url: string, body: unknown) =>
    request<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};
