import { renderTask } from './task.js'
import { getState, subscribe, moveTask, deleteTask, updateTask } from '../../js/state.js'
import { applyFilters } from '../../js/filters.js'

export function renderColumn(boardId, column) {
    const wrap = document.createElement('section')
    wrap.className = 'ff-column'
    wrap.dataset.colId = column.id
    wrap.setAttribute('role', 'region')
    wrap.innerHTML = `<h3 class="ff-column__title">${escapeHtml(column.name)} <span class="ff-col-count"></span></h3>
    <div class="ff-column__list" data-col-list></div>`

    const list = wrap.querySelector('[data-col-list]')

    // handle drops: compute insertion index to support reordering
    list.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' })
    list.addEventListener('drop', (e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/task-id')
        if (!id) return

        // compute index by comparing mouse Y to child midpoints
        const children = Array.from(list.children)
        let insertIndex = children.length
        for (let i = 0; i < children.length; i++) {
            const rect = children[i].getBoundingClientRect()
            const midpoint = rect.top + rect.height / 2
            if (e.clientY < midpoint) { insertIndex = i; break }
        }

        moveTask(id, column.id, insertIndex)
    })

    // delegate task actions
    wrap.addEventListener('task-action', (ev) => {
        const { id, action } = ev.detail
        if (action === 'delete') {
            if (confirm('Delete this task?')) deleteTask(id)
        }
        if (action === 'edit') showSimpleEditor(id)
    })

    function render() {
        list.innerHTML = ''
        const state = getState()
        const filtered = applyFilters(state.tasks, state.filters)
        const tasks = filtered.filter(t => t.status === column.id)
            .sort((a, b) => (a.position || 0) - (b.position || 0) || a.createdDate - b.createdDate)
        for (const t of tasks) { list.appendChild(renderTask(t)) }
        wrap.querySelector('.ff-col-count').textContent = `(${tasks.length})`
    }

    const unsub = subscribe(render)
    render()
    wrap.cleanup = () => unsub()
    return wrap
}

function showSimpleEditor(id) {
    const t = getState().tasks.find(x => x.id === id)
    if (!t) return
    const title = prompt('Edit task title', t.title)
    if (title !== null) updateTask(id, { title })
}

function escapeHtml(s = '') { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }
