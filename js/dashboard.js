// =====================================================
// SHERKALL INTELLIGENCE — DASHBOARD ORCHESTRATOR
// js/dashboard.js
// =====================================================
// Imports all modules and wires them together.
// No logic lives here — only coordination.

import { requireRole, clearSession } from './auth.js';
import { fetchVehicles, fetchPositions, fetchGeofences } from './api.js';
import { vehicleStore, selectedId, setSelectedId, loadVehicles, processPositions, onUpdate } from './state.js';
import { initRealtime, stopRealtime } from './realtime.js';
import { initMap, setMapLayer, updateMarker, updateAllMarkers, centerVehicle, centerAll, renderGeofences, flashGeofence, flushPendingGeofences, zoomIn, zoomOut } from './map.js';
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

  // Profile section
  const profName   = document.getElementById('profile-name');
  const profEmail  = document.getElementById('profile-email');
  const profAvatar = document.getElementById('profile-avatar');
  if (profName)   profName.textContent   = name;
  if (profEmail)  profEmail.textContent  = email;
  if (profAvatar) profAvatar.textContent = name.charAt(0).toUpperCase();

  // Topbar avatar — actual element ID is account-avatar (not conn-user-name)
  const topAvatar = document.getElementById('account-avatar');
  if (topAvatar) topAvatar.textContent = name.charAt(0).toUpperCase();
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
    const [devData, posData, geoData] = await Promise.all([
      fetchVehicles(),
      fetchPositions(),
      fetchGeofences()
    ]);

    // Load vehicles FIRST — creates vehicleStore entries
    if (devData.success) {
      loadVehicles(devData.devices || []);
    }

    // Process positions AFTER vehicles exist in store
    if (posData.success) {
      processPositions(posData.positions || []);
    }

    // Render geofences — queued internally if map not ready yet
    if (geoData.success) {
      renderGeofences(geoData.geofences || []);
    }

    renderVehicleList();
    updateAllKPIs();

  } catch (err) {
    console.error('loadAll:', err);
  }
}

// ── VIEW SWITCHING ────────────────────────────────────
let currentView = 'map';
function switchView(name) {
  currentView = name;
  document.querySelectorAll('.view').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`view-${name}`)?.classList.add('active');
  document.getElementById(`nav-${name}`)?.classList.add('active');
  if (name === 'alerts') renderAlertsFeed();
  // Recalculate map size when map view becomes visible
  // Leaflet needs this because the container may have had zero height on init
  if (name === 'map' && map) {
    setTimeout(() => map.invalidateSize({ animate: false }), 50);
  }
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
  openHistory, contactSupport, reportAlert, refreshAll,
  zoomIn, zoomOut  // needed by HTML onclick="zoomIn()" / "zoomOut()"
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
  flushPendingGeofences(); // render any geofences that loaded before map was ready
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
