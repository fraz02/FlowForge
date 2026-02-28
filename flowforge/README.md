# FlowForge — Lightweight Project Management

A vanilla-JS, offline-first Kanban-style project manager with workspaces,
projects, boards and tasks. The app runs entirely in the browser and persists
state locally; no server is required.

## Quick start

1. Open a terminal in the repository root (`/Users/faraazashraf/flowforge`).
2. Start a simple HTTP server so ES modules load correctly:
   ```sh
   python -m http.server 8000
   # or `npx serve`/`php -S localhost:8000` etc.
   ```
3. Open `http://localhost:8000/index.html` in a modern browser.

You can also open `index.html` directly (file://) but some browsers may restrict
module loading or notifications.

## Features

- **Multiple workspaces** with cascade deletion (projects, boards, tasks).
- **Projects inside workspaces**; each project can contain many boards.
- **Boards** initialize with default Kanban columns; users can add/delete
  columns and reorder them via drag & drop.
- **Tasks** support title, description, priority, due date, assignee, tags,
  estimates, activity log and attachments (data model, UI can be extended).
  Tasks may be created, edited inline or via a drawer, moved between columns,
  reordered, and deleted (with confirmation).
- **Filters** and **search** operate simultaneously; updates reflect instantly.
- **Analytics dashboard** shows productivity, overdue counts, and simple
  velocity chart derived from current state.
- **Export/import** entire workspace data as JSON with schema metadata.
- **Dark/light theme toggle** persisted across sessions.
- **Responsive layout** adapts to desktop/tablet/mobile widths.

### Accessibility

- **Keyboard navigation**: Tab through all interactive elements, Enter/Space to
  select workspaces/projects, Escape to close the task drawer.
- **ARIA attributes**: `aria-live` announcements for state changes, `aria-selected`
  for active items, `aria-label` on all buttons and form fields.
- **Focus management**: Skip-to-content link, focus trap in task drawer,
  visible focus indicators.
- **Semantic HTML**: Proper heading hierarchy, list roles, button semantics.
- **Motion preferences**: Respects `prefers-reduced-motion` media query.
- **Screen reader support**: All major actions announced to assistive technologies.

- **Modular codebase** with clean separation of concerns (`/js` modules,
  `/src/components`).
- **Reliable persistence** via versioned `localStorage` wrapper with migration
  support.

## Keyboard Shortcuts

- **Tab**: Navigate through all interactive elements (buttons, inputs, list items).
- **Enter / Space**: Select/activate a workspace, project, or button.
- **Escape**: Close the task details drawer.
- **Alt+1**: Skip to main board content (when focus is in header/nav).


- All UI logic resides in `src/app.js`, with components under `src/components`.
- State mutations are exposed through explicit functions in `js/state.js`.
- Storage logic lives in `js/storage.js`; analytics/filters are factored out
  to their own modules.
- Styles are in `src/styles.css` and UX overrides in `src/ui.css`.

## Next steps

- Continue polishing accessibility (focus management, ARIA alerts, keyboard
  drag/drop).
- Add tests or automated linting if needed.
- Extend task editing UI, integrate real user accounts, or add sync.

```