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

There are **no tests**. No `test` script exists. Do not add test commands or frameworks unless explicitly requested.

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

- **All `app/*/page.jsx`** are async Server Components. They fetch data with `await Promise.all([...])` and pass it as props to the Client component. They export `export const dynamic = 'force-dynamic'`.
- **All `*Client.jsx`** files start with `'use client'` and own all interactivity.
- **`AppLayout`** is a Client Component because it uses `usePathname()`.
- After a mutation, refresh server data with `useTransition` + `router.refresh()` — do not manage server data in client state manually.

---

## File & Folder Naming

| Location | Convention | Example |
|---|---|---|
| App route folders | `kebab-case` | `schedule-assignments/`, `[id]/` |
| Page files | `page.jsx` (fixed) | `app/horarios/page.jsx` |
| Client components | `PascalCase.jsx` | `HorariosClient.jsx`, `ScheduleEditor.jsx` |
| API route files | `route.js` (fixed) | `app/api/teachers/route.js` |
| Lib/utility files | `camelCase.js` | `db.js`, `schedule-utils.js` |
| Component folders | lowercase, feature-based | `schedule/`, `teachers/`, `ui/` |

---

## Code Style

### General
- **2-space indentation**. No tabs.
- **Single quotes** for all JS/JSX strings.
- **No trailing commas** in most files — follow the surrounding style.
- Semicolons are **omitted** in component files; present in some API routes — match the file you are editing.
- No Prettier config exists. Format is by convention, not enforcement.

### Imports
Order imports as follows (no blank lines between groups unless already present in the file):
1. `'use client'` directive (if applicable)
2. React / Next.js framework (`react`, `next/*`)
3. Third-party libraries (`@dnd-kit/*`, `recharts`, etc.)
4. Internal components (absolute `@/components/...` or relative `../`)
5. Internal utilities / lib (`@/lib/...`)

### React Components
- Always use **default exports** for components.
- **PascalCase** for component names and their files.
- Handler functions use the `handle` prefix: `handleSave`, `handleDragStart`, `handleExportPDF`.
- Boolean state variables: `isDragging`, `isOver`, `isBlocked`, `isFull`, `isPrincipal`.
- Sub-components used only within one file are defined above the main export in the same file.

### Tailwind & Styling
- Use **Tailwind utility classes** for all static styling.
- Use **inline `style={{}}`** only for values that are dynamic at runtime:
  - Colors from database (e.g., `style={{ backgroundColor: teacher.color }}`)
  - Progress bar widths (e.g., `style={{ width: `${pct}%` }}`)
  - Portal positioning (e.g., `style={{ top: pos.top, left: pos.left, zIndex: 99999 }}`)
- Conditional classes use **template literals with ternary expressions** — do not introduce `clsx` or `cn()`:
  ```jsx
  className={`base-classes ${isActive ? 'bg-primary text-white' : 'bg-white text-text-muted'}`}
  ```
- Design tokens (colors, shadows, radii) are defined in `app/globals.css` under `@theme {}` and available as Tailwind utilities: `text-primary`, `bg-secondary`, `border-border-std`, `shadow-card`, etc.

### State Management
- Local `useState` only. No external state libraries.
- For optimistic list updates follow this pattern:
  ```js
  setItems(prev => prev.map(t => t.id === saved.id ? saved : t))  // update
  setItems(prev => [...prev, newItem])                             // add
  setItems(prev => prev.filter(t => t.id !== id))                 // delete
  ```
- After any DB mutation that needs to reflect in Server Components: `startTransition(() => router.refresh())`.

---

## Database & API Routes

### Query Pattern
Always use the `query()` helper from `@/lib/db`. Use PostgreSQL positional placeholders (`$1`, `$2`):
```js
import { query } from '@/lib/db'
const result = await query('SELECT * FROM subjects WHERE id = $1', [id])
```

### Common SQL Patterns
- Aggregate related rows in a single query with `JSON_AGG(DISTINCT JSONB_BUILD_OBJECT(...)) FILTER (WHERE ... IS NOT NULL)` — see `app/horarios/page.jsx` for the canonical example.
- Use `ON CONFLICT (...) DO UPDATE SET ...` for upserts.
- Use `RETURNING *` on all INSERT/UPDATE.
- Cast `COUNT()` to int with `::int`.
- For atomic multi-statement operations use explicit `BEGIN`/`COMMIT`/`ROLLBACK`:
  ```js
  await query('BEGIN')
  try { /* ...work... */ ; await query('COMMIT') }
  catch (err) { await query('ROLLBACK'); throw err }
  ```

### API Route Structure
```js
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request) {
  try {
    // ...
    return NextResponse.json(result.rows)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```
- Always wrap the entire handler body in `try/catch`.
- Check for PostgreSQL unique-violation error code `'23505'` and return `409` where relevant.
- Dynamic route params: `const { id } = await params` (async params, Next.js 15+ pattern).

---

## Error Handling

- **Server Components (`getData`)**: wrap in `try/catch`, return `{ error: true }` on failure (anonymous catch — do not expose internal error messages to the client).
- **Client Components**: check `if (error || slots.length === 0)` and render a fallback UI with an "Inicializar Base de Datos" button.
- **Toasts**: use local `toast` state `{ msg, isError }` auto-cleared with `setTimeout(..., 3500)`.
- **Quick fallback**: `alert(err.message)` is acceptable for low-frequency error paths (e.g., "set as principal" failure).
- Never swallow errors silently in API routes — always return a JSON `{ error }` body with an appropriate HTTP status.

---

## Portals & z-index

When a component is inside a container with `overflow: hidden` or a stacking context, render it via `createPortal(..., document.body)`. Calculate position with `buttonRef.current.getBoundingClientRect()` and apply `position: fixed` with `zIndex: 99999`. Guard with `typeof document !== 'undefined'`.

---

## Do Not
- Do not add TypeScript, Zod, or type annotations.
- Do not introduce `clsx`, `cn()`, or `twMerge`.
- Do not add a test framework or test files.
- Do not use `.then()/.catch()` chains — always use `async/await`.
- Do not use `cd <dir> && <cmd>` — use the `workdir` parameter instead.
- Do not create `README.md` or documentation files unless explicitly requested.
