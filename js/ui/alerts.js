// =====================================================
// SHERKALL INTELLIGENCE — ALERTS UI MODULE
// js/ui/alerts.js
// =====================================================
// Rebuilt from original dashboard-1.js renderAlertsFeed
// Preserves exact HTML structure, CSS classes, behaviour

import { vehicleStore }       from '../state.js';
import { getVehicleStatus }   from '../state.js';
import { CONFIG }             from '../config.js';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── ALERTS FEED ───────────────────────────────────────
export function renderAlertsFeed() {
  const feed = document.getElementById('alerts-feed');
  if (!feed) return;

  const items = [];

  Object.values(vehicleStore).forEach(v => {
    const status = getVehicleStatus(v);
    const ts = v.ts
      ? new Date(v.ts).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
      : '--:--:--';

    if (v.speed > CONFIG.SPEEDING_THRESHOLD) {
      items.push({
        type:'critical', icon:'⚡', badge:'Critical', ts,
        title: `Speeding: ${v.name}`,
        desc:  `Detected at ${v.speed} km/h.`,
        id: v.id
      });
    }

    if (status === 'offline') {
      items.push({
        type:'system', icon:'📡', badge:'System', ts,
        title: `Signal Lost: ${v.name}`,
        desc:  'Telemetry signal lost. Last known position on map.',
        id: v.id
      });
    }

    if (v.speed > CONFIG.SPEED_THRESHOLD && v.speed <= CONFIG.SPEEDING_THRESHOLD) {
      items.push({
        type:'info', icon:'🚗', badge:'Movement', ts,
        title: `Moving: ${v.name}`,
        desc:  `Currently at ${v.speed} km/h.`,
        id: v.id
      });
    }
  });

  // Update nav badge — critical alerts only
  const critCount = items.filter(a => a.type === 'critical').length;
  const badge = document.getElementById('nav-badge-alerts');
  if (badge) {
    badge.textContent   = critCount;
    badge.style.display = critCount > 0 ? 'flex' : 'none';
  }

  if (!items.length) {
    feed.innerHTML = `
      <div class="alerts-empty">
        <div class="alerts-empty-icon">🔔</div>
        <p>No recent alerts.<br>All systems normal.</p>
      </div>`;
    return;
  }

  feed.innerHTML = items.map(a => `
    <div class="alert-card alert-${a.type}">
      <div class="alert-card-top">
        <div class="alert-icon-wrap">${a.icon}</div>
        <div class="alert-meta">
          <span class="alert-badge">${escapeHtml(a.badge)}</span>
          <div class="alert-ts">${escapeHtml(a.ts)}</div>
        </div>
      </div>
      <div class="alert-title">${escapeHtml(a.title)}</div>
      <div class="alert-desc">${escapeHtml(a.desc)}</div>
      <button class="alert-view-btn" data-vehicle-id="${escapeHtml(String(a.id))}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
          <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
        </svg>
        View on Map
      </button>
    </div>`).join('');

  // Attach view-on-map handlers
  feed.querySelectorAll('.alert-view-btn').forEach(btn => {
    btn.onclick = () => {
      if (window.selectVehicle) window.selectVehicle(btn.dataset.vehicleId);
      if (window.switchView)    window.switchView('map');
    };
  });
}

// ── GEOFENCE ALERT HANDLER ────────────────────────────
export function handleGeofenceAlert(alert) {
  const isEntry = alert.eventType === 'entered';
  showToast(`${isEntry ? '🔵' : '🔴'} ${alert.deviceName} ${isEntry ? 'entered' : 'exited'} ${alert.geofenceName}`, isEntry ? 'info' : 'danger');
}

// ── TOAST ─────────────────────────────────────────────
export function showToast(msg, type = '') {
  const container = document.getElementById('alerts');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `alert-toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity    = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
