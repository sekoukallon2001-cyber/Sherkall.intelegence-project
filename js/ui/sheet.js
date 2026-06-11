// =====================================================
// SHERKALL INTELLIGENCE — BOTTOM SHEET UI MODULE
// js/ui/sheet.js
// =====================================================

import { vehicleStore, selectedId, CONFIG } from '../state.js';

export function openSheet(id) {
  document.getElementById('vehicle-sheet')?.classList.add('open');
  document.getElementById('sheet-backdrop')?.classList.add('show');
  refreshSheet(id);
}

export function closeSheet() {
  document.getElementById('vehicle-sheet')?.classList.remove('open');
  document.getElementById('sheet-backdrop')?.classList.remove('show');
}

export function refreshSheet(id) {
  const v = vehicleStore[id];
  if (!v) return;
  const body = document.getElementById('sheet-body');
  if (!body) return;

  const isMoving  = v.speed > CONFIG.SPEED_THRESHOLD;
  const statusKey = isMoving ? 'moving' : (v.status === 'offline' ? 'offline' : 'idle');
  const statusLbl = statusKey === 'moving' ? 'En mouvement' : statusKey === 'idle' ? 'En veille' : 'Hors ligne';
  const statusClr = statusKey === 'moving' ? '#10B981' : statusKey === 'idle' ? '#F59E0B' : '#EF4444';
  const ts  = v.ts ? new Date(v.ts).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit' }) : '—';
  const lat = v.lat ? Number(v.lat).toFixed(6) : '—';
  const lon = v.lon ? Number(v.lon).toFixed(6) : '—';

  body.innerHTML = `
    <div class="sheet-kpi-row">
      <div class="sheet-kpi">
        <span class="sheet-kpi-icon">⚡</span>
        <span class="sheet-kpi-val">${v.speed}</span>
        <span class="sheet-kpi-unit">km/h</span>
        <span class="sheet-kpi-lbl">VITESSE</span>
      </div>
      <div class="sheet-kpi">
        <span class="sheet-kpi-icon">🧭</span>
        <span class="sheet-kpi-val">${v.heading}</span>
        <span class="sheet-kpi-unit">°</span>
        <span class="sheet-kpi-lbl">DIRECTION</span>
      </div>
    </div>
    <div class="sheet-coords">
      <div class="sheet-coord-row"><span class="coord-lbl">LAT</span><span class="coord-val">${lat}</span></div>
      <div class="sheet-coord-row"><span class="coord-lbl">LNG</span><span class="coord-val">${lon}</span></div>
    </div>
    <div class="sheet-meta-row">
      <span class="sheet-meta-lbl">Dernière mise à jour</span>
      <span class="sheet-meta-val">${ts}</span>
    </div>
    <div class="sheet-actions">
      <button class="sheet-btn" onclick="window.centerVehicle && window.centerVehicle('${v.id}')">📍 Centrer</button>
      <button class="sheet-btn" onclick="window.openHistory && window.openHistory('${v.id}')">📋 Historique</button>
      <button class="sheet-btn" onclick="window.contactSupport && window.contactSupport()">💬 Support</button>
      <button class="sheet-btn sheet-btn-warn" onclick="window.reportAlert && window.reportAlert('${v.id}')">🚨 Signaler</button>
    </div>
    <div class="sheet-recent">
      <p class="sheet-recent-title">ACTIVITÉ RÉCENTE</p>
      <div id="sheet-history"></div>
    </div>`;

  loadHistory(v, document.getElementById('sheet-history'));
}

function loadHistory(v, container) {
  if (!container || !v.ts) return;
  const diffMin = Math.round((Date.now() - new Date(v.ts)) / 60000);
  const label   = v.speed > CONFIG.SPEED_THRESHOLD ? 'En mouvement' : 'Arrêt détecté';
  const timeStr = diffMin < 1 ? 'il y a <1 min' : `il y a ${diffMin} min`;
  container.innerHTML = `
    <div class="history-item">
      <span class="history-dot ${v.speed > CONFIG.SPEED_THRESHOLD ? 'dot-green' : 'dot-amber'}"></span>
      <span class="history-label">${label}</span>
      <span class="history-time">${timeStr}</span>
    </div>`;
}
