# Flowspace ⚡

Real-time team task management. Create workspaces, invite your team, manage tasks on a Kanban board — every update appears instantly for all connected members via WebSockets.

> Built by **John Ayomide Abe** · [LinkedIn](https://www.linkedin.com/in/john-abe-601247236/) · [Email](mailto:Johnabe410@gmail.com)

---

## Tech Stack

**Backend**
- Node.js + Express
- PostgreSQL (pg)
- WebSockets (ws) — real-time event broadcasting
- JWT authentication
- Zod validation
- Docker + Docker Compose

**Frontend**
- React 18 + Vite
- Zustand (state management)
- React Router v6
- CSS Modules
- Native HTML5 Drag & Drop API

---

## Features

### Real-time Collaboration
Every task action — create, update, delete, comment — is broadcast instantly to all workspace members via WebSocket. No polling, no refresh.

```
Client A moves task → Server broadcasts → Client B sees it in <50ms
```

### WebSocket Events
| Event | Trigger |
|-------|---------|
| `TASK_CREATED` | New task added to workspace |
| `TASK_UPDATED` | Task status, priority or assignee changed |
| `TASK_DELETED` | Task removed |
| `COMMENT_ADDED` | New comment on a task |
| `USER_JOINED` | Member connects to workspace |
| `USER_LEFT` | Member disconnects |
| `TASK_EDITING` | Member is actively editing a task |

### Task State Machine
```
TODO ⟷ IN_PROGRESS ⟷ IN_REVIEW ⟷ DONE
```
Any status can transition to any other — flexible enough for real team workflows.

### Workspaces
- Create multiple workspaces
- Invite members by email
- Role-based permissions (OWNER / ADMIN / MEMBER)
- Online presence indicator — see who's active in real time

### Kanban Board
- Drag & drop cards between columns
- Optimistic UI updates — card moves instantly, syncs in background
- Priority badges (LOW / MEDIUM / HIGH / URGENT)
- Assignee avatars, due dates
- Mobile responsive — stacks to single column on small screens

### Task Detail
- Edit title, description, status, priority, assignee, due date
- Comment thread per task
- Delete with permission check (creator or admin only)

---

## Running Locally

### Prerequisites
- Node.js 18+
- Docker + Docker Compose

### 1. Clone and install

```bash
git clone https://github.com/ablejohn/flowspace.git
cd flowspace/backend
npm install
```

### 2. Start PostgreSQL

```bash
docker-compose up db -d
```

### 3. Environment variables

```bash
# backend/.env
PORT=4000
DATABASE_URL=postgresql://flowspace:flowspace@localhost:5433/flowspace
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

### 4. Start the API

```bash
cd backend
npm run dev
```

API runs on **http://localhost:4000**
WebSocket server on **ws://localhost:4000/ws**

### 5. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:5173**

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Login, get JWT |
| GET  | `/api/v1/auth/me` | Get current user |

### Workspaces
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/workspaces` | Create workspace |
| GET  | `/api/v1/workspaces` | List my workspaces |
| GET  | `/api/v1/workspaces/:id` | Get workspace + members |
| POST | `/api/v1/workspaces/:id/invite` | Invite member by email |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/v1/tasks?workspaceId=` | List tasks (filter by status/priority/assignee) |
| POST   | `/api/v1/tasks?workspaceId=` | Create task |
| PATCH  | `/api/v1/tasks/:id?workspaceId=` | Update task |
| DELETE | `/api/v1/tasks/:id?workspaceId=` | Delete task |
| GET    | `/api/v1/tasks/:id/comments?workspaceId=` | Get comments |
| POST   | `/api/v1/tasks/:id/comments?workspaceId=` | Add comment |

---

## WebSocket Connection

```javascript
const ws = new WebSocket(
  `ws://localhost:4000/ws?token=${jwt}&workspaceId=${id}`
)

ws.onmessage = (e) => {
  const { type, payload } = JSON.parse(e.data)
  // handle TASK_CREATED, TASK_UPDATED, etc.
}
```

Authentication happens at connection time via JWT query param. Invalid tokens are rejected immediately.

---

## Demo Credentials

```
Email:    john@flowspace.io
Password: Password123!
```

---

## Project Structure

```
flowspace/
├── backend/
│   └── src/
│       ├── config/
│       │   ├── database.js    # PostgreSQL pool + auto-migration
│       │   ├── jwt.js         # Sign/verify tokens
│       │   └── websocket.js   # WS server + room management
│       ├── modules/
│       │   ├── auth/          # Register, login
│       │   ├── workspaces/    # Workspace CRUD + invite
│       │   └── tasks/         # Task CRUD + comments + broadcasts
│       └── shared/
│           └── middleware/    # Auth guard, error handler
├── frontend/
│   └── src/
│       ├── components/        # TaskCard, TaskModal
│       ├── hooks/             # useWebSocket
│       ├── pages/             # Login, Register, Dashboard, Workspace
│       ├── store/             # Zustand auth store
│       └── lib/               # Axios API client
└── docker-compose.yml
```

---

## Architecture Decisions

- **WebSocket rooms** — `Map<workspaceId, Set<WebSocket>>` keeps broadcast O(members) not O(all connections)
- **JWT at WS handshake** — stateless auth, no session store needed
- **Optimistic UI** — drag & drop updates local state before API confirms, reverts on failure
- **Auto-migration** — schema created on server start, no migration files needed for dev
- **Module structure** — each feature owns its router, service and queries

---

*Portfolio project — part of a series showcasing backend engineering*