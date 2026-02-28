import { getState, updateTask, selectTaskById } from '../../js/state.js'
import { logAction } from '../activity.js'

// Announce text to screen readers
function announce(text) {
    const el = document.getElementById('sr-announce')
    if (el) el.textContent = text
}

// Focus trap: keep focus within drawer when open
function trapFocus(el, open) {
    if (!open) return
    const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    const focusables = el.querySelectorAll(focusableSelectors)
    const firstFocus = focusables[0]
    const lastFocus = focusables[focusables.length - 1]
    if (!firstFocus) return
    firstFocus.focus()
    el.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return
        if (e.shiftKey) { if (document.activeElement === firstFocus) { e.preventDefault(); lastFocus.focus() } }
        else { if (document.activeElement === lastFocus) { e.preventDefault(); firstFocus.focus() } }
    })
}

// Mounts drawer in element with id 'drawer' or creates one
export function mountDrawer() {
    const el = document.getElementById('drawer') || createDrawerEl()
    let current = null

    function createDrawerEl() {
        const d = document.createElement('aside')
        d.id = 'drawer'
        d.className = 'ff-drawer'
        document.body.appendChild(d)
        return d
    }

    function render(task) {
        if (!task) { el.innerHTML = ''; el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); current = null; announce('Task drawer closed'); return }
        current = task.id
        el.classList.add('open'); el.setAttribute('aria-hidden', 'false')
        announce(`Editing task: ${task.title}`)
        el.innerHTML = `
      <div class="ff-drawer__header">
        <h3>Task details</h3>
        <div>
          <button id="drawer-close" aria-label="Close task editor">Close</button>
        </div>
      </div>
      <div class="ff-drawer__body">
        <label for="d-title">Title<input id="d-title" value="${escapeHtml(task.title || '')}" aria-label="Task title" /></label>
        <label for="d-desc">Description<textarea id="d-desc" aria-label="Task description">${escapeHtml(task.description || '')}</textarea></label>
        <label for="d-priority">Priority<select id="d-priority" aria-label="Task priority"><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label>
        <label for="d-due">Due Date<input id="d-due" type="date" value="${task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ''}" aria-label="Task due date" /></label>
        <label for="d-assignee">Assignee<input id="d-assignee" value="${escapeHtml(task.assignee || '')}" aria-label="Task assignee" /></label>
        <div style="margin-top:8px"><button id="d-save" aria-label="Save task changes">Save</button></div>
        <div class="ff-activity"><h4>Activity</h4><div id="d-activity" aria-live="polite" aria-label="Task activity log"></div></div>
      </div>`

        // set priority select
        const pr = el.querySelector('#d-priority')
        if (pr) pr.value = task.priority || 'Medium'

        el.querySelector('#drawer-close').addEventListener('click', close)
        el.querySelector('#d-save').addEventListener('click', () => {
            const updated = {
                id: task.id,
                title: el.querySelector('#d-title').value,
                description: el.querySelector('#d-desc').value,
                priority: el.querySelector('#d-priority').value,
                dueDate: el.querySelector('#d-due').value || null,
                assignee: el.querySelector('#d-assignee').value || null
            }
            updateTask(task.id, updated)
            logAction(task.id, 'edited', { field: 'details' })
            announce('Task saved')
            close()
        })

        // render activity
        const act = el.querySelector('#d-activity')
        act.innerHTML = (task.activityLog || []).slice().reverse().map(a => `<div><small>${new Date(a.ts || a.ts).toLocaleString()}</small> ${escapeHtml(a.message || a.type || '')}</div>`).join('')

        // keyboard & focus trap
        trapFocus(el, true)
        el.addEventListener('keydown', (e) => { if (e.key === 'Escape') close() })
    }

    function open(taskId) {
        const task = selectTaskById(taskId)
        if (task) render(task)
    }
    function close() {
        el.classList.remove('open')
        el.setAttribute('aria-hidden', 'true')
        current = null
        announce('Task drawer closed')
    }
    return { open, close, el }
}

function escapeHtml(s = '') { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }
