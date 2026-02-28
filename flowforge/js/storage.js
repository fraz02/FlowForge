// Storage layer: persists application state with versioned schema and migration support
const KEY = 'flowforge_state_v2'
const CURRENT_SCHEMA = 1

export const defaultState = {
    workspaces: [{ id: 'w-1', name: 'Default Workspace', projects: ['p-1'] }],
    projects: [{ id: 'p-1', name: 'Project Alpha', boards: ['b-1'] }],
    boards: [{ id: 'b-1', name: 'Main Board', columns: [{ id: 'col-1', name: 'To Do' }, { id: 'col-2', name: 'In Progress' }, { id: 'col-3', name: 'Review' }, { id: 'col-4', name: 'Done' }] }],
    tasks: [],
    filters: { q: '', priority: null, member: null, tags: [] },
    meta: { createdAt: Date.now() }
}

function migrate(wrapper) {
    let { v, data } = wrapper
    while (v < CURRENT_SCHEMA) {
        switch (v) {
            case 0:
                // example migration from schema 0 to 1
                data = Object.assign({}, data)
                break
        }
        v++
    }
    return { v: CURRENT_SCHEMA, data }
}

export function loadState() {
    try {
        const raw = localStorage.getItem(KEY)
        if (!raw) return defaultState
        const obj = JSON.parse(raw)
        if (obj.v !== CURRENT_SCHEMA) return migrate(obj).data
        return obj.data || defaultState
    } catch (e) { console.warn('load error', e); return defaultState }
}

export function saveState(state) {
    try {
        const wrapper = { v: CURRENT_SCHEMA, data: state }
        localStorage.setItem(KEY, JSON.stringify(wrapper))
    } catch (e) { console.warn('save error', e) }
}
