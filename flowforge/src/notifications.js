import { getState } from '../js/state.js'

const PREF_KEY = 'flowforge_notify_enabled_v1'

export function notificationsEnabled() { try { return JSON.parse(localStorage.getItem(PREF_KEY)) !== false } catch (e) { return true } }
export function setNotificationsEnabled(v) { try { localStorage.setItem(PREF_KEY, JSON.stringify(!!v)) } catch (e) { } }

// Return list of notifications (non-blocking). Does not mutate state.
export function checkNotifications() {
    const state = getState()
    if (!notificationsEnabled()) return []
    const now = Date.now()
    const out = []
    for (const t of state.tasks) {
        if (t.dueDate) {
            const due = new Date(t.dueDate).getTime()
            const msDay = 24 * 60 * 60 * 1000
            if (due < now && !(t._notifiedOverdue)) out.push({ type: 'overdue', taskId: t.id, title: t.title, due: t.dueDate })
            else if (due >= now && due < now + (msDay) && !(t._notifiedDueSoon)) out.push({ type: 'due_soon', taskId: t.id, title: t.title, due: t.dueDate })
        }
    }
    return out
}

// optional: try to show a browser notification (permission-based)
export function notifyBrowser(n) {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') new Notification(n.title || 'FlowForge', { body: n.type })
    else if (Notification.permission !== 'denied') Notification.requestPermission().then(p => { if (p === 'granted') new Notification(n.title || 'FlowForge', { body: n.type }) })
}
