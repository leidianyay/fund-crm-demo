import { http, HttpResponse } from 'msw';
import { funds } from '../data/funds';
import type { Product } from '../../types/fund';

let fundStore: Product[] = [...funds];

export const fundHandlers = [
  http.get('/api/funds', ({ request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status');
    const riskLevel = url.searchParams.get('riskLevel');
    const name = url.searchParams.get('name');

    let result = [...fundStore];

    if (type) result = result.filter((f) => f.type === type);
    if (status) result = result.filter((f) => f.status === status);
    if (riskLevel) result = result.filter((f) => f.riskLevel === Number(riskLevel));
    if (name) result = result.filter((f) => f.name.includes(name) || f.code.includes(name));

    return HttpResponse.json({ data: result, total: result.length });
  }),

  http.get('/api/funds/:id', ({ params }) => {
    const fund = fundStore.find((f) => f.id === params.id);
    if (!fund) return HttpResponse.json({ message: '基金不存在' }, { status: 404 });
    return HttpResponse.json({ data: fund });
  }),

  http.post('/api/funds', async ({ request }) => {
    const body = (await request.json()) as Omit<Product, 'id'>;
    const newFund: Product = { ...body, id: `f${Date.now()}` };
    fundStore.push(newFund);
    return HttpResponse.json({ data: newFund }, { status: 201 });
  }),

  http.put('/api/funds/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<Product>;
    const idx = fundStore.findIndex((f) => f.id === params.id);
    if (idx === -1) return HttpResponse.json({ message: '基金不存在' }, { status: 404 });
    fundStore[idx] = { ...fundStore[idx], ...body };
    return HttpResponse.json({ data: fundStore[idx] });
  }),

  http.delete('/api/funds/:id', ({ params }) => {
    const idx = fundStore.findIndex((f) => f.id === params.id);
    if (idx === -1) return HttpResponse.json({ message: '基金不存在' }, { status: 404 });
    fundStore.splice(idx, 1);
    return HttpResponse.json({ message: '删除成功' });
  }),
];
