// =====================================================
// SHERKALL INTELLIGENCE — STATE MODULE
// js/state.js
// =====================================================
// Single source of truth for vehicle data.
// Change detection prevents unnecessary UI rerenders —
// critical for performance at 20+ vehicles.

import { CONFIG } from './config.js';

// ── VEHICLE STORE ─────────────────────────────────────
export let vehicleStore = {};  // deviceId → vehicle object
export let selectedId   = null;

export function setSelectedId(id) { selectedId = id; }

// ── SUBSCRIBERS ───────────────────────────────────────
// UI modules subscribe here instead of being called directly.
// Keeps state module decoupled from all UI modules.
const subscribers = [];
export function onUpdate(fn) { subscribers.push(fn); }
function notify()            { subscribers.forEach(fn => fn()); }

// ── STATUS DERIVATION ─────────────────────────────────
// Derived from fixTime age — never trusts stale backend field.
export function getVehicleStatus(v) {
  if (!v?.ts) return 'offline';
  const age = Date.now() - new Date(v.ts).getTime();
  if (age >= CONFIG.ONLINE_WINDOW_MS) return 'offline';
  return v.speed > CONFIG.SPEED_THRESHOLD ? 'online' : 'idle';
}

// ── LOAD VEHICLES (device list) ───────────────────────
export function loadVehicles(devices) {
  devices.forEach(d => {
    if (!vehicleStore[d.id]) {
      vehicleStore[d.id] = {
        id: d.id, name: d.name,
        status: 'offline', speed: 0,
        lat: null, lon: null,
        heading: 0, ts: null
      };
    } else {
      vehicleStore[d.id].name = d.name;
    }
  });
}

// ── PROCESS POSITIONS ─────────────────────────────────
// Called by realtime module on every SSE push or poll.
// Change detection: only marks changed if data actually differs.
// Returns array of vehicle IDs that actually changed.
export function processPositions(positions) {
  const changed = [];

  positions.forEach(pos => {
    const v = vehicleStore[pos.deviceId];
    if (!v) return;

    const newSpeed   = Math.round(pos.speed  || 0);
    const newLat     = pos.latitude;
    const newLon     = pos.longitude;
    const newTs      = pos.fixTime;
    const newHeading = Math.round(pos.course || 0);
    const newStatus  = (() => {
      const age = Date.now() - new Date(newTs || 0).getTime();
      if (age >= CONFIG.ONLINE_WINDOW_MS) return 'offline';
      return newSpeed > CONFIG.SPEED_THRESHOLD ? 'online' : 'idle';
    })();

    // Only update + mark changed if something actually differs
    if (
      v.speed   !== newSpeed   ||
      v.lat     !== newLat     ||
      v.status  !== newStatus  ||
      v.ts      !== newTs
    ) {
      v.speed   = newSpeed;
      v.lat     = newLat;
      v.lon     = newLon;
      v.ts      = newTs;
      v.heading = newHeading;
      v.status  = newStatus;
      changed.push(v.id);
    }
  });

  if (changed.length > 0) notify();
  return changed;
}
