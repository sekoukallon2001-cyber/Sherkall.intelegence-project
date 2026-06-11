// =====================================================
// SHERKALL INTELLIGENCE — ALERTS UI MODULE
// js/ui/alerts.js
// =====================================================

import { vehicleStore } from '../state.js';
import { CONFIG }       from '../config.js';

// ── ALERTS FEED ───────────────────────────────────────
export function renderAlertsFeed() {
  const feed = document.getElementById('alerts-feed');
  if (!feed) return;

  const vehicles  = Object.values(vehicleStore);
  const speeding  = vehicles.filter(v => v.speed > CONFIG.SPEEDING_THRESHOLD);
  const offline   = vehicles.filter(v => v.status === 'offline' && v.ts);
  const moving    = vehicles.filter(v => v.status === 'online');
  const idle      = vehicles.filter(v => v.status === 'idle');

  const entries = [];

  speeding.forEach(v => entries.push({
    cls: 'alert-danger',
    icon: '⚡',
    text: `${v.name} — vitesse excessive ${v.speed} km/h`,
    time: 'En direct'
  }));

  offline.forEach(v => {
    const min = Math.round((Date.now() - new Date(v.ts)) / 60000);
    entries.push({
      cls: 'alert-warn',
      icon: '📴',
      text: `${v.name} — hors ligne`,
      time: `il y a ${min < 1 ? '<1' : min} min`
    });
  });

  moving.forEach(v => entries.push({
    cls: 'alert-info',
    icon: '🚗',
    text: `${v.name} — en mouvement ${v.speed} km/h`,
    time: 'En direct'
  }));

  idle.forEach(v => entries.push({
    cls: 'alert-idle',
    icon: '🅿',
    text: `${v.name} — garé`,
    time: 'En direct'
  }));

  if (!entries.length) {
    feed.innerHTML = '<div class="alert-empty">Aucune activité récente</div>';
    return;
  }

  feed.innerHTML = entries.map(e => `
    <div class="alert-item ${e.cls}">
      <span class="alert-icon">${e.icon}</span>
      <div class="alert-content">
        <p class="alert-text">${e.text}</p>
        <p class="alert-time">${e.time}</p>
      </div>
    </div>`).join('');
}

// ── GEOFENCE ALERT HANDLER ────────────────────────────
export function handleGeofenceAlert(alert) {
  const isEntry = alert.eventType === 'entered';
  const emoji   = isEntry ? '🔵' : '🔴';
  const action  = isEntry ? 'entered' : 'exited';
  showToast(`${emoji} ${alert.deviceName} ${action} ${alert.geofenceName}`, isEntry ? 'info' : 'danger');
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
