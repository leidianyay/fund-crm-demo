import { http, HttpResponse } from 'msw';
import { followups } from '../data/followups';
import { holdings } from '../data/holdings';
import type { FollowUp } from '../../types/followup';

let followupStore: FollowUp[] = [...followups];

export const followupHandlers = [
  http.get('/api/followups', ({ request }) => {
    const url = new URL(request.url);
    const customerId = url.searchParams.get('customerId');
    const method = url.searchParams.get('method');
    const productId = url.searchParams.get('productId');
    const since = url.searchParams.get('since');

    let result = [...followupStore];

    if (customerId) result = result.filter((f) => f.customerId === customerId);
    if (method) result = result.filter((f) => f.method === method);
    if (productId) result = result.filter((f) => f.relatedProductIds.includes(productId));
    if (since) result = result.filter((f) => new Date(f.timestamp) >= new Date(since));

    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return HttpResponse.json({ data: result, total: result.length });
  }),

  http.get('/api/followups/:id', ({ params }) => {
    const followup = followupStore.find((f) => f.id === params.id);
    if (!followup) return HttpResponse.json({ message: '跟进记录不存在' }, { status: 404 });
    return HttpResponse.json({ data: followup });
  }),

  http.post('/api/followups', async ({ request }) => {
    const body = (await request.json()) as Omit<FollowUp, 'id'>;
    const newFollowUp: FollowUp = { ...body, id: `fu${Date.now()}` };
    followupStore.push(newFollowUp);
    return HttpResponse.json({ data: newFollowUp }, { status: 201 });
  }),

  http.put('/api/followups/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<FollowUp>;
    const idx = followupStore.findIndex((f) => f.id === params.id);
    if (idx === -1) return HttpResponse.json({ message: '跟进记录不存在' }, { status: 404 });
    followupStore[idx] = { ...followupStore[idx], ...body };
    return HttpResponse.json({ data: followupStore[idx] });
  }),

  http.delete('/api/followups/:id', ({ params }) => {
    const idx = followupStore.findIndex((f) => f.id === params.id);
    if (idx === -1) return HttpResponse.json({ message: '跟进记录不存在' }, { status: 404 });
    followupStore.splice(idx, 1);
    return HttpResponse.json({ message: '删除成功' });
  }),

  http.get('/api/holdings', ({ request }) => {
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId');
    const customerId = url.searchParams.get('customerId');

    let result = [...holdings];

    if (productId) result = result.filter((h) => h.productId === productId);
    if (customerId) result = result.filter((h) => h.customerId === customerId);

    return HttpResponse.json({ data: result, total: result.length });
  }),
];
