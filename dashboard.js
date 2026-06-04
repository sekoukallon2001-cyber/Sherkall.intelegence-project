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

  // Wire up vehicle search filter
  const vf = document.getElementById('vehicle-filter');
  if (vf) vf.addEventListener('input', renderVehicleList);

  initMap();
  loadAll();
  startPolling();
});

// ── USER INFO ─────────────────────────────────────────
function applyUserInfo() {
  const name  = userInfo?.name  || 'Client';
  const email = userInfo?.email || '—';
  const init  = name.charAt(0).toUpperCase();

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('account-avatar', init);
  set('profile-avatar', init);
  set('profile-name',   name);
  set('profile-email',  email);
}

// ── AUTH ──────────────────────────────────────────────
function logout() {
  clearInterval(pollingTimer);
  localStorage.removeItem('sherkall_token');
  localStorage.removeItem('sherkall_user');
  window.location.href = '/login.html';
}

// ── VIEW SWITCHING ────────────────────────────────────
function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const view = document.getElementById(`view-${name}`);
  const btn  = document.getElementById(`nav-${name}`);
  if (view) view.classList.add('active');
  if (btn)  btn.classList.add('active');

  // Map needs a size refresh after being hidden
  if (name === 'map') {
    setTimeout(() => map?.invalidateSize(), 50);
  }

  // Populate feeds on switch
  if (name === 'alerts')  renderAlertsFeed();
  if (name === 'vehicles') renderVehicleList();
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

  document.querySelectorAll('.layer-fab').forEach(b => b.classList.remove('active'));
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
  }, 30000); // poll every 30s
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

    // Merge into store — preserve existing position data
    (data.devices || []).forEach(d => {
      vehicleStore[d.id] = Object.assign(vehicleStore[d.id] || {}, {
        id:         d.id,
        name:       d.name || `Véhicule ${d.id}`,
        // ── FIX: preserve backend's offline status exactly ──
        status:     d.status || 'offline',
        lastUpdate: d.lastUpdate
      });
    });

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
      v.speed   = Math.round(pos.speed  || 0);
      v.heading = Math.round(pos.course || 0);
      v.ts      = pos.fixTime;

      // ══════════════════════════════════════════════════
      // BUG FIX: NEVER override 'offline' from speed.
      //
      // Old code:
      //   if (v.speed > 2) v.status = 'online';
      //   else if (v.status !== 'offline') v.status = 'idle';
      //
      // The old code promoted an offline device to 'online'
      // if it had stale speed > 2 still sitting in the DB.
      //
      // Fix: only update moving/idle if backend says online.
      // ══════════════════════════════════════════════════
      if (v.status !== 'offline') {
        v.status = v.speed > 2 ? 'online' : 'idle';
      }

      updateMarker(v);
    });

    renderVehicleList();
    updateTopStats();
    setConnected(true);

    // Refresh open bottom sheet if vehicle is selected
    if (selectedId) refreshSheetContent(selectedId);

  } catch (err) {
    console.error('refreshPositions:', err);
    setConnected(false);
  }
}

// ── MARKERS ───────────────────────────────────────────
function vehicleColor(v) {
  if (!v) return '#8892A4';
  if (v.speed > 2)           return '#10B981'; // moving — green
  if (v.status === 'online') return '#F59E0B'; // idle   — amber
  return '#EF4444';                             // offline — red
}

function buildMarkerIcon(v) {
  const color      = vehicleColor(v);
  const isSelected = v.id === selectedId;
  const size       = isSelected ? 38 : 32;
  const ring       = isSelected
    ? `border:3px solid ${color};`
    : `border:2px solid rgba(255,255,255,0.9);`;
  const pulse = v.speed > 2
    ? `<div style="position:absolute;inset:-6px;border-radius:50%;background:${color};opacity:0.15;animation:markerPulse 2s ease-in-out infinite;"></div>`
    : '';

  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
             ${pulse}
             <div style="position:relative;width:${size}px;height:${size}px;
                         background:${color};${ring}border-radius:50%;
                         display:flex;align-items:center;justify-content:center;
                         font-size:${isSelected ? 17 : 14}px;
                         box-shadow:0 3px 10px rgba(0,0,0,0.45);">🚗</div>
           </div>`,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2]
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

// ── VEHICLE LIST (Vehicles tab) ───────────────────────
function renderVehicleList() {
  const ul = document.getElementById('vehicle-list');
  if (!ul) return;

  const q = (document.getElementById('vehicle-filter')?.value || '').toLowerCase();
  ul.innerHTML = '';

  const vehicles = Object.values(vehicleStore)
    .filter(v => !q || v.name.toLowerCase().includes(q))
    .sort((a, b) => {
      const order = { online:0, idle:1, offline:2 };
      return (order[a.status] ?? 2) - (order[b.status] ?? 2);
    });

  if (!vehicles.length) {
    ul.innerHTML = '<li style="padding:24px;text-align:center;color:var(--grey);font-size:13px;">Aucun véhicule trouvé</li>';
    return;
  }

  vehicles.forEach(v => {
    const isMoving  = v.speed > 2;
    const isOnline  = v.status === 'online' || isMoving;
    const statusCls = isMoving ? 'status-moving' : isOnline ? 'status-idle' : 'status-offline';
    const statusTxt = isMoving ? `Moving · ${v.speed} km/h` : isOnline ? 'Parked' : 'Offline';

    const ts = v.ts
      ? new Date(v.ts).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }) + ' ago'
      : '—';

    const li = document.createElement('li');
    li.className = `veh-item ${statusCls}${v.id === selectedId ? ' selected' : ''}`;
    li.innerHTML = `
      <div class="veh-item-top">
        <span class="veh-name">${v.name}</span>
        <span class="veh-ts">${ts}</span>
      </div>
      <div class="veh-status-row">
        <span class="veh-status-dot"></span>
        <span class="veh-status-text">${statusTxt}</span>
      </div>
      <div class="veh-item-bottom">
        <div class="veh-meta">
          <div class="veh-meta-item">
            <span class="veh-meta-label">Speed</span>
            <span class="veh-meta-value">${v.speed || 0} km/h</span>
          </div>
          <div class="veh-meta-item">
            <span class="veh-meta-label">Signal</span>
            <span class="veh-meta-value">${v.status === 'offline' ? '—' : 'OK'}</span>
          </div>
        </div>
        <div class="veh-actions">
          <button class="veh-action-btn" title="Locate on map"
            onclick="event.stopPropagation(); locateVehicleOnMap('${v.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="10" r="3"/>
              <path d="M12 2a8 8 0 010 16m0 0v4"/>
            </svg>
          </button>
          <button class="veh-action-btn" title="History"
            onclick="event.stopPropagation(); openHistory('${v.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
          </button>
        </div>
      </div>`;
    li.onclick = () => selectVehicle(v.id);
    ul.appendChild(li);
  });

  // Update KPI counters
  const active  = vehicles.filter(v => v.status !== 'offline').length;
  const alertCt = vehicles.filter(v => v.speed > 90).length;
  const setEl   = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('kpi-active', active);
  setEl('kpi-alerts', alertCt);
}

// ── VEHICLE SELECTION ─────────────────────────────────
function selectVehicle(id) {
  const prev = selectedId;
  selectedId = id;

  if (prev && vehicleStore[prev]) updateMarker(vehicleStore[prev]);
  if (vehicleStore[id])           updateMarker(vehicleStore[id]);

  const v = vehicleStore[id];
  if (v?.lat && v?.lon) {
    // Switch to map view and pan to vehicle
    switchView('map');
    map.setView([v.lat, v.lon], Math.max(map.getZoom(), 15), { animate: true });
  }

  renderVehicleList();
  openSheet(id);
}

// ── BOTTOM SHEET ──────────────────────────────────────
function openSheet(id) {
  const sheet    = document.getElementById('vehicle-sheet');
  const backdrop = document.getElementById('sheet-backdrop');
  if (sheet)    sheet.classList.add('open');
  if (backdrop) backdrop.classList.add('show');
  refreshSheetContent(id);
}

function closeSheet() {
  document.getElementById('vehicle-sheet')?.classList.remove('open');
  document.getElementById('sheet-backdrop')?.classList.remove('show');
}

function refreshSheetContent(id) {
  const el = document.getElementById('sheet-body');
  const v  = vehicleStore[id];
  if (!el || !v) return;

  const isMoving  = v.speed > 2;
  const statusKey = isMoving ? 'moving' : (v.status === 'online' ? 'idle' : 'offline');
  const statusLbl = statusKey === 'moving' ? 'En mouvement' : statusKey === 'idle' ? 'En veille' : 'Hors ligne';
  const ts = v.ts
    ? new Date(v.ts).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
    : '—';

  el.innerHTML = `
    <div class="vehicle-card-header">
      <div class="vehicle-card-name">${v.name}</div>
      <span class="status-badge status-${statusKey}">${statusLbl}</span>
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
        <div style="font-size:12px;color:var(--grey);padding:6px 0;">Chargement...</div>
      </div>
    </div>`;

  loadHistory(id);
}

// ── HISTORY ───────────────────────────────────────────
function loadHistory(id) {
  const container = document.getElementById(`history-list-${id}`);
  if (!container) return;

  const v = vehicleStore[id];
  const entries = [];

  if (v?.ts) {
    const diffMin = Math.round((Date.now() - new Date(v.ts)) / 60000);
    const label   = v.speed > 2 ? 'En mouvement' : 'Arrêt détecté';
    const cls     = v.speed > 2 ? 'event-move' : 'event-stop';
    entries.push({ cls, text: label, time: `il y a ${diffMin < 1 ? '<1' : diffMin} min` });
  }

  if (!entries.length) {
    container.innerHTML = '<div style="font-size:12px;color:var(--grey);">Aucune activité récente</div>';
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

// ── ALERTS FEED ───────────────────────────────────────
function renderAlertsFeed() {
  const feed = document.getElementById('alerts-feed');
  if (!feed) return;

  const items = [];

  Object.values(vehicleStore).forEach(v => {
    const ts = v.ts
      ? new Date(v.ts).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
      : '--:--:--';

    if (v.speed > 90) {
      items.push({ type:'critical', icon:'⚡', badge:'Critical', ts,
        title: `Speeding: ${v.name}`,
        desc:  `Detected at ${v.speed} km/h.`, id: v.id });
    }

    if (v.status === 'offline') {
      items.push({ type:'system', icon:'📡', badge:'System', ts,
        title: `Signal Lost: ${v.name}`,
        desc:  'Telemetry signal lost. Last known position on map.', id: v.id });
    }

    if (v.speed > 2 && v.speed <= 90) {
      items.push({ type:'info', icon:'🚗', badge:'Movement', ts,
        title: `Moving: ${v.name}`,
        desc:  `Currently at ${v.speed} km/h.`, id: v.id });
    }
  });

  // Update nav badge
  const critCount = items.filter(a => a.type === 'critical').length;
  const badge = document.getElementById('nav-badge-alerts');
  if (badge) {
    badge.textContent = critCount;
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
          <span class="alert-badge">${a.badge}</span>
          <div class="alert-ts">${a.ts}</div>
        </div>
      </div>
      <div class="alert-title">${a.title}</div>
      <div class="alert-desc">${a.desc}</div>
      <button class="alert-view-btn" onclick="viewAlertOnMap('${a.id}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
          <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
        </svg>
        View on Map
      </button>
    </div>`).join('');
}

function viewAlertOnMap(id) {
  selectVehicle(id);
  switchView('map');
}

// ── TOP STATS (HUD bar over map) ──────────────────────
function updateTopStats() {
  let moving = 0, idle = 0, offline = 0;
  Object.values(vehicleStore).forEach(v => {
    if (v.speed > 2)           moving++;
    else if (v.status === 'online') idle++;
    else                            offline++;
  });
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('stat-moving',  moving);
  set('stat-idle',    idle);
  set('stat-offline', offline);
}

// ── CONNECTION ────────────────────────────────────────
function setConnected(connected) {
  const pill  = document.getElementById('conn-indicator');
  const label = document.getElementById('conn-label');
  if (!pill || !label) return;
  pill.className = `conn-pill ${connected ? 'connected' : 'error'}`;
  label.textContent = connected ? 'En ligne' : 'Hors ligne';
}

// ── MAP ACTIONS ───────────────────────────────────────
function centerVehicle(id) {
  const v = vehicleStore[id];
  if (v?.lat && v?.lon) {
    switchView('map');
    map.setView([v.lat, v.lon], 17, { animate: true });
  }
}

function locateVehicleOnMap(id) {
  selectVehicle(id);
}

function centerAll() {
  const locs = Object.values(vehicleStore).filter(v => v.lat && v.lon).map(v => [v.lat, v.lon]);
  if (locs.length === 1) { map.setView(locs[0], 15, { animate: true }); }
  if (locs.length  >  1) { map.fitBounds(locs, { maxZoom: 14, padding: [50, 50] }); }
}

// ── MISC ACTIONS ──────────────────────────────────────
function openHistory(id) {
  showAlert('📜 Historique détaillé — bientôt disponible', '');
}

function reportAlert(id) {
  const v = vehicleStore[id];
  showAlert(`🚨 Signalement enregistré pour ${v?.name || id}`, 'danger');
}

function contactSupport() {
  window.open(
    'https://wa.me/224629255946?text=Bonjour%20Sherkall%20Intelligence%2C%20j%27ai%20besoin%20d%27assistance%20sur%20mon%20tableau%20de%20bord.',
    '_blank'
  );
}

// ── TOAST ALERTS ──────────────────────────────────────
function showAlert(msg, type) {
  const container = document.getElementById('alerts');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `alert-toast ${type || ''}`;
  toast.textContent = msg;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity   = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
