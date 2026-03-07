import {
    getActiveUser,
    login,
    logout,
    listUsers,
    switchUser,
    enable2FA,
    disable2FA,
    getOtpAuthUrl,
    verifyOTP,
    updateUser
} from './auth.js'

// helper for decoding JWT from Google
export function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// callback invoked by Google Identity Services
export async function handleCredentialResponse(response) {
    const payload = parseJwt(response.credential);
    console.log('ID: ' + payload.sub);
    console.log('Full Name: ' + payload.name);
    console.log('Given Name: ' + payload.given_name);
    console.log('Family Name: ' + payload.family_name);
    console.log('Image URL: ' + payload.picture);
    console.log('Email: ' + payload.email);

    // create/update user in local auth system
    try {
        // use email as identifier, password fixed value 'google'
        await login(payload.email, 'google', payload.name || payload.email.split('@')[0]);
    } catch (e) {
        console.warn('google login failed', e);
    }

    document.getElementById('user-name').innerText = `Welcome, ${payload.name}!`;
    const pic = document.getElementById('user-pic');
    if (pic) pic.src = payload.picture;
}

// Initialize profile button with simple dropdown and login prompt.
// If a user is not signed in, clicking the profile icon will ask for a
// username and persist it. When someone is signed in, a tiny menu appears
// offering logout or switching users. Changes reload the page to pick up
// the user-specific state stored under a different localStorage key.
export function initAuth(profileBtn) {
    function updateBtn() {
        updateProfileUI(profileBtn)
    }

    profileBtn.addEventListener('click', async (e) => {
        e.stopPropagation()
        const active = getActiveUser()
        if (!active) {
            const email = prompt('Sign in – email:')
            if (!email) return
            const password = prompt('Password:')
            if (!password) return

            const existing = listUsers().find(u => u.email === email.trim().toLowerCase())
            if (existing) {
                try {
                    await login(email, password)
                    window.location.reload()
                } catch (err) {
                    if (err.message && err.message.toLowerCase().includes('two-factor')) {
                        alert('Invalid two-factor code')
                    } else {
                        alert('Invalid email or password')
                    }
                }
            } else {
                const defaultName = email.split('@')[0]
                const username = prompt('Choose a display name (optional):', defaultName)
                try {
                    await login(email, password, username && username.trim() ? username.trim() : undefined)
                    window.location.reload()
                } catch (err) {
                    alert('Failed to create account')
                }
            }
            return
        }

        // if menu already open, close it
        let menu = document.getElementById('ff-profile-menu')
        if (menu) { menu.remove(); return }

        menu = document.createElement('div')
        menu.id = 'ff-profile-menu'
        menu.className = 'ff-profile-menu'
        menu.tabIndex = -1
        menu.setAttribute('role', 'menu')
        menu.innerHTML = `
            <div class="ff-profile-menu__user">${active.username || ''}</div>
            ${active.email ? `<div class="ff-profile-menu__email"><small>${active.email}</small></div>` : ''}
            <button id="ff-view-profile" role="menuitem">View Profile</button>
            ${active.otpSecret ? '<button id="ff-disable-2fa" role="menuitem">Disable 2FA</button>' : '<button id="ff-enable-2fa" role="menuitem">Enable 2FA</button>'}
            <button id="ff-logout-btn" role="menuitem">Log out</button>
            <button id="ff-switch-btn" role="menuitem">Switch user</button>
        `
        document.body.appendChild(menu)

        const rect = profileBtn.getBoundingClientRect()
        menu.style.top = `${rect.bottom + window.scrollY + 4}px`
        menu.style.right = `${window.innerWidth - rect.right + 4}px`

        menu.querySelector('#ff-logout-btn').addEventListener('click', () => {
            logout()
            window.location.reload()
        })

        // view profile modal
        menu.querySelector('#ff-view-profile').addEventListener('click', () => {
            const modal = document.createElement('div')
            modal.className = 'ff-profile-modal'
            modal.innerHTML = `
                <div class="ff-profile-card">
                    <h3>Your Profile</h3>
                    <label>Email: <input id="profile-email" value="${active.email || ''}" readonly /></label>
                    <label>Display Name: <input id="profile-username" value="${active.username || ''}" /></label>
                    <label>New Password: <input id="profile-password" type="password" placeholder="Leave blank to keep current" /></label>
                    <div class="ff-profile-2fa">Two-Factor: ${active.otpSecret ? 'Enabled' : 'Disabled'}</div>
                    <div class="ff-profile-actions">
                        <button id="profile-save">Save Changes</button>
                        <button id="profile-cancel">Cancel</button>
                    </div>
                </div>`
            document.body.appendChild(modal)

            modal.querySelector('#profile-save').addEventListener('click', async () => {
                const newUsername = modal.querySelector('#profile-username').value.trim()
                const newPassword = modal.querySelector('#profile-password').value.trim()
                const changes = {}
                if (newUsername && newUsername !== active.username) changes.username = newUsername
                if (newPassword) changes.password = newPassword
                if (Object.keys(changes).length > 0) {
                    try {
                        updateUser(active.id, changes)
                        alert('Profile updated')
                        modal.remove()
                        menu.remove()
                        updateBtn()
                    } catch (err) {
                        alert('Failed to update profile')
                    }
                } else {
                    modal.remove()
                }
            })

            modal.querySelector('#profile-cancel').addEventListener('click', () => {
                modal.remove()
            })
        })

        menu.querySelector('#ff-switch-btn').addEventListener('click', async () => {
            const email = prompt('Email:')
            if (!email) return
            const password = prompt('Password:')
            if (!password) return
            const existing = listUsers().find(u => u.email === email.trim().toLowerCase())
            if (existing) {
                try {
                    await login(email, password)
                    window.location.reload()
                } catch (err) {
                    if (err.message && err.message.toLowerCase().includes('two-factor')) {
                        alert('Invalid two-factor code')
                    } else {
                        alert('Invalid email or password')
                    }
                }
            } else {
                const defaultName = email.split('@')[0]
                const username = prompt('Choose a display name (optional):', defaultName)
                try {
                    await login(email, password, username && username.trim() ? username.trim() : undefined)
                    window.location.reload()
                } catch (err) {
                    alert('Failed to create account')
                }
            }
        })

        // attach 2FA handlers if buttons exist
        const enBtn = menu.querySelector('#ff-enable-2fa')
        if (enBtn) {
            enBtn.addEventListener('click', async () => {
                const secret = enable2FA()
                const url = getOtpAuthUrl(active.email || active.username || 'user', secret)

                // build QR image src using Google Charts API (fallback when no QR lib available)
                const qrSrc = `https://chart.googleapis.com/chart?cht=qr&chs=240x240&chl=${encodeURIComponent(url)}`

                // create modal with QR, secret and confirm input
                const modal = document.createElement('div')
                modal.className = 'ff-qr-modal'
                modal.innerHTML = `
                    <div class="ff-qr-card">
                        <h3>Enable two-factor authentication</h3>
                        <p>Scan the QR code below with Google Authenticator (or enter the secret manually).</p>
                        <img src="${qrSrc}" alt="QR code for authenticator" />
                        <div class="ff-qr-secret">Secret: <input readonly value="${secret}" /></div>
                        <div class="ff-qr-actions">
                            <button id="ff-qr-copy">Copy secret</button>
                            <button id="ff-qr-confirm">I've scanned it</button>
                            <button id="ff-qr-cancel">Cancel</button>
                        </div>
                    </div>`
                document.body.appendChild(modal)

                // handlers
                modal.querySelector('#ff-qr-copy').addEventListener('click', () => {
                    const input = modal.querySelector('.ff-qr-secret input')
                    input.select()
                    try { document.execCommand('copy'); alert('Secret copied') } catch (e) { alert('Copy failed') }
                })

                modal.querySelector('#ff-qr-confirm').addEventListener('click', async () => {
                    const code = prompt('Enter code shown in your authenticator app to confirm:')
                    if (!code) return
                    const ok = await verifyOTP(secret, code.trim())
                    if (!ok) {
                        alert('Invalid code; 2FA not enabled')
                        disable2FA()
                    } else {
                        try { trackEvent && trackEvent('2fa_enabled', { user: (active && (active.username || active.email)) }) } catch (e) { }
                        alert('Two-factor enabled')
                    }
                    modal.remove()
                    menu.remove()
                })

                modal.querySelector('#ff-qr-cancel').addEventListener('click', () => {
                    // rollback
                    disable2FA()
                    modal.remove()
                })
            })
        }
        const disBtn = menu.querySelector('#ff-disable-2fa')
        if (disBtn) {
            disBtn.addEventListener('click', () => {
                if (confirm('Disable two-factor authentication?')) {
                    disable2FA()
                    alert('2FA disabled')
                    menu.remove()
                }
            })
        }
        const onClickOutside = (ev) => {
            if (!menu.contains(ev.target) && ev.target !== profileBtn) {
                menu.remove()
                document.removeEventListener('click', onClickOutside)
            }
        }
        // attach listener after a tick so the current click doesn't immediately
        // close the menu
        setTimeout(() => document.addEventListener('click', onClickOutside), 0)
    })

    // keep label up to date on initialization
    updateBtn()
}

export function updateProfileUI(profileBtn) {
    const active = getActiveUser()
    if (active) {
        profileBtn.setAttribute('aria-label', `Profile (${active.username || active.email})`)
        profileBtn.title = `Signed in as ${active.username || active.email}`
    } else {
        profileBtn.setAttribute('aria-label', 'Profile (not signed in)')
        profileBtn.title = 'Click to sign in'
    }
}
