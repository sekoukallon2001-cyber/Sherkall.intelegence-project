// ══════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════
const BACKEND = 'https://sherkall-backend-production.up.railway.app';
const token   = sessionStorage.getItem('sherkall_token') || localStorage.getItem('sherkall_token');

// Safe parse — malformed JSON in storage crashes the entire script
function safeParseUser() {
  const raw = sessionStorage.getItem('sherkall_user') || localStorage.getItem('sherkall_user') || '{}';
  try { return JSON.parse(raw); } catch { return {}; }
}
const user = safeParseUser();

// ── Auth guard ─────────────────────────────────────────
if (!token || user.role !== 'admin') {
  window.location.href = '/login.html';
}

document.getElementById('admin-name').textContent = user.name || 'Admin';

function authHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...extra
  };
}

function logout() {
  localStorage.removeItem('sherkall_token');
  localStorage.removeItem('sherkall_user');
  sessionStorage.removeItem('sherkall_token');
  sessionStorage.removeItem('sherkall_user');
  window.location.href = '/login.html';
}

// ══════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════
let allClients     = [];
let traccarDevices = [];
let selectedClient = null;

// ══════════════════════════════════════════════════════
// LOAD DATA
// ══════════════════════════════════════════════════════
async function loadAll() {
  await Promise.all([loadOverview(), loadClients(), loadTraccarDevices()]);
}

async function loadOverview() {
  try {
    const res  = await fetch(`${BACKEND}/api/admin/overview`, { headers: authHeaders() });
    const data = await res.json();
    if (!data.success) return;
    const o = data.overview;
    document.getElementById('stat-total').textContent     = o.totalClients     ?? '0';
    document.getElementById('stat-active').textContent    = o.activeClients    ?? '0';
    document.getElementById('stat-devices').textContent   = o.totalDevices     ?? '0';
    document.getElementById('stat-suspended').textContent = o.suspendedClients ?? '0';
  } catch {}
}

async function loadClients() {
  try {
    const res  = await fetch(`${BACKEND}/api/admin/clients`, { headers: authHeaders() });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    allClients = data.clients || [];
    renderClients(allClients);
  } catch (err) {
    document.getElementById('client-list').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <p class="empty-text">Failed to load clients.<br>${err.message}</p>
      </div>`;
  }
}

async function loadTraccarDevices() {
  try {
    const res  = await fetch(`${BACKEND}/api/vehicles`, { headers: authHeaders() });
    const data = await res.json();
    if (data.success) traccarDevices = data.devices || [];
  } catch {}
}

// ══════════════════════════════════════════════════════
// RENDER CLIENTS
// ══════════════════════════════════════════════════════
function renderClients(clients) {
  const list = document.getElementById('client-list');

  if (!clients.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <p class="empty-text">No clients yet.<br>Create your first client to get started.</p>
      </div>`;
    return;
  }

  list.innerHTML = clients.map(c => {
    const deviceCount = c.client_devices?.length || 0;
    const isActive    = c.active;
    const hasDevice   = deviceCount > 0;
    const cardClass   = !isActive ? 'suspended' : !hasDevice ? 'no-device' : '';
    const statusBadge = isActive
      ? '<span class="badge badge-active">Active</span>'
      : '<span class="badge badge-suspended">Suspended</span>';
    const planBadge   = `<span class="badge badge-plan">${(c.plan||'basic').toUpperCase()}</span>`;
    const deviceLabel = deviceCount === 0 ? 'No device' : deviceCount === 1 ? '1 device' : `${deviceCount} devices`;

    return `
      <div class="client-card ${cardClass}" onclick="openDetail('${c.id}')">
        <div class="client-card-top">
          <div>
            <p class="client-name">${escHtml(c.name)}</p>
            <p class="client-email">${escHtml(c.email)}</p>
          </div>
          <div class="client-badges">${planBadge}${statusBadge}</div>
        </div>
        <div class="client-card-bottom">
          <div class="client-meta">
            <div class="client-meta-item">
              <span class="meta-label">Devices</span>
              <span class="meta-value">${escHtml(deviceLabel)}</span>
            </div>
            <div class="client-meta-item">
              <span class="meta-label">Since</span>
              <span class="meta-value">${new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
            ${c.phone ? `<div class="client-meta-item">
              <span class="meta-label">Phone</span>
              <span class="meta-value">${escHtml(c.phone)}</span>
            </div>` : ''}
          </div>
          <span class="client-arrow">›</span>
        </div>
      </div>`;
  }).join('');
}

function filterClients() {
  const q = document.getElementById('search-input').value.toLowerCase();
  renderClients(q
    ? allClients.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone||'').includes(q))
    : allClients);
}

// ══════════════════════════════════════════════════════
// CLIENT DETAIL SLIDE-OVER
// ══════════════════════════════════════════════════════
async function openDetail(clientId) {
  selectedClient = allClients.find(c => c.id === clientId);
  if (!selectedClient) return;
  // Ensure Traccar devices are loaded before rendering assign dropdown
  if (!traccarDevices.length) await loadTraccarDevices();
  renderDetail();
  document.getElementById('so-name').textContent = selectedClient.name;
  document.getElementById('overlay').classList.add('show');
  document.getElementById('slide-over').classList.add('open');
}

function closeDetail() {
  document.getElementById('overlay').classList.remove('show');
  document.getElementById('slide-over').classList.remove('open');
  selectedClient = null;
}

function renderDetail() {
  const c   = selectedClient;
  const sub = c.subscriptions?.[0];
  const el  = document.getElementById('so-body');

  // Build devices list with edit + alert controls
  const devicesList = (c.client_devices || []).map(d => {
    const hasName   = !!(d.device_name);
    const nameLabel = hasName ? escHtml(d.device_name) : '⚠ No name set';
    const nameCls   = hasName ? '' : 'unnamed';
    const speedBadge = d.alert_speed_kmh
      ? `<span class="alert-badge">⚡ Alert &gt; ${d.alert_speed_kmh} km/h</span>` : '';
    const offlineBadge = d.alert_offline
      ? `<span class="alert-badge alert-badge-offline">📴 Offline alert ON</span>` : '';

    return `
    <div class="device-item" id="device-card-${d.traccar_device_id}">
      <div class="device-item-top">
        <div class="device-info">
          <p class="device-name ${nameCls}">${nameLabel}</p>
          <p class="device-id">ID: ${escHtml(String(d.traccar_device_id))}</p>
          ${d.vehicle_plate ? `<p class="device-plate">🪪 ${escHtml(d.vehicle_plate)}</p>` : ''}
          ${speedBadge || offlineBadge ? `<div class="device-alert-badges">${speedBadge}${offlineBadge}</div>` : ''}
        </div>
        <div class="device-item-btns">
          <button class="btn-edit-device" onclick="toggleDeviceEdit('${d.traccar_device_id}')">✏ Edit</button>
          <button class="btn-remove" onclick="removeDevice('${c.id}','${d.traccar_device_id}')">✕</button>
        </div>
      </div>
      <div class="device-edit-form" id="edit-form-${d.traccar_device_id}">
        <div class="form-group">
          <label class="form-label">Vehicle Name *</label>
          <input class="form-input" id="edit-name-${d.traccar_device_id}"
            type="text" value="${escHtml(d.device_name || '')}"
            placeholder="e.g. Taxi 14, Truck Alpha">
        </div>
        <div class="form-group">
          <label class="form-label">Plate Number</label>
          <input class="form-input" id="edit-plate-${d.traccar_device_id}"
            type="text" value="${escHtml(d.vehicle_plate || '')}"
            placeholder="GN-1234-A">
        </div>
        <div class="form-group">
          <label class="form-label">Alerts</label>
          <div class="alert-toggle-row">
            <label class="toggle-label">
              <input type="checkbox" id="edit-speed-on-${d.traccar_device_id}"
                ${d.alert_speed_kmh ? 'checked' : ''}
                onchange="toggleSpeedInput('${d.traccar_device_id}')">
              Speed alert above
            </label>
            <input class="speed-input-inline" id="edit-speed-val-${d.traccar_device_id}"
              type="number" value="${d.alert_speed_kmh || 90}" min="20" max="200"
              style="${d.alert_speed_kmh ? '' : 'opacity:0.3;pointer-events:none'}">
            <span style="font-size:12px;color:var(--grey)">km/h</span>
          </div>
          <div class="alert-toggle-row" style="margin-top:8px">
            <label class="toggle-label">
              <input type="checkbox" id="edit-offline-${d.traccar_device_id}"
                ${d.alert_offline ? 'checked' : ''}>
              Notify when vehicle goes offline
            </label>
          </div>
        </div>
        <div class="edit-action-row">
          <button class="btn-save-device"
            onclick="saveDeviceEdit('${c.id}','${d.traccar_device_id}')">
            Save Changes
          </button>
          <button class="btn-cancel-edit"
            onclick="toggleDeviceEdit('${d.traccar_device_id}')">
            Cancel
          </button>
        </div>
      </div>
    </div>`;
  }).join('');

  // Build Traccar device dropdown (exclude already assigned)
  const assignedIds  = (c.client_devices||[]).map(d => String(d.traccar_device_id));
  const available    = traccarDevices.filter(d => !assignedIds.includes(String(d.id)));
  const deviceOptions = available.length
    ? available.map(d => `<option value="${d.id}">${escHtml(d.name)} (ID: ${d.id})</option>`).join('')
    : '<option value="" disabled>No available devices</option>';

  const isSuspended = !c.active;

  el.innerHTML = `
    <!-- Account Info -->
    <div class="so-section">
      <p class="so-section-title">Account Info</p>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Email</span>
          <span class="info-value" style="font-size:12px;word-break:break-all">${escHtml(c.email)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Plan</span>
          <span class="info-value" style="color:var(--gold)">${(c.plan||'basic').toUpperCase()}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Status</span>
          <span class="info-value" style="color:${c.active?'var(--green)':'var(--red)'}">${c.active?'Active':'Suspended'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Phone</span>
          <span class="info-value">${c.phone ? escHtml(c.phone) : '—'}</span>
        </div>
        ${sub ? `
        <div class="info-item">
          <span class="info-label">Monthly Fee</span>
          <span class="info-value">${sub.monthly_fee ? Number(sub.monthly_fee).toLocaleString()+' '+(sub.currency||'GNF') : '—'}</span>
        </div>` : ''}
        <div class="info-item">
          <span class="info-label">Since</span>
          <span class="info-value">${new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
        </div>
      </div>
      ${c.notes ? `<p style="margin-top:12px;font-size:12px;color:var(--grey);background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;border:1px solid var(--navy-line)">${escHtml(c.notes)}</p>` : ''}
    </div>

    <div class="divider"></div>

    <!-- Assigned Devices -->
    <div class="so-section" style="margin-top:20px">
      <p class="so-section-title">Assigned Devices (${(c.client_devices||[]).length})</p>
      ${devicesList || '<p style="font-size:12px;color:var(--grey);margin-bottom:10px">No devices assigned yet.</p>'}
    </div>

    <!-- Assign New Device -->
    <div class="so-section">
      <p class="so-section-title">Assign Device</p>
      <div class="assign-form">
        <div class="form-group">
          <label class="form-label">Select Traccar Device</label>
          <select class="form-select" id="assign-device-select">
            <option value="">— Select device —</option>
            ${deviceOptions}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Friendly Name</label>
            <input class="form-input" id="assign-name" type="text" placeholder="e.g. Taxi 01">
          </div>
          <div class="form-group">
            <label class="form-label">Plate Number</label>
            <input class="form-input" id="assign-plate" type="text" placeholder="GN-1234-A">
          </div>
        </div>
        <button class="btn-assign" id="assign-btn" onclick="assignDevice()">
          Assign to Client
        </button>
      </div>
    </div>

    <div class="divider"></div>

    <!-- Actions -->
    <div class="so-section" style="margin-top:20px">
      <p class="so-section-title">Account Actions</p>
      <div class="action-row">
        <button class="btn-action btn-suspend ${isSuspended ? 'suspended' : ''}"
          onclick="toggleSuspend('${c.id}')">
          ${isSuspended ? '✅ Reactivate' : '⏸ Suspend'}
        </button>
        <button class="btn-action btn-password" onclick="resetPassword('${c.id}','${escHtml(c.name)}')">
          🔑 Reset Password
        </button>
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════
// ASSIGN DEVICE
// ══════════════════════════════════════════════════════
async function assignDevice() {
  const deviceId = document.getElementById('assign-device-select').value;
  const name     = document.getElementById('assign-name').value.trim();
  const plate    = document.getElementById('assign-plate').value.trim();
  const btn      = document.getElementById('assign-btn');

  if (!deviceId) { showToast('Select a device first', 'error'); return; }
  if (!selectedClient) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Assigning...';

  try {
    const res  = await fetch(`${BACKEND}/api/admin/clients/${selectedClient.id}/devices`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        traccar_device_id: deviceId,
        device_name:       name  || null,
        vehicle_plate:     plate || null
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    showToast(`Device assigned to ${selectedClient.name} ✅`, 'success');
    await loadClients();
    await loadOverview();

    // Refresh detail panel
    selectedClient = allClients.find(c => c.id === selectedClient.id);
    if (selectedClient) renderDetail();

  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Assign to Client';
  }
}

// ══════════════════════════════════════════════════════
// REMOVE DEVICE
// ══════════════════════════════════════════════════════
// ── DEVICE EDIT ───────────────────────────────────────
function toggleDeviceEdit(deviceId) {
  const form = document.getElementById(`edit-form-${deviceId}`);
  if (form) form.classList.toggle('open');
}

function toggleSpeedInput(deviceId) {
  const checkbox = document.getElementById(`edit-speed-on-${deviceId}`);
  const input    = document.getElementById(`edit-speed-val-${deviceId}`);
  if (!checkbox || !input) return;
  input.style.opacity       = checkbox.checked ? '1' : '0.3';
  input.style.pointerEvents = checkbox.checked ? 'auto' : 'none';
}

async function saveDeviceEdit(clientId, deviceId) {
  const name      = document.getElementById(`edit-name-${deviceId}`)?.value.trim();
  const plate     = document.getElementById(`edit-plate-${deviceId}`)?.value.trim();
  const speedOn   = document.getElementById(`edit-speed-on-${deviceId}`)?.checked;
  const speedVal  = document.getElementById(`edit-speed-val-${deviceId}`)?.value;
  const offlineOn = document.getElementById(`edit-offline-${deviceId}`)?.checked;

  if (!name) { showToast('Vehicle name is required', 'error'); return; }

  const btn = document.querySelector(`#edit-form-${deviceId} .btn-save-device`);
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  try {
    const res  = await fetch(`${BACKEND}/api/admin/clients/${clientId}/devices/${deviceId}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({
        device_name:     name,
        vehicle_plate:   plate || null,
        alert_speed_kmh: speedOn ? parseInt(speedVal) || 90 : null,
        alert_offline:   offlineOn
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    showToast(`${name} updated ✅`, 'success');
    await loadClients();
    // Refresh detail panel with updated data
    selectedClient = allClients.find(c => c.id === clientId);
    if (selectedClient) renderDetail();

  } catch (err) {
    showToast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
  }
}

// ── REMOVE DEVICE ─────────────────────────────────────
async function removeDevice(clientId, deviceId) {
  if (!confirm('Remove this device from the client?')) return;
  try {
    const res  = await fetch(`${BACKEND}/api/admin/clients/${clientId}/devices/${deviceId}`, {
      method: 'DELETE', headers: authHeaders()
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    showToast('Device removed ✅', 'success');
    await loadClients();
    await loadOverview();
    selectedClient = allClients.find(c => c.id === clientId);
    if (selectedClient) renderDetail();

  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════
// SUSPEND / REACTIVATE
// ══════════════════════════════════════════════════════
async function toggleSuspend(clientId) {
  try {
    const res  = await fetch(`${BACKEND}/api/admin/clients/${clientId}/suspend`, {
      method: 'PUT', headers: authHeaders()
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    showToast(data.message, 'success');
    await loadClients();
    await loadOverview();
    selectedClient = allClients.find(c => c.id === clientId);
    if (selectedClient) renderDetail();

  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════
// RESET PASSWORD
// ══════════════════════════════════════════════════════
async function resetPassword(clientId, clientName) {
  const newPwd = generatePasswordString();
  if (!confirm(`Reset password for ${clientName}?\n\nNew password: ${newPwd}\n\nSave this before confirming.`)) return;

  try {
    const res  = await fetch(`${BACKEND}/api/admin/clients/${clientId}/password`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ new_password: newPwd })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    showToast(`Password reset — new: ${newPwd}`, 'success');

  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════
// CREATE CLIENT MODAL
// ══════════════════════════════════════════════════════
function openCreateModal() {
  document.getElementById('create-modal').classList.add('show');
  document.getElementById('cred-box').classList.remove('show');
  document.getElementById('create-form-fields').style.display = 'flex';
  document.getElementById('create-form-fields').style.flexDirection = 'column';
  document.getElementById('create-form-fields').style.gap = '14px';
  clearCreateForm();
}

function closeCreateModal() {
  document.getElementById('create-modal').classList.remove('show');
}

function clearCreateForm() {
  ['f-name','f-email','f-phone','f-password','f-notes','f-fee'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('f-plan').value = 'basic';
}

async function createClient() {
  const name     = document.getElementById('f-name').value.trim();
  const email    = document.getElementById('f-email').value.trim();
  const password = document.getElementById('f-password').value.trim();
  const phone    = document.getElementById('f-phone').value.trim();
  const plan     = document.getElementById('f-plan').value;
  const fee      = document.getElementById('f-fee').value;
  const notes    = document.getElementById('f-notes').value.trim();
  const btn      = document.getElementById('create-btn');

  if (!name)     { showToast('Name is required', 'error'); return; }
  if (!email)    { showToast('Email is required', 'error'); return; }
  if (!password) { showToast('Password is required', 'error'); return; }
  if (password.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Creating...';

  try {
    const res  = await fetch(`${BACKEND}/api/admin/clients`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        name, email, password, phone: phone||null,
        plan, monthly_fee: fee||null, currency:'GNF',
        notes: notes||null
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    // Show credentials
    document.getElementById('cred-email').textContent    = email;
    document.getElementById('cred-password').textContent = password;
    document.getElementById('cred-box').classList.add('show');
    document.getElementById('create-form-fields').style.display = 'none';

    await loadClients();
    await loadOverview();
    showToast(`${name} created ✅`, 'success');

  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = 'Create Client';
  }
}

// ══════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════
function generatePasswordString() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({length:10}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
}

function generatePassword() {
  document.getElementById('f-password').value = generatePasswordString();
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function showToast(msg, type='') {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity 0.3s'; setTimeout(()=>t.remove(),300); }, 4000);
}

// ══════════════════════════════════════════════════════
// TAB SWITCHING
// ══════════════════════════════════════════════════════
function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  document.getElementById(`tab-btn-${name}`).classList.add('active');

  if (name === 'fleet') {
    // Only fetch if not already loaded — avoid API call on every tab click
    if (!allFleet.length) loadFleet();
    else renderFleet();
  }
  if (name === 'map') {
    initAdminMap();
    // invalidateSize AFTER the tab is visible in the DOM
    setTimeout(() => {
      if (adminMap) adminMap.invalidateSize();
      loadAdminMap();
    }, 80);
  }
  if (name === 'geofences') loadZones();
}

// ══════════════════════════════════════════════════════
// FLEET TAB
// ══════════════════════════════════════════════════════
let allFleet = [], fleetFilter = 'all';

function getFleetStatus(device) {
  if (!device.ts) return 'offline';
  const age = Date.now() - new Date(device.ts).getTime();
  if (age >= 90000) return 'offline';
  return device.speed > 3 ? 'moving' : 'idle';
}

async function loadFleet() {
  try {
    // Make sure clients are loaded (need device→client mapping)
    if (!allClients.length) await loadClients();

    // Build deviceId → client name map
    const deviceClientMap = {};
    allClients.forEach(c => {
      (c.client_devices || []).forEach(d => {
        deviceClientMap[String(d.traccar_device_id)] = {
          clientName: c.name,
          deviceName: d.device_name,
          plate: d.vehicle_plate
        };
      });
    });

    // Fetch devices + positions
    const [devRes, posRes] = await Promise.all([
      fetch(`${BACKEND}/api/vehicles`,          { headers: authHeaders() }),
      fetch(`${BACKEND}/api/vehicles/positions`, { headers: authHeaders() })
    ]);

    const devData = await devRes.json();
    const posData = await posRes.json();

    const posMap = {};
    (posData.positions || []).forEach(p => { posMap[p.deviceId] = p; });

    allFleet = (devData.devices || []).map(d => {
      const pos    = posMap[d.id] || {};
      const info   = deviceClientMap[String(d.id)] || {};
      return {
        id:         d.id,
        name:       info.deviceName || d.name,
        plate:      info.plate || '',
        clientName: info.clientName || '—',
        speed:      Math.round(pos.speed || 0),
        lat:        pos.latitude,
        lng:        pos.longitude,
        ts:         pos.fixTime || null
      };
    });

    renderFleet();
  } catch (err) {
    document.getElementById('fleet-list').innerHTML =
      `<div class="empty-state"><div class="empty-icon">⚠️</div><p class="empty-text">${err.message}</p></div>`;
  }
}

function renderFleet() {
  const q      = (document.getElementById('fleet-search')?.value || '').toLowerCase();
  const list   = document.getElementById('fleet-list');
  const vehicles = allFleet.filter(v => {
    if (q && !v.name.toLowerCase().includes(q) && !v.clientName.toLowerCase().includes(q)) return false;
    if (fleetFilter !== 'all' && getFleetStatus(v) !== fleetFilter) return false;
    return true;
  }).sort((a,b) => {
    const o = { moving:0, idle:1, offline:2 };
    return (o[getFleetStatus(a)]||2) - (o[getFleetStatus(b)]||2);
  });

  if (!vehicles.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><p class="empty-text">No vehicles match.</p></div>`;
    return;
  }

  list.innerHTML = vehicles.map(v => {
    const status = getFleetStatus(v);
    const dotCls = status === 'moving' ? 'dot-green' : status === 'idle' ? 'dot-amber' : 'dot-red';
    const label  = status === 'moving' ? `Moving · ${v.speed} km/h` : status === 'idle' ? 'Parked' : 'Offline';
    const ts     = v.ts ? new Date(v.ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : '—';
    return `
      <div class="fleet-card fc-${status}">
        <div class="fleet-card-top">
          <div>
            <div class="fleet-veh-name">${escHtml(v.name)}</div>
            ${v.plate ? `<div style="font-size:11px;color:var(--grey);margin-top:2px">${escHtml(v.plate)}</div>` : ''}
          </div>
          <span class="fleet-client-tag">${escHtml(v.clientName)}</span>
        </div>
        <div class="fleet-card-meta">
          <div class="fleet-meta-item">
            <span class="fleet-meta-lbl">Status</span>
            <span class="fleet-meta-val"><span class="fleet-status-dot ${dotCls}"></span>${label}</span>
          </div>
          <div class="fleet-meta-item">
            <span class="fleet-meta-lbl">Speed</span>
            <span class="fleet-meta-val">${v.speed} km/h</span>
          </div>
          <div class="fleet-meta-item">
            <span class="fleet-meta-lbl">Last Update</span>
            <span class="fleet-meta-val">${ts}</span>
          </div>
          ${v.lat ? `<div class="fleet-meta-item">
            <span class="fleet-meta-lbl">Coords</span>
            <span class="fleet-meta-val" style="font-family:'JetBrains Mono',monospace;font-size:10px">${Number(v.lat).toFixed(4)}, ${Number(v.lng).toFixed(4)}</span>
          </div>` : ''}
        </div>
      </div>`;
  }).join('');
}

function filterFleet() { renderFleet(); }

function setFleetFilter(f, btn) {
  fleetFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderFleet();
}

// ══════════════════════════════════════════════════════
// MAP TAB
// ══════════════════════════════════════════════════════
let adminMap = null, adminMarkers = {}, adminGeofenceLayers = {};

function initAdminMap() {
  if (adminMap) return;
  adminMap = L.map('admin-map', {
    zoomControl:       true,
    tap:               false,  // critical: prevents Leaflet from eating mobile touch events
    tapTolerance:      15,
    touchZoom:         true,
    scrollWheelZoom:   false,
    attributionControl: true
  }).setView([9.538, -13.677], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© OpenStreetMap', subdomains: 'abc'
  }).addTo(adminMap);
}

function vehicleColorByStatus(status, speed) {
  if (speed > 3)             return '#10B981';
  if (status !== 'offline')  return '#F59E0B';
  return '#EF4444';
}

async function loadAdminMap() {
  if (!adminMap) return;

  try {
    // Load positions
    if (!allFleet.length) await loadFleet();

    // Clear existing markers
    Object.values(adminMarkers).forEach(m => adminMap.removeLayer(m));
    adminMarkers = {};

    const locs = [];
    allFleet.forEach(v => {
      if (!v.lat || !v.lng) return;
      const status = getFleetStatus(v);
      const color  = vehicleColorByStatus(status, v.speed);
      const size   = 34;
      const icon   = L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;background:#fff;border:2.5px solid ${color};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3)">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="${color}">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>`,
        iconSize: [size,size], iconAnchor: [size/2,size/2]
      });

      const label  = status === 'moving' ? `Moving · ${v.speed} km/h` : status === 'offline' ? 'Offline' : 'Parked';
      const ts     = v.ts ? new Date(v.ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : '—';
      const dotClr = status === 'moving' ? '#10B981' : status === 'idle' ? '#F59E0B' : '#EF4444';

      const popupHtml = `<div class="veh-popup">
        <div class="veh-popup-name">${v.name}</div>
        <div class="veh-popup-row">
          <span class="veh-popup-key">Status</span>
          <span class="veh-popup-val" style="color:${dotClr}">${label}</span>
        </div>
        <div class="veh-popup-row">
          <span class="veh-popup-key">Client</span>
          <span class="veh-popup-val">${v.clientName}</span>
        </div>
        ${v.plate ? `<div class="veh-popup-row">
          <span class="veh-popup-key">Plate</span>
          <span class="veh-popup-val">${v.plate}</span>
        </div>` : ''}
        <div class="veh-popup-row">
          <span class="veh-popup-key">Speed</span>
          <span class="veh-popup-val">${v.speed} km/h</span>
        </div>
        <div class="veh-popup-row">
          <span class="veh-popup-key">Updated</span>
          <span class="veh-popup-val">${ts}</span>
        </div>
        <div class="veh-popup-row">
          <span class="veh-popup-key">Coords</span>
          <span class="veh-popup-val" style="font-family:'JetBrains Mono',monospace;font-size:10px">${Number(v.lat).toFixed(5)}, ${Number(v.lng).toFixed(5)}</span>
        </div>
        <button class="veh-popup-copy" onclick="navigator.clipboard.writeText('${Number(v.lat).toFixed(6)}, ${Number(v.lng).toFixed(6)}').then(()=>this.textContent='✅ Copied!').catch(()=>{})">
          📋 Copy Coordinates
        </button>
      </div>`;

      const m = L.marker([v.lat, v.lng], {icon}).addTo(adminMap);
      m.bindPopup(popupHtml, { maxWidth: 240, className: '' });
      adminMarkers[v.id] = m;
      locs.push([v.lat, v.lng]);
    });

    if (locs.length > 1) adminMap.fitBounds(locs, { maxZoom: 14, padding: [40,40] });
    else if (locs.length === 1) adminMap.setView(locs[0], 15);

    // Load geofence overlays
    Object.values(adminGeofenceLayers).forEach(l => adminMap.removeLayer(l));
    adminGeofenceLayers = {};
    const gRes  = await fetch(`${BACKEND}/api/geofences`, { headers: authHeaders() });
    const gData = await gRes.json();
    (gData.geofences || []).forEach(fence => {
      if (!fence.active) return;
      const color = fence.color || '#C9A227';
      let layer;
      if (fence.type === 'circle' && fence.center_lat)
        layer = L.circle([fence.center_lat,fence.center_lng], { radius:fence.radius_m, color, fillColor:color, fillOpacity:0.08, weight:2, dashArray:'6 4' });
      else if (fence.type === 'polygon' && fence.coordinates?.length)
        layer = L.polygon(fence.coordinates.map(([lng,lat])=>[lat,lng]), { color, fillColor:color, fillOpacity:0.08, weight:2, dashArray:'6 4' });
      if (layer) {
        layer.bindTooltip(`<strong>${fence.name}</strong>`, { className:'admin-map-tooltip' });
        layer.addTo(adminMap);
        adminGeofenceLayers[fence.id] = layer;
      }
    });
  } catch {}
}

function centerAdminMap() {
  const locs = allFleet.filter(v=>v.lat&&v.lng).map(v=>[v.lat,v.lng]);
  if (!locs.length || !adminMap) return;
  if (locs.length === 1) adminMap.setView(locs[0], 15, {animate:true});
  else adminMap.fitBounds(locs, {maxZoom:14, padding:[40,40]});
}

// ══════════════════════════════════════════════════════
// GEOFENCES (ZONES) TAB
// ══════════════════════════════════════════════════════
let allZones = [];

async function loadZones() {
  try {
    const [zRes, evRes] = await Promise.all([
      fetch(`${BACKEND}/api/geofences`,               { headers: authHeaders() }),
      fetch(`${BACKEND}/api/geofences/events/recent`, { headers: authHeaders() })
    ]);
    const zData  = await zRes.json();
    const evData = await evRes.json();

    // Count events per geofence
    const evCount = {};
    (evData.events || []).forEach(e => {
      evCount[e.geofence_id] = (evCount[e.geofence_id] || 0) + 1;
    });

    allZones = (zData.geofences || []).map(z => ({ ...z, eventCount: evCount[z.id] || 0 }));
    renderZones(evData.events || []);
  } catch (err) {
    document.getElementById('zones-list').innerHTML =
      `<div class="empty-state"><div class="empty-icon">⚠️</div><p class="empty-text">${err.message}</p></div>`;
  }
}

function renderZones(recentEvents) {
  const list = document.getElementById('zones-list');
  if (!allZones.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🚧</div><p class="empty-text">No zones yet.<br>Create your first zone to start geofencing.</p></div>`;
    return;
  }

  // Build events map by geofence_id
  const evMap = {};
  recentEvents.forEach(e => {
    if (!evMap[e.geofence_id]) evMap[e.geofence_id] = [];
    evMap[e.geofence_id].push(e);
  });

  list.innerHTML = allZones.map(z => {
    const devCount = (z.geofence_devices || []).length;
    const evList   = (evMap[z.id] || []).slice(0,5).map(e => `
      <div class="event-row">
        <span class="event-badge ${e.event_type === 'entered' ? 'ev-entered' : 'ev-exited'}">
          ${e.event_type === 'entered' ? 'ENTERED' : 'EXITED'}
        </span>
        <span style="flex:1">${escHtml(e.device_name || `Device ${e.traccar_device_id}`)}</span>
        <span style="color:var(--grey);font-size:10px;font-family:'JetBrains Mono',monospace">
          ${new Date(e.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
        </span>
      </div>`).join('');

    return `
      <div class="zone-card">
        <div class="zone-card-top">
          <div class="zone-color-dot" style="background:${z.color||'#C9A227'}"></div>
          <span class="zone-name">${escHtml(z.name)}</span>
          <div class="zone-badges">
            <span class="zone-type-badge">${z.type}</span>
            ${z.active
              ? '<span class="zone-type-badge" style="color:var(--green)">ACTIVE</span>'
              : '<span class="zone-type-badge" style="color:var(--red)">INACTIVE</span>'}
          </div>
        </div>
        <div class="zone-card-meta">
          <div class="fleet-meta-item">
            <span class="fleet-meta-lbl">Devices</span>
            <span class="fleet-meta-val">${devCount}</span>
          </div>
          <div class="fleet-meta-item">
            <span class="fleet-meta-lbl">Recent Events</span>
            <span class="fleet-meta-val">${z.eventCount}</span>
          </div>
          ${z.type === 'circle' && z.radius_m ? `<div class="fleet-meta-item">
            <span class="fleet-meta-lbl">Radius</span>
            <span class="fleet-meta-val">${z.radius_m}m</span>
          </div>` : ''}
          <div class="fleet-meta-item">
            <span class="fleet-meta-lbl">Notify</span>
            <span class="fleet-meta-val">${z.notify_enter ? 'Enter' : ''}${z.notify_enter && z.notify_exit ? ' + ' : ''}${z.notify_exit ? 'Exit' : ''}${!z.notify_enter && !z.notify_exit ? 'Off' : ''}</span>
          </div>
        </div>
        <div class="zone-card-actions">
          <button class="btn-sm btn-sm-gold" onclick="assignDeviceToZone('${z.id}','${escHtml(z.name)}')">+ Assign Device</button>
          <button class="btn-sm btn-sm-ghost" onclick="toggleZoneEvents('${z.id}')">📋 Events ${z.eventCount > 0 ? `(${z.eventCount})` : ''}</button>
          <button class="btn-sm ${z.active ? 'btn-sm-red' : 'btn-sm-green'}" onclick="toggleZoneActive('${z.id}',${z.active})">
            ${z.active ? '⏸ Deactivate' : '✅ Activate'}
          </button>
          <button class="btn-sm btn-sm-red" onclick="deleteZone('${z.id}','${escHtml(z.name)}')">🗑 Delete</button>
        </div>
        <div class="events-list" id="evlist-${z.id}">
          ${evList || '<div style="font-size:12px;color:var(--grey);padding:8px 0">No recent events</div>'}
        </div>
      </div>`;
  }).join('');
}

function toggleZoneEvents(zoneId) {
  const el = document.getElementById(`evlist-${zoneId}`);
  if (el) el.classList.toggle('open');
}

async function toggleZoneActive(zoneId, currentlyActive) {
  try {
    const res  = await fetch(`${BACKEND}/api/geofences/${zoneId}`, {
      method: 'PUT', headers: authHeaders(),
      body: JSON.stringify({ active: !currentlyActive })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    showToast(`Zone ${currentlyActive ? 'deactivated' : 'activated'} ✅`, 'success');
    loadZones();
  } catch (err) { showToast(err.message, 'error'); }
}

async function assignDeviceToZone(zoneId, zoneName) {
  if (!traccarDevices.length) await loadTraccarDevices();
  const options = traccarDevices.map(d => `${d.name} (ID: ${d.id})`).join('\n');
  const input   = prompt(`Assign device to zone "${zoneName}"\n\nAvailable devices:\n${options}\n\nEnter Traccar Device ID:`);
  if (!input) return;
  try {
    const res  = await fetch(`${BACKEND}/api/geofences/${zoneId}/devices`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ traccar_device_id: input.trim() })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    showToast('Device assigned to zone ✅', 'success');
    loadZones();
  } catch (err) { showToast(err.message, 'error'); }
}

// ── CREATE ZONE MODAL ─────────────────────────────────
let pickerMap = null, pickerMarker = null, pickerCircle = null, pickerMapTimer = null;

function openCreateZoneModal() {
  document.getElementById('zone-modal').classList.add('show');
  pickerMapTimer = setTimeout(() => initPickerMap(), 150);
}

function closeCreateZoneModal() {
  // Cancel pending init if modal closed before timer fires
  if (pickerMapTimer) { clearTimeout(pickerMapTimer); pickerMapTimer = null; }
  document.getElementById('zone-modal').classList.remove('show');
  if (pickerMap) { pickerMap.remove(); pickerMap = null; pickerMarker = null; pickerCircle = null; }
  ['z-name','z-radius'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById('z-lat').value = '';
  document.getElementById('z-lng').value = '';
  document.getElementById('z-lat-display').textContent = 'Lat: —';
  document.getElementById('z-lng-display').textContent = 'Lng: —';
}

function initPickerMap() {
  if (pickerMap) return;
  // Centre on Conakry, or on a known vehicle if available
  const center = allFleet.length && allFleet[0].lat
    ? [allFleet[0].lat, allFleet[0].lng]
    : [9.538, -13.677];

  pickerMap = L.map('zone-picker-map', {
    zoomControl:      true,
    attributionControl: false,
    tap:              false,   // prevent touch event capture on mobile
    scrollWheelZoom:  false
  }).setView(center, 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    { maxZoom:19, subdomains:'abc' }).addTo(pickerMap);

  // Show existing vehicle positions on picker map for reference
  allFleet.forEach(v => {
    if (!v.lat || !v.lng) return;
    L.circleMarker([v.lat, v.lng], {
      radius:6, color:'#C9A227', fillColor:'#C9A227', fillOpacity:0.8, weight:2
    }).bindTooltip(v.name).addTo(pickerMap);
  });

  // Tap to place center
  pickerMap.on('click', (e) => {
    const { lat, lng } = e.latlng;
    document.getElementById('z-lat').value = lat.toFixed(6);
    document.getElementById('z-lng').value = lng.toFixed(6);
    document.getElementById('z-lat-display').textContent = `Lat: ${lat.toFixed(5)}`;
    document.getElementById('z-lng-display').textContent = `Lng: ${lng.toFixed(5)}`;
    updatePickerPreview();
  });
}

function updatePickerPreview() {
  if (!pickerMap) return;
  const lat    = parseFloat(document.getElementById('z-lat').value);
  const lng    = parseFloat(document.getElementById('z-lng').value);
  const radius = parseInt(document.getElementById('z-radius').value) || 500;
  const color  = document.getElementById('z-color').value;
  if (!lat || !lng) return;

  if (pickerMarker) pickerMap.removeLayer(pickerMarker);
  if (pickerCircle) pickerMap.removeLayer(pickerCircle);

  pickerMarker = L.circleMarker([lat, lng], {
    radius:8, color:'#fff', fillColor:color, fillOpacity:1, weight:2
  }).addTo(pickerMap);

  pickerCircle = L.circle([lat, lng], {
    radius, color, fillColor:color, fillOpacity:0.12, weight:2, dashArray:'6 4'
  }).addTo(pickerMap);

  pickerMap.setView([lat, lng], pickerMap.getZoom());
}

function toggleZoneFields() {
  const type = document.getElementById('z-type').value;
  document.getElementById('z-circle-fields').style.display = type === 'circle' ? 'block' : 'none';
}

async function deleteZone(zoneId, zoneName) {
  if (!confirm(`Permanently delete zone "${zoneName}"?\n\nThis removes all events and device assignments. Cannot be undone.`)) return;
  try {
    const res  = await fetch(`${BACKEND}/api/geofences/${zoneId}`, {
      method: 'DELETE', headers: authHeaders()
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    showToast(`Zone "${zoneName}" deleted`, 'success');
    loadZones();
  } catch (err) { showToast(err.message, 'error'); }
}

async function createZone() {
  const name   = document.getElementById('z-name').value.trim();
  const type   = document.getElementById('z-type').value;
  const color  = document.getElementById('z-color').value;
  const enter  = document.getElementById('z-notify-enter').checked;
  const exit   = document.getElementById('z-notify-exit').checked;
  const btn    = document.getElementById('z-create-btn');

  if (!name) { showToast('Zone name is required', 'error'); return; }

  const body = { name, type, color, notify_enter: enter, notify_exit: exit };

  if (type === 'circle') {
    const lat    = parseFloat(document.getElementById('z-lat').value);
    const lng    = parseFloat(document.getElementById('z-lng').value);
    const radius = parseInt(document.getElementById('z-radius').value);
    if (!lat || !lng) { showToast('Tap the map to set zone center first', 'error'); return; }
    if (!radius || radius < 50) { showToast('Radius must be at least 50 metres', 'error'); return; }
    body.center_lat = lat; body.center_lng = lng; body.radius_m = radius;
  }

  btn.disabled = true; btn.textContent = 'Creating...';
  try {
    const res  = await fetch(`${BACKEND}/api/geofences`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    showToast(`Zone "${name}" created ✅`, 'success');
    closeCreateZoneModal();
    loadZones();
    // Refresh admin map if open
    if (document.getElementById('tab-map').classList.contains('active')) loadAdminMap();
  } catch (err) { showToast(err.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Create Zone'; }
}

// ══════════════════════════════════════════════════════
// INIT — load everything on page open
// ══════════════════════════════════════════════════════
loadAll().catch(err => {
  document.body.innerHTML = `<div style="color:red;padding:20px;font-size:14px;background:#000;min-height:100vh">
    <h2>Admin Error</h2><pre>${err.message}\n${err.stack}</pre>
  </div>`;
});
