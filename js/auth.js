// =====================================================
// SHERKALL INTELLIGENCE — AUTH MODULE
// js/auth.js
// =====================================================
// Handles token read/write across sessionStorage and
// localStorage. sessionStorage is tab-specific — prevents
// cross-tab session contamination in multi-tenant use.

// ── READ ─────────────────────────────────────────────
// sessionStorage takes priority (tab-specific session).
// Falls back to localStorage (persisted across tabs).
export function getToken() {
  return sessionStorage.getItem('sherkall_token')
      || localStorage.getItem('sherkall_token');
}

export function getUser() {
  const raw = sessionStorage.getItem('sherkall_user')
           || localStorage.getItem('sherkall_user');
  try { return JSON.parse(raw); } catch { return null; }
}

// ── WRITE ─────────────────────────────────────────────
// Stored in both on login so each tab has its own copy.
export function setSession(token, user) {
  const userStr = JSON.stringify(user);
  localStorage.setItem('sherkall_token', token);
  localStorage.setItem('sherkall_user',  userStr);
  sessionStorage.setItem('sherkall_token', token);
  sessionStorage.setItem('sherkall_user',  userStr);
}

// ── CLEAR ─────────────────────────────────────────────
export function clearSession() {
  ['sherkall_token', 'sherkall_user'].forEach(k => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
}

// ── GUARD ─────────────────────────────────────────────
// Called on page load. Redirects if not authenticated
// or if wrong role for this page.
export function requireRole(expectedRole) {
  const token = getToken();
  const user  = getUser();

  if (!token || !user) {
    window.location.href = '/login.html';
    return null;
  }

  // Detect cross-tab contamination: sessionStorage has the
  // correct tab-specific role; localStorage may have been
  // overwritten by another tab logging in as different role.
  const sessionUser = (() => {
    try { return JSON.parse(sessionStorage.getItem('sherkall_user')); } catch { return null; }
  })();

  // If session says admin but we're on client dashboard → redirect
  if (expectedRole === 'client' && sessionUser?.role === 'admin') {
    window.location.href = '/admin.html';
    return null;
  }

  // If session says client but we're on admin panel → redirect
  if (expectedRole === 'admin' && sessionUser?.role !== 'admin') {
    window.location.href = '/login.html';
    return null;
  }

  return { token: getToken(), user: sessionUser || user };
}
