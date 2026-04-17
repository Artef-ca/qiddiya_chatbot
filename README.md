# Qiddiya - Next.js Project

A modern interface built with Next.js, TypeScript, Redux Toolkit, TanStack Query, Tailwind CSS, and shadcn/ui.

## 🚀 Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **State Management**:
  - Redux Toolkit (RTK) for client-side state
  - TanStack Query for server-side state management
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Markdown Rendering**: react-markdown

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── chat/         # Chat API endpoints
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Main page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── chat/             # Chat-related components
│   │   ├── ChatContainer.tsx
│   │   ├── ChatInput.tsx
│   │   └── ChatMessage.tsx
│   ├── layout/           # Layout components
│   │   └── MainLayout.tsx
│   ├── sidebar/          # Sidebar components
│   │   └── Sidebar.tsx
│   └── ui/               # shadcn/ui components
│       ├── button.tsx
│       └── textarea.tsx
├── hooks/                # Custom React hooks
│   └── useChat.ts        # Chat hook with TanStack Query
├── lib/                  # Utility libraries
│   ├── api/             # API functions
│   │   └── chat.ts      # Chat API client
│   └── utils.ts         # Utility functions
├── providers/            # React context providers
│   ├── StoreProvider.tsx # Redux store provider
│   ├── QueryProvider.tsx # TanStack Query provider
│   └── index.tsx         # Combined providers
├── store/                # Redux store
│   ├── slices/          # Redux slices
│   │   ├── chatSlice.ts # Chat state management
│   │   └── uiSlice.ts   # UI state management
│   ├── hooks.ts         # Typed Redux hooks
│   └── index.ts         # Store configuration
└── types/                # TypeScript type definitions
    └── index.ts          # Shared types
```

## 🏗️ Architecture

### State Management

#### Redux Toolkit (Client State)

- **chatSlice**: Manages conversations, messages, and active conversation
- **uiSlice**: Manages UI state (sidebar, theme, mobile detection)

#### TanStack Query (Server State)

- Handles API calls and caching
- Manages loading and error states
- Provides optimistic updates

### Components

- **MainLayout**: Main application layout with sidebar and chat container
- **Sidebar**: Conversation list and management
- **ChatContainer**: Main chat interface
- **ChatInput**: Message input with auto-resize
- **ChatMessage**: Individual message rendering with markdown support

## 🛠️ Setup

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Set up environment variables** (create `.env.local`):

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3000/api
   # Add your API keys here when integrating with OpenAI/Anthropic/etc.
   ```

3. **Run development server**:

   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

## 🔌 API Integration

The project includes placeholder API routes in `src/app/api/chat/`. To integrate with a real chat API:

1. **Update `src/app/api/chat/route.ts`** for non-streaming responses
2. **Update `src/app/api/chat/stream/route.ts`** for streaming responses
3. **Update `src/lib/api/chat.ts`** if using external API directly

### Example: OpenAI Integration

```typescript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In route.ts
const completion = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    ...(history?.map((msg) => ({ role: msg.role, content: msg.content })) ||
      []),
    { role: "user", content: message },
  ],
  stream: true, // For streaming endpoint
});
```

## 📝 Features

- ✅ Modern chat interface
- ✅ Conversation management
- ✅ Message streaming support
- ✅ Markdown rendering
- ✅ Responsive design
- ✅ Dark mode support (via shadcn/ui)
- ✅ TypeScript throughout
- ✅ Redux Toolkit for state management
- ✅ TanStack Query for server state

## 🎨 Customization

### Adding shadcn/ui Components

```bash
npx shadcn@latest add [component-name]
```

### Styling

The project uses Tailwind CSS with shadcn/ui's design system. Customize colors and themes in `src/app/globals.css`.

## 🧪 Mock APIs (MSW)

This project uses [Mock Service Worker (MSW)](https://mswjs.io/) for API mocking. **MSW is enabled by default in all environments** (development and production) to allow testing with mock data until real APIs are integrated.

### Disabling Mock APIs

To disable Mock APIs when you're ready to use real APIs, set the following environment variable:

```env
NEXT_PUBLIC_DISABLE_MSW=true
```

**Important Notes:**
- Mock APIs are enabled by default and will intercept requests to `/api/conversations`, `/api/chat`, `/api/pinned`, etc.
- The `mockServiceWorker.js` file must be available in the `public` folder (it's included by default)
- When MSW is enabled, you'll see a console log: "MSW enabled - Mock APIs are active"
- Once real APIs are ready, set `NEXT_PUBLIC_DISABLE_MSW=true` to disable mocks

### Mock API Handlers

The mock handlers are defined in `src/mocks/handlers.ts` and include:
- Conversations CRUD operations
- Chat messages (with mock AI responses)
- Pinned items management
- Dataset explorer APIs
- Groups management
- Alerts/notifications

## 🔐 Authentication

This application includes Azure SSO integration using SAML 2.0. See [AZURE_SSO_SETUP.md](./AZURE_SSO_SETUP.md) for detailed setup instructions.

### Quick Setup

1. Configure your Azure AD Enterprise Application
2. Set up environment variables (see `.env.example`):
   ```env
   SAML_ENTRY_POINT=https://login.microsoftonline.com/YOUR_TENANT_ID/saml2
   SAML_ISSUER=https://your-app-domain.com
   SAML_CALLBACK_URL=http://localhost:3000/api/auth/saml/callback
   SAML_CERT=-----BEGIN CERTIFICATE-----\nYOUR_CERT\n-----END CERTIFICATE-----
   JWT_SECRET=your-secret-key-change-in-production
   ```
3. The login page will automatically redirect to Azure AD for authentication

## 📚 Next Steps

1. Integrate with your preferred chat API (OpenAI, Anthropic, etc.)
2. Configure Azure SSO authentication (see [AZURE_SSO_SETUP.md](./AZURE_SSO_SETUP.md))
3. Implement conversation persistence (localStorage, database)
4. Add more UI features (settings, export, etc.)
5. Enhance error handling and loading states

## 🤝 Contributing

This is a starter template. Feel free to customize and extend it for your needs!

## 📄 License

MIT
