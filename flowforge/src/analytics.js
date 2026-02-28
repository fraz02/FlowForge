// Lightweight analytics module for FlowForge
// - Offline-first: stores events in localStorage
// - Minimal, non-blocking writes (uses requestIdleCallback fallback)
// - Aggregates on read to compute metrics

const STORAGE_KEY = 'flowforge_analytics_v1'
const MAX_EVENTS = 5000
const sessionStart = Date.now()

function now() { return Date.now() }

function readEvents() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch (e) { console.warn('analytics read error', e); return [] }
}

function writeEvents(events) {
    const toSave = events.slice(-MAX_EVENTS)
    const saveFn = () => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave)) } catch (e) { console.warn('analytics save failed', e) }
    }
    if ('requestIdleCallback' in window) requestIdleCallback(saveFn, { timeout: 1000 })
    else setTimeout(saveFn, 0)
}

export function trackEvent(type, meta) {
    try {
        const ev = { type, ts: now(), meta: sanitizeMeta(meta) }
        const events = readEvents()
        events.push(ev)
        writeEvents(events)
    } catch (e) { /* never block UI */ }
}

function sanitizeMeta(m) {
    if (!m) return {}
    // drop any potential PII keys (simple safeguard)
    const copy = {}
    for (const k in m) { if (/name|email|phone|token|password/i.test(k)) continue; const v = m[k]; if (typeof v === 'string' && v.length > 200) copy[k] = v.slice(0, 200); else copy[k] = v }
    return copy
}

// Aggregation helpers
export function getAllEvents() { return readEvents() }

export function getSessionMetrics() {
    const events = readEvents().filter(e => e.ts >= sessionStart)
    return aggregate(events)
}

export function getDailyMetrics(days = 7) {
    const events = readEvents()
    const cutoff = now() - days * 24 * 60 * 60 * 1000
    const slice = events.filter(e => e.ts >= cutoff)
    // group by local date
    const byDate = {}
    for (const e of slice) {
        const d = new Date(e.ts).toISOString().slice(0, 10)
        byDate[d] = byDate[d] || []
        byDate[d].push(e)
    }
    const out = {}
    for (const d in byDate) out[d] = aggregate(byDate[d])
    return out
}

export function getProjectMetrics(projectId) {
    const events = readEvents().filter(e => e.meta && (e.meta.projectId === projectId || e.meta.boardId === projectId))
    return aggregate(events)
}

function aggregate(events) {
    const summary = { totalEvents: events.length }
    for (const e of events) {
        summary[e.type] = (summary[e.type] || 0) + 1
    }

    // Derived metrics: tasks_created, tasks_deleted, task_moved, dnd_count
    summary.tasksCreatedPerSession = summary['task_created'] || 0
    summary.tasksCompleted = summary['task_completed'] || 0
    summary.dragAndDrop = summary['task_moved'] || 0
    summary.filterUsage = summary['filter_set'] || 0
    summary.exports = summary['data_export'] || 0
    return summary
}

// velocity: tasks completed per day over last N days
export function getCompletionVelocity(days = 14) {
    const events = readEvents().filter(e => e.type === 'task_completed')
    const nowTs = now()
    const perDay = Array.from({ length: days }, () => 0)
    for (const e of events) {
        const daysAgo = Math.floor((nowTs - e.ts) / (24 * 60 * 60 * 1000))
        if (daysAgo >= 0 && daysAgo < days) perDay[days - 1 - daysAgo]++
    }
    return perDay
}

// small helper used by UI to export analytics as JSON
export function exportAnalytics() { return JSON.stringify(readEvents()) }
