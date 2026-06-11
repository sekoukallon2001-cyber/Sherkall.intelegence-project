// =====================================================
// SHERKALL INTELLIGENCE — MAP MODULE
// js/map.js
// =====================================================

import { TILE_LAYERS, CONFIG } from './config.js';
import { vehicleStore, selectedId, getVehicleStatus } from './state.js';

let map       = null;
let tileLayer = null;
let markers   = {};
export let geofenceLayers = {};

// ── INIT ──────────────────────────────────────────────
export function initMap() {
  map = L.map('map', {
    zoomControl: false, attributionControl: true
  }).setView([9.538, -13.677], 12);

  const layer = TILE_LAYERS.street;
  tileLayer = L.tileLayer(layer.url, layer.options).addTo(map);
}

export function setMapLayer(type, btn) {
  if (tileLayer) map.removeLayer(tileLayer);
  const layer = TILE_LAYERS[type];
  if (!layer) return;
  tileLayer = L.tileLayer(layer.url, layer.options).addTo(map);
  document.querySelectorAll('.layer-fab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

// ── COLOURS & ICONS ───────────────────────────────────
export function vehicleColor(v) {
  if (!v) return '#8892A4';
  if (v.speed > CONFIG.SPEED_THRESHOLD)                  return '#10B981';
  if (v.status === 'online' || v.status === 'idle')      return '#F59E0B';
  return '#EF4444';
}

export function buildMarkerIcon(v) {
  const color      = vehicleColor(v);
  const isSelected = v.id === selectedId;
  const size       = isSelected ? 44 : 36;
  const shadow     = isSelected
    ? `0 0 0 3px ${color}, 0 4px 14px rgba(0,0,0,0.4)`
    : `0 2px 10px rgba(0,0,0,0.3)`;
  const glow = v.speed > CONFIG.SPEED_THRESHOLD
    ? `<div style="position:absolute;inset:-6px;border-radius:50%;background:${color};opacity:0.15;animation:markerPulse 2s ease-in-out infinite;"></div>`
    : '';
  const iconSize = Math.round(size * 0.52);
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
      ${glow}
      <div style="position:absolute;inset:0;background:#fff;border:2.5px solid ${color};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:${shadow};">
        <svg viewBox="0 0 24 24" width="${iconSize}" height="${iconSize}" fill="${color}">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    </div>`,
    iconSize: [size, size], iconAnchor: [size/2, size/2]
  });
}

// ── MARKERS ───────────────────────────────────────────
export function updateMarker(v) {
  if (!map || !v.lat || !v.lon) return;
  if (markers[v.id]) {
    markers[v.id].setLatLng([v.lat, v.lon]);
    markers[v.id].setIcon(buildMarkerIcon(v));
  } else {
    markers[v.id] = L.marker([v.lat, v.lon], { icon: buildMarkerIcon(v) })
      .addTo(map)
      .on('click', () => window.selectVehicle && window.selectVehicle(v.id));
  }
}

export function updateAllMarkers() {
  Object.values(vehicleStore).forEach(v => updateMarker(v));
}

// ── NAVIGATION ────────────────────────────────────────
export function centerVehicle(id) {
  const v = vehicleStore[id];
  if (v?.lat) map.setView([v.lat, v.lon], 16, { animate: true });
}

export function centerAll() {
  const locs = Object.values(vehicleStore)
    .filter(v => v.lat)
    .map(v => [v.lat, v.lon]);
  if (!locs.length) return;
  if (locs.length === 1) map.setView(locs[0], 15, { animate: true });
  else map.fitBounds(locs, { maxZoom: 15, padding: [40, 40] });
}

// ── GEOFENCES ─────────────────────────────────────────
export function renderGeofences(geofences) {
  Object.values(geofenceLayers).forEach(l => map.removeLayer(l));
  geofenceLayers = {};
  (geofences || []).forEach(fence => {
    if (!fence.active) return;
    const color = fence.color || '#C9A227';
    let layer;
    if (fence.type === 'circle' && fence.center_lat)
      layer = L.circle([fence.center_lat, fence.center_lng], {
        radius: fence.radius_m, color,
        fillColor: color, fillOpacity: 0.08, weight: 2, dashArray: '6 4'
      });
    else if (fence.type === 'polygon' && fence.coordinates?.length)
      layer = L.polygon(fence.coordinates.map(([lng, lat]) => [lat, lng]), {
        color, fillColor: color, fillOpacity: 0.08, weight: 2, dashArray: '6 4'
      });
    if (layer) {
      layer._color = color;
      layer.bindTooltip(`<strong>${fence.name}</strong>`);
      layer.addTo(map);
      geofenceLayers[fence.id] = layer;
    }
  });
}

export function flashGeofence(geofenceId, eventType) {
  const layer = geofenceLayers[geofenceId];
  if (!layer) return;
  const flash = eventType === 'entered' ? '#10B981' : '#EF4444';
  layer.setStyle({ color: flash, weight: 4 });
  setTimeout(() => layer.setStyle({ color: layer._color || '#C9A227', weight: 2 }), 2000);
}

export { map };
