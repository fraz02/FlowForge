import { renderColumn } from './column.js'
import { getState, subscribe } from '../../js/state.js'

export function renderBoard(rootEl, boardId) {
    rootEl.innerHTML = ''
    const board = getState().boards.find(b => b.id === boardId)
    if (!board) { rootEl.textContent = 'No board found'; return }

    // render columns
    for (const col of board.columns) {
        const colEl = renderColumn(boardId, col)
        rootEl.appendChild(colEl)
    }

    // subscribe to re-render when board meta changes (columns added)
    const unsub = subscribe((state) => {
        const b = state.boards.find(bb => bb.id === boardId)
        if (!b) return
        // If column count changed, re-render fully (cheap for small boards)
        if (b.columns.length !== rootEl.children.length) renderBoard(rootEl, boardId)
    })
    rootEl.cleanup = () => unsub()
}
