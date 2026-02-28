import { loadState, saveState, defaultState } from './storage.js'
import { generateId } from './utils.js'
import { trackEvent } from './analytics.js'

let state = loadState()
const listeners = new Set()

function notify() { for (const l of listeners) l(state) }

function mutate(fn) { state = fn(state); saveState(state); notify(); }

export function getState() { return state }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) } export function selectTaskById(id) { return state.tasks.find(t => t.id === id) }
// Workspace functions
export function createWorkspace(name) {
    const id = generateId('w')
    mutate(s => ({ ...s, workspaces: [...s.workspaces, { id, name, projects: [] }] }))
    trackEvent('workspace_created', { workspaceId: id })
    return id
}
export function deleteWorkspace(id) {
    mutate(s => {
        const toRemove = new Set((s.workspaces.find(w => w.id === id) || { projects: [] }).projects)
        const projects = s.projects.filter(p => !toRemove.has(p.id))
        const boardsToRm = new Set(projects.flatMap(p => p.boards || []))
        const boards = s.boards.filter(b => !boardsToRm.has(b.id))
        const tasks = s.tasks.filter(t => !boardsToRm.has(t.status))
        return { ...s, workspaces: s.workspaces.filter(w => w.id !== id), projects, boards, tasks }
    })
    trackEvent('workspace_deleted', { workspaceId: id })
}

export function createProject(workspaceId, name) {
    const id = generateId('p')
    mutate(s => ({
        ...s,
        projects: [...s.projects, { id, name, boards: [] }],
        workspaces: s.workspaces.map(w => w.id === workspaceId ? { ...w, projects: [...w.projects, id] } : w)
    }))
    trackEvent('project_created', { projectId: id, workspaceId })
    return id
}
export function deleteProject(id) {
    mutate(s => {
        const proj = s.projects.find(p => p.id === id)
        const boardsToRm = new Set((proj && proj.boards) || [])
        return {
            ...s,
            projects: s.projects.filter(p => p.id !== id),
            workspaces: s.workspaces.map(w => ({ ...w, projects: w.projects.filter(pid => pid !== id) })),
            boards: s.boards.filter(b => !boardsToRm.has(b.id)),
            tasks: s.tasks.filter(t => !boardsToRm.has(t.status))
        }
    })
    trackEvent('project_deleted', { projectId: id })
}

export function createBoard(projectId, name, columns) {
    const id = generateId('b')
    const defaultCols = columns || [{ id: generateId('col'), name: 'To Do' }, { id: generateId('col'), name: 'In Progress' }, { id: generateId('col'), name: 'Review' }, { id: generateId('col'), name: 'Done' }]
    mutate(s => ({
        ...s,
        boards: [...s.boards, { id, name, columns: defaultCols }],
        projects: s.projects.map(p => p.id === projectId ? { ...p, boards: [...p.boards, id] } : p)
    }))
    trackEvent('board_created', { boardId: id, projectId })
    return id
}
export function deleteBoard(id) {
    mutate(s => {
        const board = s.boards.find(b => b.id === id) || { columns: [] }
        const colIds = new Set(board.columns.map(c => c.id))
        return {
            ...s,
            boards: s.boards.filter(b => b.id !== id),
            projects: s.projects.map(p => ({ ...p, boards: p.boards.filter(bid => bid !== id) })),
            tasks: s.tasks.filter(t => !colIds.has(t.status))
        }
    })
    trackEvent('board_deleted', { boardId: id })
}

// Column helpers
export function addColumn(boardId, name) {
    const col = { id: generateId('col'), name }
    mutate(s => ({
        ...s,
        boards: s.boards.map(b => b.id === boardId ? { ...b, columns: [...b.columns, col] } : b)
    }))
    trackEvent('column_added', { boardId, columnId: col.id })
}
export function reorderColumns(boardId, order) {
    mutate(s => ({
        ...s,
        boards: s.boards.map(b => b.id === boardId ? { ...b, columns: order } : b)
    }))
    trackEvent('columns_reordered', { boardId })
}

// Task operations
export function createTask(data) {
    const id = generateId('t')
    mutate(s => {
        const colTasks = s.tasks.filter(t => t.status === data.columnId || data.status)
        const maxPos = colTasks.reduce((m, t) => (t.position || 0) > m ? t.position : m, 0)
        const task = { ...data, id, createdDate: Date.now(), position: (data.position != null ? data.position : maxPos + 1) }
        return { ...s, tasks: [...s.tasks, task] }
    })
    trackEvent('task_created', { taskId: id, columnId: data.columnId || data.status })
    return id
}
export function updateTask(id, changes) {
    mutate(s => ({
        ...s,
        tasks: s.tasks.map(t => t.id === id ? { ...t, ...changes } : t)
    }))
    trackEvent('task_updated', { taskId: id })
}
export function deleteTask(id) {
    mutate(s => ({ ...s, tasks: s.tasks.filter(t => t.id !== id) }))
    trackEvent('task_deleted', { taskId: id })
}
export function moveTask(id, toColumnId, toIndex = null) {
    const stateCopy = state // local reference
    const task = stateCopy.tasks.find(t => t.id === id)
    if (!task) return
    mutate(s => {
        // replicate earlier move logic
        const from = task.status
        const src = s.tasks.filter(t => t.status === from && t.id !== id).sort((a, b) => (a.position || 0) - (b.position || 0))
        const dst = s.tasks.filter(t => t.status === toColumnId && t.id !== id).sort((a, b) => (a.position || 0) - (b.position || 0))
        const insert = (toIndex == null ? dst.length : Math.max(0, Math.min(toIndex, dst.length)))
        const newDst = dst.slice(0, insert).concat([{ ...task, status: toColumnId }]).concat(dst.slice(insert))
        const updDst = newDst.map((t, i) => ({ ...t, position: i + 1 }))
        const updSrc = src.map((t, i) => ({ ...t, position: i + 1 }))
        const others = s.tasks.filter(t => t.id !== id && t.status !== from && t.status !== toColumnId)
        return { ...s, tasks: [...others, ...updSrc, ...updDst] }
    })
    trackEvent('task_moved', { taskId: id, fromColumnId: task.status, toColumnId, toIndex })
}

// additional helpers
export function addActivity(taskId, entry) {
    mutate(s => ({
        ...s,
        tasks: s.tasks.map(t => t.id === taskId ? { ...t, activityLog: [...(t.activityLog || []), entry] } : t)
    }))
    trackEvent('activity_added', { taskId, action: entry && entry.type })
}

export function setFilter(payload) {
    mutate(s => ({ ...s, filters: Object.assign({}, s.filters, payload) }))
    trackEvent('filter_set', payload)
}

// external import helper used by export/import routines
export function importState(newState, { overwrite = false } = {}) {
    // if overwrite is requested we simply replace the entire state
    // otherwise callers can merge and pass the resulting state themselves
    mutate(() => Object.assign({}, newState))
    trackEvent('state_imported', { overwrite })
    return getState()
}

// filtering etc remain outside
