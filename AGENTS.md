# AGENTS.md — Colegio Lamatepec · Sistema de Gestión Académica

Guidelines for AI coding agents working in this repository.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.6 (App Router) |
| UI | React 19.2.3 |
| Language | JavaScript only (`.jsx` / `.js`) — **no TypeScript** |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"` in CSS, `@theme {}` for tokens) |
| Database | PostgreSQL via `@neondatabase/serverless` — raw SQL, no ORM |
| Drag & Drop | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/modifiers` |
| State | Local `useState` only — no Redux, Zustand, or Context API |

---

## Commands

```bash
npm run dev        # Start dev server (Next.js + Turbopack)
npm run build      # Production build
npm run start      # Start production server
npm run lint       # ESLint (flat config, eslint-config-next/core-web-vitals)
npm run db:setup   # Create and seed PostgreSQL schema (requires DATABASE_URL in .env.local)
```

There are **no tests**. No `test` script exists. Do not add test commands or frameworks.

---

## Project Structure

```
app/
  layout.jsx                  ← Root HTML shell (Server Component)
  <route>/
    page.jsx                  ← Async Server Component: fetches DB data, passes as props
    <RouteNameInSpanish>Client.jsx  ← 'use client': owns all UI state and interactivity
  api/<resource>/
    route.js                  ← Route Handler (GET, POST, PUT, DELETE)
    [id]/route.js             ← Dynamic route handler
components/
  layout/                     ← AppLayout (nav shell)
  schedule/                   ← ScheduleEditor, ScheduleGrid, ScheduleCell, etc.
  teachers/                   ← SidebarTeachers, TeacherCard, TeacherModal, etc.
  dashboard/                  ← StatCard, WorkloadChart
  ui/                         ← Shared generic UI (ConfirmModal)
lib/
  db.js                       ← Neon PostgreSQL pool singleton + query()
  schedule-utils.js           ← Shared constants, color map, checkConflicts(), getInitials()
scripts/
  setup-db.js                 ← Node.js DDL + seed script
```

---

## Server vs Client Components

- **All `app/*/page.jsx`** are async Server Components. They fetch data with `await Promise.all([...])` and pass as props to Client component. Export `export const dynamic = 'force-dynamic'`.
- **All `*Client.jsx`** files start with `'use client'` and own all interactivity.
- After a mutation, refresh server data with `useTransition` + `router.refresh()`.

---

## File & Folder Naming

| Location | Convention | Example |
|---|---|---|
| App route folders | `kebab-case` | `schedule-assignments/`, `[id]/` |
| Page files | `page.jsx` | `app/horarios/page.jsx` |
| Client components | `PascalCase.jsx` | `HorariosClient.jsx`, `ScheduleEditor.jsx` |
| API route files | `route.js` | `app/api/teachers/route.js` |
| Lib/utility files | `camelCase.js` | `db.js`, `schedule-utils.js` |
| Component folders | lowercase | `schedule/`, `teachers/`, `ui/` |

---

## Code Style

- **2-space indentation**. No tabs. **Single quotes** for all strings.
- **No trailing commas**. Semicolons omitted in components; present in API routes — match the file.
- No Prettier config. Format by convention.

### Imports Order
1. `'use client'` directive
2. React / Next.js (`react`, `next/*`)
3. Third-party (`@dnd-kit/*`, `recharts`, etc.)
4. Internal components (`@/components/...` or relative)
5. Internal utilities (`@/lib/...`)

### React Components
- Default exports. PascalCase names. Handler prefix `handle`.
- Boolean state: `isDragging`, `isOver`, `isBlocked`, `isFull`, `isPrincipal`.
- Sub-components defined above main export in same file.

### Tailwind & Styling
- Tailwind utilities for static styling. Inline `style={{}}` only for dynamic values (colors, widths, portal positioning).
- Conditional classes use template literals with ternary — no `clsx` or `cn()`:
  ```jsx
  className={`base-classes ${isActive ? 'bg-primary text-white' : 'bg-white'}`}
  ```
- Design tokens: `text-primary`, `bg-secondary`, `border-border-std`, `shadow-card`.

### State Management
- Local `useState` only. Optimistic updates:
  ```js
  setItems(prev => prev.map(t => t.id === saved.id ? saved : t))
  setItems(prev => [...prev, newItem])
  setItems(prev => prev.filter(t => t.id !== id))
  ```

---

## Database & API Routes

### Query Pattern
```js
import { query } from '@/lib/db'
const result = await query('SELECT * FROM subjects WHERE id = $1', [id])
```

### SQL Patterns
- Aggregate with `JSON_AGG(DISTINCT JSONB_BUILD_OBJECT(...)) FILTER (WHERE ... IS NOT NULL)`.
- Upserts: `ON CONFLICT (...) DO UPDATE SET ...`. Use `RETURNING *`. Cast `COUNT()` to `::int`.
- Atomic ops: `BEGIN`/`COMMIT`/`ROLLBACK`.

### API Route Structure
```js
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request) {
  try {
    return NextResponse.json(result.rows)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```
- Always `try/catch`. Check for `'23505'` (unique violation) → return `409`.
- Dynamic params: `const { id } = await params` (Next.js 15+ async pattern).

---

## Error Handling

- **Server Components**: `try/catch`, return `{ error: true }` (no internal messages to client).
- **Client Components**: check `if (error || slots.length === 0)` → render fallback with "Inicializar Base de Datos" button.
- **Toasts**: local `{ msg, isError }` with `setTimeout(..., 3500)`. `alert(err.message)` for low-frequency errors.
- **API routes**: never swallow errors — always return `{ error }` with appropriate status.

---

## Portals & z-index

Use `createPortal(..., document.body)` for components in `overflow: hidden` containers. Calculate position with `getBoundingClientRect()` → `position: fixed` with `zIndex: 99999`. Guard: `typeof document !== 'undefined'`.

---

## Do Not

- Do not add TypeScript, Zod, or type annotations.
- Do not introduce `clsx`, `cn()`, or `twMerge`.
- Do not add tests or test frameworks.
- Do not use `.then()/.catch()` — use `async/await`.
- Do not use `cd <dir> && <cmd>` — use `workdir` parameter.
- Do not create `README.md` unless explicitly requested.
