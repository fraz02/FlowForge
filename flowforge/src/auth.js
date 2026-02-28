// Simulated authentication module (no real auth)
// - Persists active user id in localStorage under key `flowforge_activeUser_v1`
// - Allows creating and switching between simulated users

const ACTIVE_KEY = 'flowforge_activeUser_v1'
const USERS_KEY = 'flowforge_users_v1'

function loadActive() { try { return JSON.parse(localStorage.getItem(ACTIVE_KEY)) } catch (e) { return null } }
function saveActive(user) { try { localStorage.setItem(ACTIVE_KEY, JSON.stringify(user)) } catch (e) { } }

function loadUsers() { try { return JSON.parse(localStorage.getItem(USERS_KEY)) || [] } catch (e) { return [] } }
function saveUsers(list) { try { localStorage.setItem(USERS_KEY, JSON.stringify(list)) } catch (e) { } }

export function listUsers() { return loadUsers() }

export function getActiveUser() { return loadActive() }

export function login(username) {
    if (!username) throw new Error('username required')
    const users = loadUsers()
    let user = users.find(u => u.username === username)
    if (!user) {
        user = { id: 'u-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6), username }
        users.push(user)
        saveUsers(users)
    }
    saveActive(user)
    return user
}

export function switchUser(userId) {
    const users = loadUsers()
    const user = users.find(u => u.id === userId)
    if (!user) return null
    saveActive(user)
    return user
}

export function logout() { try { localStorage.removeItem(ACTIVE_KEY); return true } catch (e) { return false } }

export function removeUser(userId) {
    const users = loadUsers().filter(u => u.id !== userId)
    saveUsers(users)
    const active = loadActive()
    if (active && active.id === userId) logout()
    return users
}
