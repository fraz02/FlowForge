import { getState, importState } from '../js/state.js'

// Export a workspace and its related projects/boards/tasks as JSON
export function exportWorkspace(workspaceId) {
    const state = getState()
    const ws = state.workspaces.find(w => w.id === workspaceId)
    if (!ws) throw new Error('workspace not found')
    const projects = state.projects.filter(p => ws.projects.includes(p.id))
    const boards = state.boards.filter(b => projects.some(p => (p.boards || []).includes(b.id)))
    const tasks = state.tasks.filter(t => boards.some(b => b.id === t.status || (b.columns || []).some(c => c.id === t.status)))
    const payload = { schema: 1, exportedAt: Date.now(), workspace: ws, projects, boards, tasks }
    return JSON.stringify(payload, null, 2)
}

// Import workspace JSON payload (string or object). Returns parsed object on success.
export function importWorkspace(json, opts = { overwrite: false }) {
    let data = typeof json === 'string' ? JSON.parse(json) : json
    if (!data || !data.workspace) throw new Error('invalid import')
    // basic validation
    if (!data.workspace.id || !data.workspace.name) throw new Error('workspace missing id/name')

    if (!opts.overwrite) {
        // merge into existing state by dispatching IMPORT (UI should confirm)
        const state = getState()
        const newState = Object.assign({}, state, {
            workspaces: [...state.workspaces, data.workspace],
            projects: [...state.projects, ...(data.projects || [])],
            boards: [...state.boards, ...(data.boards || [])],
            tasks: [...state.tasks, ...(data.tasks || [])]
        })
        importState(newState)
        return newState
    } else {
        // overwrite entire state
        importState(Object.assign({}, data), { overwrite: true })
        return data
    }
}
