import { addActivity } from '../js/state.js'

// Helper to append human-readable activity entries to a task
export function logAction(taskId, type, details) {
    const ts = Date.now()
    let message = ''
    switch (type) {
        case 'created': message = `Task created`; break
        case 'edited': message = `Task edited: ${details && details.field ? details.field : 'updated'}`; break
        case 'moved': message = `Moved to ${details && details.toName ? details.toName : details && details.toColumnId || 'unknown'}`; break
        case 'priority': message = `Priority changed to ${details && details.priority}`; break
        case 'time_tracked': message = `Tracked ${details && details.seconds} seconds`; break
        default: message = details && details.message ? details.message : type
    }

    addActivity(taskId, { type, message, ts })
}
