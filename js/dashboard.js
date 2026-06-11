// =====================================================
// SHERKALL INTELLIGENCE — DASHBOARD ORCHESTRATOR
// js/dashboard.js
// =====================================================
// Imports all modules and wires them together.
// No logic lives here — only coordination.

import { requireRole, clearSession } from './auth.js';
import { fetchVehicles, fetchGeofences } from './api.js';
import { vehicleStore, selectedId, setSelectedId, loadVehicles, onUpdate } from './state.js';
import { initRealtime, stopRealtime } from './realtime.js';
import { initMap, setMapLayer, updateMarker, updateAllMarkers, centerVehicle, centerAll, renderGeofences, flashGeofence } from './map.js';
import { renderVehicleList } from './ui/vehicleList.js';
import { openSheet, closeSheet, refreshSheet } from './ui/sheet.js';
import { renderAlertsFeed, handleGeofenceAlert, showToast } from './ui/alerts.js';
import { updateAllKPIs, setConnected } from './ui/stats.js';

// ── AUTH GUARD ────────────────────────────────────────
const session = requireRole('client');
if (!session) throw new Error('Not authenticated');
const { token, user } = session;

// ── APPLY USER INFO ───────────────────────────────────
function applyUserInfo() {
  const name  = user?.name  || 'Client';
  const email = user?.email || '—';
  const plan  = user?.plan  || 'basic';
  const el = document.getElementById('profile-name');
  const em = document.getElementById('profile-email');
  const pl = document.getElementById('profile-plan');
  const av = document.getElementById('profile-avatar');
  if (el) el.textContent = name;
  if (em) em.textContent = email;
  if (pl) pl.textContent = plan.charAt(0).toUpperCase() + plan.slice(1);
  if (av) av.textContent = name.charAt(0).toUpperCase();
  const connName = document.getElementById('conn-user-name');
  if (connName) connName.textContent = name.charAt(0).toUpperCase();
}

// ── STATE SUBSCRIBERS ─────────────────────────────────
// When vehicleStore changes, update only what's needed.
let renderTimer = null;
onUpdate(() => {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => {
    renderVehicleList();
    updateAllKPIs();
    updateAllMarkers();
    renderAlertsFeed();
    if (selectedId) refreshSheet(selectedId);
  }, 100); // debounce — batch rapid SSE pushes
});

// ── LOAD DATA ─────────────────────────────────────────
async function loadAll() {
  try {
    const [devData, geoData] = await Promise.all([
      fetchVehicles(),
      fetchGeofences()
    ]);
    if (devData.success) {
      loadVehicles(devData.devices || []);
      renderVehicleList();
      updateAllKPIs();
    }
    if (geoData.success) {
      renderGeofences(geoData.geofences || []);
    }
  } catch (err) {
    console.error('loadAll:', err);
  }
}

// ── VIEW SWITCHING ────────────────────────────────────
let currentView = 'map';
function switchView(name) {
  currentView = name;
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById(`view-${name}`)?.classList.add('active');
  document.getElementById(`nav-${name}`)?.classList.add('active');
  if (name === 'alerts') renderAlertsFeed();
}

// ── VEHICLE SELECTION ─────────────────────────────────
function selectVehicle(id) {
  const prev = selectedId;
  setSelectedId(id);
  if (prev && vehicleStore[prev]) updateMarker(vehicleStore[prev]);
  if (vehicleStore[id])           updateMarker(vehicleStore[id]);
  renderVehicleList();
  openSheet(id);
  switchView('map');
}

function locateVehicleOnMap(id) {
  centerVehicle(id);
  switchView('map');
}

// ── LOGOUT ────────────────────────────────────────────
function logout() {
  stopRealtime();
  clearSession();
  window.location.href = '/login.html';
}

// ── MISC ACTIONS ──────────────────────────────────────
function openHistory(id)    { showToast('Historique — bientôt disponible', 'info'); }
function contactSupport()   { window.open(`https://wa.me/?text=Support Sherkall`, '_blank'); }
function reportAlert(id)    { showToast(`Alerte signalée pour ${vehicleStore[id]?.name || id}`, 'warn'); }
function refreshAll()       { loadAll(); }

// ── EXPOSE TO HTML onclick HANDLERS ──────────────────
// ES modules are not global — expose what HTML needs.
Object.assign(window, {
  switchView, logout, closeSheet, setMapLayer,
  centerAll, centerVehicle: locateVehicleOnMap,
  selectVehicle, locateVehicleOnMap,
  openHistory, contactSupport, reportAlert, refreshAll
});

// ── INIT ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  applyUserInfo();

  const vf = document.getElementById('vehicle-filter');
  if (vf) vf.addEventListener('input', renderVehicleList);

  // Vehicle list click delegation — set up ONCE here, not inside renderVehicleList
  document.getElementById('vehicle-list')?.addEventListener('click', (e) => {
    const li = e.target.closest('[data-vehicle-id]');
    if (!li) return;
    const id = li.dataset.vehicleId;
    if (e.target.closest('.locate-btn')) {
      e.stopPropagation();
      locateVehicleOnMap(id);
    } else {
      selectVehicle(id);
    }
  });

  document.getElementById('sheet-backdrop')
    ?.addEventListener('click', closeSheet);

  initMap();
  loadAll();

  initRealtime({
    onConnected: setConnected,
    onGeofence:  (alert) => {
      handleGeofenceAlert(alert);
      flashGeofence(alert.geofenceId, alert.eventType);
      renderAlertsFeed();
    }
  });
});
