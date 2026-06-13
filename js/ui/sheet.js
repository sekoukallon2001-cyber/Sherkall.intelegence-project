// =====================================================
// SHERKALL INTELLIGENCE — BOTTOM SHEET UI MODULE
// js/ui/sheet.js
// =====================================================

import { vehicleStore, selectedId } from '../state.js';
import { CONFIG }                   from '../config.js';

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
  const statusLbl = statusKey === 'moving' ? 'EN MOUVEMENT' : statusKey === 'idle' ? 'EN VEILLE' : 'HORS LIGNE';
  const ts  = v.ts ? new Date(v.ts).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit' }) : '—';
  const lat = v.lat ? Number(v.lat).toFixed(6) : '—';
  const lon = v.lon ? Number(v.lon).toFixed(6) : '—';
  const diffMin = v.ts ? Math.round((Date.now() - new Date(v.ts)) / 60000) : null;
  const timeStr = diffMin === null ? '—' : diffMin < 1 ? 'il y a <1 min' : `il y a ${diffMin} min`;

  body.innerHTML = `
    <div class="vehicle-card-header">
      <span class="vehicle-card-name">${v.name}</span>
      <span class="status-badge status-${statusKey}">${statusLbl}</span>
    </div>

    <div class="telem-grid">
      <div class="telem-card">
        <span class="telem-icon">⚡</span>
        <span class="telem-value">${v.speed}</span>
        <span class="telem-unit">km/h</span>
        <span class="telem-label">VITESSE</span>
      </div>
      <div class="telem-card">
        <span class="telem-icon">🧭</span>
        <span class="telem-value">${v.heading}</span>
        <span class="telem-unit">°</span>
        <span class="telem-label">DIRECTION</span>
      </div>
    </div>

    <div class="coords-block">
      <div class="coords-row">
        <span class="coords-label">LAT</span>
        <span class="coords-value">${lat}</span>
      </div>
      <div class="coords-row">
        <span class="coords-label">LNG</span>
        <span class="coords-value">${lon}</span>
      </div>
    </div>

    <div class="last-update-row">
      <span>Dernière mise à jour</span>
      <span>${ts}</span>
    </div>

    <div class="detail-actions">
      <button class="detail-action-btn" onclick="window.centerVehicle && window.centerVehicle('${v.id}')">
        <span class="btn-icon">📍</span>Centrer
      </button>
      <button class="detail-action-btn" onclick="window.openHistory && window.openHistory('${v.id}')">
        <span class="btn-icon">📋</span>Historique
      </button>
      <button class="detail-action-btn support" onclick="window.contactSupport && window.contactSupport()">
        <span class="btn-icon">💬</span>Support
      </button>
      <button class="detail-action-btn danger" onclick="window.reportAlert && window.reportAlert('${v.id}')">
        <span class="btn-icon">🚨</span>Signaler
      </button>
    </div>

    <div class="history-section">
      <p class="history-title">ACTIVITÉ RÉCENTE</p>
      <div class="history-item">
        <span class="history-dot ${isMoving ? 'event-move' : 'event-stop'}"></span>
        <div>
          <p class="history-text">${isMoving ? 'En mouvement · ' + v.speed + ' km/h' : 'Arrêt détecté'}</p>
          <p class="history-time">${timeStr}</p>
        </div>
      </div>
    </div>`;

}
