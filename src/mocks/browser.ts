import { setupWorker } from 'msw/browser';
import { fundHandlers } from './handlers/fundHandlers';
import { clientHandlers } from './handlers/clientHandlers';
import { followupHandlers } from './handlers/followupHandlers';

export const worker = setupWorker(
  ...fundHandlers,
  ...clientHandlers,
  ...followupHandlers,
);
