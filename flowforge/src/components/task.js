export function renderTask(task) {
    const el = document.createElement('article')
    el.className = 'ff-task'
    el.setAttribute('draggable', 'true')
    el.setAttribute('role', 'listitem')
    el.dataset.id = task.id

    el.innerHTML = `
    <div class="ff-task__title">${escapeHtml(task.title || 'Untitled')}</div>
    <div class="ff-task__meta">${task.priority || ''} ${task.due ? '<span class="ff-task__due">• ' + new Date(task.due).toLocaleDateString() + '</span>' : ''}</div>
    <div class="ff-task__controls">
      <button data-action="edit">Edit</button>
      <button data-action="delete">Delete</button>
    </div>`

    el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/task-id', task.id)
        e.dataTransfer.effectAllowed = 'move'
    })

    el.addEventListener('click', (e) => {
        const action = e.target.dataset.action
        if (action) el.dispatchEvent(new CustomEvent('task-action', { detail: { id: task.id, action }, bubbles: true }))
    })
    return el
}

function escapeHtml(s = '') { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }
