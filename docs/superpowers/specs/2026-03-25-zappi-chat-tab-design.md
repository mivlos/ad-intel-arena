# Zappi Chat Tab — Design Spec

**Date:** 2026-03-25
**Status:** Approved (user provided complete spec, no questions needed)

---

## Overview

Add a 'Zappi Chat' tab to Ad Intelligence Arena alongside the existing 'Arena' tab. The new tab provides a full-width, multi-turn conversational interface directly with the Zappi agent API — distinct from the auto-continuation Arena flow.

---

## Architecture

### New Files

| Path | Purpose |
|------|---------|
| `src/app/api/zappi-chat/create/route.ts` | Create a new Zappi session |
| `src/app/api/zappi-chat/message/route.ts` | Send message to existing session, poll until `awaiting_input` |
| `src/components/ZappiChat.tsx` | Full-width chat UI component |

### Modified Files

| Path | Change |
|------|--------|
| `src/app/page.tsx` | Add tab toggle state (localStorage-backed), render Arena or ZappiChat based on active tab |

---

## API Routes

### POST /api/zappi-chat/create

Creates a new Zappi agent session.

**Request body:** (empty or `{}`)
**Response:** `{ session_id: string }`

Implementation:
- `POST https://www.sandbox.zappi.io/zappi-ai/api/v1/agent_sessions` with `{ assistant_id: parseInt(ZAPPI_ASSISTANT_ID), content: "" }` (empty content triggers session init — or we may need a placeholder; follow the same pattern as the Arena route)
- Return `{ session_id }` on success

**Edge case:** The existing Arena route creates a session by posting the user query as the initial message. For chat, we create the session WITH the first message. So `/create` accepts `{ message: string }` and posts it as the initial content.

Revised:
- **Request:** `{ message: string }`
- **Action:** `POST /agent_sessions` with `{ assistant_id, content: message }`
- **Response:** `{ session_id: string }`

### POST /api/zappi-chat/message

Sends a follow-up message to an existing session and polls until Zappi is `awaiting_input`.

**Request body:** `{ session_id: string, message: string }`
**Response:** `{ messages: ZappiMessage[], elapsed_ms: number }`

Implementation:
1. `POST /agent_sessions/{session_id}/messages` with `{ content: message }`
2. Poll `GET /agent_sessions/{session_id}/messages` every 2500ms until status === `'awaiting_input'`
3. Return all messages since the request was sent (filter by sender, type, and new message IDs)
4. Max 30 polls (75s timeout) — return `{ error: 'timeout' }` if exceeded
5. **No auto-continuation** — return immediately when `awaiting_input`, let user decide

---

## ZappiChat Component

### State

```typescript
interface ChatMessage {
  id: string           // unique ID for React key
  role: 'user' | 'zappi'
  content: string
  timestamp: number
  elapsed_ms?: number  // only on zappi messages
}

// Component state:
sessionId: string | null        // null until first message sent
messages: ChatMessage[]
inputValue: string
isLoading: boolean              // true while API call in flight
statusText: string              // 'Thinking...' | 'Querying database...' etc.
```

### UI Layout

```
┌─────────────────────────────────────────┐
│ [Orange Zappi logo] Zappi Ad Intelligence│  ← Header
│                           [BASELINE]    │
├─────────────────────────────────────────┤
│                                         │
│  [Zappi bubble] Welcome message...      │
│                                         │
│               [User bubble] My query    │
│                                         │
│  [Zappi bubble] Response...   0.3s      │
│  ● Thinking...                          │  ← Loading state
│                                         │
├─────────────────────────────────────────┤
│ [New Chat]  [textarea]      [Send ▶]    │  ← Input bar
└─────────────────────────────────────────┘
```

### Behaviour

- On mount: show empty state with placeholder prompt
- First message: call `/api/zappi-chat/create` with message → store `session_id` → display user bubble → poll via `/api/zappi-chat/message`... wait, the create route creates the session AND sends the first message. Then we need to poll for the response.

**Revised flow:**
1. User types and submits
2. If no `session_id`: POST `/api/zappi-chat/create` → `{ session_id }`, then POST `/api/zappi-chat/message` with the same message...

Actually cleaner: `/create` just creates session with first message and returns `{ session_id }`. Then the component polls `/api/zappi-chat/message` to get the response to that first message, OR we return the response directly from `/create`.

**Simplest flow:**
- `/api/zappi-chat/create`: POST with `{ message }` → creates session, polls until `awaiting_input`, returns `{ session_id, messages, elapsed_ms }`
- `/api/zappi-chat/message`: POST with `{ session_id, message }` → sends message, polls until `awaiting_input`, returns `{ messages, elapsed_ms }`

This way the component calls one endpoint per turn, regardless of whether it's the first turn or subsequent.

- While loading: show animated "Thinking..." / "Querying database..." status in chat
- On response: append Zappi bubble with content + elapsed time badge
- New Chat button: clears `sessionId`, `messages` (localStorage NOT needed for chat history)
- Scroll to bottom on each new message

### Styling

- Background: `bg-zinc-950`
- User bubbles: `bg-zinc-800`, right-aligned
- Zappi bubbles: `bg-zinc-900`, left-aligned, orange left-border accent
- Send button: orange `#FF6B00` background
- Header: orange accent for title, `BASELINE` badge matching existing Zappi column style
- Input bar: sticky bottom, `bg-zinc-950 border-t border-zinc-800`

---

## Tab Toggle

Location: above TopBar in `page.tsx` layout.

```
[  Arena  ] [  Zappi Chat  ]
```

- Pill-style buttons matching existing mode toggle aesthetic in TopBar
- Active: `bg-zinc-700 text-white`
- Inactive: `text-zinc-400 hover:text-zinc-200`
- State persisted to localStorage key `'ad-intel-arena-tab'`
- Default: `'arena'`

---

## Data Flow

```
User types → submit →
  if first message: POST /api/zappi-chat/create {message}
  else: POST /api/zappi-chat/message {session_id, message}
    → server creates/continues session
    → polls Zappi API until awaiting_input
    → returns { session_id?, messages, elapsed_ms }
  → component appends messages to chat history
  → scroll to bottom
```

---

## Error Handling

- Network errors: show error bubble in chat
- Timeout (30 polls exceeded): show "Zappi timed out" error bubble
- API errors: surface error message in chat

---

## What Does NOT Change

- Arena tab: all existing 4-column functionality untouched
- All existing API routes: untouched
- TopBar, QueryInput, ModelColumn, SummaryBar: untouched
- Types in `lib/types.ts`: no changes needed (ZappiChat has its own local types)
