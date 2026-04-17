import { setupWorker } from 'msw/browser';
import { useMockApiForConversationsPinnedGroups } from '@/lib/use-mock-api';
import { baseHandlers, datasetHandlers, conversationsHandlers, pinnedAndGroupsHandlers } from './handlers';

const isProduction = process.env.NODE_ENV === 'production';

/** Prod: only dataset mock. Dev: baseHandlers (dataset + welcome + alerts) + optional conversation/pinned/groups when NEXT_PUBLIC_USE_MOCK_API=true. */
const handlers = [
  ...(isProduction ? datasetHandlers : baseHandlers),
  ...(useMockApiForConversationsPinnedGroups ? conversationsHandlers : []),
  ...(useMockApiForConversationsPinnedGroups ? pinnedAndGroupsHandlers : []),
];

export const worker = setupWorker(...handlers);
