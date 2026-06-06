// =====================================================
// SHERKALL INTELLIGENCE — DASHBOARD JS
// =====================================================
// Enhanced with security hardening & performance optimizations

// ── CONFIG ───────────────────────────────────────────
const CONFIG = {
  SPEED_THRESHOLD: 3,              // km/h — separates moving from idle
  ONLINE_WINDOW_MS: 90 * 1000, // 90 seconds — GPS freshness threshold
  SPEEDING_THRESHOLD: 90,          // km/h — alert trigger
  POLLING_INTERVAL: 3000,          // ms — fallback polling rate
  RETRY_DELAY: 3000,               // ms — SSE reconnection delay
  RENDER_DEBOUNCE: 100,            // ms — batch UI updates
  MAX_VEHICLES_VIRTUAL_SCROLL: 50  // Virtual scroll threshold
};

const BACKEND_URL = 'https://sherkall-backend-production.up.railway.app';

const TILE_LAYERS = {
  street: {
    url:     'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: { maxZoom: 19, attribution: '© OpenStreetMap', subdomains: 'abc' }
  },
  satellite: {
    url:     'https://mt{s}.google.com/vt/lyrs=y&hl=fr&x={x}&y={y}&z={z}',
    options: { maxZoom: 20, attribution: '© Google', subdomains: ['0','1','2','3'] }
  }
};

// ── STATE ────────────────────────────────────────────
let map, tileLayer;
let vehicleStore  = {};
let markers       = {};
let markerIconCache = {};  // NEW: Cache icons by color to avoid rebuilding
let selectedId    = null;
let authToken     = null;
let userInfo      = null;
let csrfToken     = null;  // NEW: CSRF token for API calls
let pollingTimer  = null;
let sseConnection = null;
let renderTimeout = null;

// ── DOM CACHE ────────────────────────────────────────
const DOM = {
  vehicleList: null,
  vehicleFilter: null,
  vehicleSheet: null,
  sheetBackdrop: null,
  sheetBody: null,
  alertsFeed: null,
  connIndicator: null,
  connLabel: null,
  alertsContainer: null,

  init() {
    this.vehicleList = document.getElementById('vehicle-list');
    this.vehicleFilter = document.getElementById('vehicle-filter');
    this.vehicleSheet = document.getElementById('vehicle-sheet');
    this.sheetBackdrop = document.getElementById('sheet-backdrop');
    this.sheetBody = document.getElementById('sheet-body');
    this.alertsFeed = document.getElementById('alerts-feed');
    this.connIndicator = document.getElementById('conn-indicator');
    this.connLabel = document.getElementById('conn-label');
    this.alertsContainer = document.getElementById('alerts');

    // Set up vehicle list event delegation ONCE here, not inside renderVehicleList()
    // Prevents hundreds of duplicate listeners building up over time
    if (this.vehicleList) {
      this.vehicleList.addEventListener('click', (e) => {
        const li = e.target.closest('li.veh-item');
        if (!li) return;
        const vehicleId = li.dataset.vehicleId;
        if (e.target.closest('.locate-btn')) {
          e.stopPropagation();
          locateVehicleOnMap(vehicleId);
        } else if (e.target.closest('.history-btn')) {
          e.stopPropagation();
          openHistory(vehicleId);
        } else {
          selectVehicle(vehicleId);
        }
      });
    }
  },

  setElement(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }
};

// ── INIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  authToken = localStorage.getItem('sherkall_token');
  const userStr = localStorage.getItem('sherkall_user');

  if (!authToken || !userStr) {
    window.location.href = '/login.html';
    return;
  }

  try {
  userInfo = JSON.parse(userStr);

  if (!userInfo || typeof userInfo !== 'object') {
    throw new Error('Invalid user structure');
  }

} catch (err) {
  console.error('Failed to parse user info:', err);
  logout();
  return;
}
  
  // NEW: Retrieve CSRF token from meta tag or request it from backend
  const csrfMeta = document.querySelector('meta[name="csrf-token"]');
  if (csrfMeta) {
    csrfToken = csrfMeta.getAttribute('content');
  } else {
    console.warn('CSRF token not found. Add <meta name="csrf-token" content="..."> to HTML head.');
  }

  DOM.init();
  applyUserInfo();

  // Wire up vehicle search filter with debouncing to prevent excessive renders
  if (DOM.vehicleFilter) {
    let filterTimeout;
    DOM.vehicleFilter.addEventListener('input', () => {
      clearTimeout(filterTimeout);
      filterTimeout = setTimeout(() => {
        renderVehicleList();
      }, 300); // 300ms debounce for filter input
    });
  }

  initMap();
  loadAll();
  startRealtime(); // SSE push — replaces polling
});

// ── USER INFO ─────────────────────────────────────────
function applyUserInfo() {
  const name  = userInfo?.name  || 'Client';
  const email = userInfo?.email || '—';
  const init  = name.charAt(0).toUpperCase();

  DOM.setElement('account-avatar', init);
  DOM.setElement('profile-avatar', init);
  DOM.setElement('profile-name', name);
  DOM.setElement('profile-email', email);
}

// ── AUTH ──────────────────────────────────────────────
function logout() {
  clearInterval(pollingTimer);
  clearTimeout(renderTimeout);
  if (sseConnection) { 
    sseConnection.close(); 
    sseConnection = null; 
  }
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

  const layer = TILE_LAYERS.street;
  tileLayer = L.tileLayer(layer.url, layer.options).addTo(map);
}

function setMapLayer(type, btn) {
  if (tileLayer) map.removeLayer(tileLayer);
  const layer = TILE_LAYERS[type];
  if (!layer) return;
  tileLayer = L.tileLayer(layer.url, layer.options).addTo(map);
  document.querySelectorAll('.layer-fab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

// ── STATUS COMPUTATION ───────────────────────────────
// Single source of truth for vehicle status
function getVehicleStatus(v) {
  if (!v.ts) return 'offline';
  
  const ageMs = Date.now() - new Date(v.ts).getTime();
  const isRecent = ageMs < CONFIG.ONLINE_WINDOW_MS;
  
  if (!isRecent) return 'offline';
  return v.speed > CONFIG.SPEED_THRESHOLD ? 'online' : 'idle';
}

// ── REALTIME — SSE PUSH ───────────────────────────────
// Railway polls Traccar every 5s and pushes updates here instantly.
// Dashboard holds one persistent connection — no repeated API calls.

function startRealtime() {
  const url = `${BACKEND_URL}/api/vehicles/stream?token=${encodeURIComponent(authToken)}`;

  try {
    sseConnection = new EventSource(url);

    sseConnection.onopen = () => {
      console.log('✅ SSE realtime connected');
      setConnected(true);
    };

    sseConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.positions) processPositions(data);
      } catch (err) {
        console.warn('Failed to parse SSE message:', err);
      }
    };

    sseConnection.onerror = () => {
      console.warn('SSE dropped — falling back to 5s polling');
      sseConnection?.close();
      sseConnection = null;
      setConnected(false);
      clearInterval(pollingTimer);
      pollingTimer = null;
      setTimeout(startPolling, CONFIG.RETRY_DELAY);
    };

  } catch (err) {
    console.error('EventSource not supported:', err);
    startPolling(); // Fallback
  }
}

// Polling fallback (used only if SSE fails)
function startPolling() {
  if (sseConnection) return; // SSE already running
  pollingTimer = setInterval(async () => {
    await refreshPositions();
  }, CONFIG.POLLING_INTERVAL);
}

// ── DATA LOADING ──────────────────────────────────────
async function loadAll() {
  await refreshVehicles();
  await refreshPositions(); // initial load before SSE connects
  setConnected(true);
}

// ── API HELPER — CSRF PROTECTION ──────────────────────
// NEW: Helper function to add CSRF token to fetch requests
function createFetchHeaders() {
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };
  
  // Add CSRF token if available (should be sent by backend on initial page load)
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  
  return headers;
}

// ── VEHICLES ──────────────────────────────────────────
async function refreshVehicles() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/vehicles`, {
      headers: createFetchHeaders()
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
        lastUpdate: d.lastUpdate
      });
    });

    queueRender();

  } catch (err) {
    console.error('refreshVehicles:', err);
    setConnected(false);
    showAlert('⚠️ Impossible de charger la flotte', 'danger');
  }
}

// ── POSITIONS ─────────────────────────────────────────
// processPositions: shared handler for both SSE push and polling fallback
function processPositions(data) {
  (data.positions || []).forEach(pos => {
    const v = vehicleStore[pos.deviceId];
    if (!v) return;

    v.lat     = pos.latitude;
    v.lon     = pos.longitude;
    v.speed   = Math.round(pos.speed  || 0);
    v.heading = Math.round(pos.course || 0);
    v.ts      = pos.fixTime;

    updateMarker(v);
  });

  setConnected(true);
  queueRender();
}

async function refreshPositions() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/vehicles/positions`, {
      headers: createFetchHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    processPositions(data);
  } catch (err) {
    console.error('refreshPositions:', err);
    setConnected(false);
  }
}

// ── RENDER DEBOUNCING ────────────────────────────────
// Batch UI updates to avoid excessive reflows
function queueRender() {
  clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => {
    renderVehicleList();
    updateTopStats();
    if (selectedId) refreshSheetContent(selectedId);
  }, CONFIG.RENDER_DEBOUNCE);
}

// ── MARKERS ───────────────────────────────────────────
function vehicleColor(v) {
  if (!v) return '#8892A4';
  const status = getVehicleStatus(v);
  if (v.speed > CONFIG.SPEED_THRESHOLD) return '#10B981'; // moving  — green
  if (status === 'online' || status === 'idle')  return '#F59E0B'; // parked  — amber
  return '#EF4444';                                                   // offline — red
}

// NEW: Build marker icon with caching to avoid rebuilding identical icons
function buildMarkerIcon(v) {
  const color      = vehicleColor(v);
  const isSelected = v.id === selectedId;
  const size       = isSelected ? 44 : 36;
  
  // NEW: Check cache first
  const cacheKey = `${color}-${isSelected}`;
  if (markerIconCache[cacheKey]) {
    return markerIconCache[cacheKey];
  }

  const shadow     = isSelected
    ? `0 0 0 3px ${color}, 0 4px 14px rgba(0,0,0,0.4)`
    : `0 2px 10px rgba(0,0,0,0.3)`;
  const glow = v.speed > CONFIG.SPEED_THRESHOLD
    ? `<div style="position:absolute;inset:-6px;border-radius:50%;background:${color};opacity:0.15;animation:markerPulse 2s ease-in-out infinite;"></div>`
    : '';
  const iconSize = Math.round(size * 0.52);

  const icon = L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
      ${glow}
      <div style="
        position:absolute;inset:0;
        background:#ffffff;
        border:2.5px solid ${color};
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        box-shadow:${shadow};
      ">
        <svg viewBox="0 0 24 24" width="${iconSize}" height="${iconSize}" fill="${color}">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    </div>`,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2]
  });

  // NEW: Cache the icon
  markerIconCache[cacheKey] = icon;
  return icon;
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
    // NEW: Escape vehicle name in tooltip
    m.bindTooltip(escapeHtml(v.name), { sticky: false });
    markers[v.id] = m;
  }
}

// ── VEHICLE LIST (Vehicles tab) ───────────────────────
function renderVehicleList() {
  if (!DOM.vehicleList) return;

  const q = (DOM.vehicleFilter?.value || '').toLowerCase();
  DOM.vehicleList.innerHTML = '';

  const vehicles = Object.values(vehicleStore)
    .filter(v => !q || v.name.toLowerCase().includes(q))
    .sort((a, b) => {
      const order = { online:0, idle:1, offline:2 };
      return (order[getVehicleStatus(a)] ?? 2) - (order[getVehicleStatus(b)] ?? 2);
    });

  if (!vehicles.length) {
    DOM.vehicleList.innerHTML = '<li style="padding:24px;text-align:center;color:var(--grey);font-size:13px;">Aucun véhicule trouvé</li>';
    return;
  }

  // NEW: Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();

  vehicles.forEach(v => {
    const status    = getVehicleStatus(v);
    const isMoving  = v.speed > CONFIG.SPEED_THRESHOLD;
    const isOnline  = status === 'online' || status === 'idle';
    const statusCls = isMoving ? 'status-moving' : isOnline ? 'status-idle' : 'status-offline';
    const statusTxt = isMoving ? `Moving · ${v.speed} km/h` : isOnline ? 'Parked' : 'Offline';

    const ts = v.ts
      ? new Date(v.ts).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }) + ' ago'
      : '—';

    const li = document.createElement('li');
    li.className = `veh-item ${statusCls}${v.id === selectedId ? ' selected' : ''}`;
    li.dataset.vehicleId = v.id; // NEW: Store ID in data attribute for event delegation
    
    // Build HTML safely
    li.innerHTML = `
      <div class="veh-item-top">
        <span class="veh-name"></span>
        <span class="veh-ts">${escapeHtml(ts)}</span>
      </div>
      <div class="veh-status-row">
        <span class="veh-status-dot"></span>
        <span class="veh-status-text">${escapeHtml(statusTxt)}</span>
      </div>
      <div class="veh-item-bottom">
        <div class="veh-meta">
          <div class="veh-meta-item">
            <span class="veh-meta-label">Speed</span>
            <span class="veh-meta-value">${v.speed || 0} km/h</span>
          </div>
          <div class="veh-meta-item">
            <span class="veh-meta-label">Signal</span>
            <span class="veh-meta-value">${status === 'offline' ? '—' : 'OK'}</span>
          </div>
        </div>
        <div class="veh-actions">
          <button class="veh-action-btn locate-btn" title="Locate on map">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="10" r="3"/>
              <path d="M12 2a8 8 0 010 16m0 0v4"/>
            </svg>
          </button>
          <button class="veh-action-btn history-btn" title="History">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
          </button>
        </div>
      </div>`;
    
    // Set vehicle name safely
    li.querySelector('.veh-name').textContent = v.name;
    
    fragment.appendChild(li);
  });

  // Append all at once for better performance
  DOM.vehicleList.appendChild(fragment);

  // Update KPI counters
  const active  = vehicles.filter(v => getVehicleStatus(v) !== 'offline').length;
  const alertCt = vehicles.filter(v => v.speed > CONFIG.SPEEDING_THRESHOLD).length;
  DOM.setElement('kpi-active', active);
  DOM.setElement('kpi-alerts', alertCt);
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
  if (DOM.vehicleSheet)    DOM.vehicleSheet.classList.add('open');
  if (DOM.sheetBackdrop)   DOM.sheetBackdrop.classList.add('show');
  refreshSheetContent(id);
}

function closeSheet() {
  if (DOM.vehicleSheet)    DOM.vehicleSheet?.classList.remove('open');
  if (DOM.sheetBackdrop)   DOM.sheetBackdrop?.classList.remove('show');
}

function refreshSheetContent(id) {
  if (!DOM.sheetBody) return;
  const v  = vehicleStore[id];
  if (!v) return;

  const status    = getVehicleStatus(v);
  const isMoving  = v.speed > CONFIG.SPEED_THRESHOLD;
  // Fix: getVehicleStatus returns 'online'=moving, 'idle'=parked, 'offline'=stale
  // Map cleanly: online→moving, idle→idle, offline→offline
  const statusKey = status === 'online' ? 'moving' : status;
  const statusLbl = statusKey === 'moving' ? 'En mouvement' : statusKey === 'idle' ? 'En veille' : 'Hors ligne';
  const ts = v.ts
    ? new Date(v.ts).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
    : '—';

  DOM.sheetBody.innerHTML = `
    <div class="vehicle-card-header">
      <div class="vehicle-card-name"></div>
      <span class="status-badge status-${statusKey}">${escapeHtml(statusLbl)}</span>
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
      <span>${escapeHtml(ts)}</span>
    </div>

    <div class="detail-actions">
      <button class="detail-action-btn" data-action="center">
        <span class="btn-icon">📍</span>Centrer
      </button>
      <button class="detail-action-btn" data-action="history">
        <span class="btn-icon">📜</span>Historique
      </button>
      <button class="detail-action-btn support" data-action="support">
        <span class="btn-icon">💬</span>Support
      </button>
      <button class="detail-action-btn danger" data-action="report">
        <span class="btn-icon">🚨</span>Signaler
      </button>
    </div>

    <div class="history-section">
      <div class="history-title">Activité récente</div>
      <div id="history-list-${id}">
        <div style="font-size:12px;color:var(--grey);padding:6px 0;">Chargement...</div>
      </div>
    </div>`;

  // Set vehicle name safely
  const nameEl = DOM.sheetBody.querySelector('.vehicle-card-name');
  if (nameEl) nameEl.textContent = v.name;

  // Attach event listeners (not inline onclick)
  const actions = {
    center: () => centerVehicle(id),
    history: () => openHistory(id),
    support: () => contactSupport(),
    report: () => reportAlert(id)
  };

  DOM.sheetBody.querySelectorAll('[data-action]').forEach(btn => {
    btn.onclick = () => actions[btn.dataset.action]?.();
  });

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
    const label   = v.speed > CONFIG.SPEED_THRESHOLD ? 'En mouvement' : 'Arrêt détecté';
    const cls     = v.speed > CONFIG.SPEED_THRESHOLD ? 'event-move' : 'event-stop';
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
        <div class="history-text">${escapeHtml(e.text)}</div>
        <div class="history-time">${escapeHtml(e.time)}</div>
      </div>
    </div>`).join('');
}

// ── ALERTS FEED ───────────────────────────────────────
function renderAlertsFeed() {
  if (!DOM.alertsFeed) return;

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

  // Update nav badge
  const critCount = items.filter(a => a.type === 'critical').length;
  const badge = document.getElementById('nav-badge-alerts');
  if (badge) {
    badge.textContent = critCount;
    badge.style.display = critCount > 0 ? 'flex' : 'none';
  }

  if (!items.length) {
    DOM.alertsFeed.innerHTML = `
      <div class="alerts-empty">
        <div class="alerts-empty-icon">🔔</div>
        <p>No recent alerts.<br>All systems normal.</p>
      </div>`;
    return;
  }

  DOM.alertsFeed.innerHTML = items.map(a => `
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

  // Attach event listeners
  DOM.alertsFeed.querySelectorAll('.alert-view-btn').forEach(btn => {
    btn.onclick = () => viewAlertOnMap(btn.dataset.vehicleId);
  });
}

function viewAlertOnMap(id) {
  selectVehicle(id);
  switchView('map');
}

// ── TOP STATS (HUD bar over map) ──────────────────────
function updateTopStats() {
  let moving = 0, idle = 0, offline = 0;
  Object.values(vehicleStore).forEach(v => {
    const status = getVehicleStatus(v);
    if (v.speed > CONFIG.SPEED_THRESHOLD)       moving++;
    else if (status === 'online' || status === 'idle') idle++;
    else                                          offline++;
  });
  DOM.setElement('stat-moving',  moving);
  DOM.setElement('stat-idle',    idle);
  DOM.setElement('stat-offline', offline);
}

// ── CONNECTION ────────────────────────────────────────
function setConnected(connected) {
  if (!DOM.connIndicator || !DOM.connLabel) return;
  DOM.connIndicator.className = `conn-pill ${connected ? 'connected' : 'error'}`;
  DOM.connLabel.textContent = connected ? 'En ligne' : 'Hors ligne';
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
  if (!DOM.alertsContainer) return;

  const toast = document.createElement('div');
  toast.className = `alert-toast ${type || ''}`;
  toast.textContent = msg;
  DOM.alertsContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity   = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ── SECURITY: HTML ESCAPING ──────────────────────────
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
