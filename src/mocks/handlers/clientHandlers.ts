import { http, HttpResponse } from 'msw';
import { clients } from '../data/clients';
import { holdings } from '../data/holdings';
import type { Customer } from '../../types/client';

let clientStore: Customer[] = [...clients];

export const clientHandlers = [
  http.get('/api/clients', ({ request }) => {
    const url = new URL(request.url);
    const customerType = url.searchParams.get('customerType');
    const riskAppetite = url.searchParams.get('riskAppetite');
    const tag = url.searchParams.get('tag');

    let result = [...clientStore];

    if (customerType) result = result.filter((c) => c.customerType === customerType);
    if (riskAppetite) result = result.filter((c) => c.riskAppetite === riskAppetite);
    if (tag) result = result.filter((c) => c.tags.includes(tag));

    return HttpResponse.json({ data: result, total: result.length });
  }),

  http.get('/api/clients/:id', ({ params }) => {
    const client = clientStore.find((c) => c.id === params.id);
    if (!client) return HttpResponse.json({ message: '客户不存在' }, { status: 404 });
    return HttpResponse.json({ data: client });
  }),

  http.post('/api/clients', async ({ request }) => {
    const body = (await request.json()) as Omit<Customer, 'id'>;
    const newClient: Customer = { ...body, id: `c${Date.now()}` };
    clientStore.push(newClient);
    return HttpResponse.json({ data: newClient }, { status: 201 });
  }),

  http.put('/api/clients/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<Customer>;
    const idx = clientStore.findIndex((c) => c.id === params.id);
    if (idx === -1) return HttpResponse.json({ message: '客户不存在' }, { status: 404 });
    clientStore[idx] = { ...clientStore[idx], ...body };
    return HttpResponse.json({ data: clientStore[idx] });
  }),

  http.delete('/api/clients/:id', ({ params }) => {
    const idx = clientStore.findIndex((c) => c.id === params.id);
    if (idx === -1) return HttpResponse.json({ message: '客户不存在' }, { status: 404 });
    clientStore.splice(idx, 1);
    return HttpResponse.json({ message: '删除成功' });
  }),

  http.get('/api/clients/:id/holdings', ({ params }) => {
    const clientHoldings = holdings.filter((h) => h.customerId === params.id);
    return HttpResponse.json({ data: clientHoldings, total: clientHoldings.length });
  }),
];
