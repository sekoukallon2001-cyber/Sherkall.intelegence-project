const BACKEND_URL = 'https://sherkall-backend-production.up.railway.app';

let map, vehicleStore = {}, markers = {};
let selectedVehicleId = null;
let userInfo = null;
let authToken = null;

function logout() {
  localStorage.removeItem('sherkall_token');
  localStorage.removeItem('sherkall_user');
  window.location.href = '/login.html';
}

function initMap() {
  map = L.map('map', { zoomControl: true }).setView([9.538, -13.677], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);
}

async function refreshVehicles() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/vehicles`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (response.status === 401) {
      showAlert('Session expirée — reconnectez-vous', 'danger');
      return;
    }

    const data = await response.json();

    if (data.success && data.devices) {
      data.devices.forEach(device => {
        vehicleStore[device.id] = {
          id: device.id,
          name: device.name,
          status: device.status,
          lat: null,
          lon: null,
          speed: 0
        };
      });
      document.getElementById('vehicle-count').textContent = data.devices.length;
      renderVehicleList();
    }

  } catch (error) {
    console.error('Failed to fetch vehicles:', error);
    showAlert('Connexion backend échouée', 'danger');
  }
}

async function refreshPositions() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/vehicles/positions`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) return;

    const data = await response.json();

    if (data.success && data.positions) {
      data.positions.forEach(pos => {
        if (vehicleStore[pos.deviceId]) {
          vehicleStore[pos.deviceId].lat = pos.latitude;
          vehicleStore[pos.deviceId].lon = pos.longitude;
          vehicleStore[pos.deviceId].speed = Math.round(pos.speed || 0);
          vehicleStore[pos.deviceId].heading = pos.course;
          vehicleStore[pos.deviceId].ts = pos.fixTime;
          updateMarker(vehicleStore[pos.deviceId]);
        }
      });
      renderVehicleList();
      if (selectedVehicleId) showDetail(selectedVehicleId);
    }

  } catch (error) {
    console.error('Failed to fetch positions:', error);
  }
}

function startPolling() {
  refreshPositions();
  setInterval(refreshPositions, 30000);
}

function getStatusColor(status) {
  if (status === 'online') return '#22C55E';
  if (status === 'idle') return '#EAB308';
  return '#EF4444';
}

function updateMarker(v) {
  if (!v.lat || !v.lon) return;
  const latlng = [v.lat, v.lon];
  const color = getStatusColor(v.status);

  const icon = L.divIcon({
    className: '',
    html: '<div style="width:32px;height:32px;background:' + color + ';border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.4);cursor:pointer;">🚗</div>',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  if (markers[v.id]) {
    markers[v.id].setLatLng(latlng);
    markers[v.id].setIcon(icon);
  } else {
    const m = L.marker(latlng, { icon }).addTo(map);
    m.on('click', () => selectVehicle(v.id));
    m.bindTooltip(v.name || String(v.id));
    markers[v.id] = m;
  }
}

function renderVehicleList() {
  const ul = document.getElementById('vehicle-list');
  if (!ul) return;

  const filter = (document.getElementById('vehicle-filter') || {}).value || '';
  const q = filter.toLowerCase();

  ul.innerHTML = '';
  Object.values(vehicleStore).forEach(v => {
    if (q && !(v.name || String(v.id)).toLowerCase().includes(q)) return;

    const status = v.speed > 0 ? 'moving' : (v.status === 'online' ? 'idle' : 'offline');
    const statusLabel = status === 'moving' ? '● EN MOUVEMENT' : status === 'idle' ? '● EN VEILLE' : '● HORS LIGNE';

    const li = document.createElement('li');
    li.className = selectedVehicleId === v.id ? 'active' : '';
    li.innerHTML = '<div class="vehicle-name">' + (v.name || v.id) + '</div>' +
      '<div class="vehicle-meta">' +
      '<span class="status-badge status-' + status + '">' + statusLabel + '</span>' +
      '<span>' + (v.speed || 0) + ' km/h</span>' +
      '</div>';
    li.onclick = function() { selectVehicle(v.id); };
    ul.appendChild(li);
  });
}

function selectVehicle(id) {
  selectedVehicleId = id;
  const v = vehicleStore[id];
  if (!v) return;
  if (v.lat && v.lon) {
    map.setView([v.lat, v.lon], 16, { animate: true });
  }
  showDetail(id);
}

function showDetail(id) {
  const el = document.getElementById('detail-body');
  const v = vehicleStore[id];
  if (!el || !v) return;

  const status = v.speed > 0 ? 'moving' : (v.status === 'online' ? 'idle' : 'offline');
  const statusLabel = status === 'moving' ? 'En mouvement' : status === 'idle' ? 'En veille' : 'Hors ligne';
  const statusClass = status === 'moving' ? 'green' : status === 'idle' ? 'gold' : 'red';

  el.innerHTML =
    '<div class="detail-row"><span class="detail-label">Véhicule</span><span class="detail-value gold">' + (v.name || v.id) + '</span></div>' +
    '<div class="detail-row"><span class="detail-label">Statut</span><span class="detail-value ' + statusClass + '">' + statusLabel + '</span></div>' +
    '<div class="detail-row"><span class="detail-label">Vitesse</span><span class="detail-value">' + (v.speed || 0) + ' km/h</span></div>' +
    '<div class="detail-row"><span class="detail-label">Latitude</span><span class="detail-value">' + (v.lat ? v.lat.toFixed(5) : '—') + '</span></div>' +
    '<div class="detail-row"><span class="detail-label">Longitude</span><span class="detail-value">' + (v.lon ? v.lon.toFixed(5) : '—') + '</span></div>' +
    '<div class="detail-row"><span class="detail-label">Dernière MAJ</span><span class="detail-value">' + (v.ts ? new Date(v.ts).toLocaleTimeString('fr-FR') : '—') + '</span></div>' +
    '<div class="action-grid" style="margin-top:16px">' +
    '<button class="action-btn" onclick="centerVehicle(\'' + id + '\')">📍 Centrer</button>' +
    '<button class="action-btn" onclick="contactSupport()">💬 Support</button>' +
    '</div>';
}

function centerVehicle(id) {
  const v = vehicleStore[id];
  if (v && v.lat && v.lon) {
    map.setView([v.lat, v.lon], 17, { animate: true });
  }
}

function centerAll() {
  const locs = Object.values(vehicleStore)
    .filter(function(v) { return v.lat && v.lon; })
    .map(function(v) { return [v.lat, v.lon]; });
  if (locs.length) {
    map.fitBounds(locs, { maxZoom: 14, padding: [40, 40] });
  }
}

function contactSupport() {
  window.open('https://wa.me/224629255946', '_blank');
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  if (sb) sb.classList.toggle('hidden');
}

function showAlert(message, type) {
  const container = document.getElementById('alerts');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'alert-toast ' + (type || '');
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(function() { toast.remove(); }, 300);
  }, 4000);
}

document.addEventListener('DOMContentLoaded', function() {
  authToken = localStorage.getItem('sherkall_token');
  const userStr = localStorage.getItem('sherkall_user');

  if (!authToken || !userStr) {
    window.location.href = '/login.html';
    return;
  }

  userInfo = JSON.parse(userStr);
  const nameEl = document.getElementById('client-name');
  if (nameEl) nameEl.textContent = userInfo.name || 'Client';

  const vf = document.getElementById('vehicle-filter');
  if (vf) vf.addEventListener('input', renderVehicleList);

  initMap();
  refreshVehicles();
  startPolling();
});