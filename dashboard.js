// =====================================================
// SHERKALL INTELLIGENCE — DASHBOARD JS
// =====================================================

const BACKEND_URL = 'https://sherkall-backend-production.up.railway.app';
const TILE_LAYERS = {
  street:    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  dark:      'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png'
};

// ── STATE ────────────────────────────────────────────
let map, tileLayer;
let vehicleStore  = {};
let markers       = {};
let selectedId    = null;
let authToken     = null;
let userInfo      = null;
let pollingTimer  = null;
let isConnected   = false;

// ── INIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  authToken = localStorage.getItem('sherkall_token');
  const userStr = localStorage.getItem('sherkall_user');

  if (!authToken || !userStr) {
    window.location.href = '/login.html';
    return;
  }

  userInfo = JSON.parse(userStr);
  applyUserInfo();

  // Wire up search filter
  const vf = document.getElementById('vehicle-filter');
  if (vf) vf.addEventListener('input', renderVehicleList);

  initMap();
  loadAll();
  startPolling();
});

// ── USER INFO ─────────────────────────────────────────
function applyUserInfo() {
  const name = userInfo.name || 'Client';
  const el = document.getElementById('client-name');
  if (el) el.textContent = name;

  // Set avatar initial
  const av = document.getElementById('account-avatar');
  if (av) av.textContent = name.charAt(0).toUpperCase();
}

// ── AUTH ──────────────────────────────────────────────
function logout() {
  clearInterval(pollingTimer);
  localStorage.removeItem('sherkall_token');
  localStorage.removeItem('sherkall_user');
  window.location.href = '/login.html';
}

// ── MAP ───────────────────────────────────────────────
function initMap() {
  map = L.map('map', {
    zoomControl: false,
    attributionControl: true
  }).setView([9.538, -13.677], 12);

  tileLayer = L.tileLayer(TILE_LAYERS.street, {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);
}

function setMapLayer(type, btn) {
  if (tileLayer) map.removeLayer(tileLayer);
  tileLayer = L.tileLayer(TILE_LAYERS[type], {
    maxZoom: 19,
    attribution: type === 'street' ? '© OpenStreetMap' : '© Esri / Stadia'
  }).addTo(map);

  document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

// ── DATA LOADING ──────────────────────────────────────
async function loadAll() {
  await refreshVehicles();
  await refreshPositions();
  setConnected(true);
}

async function refreshAll() {
  await loadAll();
  showAlert('✅ Données actualisées', 'success');
}

function startPolling() {
  pollingTimer = setInterval(async () => {
    await refreshPositions();
    updateLastRefresh();
  }, 30000);
}

// ── VEHICLES ──────────────────────────────────────────
async function refreshVehicles() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/vehicles`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (res.status === 401) { logout(); return; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    // Merge into store (preserve position data already fetched)
    (data.devices || []).forEach(d => {
      vehicleStore[d.id] = Object.assign(vehicleStore[d.id] || {}, {
        id:         d.id,
        name:       d.name || `Véhicule ${d.id}`,
        status:     d.status || 'offline',
        lastUpdate: d.lastUpdate
      });
    });

    updateVehicleCount();
    renderVehicleList();
    updateTopStats();

  } catch (err) {
    console.error('refreshVehicles:', err);
    setConnected(false);
    showAlert('⚠️ Impossible de charger la flotte', 'danger');
  }
}

// ── POSITIONS ─────────────────────────────────────────
async function refreshPositions() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/vehicles/positions`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!res.ok) return;

    const data = await res.json();
    if (!data.success) return;

    (data.positions || []).forEach(pos => {
      const v = vehicleStore[pos.deviceId];
      if (!v) return;
      v.lat     = pos.latitude;
      v.lon     = pos.longitude;
      v.speed   = Math.round(pos.speed   || 0);
      v.heading = Math.round(pos.course  || 0);
      v.ts      = pos.fixTime;

      // Derive status from speed
      if (v.speed > 2)       v.status = 'online';   // moving
      else if (v.status !== 'offline') v.status = 'idle';

      updateMarker(v);
    });

    renderVehicleList();
    updateTopStats();
    setConnected(true);
    updateLastRefresh();

    if (selectedId) {
      refreshDetailPanel(selectedId);
      updateSpeedHUD(vehicleStore[selectedId]);
    }

  } catch (err) {
    console.error('refreshPositions:', err);
    setConnected(false);
  }
}

// ── MARKERS ───────────────────────────────────────────
function vehicleColor(v) {
  if (!v) return '#8892A4';
  if (v.speed > 2)            return '#10B981'; // moving — green
  if (v.status === 'online')  return '#F59E0B'; // idle   — amber
  return '#EF4444';                              // offline — red
}

function buildMarkerIcon(v) {
  const color   = vehicleColor(v);
  const isSelected = v.id === selectedId;
  const size    = isSelected ? 38 : 32;
  const ring    = isSelected ? `border:3px solid ${color};` : `border:2px solid rgba(255,255,255,0.9);`;
  const pulse   = v.speed > 2
    ? `<div style="position:absolute;inset:-6px;border-radius:50%;background:${color};opacity:0.15;animation:markerPulse 2s ease-in-out infinite;"></div>` : '';

  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
             ${pulse}
             <div style="position:relative;width:${size}px;height:${size}px;background:${color};${ring}border-radius:50%;
                         display:flex;align-items:center;justify-content:center;
                         font-size:${isSelected ? 17 : 14}px;
                         box-shadow:0 3px 10px rgba(0,0,0,0.45);">🚗</div>
           </div>`,
    iconSize:   [size, size],
    iconAnchor: [size/2, size/2]
  });
}

function updateMarker(v) {
  if (!v.lat || !v.lon) return;

  const latlng = [v.lat, v.lon];
  const icon   = buildMarkerIcon(v);

  if (markers[v.id]) {
    markers[v.id].setLatLng(latlng).setIcon(icon);
  } else {
    const m = L.marker(latlng, { icon }).addTo(map);
    m.on('click', () => selectVehicle(v.id));
    m.bindTooltip(`<strong>${v.name}</strong>`, { sticky: false });
    markers[v.id] = m;
  }
}

// ── VEHICLE LIST ──────────────────────────────────────
function renderVehicleList() {
  const ul = document.getElementById('vehicle-list');
  if (!ul) return;

  const q = (document.getElementById('vehicle-filter')?.value || '').toLowerCase();
  ul.innerHTML = '';

  const vehicles = Object.values(vehicleStore)
    .filter(v => !q || v.name.toLowerCase().includes(q))
    .sort((a, b) => {
      const order = { online:0, idle:1, offline:2 };
      return (order[a.status]||2) - (order[b.status]||2);
    });

  if (!vehicles.length) {
    ul.innerHTML = '<li style="padding:14px;text-align:center;color:var(--grey);font-size:12px;">Aucun véhicule trouvé</li>';
    return;
  }

  vehicles.forEach(v => {
    const status   = v.speed > 2 ? 'moving' : (v.status === 'online' ? 'idle' : 'offline');
    const statusLbl = status === 'moving' ? '● EN MOUVEMENT' : status === 'idle' ? '● EN VEILLE' : '● HORS LIGNE';

    const li = document.createElement('li');
    li.className = selectedId === v.id ? 'active' : '';
    li.innerHTML = `
      <div class="vehicle-name">${v.name}</div>
      <div class="vehicle-meta">
        <span class="status-badge status-${status}">${statusLbl}</span>
        <span class="vehicle-speed">${v.speed || 0} km/h</span>
      </div>`;
    li.onclick = () => selectVehicle(v.id);
    ul.appendChild(li);
  });
}

// ── VEHICLE SELECTION ─────────────────────────────────
function selectVehicle(id) {
  const prev = selectedId;
  selectedId = id;

  // Refresh icon of previously selected vehicle
  if (prev && vehicleStore[prev]) updateMarker(vehicleStore[prev]);
  // Update new icon
  if (vehicleStore[id]) updateMarker(vehicleStore[id]);

  const v = vehicleStore[id];
  if (v?.lat && v?.lon) {
    map.setView([v.lat, v.lon], Math.max(map.getZoom(), 15), { animate: true });
  }

  renderVehicleList();
  refreshDetailPanel(id);
  updateSpeedHUD(v);

  // Mobile: show detail panel as bottom sheet
  document.getElementById('detail-panel')?.classList.add('mobile-show');
}

// ── DETAIL PANEL ──────────────────────────────────────
function refreshDetailPanel(id) {
  const v  = vehicleStore[id];
  const el = document.getElementById('detail-body');
  if (!el || !v) return;

  const status    = v.speed > 2 ? 'moving' : (v.status === 'online' ? 'idle' : 'offline');
  const statusLbl = status === 'moving' ? 'En mouvement' : status === 'idle' ? 'En veille' : 'Hors ligne';
  const statusBadgeCls = `status-${status}`;

  // Update header subtitle & dot
  const sub = document.getElementById('detail-subtitle');
  if (sub) sub.textContent = v.name;
  const dot = document.getElementById('detail-status-dot');
  if (dot) { dot.className = `detail-status-dot ${status}`; }

  const ts = v.ts ? new Date(v.ts).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit' }) : '—';

  el.innerHTML = `
    <div class="vehicle-card-header">
      <div class="vehicle-card-name">${v.name}</div>
      <div class="vehicle-card-status">
        <span class="status-badge ${statusBadgeCls}">${statusLbl}</span>
      </div>
    </div>

    <div class="telem-grid">
      <div class="telem-card">
        <div class="telem-icon">⚡</div>
        <div class="telem-value">${v.speed || 0}</div>
        <div class="telem-unit">km/h</div>
        <div class="telem-label">Vitesse</div>
      </div>
      <div class="telem-card">
        <div class="telem-icon">🧭</div>
        <div class="telem-value">${v.heading || 0}</div>
        <div class="telem-unit">°</div>
        <div class="telem-label">Direction</div>
      </div>
    </div>

    ${v.lat && v.lon ? `
    <div class="coords-block">
      <div class="coords-row">
        <span class="coords-label">LAT</span>
        <span class="coords-value">${v.lat.toFixed(6)}</span>
      </div>
      <div class="coords-row">
        <span class="coords-label">LNG</span>
        <span class="coords-value">${v.lon.toFixed(6)}</span>
      </div>
    </div>` : ''}

    <div class="last-update-row">
      <span>Dernière mise à jour</span>
      <span>${ts}</span>
    </div>

    <div class="detail-actions">
      <button class="detail-action-btn" onclick="centerVehicle('${id}')">
        <span class="btn-icon">📍</span>Centrer
      </button>
      <button class="detail-action-btn" onclick="openHistory('${id}')">
        <span class="btn-icon">📜</span>Historique
      </button>
      <button class="detail-action-btn support" onclick="contactSupport()">
        <span class="btn-icon">💬</span>Support
      </button>
      <button class="detail-action-btn danger" onclick="reportAlert('${id}')">
        <span class="btn-icon">🚨</span>Signaler
      </button>
    </div>

    <div class="history-section">
      <div class="history-title">Activité récente</div>
      <div id="history-list-${id}">
        <div style="font-size:12px;color:var(--grey);padding:8px 0;">
          Chargement de l'historique...
        </div>
      </div>
    </div>`;

  // Load history entries asynchronously
  loadHistory(id);
}

// ── HISTORY ───────────────────────────────────────────
function loadHistory(id) {
  const container = document.getElementById(`history-list-${id}`);
  if (!container) return;

  const v = vehicleStore[id];
  const entries = [];

  if (v?.ts) {
    const now = new Date();
    const last = new Date(v.ts);
    const diffMin = Math.round((now - last) / 60000);
    const label = v.speed > 2 ? 'En mouvement' : 'Arrêt détecté';
    const cls   = v.speed > 2 ? 'event-move'   : 'event-stop';
    entries.push({ cls, text: label, time: `il y a ${diffMin < 1 ? '<1' : diffMin} min` });
  }

  if (!entries.length) {
    container.innerHTML = '<div style="font-size:12px;color:var(--grey);padding:4px 0;">Aucune activité récente</div>';
    return;
  }

  container.innerHTML = entries.map(e => `
    <div class="history-item">
      <div class="history-dot ${e.cls}"></div>
      <div>
        <div class="history-text">${e.text}</div>
        <div class="history-time">${e.time}</div>
      </div>
    </div>`).join('');
}

// ── SPEED HUD ─────────────────────────────────────────
function updateSpeedHUD(v) {
  const hud   = document.getElementById('speed-hud');
  const value = document.getElementById('speed-value');
  if (!hud || !value) return;

  if (v && v.lat) {
    hud.style.display = 'block';
    value.textContent = v.speed || 0;
  } else {
    hud.style.display = 'none';
  }
}

// ── TOP STATS ─────────────────────────────────────────
function updateTopStats() {
  let moving = 0, idle = 0, offline = 0;
  Object.values(vehicleStore).forEach(v => {
    if (v.speed > 2)            moving++;
    else if (v.status === 'online') idle++;
    else                            offline++;
  });
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('stat-moving',  moving);
  set('stat-idle',    idle);
  set('stat-offline', offline);
}

function updateVehicleCount() {
  const total = Object.keys(vehicleStore).length;
  const el = document.getElementById('vehicle-count');
  if (el) el.textContent = total;

  // Subscription progress
  const used = document.getElementById('sub-vehicles-used');
  const bar  = document.getElementById('sub-progress-bar');
  if (used) used.textContent = total;
  if (bar)  bar.style.width = Math.min(100, (total / 20) * 100) + '%';
}

// ── CONNECTION STATUS ─────────────────────────────────
function setConnected(connected) {
  isConnected = connected;
  const ind   = document.getElementById('conn-indicator');
  const label = document.getElementById('conn-label');
  if (!ind || !label) return;
  ind.className   = `connection-indicator ${connected ? 'connected' : 'error'}`;
  label.textContent = connected ? 'En ligne' : 'Hors ligne';
}

// ── LAST REFRESH ──────────────────────────────────────
function updateLastRefresh() {
  const el = document.getElementById('last-refresh-time');
  if (el) el.textContent = new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
}

// ── ACTIONS ───────────────────────────────────────────
function centerVehicle(id) {
  const v = vehicleStore[id];
  if (v?.lat && v?.lon) map.setView([v.lat, v.lon], 17, { animate: true });
}

function centerAll() {
  const locs = Object.values(vehicleStore).filter(v => v.lat && v.lon).map(v => [v.lat, v.lon]);
  if (locs.length === 1) { map.setView(locs[0], 15, { animate: true }); return; }
  if (locs.length > 1)   { map.fitBounds(locs, { maxZoom: 14, padding: [50, 50] }); }
}

function openHistory(id) {
  showAlert('📜 Historique détaillé — bientôt disponible', '');
}

function reportAlert(id) {
  const v = vehicleStore[id];
  showAlert(`🚨 Signalement enregistré pour ${v?.name || id}`, 'danger');
}

function contactSupport() {
  window.open('https://wa.me/224629255946?text=Bonjour%20Sherkall%20Intelligence%2C%20j%27ai%20besoin%20d%27assistance%20sur%20mon%20tableau%20de%20bord.', '_blank');
}

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('hidden');
}

// ── ALERTS / TOASTS ───────────────────────────────────
function showAlert(msg, type) {
  const container = document.getElementById('alerts');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `alert-toast ${type || ''}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}