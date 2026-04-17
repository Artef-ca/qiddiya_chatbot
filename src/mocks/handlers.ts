import { http, HttpResponse } from 'msw';
import type { Conversation, Message, PinnedItem, FileAttachment } from '@/types';
import { mockConversations } from '@/data/mockConversations';

// Mock data storage (simulating backend database)
// Initialize with mock conversations for demo purposes
let conversations: Conversation[] = [...mockConversations];
let pinnedItems: PinnedItem[] = [];
const groups: Array<{ id: string; name: string; conversationIds: string[]; starred?: boolean; archived?: boolean; createdAt?: Date; updatedAt?: Date }> = [];

// Helper to serialize dates for JSON responses
const serializeConversation = (conv: Conversation) => ({
  ...conv,
  createdAt: conv.createdAt.toISOString(),
  updatedAt: conv.updatedAt.toISOString(),
  messages: conv.messages.map(msg => ({
    ...msg,
    timestamp: msg.timestamp.toISOString(),
  })),
});

const deserializeConversation = (conv: ReturnType<typeof serializeConversation>): Conversation => ({
  ...conv,
  createdAt: new Date(conv.createdAt),
  updatedAt: new Date(conv.updatedAt),
  messages: conv.messages.map((msg) => ({
    ...msg,
    timestamp: new Date(msg.timestamp),
  })),
});

// User Profile API - Commented out to use real session-based endpoint
// The real endpoint at /api/user/profile uses session data from SAML authentication
// export const getUserProfile = http.get('/api/user/profile', () => {
//   return HttpResponse.json({
//     id: userId,
//     name: 'John Doe',
//     email: 'john.doe@example.com',
//     avatar: null,
//   });
// });

// Welcome Screen Prompts API
export const getWelcomePrompts = http.get('/api/welcome/prompts', () => {
  return HttpResponse.json({
    greeting: 'Hey There',
    subtitle: 'Where should we start?',
    prompts: [
      {
        id: '1',
        text: 'Show me the total headcount',
      },
      {
        id: '2',
        text: 'Yes, show me the total for what you have',
      },
      {
        id: '3',
        text: 'Show me Entertainment district budget overview',
      },
    ],
  });
});

// Initialize default groups
const initializeDefaultGroups = () => {
  if (groups.length === 0 && conversations.length > 0) {
    // Work Projects group - first 5 conversations
    if (conversations.length >= 5) {
      groups.push({
        id: 'group-1',
        name: 'Work Projects',
        conversationIds: conversations.slice(0, 5).map(c => c.id),
        starred: false,
        archived: false,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      });
    }
    // Personal group - next 5 conversations
    if (conversations.length >= 10) {
      groups.push({
        id: 'group-2',
        name: 'Personal',
        conversationIds: conversations.slice(5, 10).map(c => c.id),
        starred: false,
        archived: false,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      });
    }
  }
};

// Conversations API handlers - conditionally included based on NEXT_PUBLIC_USE_MOCK_API
// When NEXT_PUBLIC_USE_MOCK_API=true: these are mocked
// When NEXT_PUBLIC_USE_MOCK_API=false: these use real Next.js APIs (Cloud SQL)
export const getConversations = http.get('/api/conversations', () => {
  // Ensure conversations are initialized
  if (conversations.length === 0) {
    conversations = [...mockConversations];
  }

  // Initialize default groups if needed
  initializeDefaultGroups();

  return HttpResponse.json({
    conversations: conversations.map(serializeConversation),
    groups,
  });
});

export const getConversation = http.get('/api/conversations/:id', ({ params }) => {
  const { id } = params;
  const conversation = conversations.find(c => c.id === id);

  if (!conversation) {
    return HttpResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  return HttpResponse.json(serializeConversation(conversation));
});

export const createConversation = http.post('/api/conversations', async ({ request }) => {
  const body = await request.json() as { title?: string };
  const newConversation: Conversation = {
    id: `conv-${Date.now()}`,
    title: body.title || 'New Conversation',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    starred: false,
    archived: false,
  };

  conversations.push(newConversation);
  return HttpResponse.json(serializeConversation(newConversation), { status: 201 });
});

export const updateConversation = http.patch('/api/conversations/:id', async ({ params, request }) => {
  const { id } = params;
  const body = await request.json() as { title?: string; starred?: boolean; archived?: boolean };
  const conversation = conversations.find(c => c.id === id);

  if (!conversation) {
    return HttpResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  if (body.title !== undefined) {
    conversation.title = body.title;
  }
  if (body.starred !== undefined) {
    conversation.starred = body.starred;
  }
  if (body.archived !== undefined) {
    conversation.archived = body.archived;
  }
  conversation.updatedAt = new Date();

  return HttpResponse.json(serializeConversation(conversation));
});

export const deleteConversation = http.delete('/api/conversations/:id', ({ params }) => {
  const { id } = params;
  const index = conversations.findIndex(c => c.id === id);

  if (index === -1) {
    return HttpResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  conversations.splice(index, 1);
  // Also remove pinned items for this conversation
  pinnedItems = pinnedItems.filter(item => item.conversationId !== id);

  return HttpResponse.json({ success: true });
});

// Chat Messages API
export const sendChatMessage = http.post('/api/chat', async ({ request }) => {
  const body = await request.json() as {
    message: string;
    conversationId?: string;
    attachments?: FileAttachment[];
    pinnedItems?: PinnedItem[];
  };

  let conversation = conversations.find(c => c.id === body.conversationId);

  if (!conversation && body.conversationId) {
    return HttpResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  if (!conversation) {
    // Create new conversation
    conversation = {
      id: `conv-${Date.now()}`,
      title: body.message.substring(0, 50) + (body.message.length > 50 ? '...' : ''),
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      starred: false,
      archived: false,
    };
    conversations.push(conversation);
  }

  // Add user message
  const userMessage: Message = {
    id: `msg-${Date.now()}-user`,
    role: 'user',
    content: body.message,
    timestamp: new Date(),
    attachments: body.attachments,
    pinnedItems: body.pinnedItems,
  };

  conversation.messages.push(userMessage);
  conversation.updatedAt = new Date();

  return HttpResponse.json({
    conversationId: conversation.id,
    message: serializeConversation(conversation),
  });
});

// Generate a session ID for mock (used in URL as /chat/session_id - not conv-xxx)
function generateMockSessionId(): string {
  return `session-${Date.now()}`;
}

// Streaming Chat API (simulated)
export const streamChatMessage = http.post('/api/chat/stream', async ({ request }) => {
  const body = await request.json() as {
    message: string;
    conversationId?: string;
    history?: Message[];
  };

  // Resolve session ID: use stored conversation id when possible so URL shows /chat/session_id (not just /chat)
  let sessionId: string;
  if (body.conversationId) {
    const conversation = conversations.find(c => c.id === body.conversationId);
    if (conversation) {
      // If conversation already has a session-style id, keep it; else assign new session id
      sessionId = conversation.id.startsWith('session-') || /^\d+$/.test(conversation.id) ? conversation.id : generateMockSessionId();
      if (sessionId !== conversation.id) {
        conversation.id = sessionId;
      }
    } else {
      // Not in mock list (e.g. client has stored session_id from Redux): reuse same id so URL stays /chat/session_id
      const id = body.conversationId;
      if (id.startsWith('session-') || /^\d+$/.test(id)) {
        sessionId = id;
      } else {
        sessionId = generateMockSessionId();
      }
    }
  } else {
    sessionId = generateMockSessionId();
    // New conversation from stream: create and add to list so GET /conversations returns it
    const newConversation: Conversation = {
      id: sessionId,
      title: body.message.substring(0, 50) + (body.message.length > 50 ? '...' : ''),
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      starred: false,
      archived: false,
    };
    conversations.push(newConversation);
  }

  // Create a ReadableStream for Server-Sent Events
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // First event: session_id so client can set URL to /chat/session_id (same as real API)
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ sessionId })}\n\n`));

      // Add initial delay to show spinner (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate response based on message content
      let testResponse = '';

      if (body.message.toLowerCase().includes('headcount') || body.message.toLowerCase().includes('entertainment')) {
        if (body.message.toLowerCase().includes('total') || body.message.toLowerCase().includes('show me the total')) {
          testResponse = `Total headcount across 4 Entertainment venues: **679 employees**

This represents approximately 60% of planned Entertainment district staffing based on available data. <span data-type="tag">HR Dashboard, Nov 2024</span>`;
        } else {
          testResponse = `I found headcount data for 4 out of 7 Entertainment venues:

| Venue | Current Headcount | Last Updated |
|-------|-------------------|--------------|
| Six Flags | 342 | Nov 20, 2025 |
| Gaming & E-sports | 87 | Nov 18, 2025 |
| Aqua Park | 156 | Nov 19, 2025 |
| Speed Park | 93 | Nov 20, 2025 |

<div data-type="warning">
I couldn't retrieve data for:
<ul>
<li>Resort Core Entertainment venues</li>
<li>Lagoon Village attractions</li>
<li>Delta B entertainment facilities</li>
</ul>
Possible reasons:
<ul>
<li>Data not yet available in the system</li>
<li>These venues may still be in planning phase</li>
</ul>
</div>

To go further:

<div data-type="suggestions">
<button data-type="suggestion">Show you the total for available venues only?</button>
<button data-type="suggestion">Search for projected headcount instead?</button>
<button data-type="suggestion">Check which venues have reported data?</button>
</div>`;
        }
      } else if (body.message.toLowerCase().includes('budget')) {
        testResponse = `Here's the Entertainment district budget overview for Q3 2024:

**Total Allocated Budget:** SAR 450M
**Actual Spend to Date:** SAR 312M
**Variance:** -SAR 23M (5.1% under budget)

Breakdown by category:
- **Personnel Costs:** SAR 145M
- **Operations & Maintenance:** SAR 98M
- **Marketing & Events:** SAR 45M
- **Infrastructure:** SAR 24M`;
      } else {
        testResponse = `I understand you're asking about: "${body.message}". This is a mock response from MSW. When the real backend is ready, this will be replaced with actual AI responses.`;
      }

      // Stream the response word by word
      const words = testResponse.split(' ');

      for (const word of words) {
        const data = JSON.stringify({ content: word + ' ' });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        // Simulate delay between words
        await new Promise(resolve => setTimeout(resolve, 30));
      }

      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});

// Pinned Items API
export const getPinnedItems = http.get('/api/pinned', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[MSW] ✅ Intercepted GET /api/pinned - returning mock data');
  }
  return HttpResponse.json({
    items: pinnedItems.map(item => ({
      ...item,
      pinnedAt: item.pinnedAt.toISOString(),
    })),
  });
});

export const createPinnedItem = http.post('/api/pinned', async ({ request }) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[MSW] ✅ Intercepted POST /api/pinned - creating mock item');
  }
  const body = await request.json() as Omit<PinnedItem, 'pinnedAt'> & { pinnedAt?: string };
  const newPinnedItem: PinnedItem = {
    ...body,
    pinnedAt: body.pinnedAt ? new Date(body.pinnedAt) : new Date(),
  };

  pinnedItems.push(newPinnedItem);
  return HttpResponse.json({
    ...newPinnedItem,
    pinnedAt: newPinnedItem.pinnedAt.toISOString(),
  }, { status: 201 });
});

export const updatePinnedItem = http.patch('/api/pinned/:id', async ({ params, request }) => {
  const { id } = params;
  const body = await request.json() as { title?: string; note?: string };
  const item = pinnedItems.find(p => p.id === id);

  if (!item) {
    return HttpResponse.json({ error: 'Pinned item not found' }, { status: 404 });
  }

  if (body.title !== undefined) {
    item.title = body.title;
  }

  if (body.note !== undefined) {
    item.note = body.note;
  }

  return HttpResponse.json({
    ...item,
    pinnedAt: item.pinnedAt.toISOString(),
  });
});

export const deletePinnedItem = http.delete('/api/pinned/:id', ({ params }) => {
  const { id } = params;
  const index = pinnedItems.findIndex(p => p.id === id);

  if (index === -1) {
    return HttpResponse.json({ error: 'Pinned item not found' }, { status: 404 });
  }

  pinnedItems.splice(index, 1);
  return HttpResponse.json({ success: true });
});

export const reorderPinnedItems = http.post('/api/pinned/reorder', async ({ request }) => {
  const body = await request.json() as { activeId: string; overId: string };
  const { activeId, overId } = body;

  const activeIndex = pinnedItems.findIndex(item => item.id === activeId);
  const overIndex = pinnedItems.findIndex(item => item.id === overId);

  if (activeIndex === -1 || overIndex === -1) {
    return HttpResponse.json({ error: 'Invalid item IDs' }, { status: 400 });
  }

  const [removed] = pinnedItems.splice(activeIndex, 1);
  pinnedItems.splice(overIndex, 0, removed);

  return HttpResponse.json({ success: true });
});

// Dataset Explorer API
export const getDatasets = http.get('/api/datasets', () => {
  return HttpResponse.json({
    datasets: [
      { id: 'entertainment', name: 'Entertainment' },
      { id: 'retail', name: 'Retail' },
      { id: 'hospitality', name: 'Hospitality' },
    ],
  });
});

export const getDatasetTables = http.get('/api/datasets/:datasetId/tables', ({ params }) => {
  const { datasetId } = params;

  const tables: Record<string, any[]> = {
    entertainment: [
      { id: 'boxofficesales', name: 'BoxOfficeSales' },
      { id: 'venues', name: 'Venues' },
      { id: 'events', name: 'Events' },
    ],
    retail: [
      { id: 'sales', name: 'Sales' },
      { id: 'products', name: 'Products' },
    ],
    hospitality: [
      { id: 'bookings', name: 'Bookings' },
      { id: 'guests', name: 'Guests' },
    ],
  };

  return HttpResponse.json({
    tables: tables[datasetId as string] || [],
  });
});

export const getTableColumns = http.get('/api/datasets/:datasetId/tables/:tableId/columns', ({ params }) => {
  const { datasetId, tableId } = params;

  const tableColumns: Record<string, any[]> = {
    // Entertainment dataset tables
    boxofficesales: [
      { name: 'PurchaseDate', type: 'DATE' },
      { name: 'CinemaName', type: 'STRING' },
      { name: 'Location', type: 'STRING' },
      { name: 'UserID', type: 'VARCHAR' },
      { name: 'Day', type: 'INT' },
      { name: 'WeekDayFlag', type: 'INT' },
      { name: 'HolidayFlag', type: 'INT' },
      { name: 'MovieName', type: 'STRING' },
      { name: 'Genre', type: 'STRING' },
      { name: 'TicketType', type: 'STRING' },
      { name: 'SeatNumber', type: 'INT' },
      { name: 'DiscountApplied', type: 'STRING' },
    ],
    venues: [
      { name: 'VenueID', type: 'VARCHAR' },
      { name: 'VenueName', type: 'STRING' },
      { name: 'Capacity', type: 'INT' },
      { name: 'Location', type: 'STRING' },
      { name: 'VenueType', type: 'STRING' },
      { name: 'OpeningDate', type: 'DATE' },
      { name: 'Status', type: 'STRING' },
    ],
    events: [
      { name: 'EventID', type: 'VARCHAR' },
      { name: 'EventName', type: 'STRING' },
      { name: 'EventDate', type: 'DATE' },
      { name: 'VenueID', type: 'VARCHAR' },
      { name: 'TicketPrice', type: 'DECIMAL' },
      { name: 'AvailableTickets', type: 'INT' },
      { name: 'EventType', type: 'STRING' },
    ],
    // Retail dataset tables
    sales: [
      { name: 'SaleID', type: 'VARCHAR' },
      { name: 'ProductID', type: 'VARCHAR' },
      { name: 'SaleDate', type: 'DATE' },
      { name: 'Quantity', type: 'INT' },
      { name: 'UnitPrice', type: 'DECIMAL' },
      { name: 'TotalAmount', type: 'DECIMAL' },
      { name: 'CustomerID', type: 'VARCHAR' },
      { name: 'StoreLocation', type: 'STRING' },
    ],
    products: [
      { name: 'ProductID', type: 'VARCHAR' },
      { name: 'ProductName', type: 'STRING' },
      { name: 'Category', type: 'STRING' },
      { name: 'Price', type: 'DECIMAL' },
      { name: 'StockQuantity', type: 'INT' },
      { name: 'Supplier', type: 'STRING' },
      { name: 'Description', type: 'TEXT' },
    ],
    // Hospitality dataset tables
    bookings: [
      { name: 'BookingID', type: 'VARCHAR' },
      { name: 'GuestID', type: 'VARCHAR' },
      { name: 'CheckInDate', type: 'DATE' },
      { name: 'CheckOutDate', type: 'DATE' },
      { name: 'RoomNumber', type: 'STRING' },
      { name: 'RoomType', type: 'STRING' },
      { name: 'TotalCost', type: 'DECIMAL' },
      { name: 'Status', type: 'STRING' },
    ],
    guests: [
      { name: 'GuestID', type: 'VARCHAR' },
      { name: 'FirstName', type: 'STRING' },
      { name: 'LastName', type: 'STRING' },
      { name: 'Email', type: 'STRING' },
      { name: 'Phone', type: 'STRING' },
      { name: 'Country', type: 'STRING' },
      { name: 'LoyaltyPoints', type: 'INT' },
    ],
  };

  return HttpResponse.json({
    columns: tableColumns[tableId as string] || [],
  });
});

// Alerts/Notifications API
export const getAlerts = http.get('/api/alerts', () => {
  return HttpResponse.json({
    alerts: [
      {
        id: 'alert-1',
        title: 'New dataset available',
        message: 'Entertainment dataset has been updated with new records',
        type: 'info',
        timestamp: new Date().toISOString(),
        read: false,
      },
      {
        id: 'alert-2',
        title: 'System maintenance',
        message: 'Scheduled maintenance on Dec 1, 2024 from 2 AM to 4 AM',
        type: 'warning',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: false,
      },
    ],
  });
});

export const markAlertRead = http.post('/api/alerts/:id/read', ({ params }) => {
  // In real implementation, this would update the alert status
  return HttpResponse.json({ success: true });
});

// Groups API
export const getGroups = http.get('/api/groups', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[MSW] ✅ Intercepted GET /api/groups - returning mock data');
  }
  // Ensure conversations are initialized
  if (conversations.length === 0) {
    conversations = [...mockConversations];
  }

  // Initialize default groups if needed
  initializeDefaultGroups();

  // Serialize groups with dates
  return HttpResponse.json(groups.map(group => ({
    ...group,
    createdAt: group.createdAt?.toISOString(),
    updatedAt: group.updatedAt?.toISOString(),
  })));
});

export const createGroup = http.post('/api/groups', async ({ request }) => {
  const body = await request.json() as { name: string };
  const now = new Date();
  const newGroup = {
    id: `group-${Date.now()}`,
    name: body.name,
    conversationIds: [],
    starred: false,
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
  groups.push(newGroup);
  return HttpResponse.json({
    ...newGroup,
    createdAt: newGroup.createdAt.toISOString(),
    updatedAt: newGroup.updatedAt.toISOString(),
  }, { status: 201 });
});

export const updateGroup = http.patch('/api/groups/:groupId', async ({ params, request }) => {
  const { groupId } = params;
  const body = await request.json() as { name?: string; starred?: boolean; archived?: boolean };
  const group = groups.find(g => g.id === groupId);

  if (!group) {
    return HttpResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  // Update group properties
  if (body.name !== undefined) {
    group.name = body.name;
  }
  if (body.starred !== undefined) {
    group.starred = body.starred;
  }
  if (body.archived !== undefined) {
    group.archived = body.archived;
  }

  // Update updatedAt timestamp
  group.updatedAt = new Date();

  return HttpResponse.json({
    ...group,
    createdAt: group.createdAt?.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  });
});

export const deleteGroup = http.delete('/api/groups/:groupId', async ({ params }) => {
  const { groupId } = params;
  const groupIndex = groups.findIndex(g => g.id === groupId);

  if (groupIndex === -1) {
    return HttpResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  // Remove the group (conversations will remain but won't be in any group)
  groups.splice(groupIndex, 1);

  return HttpResponse.json({ success: true });
});

export const addConversationsToGroup = http.post('/api/groups/:groupId/conversations', async ({ params, request }) => {
  const { groupId } = params;
  const body = await request.json() as { conversationIds: string[] };
  const group = groups.find(g => g.id === groupId);

  if (!group) {
    return HttpResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  // Add conversation IDs that aren't already in the group
  body.conversationIds.forEach(id => {
    if (!group.conversationIds.includes(id)) {
      group.conversationIds.push(id);
    }
  });

  return HttpResponse.json(group);
});

export const removeConversationsFromGroup = http.delete('/api/groups/:groupId/conversations', async ({ params, request }) => {
  const { groupId } = params;
  const body = await request.json() as { conversationIds: string[] };
  const group = groups.find(g => g.id === groupId);

  if (!group) {
    return HttpResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  // Remove conversation IDs from the group
  group.conversationIds = group.conversationIds.filter(id => !body.conversationIds.includes(id));

  return HttpResponse.json({ success: true });
});

// Initialize with mock data
export const initializeMockData = () => {
  // Initialize conversations with mock data if empty
  if (conversations.length === 0) {
    conversations = [...mockConversations];
  }
};

// Initialize mock data when handlers are loaded
initializeMockData();

// Initialize default groups when handlers are loaded
if (conversations.length > 0) {
  initializeDefaultGroups();
}

// Dataset-only handlers: ONLY these run as mock in production (real API for everything else).
export const datasetHandlers = [
  getDatasets,
  getDatasetTables,
  getTableColumns,
];

// Base handlers for dev: dataset + welcome + alerts (never used in production)
// In production only datasetHandlers are mocked; conversations/pinned/groups are never mocked.
export const baseHandlers = [
  getWelcomePrompts,
  ...datasetHandlers,
  getAlerts,
  markAlertRead,
];

// Withdraw consent - clears user data (conversations, pinned, groups) so re-accept looks like new user
export const withdrawConsent = http.post('/api/consent/withdraw', () => {
  conversations = [];
  pinnedItems = [];
  groups.splice(0, groups.length);
  return HttpResponse.json({ success: true, message: 'All data deleted and consent withdrawn' });
});

// Conversations handlers - conditionally included based on NEXT_PUBLIC_USE_MOCK_API
// When NEXT_PUBLIC_USE_MOCK_API=true: these are mocked
// When NEXT_PUBLIC_USE_MOCK_API=false: these use real Next.js APIs (Cloud SQL with sessions/events tables)
export const conversationsHandlers = [
  withdrawConsent,
  getConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation,
  // Chat API is never mocked - always hit real /api/chat/stream to get bot response and session id for URL
];

// Pinned and Groups handlers - conditionally included based on NEXT_PUBLIC_USE_MOCK_API
// When NEXT_PUBLIC_USE_MOCK_API=true: these are mocked
// When NEXT_PUBLIC_USE_MOCK_API=false: these use real Next.js APIs (Cloud SQL)
export const pinnedAndGroupsHandlers = [
  getPinnedItems,
  createPinnedItem,
  updatePinnedItem,
  deletePinnedItem,
  reorderPinnedItems,
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  addConversationsToGroup,
  removeConversationsFromGroup,
];

// Default handlers export (includes conversations/pinned/groups by default for backward compatibility)
// The actual handlers array used by MSW is built in browser.ts based on NEXT_PUBLIC_USE_MOCK_API
export const handlers = [
  ...baseHandlers,
  ...conversationsHandlers,
  ...pinnedAndGroupsHandlers,
];

