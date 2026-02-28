import { getState, subscribe } from '../../js/state.js'
import { getCompletionVelocity } from '../../js/analytics.js'

// Lightweight DOM-based analytics UI. Keeps rendering cheap and memoizable.
export function renderAnalytics(root) {
    const state = getState()
    const total = state.tasks.length
    const completed = state.tasks.filter(t => {
        const col = state.boards.flatMap(b => b.columns).find(c => c.id === t.status)
        return col && /done/i.test(col.name)
    }).length
    const overdue = state.tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length
    const productivity = total ? Math.round((completed / total) * 100) : 0

    // tasks per priority
    const byPriority = state.tasks.reduce((acc, t) => { acc[t.priority || 'Unknown'] = (acc[t.priority || 'Unknown'] || 0) + 1; return acc }, {})
    // tasks per assignee
    const byMember = state.tasks.reduce((acc, t) => { const m = t.assignee || 'Unassigned'; acc[m] = (acc[m] || 0) + 1; return acc }, {})

    root.innerHTML = ''
    const frag = document.createDocumentFragment()
    const addCard = (html) => { const d = document.createElement('div'); d.className = 'ff-analytics-card'; d.innerHTML = html; frag.appendChild(d) }
    addCard(`Total tasks: <strong>${total}</strong>`)
    addCard(`Completed: <strong>${completed}</strong>`)
    addCard(`Overdue: <strong>${overdue}</strong>`)
    addCard(`Productivity: <strong>${productivity}%</strong>`)

    const pCard = document.createElement('div'); pCard.className = 'ff-analytics-card'
    pCard.innerHTML = `<strong>By Priority</strong><div>${Object.entries(byPriority).map(([k, v]) => `<div>${k}: ${v}</div>`).join('')}</div>`
    frag.appendChild(pCard)

    const mCard = document.createElement('div'); mCard.className = 'ff-analytics-card'
    mCard.innerHTML = `<strong>By Member</strong><div>${Object.entries(byMember).map(([k, v]) => `<div>${k}: ${v}</div>`).join('')}</div>`
    frag.appendChild(mCard)

    // completion velocity chart (small sparkline canvas)
    const vel = getCompletionVelocity(14)
    const canvasCard = document.createElement('div'); canvasCard.className = 'ff-analytics-card'
    const canvas = document.createElement('canvas'); canvas.width = 280; canvas.height = 60
    canvasCard.appendChild(document.createElement('strong')).textContent = 'Completion velocity (14 days)'
    canvasCard.appendChild(canvas)
    frag.appendChild(canvasCard)

    root.appendChild(frag)

    // draw simple bars
    try {
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const max = Math.max(1, ...vel)
        const barW = canvas.width / vel.length
        for (let i = 0; i < vel.length; i++) {
            const h = Math.round((vel[i] / max) * (canvas.height - 10))
            ctx.fillStyle = '#06b6d4'
            ctx.fillRect(i * barW + 2, canvas.height - h - 4, barW - 4, h)
        }
    } catch (e) { /* canvas may not be available in some environments */ }
}

export function mountAnalytics(root) { renderAnalytics(root); return subscribe(() => renderAnalytics(root)) }
