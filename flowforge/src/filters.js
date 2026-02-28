// Composable filter utilities for FlowForge
// Provides pure functions that return filtered arrays without mutating input

export function applyFilters(tasks, filters) {
    if (!filters) return tasks
    return tasks.filter(t => {
        if (filters.q) { const q = String(filters.q).toLowerCase(); if (!(String(t.title || '').toLowerCase().includes(q) || (t.tags || []).some(tag => String(tag).toLowerCase().includes(q)))) return false }
        if (filters.priority && filters.priority !== t.priority) return false
        if (filters.member && filters.member !== t.assignee) return false
        if (filters.status && filters.status !== t.status) return false
        if (filters.tags && filters.tags.length) { const has = filters.tags.every(tag => (t.tags || []).includes(tag)); if (!has) return false }
        if (filters.due === 'overdue') { if (!t.dueDate || new Date(t.dueDate) >= new Date()) return false }
        if (filters.due === 'today') { const d = new Date(); const td = new Date(t.dueDate); if (!t.dueDate || td.toDateString() !== d.toDateString()) return false }
        return true
    })
}
