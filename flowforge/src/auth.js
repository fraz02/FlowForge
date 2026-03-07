// Simulated authentication module (no real auth)
// - Persists active user id in localStorage under key `flowforge_activeUser_v1`
// - Supports email/password login with optional display name; also
//   retains backwards compatibility with username-only calls.
// - Allows creating and switching between simulated users
//
// Analytics events are emitted on login/logout so usage can be measured.

import { trackEvent } from '../js/analytics.js'
import { migrateAnonStateToUser } from '../js/storage.js'

const ACTIVE_KEY = 'flowforge_activeUser_v1'
const USERS_KEY = 'flowforge_users_v1'

// --- base32 helpers -------------------------------------------------------
const _base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Encode(bytes) {
    let bits = 0, value = 0, output = '';
    for (const byte of bytes) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            output += _base32chars[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) {
        output += _base32chars[(value << (5 - bits)) & 31];
    }
    // padding optional; omit
    return output;
}
function base32Decode(str) {
    let bits = 0, value = 0;
    const out = [];
    str = str.replace(/=+$/, '').toUpperCase();
    for (const ch of str) {
        const idx = _base32chars.indexOf(ch);
        if (idx === -1) continue;
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            out.push((value >>> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }
    return new Uint8Array(out);
}

// --- TOTP generation/verification ----------------------------------------
async function generateOTP(secret) {
    const key = base32Decode(secret);
    const epoch = Math.floor(Date.now() / 1000 / 30);
    const msg = new Uint8Array(8);
    let tmp = epoch;
    for (let i = 7; i >= 0; i--) {
        msg[i] = tmp & 0xff;
        tmp = tmp >> 8;
    }
    const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', cryptoKey, msg);
    const bytes = new Uint8Array(sig);
    const offset = bytes[bytes.length - 1] & 0xf;
    const code = ((bytes[offset] & 0x7f) << 24) |
        ((bytes[offset + 1] & 0xff) << 16) |
        ((bytes[offset + 2] & 0xff) << 8) |
        (bytes[offset + 3] & 0xff);
    return (code % 1e6).toString().padStart(6, '0');
}

export async function verifyOTP(secret, code) {
    if (!secret || !code) return false;
    // check current, previous, next step
    for (let i = -1; i <= 1; i++) {
        const t = Math.floor((Date.now() / 1000 + i * 30) / 30);
        const gen = await generateOTPAt(secret, t);
        if (gen === code) return true;
    }
    return false;
}

async function generateOTPAt(secret, epoch) {
    // same as above but with provided epoch
    const key = base32Decode(secret);
    const msg = new Uint8Array(8);
    let tmp = epoch;
    for (let i = 7; i >= 0; i--) {
        msg[i] = tmp & 0xff;
        tmp = tmp >> 8;
    }
    const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', cryptoKey, msg);
    const bytes = new Uint8Array(sig);
    const offset = bytes[bytes.length - 1] & 0xf;
    const code = ((bytes[offset] & 0x7f) << 24) |
        ((bytes[offset + 1] & 0xff) << 16) |
        ((bytes[offset + 2] & 0xff) << 8) |
        (bytes[offset + 3] & 0xff);
    return (code % 1e6).toString().padStart(6, '0');
}

// generate a 10‑byte random secret encoded in base32
export function generateSecret() {
    const rnd = new Uint8Array(10);
    crypto.getRandomValues(rnd);
    return base32Encode(rnd);
}

// enable/disable functions operate on current user
export function enable2FA() {
    const user = loadActive();
    if (!user) throw new Error('not signed in');
    if (!user.otpSecret) {
        user.otpSecret = generateSecret();
        const users = loadUsers();
        const idx = users.findIndex(u => u.id === user.id);
        if (idx !== -1) { users[idx] = user; saveUsers(users); }
        saveActive(user);
        try { trackEvent('2fa_enabled', { userId: user.id }); } catch (e) { }
    }
    return user.otpSecret;
}

export function disable2FA() {
    const user = loadActive();
    if (!user) throw new Error('not signed in');
    delete user.otpSecret;
    const users = loadUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) { users[idx] = user; saveUsers(users); }
    saveActive(user);
    try { trackEvent('2fa_disabled', { userId: user.id }); } catch (e) { }
}

export function getOtpAuthUrl(label, secret) {
    // compatible with Google Authenticator format
    return `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=FlowForge`;
}


function loadActive() { try { return JSON.parse(localStorage.getItem(ACTIVE_KEY)) } catch (e) { return null } }
function saveActive(user) { try { localStorage.setItem(ACTIVE_KEY, JSON.stringify(user)) } catch (e) { } }

function loadUsers() { try { return JSON.parse(localStorage.getItem(USERS_KEY)) || [] } catch (e) { return [] } }
function saveUsers(list) { try { localStorage.setItem(USERS_KEY, JSON.stringify(list)) } catch (e) { } }

export function listUsers() { return loadUsers() }

export function getActiveUser() { return loadActive() }

// login can be called two ways:
//   login(username)              // legacy: just a display name
//   login(email, password, name)  // new: requires credentials
export async function login(arg1, arg2, arg3) {
    // legacy path when only a single string is passed
    if (arg2 === undefined) {
        const username = arg1
        if (!username) throw new Error('username required')
        const users = loadUsers()
        let user = users.find(u => u.username === username)
        if (!user) {
            user = { id: 'u-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6), username }
            users.push(user)
            saveUsers(users)
        }
        saveActive(user)
        try { migrateAnonStateToUser(user.id) } catch (e) { }
        try { trackEvent('user_login', { userId: user.id, username: user.username }); } catch (e) { }
        return user
    }

    // new email/password path
    const email = (arg1 || '').trim().toLowerCase()
    const password = arg2 || ''
    let username = arg3 && arg3.trim()
    if (!email || !password) throw new Error('email and password required')

    const users = loadUsers()
    let user = users.find(u => u.email === email)
    if (user) {
        // existing account, verify password
        if (user.password !== password) {
            throw new Error('invalid credentials')
        }
        // if username provided, update display name
        if (username && user.username !== username) {
            user.username = username
            saveUsers(users)
        }
    } else {
        // create new account
        if (!username) username = email.split('@')[0]
        user = { id: 'u-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6), username, email, password }
        users.push(user)
        saveUsers(users)
    }

    saveActive(user)
    try { migrateAnonStateToUser(user.id) } catch (e) { }
    // if two‑factor enabled, require a valid code
    if (user.otpSecret) {
        const code = prompt('Enter 6-digit code from authenticator:')
        if (!code || !(await verifyOTP(user.otpSecret, code.trim()))) {
            throw new Error('invalid two-factor code')
        }
    }
    try { trackEvent('user_login', { userId: user.id, username: user.username }); } catch (e) { }
    return user
}

export async function switchUser(userId) {
    const users = loadUsers()
    const user = users.find(u => u.id === userId)
    if (!user) return null
    saveActive(user)
    // require 2fa when switching
    if (user.otpSecret) {
        const code = prompt('Enter 6-digit code from authenticator:')
        if (!code || !(await verifyOTP(user.otpSecret, code.trim()))) {
            throw new Error('invalid two-factor code')
        }
    }
    try { trackEvent('user_switch', { userId: user.id, username: user.username }); } catch (e) { }
    return user
}

export function logout() { try { localStorage.removeItem(ACTIVE_KEY); try { trackEvent('user_logout'); } catch (e) { } return true } catch (e) { return false } }

export function removeUser(userId) {
    const users = loadUsers().filter(u => u.id !== userId)
    saveUsers(users)
    const active = loadActive()
    if (active && active.id === userId) logout()
    return users
}

export function updateUser(userId, changes) {
    const users = loadUsers()
    const user = users.find(u => u.id === userId)
    if (!user) throw new Error('user not found')
    Object.assign(user, changes)
    saveUsers(users)
    if (getActiveUser()?.id === userId) {
        saveActive(user)
    }
    return user
}
