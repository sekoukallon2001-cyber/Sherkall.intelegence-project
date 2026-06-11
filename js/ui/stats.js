// =====================================================
// SHERKALL INTELLIGENCE — STATS UI MODULE
// js/ui/stats.js
// =====================================================

import { vehicleStore }     from '../state.js';
import { CONFIG }           from '../config.js';

function set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

export function updateAllKPIs() {
  const vehicles = Object.values(vehicleStore);
  let moving = 0, idle = 0, offline = 0, alerts = 0;
  const total = vehicles.length;

  vehicles.forEach(v => {
    if      (v.status === 'online')  moving++;
    else if (v.status === 'idle')    idle++;
    else                             offline++;
    if (v.speed > CONFIG.SPEEDING_THRESHOLD) alerts++;
  });

  // Map HUD bar
  set('stat-total',   total);
  set('stat-moving',  moving);
  set('stat-idle',    idle);
  set('stat-offline', offline);

  // Vehicles tab KPI cards
  set('kpi-total',   total);
  set('kpi-moving',  moving);
  set('kpi-idle',    idle);
  set('kpi-offline', offline);
  set('kpi-alerts',  alerts);

  // Alerts nav badge
  const badge = document.getElementById('nav-badge-alerts');
  if (badge) {
    badge.textContent   = alerts;
    badge.style.display = alerts > 0 ? 'flex' : 'none';
  }
}

export function setConnected(connected) {
  const pill  = document.getElementById('conn-indicator');
  const label = document.getElementById('conn-label');
  if (!pill || !label) return;
  pill.className   = connected ? 'conn-pill connected' : 'conn-pill error';
  label.textContent = connected ? 'En ligne' : 'Hors ligne';
}
