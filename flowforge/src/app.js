import {
    getState, subscribe, createTask, addColumn, setFilter,
    createWorkspace, deleteWorkspace,
    createProject, deleteProject,
    createBoard, deleteBoard
} from '../js/state.js'
import { exportWorkspace, importWorkspace } from './export.js'
import { trackEvent } from '../js/analytics.js'
import { renderBoard } from './components/board.js'
import { mountAnalytics } from './components/analytics.js'

// Announce to screen readers
function announce(text) {
    const el = document.getElementById('sr-announce')
    if (el) el.textContent = text
}

const boardRoot = document.getElementById('board')
const analyticsRoot = document.getElementById('analytics')
const addColumnBtn = document.getElementById('add-column')
const addTaskBtn = document.getElementById('add-task')
const addBoardBtn = document.getElementById('add-board')
const addWorkspaceBtn = document.getElementById('add-workspace')
const addProjectBtn = document.getElementById('add-project')
const workspaceListEl = document.getElementById('workspace-list')
const projectListEl = document.getElementById('project-list')
const searchInput = document.getElementById('search')
const filtersRoot = document.getElementById('filters')
const exportWorkspaceBtn = document.getElementById('export-workspace')
const importWorkspaceBtn = document.getElementById('import-workspace')
const themeToggle = document.getElementById('theme-toggle')
const profileBtn = document.getElementById('profile')

function init() {
    // workspace/project/board selection state
    let currentWorkspaceId = null
    let currentProjectId = null
    let currentBoardId = null

    // helpers close over selection variables
    function renderWorkspaces() {
        if (!workspaceListEl) return
        const s = getState()
        workspaceListEl.innerHTML = ''
        for (const w of s.workspaces) {
            const li = document.createElement('li')
            li.textContent = w.name
            li.dataset.id = w.id
            li.setAttribute('aria-label', `Workspace: ${w.name}`)
            if (w.id === currentWorkspaceId) {
                li.classList.add('selected')
                li.setAttribute('aria-selected', 'true')
            }
            li.tabIndex = 0
            li.setAttribute('role', 'button')
            li.addEventListener('click', () => selectWorkspace(w.id))
            li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectWorkspace(w.id) } })
            const del = document.createElement('button')
            del.className = 'ff-inline-del'
            del.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>'
            del.setAttribute('aria-label', `Delete workspace "${w.name}"`)
            del.title = 'Delete workspace'
            del.addEventListener('click', (e) => {
                e.stopPropagation()
                if (confirm('Delete workspace and all its contents?')) deleteWorkspace(w.id)
            })
            li.appendChild(del)
            workspaceListEl.appendChild(li)
        }
    }

    function renderProjects() {
        if (!projectListEl) return
        const s = getState()
        projectListEl.innerHTML = ''
        const ws = s.workspaces.find(w => w.id === currentWorkspaceId)
        if (!ws) return
        for (const pid of ws.projects) {
            const p = s.projects.find(x => x.id === pid)
            if (!p) continue
            const li = document.createElement('li')
            li.textContent = p.name
            li.dataset.id = p.id
            li.setAttribute('aria-label', `Project: ${p.name}`)
            if (p.id === currentProjectId) {
                li.classList.add('selected')
                li.setAttribute('aria-selected', 'true')
            }
            li.tabIndex = 0
            li.setAttribute('role', 'button')
            li.addEventListener('click', () => selectProject(p.id))
            li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectProject(p.id) } })
            const del = document.createElement('button')
            del.className = 'ff-inline-del'
            del.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>'
            del.setAttribute('aria-label', `Delete project "${p.name}"`)
            del.title = 'Delete project'
            del.addEventListener('click', (e) => {
                e.stopPropagation()
                if (confirm('Delete project and its boards/tasks?')) deleteProject(p.id)
            })
            li.appendChild(del)
            projectListEl.appendChild(li)
        }
    }

    function renderCurrentBoard() {
        const delBtn = document.getElementById('delete-board')
        const boardTitle = document.getElementById('board-title')
        if (delBtn) delBtn.disabled = !currentBoardId
        if (boardRoot.cleanup) boardRoot.cleanup()
        if (currentBoardId) {
            const board = getState().boards.find(b => b.id === currentBoardId)
            if (board && boardTitle) {
                boardTitle.textContent = board.name
                boardTitle.id = `board-${board.id}`
            }
            renderBoard(boardRoot, currentBoardId)
        } else {
            boardRoot.textContent = 'No board selected'
            if (boardTitle) boardTitle.textContent = 'No board selected'
        }
    }

    function selectWorkspace(id) {
        currentWorkspaceId = id
        const s = getState()
        const ws = s.workspaces.find(w => w.id === id)
        currentProjectId = ws?.projects[0] || null
        if (currentProjectId) {
            const proj = s.projects.find(p => p.id === currentProjectId)
            currentBoardId = proj?.boards[0] || null
            if (currentBoardId) {
                const board = s.boards.find(b => b.id === currentBoardId)
                announce(`Board "${board?.name}" loaded`)
            }
        } else {
            currentBoardId = null
        }
        renderWorkspaces()
        renderProjects()
        renderCurrentBoard()
    }

    function selectProject(id) {
        currentProjectId = id
        const s = getState()
        const proj = s.projects.find(p => p.id === id)
        currentBoardId = proj?.boards[0] || null
        if (currentBoardId) {
            const board = s.boards.find(b => b.id === currentBoardId)
            announce(`Board "${board?.name}" loaded`)
        }
        renderProjects()
        renderCurrentBoard()
    }

    // initialize selection from state
    const state = getState()
    currentWorkspaceId = state.workspaces[0]?.id || null
    if (currentWorkspaceId) {
        const ws = state.workspaces.find(w => w.id === currentWorkspaceId)
        currentProjectId = ws?.projects[0] || null
    }
    if (currentProjectId) {
        const proj = state.projects.find(p => p.id === currentProjectId)
        currentBoardId = proj?.boards[0] || null
    }

    renderWorkspaces()
    renderProjects()
    renderCurrentBoard()
    mountAnalytics(analyticsRoot)

    // mount task drawer
    import('./components/drawer.js').then(m => {
        const drawer = m.mountDrawer()
        // global listener for task actions
        boardRoot.addEventListener('task-action', (ev) => {
            const { id, action } = ev.detail
            if (action === 'edit') drawer.open(id)
        })
    })

    // build basic filters UI
    buildFilters()

    addColumnBtn.addEventListener('click', () => {
        if (!currentBoardId) return alert('Select a board first')
        const name = prompt('Column name', 'New Column')
        if (name) {
            addColumn(currentBoardId, name)
            announce(`Column "${name}" added to board`)
        }
    })

    addTaskBtn.addEventListener('click', () => {
        if (!currentBoardId) return alert('Select a board to add tasks')
        const title = prompt('Task title')
        if (!title) return
        // default add to first column
        const board = getState().boards.find(b => b.id === currentBoardId)
        const colId = board.columns[0].id
        createTask({ title, columnId: colId, priority: 'Normal' })
        announce(`Task "${title}" created in ${board.columns[0].name}`)
    })

    searchInput.addEventListener('input', (e) => setFilter({ q: e.target.value }))

    // theme toggle with persistence
    const THEME_KEY = 'flowforge_theme'
    function loadTheme() {
        const t = localStorage.getItem(THEME_KEY)
        if (t) document.body.setAttribute('data-theme', t)
        updateToggleIcon()
    }
    function saveTheme(t) { try { localStorage.setItem(THEME_KEY, t) } catch { } }
    function updateToggleIcon() {
        if (!themeToggle) return
        const theme = document.body.getAttribute('data-theme')
        const sun = themeToggle.querySelector('.ff-icon-sun')
        const moon = themeToggle.querySelector('.ff-icon-moon')
        if (sun && moon) {
            if (theme === 'light') {
                sun.style.display = 'none'
                moon.style.display = 'block'
            } else {
                sun.style.display = 'block'
                moon.style.display = 'none'
            }
        }
    }
    loadTheme()
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const light = document.body.getAttribute('data-theme') !== 'light'
            const theme = light ? 'light' : 'dark'
            document.body.setAttribute('data-theme', theme)
            saveTheme(theme)
            updateToggleIcon()
        })
    }

    if (profileBtn) profileBtn.addEventListener('click', () => { alert('Profile menu (not implemented)') })

    // add workspace/project/board buttons
    if (addWorkspaceBtn) addWorkspaceBtn.addEventListener('click', () => {
        const name = prompt('Workspace name')
        if (name) {
            const id = createWorkspace(name)
            announce(`Workspace "${name}" created and selected`)
            selectWorkspace(id)
        }
    })
    if (exportWorkspaceBtn) exportWorkspaceBtn.addEventListener('click', () => {
        if (!currentWorkspaceId) return alert('Select a workspace to export')
        try {
            const json = exportWorkspace(currentWorkspaceId)
            const blob = new Blob([json], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `workspace-${currentWorkspaceId}.json`
            a.click()
            URL.revokeObjectURL(url)
            trackEvent('data_export', { workspaceId: currentWorkspaceId })
        } catch (e) { alert('Export failed:' + e.message) }
    })
    if (importWorkspaceBtn) importWorkspaceBtn.addEventListener('click', () => {
        const data = prompt('Paste workspace JSON to import')
        if (!data) return
        try { importWorkspace(data) } catch (e) { alert('Import failed: ' + e.message) }
    })
    if (addProjectBtn) addProjectBtn.addEventListener('click', () => {
        if (!currentWorkspaceId) return alert('Select a workspace first')
        const name = prompt('Project name')
        if (name) {
            const id = createProject(currentWorkspaceId, name)
            announce(`Project "${name}" created and selected`)
            selectProject(id)
        }
    })
    if (addBoardBtn) addBoardBtn.addEventListener('click', () => {
        if (!currentProjectId) return alert('Select a project first')
        const name = prompt('Board name')
        if (name) {
            const id = createBoard(currentProjectId, name)
            announce(`Board "${name}" created and selected`)
            selectProject(currentProjectId)
            currentBoardId = id
            renderCurrentBoard()
        }
    })
    const deleteBoardBtn = document.getElementById('delete-board')
    if (deleteBoardBtn) deleteBoardBtn.addEventListener('click', () => {
        if (!currentBoardId) return
        if (confirm('Delete current board? This cannot be undone.')) {
            deleteBoard(currentBoardId)
        }
    })

    // global state watcher: keep UI synced and maintain selection consistency
    subscribe(() => {
        const s = getState()
        // ensure current workspace/project/board still exist
        if (currentWorkspaceId && !s.workspaces.find(w => w.id === currentWorkspaceId)) {
            currentWorkspaceId = s.workspaces[0]?.id || null
        }
        if (currentWorkspaceId) {
            const ws = s.workspaces.find(w => w.id === currentWorkspaceId)
            if (currentProjectId && (!ws || !ws.projects.includes(currentProjectId))) {
                currentProjectId = ws?.projects[0] || null
            }
        }
        if (currentProjectId && !s.projects.find(p => p.id === currentProjectId)) {
            currentProjectId = null
        }
        if (currentProjectId) {
            const proj = s.projects.find(p => p.id === currentProjectId)
            if (currentBoardId && (!proj || !proj.boards.includes(currentBoardId))) {
                currentBoardId = proj?.boards[0] || null
            }
        }
        if (currentBoardId && !s.boards.find(b => b.id === currentBoardId)) {
            currentBoardId = null
        }

        renderWorkspaces()
        renderProjects()
        renderCurrentBoard()
    })

}

document.addEventListener('DOMContentLoaded', init)

function buildFilters() {
    if (!filtersRoot) return
    filtersRoot.innerHTML = ''
    const priority = document.createElement('select')
    priority.innerHTML = `<option value="">All priorities</option><option>Low</option><option>Medium</option><option>High</option><option>Critical</option>`
    priority.addEventListener('change', () => setFilter({ priority: priority.value || null }))

    const due = document.createElement('select')
    due.innerHTML = `<option value="">Any due</option><option value="overdue">Overdue</option><option value="today">Today</option><option value="upcoming">Upcoming</option>`
    due.addEventListener('change', () => setFilter({ due: due.value || null }))

    const member = document.createElement('select')
    member.innerHTML = `<option value="">Any member</option>`
    member.addEventListener('change', () => setFilter({ member: member.value || null }))

    filtersRoot.appendChild(priority)
    filtersRoot.appendChild(due)
    filtersRoot.appendChild(member)

    // populate member list from tasks' assignees
    function refreshMembers() {
        const state = getState()
        const members = Array.from(new Set(state.tasks.map(t => t.assignee).filter(Boolean)))
        member.innerHTML = `<option value="">Any member</option>` + members.map(m => `<option value="${m}">${m}</option>`).join('')
    }
    refreshMembers()
    subscribe(refreshMembers)
}
